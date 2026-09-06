# 🏛️ Sentinel-H2O — Arquitectura General del Sistema

## 1. Introducción y Propósito

**Sentinel-H2O** es una plataforma tecnológica de código abierto concebida como un **Gemelo Digital Abierto y Sistema de Alerta Temprana Hidro-Agrícola**. Su objetivo primordial es brindar trazabilidad en tiempo real de la calidad del agua, volumen derivado y riesgos de contaminación a lo largo de una cuenca hidrográfica (desde los glaciares y bofedales andinos hasta las parcelas agrícolas costeras).

---

## 2. Diagrama de Arquitectura Multicapa

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CAPA 1: ADQUISICIÓN DE CAMPO (EDGE IoT)               │
│                                                                             │
│   [ Sonda pH Industrial ]  [ Sensor Toroidal EC ]  [ Sonda Turbidez NTU ]   │
│   [ Sensor Nivel Ultras.]  [ Termistor DS18B20 ]   [ Sensor Hall Caudal ]   │
│                           │                                                 │
│                           ▼                                                 │
│            ┌──────────────────────────────┐                                 │
│            │  MICROCONTROLADOR ESP32-WROOM │                                 │
│            │  • Conversión ADC & Filtros  │                                 │
│            │  • Supervisión Batería 12V   │                                 │
│            │  • Modem GSM/GPRS (SIM800L)  │                                 │
│            │  • Fallback LoRaWAN SX1276   │                                 │
│            └──────────────┬───────────────┘                                 │
└───────────────────────────┼─────────────────────────────────────────────────┘
                            │ JSON Telemétrico (HTTPS / MQTT)
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CAPA 2: INGESTA, PROCESAMIENTO & MACHINE LEARNING         │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                      FASTAPI BACKEND CORE ENGINE                     │  │
│   │                                                                      │  │
│   │  1. Ingesta y Validación Pydantic (X-API-Key de Nodo)                │  │
│   │  2. Calibración Paramétrica Individual (Offset, Slope, Polinomios)   │  │
│   │  3. Motor Físico-Químico: WQI (CCME/NSF), TDS, Caudal Hidráulico     │  │
│   │  4. Motor de IA: Redes GRU a 24h & Simulador What-If                 │  │
│   │  5. Motor de Alertas: Evaluación ECA 3 / FAO & WhatsApp Cloud API    │  │
│   │  6. Cálculo Topológico 3D Dinámico: Distancia y Lead Time de Pluma   │  │
│   └──────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CAPA 3: PERSISTENCIA Y GOBERNANZA DE DATOS              │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        MYSQL 8.0 RELATIONAL DB                       │  │
│   │  • entidades, nodos, nodos_calibracion                               │  │
│   │  • mediciones_raw, mediciones_procesadas, clima_openweather          │  │
│   │  • predicciones_ia_24h, simulaciones_whatif_log                      │  │
│   │  • destinatarios_alertas, alertas_log                                │  │
│   └──────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                   ┌───────────────────┴───────────────────┐
                   ▼                                       ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     CAPA 4: VISUALIZACIÓN GRAFANA    │  │    CAPA 5: WEB SPA & ALERTAS      │
│                                      │  │                                   │
│  • 01. Gemelo Virtual Cuenca (Geomap)│  │  • Portal Web React 18 + Tailwind │
│  • 02. Micro-Gemelo por Nodo         │  │  • Gestión de Nodos y Regantes    │
│  • 03. Pronósticos IA GRU & What-If  │  │  • Consola de Auditoría y Calib.  │
│  • 04. Balance Volumétrico & Fugas   │  │  • WhatsApp Cloud API Bot Rural   │
│  • 05. Clima, Crecidas y Sequías     │  │  • Fallback SMS Directo SIM800L   │
│  • 06. Salud IoT & Energía Solar     │  │                                   │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 3. Topología de Red y Componentes

| Servicio Docker | Imagen / Stack | Puerto Interno | Puerto Host | Rol / Responsabilidad |
| :--- | :--- | :--- | :--- | :--- |
| **`sentinel-db`** | `mysql:8.0` | `3306` | `3306` | Persistencia relacional, índices espaciales, triggers e integridad referencial. |
| **`sentinel-backend`** | `python:3.11-slim` (FastAPI) | `8000` | `8000` | Ingesta telemétrica, procesamiento científico, motor GRU, alertas WhatsApp y API REST. |
| **`sentinel-grafana`** | `grafana/grafana:latest` | `3000` | `3000` | Suite de 6 Dashboards aprovisionados, geomapa satelital y series temporales. |
| **`sentinel-frontend`** | `nginx:alpine` + React SPA | `80` | `80` | Interfaz web de administración y proxy inverso para enrutamiento seguro hacia `/api/v1`. |

---

## 4. Flujo de Datos "De la Muestra al Aviso"

1. **Adquisición**: El microcontrolador ESP32 toma 10 lecturas analógicas de cada sensor, aplica la mediana móvil y compone el payload JSON.
2. **Transmisión**: El módem SIM800L transmite vía HTTP POST autenticado con `X-API-Key` al endpoint `/api/v1/telemetry/raw`.
3. **Calibración y Conversión**: El procesador recupera los factores de calibración únicos del nodo y convierte voltajes crudos a unidades de ingeniería ($pH$, $\mu S/cm$, $\text{NTU}$, $m^3/s$).
4. **Clasificación y Normalización**: Se calcula el **WQI Score (0-100)** y se verifica el cumplimiento con los Estándares de Calidad Ambiental (ECA 3) y directrices FAO.
5. **Inferencia de IA**: Si se detectan anomalías o desviaciones, el motor GRU proyecta la evolución a 24 horas y calcula el tiempo de arribo ($t_{\text{arribo}}$) al siguiente punto de toma de agua.
6. **Alerta Rural**: Si se superan los umbrales críticos, se despacha un mensaje a los teléfonos celulares de los tomeros y agricultores vía WhatsApp Cloud API.
7. **Visualización Continua**: Los tableros de Grafana y la aplicación Web reflejan el estado del Gemelo Digital en menos de 3 segundos.
