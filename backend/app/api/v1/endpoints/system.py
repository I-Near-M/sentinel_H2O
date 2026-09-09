import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.database.models import ConfiguracionSistema, Usuario
from backend.app.schemas.system import (
    SystemConfigOut, SystemConfigUpdate, DashboardGrafanaItem, DEFAULT_GRAFANA_DASHBOARDS
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
            zoom_inicial=10,
            dashboards_grafana_json=DEFAULT_GRAFANA_DASHBOARDS
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
                master_config.dashboards_grafana_json = duplicate.dashboards_grafana_json
                master_config.actualizado_por_usuario_id = duplicate.actualizado_por_usuario_id
            db.delete(duplicate)
        db.commit()
        db.refresh(master_config)

    if not master_config.dashboards_grafana_json:
        master_config.dashboards_grafana_json = DEFAULT_GRAFANA_DASHBOARDS
        db.commit()
        db.refresh(master_config)

    return master_config


def _to_system_config_out(config: ConfiguracionSistema) -> SystemConfigOut:
    raw_dashboards = config.dashboards_grafana_json or DEFAULT_GRAFANA_DASHBOARDS
    dashboards = [DashboardGrafanaItem(**d) for d in raw_dashboards]
    return SystemConfigOut(
        id_config=config.id_config,
        nombre_cuenca=config.nombre_cuenca,
        pais_region=config.pais_region,
        descripcion_cuenca=config.descripcion_cuenca,
        latitud_centro=config.latitud_centro,
        longitud_centro=config.longitud_centro,
        zoom_inicial=config.zoom_inicial,
        dashboards_grafana=dashboards,
        updated_at=config.updated_at
    )


@router.get("/config", response_model=SystemConfigOut)
def get_system_config(db: Session = Depends(get_db)):
    """
    Retorna la configuración dinámica actual de la cuenca y los tableros de Grafana (Endpoint público).
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
    Actualiza la configuración de cuenca, centro geográfico o lista de tableros de Grafana.
    Acción restringida a Superadministradores del Sistema con trazabilidad de auditoría.
    """
    config = get_or_create_system_config(db)
    old_values = {
        "nombre_cuenca": config.nombre_cuenca,
        "pais_region": config.pais_region,
        "latitud_centro": config.latitud_centro,
        "longitud_centro": config.longitud_centro,
        "zoom_inicial": config.zoom_inicial,
    }

    if payload.nombre_cuenca is not None and len(payload.nombre_cuenca.strip()) > 0:
        config.nombre_cuenca = payload.nombre_cuenca.strip()
    if payload.pais_region is not None:
        config.pais_region = payload.pais_region.strip()
    if payload.descripcion_cuenca is not None:
        config.descripcion_cuenca = payload.descripcion_cuenca.strip()
    if payload.latitud_centro is not None:
        config.latitud_centro = payload.latitud_centro
    if payload.longitud_centro is not None:
        config.longitud_centro = payload.longitud_centro
    if payload.zoom_inicial is not None:
        config.zoom_inicial = payload.zoom_inicial
    if payload.dashboards_grafana is not None:
        config.dashboards_grafana_json = [d.model_dump() for d in payload.dashboards_grafana]

    config.actualizado_por_usuario_id = current_user.id_usuario
    config.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(config)

    client_ip = request.client.host if request.client else None
    register_audit_event(
        db=db,
        usuario=current_user,
        accion="UPDATE_SYSTEM_CONFIG",
        tabla_afectada="configuracion_sistema",
        id_registro_afectado=str(config.id_config),
        valores_previos=old_values,
        valores_nuevos={
            "nombre_cuenca": config.nombre_cuenca,
            "pais_region": config.pais_region,
            "latitud_centro": config.latitud_centro,
            "longitud_centro": config.longitud_centro
        },
        ip_origen=client_ip
    )

    return _to_system_config_out(config)
