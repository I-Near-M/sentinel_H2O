# 🌊 Sentinel-H2O — Gemelo Digital Abierto & Sistema de Alerta Temprana Hidro-Agrícola

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Grafana](https://img.shields.io/badge/Grafana_Suite-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Plataforma Integral de Monitoreo Hidrológico en Tiempo Real, Pronósticos con Inteligencia Artificial GRU a 24h, Alertas Tempranas por WhatsApp y Auditoría Volumétrica de Cuenca "De la Fuente al Surco".**

*Diseñado y validado en la Cuenca del Río Chancay-Huaral (Perú) para escalabilidad y replicabilidad mundial.*

[Arquitectura](docs/01_ARQUITECTURA_GENERAL.md) • [Motor Físico-Químico](docs/02_MOTOR_CIENTIFICO_PROCESADOR.md) • [Inteligencia Artificial](docs/03_MOTOR_IA_Y_MACHINE_LEARNING.md) • [Endpoints API](docs/04_API_REST_ENDPOINTS.md) • [Dashboards Grafana](docs/06_MONITOREO_Y_GRAFANA.md) • [Despliegue Docker](docs/08_GUIA_DESPLIEGUE_WEB_Y_VPS.md)

</div>

---

## 📌 1. Visión General del Proyecto

**Sentinel-H2O** es una solución tecnológica integral de código abierto diseñada para resolver la crisis de gestión hídrica, contaminación fluvial no detectada y salinización de suelos agrícolas en cuencas hidrográficas y distritos de riego.

El sistema conecta estaciones telemétricas autónomas de bajo costo con alimentación solar y conectividad celular/LoRaWAN, procesa muestras hidro-químicas en tiempo real mediante algoritmos de normalización agronómica, proyecta escenarios futuros con **Redes Neuronales Recurrentes GRU**, calcula tiempos de arribo de plumas contaminantes (*Lead Time 3D*) y notifica instantáneamente a regantes y autoridades vía **WhatsApp Cloud API**.

```
  🏔️ CABECERA ANDINA (4,350 msnm)              🌊 BOCATOMA PRINCIPAL (1,250 msnm)            🌾 PARCELA PILOTO (320 msnm)
  ┌──────────────────────────────┐              ┌──────────────────────────────┐              ┌──────────────────────────────┐
  │   Estación Vichaycocha       │              │   Estación Acos              │              │   Estación Huayopampa        │
  │   [pH, EC, Turb, Q, Solar]   │              │   [Reparto Hídrico & Calidad]│              │   [Riego Frutales y Salinidad│
  └──────────────┬───────────────┘              └──────────────┬───────────────┘              └──────────────┬───────────────┘
                 │ (GSM / LoRaWAN)                             │ (GSM / LoRaWAN)                             │ (GSM / LoRaWAN)
                 └──────────────────────────────┬──────────────┴─────────────────────────────────────────────┘
                                                ▼
                             ┌─────────────────────────────────────┐
                             │       SENTINEL-H2O CLOUD ENGINE     │
                             │  • Ingesta & Calibración Sensoral   │
                             │  • Cálculo WQI (CCME / NSF)         │
                             │  • Pronóstico GRU a 24h & What-If   │
                             │  • Lead Time 3D & Propagación       │
                             └──────────────────┬──────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
  ┌──────────────────────────────┐                              ┌──────────────────────────────┐
  │   SUITE DE 6 DASHBOARDS      │                              │  MOTOR DE ALERTAS RURALES    │
  │   GRAFANA (Gemelo Virtual)   │                              │  WhatsApp Cloud API / SMS    │
  │   http://localhost:3000      │                              │  Mensajería Comunitaria      │
  └──────────────────────────────┘                              └──────────────────────────────┘
```

---

## 🚀 2. Capacidades Principales

### 🧠 A. Inteligencia Artificial y Pronóstico Hidrológico (GRU)
* **Pronóstico Multivariado a 24 Horas**: Red Neuronal Recurrente (*Gated Recurrent Unit*) que proyecta tendencias de pH, Salinidad ($\mu S/cm$), Turbidez (NTU) y Caudal ($m^3/s$) con horizonte de 96 pasos horarios.
* **Cálculo Topológico Dinámico de Lead Time (3D)**:
  $$t_{\text{arribo}} = \frac{d_{\text{río}}}{v_{\text{pluma}}} = \frac{\sqrt{d_{2D}^2 + \Delta z^2} \times 1.28}{v_{\text{pluma}}}$$
  Permite a los comités de regantes cerrar compuertas horas antes de la llegada de vertimientos tóxicos o picos de turbidez.
* **Simulador de Escenarios What-If**: Modelación hidrodinámica instantánea para evaluar impactos de vertimientos mineros, lluvias torrenciales o descargas de represas.

### 🧪 B. Motor Físico-Químico y Agronómico
* **Índice Compuesto WQI (*Water Quality Index*)**: Normalización multi-parámetro según estándares CCME/NSF adaptados a la normativa peruana **ECA Categoría 3 (Riego y Bebida de Animales)** y directrices **FAO de Calidad de Agua para la Agricultura**.
* **Detección de Estrés Osmótico**: Supervisión continua de Conductividad Eléctrica ($\mu S/cm$) y Sólidos Totales Disueltos (TDS) para proteger cultivos de palto, melocotón y vid.
* **Aforo Automatizado en Tiempo Real**: Cálculo continuo de tirante de agua ($cm$) y caudal ($m^3/s$ y $L/s$) mediante vertederos y curvas de gasto calibradas.

### 📊 C. Suite de 6 Dashboards en Grafana
1. **01. Gemelo Virtual Cuenca Chancay-Huaral**: Mapa satelital interactivo (OpenStreetMap/CartoDB/Esri), KPIs de sala de control, espejo virtual en cascada "De la Fuente al Surco" y series temporales comparativas.
2. **02. Micro-Gemelo y Telemetría por Nodo**: Diagnóstico profundo e histórico focalizado de cada estación telemétrica con selector dinámico `$id_nodo`.
3. **03. Pronósticos IA GRU a 24h & What-If**: Curvas proyectadas a futuro, matriz de propagación 3D e historial de simulaciones.
4. **04. Auditoría Volumétrica y Balance Hídrico**: Integración temporal de volumen derivado ($m^3$), consumo por comisión de regantes y balance de pérdidas en conducción.
5. **05. Clima, Crecidas y Sequías (OpenWeatherMap)**: Correlación entre precipitaciones satelitales en cumbre y caudales/turbidez en bocatoma.
6. **06. Salud IoT, Energía Solar y Baterías**: Supervisión de paneles solares, baterías 12V, calidad de señal celular (CSQ) y deriva de sensores.

### 📱 D. Alerta Temprana Comunitaria (WhatsApp & SMS)
* Envío automatizado de mensajes en lenguaje campesino claro y directo a tomeros, directivos de comisiones y autoridades (ANA, Junta de Usuarios).
* Registro auditable con confirmación de entrega y conteo de regantes prevenidos.

---

## 🏗️ 3. Estructura del Repositorio Monorepo

```
Proyecto Chancay/
├── .env.example                # Plantilla pública de variables de entorno
├── .gitignore                  # Reglas de exclusión de Git (protección de secretos)
├── docker-compose.yml          # Orquestador multi-contenedor (DB, API, Web, Grafana)
├── README.md                   # Documentación principal del repositorio
│
├── backend/                    # Core API FastAPI & Motor de Machine Learning
│   ├── app/
│   │   ├── api/v1/endpoints/   # Endpoints REST (telemetry, nodes, alerts, predictions)
│   │   ├── core/               # Configuración central y seguridad
│   │   ├── database/           # Modelos SQLAlchemy y sesión de base de datos
│   │   ├── ml/                 # Modelos GRU, Anomaly Detector, Lead Time & What-If
│   │   ├── schemas/            # Esquemas de validación Pydantic
│   │   └── services/           # Ingesta, Calibración, WQI y Motor de Alertas
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                   # Aplicación Web SPA (React + Tailwind + Nginx)
│   ├── src/                    # Componentes, vistas y dashboard UI
│   ├── nginx.conf              # Servidor web Nginx con proxy inverso hacia API y Grafana
│   ├── package.json
│   └── Dockerfile
│
├── database/                   # Definición DDL y Gobernanza de Datos
│   └── schema.sql              # Esquema relacional completo MySQL 8.0 (100% limpio)
│
├── grafana/                    # Aprovisionamiento de Visualización
│   ├── dashboards/             # Suite de 6 Dashboards JSON
│   └── provisioning/           # Auto-descubrimiento de datasources y tableros
│
├── firmware/                   # Código de Microcontroladores para Estaciones de Campo
│   ├── include/                # Cabeceras y configuración (config.h)
│   ├── src/                    # Lógica de adquisición analógica, filtrado y HTTP/GSM
│   └── platformio.ini
│
└── docs/                       # Documentación Técnica Detallada
    ├── 01_ARQUITECTURA_GENERAL.md
    ├── 02_MOTOR_CIENTIFICO_PROCESADOR.md
    ├── 03_MOTOR_IA_Y_MACHINE_LEARNING.md
    ├── 04_API_REST_ENDPOINTS.md
    ├── 05_BASE_DE_DATOS_Y_MODELOS.md
    ├── 06_MONITOREO_Y_GRAFANA.md
    ├── 07_HARDWARE_Y_CONEXIONADO_ESP32.md
    └── 08_GUIA_DESPLIEGUE_WEB_Y_VPS.md
```

---

## ⚡ 4. Guía Rápida de Despliegue (1 Comando)

### Prerrequisitos
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) o Docker Engine + Docker Compose (Linux).
* [Git](https://git-scm.com/).

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/sentinel-h2o.git
   cd sentinel-h2o
   ```

2. **Crear archivo de variables de entorno:**
   ```bash
   cp .env.example .env
   ```

3. **Construir y levantar todos los servicios:**
   ```bash
   docker compose up -d --build
   ```

4. **Acceder a las interfaces:**
   * 🌐 **Aplicación Web Principal**: [http://localhost/](http://localhost/)
   * 📊 **Grafana Dashboards**: [http://localhost:3000/](http://localhost:3000/) *(Usuario: `admin` | Contraseña: `sentinel_admin_2026`)*
   * 📜 **Documentación Interactiva Swagger API**: [http://localhost:8000/docs](http://localhost:8000/docs)
   * 🗄️ **Base de Datos MySQL**: `127.0.0.1:3306` *(Usuario: `sentinel_user` | Pass: `sentinel_password_2026` | DB: `sentinel_h2o_db`)*

---

## 🔒 5. Gestión de Secretos y Variables de Entorno

Toda la configuración se gestiona a través del archivo raíz `.env` (ignorado por Git):

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `MYSQL_ROOT_PASSWORD` | Contraseña de administrador MySQL | `rootpassword2026` |
| `MYSQL_DATABASE` | Nombre de base de datos relacional | `sentinel_h2o_db` |
| `MYSQL_USER` | Usuario de aplicación | `sentinel_user` |
| `MYSQL_PASSWORD` | Contraseña de usuario | `sentinel_password_2026` |
| `OPENWEATHER_API_KEY` | Clave API para telemetría meteorológica | Configurada en `.env` |
| `GRAFANA_ADMIN_USER` | Administrador de Grafana | `admin` |
| `GRAFANA_ADMIN_PASSWORD`| Contraseña de Grafana | `sentinel_admin_2026` |
| `MASTER_API_KEY` | Clave maestra para ingesta segura de nodos | `sentinel_h2o_master_secret_2026` |

---

## 📚 6. Documentación del Sistema

Para consultar las especificaciones técnicas completas, revisa los manuales en la carpeta `docs/`:

* 🏛️ [**01. Arquitectura General y Flujo de Datos**](docs/01_ARQUITECTURA_GENERAL.md)
* 🧪 [**02. Motor Físico-Químico, Fórmulas WQI y Calibración**](docs/02_MOTOR_CIENTIFICO_PROCESADOR.md)
* 🤖 [**03. Motor de Inteligencia Artificial, Redes GRU y What-If**](docs/03_MOTOR_IA_Y_MACHINE_LEARNING.md)
* 🔌 [**04. Catálogo Completo de Endpoints API REST**](docs/04_API_REST_ENDPOINTS.md)
* 🗄️ [**05. Modelo de Datos Relacional y Diccionario MySQL**](docs/05_BASE_DE_DATOS_Y_MODELOS.md)
* 📈 [**06. Manual de la Suite de 6 Dashboards de Grafana**](docs/06_MONITOREO_Y_GRAFANA.md)
* ⚡ [**07. Manual de Hardware, Sensores y Conexiones ESP32**](docs/07_HARDWARE_Y_CONEXIONADO_ESP32.md)
* ☁️ [**08. Guía de Despliegue en Producción y Servidores VPS**](docs/08_GUIA_DESPLIEGUE_WEB_Y_VPS.md)

---

## 👥 7. Licencia y Créditos
 
Este proyecto está bajo la Licencia **GNU Affero General Public License v3.0 (AGPL-3.0)**. Desarrollado con vocación de impacto social y rigor científico para proteger la seguridad hídrica y la sostenibilidad alimentaria en las cuencas del Perú y el mundo.
