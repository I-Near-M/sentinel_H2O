# 📊 Sentinel-H2O — Consola de Visualización, Gemelo Digital y Dashboards

> **Plataforma Abierta de Gemelo Virtual Descentralizado e IoT para la Seguridad Hídrica**  
> **Requerimiento Oficial:** ☑ Dashboard y Visualización  
> **Licencia:** Open Source (GNU AGPL v3.0)

---

## 1. Visión General de la Interfaz

La capa de presentación de **Sentinel-H2O** está construida sobre **React 18 + Vite + Tailwind CSS**, ofreciendo una experiencia reactiva en tiempo real para operadores, tomadores de decisiones y auditores.

La interfaz se divide en **módulos especializados**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CONSOLA WEB OPERATIVA SENTINEL-H2O                           │
├───────────────────────┬───────────────────────┬─────────────────────────────────┤
│ 1. Telemetría en Vivo │ 2. Gemelo 3D Cascada  │ 3. Simulador What-If & Dilución │
│    & Semáforo de WQI  │    & Lead Time de Río │    & Prescripción Hidráulica    │
├───────────────────────┼───────────────────────┼─────────────────────────────────┤
│ 4. Gestión de Nodos   │ 5. Padrón Regantes    │ 6. Analítica Avanzada Grafana   │
│    & Calibración Viva │    & Alertas WhatsApp │    con Single Sign-On (SSO)     │
└───────────────────────┴───────────────────────┴─────────────────────────────────┘
```

---

## 2. Módulos Operativos Principales

### A. Panel General de Telemetría (`DashboardOverview.jsx`)
- **Indicadores en Tiempo Real:** Visualización instantánea de variables físico-químicas (pH, conductividad eléctrica $EC$, turbidez, temperatura del agua) e hidrométricas (nivel y caudal $m^3/s$).
- **Índice de Calidad de Agua (WQI Simplificado):** Algoritmo ponderado que clasifica el agua para fines de riego en 4 categorías: *Excelente* ($WQI \ge 90$), *Buena* ($70 \le WQI < 90$), *Regular* ($50 \le WQI < 70$) y *Pobre / Crítica* ($WQI < 50$).
- **Semaforización Dinámica de Estaciones:** Alertas visuales inmediatas en verde (operación normal), ámbar (atención preventiva) y rojo (evento crítico).

### B. Mapa Cartográfico de Cuenca (`WatershedMap.jsx`)
- Representación georreferenciada de las estaciones telemétricas sobre la red hidrográfica.
- Marcadores interactivos que despliegan ventanas emergentes (*popups*) con el último reporte telemétrico, estado de batería y nivel de señal celular.

### C. Visualizador 3D de Cascada y Tiempos de Viaje (`CascadeRiverVisualizer3D.jsx`)
- **Gemelo Visual de Río:** Representación tridimensional interactiva del perfil longitudinal del cauce fluvial y sus estaciones.
- **Simulación de Propagación de Plumas:** Permite simular vertimientos o picos de salinidad aguas arriba, mostrando cómo avanza la masa de agua contaminada con animación cronometrada segundo a segundo y degradado de color (azul $\to$ amarillo $\to$ rojo).
- **Reloj de Lead Time:** Cálculo en tiempo real de la hora estimada de arribo ($\Delta t$) a cada punto de captación o compuerta de riego.

### D. Simulador Multivariable What-If (`WhatIfSimulatorView.jsx`)
- Interfaz interactiva de experimentación predictiva donde el operador puede ingresar variaciones hipotéticas de caudal, sequías o vertimientos.
- Computa la prescripción de dilución volumétrica y evalúa el impacto económico y agronómico sobre los cultivos de la zona.

### E. Directorio de Estaciones y Calibración en Caliente (`NodeManagement.jsx`)
- **Ajuste Dinámico de Sensores:** Modal de calibración que permite modificar voltajes de referencia ($V_{\text{offset}}$), pendientes (*slope*), factores de conductividad ($K$) y cotas cero ($D_0$) directamente desde la web, actualizando las fórmulas del backend de inmediato sin necesidad de reflashear los nodos en campo.
- **Gestión de Seguridad:** Generación y rotación de tokens `API_KEY` por estación.

### F. Asistente Guiado de Aprovisionamiento (`NodeProvisionWizard.jsx`)
- Wizard de 4 pasos para desplegar nuevas estaciones telemétricas:
  1. *Paso 1:* Identificación y coordenadas GPS (Latitud, Longitud, Cota msnm).
  2. *Paso 2:* Geometría del canal y parámetros de aforo hidráulico.
  3. *Paso 3:* Calibración de sondas analógicas.
  4. *Paso 4:* Asignación de grupos de alerta WhatsApp.

### G. Integración con Grafana mediante Proxy SSO (`GrafanaEmbeddedView.jsx`)
- Embebe consolas de **Grafana 10+** mediante reverse proxy autenticado con cabeceras `X-WEBAUTH-*`.
- Sincroniza automáticamente los privilegios del usuario (Admin, Operador, Auditor) para visualización de series temporales multianuales y gráficos ECharts sin solicitar doble inicio de sesión.
