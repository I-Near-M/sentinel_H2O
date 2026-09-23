import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.database.models import ConfiguracionSistema, Usuario
from backend.app.schemas.system import (
    SystemConfigOut, SystemConfigUpdate
)
from backend.app.api.deps import get_current_user, require_roles, register_audit_event

router = APIRouter(prefix="/system", tags=["Configuración & Identidad de Cuenca"])


def get_or_create_system_config(db: Session) -> ConfiguracionSistema:
    """Obtiene el registro maestro de configuración (singleton) o crea uno con valores por defecto."""
    configs = db.query(ConfiguracionSistema).order_by(ConfiguracionSistema.id_config.asc()).all()
    if not configs:
        config = ConfiguracionSistema(
            nombre_cuenca="Cuenca Hidrográfica",
            pais_region="Región",
            descripcion_cuenca="Gemelo Digital de Seguridad Hídrica y Gobernanza",
            latitud_centro=-11.49,
            longitud_centro=-77.05,
            zoom_inicial=10
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    # Si hay múltiples registros (duplicados), consolidar en el primero
    master_config = configs[0]
    if len(configs) > 1:
        for duplicate in configs[1:]:
            if duplicate.actualizado_por_usuario_id and not master_config.actualizado_por_usuario_id:
                master_config.nombre_cuenca = duplicate.nombre_cuenca
                master_config.pais_region = duplicate.pais_region
                master_config.descripcion_cuenca = duplicate.descripcion_cuenca
                master_config.latitud_centro = duplicate.latitud_centro
                master_config.longitud_centro = duplicate.longitud_centro
                master_config.zoom_inicial = duplicate.zoom_inicial
                master_config.actualizado_por_usuario_id = duplicate.actualizado_por_usuario_id
            db.delete(duplicate)
        db.commit()
        db.refresh(master_config)

    return master_config


def _to_system_config_out(config: ConfiguracionSistema) -> SystemConfigOut:
    return SystemConfigOut.model_validate(config)


@router.get("/config", response_model=SystemConfigOut)
def get_system_config(db: Session = Depends(get_db)):
    """
    Retorna la configuración dinámica actual de la cuenca (Endpoint público).
    Permite a la consola web y mapas inicializarse con la geografía e identidad definida.
    """
    config = get_or_create_system_config(db)
    return _to_system_config_out(config)


@router.put("/config", response_model=SystemConfigOut)
def update_system_config(
    payload: SystemConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(["ADMIN_SISTEMA"]))
):
    """
    Actualiza la configuración de cuenca o centro geográfico.
    Acción restringida a Superadministradores del Sistema con trazabilidad de auditoría.
    """
    config = get_or_create_system_config(db)
    old_values = {
        "nombre_recurso": config.nombre_recurso,
        "tipo_recurso": config.tipo_recurso,
        "pais": config.pais,
        "region": config.region,
        "latitud_centro": config.latitud_centro,
        "longitud_centro": config.longitud_centro,
        "zoom_inicial": config.zoom_inicial,
        "modulo_riego_habilitado": config.modulo_riego_habilitado,
        "modulo_piscicultura_habilitado": config.modulo_piscicultura_habilitado,
    }

    update_dict = payload.model_dump(exclude_unset=True)
    for field_name, val in update_dict.items():
        if val is not None and hasattr(config, field_name):
            setattr(config, field_name, val)

    config.id_superadmin_responsable = current_user.id_usuario
    config.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(config)

    client_ip = request.client.host if request.client else None
    register_audit_event(
        db=db,
        usuario=current_user,
        accion="UPDATE_SYSTEM_CONFIG",
        tabla_afectada="configuracion_recurso_hidrico",
        id_registro_afectado=str(config.id_config),
        valores_previos=old_values,
        valores_nuevos={
            "nombre_recurso": config.nombre_recurso,
            "tipo_recurso": config.tipo_recurso,
            "pais": config.pais,
            "region": config.region,
            "latitud_centro": config.latitud_centro,
            "longitud_centro": config.longitud_centro,
            "modulo_riego_habilitado": config.modulo_riego_habilitado
        },
        ip_origen=client_ip
    )

    return _to_system_config_out(config)

