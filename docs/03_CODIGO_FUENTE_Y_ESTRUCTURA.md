# 💻 Sentinel-H2O — Estructura del Código Fuente y Guía de Desarrollo

> **Plataforma Abierta de Gemelo Virtual Descentralizado e IoT para la Seguridad y Gobernanza Hídrica**  
> **Requerimiento Oficial:** ☑ Código Fuente  
> **Licencia:** Open Source (GNU AGPL v3.0)

---

## 1. Filosofía del Repositorio y Modularidad

**Sentinel-H2O** está concebido como una plataforma **universal, desacoplada y agnóstica**, capaz de ser desplegada en cualquier cuenca hidrográfica, sistema de riego regulado o red de monitoreo ambiental.

Su arquitectura se basa en microservicios contenerizados y módulos independientes:
1. **Firmware de Campo (`/firmware`):** Adquisición en crudo (RAW) y transmisión agnóstica de sensores físicos.
2. **Backend API (`/backend`):** Núcleo asíncrono en FastAPI para ingesta de alta velocidad, calibración en caliente, modelamiento hidrológico y algoritmos de Machine Learning.
3. **Persistencia Relacional (`/database`):** Esquema SQL normalizado para series temporales, perfiles de calibración y roles RBAC.
4. **Analítica en Grafana (`/grafana`):** Aprovisionamiento automatizado de tableros hidro-ambientales y autenticación transparente SSO.
5. **Frontend React (`/frontend`):** Consola operativa con visualizadores 2D/3D, cascada de tiempos de tránsito (Lead Time), simulación What-If y gestión de alertas.

---

## 2. Árbol Estructurado del Repositorio

```
sentinel_H2O/
├── backend/                              # Microservicios y Núcleo Lógico (FastAPI / Python 3.11+)
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                   # Inyección de dependencias (Sesiones DB, usuario autenticado)
│   │   │   └── v1/
│   │   │       ├── api.py                # Enrutador principal de endpoints v1
│   │   │       └── endpoints/
│   │   │           ├── telemetry.py      # Ingesta RAW (/ingest), calibración, series y WQI
│   │   │           ├── nodes.py          # CRUD de estaciones, rotación de claves y calibración en vivo
│   │   │           ├── predictions.py    # Lead Time, cascada de propagación, What-If y dilución
│   │   │           ├── alerts.py         # Gestión de suscriptores y despacho de alertas WhatsApp
│   │   │           ├── auth.py           # Autenticación OAuth2 JWT, bcrypt y RBAC
│   │   │           ├── weather.py        # Sincronización meteorológica en tiempo real
│   │   │           └── system.py         # Configuración del sistema, auditoría y healthchecks
│   │   ├── core/
│   │   │   ├── config.py                 # Carga de variables de entorno (.env) y settings
│   │   │   ├── security.py               # Generación y validación de tokens JWT y hashing
│   │   │   └── validators.py             # Validadores de teléfono E.164, contraseñas robustas y documentos
│   │   ├── database/
│   │   │   ├── session.py                # Engine y SessionLocal de SQLAlchemy
│   │   │   ├── models.py                 # Modelos ORM relacionales (Nodes, Telemetry, Users, etc.)
│   │   │   └── init_db.py                # Inicialización y semillero de datos
│   │   ├── ml/                           # Algoritmos de Machine Learning y Modelos Hidráulicos
│   │   │   ├── anomaly_detector.py       # Detección multivariable y cálculo de estrés osmótico
│   │   │   ├── lead_time.py              # Hidrodinámica Leopold-Maddock y tiempos de viaje (Lead Time)
│   │   │   ├── whatif_simulator.py       # Simulador estocástico What-If y cálculo de dilución de plumas
│   │   │   ├── agro_risk_model.py        # Modelamiento de riesgo agro-climático
│   │   │   ├── crop_recommender.py       # Motor de recomendación de cultivos resilientes
│   │   │   ├── gru_predictor.py          # Red neuronal recurrente GRU para series temporales
│   │   │   └── midagri_processor.py      # Procesador de benchmarks agrícolas oficiales
│   │   ├── schemas/                      # Esquemas Pydantic V2 para validación de entrada/salida
│   │   │   ├── telemetry.py
│   │   │   ├── nodes.py
│   │   │   ├── auth.py
│   │   │   ├── alerts.py
│   │   │   ├── predictions.py
│   │   │   └── system.py
│   │   ├── services/
│   │   │   ├── whatsapp.py               # Integración con Meta WhatsApp Cloud API / Mock Provider
│   │   │   └── weather_service.py        # Conexión con APIs meteorológicas (OpenWeather)
│   │   └── main.py                       # Instancia de aplicación FastAPI y middlewares CORS
│   ├── tests/                            # Suite integral de pruebas automatizadas (Pytest)
│   │   ├── test_api_telemetry.py         # Tests de ingesta, calibración y seguridad
│   │   ├── test_auth_rbac.py             # Tests de roles, login y bootstrap de superadmin
│   │   ├── test_ml.py                    # Tests de anomalías, lead time y simulaciones What-If
│   │   ├── test_agro_ml.py               # Tests de modelos agronómicos
│   │   ├── test_processor.py             # Tests de compensación térmica y curvas de aforo
│   │   └── test_validators.py            # Tests de teléfonos, contraseñas y DNI/RUC
│   ├── Dockerfile                        # Contenedor de producción para el backend
│   └── requirements.txt                  # Dependencias del backend
│
├── frontend/                             # Consola Web de Operación (React 18 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardOverview.jsx     # Telemetría en vivo, semaforización y cálculo WQI
│   │   │   ├── WatershedMap.jsx          # Mapa cartográfico interactivo georreferenciado
│   │   │   ├── CascadeRiverVisualizer3D.jsx # Visualizador 3D de cascada de río y dispersión de plumas
│   │   │   ├── WhatIfSimulatorView.jsx   # Simulador multivariable interactivo y prescripción de dilución
│   │   │   ├── NodeManagement.jsx        # Directorio de estaciones con calibración en caliente y API keys
│   │   │   ├── NodeProvisionWizard.jsx   # Asistente guiado de 4 pasos para alta de estaciones
│   │   │   ├── RecipientsManagement.jsx  # Padrón de regantes y selector de alertas WhatsApp
│   │   │   ├── UserManagement.jsx        # Administración de usuarios y roles RBAC
│   │   │   ├── AuditManagement.jsx       # Registro histórico de auditoría de eventos y calibraciones
│   │   │   ├── SystemSettingsManagement.jsx # Configuración de parámetros operativos y sincronización
│   │   │   ├── GrafanaEmbeddedView.jsx   # Visor de tableros Grafana con autenticación SSO
│   │   │   ├── LoginPage.jsx             # Inicio de sesión seguro y bootstrap de primer admin
│   │   │   ├── ProfileModal.jsx          # Gestión de perfil y cambio seguro de credenciales
│   │   │   ├── PasswordStrengthMeter.jsx # Medidor visual reactivo de calidad de contraseñas
│   │   │   ├── OpsHeader.jsx             # Barra superior con estado del sistema y selector de tema
│   │   │   └── OpsSidebar.jsx            # Navegación lateral estructurada por roles
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # Estado global de autenticación, JWT y permisos
│   │   │   ├── SystemConfigContext.jsx   # Parámetros operativos y umbrales globales
│   │   │   └── ThemeContext.jsx          # Alternador de modo claro / modo oscuro
│   │   ├── services/
│   │   │   └── api.js                    # Cliente HTTP Axios configurado con interceptores JWT
│   │   ├── utils/
│   │   │   ├── validators.js             # Validaciones frontend de teléfonos y documentos
│   │   │   └── dateUtils.js              # Formateadores de fecha y hora local
│   │   ├── App.jsx                       # Rutas protegidas y layout principal
│   │   └── main.jsx                      # Entrypoint de React
│   ├── package.json                      # Dependencias frontend (React, Lucide, Tailwind, Canvas)
│   └── vite.config.js                    # Configuración de compilación y servidor proxy de Vite
│
├── firmware/                             # Firmware C++ para Nodos Telemétricos (ESP32)
│   ├── include/
│   │   └── config.h                      # Mapeo de pines, APN celular y endpoint de ingest
│   ├── src/
│   │   └── main.cpp                      # Muestreo analógico RAW, filtrado de mediana y HTTP POST
│   └── platformio.ini                    # Configuración PlatformIO y dependencias ArduinoJson
│
├── database/                             # Definición de Esquema SQL
│   └── schema.sql                        # Script DDL de tablas, índices y restricciones referenciales
│
├── grafana/                              # Aprovisionamiento de Analítica Avanzada
│   ├── provisioning/
│   │   ├── datasources/                  # Conexión automática con MySQL
│   │   └── dashboards/                   # Configuración de carpetas de tableros
│   └── dashboards/                       # Archivos JSON de tableros hidro-analíticos
│
├── docs/                                 # Documentación Técnica Integral del Repositorio
├── docker-compose.yml                    # Orquestación multicontenedor (Backend + DB + Grafana + Nginx)
├── LICENSE                               # Licencia Open Source GNU AGPL v3.0
└── README.md                             # Guía general del proyecto
```

---

## 3. Stack Tecnológico y Dependencias

| Componente | Tecnología | Librerías Principales | Función en la Plataforma |
|---|---|---|---|
| **Firmware IoT** | C++ / PlatformIO | `ArduinoJson`, `OneWire`, `DallasTemperature`, `TinyGSM` | Captura de señales en crudo (RAW), filtrado por mediana de 20 muestras y transmisión HTTP. |
| **Backend API** | Python 3.11+ / FastAPI | `FastAPI`, `Uvicorn`, `SQLAlchemy`, `Pydantic V2`, `PyMySQL`, `httpx` | Ingesta asíncrona, calibración dinámica en caliente, gestión de nodos y autenticación. |
| **Machine Learning** | Python | `scikit-learn`, `numpy`, `scipy`, `pandas` | Detección de anomalías de calidad, cálculo de estrés osmótico, simulador What-If y Lead Time. |
| **Persistencia** | MySQL 8.0 | `InnoDB Engine`, índices temporales | Almacenamiento seguro de series temporales, perfiles de calibración y roles de usuario. |
| **Visualización** | Grafana 10+ | `volkovlabs-echarts-panel`, `Auth Proxy` | Análisis exploratorio de series temporales con Single Sign-On (SSO) transparente. |
| **Frontend Web** | React 18 / Vite | `Tailwind CSS`, `Lucide React`, `Axios`, `React Router DOM` | Consola web interactiva con gemelo digital 2D/3D, mapa de estaciones y wizards de gestión. |
| **Alertas** | HTTP Webhooks / Meta API | `Cloud API WhatsApp` | Envío automatizado de mensajes de alerta temprana a números de agricultores y tomeros. |

---

## 4. Guía de Instalación y Puesta en Marcha

### Opción A: Despliegue con Docker Compose (Recomendado para Producción)
```bash
# 1. Clonar el repositorio
git clone https://github.com/I-Near-M/sentinel_H2O.git
cd sentinel_H2O

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Construir y levantar todos los servicios
docker-compose up -d --build

# Servicios disponibles:
# - Frontend Web:    http://localhost:80
# - Backend API Docs: http://localhost:8000/docs
# - Grafana Console:  http://localhost:3000
```

### Opción B: Entorno de Desarrollo Local

#### 1. Backend (FastAPI):
```bash
cd backend
python -m venv venv
# Activar entorno (Windows: venv\Scripts\activate | Linux: source venv/bin/activate)
pip install -r requirements.txt

# Ejecutar suite de pruebas unitarias (50 tests)
python -m pytest tests/ -v

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
# Acceso en: http://localhost:5173
```

#### 3. Firmware (ESP32):
```bash
cd firmware
pio run --target upload
```
