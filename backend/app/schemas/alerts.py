import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from backend.app.core.validators import validate_email_address, validate_phone_number, validate_ruc_dni


class AlertaLogOut(BaseModel):
    id_alerta: str
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
    id_entidad: str
    id_nodo_suscrito: str
    id_tipo_uso: Optional[str] = None
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    nombre_completo: Optional[str] = None
    dni_ruc: Optional[str] = None
    telefono_whatsapp: str
    email: Optional[str] = None
    rol_usuario: str = "BENEFICIARIO_AGUA"
    detalle_actividad: Optional[str] = None
    tipo_cultivo: Optional[str] = None  # Compatibilidad
    sector_predio: Optional[str] = None
    recibe_alertas_calidad: bool = True
    recibe_alertas_caudal: bool = True
    recibe_alertas_mantenimiento: bool = True
    recibe_reporte_diario: bool = False

    @model_validator(mode="after")
    def sync_dest_names(self):
        if self.nombre_completo and (not self.nombres or not self.apellidos):
            parts = self.nombre_completo.strip().split(" ", 1)
            self.nombres = self.nombres or parts[0]
            self.apellidos = self.apellidos or (parts[1] if len(parts) > 1 else "Comunero")
        elif not self.nombres:
            self.nombres = "Beneficiario"
            self.apellidos = self.apellidos or "Agua"
        elif not self.apellidos:
            self.apellidos = "Agua"

        if not self.nombre_completo:
            self.nombre_completo = f"{self.nombres} {self.apellidos}".strip()

        if self.tipo_cultivo and not self.detalle_actividad:
            self.detalle_actividad = self.tipo_cultivo
        elif not self.tipo_cultivo:
            self.tipo_cultivo = self.detalle_actividad
        return self

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


class DestinatarioOut(DestinatarioCreate):
    id_destinatario: str
    activo: bool = True
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
