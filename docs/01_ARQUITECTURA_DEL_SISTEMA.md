# 🏛️ Sentinel-H2O — Arquitectura del Sistema

> **I Concurso de Ciencia y Tecnología para la Seguridad Hídrica en la Cuenca Chancay-Huaral**  
> **Organizado por:** Autoridad Nacional del Agua (ANA) y Consejo de Recursos Hídricos de Cuenca Chancay-Huaral (CRHCCH-H)  
> **Requerimiento Oficial:** ☑ Arquitectura del Sistema  
> **Licencia:** Open Source (GNU AGPL v3.0)

---

## 1. Diagrama General de Arquitectura (PlantUML / StarUML)

El siguiente diagrama representa la arquitectura multicapa real implementada en la plataforma **Sentinel-H2O**, conectando desde los nodos telemétricos en campo (Edge) hasta la consola web de gobernanza y el despacho de alertas tempranas vía WhatsApp:

![Arquitectura del Sistema Sentinel-H2O](assets/arquitectura_sistema.png)

---

## 2. Código Fuente del Diagrama (PlantUML / StarUML)



```plantuml
@startuml
!theme plain
skinparam backgroundColor #0B132B
skinparam defaultFontName "Segoe UI", Arial, sans-serif
skinparam defaultFontSize 11
skinparam roundCorner 8
skinparam shadowing false
skinparam packageStyle rectangle

<style>
package {
  FontColor #E2E8F0
  FontSize 12
  FontStyle bold
}
rectangle {
  FontColor #F8FAFC
  FontSize 11
}
database {
  FontColor #F8FAFC
  FontSize 11
}
actor {
  FontColor #38BDF8
}
arrow {
  LineColor #38BDF8
  FontColor #94A3B8
  FontSize 10
}
</style>

skinparam package {
  BackgroundColor #1C2541
  BorderColor #3A506B
  BorderThickness 1.5
}

package "1. ESTACIONES TELEMETRICAS IoT (EDGE)" as pkg_edge #0B192C {
  rectangle "<b>Sensores Fisico-Quimicos e Hidrometricos</b>\n- Sonda pH Industrial BNC (PH-4502C)\n- Sensor Conductividad EC/TDS (Titanio)\n- Turbidez Optica TS-300B (Divisor 20k/10k)\n- Nivel Ultrasonico JSN-SR04T (Divisor Echo)\n- Sonda Temp Sumergible DS18B20 (1-Wire)" as sens #1E3E62
  
  rectangle "<b>Microcontrolador ESP32 DevKit V1</b>\n- Muestreo Multimuestra (Mediana 20 muestras)\n- Medicion Tension Bateria (Divisor 100k/10k)\n- Empaquetado de Datos Crudos (RAW JSON)\n- Ciclos Deep Sleep de Bajo Consumo (15 min)" as esp32 #008170
  
  rectangle "<b>Comunicaciones y Autonomia Energetica</b>\n- Modem Celular GSM/GPRS SIM800L (UART2)\n- Panel Solar 50W + Bateria LiFePO4 12V\n- Convertidor Buck DC-DC (12V a 5V 3A)\n- Carcasa IP67 (30% Polimeros Reciclados)" as pwr #232D3F
  
  sens -right-> esp32 : Senales Analogicas / Digitales (RAW)
  esp32 -down-> pwr : Control & Telemetria
}

cloud "RED CELULAR GSM / GPRS (Internet Publica)" as net #0284C7

package "2. PLATAFORMA SERVIDORA SENTINEL-H2O (Docker Stack)" as pkg_srv #03001C {

  package "Backend API & Microservicios (FastAPI / Python 3.11+)" as pkg_back #0F1035 {
    rectangle "<b>API Router REST v1 (/api/v1)</b>\n- /telemetry/ingest (Ingesta RAW con API Key)\n- /nodes (CRUD, Claves y Calibracion)\n- /predictions (Lead Time, Cascadas & What-If)\n- /alerts (Padron de Regantes & WhatsApp)\n- /auth (OAuth2 JWT & RBAC 4 Roles)\n- /weather (Sincronizacion OpenWeather)" as router #2E073F
    
    rectangle "<b>Motor de Procesamiento Hidraulico</b>\n- Calibracion Dinamica al Vuelo (Sin reflashear)\n- Compensacion Termica Nernst (TDS a 25°C)\n- Conversion Nivel a Caudal Volumetrico (m3/s)\n- Calculo de Indice de Calidad (WQI)" as proc #4B0082
    
    rectangle "<b>Motor de IA & Modelos Predictivos</b>\n- Anomaly Detector (Estres Osmotico EC > 1500)\n- Cascada de Lead Time (v_med = a * Q^b)\n- Simulador What-If & Prescripcion de Dilucion\n- Benchmarks Agroclimaticos MIDAGRI" as ml_core #1F4172
    
    router --> proc : Flujo de Datos RAW
    proc --> ml_core : Variables Calibradas
  }

  package "Persistencia de Datos (MySQL 8.0 Engine)" as pkg_db #111827 {
    database "<b>sentinel_h2o_db</b>\n- nodes (Metadatos & Calibraciones)\n- telemetry_records (Series Temporales)\n- discharge_curves (Curvas de Aforo)\n- recipients (Padron de Regantes)\n- alert_logs & audit_logs\n- users (Roles RBAC)" as db #334155
  }

  package "Visualizacion Analitica (Grafana 10+)" as pkg_grafana #1C274C {
    rectangle "<b>Servidor Grafana Provisionado</b>\n- Datasource MySQL Auto-configurado\n- Dashboards Oficiales Cuenca Chancay\n- ECharts Plugin (Series Temporales)\n- Reverse Proxy Auth SSO (X-WEBAUTH-*)" as graf #2A3663
  }

  package "Frontend Web UI (React 18 + Vite + Tailwind CSS)" as pkg_front #005B41 {
    rectangle "<b>Consola Web Operativa</b>\n- DashboardOverview (Metricas en Vivo & WQI)\n- WatershedMap (Mapa Interactivo Cuenca)\n- CascadeRiverVisualizer3D (Cascada Lead Time)\n- WhatIfSimulatorView (Simulador Dilucion)\n- NodeManagement (Calibracion en Vivo)\n- NodeProvisionWizard (Alta en 4 Pasos)\n- RecipientsManagement (Padron & WhatsApp)\n- UserManagement (RBAC & Claves Robustas)" as ui #008170
  }

  proc --> db : Guardar Telemetria Calibrada
  ml_core --> db : Registrar Eventos & Simulaciones
  db --> graf : Consultas SQL Directas
  router <--> db : Transacciones ORM SQLAlchemy
  ui <--> router : REST API (JSON / JWT Bearer)
  ui --> graf : Consola Embebida (SSO Seguro)
}

package "3. SERVICIOS EXTERNOS & ACTORES DE LA CUENCA" as pkg_ext #1E293B {
  cloud "OpenWeather API\n(Pronostico Meteorologico)" as ow #3B82F6
  cloud "Meta WhatsApp Cloud API\n(Alertas Tempranas Instantaneas)" as wa #22C55E
  
  actor "Autoridades ANA / CRHCCH-H\n[AUDITOR_VISOR]" as user_ana #38BDF8
  actor "Operadores Junta de Usuarios\n[OPERADOR_JUNTA]" as user_junta #4ADE80
  actor "Tomeros & Comisiones\n[TOMERO_COMISION / Regantes]" as user_tomero #FBBF24
}

pwr --> net : HTTP POST (Payload RAW JSON)
net --> router : Ingesta Autenticada con Token
router --> ow : Consulta Clima Cuenca
router --> wa : Envio Webhooks de Alerta

wa -down-> user_tomero : Mensajes WhatsApp (Salinidad Critica)
user_ana --> ui : Monitoreo y Fiscalizacion Publica
user_junta --> ui : Calibracion, Aforo y Simulaciones
user_tomero --> ui : Registro de Aforos de Campo
@enduml
```

---

## 3. Desglose Técnico de Componentes Reales

### A. Estaciones Telemétricas de Campo (Edge IoT)
- **Microcontrolador ESP32 DevKit V1:** Ejecuta firmware en C++ estructurado en FreeRTOS. Realiza un filtrado de mediana sobre 20 muestras por canal para suprimir perturbaciones electromagnéticas e hidráulicas.
- **Transmisión Agnóstica de Señales RAW:** El nodo no procesa fórmulas rígidas en su memoria interna; transmite directamente voltajes analógicos ($0.0 - 3.3\text{ V}$) y tiempos de vuelo ultrasónicos ($cm$) empaquetados en un payload JSON liviano.
- **Divisores Resistivos de Precisión:**
  - *Batería:* Divisor $100\text{ k}\Omega / 10\text{ k}\Omega$ conectado directo a bornes para sensar hasta $15\text{ V DC}$.
  - *Turbidez:* Divisor $20\text{ k}\Omega / 10\text{ k}\Omega$ (1:3) para atenuar de $4.5\text{ V}$ a $1.5\text{ V}$.
  - *ECHO Ultrasónico:* Divisor $1\text{ k}\Omega / 2\text{ k}\Omega$ para proteger la entrada de $3.3\text{ V}$ del microcontrolador.
- **Gestión de Energía:** Panel solar de 50W, batería LiFePO4 de 12V 12Ah con BMS y convertidor Buck LM2596, operando en ciclos de *Deep Sleep* de 15 minutos para garantizar autonomía continua.
- **Sostenibilidad:** Carcasa IP67 con prensaestopas fabricada con un **30% de polímeros reciclados (rPET/rPEAD)**.

---

### B. Backend API y Microservicios (FastAPI / Python 3.11+)
- **API REST v1 (`/api/v1`)**:
  - `/telemetry/ingest`: Endpoint asíncrono de alta velocidad que valida el `API_KEY` del nodo, ejecuta la calibración en caliente y detecta transgresiones de límites de calidad de agua.
  - `/nodes`: Gestión de inventario de estaciones, rotación de claves y actualización instantánea de parámetros de calibración (`ph_offset`, `ph_slope`, `ec_k_factor`, distancia cero $D_0$).
  - `/predictions`: Motor analítico de cálculo de tiempo de viaje hidráulico (*Lead Time*), cascadas de propagación de contaminantes tramo a tramo, y simulador estocástico *What-If* con prescripción de dilución.
  - `/alerts`: Gestión del padrón de regantes, sectores de riego y despacho de alertas vía Meta WhatsApp API.
  - `/auth`: Autenticación segura con JSON Web Tokens (JWT) y control de acceso basado en 4 roles (`ADMIN_SISTEMA`, `OPERADOR_JUNTA`, `TOMERO_COMISION`, `AUDITOR_VISOR`).
  - `/weather`: Sincronización continua de datos climáticos y pronósticos de la cuenca Chancay-Huaral mediante la API de OpenWeather.

---

### C. Persistencia y Almacenamiento (MySQL 8.0)
- Motor de base de datos relacional desplegado en contenedor Docker con volúmenes persistentes.
- **Tablas Principales:**
  - `nodes`: Metadatos geográficos, cotas msnm y perfiles de hardware.
  - `calibration_profiles`: Factores de conversión analógica-física por estación.
  - `telemetry_records`: Series temporales indexadas con métricas crudas y calibradas.
  - `discharge_curves`: Tablas de aforo y coeficientes de Manning/vertederos.
  - `recipients`: Padrón de usuarios agrícolas, cargos y números validados E.164.
  - `users`: Cuentas con hash bcrypt y control de permisos RBAC.

---

### D. Servidor de Analítica y Dashboards (Grafana 10+)
- Contenedor dedicado con auto-aprovisionamiento de datasources MySQL y tableros oficiales de la cuenca.
- Plugin `volkovlabs-echarts-panel` para gráficos hidro-ambientales avanzados.
- **Autenticación Proxy SSO:** Integrado transparentemente con el backend mediante cabeceras seguras `X-WEBAUTH-*`, sincronizando los roles de los usuarios sin necesidad de doble login.

---

### E. Consola Web Operativa (React 18 + Vite + Tailwind CSS)
- **`DashboardOverview.jsx`:** Monitoreo en tiempo real de los 6 nodos de la cuenca, semaforización de estado y cálculo del Índice de Calidad de Agua (WQI).
- **`WatershedMap.jsx`:** Mapa cartográfico interactivo georreferenciado con las coordenadas reales de las estaciones en la cuenca Chancay-Huaral.
- **`CascadeRiverVisualizer3D.jsx`:** Gemelo visual interactivo que simula el río en 3D, calculando la cascada de tiempos de llegada (Lead Time) y la dispersión cromática de plumas de salinidad.
- **`WhatIfSimulatorView.jsx`:** Entorno interactivo para simular escenarios de estrés hídrico, sequías y cálculo automático del volumen de agua de dilución requerido.
- **`NodeManagement.jsx`:** Directorio de estaciones con panel de **Calibración en Vivo** (permite ajustar sondas sin reprogramar el firmware) y generador de claves.
- **`NodeProvisionWizard.jsx`:** Asistente interactivo en 4 pasos para incorporar nuevas estaciones telemétricas a la red.
- **`RecipientsManagement.jsx`:** Padrón de regantes con validación de teléfonos en tiempo real y selector de alertas.
- **`UserManagement.jsx`:** Gestión de usuarios con medidor visual interactivo de fortaleza de contraseñas y asignación de roles RBAC.
