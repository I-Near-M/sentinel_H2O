# 🔌 Sentinel-H2O — Catálogo de Endpoints API REST

## 1. Especificación General

La API REST de **Sentinel-H2O** está construida con **FastAPI** y se encuentra documentada interactivamente bajo el estándar OpenAPI (Swagger UI) en:
* **URL Swagger**: `http://localhost:8000/docs`
* **URL ReDoc**: `http://localhost:8000/redoc`
* **Prefijo Global**: `/api/v1`

---

## 2. Autenticación y Seguridad

* **Ingesta Telemétrica de Nodos IoT**: Cabecera `X-API-Key: <api_key_nodo>`.
* **Operaciones Administrativas (Creación de Nodos / Configuración)**: Cabecera `X-Master-Key: sentinel_h2o_master_secret_2026`.

---

## 3. Catálogo de Endpoints

### 3.1. Telemetría (`/api/v1/telemetry`)

| Método | Ruta | Descripción | Autenticación |
| :---: | :--- | :--- | :---: |
| `POST` | `/api/v1/telemetry/raw` | Recibe payload telemétrico crudo desde el ESP32, procesa con calibración, calcula WQI, evalúa alertas y persiste en BD. | `X-API-Key` |
| `GET` | `/api/v1/telemetry/latest` | Retorna la última medición procesada de todos los nodos activos. | Pública |
| `GET` | `/api/v1/telemetry/node/{id_nodo}/latest` | Retorna la última medición procesada de un nodo específico. | Pública |
| `GET` | `/api/v1/telemetry/node/{id_nodo}/history` | Retorna el historial temporal de mediciones procesadas con filtro por fecha (`limit`, `start_date`, `end_date`). | Pública |

#### Ejemplo de Payload Crudo (`POST /api/v1/telemetry/raw`)
```json
{
  "id_nodo": "NODO-01-VICHAYCOCHA",
  "timestamp": "2026-09-06T18:00:00Z",
  "raw_v_ph": 2.50,
  "raw_v_tds": 0.35,
  "raw_v_turb": 4.10,
  "raw_dist_cm": 60.5,
  "temp_c": 9.2,
  "v_bateria_12v": 12.65,
  "v_panel_solar": 18.20,
  "temp_gabinete_c": 18.5,
  "gsm_csq": 24
}
```

---

### 3.2. Nodos y Calibración (`/api/v1/nodes`)

| Método | Ruta | Descripción | Autenticación |
| :---: | :--- | :--- | :---: |
| `GET` | `/api/v1/nodes/` | Lista todos los nodos registrados en la cuenca. | Pública |
| `POST` | `/api/v1/nodes/` | Registra una nueva estación telemétrica en la cuenca. | `X-Master-Key` |
| `GET` | `/api/v1/nodes/{id_nodo}` | Obtiene el detalle técnico y metadatos del nodo. | Pública |
| `PUT` | `/api/v1/nodes/{id_nodo}/calibration` | Actualiza los coeficientes de calibración individuales del nodo. | `X-Master-Key` |

---

### 3.3. Predicciones IA y Simulaciones (`/api/v1/predictions`)

| Método | Ruta | Descripción | Autenticación |
| :---: | :--- | :--- | :---: |
| `GET` | `/api/v1/predictions/{id_nodo}/forecast-24h` | Genera o consulta el pronóstico GRU a 24 horas para el nodo. | Pública |
| `POST` | `/api/v1/predictions/whatif-simulation` | Ejecuta una simulación hidrodinámica What-If de propagación. | `X-Master-Key` |
| `GET` | `/api/v1/predictions/lead-time` | Calcula dinámicamente la distancia 3D y tiempo de tránsito entre dos nodos. | Pública |

---

### 3.4. Alertas y Regantes (`/api/v1/alerts`)

| Método | Ruta | Descripción | Autenticación |
| :---: | :--- | :--- | :---: |
| `GET` | `/api/v1/alerts/active` | Retorna las alertas tempranas registradas en las últimas 24h. | Pública |
| `GET` | `/api/v1/alerts/recipients` | Lista los destinatarios rurales (tomeristas, agricultores, ANA). | `X-Master-Key` |
| `POST` | `/api/v1/alerts/recipients` | Registra un nuevo destinatario para alertas por WhatsApp/SMS. | `X-Master-Key` |
