import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict


class TipoEntidadBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    permite_gestion_riego: bool = False
    permite_gestion_piscicultura: bool = False
    activo: bool = True


class TipoEntidadResponse(TipoEntidadBase):
    id_tipo_entidad: str
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CargoInstitucionalBase(BaseModel):
    id_tipo_entidad: str
    codigo_cargo: str
    nombre_cargo: str
    nivel_jerarquia: int = 1
    descripcion: Optional[str] = None
    activo: bool = True


class CargoInstitucionalResponse(CargoInstitucionalBase):
    id_cargo: str
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EntidadBase(BaseModel):
    id_tipo_entidad: str
    nombre_entidad: str
    ruc: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email_contacto: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool = True


class EntidadCreate(EntidadBase):
    pass


class EntidadUpdate(BaseModel):
    id_tipo_entidad: Optional[str] = None
    nombre_entidad: Optional[str] = None
    ruc: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email_contacto: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None


class EntidadResponse(EntidadBase):
    id_entidad: str
    tipo_entidad_nombre: Optional[str] = None
    permite_riego: bool = False
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TipoUsoAguaBase(BaseModel):
    codigo: str
    nombre: str
    unidad_medida_demanda: str = "l/s"
    parametros_optimos_json: Optional[Dict[str, Any]] = None
    activo: bool = True


class TipoUsoAguaResponse(TipoUsoAguaBase):
    id_tipo_uso: str
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TipoRecursoHidricoBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    permite_riego_defecto: bool = True
    permite_piscicultura_defecto: bool = False
    geometria_3d_tipo: str = "LINEA_FLUJO"
    activo: bool = True


class TipoRecursoHidricoResponse(TipoRecursoHidricoBase):
    id_tipo_recurso: str
    created_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TipoEntidadCreate(TipoEntidadBase):
    pass


class TipoEntidadUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    permite_gestion_riego: Optional[bool] = None
    permite_gestion_piscicultura: Optional[bool] = None
    activo: Optional[bool] = None


class CargoInstitucionalCreate(CargoInstitucionalBase):
    pass


class CargoInstitucionalUpdate(BaseModel):
    id_tipo_entidad: Optional[str] = None
    codigo_cargo: Optional[str] = None
    nombre_cargo: Optional[str] = None
    nivel_jerarquia: Optional[int] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class TipoUsoAguaCreate(TipoUsoAguaBase):
    pass


class TipoUsoAguaUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    unidad_medida_demanda: Optional[str] = None
    parametros_optimos_json: Optional[Dict[str, Any]] = None
    activo: Optional[bool] = None


class TipoRecursoHidricoCreate(TipoRecursoHidricoBase):
    pass


class TipoRecursoHidricoUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    permite_riego_defecto: Optional[bool] = None
    permite_piscicultura_defecto: Optional[bool] = None
    geometria_3d_tipo: Optional[str] = None
    activo: Optional[bool] = None


# ============================================================================
# CULTIVOS AGRÍCOLAS
# ============================================================================
class CultivoAgricolaBase(BaseModel):
    id_cultivo: Optional[str] = None
    codigo_catalogo: str = "MIDAGRI_PE"
    pais_origen: str = "Perú"
    region_natural: str = "Costa"
    nombre: str
    categoria: str = "Frutales"
    demanda_hidrica_m3_ha: float = 6000.0
    ec_umbral_us_cm: float = 1500.0
    salinidad_pendiente_pct: float = 10.0
    ph_min: float = 6.0
    ph_max: float = 7.5
    turbidez_max_ntu: float = 50.0
    temp_agua_min_c: float = 12.0
    temp_agua_max_c: float = 26.0
    wqi_min: float = 60.0
    dias_ciclo_vegetativo: int = 180
    rendimiento_base_kg_ha: float = 15000.0
    precio_base_moneda_kg: float = 3.0
    moneda_codigo: str = "PEN"
    nivel_resiliencia: str = "Media"
    descripcion: Optional[str] = None
    activo: bool = True


class CultivoAgricolaCreate(CultivoAgricolaBase):
    pass


class CultivoAgricolaUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    region_natural: Optional[str] = None
    demanda_hidrica_m3_ha: Optional[float] = None
    ec_umbral_us_cm: Optional[float] = None
    salinidad_pendiente_pct: Optional[float] = None
    ph_min: Optional[float] = None
    ph_max: Optional[float] = None
    turbidez_max_ntu: Optional[float] = None
    temp_agua_min_c: Optional[float] = None
    temp_agua_max_c: Optional[float] = None
    wqi_min: Optional[float] = None
    dias_ciclo_vegetativo: Optional[int] = None
    rendimiento_base_kg_ha: Optional[float] = None
    precio_base_moneda_kg: Optional[float] = None
    moneda_codigo: Optional[str] = None
    nivel_resiliencia: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class CultivoAgricolaResponse(CultivoAgricolaBase):
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# MATRIZ DE ROLES Y PERMISOS RBAC DEL SISTEMA
# ============================================================================
class SystemRoleOut(BaseModel):
    codigo: str
    nombre: str
    descripcion: str
    nivel_jerarquia: int
    grupo_multiuso: Optional[str] = "ADMINISTRACION"
    permisos: List[str]
    usuarios_activos_count: int = 0
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)


class AuditLogOut(BaseModel):
    id_audit: str
    id_usuario: Optional[str] = None
    email_usuario: Optional[str] = None
    accion: str
    tabla_afectada: str
    id_registro_afectado: Optional[str] = None
    valores_previos_json: Optional[Any] = None
    valores_nuevos_json: Optional[Any] = None
    ip_origen: Optional[str] = None
    timestamp: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

