import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, ConfigDict, field_serializer, field_validator
from backend.app.core.validators import validate_email_address, validate_phone_number, validate_strong_password


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    id_entidad: Optional[int] = None
    nombre_entidad: Optional[str] = None
    email: str
    nombre_completo: str
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
    nombre_completo: str
    rol: str = "OPERADOR_JUNTA"
    id_entidad: Optional[int] = None
    telefono_contacto: Optional[str] = None
    cargo_institucional: Optional[str] = None

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
    nombre_completo: Optional[str] = None
    email: Optional[str] = None
    telefono_contacto: Optional[str] = None
    cargo_institucional: Optional[str] = None
    rol: Optional[str] = None
    id_entidad: Optional[int] = None
    activo: Optional[bool] = None
    password: Optional[str] = None

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
    nombre_completo: Optional[str] = None
    telefono_contacto: Optional[str] = None
    cargo_institucional: Optional[str] = None
    password: Optional[str] = None

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
    nombre_completo: str
    telefono_contacto: Optional[str] = None
    cargo_institucional: Optional[str] = "Superadministrador de Cuenca"
    nombre_cuenca: Optional[str] = "Cuenca Chancay-Huaral"
    pais_region: Optional[str] = "Lima, Perú"
    descripcion_cuenca: Optional[str] = None
    latitud_centro: Optional[float] = -11.49
    longitud_centro: Optional[float] = -77.05
    zoom_inicial: Optional[int] = 10

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

    id_audit: int
    id_usuario: Optional[int] = None
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
