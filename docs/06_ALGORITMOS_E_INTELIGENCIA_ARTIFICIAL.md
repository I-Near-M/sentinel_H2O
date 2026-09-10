# 🧠 Sentinel-H2O — Modelos de Inteligencia Artificial y Analítica Agronómica MIDAGRI

> **Plataforma Abierta de Gemelo Virtual Descentralizado e IoT para la Seguridad Hídrica**  
> **Requerimiento Oficial:** ☑ Código / Algoritmo de IA  
> **Licencia:** Open Source (GNU AGPL v3.0)

---

## 1. Visión General del Motor de IA

El subsistema de Inteligencia Artificial y Modelamiento de **Sentinel-H2O** (`backend/app/ml/`) está compuesto por **dos grandes suites algorítmicas desacopladas**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                 ARQUITECTURA DEL MOTOR DE INTELIGENCIA ARTIFICIAL               │
├─────────────────────────────────────────┬───────────────────────────────────────┤
│ A. SUITE HIDRÁULICA Y CALIDAD (CORE)    │ B. SUITE AGRO-ANALÍTICA (MIDAGRI)     │
├─────────────────────────────────────────┼───────────────────────────────────────┤
│ • Anomaly Detector (Estrés Osmótico)    │ • Procesador Estadístico SIEA/ENA     │
│ • Lead Time Hidrodinámico de Río        │ • Motor de Idoneidad y Recom. Cultivos│
│ • Simulador What-If & Dilución de Masas │ • Modelo Probabilístico Riesgo Agrícola│
│ • Red Neuronal GRU para Series de Tiempo│ • Benchmarks por Región (Costa/Sierra)│
└─────────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Suite Hidráulica y Calidad de Agua

### A. Detección de Anomalías y Estrés Osmótico (`anomaly_detector.py`)
Evalúa el riesgo multivariable físico-químico del agua en tiempo real combinando umbrales agronómicos y distancia estocástica:

- **Ecuación de Presión Osmótica del Agua:**
  $$\Pi_{\text{osm}} = 0.036 \times EC\quad (\text{en bar, con } EC \text{ en } \mu S/cm)$$
  Cuando $EC > 1,500\ \mu S/cm$ ($1.5\text{ dS/m}$), la presión osmótica dificulta la absorción hídrica en las raíces de los cultivos (estrés hídrico inducido por salinidad).

- **Clasificación Multivariable:**
  ```python
  # backend/app/ml/anomaly_detector.py
  def evaluate_water_risk(ph: float, ec: float, turbidity: float, temp: float) -> dict:
      risk_score = 0.0
      anomalies = []
      
      if ec > 1500.0:
          risk_score += 0.50
          anomalies.append("CRITICAL_OSMOTIC_STRESS_HIGH_SALINITY")
      elif ec > 1000.0:
          risk_score += 0.25
          anomalies.append("WARNING_SALINITY_ELEVATED")
          
      if ph < 6.5 or ph > 8.5:
          risk_score += 0.35
          anomalies.append("ACID_OR_ALKALINE_TRANSGRESSION")
          
      if turbidity > 100.0:
          risk_score += 0.15
          anomalies.append("HIGH_TURBIDITY_SEDIMENT_LOAD")
          
      severity = "CRITICAL" if risk_score >= 0.50 else ("WARNING" if risk_score >= 0.25 else "NORMAL")
      return {"risk_score": min(1.0, risk_score), "severity": severity, "anomalies": anomalies}
  ```

### B. Hidrodinámica de Tiempos de Viaje / Lead Time (`lead_time.py`)
Modela el tiempo de retardo del flujo entre estaciones consecutivas mediante la ecuación geométrica de **Leopold & Maddock**:
$$\bar{v} = a \cdot Q^b$$
$$\Delta t_{i \to j} = \frac{L_{i \to j}}{\bar{v}(Q)}$$

Permite alertar a las comisiones de regantes aguas abajo con horas de anticipación antes de que una masa de agua con alta salinidad alcance sus tomas de captación.

### C. Balance de Masas y Prescripción de Dilución (`whatif_simulator.py`)
- **Conservación de Masa de Solutos (Mezcla en Confluencia):**
  $$C_{\text{mezcla}} = \frac{Q_1 \cdot C_1 + Q_2 \cdot C_2}{Q_1 + Q_2}$$
- **Prescripción de Dilución desde Reservorios:**
  Calcula el caudal de agua fresca $Q_{\text{dilución}}$ requerido para devolver la conductividad al límite seguro ($C_{\text{target}} = 1,000\ \mu S/cm$):
  $$Q_{\text{dilución}} = Q_{\text{actual}} \times \left( \frac{C_{\text{actual}} - C_{\text{target}}}{C_{\text{target}} - C_{\text{fresca}}} \right)$$

---

## 3. Suite Agro-Analítica Integrada con Datos MIDAGRI

La suite agronómica (`backend/app/ml/midagri_processor.py`, `crop_recommender.py`, `agro_risk_model.py`) incorpora las estadísticas oficiales del **MIDAGRI SIEA (Sistema de Información Estadística Agraria 2017-2023)** y la **ENA (Encuesta Nacional Agraria 2024-2025)**:

### A. Ingesta y Normalización de Estadísticas Agrarias (`midagri_processor.py`)
Estandariza catálogos agronómicos nacionales para cultivos de **Costa, Sierra y Selva** (palto, mandarina, vid, espárrago, arándano, maíz amarillo duro, papa, quinua, café, cacao, etc.), parametrizando:
- Demanda hídrica estacional ($m^3/\text{ha}$).
- Umbral de tolerancia a salinidad ($EC_{\text{threshold}}$ en $\mu S/cm$).
- Pendiente de pérdida de rendimiento por salinidad ($S_{\text{salinidad}}$ en $\%/\text{dS/m}$).
- Rangos óptimos de pH, turbidez máxima y temperatura de agua.
- Precios en chacra de referencia ($S/\text{ por kg}$) y rendimientos base ($kg/\text{ha}$).

### B. Motor de Idoneidad y Recomendación de Cultivos (`crop_recommender.py`)
Implementa el modelo biofísico **Maas-Hoffman / FAO-56** acoplado a un regresor **Random Forest (Scikit-learn)** entrenado sobre mallas agroclimáticas:

1. **Factor de Salinidad (Maas & Hoffman):**
   $$K_{\text{sal}} = \begin{cases} 1.0 & \text{si } EC \le EC_{\text{threshold}} \\ \max\left(0, 1.0 - \frac{S \times (EC - EC_{\text{threshold}})}{100}\right) & \text{si } EC > EC_{\text{threshold}} \end{cases}$$

2. **Factor de Bloqueo de Nutrientes por pH ($K_{\text{ph}}$):**
   Penaliza la absorción de micro y macronutrientes cuando el pH se aleja del rango agronómico óptimo ($6.0 \le pH \le 7.5$).

3. **Índice Global de Idoneidad ($0 - 100\%$):**
   $$\text{Suitability} = 100 \times \left(0.40 \cdot K_{\text{sal}} + 0.35 \cdot K_{\text{agua}} + 0.25 \cdot K_{\text{ph}}\right)$$

4. **Recomendador de Sustitución:** Si las condiciones del agua degradan la idoneidad del cultivo actual por debajo del $60\%$, el motor sugiere cultivos alternativos más tolerantes (ej. migrar temporalmente de palto a espárrago o vid).

### C. Modelo de Riesgo Económico y Pérdida de Rendimiento (`agro_risk_model.py`)
Estima el impacto financiero proyectado en el valle ante anomalías hídricas continuas:
$$\text{Pérdida Económica (S/)} = \text{Hectáreas} \times \text{Rendimiento Base} \times (1.0 - K_{\text{sal}}) \times \text{Precio Base}$$

Permite a las juntas de regantes cuantificar con precisión el beneficio económico de cerrar compuertas a tiempo o activar esquemas de dilución.
