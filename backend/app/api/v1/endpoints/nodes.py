import secrets
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import Nodo, CalibracionNodo, UmbralConfig, Entidad, MedicionProcesada, MedicionRaw
from backend.app.schemas.nodes import (
    NodeStatusOut, NodeDetailOut, NodeProvisionIn, NodeProvisionOut,
    NodeUpdateIn, ApiKeyRegenerateOut, EntityOut, EntityCreateIn,
    CalibrationOut, ThresholdOut
)

router = APIRouter()


# ============================================================================
# 1. GESTIÓN DE ENTIDADES RESPONSABLES (ANA, JUNTAS, COMISIONES)
# ============================================================================
@router.get("/entities/all", response_model=List[EntityOut])
def list_entities(db: Session = Depends(get_db)):
    """
    Retorna la lista de todas las entidades gestoras registradas en el sistema.
    """
    entidades = db.query(Entidad).order_by(Entidad.id_entidad.asc()).all()
    return entidades


@router.post("/entities", response_model=EntityOut, status_code=status.HTTP_201_CREATED)
def create_entity(entity_in: EntityCreateIn, db: Session = Depends(get_db)):
    """
    Registra una nueva entidad gestora (para permitir la replicabilidad en cualquier cuenca del mundo).
    """
    nueva_entidad = Entidad(
        nombre_entidad=entity_in.nombre_entidad,
        tipo_entidad=entity_in.tipo_entidad,
        ruc=entity_in.ruc,
        telefono_contacto=entity_in.telefono_contacto,
        email_contacto=entity_in.email_contacto,
        direccion=entity_in.direccion
    )
    db.add(nueva_entidad)
    db.commit()
    db.refresh(nueva_entidad)
    return nueva_entidad


# ============================================================================
# 2. LISTADO Y ESTADO EN VIVO DE NODOS
# ============================================================================
@router.get("/", response_model=List[NodeStatusOut])
def list_nodes_with_status(db: Session = Depends(get_db)):
    """
    Lista todos los nodos registrados en la base de datos junto con su estado operativo,
    última medición de calidad de agua y telemetría de batería en tiempo real.
    """
    nodos = db.query(Nodo).order_by(Nodo.id_nodo.asc()).all()
    resultado = []
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    for n in nodos:
        ultima_medicion = db.query(MedicionProcesada).filter(
            MedicionProcesada.id_nodo == n.id_nodo
        ).order_by(MedicionProcesada.timestamp.desc()).first()

        ultima_conexion = ultima_medicion.timestamp if ultima_medicion else None
        bateria = ultima_medicion.raw.battery_v if (ultima_medicion and ultima_medicion.raw) else None
        rssi = ultima_medicion.raw.signal_rssi if (ultima_medicion and ultima_medicion.raw) else None

        # Determinar estado operativo (ONLINE si transmitió en los últimos 45 min)
        estado_op = "OFFLINE"
        if ultima_conexion:
            # Compatibilidad naive/aware
            t_conn = ultima_conexion.replace(tzinfo=datetime.timezone.utc) if ultima_conexion.tzinfo is None else ultima_conexion
            diff_min = (now_utc - t_conn).total_seconds() / 60.0
            if diff_min <= (n.intervalo_envio_min * 2.5):
                estado_op = "ONLINE"
            elif diff_min <= 120:
                estado_op = "DELAYED"

        resultado.append(NodeStatusOut(
            id_nodo=n.id_nodo,
            nombre=n.nombre,
            sector_cuenca=n.sector_cuenca,
            subcuenca=n.subcuenca,
            latitud=float(n.latitud),
            longitud=float(n.longitud),
            cota_msnm=float(n.cota_msnm),
            activo=n.activo,
            ultima_conexion=ultima_conexion,
            bateria_v=bateria,
            signal_rssi=rssi,
            ultimo_ph=ultima_medicion.ph if ultima_medicion else None,
            ultimo_tds_ppm=ultima_medicion.tds_ppm if ultima_medicion else None,
            ultimo_ec_us_cm=ultima_medicion.ec_us_cm if ultima_medicion else None,
            ultimo_caudal_ls=ultima_medicion.caudal_ls if ultima_medicion else None,
            ultimo_wqi_score=ultima_medicion.wqi_score if ultima_medicion else None,
            ultimo_wqi_categoria=ultima_medicion.wqi_categoria if ultima_medicion else None,
            estado_salinidad=ultima_medicion.estado_salinidad if ultima_medicion else None,
            estado_operativo=estado_op
        ))
    return resultado


# ============================================================================
# 3. ASISTENTE DE PROVISIÓN DE NODOS (PROVISIONING WIZARD)
# ============================================================================
@router.post("/provision", response_model=NodeProvisionOut, status_code=status.HTTP_201_CREATED)
def provision_node(node_in: NodeProvisionIn, db: Session = Depends(get_db)):
    """
    **Asistente de Registro y Provisión de Nodos (Node Provisioning Wizard)**:
    1. Registra el nodo físico en la base de datos.
    2. Genera una API Key criptográfica aleatoria y segura.
    3. Configura su calibración física y parámetros de caudal ($K, N$).
    4. Establece sus umbrales de alerta agronómica.
    5. Retorna la API Key y el fragmento C++ listo para copiar en el firmware ESP32 (`config.h`).
    """
    # 1. Verificar si la entidad existe
    entidad = db.query(Entidad).filter(Entidad.id_entidad == node_in.id_entidad_responsable).first()
    if not entidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La entidad con ID {node_in.id_entidad_responsable} no existe en el sistema."
        )

    # 2. Generar o validar ID de nodo
    node_id = node_in.id_nodo.strip().upper() if node_in.id_nodo else None
    if not node_id:
        # Autogenerar ID único limpio (ej: NODO-04-AÑASMAYO)
        sub_slug = "".join([c for c in node_in.subcuenca.upper() if c.isalnum()])[:8] or "VALLE"
        count = db.query(Nodo).count() + 1
        node_id = f"NODO-{count:02d}-{sub_slug}"

    nodo_existente = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if nodo_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un nodo registrado con el identificador '{node_id}'."
        )

    # 3. Generar API Key Criptográfica Aleatoria
    api_key_raw = f"sec_key_{node_id.lower().replace('-', '_')}_{secrets.token_hex(12)}"

    # 4. Crear Nodo
    nuevo_nodo = Nodo(
        id_nodo=node_id,
        id_entidad_responsable=node_in.id_entidad_responsable,
        nombre=node_in.nombre,
        sector_cuenca=node_in.sector_cuenca,
        subcuenca=node_in.subcuenca,
        latitud=node_in.latitud,
        longitud=node_in.longitud,
        cota_msnm=node_in.cota_msnm,
        tipo_fuente=node_in.tipo_fuente,
        api_key_hash=api_key_raw,
        intervalo_envio_min=node_in.intervalo_envio_min,
        activo=True,
        descripcion=node_in.descripcion
    )
    db.add(nuevo_nodo)
    db.flush()

    # 5. Crear Calibración Activa Inicial
    calibracion = CalibracionNodo(
        id_nodo=node_id,
        ph_offset_v=node_in.ph_offset_v,
        ph_slope=node_in.ph_slope,
        tds_factor_k=node_in.tds_factor_k,
        tds_offset_v=0.0000,
        turb_v_clear=node_in.turb_v_clear,
        turb_v_turbid=node_in.turb_v_turbid,
        distancia_fondo_sensor_cm=node_in.distancia_fondo_sensor_cm,
        caudal_coef_k=node_in.caudal_coef_k,
        caudal_exp_n=node_in.caudal_exp_n,
        es_vigente=True,
        calibrado_por=node_in.calibrado_por
    )
    db.add(calibracion)

    # 6. Crear Umbrales de Alerta
    umbral = UmbralConfig(
        id_nodo=node_id,
        ph_min_alerta=node_in.ph_min_alerta,
        ph_max_alerta=node_in.ph_max_alerta,
        ec_max_advertencia_us_cm=node_in.ec_max_advertencia_us_cm,
        ec_max_critico_us_cm=node_in.ec_max_critico_us_cm,
        tds_max_alerta_ppm=node_in.tds_max_alerta_ppm,
        turb_max_alerta_ntu=node_in.turb_max_alerta_ntu,
        tirante_min_alerta_cm=node_in.tirante_min_alerta_cm,
        bateria_min_alerta_v=node_in.bateria_min_alerta_v
    )
    db.add(umbral)
    db.commit()
    db.refresh(nuevo_nodo)

    # 7. Generar Snippet C++ para el ESP32
    cpp_snippet = (
        f"// ============================================================================\n"
        f"// CREDENCIALES GENERADAS POR SENTINEL-H2O WEB PARA: {nuevo_nodo.nombre}\n"
        f"// Copia y pega estas 2 líneas en tu archivo 'firmware/include/config.h'\n"
        f"// ============================================================================\n"
        f'#define NODE_ID "{node_id}"\n'
        f'#define NODE_API_KEY "{api_key_raw}"\n'
    )

    nodo_detalle = NodeDetailOut(
        id_nodo=nuevo_nodo.id_nodo,
        nombre=nuevo_nodo.nombre,
        sector_cuenca=nuevo_nodo.sector_cuenca,
        subcuenca=nuevo_nodo.subcuenca,
        latitud=float(nuevo_nodo.latitud),
        longitud=float(nuevo_nodo.longitud),
        cota_msnm=float(nuevo_nodo.cota_msnm),
        tipo_fuente=nuevo_nodo.tipo_fuente,
        intervalo_envio_min=nuevo_nodo.intervalo_envio_min,
        activo=nuevo_nodo.activo,
        descripcion=nuevo_nodo.descripcion,
        id_entidad_responsable=nuevo_nodo.id_entidad_responsable,
        entidad_nombre=entidad.nombre_entidad,
        calibracion_vigente=CalibrationOut(
            id_calibracion=calibracion.id_calibracion,
            ph_offset_v=calibracion.ph_offset_v,
            ph_slope=calibracion.ph_slope,
            tds_factor_k=calibracion.tds_factor_k,
            tds_offset_v=calibracion.tds_offset_v,
            turb_v_clear=calibracion.turb_v_clear,
            turb_v_turbid=calibracion.turb_v_turbid,
            distancia_fondo_sensor_cm=calibracion.distancia_fondo_sensor_cm,
            caudal_coef_k=calibracion.caudal_coef_k,
            caudal_exp_n=calibracion.caudal_exp_n,
            es_vigente=calibracion.es_vigente,
            calibrado_por=calibracion.calibrado_por
        ),
        umbrales=ThresholdOut(
            ph_min_alerta=umbral.ph_min_alerta,
            ph_max_alerta=umbral.ph_max_alerta,
            ec_max_advertencia_us_cm=umbral.ec_max_advertencia_us_cm,
            ec_max_critico_us_cm=umbral.ec_max_critico_us_cm,
            tds_max_alerta_ppm=umbral.tds_max_alerta_ppm,
            turb_max_alerta_ntu=umbral.turb_max_alerta_ntu,
            tirante_min_alerta_cm=umbral.tirante_min_alerta_cm,
            bateria_min_alerta_v=umbral.bateria_min_alerta_v
        )
    )

    return NodeProvisionOut(
        id_nodo=node_id,
        nombre=nuevo_nodo.nombre,
        subcuenca=nuevo_nodo.subcuenca,
        api_key_plaintext=api_key_raw,
        cpp_config_snippet=cpp_snippet,
        mensaje=f"Nodo '{node_id}' aprovisionado con éxito. Grabe la API Key en el firmware del ESP32 para iniciar la transmisión.",
        nodo_detalles=nodo_detalle
    )


# ============================================================================
# 4. DETALLE, EDICIÓN Y ELIMINACIÓN DE NODOS
# ============================================================================
@router.get("/{node_id}", response_model=NodeDetailOut)
def get_node_detail(node_id: str, db: Session = Depends(get_db)):
    """
    Obtiene los detalles completos de un nodo (incluyendo calibración vigente y umbrales).
    """
    nodo = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El nodo '{node_id}' no existe en el sistema."
        )

    calibracion = db.query(CalibracionNodo).filter(
        CalibracionNodo.id_nodo == node_id,
        CalibracionNodo.es_vigente == True
    ).first()

    umbral = db.query(UmbralConfig).filter(UmbralConfig.id_nodo == node_id).first()

    return NodeDetailOut(
        id_nodo=nodo.id_nodo,
        nombre=nodo.nombre,
        sector_cuenca=nodo.sector_cuenca,
        subcuenca=nodo.subcuenca,
        latitud=float(nodo.latitud),
        longitud=float(nodo.longitud),
        cota_msnm=float(nodo.cota_msnm),
        tipo_fuente=nodo.tipo_fuente,
        intervalo_envio_min=nodo.intervalo_envio_min,
        activo=nodo.activo,
        descripcion=nodo.descripcion,
        id_entidad_responsable=nodo.id_entidad_responsable,
        entidad_nombre=nodo.entidad.nombre_entidad if nodo.entidad else None,
        calibracion_vigente=CalibrationOut.model_validate(calibracion) if calibracion else None,
        umbrales=ThresholdOut.model_validate(umbral) if umbral else None
    )


@router.put("/{node_id}", response_model=NodeDetailOut)
def update_node(node_id: str, node_in: NodeUpdateIn, db: Session = Depends(get_db)):
    """
    Actualiza la información descriptiva y operativa de un nodo existente.
    """
    nodo = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El nodo '{node_id}' no fue encontrado."
        )

    if node_in.nombre is not None:
        nodo.nombre = node_in.nombre
    if node_in.subcuenca is not None:
        nodo.subcuenca = node_in.subcuenca
    if node_in.sector_cuenca is not None:
        nodo.sector_cuenca = node_in.sector_cuenca
    if node_in.cota_msnm is not None:
        nodo.cota_msnm = node_in.cota_msnm
    if node_in.intervalo_envio_min is not None:
        nodo.intervalo_envio_min = node_in.intervalo_envio_min
    if node_in.activo is not None:
        nodo.activo = node_in.activo
    if node_in.descripcion is not None:
        nodo.descripcion = node_in.descripcion

    db.commit()
    db.refresh(nodo)
    return get_node_detail(node_id=node_id, db=db)


@router.delete("/{node_id}", status_code=status.HTTP_200_OK)
def delete_node(node_id: str, db: Session = Depends(get_db)):
    """
    Elimina un nodo del sistema (con eliminación en cascada de sus mediciones, alertas y calibraciones).
    """
    nodo = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El nodo '{node_id}' no fue encontrado."
        )

    db.delete(nodo)
    db.commit()
    return {"status": "SUCCESS", "message": f"Nodo '{node_id}' y todos sus registros asociados han sido eliminados."}


@router.post("/{node_id}/regenerate-api-key", response_model=ApiKeyRegenerateOut)
def regenerate_api_key(node_id: str, db: Session = Depends(get_db)):
    """
    Genera una nueva API Key de seguridad para el nodo (en caso de compromiso de credenciales).
    """
    nodo = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El nodo '{node_id}' no existe."
        )

    new_key = f"sec_key_{node_id.lower().replace('-', '_')}_{secrets.token_hex(12)}"
    nodo.api_key_hash = new_key
    db.commit()

    snippet = (
        f'#define NODE_ID "{node_id}"\n'
        f'#define NODE_API_KEY "{new_key}"\n'
    )
    return ApiKeyRegenerateOut(
        id_nodo=node_id,
        new_api_key=new_key,
        cpp_config_snippet=snippet,
        mensaje="API Key regenerada exitosamente. Actualice el archivo config.h del firmware."
    )
