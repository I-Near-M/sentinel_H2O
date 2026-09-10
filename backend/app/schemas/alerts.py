import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from backend.app.core.validators import validate_email_address, validate_phone_number, validate_ruc_dni


class AlertaLogOut(BaseModel):
    id_alerta: int
    id_nodo: str
    timestamp: datetime.datetime
    nivel_severidad: str
    tipo_evento: str
    variable_origen: str
    valor_registrado: float
    valor_umbral: float
    mensaje_tecnico: str
    mensaje_campesino_whatsapp: str
    estado_envio_whatsapp: str
    destinatarios_notificados_count: int
    fecha_envio: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DestinatarioCreate(BaseModel):
    id_entidad: int
    id_nodo_suscrito: str
    nombre_completo: str
    dni_ruc: Optional[str] = None
    telefono_whatsapp: str
    email: Optional[str] = None
    rol_usuario: str = "AGRICULTOR"
    tipo_cultivo: Optional[str] = None
    sector_predio: Optional[str] = None
    recibe_alertas_calidad: bool = True
    recibe_alertas_caudal: bool = True
    recibe_reporte_diario: bool = False

    @field_validator("telefono_whatsapp")
    @classmethod
    def check_whatsapp_phone(cls, v: str) -> str:
        return validate_phone_number(v, required=True)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_address(v, required=False) if v else None

    @field_validator("dni_ruc")
    @classmethod
    def check_doc(cls, v: Optional[str]) -> Optional[str]:
        return validate_ruc_dni(v) if v else None

    @field_validator("nombre_completo")
    @classmethod
    def check_name(cls, v: str) -> str:
        name = v.strip()
        if len(name) < 2:
            raise ValueError("El nombre completo debe tener al menos 2 caracteres.")
        return name


class DestinatarioOut(DestinatarioCreate):
    id_destinatario: int
    activo: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
