# 🧪 Sentinel-H2O — Motor Físico-Químico y Procesador Científico

## 1. Fundamento Agronómico e Hidrológico

El motor de procesamiento de **Sentinel-H2O** (`backend/app/services/processor.py`) convierte las señales eléctricas crudas emitidas por los sensores de campo en variables agronómicas e hidrológicas estandarizadas, aplicando corrección por temperatura y factores de calibración individuales por nodo.

---

## 2. Fórmulas de Conversión y Calibración

### 2.1. Potencial de Hidrógeno ($pH$)
La sonda de pH genera un voltaje proporcional a la concentración de iones $H^+$:

$$\text{pH} = \text{offset\_v} + \left(\text{raw\_v\_ph} \times \text{slope}\right)$$

* **Evaluación ECA Categoría 3 (Riego de Vegetales)**:
  * $6.5 \le \text{pH} \le 8.5 \implies$ **ÓPTIMO**
  * $\text{pH} < 6.5 \implies$ **ÁCIDO PELIGROSO** (Riesgo de fitotoxicidad por metales pesados)
  * $\text{pH} > 8.5 \implies$ **ALCALINO PELIGROSO** (Inmovilización de fósforo y micronutrientes)

---

### 2.2. Conductividad Eléctrica ($EC$) y Salinidad ($TDS$)
La conductividad eléctrica del agua varía con la temperatura a razón de aproximadamente $2\%$ por grado Celsius:

$$V_{25} = \frac{V_{\text{raw\_tds}}}{1.0 + 0.02 \times (T_{\text{agua}} - 25.0)}$$

$$\text{TDS}_{\text{ppm}} = \left(133.42 \cdot V_{25}^3 - 255.86 \cdot V_{25}^2 + 857.39 \cdot V_{25}\right) \times k_{\text{factor}}$$

$$\text{EC}_{\mu S/cm} = \frac{\text{TDS}_{\text{ppm}}}{0.50}$$

* **Evaluación de Estrés Osmótico (FAO / Suelos Agrícolas)**:
  * $\text{EC} \le 1,000\ \mu S/cm \implies$ **ÓPTIMO** (Apto para todo tipo de cultivo frutal y hortalizas)
  * $1,000 < \text{EC} \le 2,000\ \mu S/cm \implies$ **PRECAUCIÓN** (Riesgo de reducción de rendimiento en palto y melocotón)
  * $\text{EC} > 2,000\ \mu S/cm \implies$ **PELIGRO ESTRÉS OSMÓTICO** (Salinización severa del bulbo húmedo)

---

### 2.3. Turbidez y Sedimentos en Suspensión ($NTU$)
Calculada a partir de la atenuación óptica infrarroja entre el emisor y receptor:

$$\text{NTU} = \max\left(0.5, \frac{V_{\text{clear}} - V_{\text{raw\_turb}}}{V_{\text{clear}} - V_{\text{turbid}}} \times 1,000\right)$$

* **Umbrales Agrícolas e Hidráulicos**:
  * $\text{NTU} \le 50 \implies$ **AGUA CLARA** (Apta para riego por goteo sin colmatación de emisores)
  * $50 < \text{NTU} \le 150 \implies$ **PRECAUCIÓN** (Requiere retrolavado de filtros de arena/anillas)
  * $\text{NTU} > 150 \implies$ **ALERTA DE SEDIMENTOS / HUAICO** (Riesgo de obstrucción severa)

---

### 2.4. Aforo Hidráulico y Caudal ($Q$)
Calculado a partir de la distancia medida por el sensor ultrasónico hacia el espejo de agua:

$$\text{Tirante } y = \max\left(0.0, D_{\text{fondo\_sensor}} - D_{\text{raw\_ultrasonico}}\right) \quad [\text{cm}]$$

$$\text{Caudal } Q = k_{\text{caudal}} \times (y / 100)^{n_{\text{exp}}} \quad [m^3/s]$$

$$Q_{L/s} = Q \times 1,000$$

---

## 3. Índice Compuesto WQI (*Water Quality Index*)

El **WQI Score** normaliza y pondera la degradación físico-química del agua en una escala continua de **0 a 100**:

$$\text{WQI} = 10.0 \times \left(2.5 \cdot \text{norm}_{pH} + 1.5 \cdot \text{norm}_{Temp} + 2.0 \cdot \text{norm}_{TDS} + 2.0 \cdot \text{norm}_{EC} + 2.0 \cdot \text{norm}_{Turb}\right)$$

### Tabla de Categorización WQI

| Rango WQI | Categoría | Color | Descripción y Uso Recomendado |
| :---: | :---: | :---: | :--- |
| **`0.0 – 30.0`** | **EXCELENTE** | 🟢 Verde | Agua de alta pureza (cabecera glaciar). Ideal para riego tecnificado y consumo. |
| **`30.1 – 50.0`** | **BUENA** | 🔵 Azul | Calidad óptima para irrigación de frutales, hortalizas y tallos altos. |
| **`50.1 – 70.0`** | **POBRE / REGULAR**| 🟡 Amarillo| Monitoreo preventivo. Presencia moderada de sedimentos o sales disueltas. |
| **`70.1 – 90.0`** | **MALA** | 🟠 Naranja | Alerta agronómica. Posible estrés osmótico o vertimiento de afluentes contaminados. |
| **`90.1 – 100.0`**| **MUY MALA** | 🔴 Rojo | Contingencia crítica. Cierre preventivo de compuertas y aviso a la ANA. |
