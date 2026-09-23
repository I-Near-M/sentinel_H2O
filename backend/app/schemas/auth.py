import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, field_serializer, field_validator, model_validator
from backend.app.core.validators import validate_email_address, validate_phone_number, validate_strong_password


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: str
    id_entidad: Optional[str] = None
    id_cargo: Optional[str] = None
    nombre_entidad: Optional[str] = None
    email: str
    nombres: str = "Usuario"
    apellidos: str = "Sistema"
    nombre_completo: str = "Usuario Sistema"
    telefono_contacto: Optional[str] = None
    cargo_institucional: Optional[str] = None
    rol: str
    activo: bool
    ultimo_login: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime.datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.isoformat()

    @field_serializer("ultimo_login")
    def serialize_ultimo_login(self, dt: Optional[datetime.datetime], _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.isoformat()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse


class UserCreate(BaseModel):
    email: str
    password: str
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    nombre_completo: Optional[str] = None
    rol: str = "OPERADOR_JUNTA"
    id_entidad: Optional[str] = None
    id_cargo: Optional[str] = None
    telefono_contacto: Optional[str] = None
    cargo_institucional: Optional[str] = None

    @model_validator(mode="after")
    def ensure_names(self):
        if self.nombre_completo and (not self.nombres or not self.apellidos):
            parts = self.nombre_completo.strip().split(" ", 1)
            self.nombres = self.nombres or parts[0]
            self.apellidos = self.apellidos or (parts[1] if len(parts) > 1 else "General")
        elif not self.nombres:
            self.nombres = "Usuario"
            self.apellidos = self.apellidos or "Sistema"
        elif not self.apellidos:
            self.apellidos = "Sistema"

        if not self.nombre_completo:
            self.nombre_completo = f"{self.nombres} {self.apellidos}".strip()
        return self

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_address(v, required=True)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_strong_password(v)

    @field_validator("telefono_contacto")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v, required=False)


class UserUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    nombre_completo: Optional[str] = None
    email: Optional[str] = None
    telefono_contacto: Optional[str] = None
    id_cargo: Optional[str] = None
    cargo_institucional: Optional[str] = None
    rol: Optional[str] = None
    id_entidad: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None

    @model_validator(mode="after")
    def sync_names_on_update(self):
        if self.nombre_completo and not (self.nombres and self.apellidos):
            parts = self.nombre_completo.strip().split(" ", 1)
            self.nombres = self.nombres or parts[0]
            self.apellidos = self.apellidos or (parts[1] if len(parts) > 1 else "")
        return self

    @field_validator("email")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_address(v, required=False) if v else None

    @field_validator("password")
    @classmethod
    def check_password(cls, v: Optional[str]) -> Optional[str]:
        return validate_strong_password(v) if v else None

    @field_validator("telefono_contacto")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v, required=False) if v else None


class ProfileUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    nombre_completo: Optional[str] = None
    telefono_contacto: Optional[str] = None
    cargo_institucional: Optional[str] = None
    password: Optional[str] = None

    @model_validator(mode="after")
    def sync_names_on_profile(self):
        if self.nombre_completo and not (self.nombres and self.apellidos):
            parts = self.nombre_completo.strip().split(" ", 1)
            self.nombres = self.nombres or parts[0]
            self.apellidos = self.apellidos or (parts[1] if len(parts) > 1 else "")
        return self

    @field_validator("password")
    @classmethod
    def check_password(cls, v: Optional[str]) -> Optional[str]:
        return validate_strong_password(v) if v else None

    @field_validator("telefono_contacto")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v, required=False) if v else None


class AdminBootstrap(BaseModel):
    email: str
    password: str
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    nombre_completo: Optional[str] = None
    telefono_contacto: Optional[str] = None
    cargo_institucional: Optional[str] = "Superadministrador de Plataforma"
    nombre_recurso: Optional[str] = "Recurso Hídrico No Configurado"
    tipo_recurso: Optional[str] = "RIO"
    pais: Optional[str] = None
    region: Optional[str] = None
    ubicacion_detallada: Optional[str] = None
    latitud_centro: Optional[float] = -11.49
    longitud_centro: Optional[float] = -77.05
    zoom_inicial: Optional[int] = 10

    # Entidad de Gobernanza vinculada
    nombre_entidad: Optional[str] = None
    tipo_entidad: Optional[str] = None

    # Compatibilidad con clientes antiguos
    nombre_cuenca: Optional[str] = None
    pais_region: Optional[str] = None
    descripcion_cuenca: Optional[str] = None

    @model_validator(mode="after")
    def sync_bootstrap(self):
        if self.nombre_completo and (not self.nombres or not self.apellidos):
            parts = self.nombre_completo.strip().split(" ", 1)
            self.nombres = self.nombres or parts[0]
            self.apellidos = self.apellidos or (parts[1] if len(parts) > 1 else "Administrador")
        elif not self.nombres:
            self.nombres = "Superadministrador"
            self.apellidos = self.apellidos or "Sentinel"

        if not self.nombre_completo:
            self.nombre_completo = f"{self.nombres} {self.apellidos}".strip()

        if self.nombre_cuenca and self.nombre_recurso == "Recurso Hídrico No Configurado":
            self.nombre_recurso = self.nombre_cuenca
        if self.descripcion_cuenca and not self.ubicacion_detallada:
            self.ubicacion_detallada = self.descripcion_cuenca

        if self.pais_region and not self.region and not self.pais:
            parts = [p.strip() for p in self.pais_region.split(",")]
            if len(parts) > 1:
                self.region = parts[0]
                self.pais = parts[1]
            else:
                self.region = parts[0]
                self.pais = "Perú"
        else:
            self.pais = self.pais or "Perú"
            self.region = self.region or "Nacional"

        return self

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_address(v, required=True)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_strong_password(v)

    @field_validator("telefono_contacto")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v, required=False)


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime.datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.isoformat()
