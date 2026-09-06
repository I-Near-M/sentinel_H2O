# 🤖 Sentinel-H2O — Inteligencia Artificial, Redes GRU y Simulador What-If

## 1. Arquitectura del Motor de Machine Learning

El subsistema de Inteligencia Artificial (`backend/app/ml/`) está diseñado para operar en tiempo real sobre series temporales de telemetría de cuenca. Proporciona tres capacidades críticas:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                    SENTINEL-H2O MACHINE LEARNING CORE                  │
  ├────────────────────────────────────────────────────────────────────────┤
  │  1. GRU Predictor (24h)   ──> Pronóstico multivariable continuo        │
  │  2. Anomaly Detector      ──> Detección de anomalías multidimensionales│
  │  3. 3D Lead Time Engine   ──> Cálculo dinámico de tránsito de pluma    │
  │  4. What-If Simulator     ──> Modelación de escenarios de estrés       │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Red Neuronal Recurrente GRU a 24 Horas

Se emplea una arquitectura **Gated Recurrent Unit (GRU)** por su alta eficiencia computacional y capacidad para capturar dependencias de largo plazo en variables hidrológicas sin el sobrecosto de memoria de una LSTM estándar:

### 2.1. Estructura de Entrada y Salida
* **Ventana de Entrada**: Últimas $24$ mediciones horarias (o pasos de $15$ minutos agrupados).
* **Vector de Características ($x_t$)**:
  $$x_t = [\text{pH}_t, \text{EC}_t, \text{Turb}_t, \text{Temp}_t, Q_t, \text{Lluvia}_t, \text{WQI}_t]$$
* **Horizonte de Salida**: $24$ a $96$ pasos futuros proyectados con bandas de confianza empíricas ($\pm \sigma$).

### 2.2. Ecuaciones de la Celda GRU
$$\text{Reset Gate: } r_t = \sigma(W_r x_t + U_r h_{t-1} + b_r)$$

$$\text{Update Gate: } z_t = \sigma(W_z x_t + U_z h_{t-1} + b_z)$$

$$\text{Candidate State: } \tilde{h}_t = \tanh(W_h x_t + U_h (r_t \odot h_{t-1}) + b_h)$$

$$\text{Hidden State: } h_t = (1 - z_t) \odot h_{t-1} + z_t \odot \tilde{h}_t$$

---

## 3. Modelo Topológico 3D y Cálculo de Lead Time

Cuando un nodo aguas arriba detecta un evento anómalo (ej. descarga ácida o vertimiento con alta salinidad), el sistema calcula el **tiempo de arribo ($t_{\text{arribo}}$)** hacia cada nodo y bocatoma aguas abajo.

### 3.1. Distancia 3D Real con Sinuosidad Fluvial
Utilizando las coordenadas geodésicas (Latitud $\phi$, Longitud $\lambda$) y la altitud topográfica ($z$ en msnm) de cada nodo en la base de datos:

1. **Distancia 2D Haversine**:
   $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
   $$d_{2D} = 2 R \cdot \arcsin(\sqrt{a}) \quad \text{donde } R = 6,371.0\text{ km}$$

2. **Distancia 3D Euclidiana y Factor de Sinuosidad**:
   $$d_{\text{3D}} = \sqrt{d_{2D}^2 + \left(\frac{\Delta z}{1000}\right)^2} \times k_{\text{sinuosidad}}$$
   *Donde $k_{\text{sinuosidad}} = 1.28$ es el factor de meandro calibrado para el Río Chancay-Huaral.*

3. **Tiempo de Tránsito de la Pluma (*Lead Time*)**:
   $$t_{\text{horas}} = \frac{d_{\text{3D}}}{v_{\text{pluma}}}$$
   *Donde $v_{\text{pluma}} \approx 1.85\text{ m/s} = 6.66\text{ km/h}$ bajo condiciones de régimen fluvial medio.*

### 3.2. Tiempos de Reacción Calibrados (Ejemplo Cuenca Chancay)

| Tramo Fluvial | Origen ($msnm$) | Destino ($msnm$) | Distancia 3D | Lead Time de Reacción |
| :--- | :---: | :---: | :---: | :---: |
| **Vichaycocha $\rightarrow$ Ravira** | $4,350\text{ m}$ | $2,850\text{ m}$ | $26.8\text{ km}$ | **$3\text{ horas } 50\text{ min}$** |
| **Ravira $\rightarrow$ Acos (Bocatoma)** | $2,850\text{ m}$ | $1,250\text{ m}$ | $29.8\text{ km}$ | **$4\text{ horas } 15\text{ min}$** |
| **Acos $\rightarrow$ Huayopampa (Parcelas)**| $1,250\text{ m}$ | $320\text{ m}$ | $36.3\text{ km}$ | **$3\text{ horas } 42\text{ min}$** |
| **Vichaycocha $\rightarrow$ Huayopampa (Total)**| $4,350\text{ m}$ | $320\text{ m}$ | **$92.9\text{ km}$** | **$13\text{ horas } 18\text{ min}$** |

---

## 4. Simulador de Escenarios "What-If"

Permite a los ingenieros de la ANA y Junta de Usuarios simular escenarios hipotéticos antes de tomar decisiones operativas:

* **Escenario A: Vertimiento Minero en Cabecera**: Simula un pulso de pH $4.2$ y evalúa la curva de dilución y llegada a las bocatomas.
* **Escenario B: Lluvia Torrencial en Cumbre ($> 25\text{ mm/h}$)**: Modela el incremento de caudal y arrastre de sedimentos (turbidez $> 500\text{ NTU}$).
* **Escenario C: Estiaje Prolongado / Sequía**: Proyecta la concentración de sales en parcelas piloto si el caudal cae por debajo de $0.5\text{ m}^3/s$.
