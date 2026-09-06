import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class WeatherRecordOut(BaseModel):
    id_clima: int
    id_nodo: str
    timestamp: datetime.datetime
    temp_ambiente_c: float
    sensacion_termica_c: Optional[float] = None
    humedad_pct: float
    presion_hpa: float
    lluvia_1h_mm: float
    lluvia_3h_mm: float
    nubosidad_pct: int
    viento_vel_ms: Optional[float] = None
    condicion_principal: str
    descripcion_clima: str
    icono_codigo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WeatherSyncResponse(BaseModel):
    status: str
    id_nodo: str
    datos_clima: Optional[WeatherRecordOut] = None
    mensaje: str
