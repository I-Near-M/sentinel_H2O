# Sentinel-H2O | Backend API & Motor de IA

Este directorio contiene el backend en Python desarrollado con **FastAPI**, el **Motor Físico y Científico de Calidad de Agua**, el **Motor de Inteligencia Artificial** y la integración con **OpenWeatherMap** y **WhatsApp/SMS**.

---

## 📂 Estructura de Directorios

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── telemetry.py       # Ingesta de datos del ESP32 (POST /api/v1/telemetry)
│   │       │   ├── nodes.py           # Estado ONLINE/OFFLINE y fichas de calibración
│   │       │   ├── alerts.py          # Log de contingencias y directorio de destinatarios
│   │       │   ├── weather.py         # Sincronización con OpenWeatherMap API
│   │       │   └── predictions.py     # Pronóstico GRU 24h, Lead Time y What-If
│   │       └── api.py                 # Enrutador maestro API v1
│   ├── core/
│   │   ├── config.py                  # Variables de entorno y configuración Pydantic v2
│   │   └── security.py                # Validación de API Keys
│   ├── database/
│   │   ├── session.py                 # Conexión dual MySQL (Docker) / SQLite (Fallback)
│   │   ├── models.py                  # Modelos relacionales ORM (12 tablas)
│   │   └── init_db.py                 # Sembrado inicial de los 3 nodos MVP
│   ├── ml/
│   │   ├── preprocessor.py            # Tiempo cíclico (sin/cos) y extracción de features
│   │   ├── anomaly_detector.py        # Isolation Forest + Clasificador de severidad
│   │   ├── lead_time.py               # Estimador cinemático-hidráulico de transporte fluvial
│   │   ├── gru_predictor.py           # Red recurrente GRU para proyección a 24 horas
│   │   └── whatif_simulator.py        # Simulador de escenarios de sequía y descargas
│   ├── schemas/
│   │   ├── telemetry.py               # Validación Pydantic del JSON entrante
│   │   ├── nodes.py                   # Esquemas de inventario y estado
│   │   ├── alerts.py                  # Esquemas de alertas y destinatarios
│   │   ├── weather.py                 # Esquemas de clima
│   │   └── predictions.py             # Esquemas de IA, Lead Time y What-If
│   ├── services/
│   │   ├── processor.py               # Fórmulas físicas, compensación térmica (+2%/°C) y WQI
│   │   ├── alert_engine.py            # Evaluación de umbrales y mensajes duales (Técnico/Campesino)
│   │   ├── notification_service.py    # Despacho de WhatsApp (Meta Cloud / OpenWA / Mock)
│   │   ├── weather_client.py          # Cliente asíncrono OpenWeatherMap
│   │   └── telemetry_service.py       # Orquestador de ingesta, cálculo y persistencia
│   └── main.py                        # Instancia FastAPI, CORS y ciclo de vida
├── tests/
│   ├── test_processor.py              # Pruebas unitarias del motor físico y electroquímico
│   ├── test_api_telemetry.py          # Pruebas de integración HTTP de la API REST
│   └── test_ml.py                     # Pruebas del motor de IA (Anomalías, GRU, Lead Time)
├── Dockerfile                         # Imagen de producción en Python 3.11-slim
├── requirements.txt                   # Dependencias pip
├── .env.example                       # Plantilla de variables de entorno
└── .env                               # Archivo de configuración activo
```

---

## ⚙️ Configuración y Ejecución Local

### 1. Crear Entorno Virtual e Instalar Dependencias
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Ejecutar la Suite de Pruebas Automatizadas
```powershell
.venv\Scripts\python -m pytest -v
```

### 3. Iniciar el Servidor de Desarrollo
```powershell
.venv\Scripts\uvicorn backend.app.main:app --reload --port 8000
```
* **Swagger UI interactivo**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📖 Documentación Detallada por Módulo

Consulta la carpeta [`docs/`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/) para especificaciones completas:
* [`docs/01_ARQUITECTURA_GENERAL.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/01_ARQUITECTURA_GENERAL.md)
* [`docs/02_MOTOR_CIENTIFICO_PROCESADOR.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/02_MOTOR_CIENTIFICO_PROCESADOR.md)
* [`docs/03_MOTOR_IA_Y_MACHINE_LEARNING.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/03_MOTOR_IA_Y_MACHINE_LEARNING.md)
* [`docs/04_API_REST_ENDPOINTS.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/04_API_REST_ENDPOINTS.md)
* [`docs/05_BASE_DE_DATOS_Y_MODELOS.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/05_BASE_DE_DATOS_Y_MODELOS.md)
* [`docs/06_MONITOREO_Y_GRAFANA.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/06_MONITOREO_Y_GRAFANA.md)
