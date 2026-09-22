import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator


class SystemConfigBase(BaseModel):
    nombre_recurso: str = Field("Recurso Hídrico No Configurado", max_length=150, description="Nombre del cuerpo de agua monitoreado")
    codigo_recurso: str = Field("RH-01", max_length=50, description="Código unívoco del recurso hídrico")
    id_tipo_recurso: Optional[str] = Field(None, description="FK hacia tipos_recurso_hidrico")
    tipo_recurso: str = Field("RIO", description="CUENCA, RIO, LAGUNA, EMBALSE, CANAL_RIEGO, ACUIFERO, SECTOR_HIDROLOGICO")
    pais: str = Field("Perú", max_length=100)
    region: str = Field("Lima", max_length=100)
    cuenca_hidrografica: Optional[str] = Field(None, max_length=100)
    sistema_hidrologico: Optional[str] = Field(None, max_length=100)
    ubicacion_detallada: Optional[str] = Field(None, description="Resumen descriptivo del recurso")
    latitud_centro: float = Field(-11.49, description="Latitud inicial para mapas y Digital Twin 3D")
    longitud_centro: float = Field(-77.05, description="Longitud inicial para mapas y Digital Twin 3D")
    zoom_inicial: int = Field(10, ge=1, le=20)
    cota_media_msnm: Optional[float] = Field(1200.0, description="Cota altimétrica media en msnm")
    superficie_km2: Optional[float] = Field(3200.0, description="Superficie o cuenca aportante en km2")
    personal_encargado: Optional[str] = Field(None, max_length=150)
    telefono_contacto_encargado: Optional[str] = Field(None, max_length=30)
    email_contacto_encargado: Optional[str] = Field(None, max_length=100)
    id_superadmin_responsable: Optional[str] = None
    id_entidad_administradora: Optional[str] = None
    modulo_riego_habilitado: bool = Field(default=False)
    modulo_piscicultura_habilitado: bool = Field(default=False)
    modulo_ia_habilitado: bool = Field(default=True)
    configuracion_inicial_completada: bool = Field(default=False)
    version_sistema: str = Field(default="2.5.0")
    activo: bool = Field(default=True)

    # Campos de compatibilidad retroactiva
    nombre_cuenca: Optional[str] = None
    pais_region: Optional[str] = None
    descripcion_cuenca: Optional[str] = None

    @model_validator(mode="after")
    def sync_compatibility_fields(self):
        if self.nombre_cuenca and self.nombre_recurso == "Recurso Hídrico No Configurado":
            self.nombre_recurso = self.nombre_cuenca
        elif not self.nombre_cuenca:
            self.nombre_cuenca = self.nombre_recurso

        if self.descripcion_cuenca and not self.ubicacion_detallada:
            self.ubicacion_detallada = self.descripcion_cuenca
        elif not self.descripcion_cuenca:
            self.descripcion_cuenca = self.ubicacion_detallada

        if not self.pais_region:
            self.pais_region = f"{self.region}, {self.pais}".strip(", ")
        return self


class SystemConfigUpdate(BaseModel):
    nombre_recurso: Optional[str] = None
    codigo_recurso: Optional[str] = None
    id_tipo_recurso: Optional[str] = None
    tipo_recurso: Optional[str] = None
    pais: Optional[str] = None
    region: Optional[str] = None
    cuenca_hidrografica: Optional[str] = None
    sistema_hidrologico: Optional[str] = None
    ubicacion_detallada: Optional[str] = None
    latitud_centro: Optional[float] = None
    longitud_centro: Optional[float] = None
    zoom_inicial: Optional[int] = None
    cota_media_msnm: Optional[float] = None
    superficie_km2: Optional[float] = None
    personal_encargado: Optional[str] = None
    telefono_contacto_encargado: Optional[str] = None
    email_contacto_encargado: Optional[str] = None
    id_superadmin_responsable: Optional[str] = None
    id_entidad_administradora: Optional[str] = None
    modulo_riego_habilitado: Optional[bool] = None
    modulo_piscicultura_habilitado: Optional[bool] = None
    modulo_ia_habilitado: Optional[bool] = None
    configuracion_inicial_completada: Optional[bool] = None
    activo: Optional[bool] = None

    # Compatibilidad con clientes que envíen nombres anteriores
    nombre_cuenca: Optional[str] = None
    pais_region: Optional[str] = None
    descripcion_cuenca: Optional[str] = None


class TipoRecursoHidricoOut(BaseModel):
    id_tipo_recurso: str
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    permite_riego_defecto: bool
    permite_piscicultura_defecto: bool
    geometria_3d_tipo: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class SystemConfigOut(SystemConfigBase):
    id_config: str
    tipo_recurso_rel: Optional[TipoRecursoHidricoOut] = None
    updated_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SetupStatusOut(BaseModel):
    is_first_setup: bool
    setup_completed: bool
    config: SystemConfigOut

