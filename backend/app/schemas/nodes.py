import datetime
from typing import Optional, List, Union, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from backend.app.core.validators import validate_email_address, validate_phone_number, validate_ruc_dni


# ============================================================================
# SCHEMAS DE TIPOS DE ENTIDAD Y CARGOS INSTITUCIONALES (3NF / 4NF)
# ============================================================================
class TipoEntidadCreateIn(BaseModel):
    codigo: str = Field(..., description="Código mnemotécnico (ej: JUNTA_USUARIOS)")
    nombre: str = Field(..., description="Nombre del tipo institucional")
    descripcion: Optional[str] = None
    permite_gestion_riego: bool = Field(default=False)
    permite_gestion_piscicultura: bool = Field(default=False)


class TipoEntidadOut(BaseModel):
    id_tipo_entidad: str
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    permite_gestion_riego: bool
    permite_gestion_piscicultura: bool
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class CargoInstitucionalCreateIn(BaseModel):
    id_tipo_entidad: str = Field(..., description="UUID del tipo de entidad")
    codigo_cargo: str = Field(..., description="Código del cargo")
    nombre_cargo: str = Field(..., description="Nombre descriptivo del cargo")
    nivel_jerarquia: int = Field(default=1, ge=1, le=5)
    descripcion: Optional[str] = None


class CargoInstitucionalOut(BaseModel):
    id_cargo: str
    id_tipo_entidad: str
    codigo_cargo: str
    nombre_cargo: str
    nivel_jerarquia: int
    descripcion: Optional[str] = None
    activo: bool

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DE ENTIDADES GESTORAS
# ============================================================================
class EntityCreateIn(BaseModel):
    id_tipo_entidad: Optional[str] = Field(None, description="UUID del tipo de entidad")
    nombre_entidad: str = Field(..., description="Nombre oficial de la entidad")
    tipo_entidad: Optional[str] = Field(default="JUNTA_USUARIOS", description="Código de compatibilidad para tipo")
    ruc: Optional[str] = Field(None, description="RUC o Identificador Fiscal de la Entidad")
    telefono_contacto: Optional[str] = Field(None, description="Teléfono de contacto")
    email_contacto: Optional[str] = Field(None, description="Email de contacto")
    direccion: Optional[str] = Field(None, description="Dirección de la sede")

    @field_validator("nombre_entidad")
    @classmethod
    def check_nombre(cls, v: str) -> str:
        name = v.strip()
        if len(name) < 3:
            raise ValueError("El nombre de la entidad debe tener al menos 3 caracteres.")
        return name

    @field_validator("email_contacto")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_address(v, required=False) if v else None

    @field_validator("telefono_contacto")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v, required=False) if v else None

    @field_validator("ruc")
    @classmethod
    def check_ruc(cls, v: Optional[str]) -> Optional[str]:
        return validate_ruc_dni(v) if v else None


class EntityUpdateIn(BaseModel):
    id_tipo_entidad: Optional[str] = None
    nombre_entidad: Optional[str] = None
    tipo_entidad: Optional[str] = None
    ruc: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email_contacto: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None

    @field_validator("nombre_entidad")
    @classmethod
    def check_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            name = v.strip()
            if len(name) < 3:
                raise ValueError("El nombre de la entidad debe tener al menos 3 caracteres.")
            return name
        return None

    @field_validator("email_contacto")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_address(v, required=False) if v else None

    @field_validator("telefono_contacto")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v, required=False) if v else None

    @field_validator("ruc")
    @classmethod
    def check_ruc(cls, v: Optional[str]) -> Optional[str]:
        return validate_ruc_dni(v) if v else None


class EntityOut(BaseModel):
    id_entidad: str
    id_tipo_entidad: Optional[str] = None
    nombre_entidad: str
    tipo_entidad: Optional[str] = None
    ruc: Optional[str] = None
    telefono_contacto: Optional[str] = None
    email_contacto: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DE PUNTOS DE SECCIÓN DE REGLETA (AFORO POR MOLINETE)
# ============================================================================
class PuntoSeccionItem(BaseModel):
    orden_punto: int = Field(..., ge=1, description="Secuencia de la vertical de orilla a orilla")
    distancia_orilla_m: float = Field(..., ge=0.0, description="Distancia acumulada desde la orilla (m)")
    profundidad_lecho_m: float = Field(..., ge=0.0, description="Profundidad del lecho leída con regleta (m)")
    ancho_subseccion_m: Optional[float] = Field(None, ge=0.0, description="Ancho de influencia de la vertical (m)")


class PuntoSeccionOut(PuntoSeccionItem):
    id_punto: str
    id_seccion_calibracion: Optional[str] = None
    id_calibracion: Optional[str] = None
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DE SECCIÓN HIDRÁULICA Y MOLINETE HALL
# ============================================================================
class SeccionHidraulicaCreateIn(BaseModel):
    ancho_total_rio_m: float = Field(default=4.00, ge=0.1, description="Ancho total de la superficie del río (m)")
    molinete_constante_a: float = Field(default=0.2500, description="Constante 'a' de molinete (paso de hélice V = a*RPM + b)")
    molinete_constante_b: float = Field(default=0.0500, description="Constante 'b' de molinete (velocidad de fricción en m/s)")
    coeficiente_friccion: float = Field(default=0.0350, description="Rugosidad Manning n")
    tipo_seccion: str = Field(default="REGLETA_PUNTOS", description="REGLETA_PUNTOS, RECTANGULAR, TRAPEZOIDAL, IRREGULAR")
    ancho_solera_m: Optional[float] = None
    talud_z: Optional[float] = None
    profundidad_maxima_m: Optional[float] = None
    area_mojada_referencia_m2: Optional[float] = None
    numero_verticales_aforo: int = Field(default=3, ge=1)
    observaciones_aforo: Optional[str] = None
    puntos_seccion: Optional[List[PuntoSeccionItem]] = None


class SeccionHidraulicaOut(BaseModel):
    id_seccion_calibracion: str
    id_calibracion: str
    id_nodo: str
    ancho_total_rio_m: float = 4.00
    molinete_constante_a: float = 0.2500
    molinete_constante_b: float = 0.0500
    coeficiente_friccion: float = 0.0350
    tipo_seccion: str = "REGLETA_PUNTOS"
    ancho_solera_m: Optional[float] = None
    talud_z: Optional[float] = None
    profundidad_maxima_m: Optional[float] = None
    area_mojada_referencia_m2: Optional[float] = None
    numero_verticales_aforo: int = 3
    observaciones_aforo: Optional[str] = None
    es_vigente: bool = True
    activo: bool = True
    puntos_seccion: Optional[List[PuntoSeccionOut]] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DE CALIBRACIÓN Y UMBRALES
# ============================================================================
class CalibrationCreateIn(BaseModel):
    ph_offset_v: float = Field(default=2.5000, description="Voltaje medido en solución buffer pH 7.0 (V)")
    ph_slope: float = Field(default=-0.1800, description="Pendiente de respuesta del electrodo de pH (V/pH)")
    tds_factor_k: float = Field(default=0.5000, description="Factor de conversión TDS/EC")
    tds_offset_v: float = Field(default=0.0000, description="Voltaje de offset de sonda TDS en seco (V)")
    turb_v_clear: float = Field(default=4.2000, description="Voltaje del sensor óptico en agua 100% limpia (V)")
    turb_v_turbid: float = Field(default=2.5000, description="Voltaje del sensor óptico en agua turbia (V)")
    distancia_fondo_sensor_cm: float = Field(default=100.0, description="Altura fija de montaje del sensor ultrasónico sobre el fondo del canal (cm)")
    ancho_total_rio_m: float = Field(default=4.00, ge=0.1, description="Ancho total del río / canal (m)")
    molinete_constante_a: float = Field(default=0.2500, description="Paso de la hélice / pendiente velocidad V = a*RPM + b")
    molinete_constante_b: float = Field(default=0.0500, description="Velocidad de fricción o arranque del molinete (m/s)")
    caudal_coef_k: Optional[float] = Field(default=None, description="Compatibilidad para coeficiente empírico")
    caudal_exp_n: Optional[float] = Field(default=None, description="Compatibilidad para exponente empírico")
    coeficiente_friccion: float = Field(default=0.0350, description="Rugosidad Manning n del cauce")
    tipo_seccion: str = Field(default="REGLETA_PUNTOS", description="REGLETA_PUNTOS, RECTANGULAR, TRAPEZOIDAL, IRREGULAR")
    ancho_solera_m: Optional[float] = None
    talud_z: Optional[float] = None
    numero_verticales_aforo: int = Field(default=3, ge=1)
    observaciones_aforo: Optional[str] = None
    puntos_seccion: Optional[List[PuntoSeccionItem]] = None
    calibrado_por: Optional[str] = Field(default="Operador de Campo", description="Responsable de calibración")


class CalibrationOut(BaseModel):
    id_calibracion: Optional[str] = None
    ph_offset_v: float
    ph_slope: float
    tds_factor_k: float
    tds_offset_v: float
    turb_v_clear: float
    turb_v_turbid: float
    distancia_fondo_sensor_cm: float
    ancho_total_rio_m: float = 4.00
    molinete_constante_a: float = 0.2500
    molinete_constante_b: float = 0.0500
    caudal_coef_k: Optional[float] = 0.2500
    caudal_exp_n: Optional[float] = 1.5000
    coeficiente_friccion: float = 0.0350
    tipo_seccion: str = "REGLETA_PUNTOS"
    ancho_solera_m: Optional[float] = None
    talud_z: Optional[float] = None
    numero_verticales_aforo: int = 3
    observaciones_aforo: Optional[str] = None
    seccion_hidraulica: Optional[SeccionHidraulicaOut] = None
    puntos_seccion: Optional[List[PuntoSeccionOut]] = None
    es_vigente: bool = True
    activo: bool = True
    calibrado_por: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def sync_caudal_fields(self):
        if self.caudal_coef_k is None or self.caudal_coef_k == 0.25:
            self.caudal_coef_k = self.molinete_constante_a
        return self


class ThresholdOut(BaseModel):
    ph_min_alerta: float
    ph_max_alerta: float
    ec_max_advertencia_us_cm: float
    ec_max_critico_us_cm: float
    tds_max_alerta_ppm: float
    turb_max_alerta_ntu: float
    tirante_min_alerta_cm: float
    temperatura_max_piscicola_c: float = 18.0
    oxigeno_min_piscicola_mgl: float = 5.5
    bateria_min_alerta_v: float
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DEL ASISTENTE DE PROVISIÓN (ONBOARDING WIZARD)
# ============================================================================
class NodeProvisionIn(BaseModel):
    # Paso 1: Datos de Identificación y Ubicación
    id_nodo: Optional[str] = Field(None, description="UUID v7 o identificador. Si se omite, se autogenera.")
    codigo_estacion: Optional[str] = Field(None, description="Código de estación (ej: EST-01-CABECERA). Si se omite, se deriva de id_nodo.")
    nombre: str = Field(..., description="Nombre descriptivo de la estación")
    id_entidad_responsable: Optional[Union[str, int]] = Field(None, description="UUID o ID de la entidad gestora")
    tramo_sector: Optional[str] = Field(default="SECTOR_CABECERA", description="Sector hidrográfico o tramo físico")
    sector_cuenca: Optional[str] = Field(default=None, description="Sector hidrográfico (compatibilidad)")
    subcuenca: Optional[str] = Field(default="Principal", description="Subcuenca, afluente o ramal")
    latitud: float = Field(..., description="Latitud GPS (ej: -11.4521)")
    longitud: float = Field(..., description="Longitud GPS (ej: -77.0145)")
    cota_msnm: float = Field(default=500.0, description="Altitud sobre el nivel del mar en metros")
    tipo_fuente: str = Field(default="CANAL_DERIVACION", description="RIO_PRINCIPAL, LAGUNA, CANAL_DERIVACION, BOCATOMA_PARCELA, MANANTIAL")
    intervalo_envio_min: int = Field(default=15, description="Frecuencia de muestreo y envío en minutos")
    descripcion: Optional[str] = Field(None, description="Detalles adicionales del punto de monitoreo")

    # Paso 2: Calibración Hidráulica (Molinete y Sensores)
    ph_offset_v: float = Field(default=2.5000, description="Voltaje en buffer pH 7.0 (V)")
    ph_slope: float = Field(default=-0.1800, description="Pendiente del electrodo de pH (V/pH)")
    tds_factor_k: float = Field(default=0.5000, description="Factor de conversión TDS/EC")
    turb_v_clear: float = Field(default=4.2000, description="Voltaje sensor óptico agua limpia (V)")
    turb_v_turbid: float = Field(default=2.5000, description="Voltaje sensor óptico agua turbia (V)")
    distancia_fondo_sensor_cm: float = Field(default=100.0, description="Altura de montaje del ultrasonido al fondo (cm)")
    ancho_total_rio_m: float = Field(default=4.00, ge=0.1, description="Ancho total medido del río o canal (m)")
    molinete_constante_a: float = Field(default=0.2500, description="Paso de hélice molinete (V = a*RPM + b)")
    molinete_constante_b: float = Field(default=0.0500, description="Velocidad de fricción o arranque del molinete (m/s)")
    caudal_coef_k: Optional[float] = None
    caudal_exp_n: Optional[float] = None
    coeficiente_friccion: float = Field(default=0.0350, description="Rugosidad Manning n del lecho")
    tipo_seccion: str = Field(default="REGLETA_PUNTOS", description="REGLETA_PUNTOS, RECTANGULAR, TRAPEZOIDAL, IRREGULAR")
    ancho_solera_m: Optional[float] = None
    talud_z: Optional[float] = None
    numero_verticales_aforo: int = Field(default=3, description="Número de puntos/regletas medidas en el perfil")
    observaciones_aforo: Optional[str] = Field(None, description="Notas de campo del aforo con molinete")
    puntos_seccion: Optional[List[PuntoSeccionItem]] = None
    calibrado_por: Optional[str] = Field(default="Asistente Web Sentinel-H2O")

    # Paso 3: Umbrales Agronómicos, Acuícolas y de Alerta
    ph_min_alerta: float = Field(default=6.50, description="Límite inferior de pH")
    ph_max_alerta: float = Field(default=8.50, description="Límite superior de pH")
    ec_max_advertencia_us_cm: float = Field(default=1200.0, description="Umbral de advertencia de salinidad (µS/cm)")
    ec_max_critico_us_cm: float = Field(default=1500.0, description="Umbral crítico de salinidad (µS/cm)")
    tds_max_alerta_ppm: float = Field(default=750.0, description="Umbral de TDS (ppm)")
    turb_max_alerta_ntu: float = Field(default=50.0, description="Umbral de turbidez (NTU)")
    tirante_min_alerta_cm: float = Field(default=10.0, description="Tirante mínimo de estiaje (cm)")
    temperatura_max_piscicola_c: float = Field(default=18.0, description="Temperatura máxima para truchas (°C)")
    oxigeno_min_piscicola_mgl: float = Field(default=5.5, description="Oxígeno disuelto mínimo (mg/L)")
    bateria_min_alerta_v: float = Field(default=11.50, description="Voltaje mínimo de batería (V)")

    @field_validator("nombre")
    @classmethod
    def check_nombre_nodo(cls, v: str) -> str:
        name = v.strip()
        if len(name) < 3:
            raise ValueError("El nombre de la estación debe tener al menos 3 caracteres.")
        return name

    @field_validator("latitud")
    @classmethod
    def check_latitud(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError("La latitud debe encontrarse en el rango de -90.0° a +90.0°.")
        return v

    @field_validator("longitud")
    @classmethod
    def check_longitud(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError("La longitud debe encontrarse en el rango de -180.0° a +180.0°.")
        return v

    @field_validator("cota_msnm")
    @classmethod
    def check_cota(cls, v: float) -> float:
        if not (0.0 <= v <= 6500.0):
            raise ValueError("La altitud (cota msnm) debe encontrarse entre 0 y 6500 msnm.")
        return v

    @field_validator("distancia_fondo_sensor_cm")
    @classmethod
    def check_distancia(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La distancia sensor-fondo debe ser mayor a 0 cm.")
        return v


class NodeDetailOut(BaseModel):
    id_nodo: str
    codigo_estacion: Optional[str] = None
    nombre: str
    tramo_sector: Optional[str] = "SECTOR_PRINCIPAL"
    sector_cuenca: Optional[str] = "SECTOR_PRINCIPAL"  # Compatibilidad
    subcuenca: Optional[str] = None
    latitud: float
    longitud: float
    cota_msnm: float
    tipo_fuente: str
    intervalo_envio_min: int
    estado_operativo: str = "ONLINE"
    activo: bool = True
    descripcion: Optional[str] = None
    id_entidad_responsable: Optional[str] = None
    entidad_nombre: Optional[str] = None
    calibracion_vigente: Optional[CalibrationOut] = None
    umbrales: Optional[ThresholdOut] = None

    model_config = ConfigDict(from_attributes=True)


class NodeProvisionOut(BaseModel):
    id_nodo: str
    codigo_estacion: Optional[str] = None
    nombre: str
    subcuenca: Optional[str] = None
    api_key_plaintext: str = Field(..., description="API Key única generada.")
    cpp_config_snippet: str = Field(..., description="Fragmento de código C++ listo para pegar en config.h del ESP32")
    mensaje: str
    nodo_detalles: NodeDetailOut

    model_config = ConfigDict(from_attributes=True)


class ApiKeyRegenerateOut(BaseModel):
    id_nodo: str
    new_api_key: str
    cpp_config_snippet: str
    mensaje: str


class NodeUpdateIn(BaseModel):
    nombre: Optional[str] = None
    codigo_estacion: Optional[str] = None
    tramo_sector: Optional[str] = None
    sector_cuenca: Optional[str] = None  # Compatibilidad
    subcuenca: Optional[str] = None
    cota_msnm: Optional[float] = None
    intervalo_envio_min: Optional[int] = None
    estado_operativo: Optional[str] = None
    activo: Optional[bool] = None
    descripcion: Optional[str] = None


class NodeStatusOut(BaseModel):
    id_nodo: str
    codigo_estacion: Optional[str] = None
    nombre: str
    tramo_sector: Optional[str] = "SECTOR_PRINCIPAL"
    sector_cuenca: Optional[str] = "SECTOR_PRINCIPAL"  # Compatibilidad
    subcuenca: Optional[str] = None
    latitud: float
    longitud: float
    cota_msnm: float
    activo: bool = True
    ultima_conexion: Optional[datetime.datetime] = None
    bateria_v: Optional[float] = None
    signal_rssi: Optional[int] = None
    ultimo_ph: Optional[float] = None
    ultimo_tds_ppm: Optional[float] = None
    ultimo_ec_us_cm: Optional[float] = None
    ultimo_caudal_ls: Optional[float] = None
    ultimo_velocidad_ms: Optional[float] = None
    ultimo_wqi_score: Optional[float] = None
    ultimo_wqi_categoria: Optional[str] = None
    estado_salinidad: Optional[str] = None
    aptitud_piscicola: Optional[str] = None
    estado_operativo: str = "OFFLINE"

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS DE MANTENIMIENTO DE NODOS
# ============================================================================
class MantenimientoCreateIn(BaseModel):
    id_nodo: str = Field(..., description="UUID del nodo")
    tipo_mantenimiento: str = Field(default="PREVENTIVO", description="PREVENTIVO, CORRECTIVO, CALIBRACION_SENSORES, etc.")
    categoria: str = Field(default="FISICO", description="FISICO, LOGICO, HIDRAULICO")
    fecha_programada: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    fecha_ejecucion: Optional[datetime.datetime] = None
    tecnico_responsable: str = Field(..., description="Nombre del técnico a cargo")
    descripcion_trabajo: str = Field(..., description="Detalle del trabajo a realizar")
    diagnostico_inicial: Optional[str] = None
    acciones_realizadas: Optional[str] = None
    repuestos_utilizados: Optional[str] = None
    firmware_version_anterior: Optional[str] = None
    firmware_version_instalada: Optional[str] = None
    costo_estimado: Optional[float] = 0.0
    estado_mantenimiento: str = Field(default="PROGRAMADO")
    observaciones: Optional[str] = None


class MantenimientoOut(MantenimientoCreateIn):
    id_mantenimiento: str
    nodo_nombre: Optional[str] = None
    codigo_estacion: Optional[str] = None
    subcuenca: Optional[str] = None
    realizado_por_usuario_id: Optional[str] = None
    activo: bool = True
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class MantenimientoUpdateIn(BaseModel):
    tipo_mantenimiento: Optional[str] = None
    categoria: Optional[str] = None
    fecha_programada: Optional[datetime.datetime] = None
    fecha_ejecucion: Optional[datetime.datetime] = None
    tecnico_responsable: Optional[str] = None
    descripcion_trabajo: Optional[str] = None
    diagnostico_inicial: Optional[str] = None
    acciones_realizadas: Optional[str] = None
    repuestos_utilizados: Optional[str] = None
    firmware_version_anterior: Optional[str] = None
    firmware_version_instalada: Optional[str] = None
    costo_estimado: Optional[float] = None
    estado_mantenimiento: Optional[str] = None  # PROGRAMADO, EN_PROCESO, COMPLETADO, CANCELADO
    observaciones: Optional[str] = None
    activo: Optional[bool] = None

