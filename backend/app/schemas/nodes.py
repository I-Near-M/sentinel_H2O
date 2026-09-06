import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# SCHEMAS DE ENTIDADES GESTORAS
# ============================================================================
class EntityCreateIn(BaseModel):
    nombre_entidad: str = Field(..., description="Nombre oficial de la entidad (ej: Junta de Usuarios del Sector Hidráulico Chancay-Huaral)")
    tipo_entidad: str = Field(default="JUNTA_USUARIOS", description="GUBERNAMENTAL_ANA, JUNTA_USUARIOS, COMISION_REGANTES, ASOCIACION_AGRICULTORES, PRIVADO")
    ruc: Optional[str] = Field(None, description="RUC o Identificador Fiscal de la Entidad")
    telefono_contacto: Optional[str] = Field(None, description="Teléfono de contacto")
    email_contacto: Optional[str] = Field(None, description="Email de contacto")
    direccion: Optional[str] = Field(None, description="Dirección de la sede")


class EntityOut(BaseModel):
    id_entidad: int
    nombre_entidad: str
    tipo_entidad: str
    ruc: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email_contacto: Optional[str] = None
    direccion: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DE CALIBRACIÓN Y UMBRALES
# ============================================================================
class CalibrationOut(BaseModel):
    id_calibracion: Optional[int] = None
    ph_offset_v: float
    ph_slope: float
    tds_factor_k: float
    tds_offset_v: float
    turb_v_clear: float
    turb_v_turbid: float
    distancia_fondo_sensor_cm: float
    caudal_coef_k: float
    caudal_exp_n: float
    es_vigente: bool
    calibrado_por: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ThresholdOut(BaseModel):
    ph_min_alerta: float
    ph_max_alerta: float
    ec_max_advertencia_us_cm: float
    ec_max_critico_us_cm: float
    tds_max_alerta_ppm: float
    turb_max_alerta_ntu: float
    tirante_min_alerta_cm: float
    bateria_min_alerta_v: float

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DEL ASISTENTE DE PROVISIÓN (ONBOARDING WIZARD)
# ============================================================================
class NodeProvisionIn(BaseModel):
    # Paso 1: Datos de Identificación y Ubicación
    id_nodo: Optional[str] = Field(None, description="Identificador único (ej: NODO-04-HUARAL). Si se omite, se autogenera.")
    nombre: str = Field(..., description="Nombre descriptivo (ej: Bocatoma Canal El Naranjal - Huayopampa)")
    id_entidad_responsable: int = Field(..., description="ID de la entidad gestora a la que pertenece el nodo")
    sector_cuenca: str = Field(default="CUENCA_MEDIA", description="CUENCA_ALTA, CUENCA_MEDIA, CUENCA_BAJA, PARCELA_PILOTO")
    subcuenca: str = Field(default="Chancay-Huaral", description="Nombre de la subcuenca o quebrada")
    latitud: float = Field(..., description="Latitud GPS (ej: -11.4521)")
    longitud: float = Field(..., description="Longitud GPS (ej: -77.0145)")
    cota_msnm: float = Field(default=500.0, description="Altitud sobre el nivel del mar en metros")
    tipo_fuente: str = Field(default="CANAL_DERIVACION", description="RIO_PRINCIPAL, CANAL_DERIVACION, BOCATOMA_PARCELA, LAGUNA_REPRESADA, MANANTIAL, OTRO")
    intervalo_envio_min: int = Field(default=15, description="Frecuencia de muestreo y envío en minutos (por defecto 15 min)")
    descripcion: Optional[str] = Field(None, description="Detalles adicionales del punto de monitoreo")

    # Paso 2: Calibración Hidráulica y Sensores
    ph_offset_v: float = Field(default=2.5000, description="Voltaje medido en solución buffer pH 7.0 (V)")
    ph_slope: float = Field(default=-0.1840, description="Pendiente de respuesta del electrodo de pH (V/pH)")
    tds_factor_k: float = Field(default=0.5000, description="Factor de conversión TDS/EC")
    turb_v_clear: float = Field(default=4.2000, description="Voltaje del sensor óptico en agua 100% limpia (V)")
    turb_v_turbid: float = Field(default=2.5000, description="Voltaje del sensor óptico en agua turbia (V)")
    distancia_fondo_sensor_cm: float = Field(default=100.0, description="Altura fija de montaje del sensor ultrasónico sobre el fondo del canal (cm)")
    caudal_coef_k: float = Field(default=1.0000, description="Coeficiente K de la ecuación de gasto Q = K * h^N")
    caudal_exp_n: float = Field(default=1.5500, description="Exponente N de la ecuación de gasto (ej: 1.55 para Parshall)")
    calibrado_por: Optional[str] = Field(default="Asistente Web Sentinel-H2O", description="Responsable de calibración")

    # Paso 3: Umbrales Agronómicos y de Alerta
    ph_min_alerta: float = Field(default=6.50, description="Límite inferior de pH de seguridad")
    ph_max_alerta: float = Field(default=8.50, description="Límite superior de pH de seguridad")
    ec_max_advertencia_us_cm: float = Field(default=1200.0, description="Umbral de advertencia de salinidad (µS/cm)")
    ec_max_critico_us_cm: float = Field(default=1500.0, description="Umbral crítico de salinidad para protección de frutales (µS/cm)")
    tds_max_alerta_ppm: float = Field(default=750.0, description="Umbral de sólidos disueltos totales (ppm)")
    turb_max_alerta_ntu: float = Field(default=50.0, description="Umbral de turbidez máxima (NTU)")
    tirante_min_alerta_cm: float = Field(default=10.0, description="Tirante mínimo antes de alerta por corte de agua (cm)")
    bateria_min_alerta_v: float = Field(default=11.50, description="Voltaje mínimo de batería de 12V antes de alerta (V)")


class NodeProvisionOut(BaseModel):
    id_nodo: str
    nombre: str
    subcuenca: str
    api_key_plaintext: str = Field(..., description="API Key única generada. Debe copiarse y grabarse en el firmware del ESP32.")
    cpp_config_snippet: str = Field(..., description="Fragmento de código C++ listo para pegar en config.h")
    mensaje: str
    nodo_detalles: "NodeDetailOut"

    model_config = ConfigDict(from_attributes=True)


class ApiKeyRegenerateOut(BaseModel):
    id_nodo: str
    new_api_key: str
    cpp_config_snippet: str
    mensaje: str


class NodeUpdateIn(BaseModel):
    nombre: Optional[str] = None
    subcuenca: Optional[str] = None
    sector_cuenca: Optional[str] = None
    cota_msnm: Optional[float] = None
    intervalo_envio_min: Optional[int] = None
    activo: Optional[bool] = None
    descripcion: Optional[str] = None


class NodeDetailOut(BaseModel):
    id_nodo: str
    nombre: str
    sector_cuenca: str
    subcuenca: str
    latitud: float
    longitud: float
    cota_msnm: float
    tipo_fuente: str
    intervalo_envio_min: int
    activo: bool
    descripcion: Optional[str] = None
    id_entidad_responsable: int
    entidad_nombre: Optional[str] = None
    calibracion_vigente: Optional[CalibrationOut] = None
    umbrales: Optional[ThresholdOut] = None

    model_config = ConfigDict(from_attributes=True)


class NodeStatusOut(BaseModel):
    id_nodo: str
    nombre: str
    sector_cuenca: str
    subcuenca: str
    latitud: float
    longitud: float
    cota_msnm: float
    activo: bool
    ultima_conexion: Optional[datetime.datetime] = None
    bateria_v: Optional[float] = None
    signal_rssi: Optional[int] = None
    ultimo_ph: Optional[float] = None
    ultimo_tds_ppm: Optional[float] = None
    ultimo_ec_us_cm: Optional[float] = None
    ultimo_caudal_ls: Optional[float] = None
    ultimo_wqi_score: Optional[float] = None
    ultimo_wqi_categoria: Optional[str] = None
    estado_salinidad: Optional[str] = None
    estado_operativo: str = "OFFLINE"

    model_config = ConfigDict(from_attributes=True)
