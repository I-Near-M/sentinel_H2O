# 🗄️ Sentinel-H2O — Modelo de Datos Relacional y Diccionario MySQL

## 1. Arquitectura de Datos

La base de datos relacional opera sobre **MySQL 8.0** (`sentinel_h2o_db`) y está estructurada bajo principios de normalización, auditoría e integridad referencial estricta.

```
                           ┌───────────────────────────┐
                           │         entidades         │
                           │ (ANA, Juntas, Comisiones) │
                           └─────────────┬─────────────┘
                                         │ 1:N
                                         ▼
                           ┌───────────────────────────┐
                           │           nodos           │
                           │ (Estaciones Telemétricas) │
                           └─────────────┬─────────────┘
                                         │ 1:1
                                         ▼
                           ┌───────────────────────────┐
                           │     nodos_calibracion     │
                           │  (Offsets, Slopes, K, N)  │
                           └─────────────┬─────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 │ 1:N                   │ 1:N                   │ 1:N
                 ▼                       ▼                       ▼
   ┌───────────────────────────┐ ┌───────────────┐ ┌───────────────────────────┐
   │       mediciones_raw      │ │     clima     │ │   predicciones_ia_24h     │
   │  (Voltajes crudos ESP32)  │ │ (OpenWeather) │ │     (Proyecciones GRU)    │
   └─────────────┬─────────────┘ └───────────────┘ └───────────────────────────┘
                 │ 1:1
                 ▼
   ┌───────────────────────────┐
   │    mediciones_procesadas  │
   │ (WQI, pH, EC, NTU, Caudal)│
   └─────────────┬─────────────┘
                 │ 1:N
                 ▼
   ┌───────────────────────────┐ 1:N ┌───────────────────────────┐
   │        alertas_log        │◄────│   destinatarios_alertas   │
   │(WhatsApp Cloud / Audits)  │     │  (Tomeros, Agricultores)  │
   └───────────────────────────┘     └───────────────────────────┘
```

---

## 2. Diccionario de Tablas Principales

### 2.1. `nodos` (Estaciones Telemétricas de Campo)
* `id_nodo` (`VARCHAR(50)`, PK): Identificador físico único (ej. `NODO-01-VICHAYCOCHA`).
* `nombre` (`VARCHAR(150)`): Nombre descriptivo de la estación.
* `latitud` (`DECIMAL(10, 7)`): Coordenada geográfica WGS84.
* `longitud` (`DECIMAL(10, 7)`): Coordenada geográfica WGS84.
* `cota_msnm` (`DECIMAL(7, 2)`): Altitud sobre el nivel del mar en metros.
* `tipo_estacion` (`ENUM`): `CABECERA_CUENCA`, `CONDUCCION_CENTRAL`, `BOCATOMA_REPARTO`, `PARCELA_PILOTO`.
* `api_key` (`VARCHAR(64)`): Token de autenticación de nodo para envío seguro.

### 2.2. `nodos_calibracion` (Parámetros Físico-Químicos e Hidráulicos)
* `id_nodo` (`VARCHAR(50)`, PK, FK): Relación 1:1 con `nodos`.
* `ph_offset_v` (`FLOAT`): Offset del sensor de pH.
* `ph_slope` (`FLOAT`): Pendiente de calibración del electrodo de pH.
* `tds_factor_k` (`FLOAT`): Factor de celda para conductividad.
* `turb_v_clear` (`FLOAT`): Voltaje de agua 0 NTU.
* `turb_v_turbid` (`FLOAT`): Voltaje de agua 1,000 NTU.
* `distancia_fondo_sensor_cm` (`FLOAT`): Altura de montaje del sensor ultrasónico respecto al fondo del canal.
* `caudal_coef_k` (`FLOAT`): Coeficiente de vertedero / canal ($k$).
* `caudal_exp_n` (`FLOAT`): Exponente hidráulico ($n$).

### 2.3. `mediciones_procesadas` (Telemetría Validada y Normalizada)
* `id_proc` (`BIGINT`, PK, Auto): Identificador de registro procesado.
* `id_nodo` (`VARCHAR(50)`, FK): Nodo emisor.
* `timestamp` (`DATETIME`): Fecha y hora UTC del registro.
* `ph` (`DECIMAL(4, 2)`): Potencial de hidrógeno compensado.
* `ec_us_cm` (`DECIMAL(7, 2)`): Conductividad eléctrica a 25°C.
* `turbidez_ntu` (`DECIMAL(7, 2)`): Sólidos suspendidos en NTU.
* `caudal_m3s` (`DECIMAL(8, 4)`): Caudal instantáneo en $m^3/s$.
* `caudal_ls` (`DECIMAL(8, 2)`): Caudal instantáneo en $L/s$.
* `wqi_score` (`DECIMAL(5, 2)`): Índice compuesto de calidad de agua ($0-100$).
* `wqi_categoria` (`ENUM`): `EXCELENTE`, `BUENA`, `POBRE`, `MALA`, `MUY_MALA`.
* `estado_salinidad` (`ENUM`): `OPTIMO`, `PRECAUCION`, `PELIGRO_ESTRES_OSMOTICO`.

### 2.4. `alertas_log` (Historial de Contingencias y Alertas Tempranas)
* `id_alerta` (`BIGINT`, PK, Auto): Identificador del evento de alerta.
* `id_nodo` (`VARCHAR(50)`, FK): Estación donde se originó la contingencia.
* `nivel_severidad` (`ENUM`): `INFO`, `ADVERTENCIA_AMARILLA`, `CRITICO_ROJO`.
* `tipo_evento` (`ENUM`): `ACIDIFICACION_AGUAS`, `SALINIDAD_ALTA`, `TURBIDEZ_ALTA`, `CRECIDA_CAUDAL`, `ESTIAJE_SEVERO`.
* `mensaje_campesino_whatsapp` (`TEXT`): Mensaje formateado para el agricultor.
* `destinatarios_notificados_count` (`INT`): Cantidad de personas notificadas.
