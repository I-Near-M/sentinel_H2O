from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import AlertaLog, DestinatarioAlerta, Entidad, Nodo
from backend.app.schemas.alerts import AlertaLogOut, DestinatarioOut, DestinatarioCreate
from backend.app.services.notification_service import NotificationService

router = APIRouter()


class WhatsAppTestRequest(BaseModel):
    phone_number: str = Field(..., description="Número telefónico de destino (ej: 51987654321)", json_schema_extra={"example": "51987654321"})
    message_text: Optional[str] = Field(None, description="Mensaje personalizado de prueba", json_schema_extra={"example": "🟢 Sentinel-H2O: Prueba de alerta exitosa."})


class DestinatarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    telefono_whatsapp: Optional[str] = None
    email: Optional[str] = None
    rol_usuario: Optional[str] = None
    tipo_cultivo: Optional[str] = None
    sector_predio: Optional[str] = None
    recibe_alertas_calidad: Optional[bool] = None
    recibe_alertas_caudal: Optional[bool] = None
    recibe_reporte_diario: Optional[bool] = None
    activo: Optional[bool] = None


@router.get("/recent", response_model=List[AlertaLogOut])
def get_recent_alerts(
    limit: int = Query(30, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Retorna el listado de alertas recientes emitidas por el sistema
    (salinidad crítica, anomalías de pH, estiaje o fallos de hardware).
    """
    alertas = db.query(AlertaLog).order_by(AlertaLog.timestamp.desc()).limit(limit).all()
    return alertas


@router.get("/node/{node_id}", response_model=List[AlertaLogOut])
def get_node_alerts(
    node_id: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Retorna el historial de alertas emitidas por un nodo en particular.
    """
    alertas = db.query(AlertaLog).filter(
        AlertaLog.id_nodo == node_id
    ).order_by(AlertaLog.timestamp.desc()).limit(limit).all()
    return alertas


@router.post("/recipients", response_model=DestinatarioOut, status_code=status.HTTP_201_CREATED)
def register_recipient(dest_in: DestinatarioCreate, db: Session = Depends(get_db)):
    """
    Registra a un nuevo agricultor, tomero o especialista para recibir alertas automáticas por WhatsApp,
    asociándolo con su respectiva entidad gestora (ANA, Junta de Usuarios, Comisión de Regantes) y su nodo.
    """
    entidad = db.query(Entidad).filter(Entidad.id_entidad == dest_in.id_entidad).first()
    if not entidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La entidad con ID {dest_in.id_entidad} no existe."
        )

    nodo = db.query(Nodo).filter(Nodo.id_nodo == dest_in.id_nodo_suscrito).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El nodo '{dest_in.id_nodo_suscrito}' no existe en el sistema."
        )

    nuevo_dest = DestinatarioAlerta(
        id_entidad=dest_in.id_entidad,
        id_nodo_suscrito=dest_in.id_nodo_suscrito,
        nombre_completo=dest_in.nombre_completo,
        dni_ruc=dest_in.dni_ruc,
        telefono_whatsapp=dest_in.telefono_whatsapp,
        email=dest_in.email,
        rol_usuario=dest_in.rol_usuario,
        tipo_cultivo=dest_in.tipo_cultivo,
        sector_predio=dest_in.sector_predio,
        recibe_alertas_calidad=dest_in.recibe_alertas_calidad,
        recibe_alertas_caudal=dest_in.recibe_alertas_caudal,
        recibe_reporte_diario=dest_in.recibe_reporte_diario,
        activo=True
    )
    db.add(nuevo_dest)
    db.commit()
    db.refresh(nuevo_dest)
    return nuevo_dest


@router.get("/recipients", response_model=List[DestinatarioOut])
def list_recipients(db: Session = Depends(get_db)):
    """
    Lista todos los usuarios suscritos a alertas segmentadas por entidad y nodo.
    """
    destinatarios = db.query(DestinatarioAlerta).order_by(DestinatarioAlerta.id_destinatario.desc()).all()
    return destinatarios


@router.put("/recipients/{id_destinatario}", response_model=DestinatarioOut)
def update_recipient(id_destinatario: int, update_in: DestinatarioUpdate, db: Session = Depends(get_db)):
    """
    Actualiza la información de un destinatario suscrito a alertas.
    """
    dest = db.query(DestinatarioAlerta).filter(DestinatarioAlerta.id_destinatario == id_destinatario).first()
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El destinatario con ID {id_destinatario} no existe."
        )

    for field, value in update_in.model_dump(exclude_unset=True).items():
        setattr(dest, field, value)

    db.commit()
    db.refresh(dest)
    return dest


@router.delete("/recipients/{id_destinatario}", status_code=status.HTTP_200_OK)
def delete_recipient(id_destinatario: int, db: Session = Depends(get_db)):
    """
    Elimina o desuscribe a un destinatario de alertas.
    """
    dest = db.query(DestinatarioAlerta).filter(DestinatarioAlerta.id_destinatario == id_destinatario).first()
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El destinatario con ID {id_destinatario} no existe."
        )

    db.delete(dest)
    db.commit()
    return {"status": "SUCCESS", "message": f"Destinatario '{dest.nombre_completo}' eliminado con éxito."}


@router.post("/test-whatsapp")
async def send_test_whatsapp(req: WhatsAppTestRequest):
    """
    **Enviar WhatsApp de Prueba**: Envía un mensaje inmediato a un número telefónico
    usando el servicio de notificaciones.
    """
    msg = req.message_text or "🟢 *Sentinel-H2O (Cuenca Chancay-Huaral)*: Conexión con el servidor de alertas establecida correctamente."
    success = await NotificationService.send_whatsapp_alert(
        phone_number=req.phone_number,
        message_text=msg
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo despachar el mensaje de WhatsApp. Verifique la configuración en .env."
        )
    return {
        "status": "SUCCESS",
        "destinatario": req.phone_number,
        "mensaje": msg
    }
