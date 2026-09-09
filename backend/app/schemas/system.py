import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class DashboardGrafanaItem(BaseModel):
    uid: str = Field(..., description="UID del dashboard en Grafana (ej: sentinel-01-cuenca)")
    label: str = Field(..., description="Nombre amigable del tablero")
    desc: str = Field(..., description="Descripción breve de los datos y paneles")
    icon: Optional[str] = Field("Layers", description="Nombre del icono Lucide (ej: Layers, Radio, Cpu, etc.)")


DEFAULT_GRAFANA_DASHBOARDS = [
    {
        "uid": "sentinel-01-cuenca",
        "label": "01 · Sala de Control & Gemelo Cuenca",
        "desc": "Visión integral, WQI y caudales por sector",
        "icon": "Layers"
    },
    {
        "uid": "sentinel-02-nodo-detalle",
        "label": "02 · Monitoreo de Nodos en Detalle",
        "desc": "Series temporales individuales de cada estación",
        "icon": "Radio"
    },
    {
        "uid": "sentinel-03-ia-predicciones",
        "label": "03 · Predicciones IA & What-If",
        "desc": "Modelos predictivos y tiempos de viaje hídrico",
        "icon": "Cpu"
    },
    {
        "uid": "sentinel-04-balance-volumen",
        "label": "04 · Balance Hídrico & Volúmenes",
        "desc": "Estimación de volumen entregado a comisiones",
        "icon": "Waves"
    },
    {
        "uid": "sentinel-05-clima-hidrologia",
        "label": "05 · Clima & Hidrología OpenWeather",
        "desc": "Correlación lluvia-caudal y meteorología",
        "icon": "CloudSun"
    },
    {
        "uid": "sentinel-06-iot-energia-red",
        "label": "06 · Salud IoT & Telemetría Cruda",
        "desc": "Tensión de baterías, señal GSM y voltajes crudos",
        "icon": "Activity"
    }
]


class SystemConfigBase(BaseModel):
    nombre_cuenca: str = Field("Cuenca Chancay-Huaral", max_length=150, description="Nombre de la cuenca o recurso hídrico")
    pais_region: str = Field("Lima, Perú", max_length=100, description="País y departamento / estado / provincia")
    descripcion_cuenca: Optional[str] = Field(None, description="Resumen descriptivo de la cuenca")
    latitud_centro: float = Field(-11.49, description="Latitud inicial para el mapa interactivo")
    longitud_centro: float = Field(-77.05, description="Longitud inicial para el mapa interactivo")
    zoom_inicial: int = Field(10, ge=1, le=20, description="Nivel de zoom inicial (1 a 20)")
    dashboards_grafana: List[DashboardGrafanaItem] = Field(default_factory=lambda: [DashboardGrafanaItem(**d) for d in DEFAULT_GRAFANA_DASHBOARDS])


class SystemConfigUpdate(BaseModel):
    nombre_cuenca: Optional[str] = None
    pais_region: Optional[str] = None
    descripcion_cuenca: Optional[str] = None
    latitud_centro: Optional[float] = None
    longitud_centro: Optional[float] = None
    zoom_inicial: Optional[int] = None
    dashboards_grafana: Optional[List[DashboardGrafanaItem]] = None


class SystemConfigOut(SystemConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id_config: int
    updated_at: Optional[datetime.datetime] = None


class SetupStatusOut(BaseModel):
    is_first_setup: bool
    setup_completed: bool
    config: SystemConfigOut
