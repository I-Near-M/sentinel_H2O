# 💧Sentinel-H2O — Gemelo Digital Abierto & Sistema de Alerta Temprana Hidro-Agrícola

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Grafana](https://img.shields.io/badge/Grafana_Suite-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Plataforma Integral de Monitoreo Hidrológico en Tiempo Real, Pronósticos con Inteligencia Artificial GRU a 24h, Alertas Tempranas por WhatsApp y Auditoría Volumétrica de Cuenca**

*Diseñado y validado en la Cuenca del Río Chancay-Huaral (Perú) para escalabilidad y replicabilidad mundial.*

</div>

## 🌊 1. ¿Qué es Sentinel-H2O?

**Sentinel-H2O** es una plataforma tecnológica integral de código abierto diseñada para transformar la gobernanza del agua en cuencas hidrográficas y sistemas de riego regulados. Acopla **estaciones telemétricas IoT de bajo costo** en campo con un **Gemelo Digital reactivo**, modelos hidrodinámicos en tiempo real y una **suite agro-analítica de Inteligencia Artificial** conectada con estadísticas agrarias oficiales del **MIDAGRI**.

```
  [ Nodos IoT en Campo ]           [ Backend FastAPI & IA ]            [ Consola Web & Alertas ]
  ESP32 + 5 Sensores RAW  ──(GSM)──► Calibración Dinámica / ML ──(WS)──► Gemelo 3D + WhatsApp
```

---

## ⚡ 2. Características Destacadas (Key Features)

- 📡 **Hardware IoT Agnóstico & Transmisión RAW:**
  El microcontrolador ESP32 captura señales electroquímicas e hidrométricas en crudo (RAW) mediante filtrado de mediana de 20 muestras y las transmite por red celular (GSM/GPRS) en ciclos ultra-eficientes de *Deep Sleep* (15 min). Admite tanto sensores académicos de bajo costo como instrumentación industrial pesada (4-20 mA, Modbus RS-485, sondas piezométricas y radares).
- ⚙️ **Calibración Dinámica en la Nube (Hot Calibration):**
  Ajuste de pendientes (*slope*), voltajes de referencia ($V_{\text{offset}}$), compensación térmica Nernst (a 25°C) y cotas hidráulicas ($D_0$) directamente desde la consola web, **sin requerir reprogramar el firmware en campo**.
- 🌊 **Gemelo Visual 3D & Cascada de Lead Time:**
  Visualizador interactivo 3D del río que simula la propagación de plumas de salinidad o contaminantes tramo a tramo, calculando el tiempo de retardo hidrodinámico ($\Delta t = L / \bar{v}$) mediante la relación de Leopold-Maddock ($\bar{v} = a \cdot Q^b$).
- 🧪 **Simulador Multivariable What-If & Prescripción de Dilución:**
  Permite evaluar escenarios hipotéticos de sequía o vertimientos, calculando automáticamente el caudal de agua de dilución ($Q_{\text{dilución}}$) necesario desde reservorios para restaurar la calidad hídrica.
- 🌾 **Suite Agro-Analítica MIDAGRI (SIEA / ENA):**
  Integración con datos del Ministerio de Desarrollo Agrario y Riego (Costa, Sierra y Selva). Combina el modelo biofísico de **Maas-Hoffman / FAO-56** con un regresor **Random Forest** para evaluar idoneidad hídrica, recomendar cultivos sustitutos resilientes y cuantificar pérdidas económicas estimadas ($\Delta \text{Rendimiento} \times \text{Precio} \times \text{Hectáreas}$).
- 📲 **Despacho Automático de Alertas WhatsApp:**
  Envío de notificaciones inmediatas a teléfonos móviles de directivos de comisiones y tomeros ante eventos críticos de conductividad ($EC > 1500\ \mu S/cm$) o transgresión de pH.
- 📈 **Analítica Avanzada Grafana con SSO:**
  Consola analítica embebida con aprovisionamiento automático de MySQL y Single Sign-On (SSO) transparente por cabeceras seguras `X-WEBAUTH-*`.
- 🔐 **Seguridad RBAC y Validación Estricta:**
  Control de acceso basado en 4 roles (`ADMIN_SISTEMA`, `OPERADOR_JUNTA`, `TOMERO_COMISION`, `AUDITOR_VISOR`), hashing bcrypt, tokens JWT, medidor reactivo de contraseñas y validadores E.164.

---

## 🛠️ 3. Stack Tecnológico

| Capa | Tecnologías / Librerías | Propósito en el Sistema |
|---|---|---|
| **Firmware IoT** | C++, PlatformIO, FreeRTOS, ArduinoJson, DallasTemperature, TinyGSM | Muestreo por mediana, control de divisores resistivos ($100\text{k}/10\text{k}$, $20\text{k}/10\text{k}$) y transmisión HTTP POST. |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy, Pydantic V2, PyMySQL | Ingesta asíncrona de telemetría, enrutamiento REST v1, RBAC y generación OpenAPI / Swagger. |
| **Machine Learning** | Scikit-learn, NumPy, SciPy, Pandas | Anomaly Detector (estrés osmótico), simulador What-If, modelo Maas-Hoffman y Random Forest. |
| **Base de Datos** | MySQL 8.0 (InnoDB Engine) | Almacenamiento de series temporales con índices compuestos `(node_id, recorded_at)` y perfiles de calibración. |
| **Frontend Web** | React 18, Vite, Tailwind CSS, Lucide React, Axios | Consola interactiva, mapas cartográficos, visualizador 3D de río y asistentes de alta de estaciones. |
| **Analítica** | Grafana 10+, ECharts Plugin | Visualización histórica multianual y tableros hidro-ambientales. |
| **Alertas & Clima** | Meta WhatsApp Cloud API, OpenWeather API | Despacho de alertas a celulares y sincronización climática en tiempo real. |
| **Infraestructura** | Docker, Docker Compose, Nginx | Despliegue contenerizado multiplataforma. |

---

## 🏛️ 4. Arquitectura del Sistema

La plataforma opera bajo un modelo desacoplado de microservicios contenerizados:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ARQUITECTURA SENTINEL-H2O                                 │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. EDGE IoT (ESP32)      │ 2. BACKEND API (FastAPI)    │ 3. FRONTEND & ALERTA          │
│ • Sonda pH BNC (4502C)   │ • Ingesta RAW (/ingest)     │ • Consola React 18 + Vite     │
│ • Sensor EC/TDS Titanio  │ • Calibración en Caliente   │ • Gemelo 3D Cascada Lead Time │
│ • Turbidez Óptica TS300B │ • Conversión Caudal (m³/s)  │ • Simulador What-If / Dilución│
│ • Ultrasónico JSN-SR04T  │ • Anomaly Detector (EC>1500)│ • Grafana Embedded SSO        │
│ • Temp Sumergible DS18B20│ • Suite Agro-ML MIDAGRI     │ • Meta WhatsApp Cloud API     │
│ • Divisor Bat 100k/10k   │ • MySQL 8.0 (Series Temp.)  │ • Roles RBAC (4 Niveles)      │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

> 📖 Para ver el diagrama PlantUML detallado y el flujo de datos completo, consulta [`docs/01_ARQUITECTURA_DEL_SISTEMA.md`](docs/01_ARQUITECTURA_DEL_SISTEMA.md).

---

## 🚀 5. Inicio Rápido (Quickstart)

### Opción A: Despliegue Completo con Docker Compose (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/I-Near-M/sentinel_H2O.git
cd sentinel_H2O

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Construir y levantar los 4 contenedores
docker-compose up -d --build
```

Una vez levantado el stack, accede a:
- 🌐 **Consola Web Principal:** [http://localhost:80](http://localhost:80)
- 📚 **Documentación Interactiva Swagger API:** [http://localhost:8000/docs](http://localhost:8000/docs)
- 📊 **Servidor Grafana:** [http://localhost:3000](http://localhost:3000)

---

### Opción B: Entorno de Desarrollo Local

#### 1. Backend (FastAPI):
```bash
cd backend
python -m venv venv
# Activar entorno (Windows: venv\Scripts\activate | Linux: source venv/bin/activate)
pip install -r requirements.txt

# Ejecutar la suite completa de pruebas (50 tests)
python -m pytest tests/ -v

# Iniciar el servidor API
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
# Acceso en: http://localhost:5173
```

#### 3. Firmware de Nodos (ESP32):
```bash
cd firmware
pio run --target upload
```

---

## 🧪 6. Suite de Pruebas Automatizadas

El proyecto cuenta con una cobertura integral de pruebas unitarias y de integración en Pytest:

```bash
python -m pytest backend/tests/ -v
```

```
============================== test session starts ==============================
collected 50 items

backend/tests/test_agro_ml.py ..........                                 [ 20%]
backend/tests/test_api_telemetry.py .........                            [ 38%]
backend/tests/test_auth_rbac.py ...                                      [ 44%]
backend/tests/test_midagri_agro.py ........                              [ 60%]
backend/tests/test_ml.py ............                                    [ 84%]
backend/tests/test_processor.py .....                                    [ 94%]
backend/tests/test_validators.py ......                                  [100%]

======================= 50 passed, 2 warnings in 9.8s =======================
```

---

## 📚 7. Documentación Técnica del Repositorio

| Guía | Archivo | Descripción |
|:---:|---|---|
| **01** | [`docs/01_ARQUITECTURA_DEL_SISTEMA.md`](docs/01_ARQUITECTURA_DEL_SISTEMA.md) | Diagrama general multicapa (PlantUML / StarUML) y flujo de datos. |
| **02** | [`docs/02_DIAGRAMA_ELECTRONICO_Y_HARDWARE.md`](docs/02_DIAGRAMA_ELECTRONICO_Y_HARDWARE.md) | Esquemáticos electrónicos, pinout ESP32, cálculo de divisores y lectura RAW. |
| **03** | [`docs/03_CODIGO_FUENTE_Y_ESTRUCTURA.md`](docs/03_CODIGO_FUENTE_Y_ESTRUCTURA.md) | Árbol del repositorio, microservicios, dependencias y guías de compilación. |
| **04** | [`docs/04_DASHBOARD_Y_VISUALIZACION.md`](docs/04_DASHBOARD_Y_VISUALIZACION.md) | Consola React 18, gemelo 3D, simulador What-If y Grafana SSO. |
| **05** | [`docs/05_BASE_DE_DATOS_Y_MODELO_RELACIONAL.md`](docs/05_BASE_DE_DATOS_Y_MODELO_RELACIONAL.md) | Diagrama ERD, esquema MySQL 8.0, diccionario de datos y series temporales. |
| **06** | [`docs/06_ALGORITMOS_E_INTELIGENCIA_ARTIFICIAL.md`](docs/06_ALGORITMOS_E_INTELIGENCIA_ARTIFICIAL.md) | Modelos de IA: Anomaly Detector, Lead Time, dilución y suite MIDAGRI. |

---

## 📜 8. Licencia y Transferencia Tecnológica

Este proyecto se distribuye bajo la licencia de código abierto **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**.

Se autoriza y promueve su libre uso, adaptación, despliegue y transferencia tecnológica por parte de **Juntas de Usuarios de Agua, Comisiones de Regantes, Autoridades Hídricas (ANA), Gobiernos Regionales, Universidades y la Comunidad Científica**, garantizando que cualquier mejora o adaptación permanezca siempre libre y abierta para toda la comunidad.

---

<p align="center">
  <b>Sentinel-H2O — Open Source Water Governance Platform</b><br>
  <i>Ciencia y Tecnología Abierta para la Seguridad Hídrica</i>
</p>
