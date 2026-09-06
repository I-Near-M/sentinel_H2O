# 📊 Sentinel-H2O — Suite de 6 Dashboards de Grafana

## 1. Arquitectura de Visualización

La capa de visualización de **Sentinel-H2O** está compuesta por una suite de **6 Dashboards Especializados en Grafana** ([http://localhost:3000](http://localhost:3000)), aprovisionados automáticamente vía JSON sin necesidad de configuración manual.

```
                                    🌐 SENTINEL-H2O GRAFANA SUITE
                                                  │
 ┌───────────────────────┬────────────────────────┼───────────────────────┬────────────────────────┐
 │                       │                        │                       │                        │
01. Gemelo Virtual    02. Micro-Gemelo         03. IA GRU 24h          04. Auditoría de         05. Clima, Crecidas     06. Salud IoT &
    Cuenca Chancay        por Nodo                & What-If               Volumen y Consumo         y Sequías               Energía Solar
    (Mapa Satelital +    (Inspector de           (Pronósticos Futuros    (Volumen m³, Pérdidas    (Lluvia vs Caudal       (Paneles 12V, Baterías,
     Cascada WQI)         Sensor Individual)      & Lead Time)            & Reparto Agrícola)      & Turbidez)             GSM CSQ & Sensores)
```

---

## 2. Detalle de los 6 Dashboards

### 2.1. `01_gemelo_virtual_cuenca.json` — Gemelo Virtual Cuenca Chancay-Huaral (Macro)
* **Público**: Sala de Situación, ANA, Junta de Usuarios y Directivos de Riego.
* **Componentes**:
  * **Geomapa Satelital**: OpenStreetMap / CartoDB / Esri con marcadores proporcionales al caudal y coloreados por WQI. Tooltip completo con $pH$, $EC$, Turbidez, Caudal, Tirante y Temperatura.
  * **Espejo Virtual "De la Fuente al Surco"**: 4 paneles horizontales con el estado instantáneo de Cabecera (4,350m), Ravira (2,850m), Acos (1,250m) y Huayopampa (320m).
  * **Dinámica en Cascada (4 Series Temporales)**: Caudales ($m^3/s$), Salinidad ($\mu S/cm$), pH con bandas ECA 3 ($6.5-8.5$) y Turbidez (NTU).
  * **Feed de Alertas Activas**: Registro en vivo con confirmación de WhatsApp.

---

### 2.2. `02_monitoreo_nodos_detalle.json` — Micro-Gemelo Digital y Telemetría por Nodo
* **Público**: Técnicos de campo, tomeros de compuerta y operadores de canal.
* **Componentes**:
  * **Variable Dinámica `$id_nodo`**: Permite auditar cualquier estación individual con un clic.
  * **Semáforos Físico-Químicos**: Medidores de aguja para pH, EC, Turbidez y Caudal.
  * **Registro de Historial de Calibración y Deriva**.

---

### 2.3. `03_predicciones_ia_whatif.json` — Inteligencia Artificial, Pronósticos GRU & What-If
* **Público**: Especialistas hidrológicos, modeladores de cuenca y gestión de riesgos.
* **Componentes**:
  * **Curva de Proyección a 24 Horas**: Visualización del futuro ($now \rightarrow now + 24h$) con intervalos de confianza.
  * **Matriz de Lead Time 3D**: Tiempos de retardo de plumas contaminantes por tramo.
  * **Consola de Simulaciones What-If**: Historial de escenarios hidrológicos probados.

---

### 2.4. `04_balance_volumen_consumo.json` — Auditoría Volumétrica, Balance y Pérdidas
* **Público**: Comisiones de regantes, juntas de usuarios y administración de derechos de agua.
* **Componentes**:
  * **Volumen Derivado Acumulado en 24h ($m^3$)**: Cálculo por integración temporal $\int Q(t) dt$.
  * **Distribución por Comisión**: Comparativa de volúmenes entregados a cada sector.
  * **Detección de Pérdidas y Tomas Ilegales**: Balance de conducción entre cabecera y bocatoma.

---

### 2.5. `05_clima_e_hidrologia.json` — Clima, Crecidas y Sequías (OpenWeatherMap)
* **Público**: Defensa Civil, comités de emergencia y pronosticadores de cuenca.
* **Componentes**:
  * **Precipitaciones Satelitales ($mm/h$)**: Lluvia acumulada en partes altas y medias.
  * **Correlación Lluvia en Cumbre vs Caudal en Bocatoma**: Anticipación de avenidas y huaicos.
  * **Semáforo de Crecida / Sequía**: Indicador de riesgo hídrico.

---

### 2.6. `06_salud_iot_energia_solar.json` — Salud de Hardware IoT, Energía Solar y Baterías
* **Público**: Ingenieros de mantenimiento e instrumentación electrónica.
* **Componentes**:
  * **Voltaje de Paneles Solares y Baterías 12V**: Alerta de descarga profunda ($< 11.8\text{V}$).
  * **Calidad de Señal Celular (GSM CSQ 0-31)**: Monitoreo de conectividad.
  * **Diagnóstico de Sensores**: Detección de desconexión o falla de lectura analógica.
