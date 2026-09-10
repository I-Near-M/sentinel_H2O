# 📚 Sentinel-H2O — Índice de Documentación Técnica del Repositorio

> **Plataforma Abierta de Gemelo Virtual Descentralizado e IoT para la Seguridad y Gobernanza Hídrica**  
> **Licencia:** Open Source (GNU AGPL v3.0)

---

## 📑 Módulos de Documentación Técnica

La documentación del repositorio se estructura en **6 guías técnicas integrales**:

| Módulo | Documento Técnico | Contenido Principal |
|:---:|---|---|
| **01** | [`01_ARQUITECTURA_DEL_SISTEMA.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/01_ARQUITECTURA_DEL_SISTEMA.md) | Diagrama general de arquitectura multicapa (PlantUML / StarUML), flujo de datos Edge-to-Cloud y microservicios Docker. |
| **02** | [`02_DIAGRAMA_ELECTRONICO_Y_HARDWARE.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/02_DIAGRAMA_ELECTRONICO_Y_HARDWARE.md) | Diagramas esquemáticos electrónicos, pinout del microcontrolador ESP32, cálculo de divisores resistivos y arquitectura agnóstica de sensores RAW. |
| **03** | [`03_CODIGO_FUENTE_Y_ESTRUCTURA.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/03_CODIGO_FUENTE_Y_ESTRUCTURA.md) | Árbol completo del proyecto (`/backend`, `/frontend`, `/firmware`, `/database`, `/grafana`), dependencias y guía de ejecución local con Docker. |
| **04** | [`04_DASHBOARD_Y_VISUALIZACION.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/04_DASHBOARD_Y_VISUALIZACION.md) | Consola web React 18, gemelo visual 3D de río con cascada de tiempos de tránsito (Lead Time), simulador What-If y Grafana SSO. |
| **05** | [`05_BASE_DE_DATOS_Y_MODELO_RELACIONAL.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/05_BASE_DE_DATOS_Y_MODELO_RELACIONAL.md) | Diagrama Entidad-Relación (ERD), esquema MySQL 8.0, tablas de series de tiempo, diccionario de datos e índices analíticos. |
| **06** | [`06_ALGORITMOS_E_INTELIGENCIA_ARTIFICIAL.md`](file:///c:/Users/Near/Desktop/Proyecto%20Chancay/docs/06_ALGORITMOS_E_INTELIGENCIA_ARTIFICIAL.md) | Modelos de IA: Anomaly Detector (estrés osmótico), hidrodinámica Lead Time, simulador de dilución y suite agronómica MIDAGRI (Maas-Hoffman y Random Forest). |

---

## 🚀 Inicio Rápido con Docker Compose

```bash
# 1. Clonar el repositorio
git clone https://github.com/I-Near-M/sentinel_H2O.git
cd sentinel_H2O

# 2. Configurar variables de entorno y levantar servicios
cp .env.example .env
docker-compose up -d --build
```
