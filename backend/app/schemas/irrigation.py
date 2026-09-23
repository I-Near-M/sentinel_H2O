import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class TurnoRiegoBase(BaseModel):
    id_entidad: str
    id_destinatario: str
    id_nodo_aguas_arriba: str
    id_nodo_aguas_abajo: str
    id_nodo_bocatoma: str
    fecha_inicio_programada: datetime.datetime
    fecha_fin_programada: datetime.datetime
    horas_programadas: float = Field(..., gt=0.0, description="Duración en horas")
    caudal_acordado_ls: float = Field(..., gt=0.0, description="Caudal de derivación en l/s")
    volumen_programado_m3: Optional[float] = Field(None, description="Volumen total programado en m³")
    observaciones: Optional[str] = None


class TurnoRiegoCreate(TurnoRiegoBase):
    pass


class TurnoRiegoUpdate(BaseModel):
    fecha_inicio_programada: Optional[datetime.datetime] = None
    fecha_fin_programada: Optional[datetime.datetime] = None
    horas_programadas: Optional[float] = None
    caudal_acordado_ls: Optional[float] = None
    volumen_programado_m3: Optional[float] = None
    volumen_real_entregado_m3: Optional[float] = None
    estado_turno: Optional[str] = None
    observaciones: Optional[str] = None


class TurnoRiegoResponse(TurnoRiegoBase):
    id_turno: str
    volumen_real_entregado_m3: float = 0.0
    balance_impacto_tramo_pct: float = 0.0
    cumplimiento_pct: float = 0.0
    estado_turno: str
    activo: bool
    created_at: Optional[datetime.datetime] = None

    nombre_regante: Optional[str] = None
    nombre_entidad: Optional[str] = None
    nombre_nodo_arriba: Optional[str] = None
    nombre_nodo_abajo: Optional[str] = None
    nombre_nodo_bocatoma: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReachHydraulicImpactRequest(BaseModel):
    id_nodo_aguas_arriba: str
    id_nodo_aguas_abajo: str
    caudal_captacion_ls: float = Field(..., gt=0.0, description="Caudal extraído por la toma en l/s")
    duracion_horas: float = Field(4.0, gt=0.0, description="Duración de la entrega de turno")


class ReachHydraulicImpactResponse(BaseModel):
    id_nodo_aguas_arriba: str
    id_nodo_aguas_abajo: str
    caudal_arriba_actual_m3s: float
    caudal_arriba_actual_ls: float
    caudal_captacion_ls: float
    caudal_captacion_m3s: float
    caudal_abajo_proyectado_m3s: float
    caudal_abajo_proyectado_ls: float
    reduccion_caudal_tramo_pct: float
    volumen_turno_m3: float
    impacto_caudal_ecologico: str
    es_viable: bool
    observacion_hidraulica: str
