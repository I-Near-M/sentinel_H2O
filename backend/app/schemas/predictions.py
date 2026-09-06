import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class HourlyForecastItem(BaseModel):
    horizonte_horas: int = Field(..., description="Paso horario futuro (+1 a +24)")
    fecha_proyectada: str
    caudal_predicho_m3s: float
    caudal_predicho_ls: float
    wqi_predicho: float
    wqi_categoria: str
    ph_predicho: float
    ec_predicho_us_cm: float
    tds_predicho_ppm: float
    temp_predicha_c: float
    turbidez_predicha_ntu: float
    riesgo_estres_hidrico: str


class Forecast24hResponse(BaseModel):
    id_nodo: str
    fecha_emision: datetime.datetime
    modelo_ia: str = "GRU-Shallow-v1.0"
    pronostico_24h: List[HourlyForecastItem]

    model_config = ConfigDict(from_attributes=True)


class LeadTimeRequest(BaseModel):
    origen_nodo_id: str = Field(..., json_schema_extra={"example": "NODO-01-CABECERA"})
    destino_nodo_id: str = Field("NODO-03-PARCELA", json_schema_extra={"example": "NODO-03-PARCELA"})
    caudal_origen_m3s: Optional[float] = Field(None, description="Caudal instantáneo en m³/s (si no se provee, se toma la última lectura)", json_schema_extra={"example": 1.8})


class LeadTimeResponse(BaseModel):
    origen_nodo_id: str
    destino_nodo_id: str
    distancia_km: float
    caudal_transporte_m3s: float
    velocidad_flujo_kmh: float
    lead_time_frente_horas: float
    lead_time_pico_horas: float
    lead_time_despeje_horas: float
    ventana_anticipacion_minutos: int
    tiempo_legible: str
    recomendacion_accion: str


class WhatIfRequest(BaseModel):
    titulo_escenario: str = Field(..., json_schema_extra={"example": "Simulación de Sequía Severa -40% Lluvia"})
    delta_precipitacion_pct: float = Field(0.0, ge=-100.0, le=500.0, description="Variación % de lluvia", json_schema_extra={"example": -40.0})
    delta_salinidad_us_cm: float = Field(0.0, ge=0.0, le=5000.0, description="Incremento de salinidad en uS/cm", json_schema_extra={"example": 350.0})
    delta_caudal_cabecera_pct: float = Field(0.0, ge=-100.0, le=200.0, description="Variación % en descarga de lagunas", json_schema_extra={"example": -20.0})
    id_entidad: Optional[int] = Field(None, json_schema_extra={"example": 2})
    ejecutado_por: Optional[str] = Field("Ingeniero de Cuenca", json_schema_extra={"example": "Ingeniero de Cuenca"})


class WhatIfResponse(BaseModel):
    id_simulacion: int
    titulo_escenario: str
    caudal_valle_proyectado_m3s: float
    caudal_valle_proyectado_ls: float
    salinidad_proyectada_ec: float
    tds_proyectado_ppm: float
    turbidez_proyectada_ntu: float
    wqi_score_proyectado: float
    wqi_categoria_proyectada: str
    resumen_impacto: str
