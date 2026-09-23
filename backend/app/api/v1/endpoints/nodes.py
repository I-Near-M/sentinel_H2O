import secrets
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import (
    Nodo, CalibracionNodo, CalibracionSeccionHidraulica, PuntoSeccionCalibracion,
    UmbralConfig, Entidad, MedicionProcesada, MedicionRaw, MantenimientoNodo
)
from backend.app.schemas.nodes import (
    NodeStatusOut, NodeDetailOut, NodeProvisionIn, NodeProvisionOut,
    NodeUpdateIn, ApiKeyRegenerateOut, EntityOut, EntityCreateIn, EntityUpdateIn,
    CalibrationOut, CalibrationCreateIn, ThresholdOut,
    MantenimientoCreateIn, MantenimientoOut, MantenimientoUpdateIn
)

router = APIRouter()


# ============================================================================
# 1. GESTIÓN DE ENTIDADES RESPONSABLES (ANA, JUNTAS, COMISIONES)
# ============================================================================
@router.get("/entities/all", response_model=List[EntityOut])
def list_entities(
    include_inactive: bool = Query(True, description="Incluir entidades inactivas"),
    db: Session = Depends(get_db)
):
    """
    Retorna la lista de entidades gestoras registradas en el sistema.
    """
    query = db.query(Entidad)
    if not include_inactive:
        query = query.filter(Entidad.activo == True)
    entidades = query.order_by(Entidad.id_entidad.asc()).all()
    return entidades


@router.post("/entities", response_model=EntityOut, status_code=status.HTTP_201_CREATED)
def create_entity(entity_in: EntityCreateIn, db: Session = Depends(get_db)):
    """
    Registra una nueva entidad gestora.
    """
    nueva_entidad = Entidad(
        nombre_entidad=entity_in.nombre_entidad.strip(),
        tipo_entidad=entity_in.tipo_entidad.strip() if entity_in.tipo_entidad else "COMISION_REGANTES",
        ruc=entity_in.ruc.strip() if entity_in.ruc else None,
        telefono_contacto=entity_in.telefono_contacto.strip() if entity_in.telefono_contacto else None,
        email_contacto=entity_in.email_contacto.strip() if entity_in.email_contacto else None,
        direccion=entity_in.direccion.strip() if entity_in.direccion else None,
        activo=True
    )
    db.add(nueva_entidad)
    db.commit()
    db.refresh(nueva_entidad)
    return nueva_entidad


@router.put("/entities/{entity_id}", response_model=EntityOut)
def update_entity(entity_id: int, entity_in: EntityUpdateIn, db: Session = Depends(get_db)):
    """
    Actualiza los datos de una entidad gestora.
    """
    entidad = db.query(Entidad).filter(Entidad.id_entidad == entity_id).first()
    if not entidad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidad no encontrada")

    if entity_in.nombre_entidad is not None and entity_in.nombre_entidad.strip():
        entidad.nombre_entidad = entity_in.nombre_entidad.strip()
    if entity_in.tipo_entidad is not None:
        entidad.tipo_entidad = entity_in.tipo_entidad.strip()
    if entity_in.ruc is not None:
        entidad.ruc = entity_in.ruc.strip() if entity_in.ruc.strip() else None
    if entity_in.telefono_contacto is not None:
        entidad.telefono_contacto = entity_in.telefono_contacto.strip() if entity_in.telefono_contacto.strip() else None
    if entity_in.email_contacto is not None:
        entidad.email_contacto = entity_in.email_contacto.strip() if entity_in.email_contacto.strip() else None
    if entity_in.direccion is not None:
        entidad.direccion = entity_in.direccion.strip() if entity_in.direccion.strip() else None
    if entity_in.activo is not None:
        entidad.activo = entity_in.activo

    entidad.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(entidad)
    return entidad


@router.delete("/entities/{entity_id}", response_model=EntityOut)
def deactivate_entity(entity_id: int, db: Session = Depends(get_db)):
    """
    Desactiva lógicamente (soft-delete) una entidad gestora para preservar el historial de nodos y regantes.
    """
    entidad = db.query(Entidad).filter(Entidad.id_entidad == entity_id).first()
    if not entidad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidad no encontrada")

    entidad.activo = False
    entidad.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(entidad)
    return entidad


@router.patch("/entities/{entity_id}/toggle-active", response_model=EntityOut)
def toggle_entity_active(entity_id: int, db: Session = Depends(get_db)):
    """
    Alterna el estado activo/inactivo de una entidad gestora.
    """
    entidad = db.query(Entidad).filter(Entidad.id_entidad == entity_id).first()
    if not entidad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidad no encontrada")

    entidad.activo = not entidad.activo
    entidad.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(entidad)
    return entidad


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

        tramo = getattr(n, 'tramo_sector', None) or getattr(n, 'sector_cuenca', "SECTOR_PRINCIPAL")
        resultado.append(NodeStatusOut(
            id_nodo=n.id_nodo,
            codigo_estacion=getattr(n, 'codigo_estacion', n.id_nodo),
            nombre=n.nombre,
            tramo_sector=tramo,
            sector_cuenca=tramo,
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
    id_ent = str(node_in.id_entidad_responsable) if node_in.id_entidad_responsable is not None else None
    entidad = None
    if id_ent:
        entidad = db.query(Entidad).filter(
            (Entidad.id_entidad == id_ent) |
            (Entidad.id_entidad == f"ENT-{int(id_ent):02d}-JUNTA" if id_ent.isdigit() else False) |
            (Entidad.id_entidad == f"ENT-{int(id_ent):02d}-ANA" if id_ent.isdigit() and int(id_ent) == 1 else False) |
            (Entidad.id_entidad == f"ENT-{int(id_ent):02d}-COMISION" if id_ent.isdigit() and int(id_ent) == 3 else False)
        ).first()
    if not entidad:
        entidad = db.query(Entidad).first()

    id_ent_final = entidad.id_entidad if entidad else "ENT-00-PLATAFORMA"

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
    tramo = getattr(node_in, 'tramo_sector', None) or getattr(node_in, 'sector_cuenca', 'SECTOR_CABECERA')
    codigo_est = getattr(node_in, 'codigo_estacion', None) or node_id
    nuevo_nodo = Nodo(
        id_nodo=node_id,
        codigo_estacion=codigo_est,
        id_entidad_responsable=id_ent_final,
        nombre=node_in.nombre,
        tramo_sector=tramo,
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
        es_vigente=True,
        calibrado_por=node_in.calibrado_por
    )
    db.add(calibracion)
    db.flush()

    # 5.1 Crear Sección Hidráulica y Molinete Hall
    molinete_a = node_in.caudal_coef_k if node_in.caudal_coef_k is not None else node_in.molinete_constante_a
    ancho_rio = getattr(node_in, 'ancho_total_rio_m', 4.0)
    seccion = CalibracionSeccionHidraulica(
        id_calibracion=calibracion.id_calibracion,
        id_nodo=node_id,
        ancho_total_rio_m=ancho_rio,
        molinete_constante_a=molinete_a,
        molinete_constante_b=node_in.molinete_constante_b,
        coeficiente_friccion=getattr(node_in, 'coeficiente_friccion', 0.035),
        tipo_seccion=getattr(node_in, 'tipo_seccion', 'REGLETA_PUNTOS'),
        ancho_solera_m=getattr(node_in, 'ancho_solera_m', None),
        talud_z=getattr(node_in, 'talud_z', None),
        numero_verticales_aforo=len(node_in.puntos_seccion) if node_in.puntos_seccion else getattr(node_in, 'numero_verticales_aforo', 3),
        observaciones_aforo=getattr(node_in, 'observaciones_aforo', None),
        es_vigente=True,
        activo=True
    )
    db.add(seccion)
    db.flush()

    if node_in.puntos_seccion:
        for idx, pt in enumerate(node_in.puntos_seccion, start=1):
            pto_db = PuntoSeccionCalibracion(
                id_seccion_calibracion=seccion.id_seccion_calibracion,
                orden_punto=pt.orden_punto or idx,
                distancia_orilla_m=pt.distancia_orilla_m,
                profundidad_lecho_m=pt.profundidad_lecho_m,
                ancho_subseccion_m=pt.ancho_subseccion_m,
                activo=True
            )
            db.add(pto_db)

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
        codigo_estacion=nuevo_nodo.codigo_estacion,
        nombre=nuevo_nodo.nombre,
        tramo_sector=nuevo_nodo.tramo_sector,
        sector_cuenca=nuevo_nodo.tramo_sector,
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
        calibracion_vigente=CalibrationOut.model_validate(calibracion),
        umbrales=ThresholdOut.model_validate(umbral)
    )

    return NodeProvisionOut(
        id_nodo=node_id,
        codigo_estacion=nuevo_nodo.codigo_estacion,
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

    tramo = getattr(nodo, 'tramo_sector', None) or getattr(nodo, 'sector_cuenca', "SECTOR_PRINCIPAL")
    return NodeDetailOut(
        id_nodo=nodo.id_nodo,
        codigo_estacion=getattr(nodo, 'codigo_estacion', nodo.id_nodo),
        nombre=nodo.nombre,
        tramo_sector=tramo,
        sector_cuenca=tramo,
        subcuenca=nodo.subcuenca,
        latitud=float(nodo.latitud),
        longitud=float(nodo.longitud),
        cota_msnm=float(nodo.cota_msnm),
        tipo_fuente=nodo.tipo_fuente,
        intervalo_envio_min=nodo.intervalo_envio_min,
        activo=nodo.activo,
        descripcion=nodo.descripcion,
        id_entidad_responsable=str(nodo.id_entidad_responsable) if nodo.id_entidad_responsable else None,
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


# ============================================================================
# 5. GESTIÓN Y RECALIBRACIÓN DE SENSORES Y AFORO
# ============================================================================
@router.get("/{node_id}/calibration", response_model=CalibrationOut)
def get_node_calibration(node_id: str, db: Session = Depends(get_db)):
    """
    Obtiene la calibración vigente para los sensores y aforador de un nodo.
    """
    calibracion = db.query(CalibracionNodo).filter(
        CalibracionNodo.id_nodo == node_id,
        CalibracionNodo.es_vigente == True
    ).first()

    if not calibracion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró calibración vigente para el nodo '{node_id}'."
        )

    return CalibrationOut.model_validate(calibracion)


@router.post("/{node_id}/calibration", response_model=CalibrationOut, status_code=status.HTTP_201_CREATED)
def update_node_calibration(node_id: str, calib_in: CalibrationCreateIn, db: Session = Depends(get_db)):
    """
    Registra una nueva calibración física para el nodo (pH, TDS/EC, Turbidez, Altura de montaje, Coeficientes K y N).
    Desactiva las calibraciones previas y establece esta como la vigente.
    """
    nodo = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El nodo '{node_id}' no existe en el sistema."
        )

    # Desactivar calibraciones anteriores
    db.query(CalibracionNodo).filter(
        CalibracionNodo.id_nodo == node_id
    ).update({"es_vigente": False})

    db.query(CalibracionSeccionHidraulica).filter(
        CalibracionSeccionHidraulica.id_nodo == node_id
    ).update({"es_vigente": False})

    # Crear nueva calibración
    nueva_calib = CalibracionNodo(
        id_nodo=node_id,
        ph_offset_v=calib_in.ph_offset_v,
        ph_slope=calib_in.ph_slope,
        tds_factor_k=calib_in.tds_factor_k,
        tds_offset_v=calib_in.tds_offset_v,
        turb_v_clear=calib_in.turb_v_clear,
        turb_v_turbid=calib_in.turb_v_turbid,
        distancia_fondo_sensor_cm=calib_in.distancia_fondo_sensor_cm,
        es_vigente=True,
        calibrado_por=calib_in.calibrado_por
    )
    db.add(nueva_calib)
    db.flush()

    # Crear nueva sección hidráulica
    molinete_a = calib_in.caudal_coef_k if calib_in.caudal_coef_k is not None else calib_in.molinete_constante_a
    ancho_rio = getattr(calib_in, 'ancho_total_rio_m', 4.0)
    seccion = CalibracionSeccionHidraulica(
        id_calibracion=nueva_calib.id_calibracion,
        id_nodo=node_id,
        ancho_total_rio_m=ancho_rio,
        molinete_constante_a=molinete_a,
        molinete_constante_b=getattr(calib_in, 'molinete_constante_b', 0.05),
        coeficiente_friccion=getattr(calib_in, 'coeficiente_friccion', 0.035),
        tipo_seccion=getattr(calib_in, 'tipo_seccion', 'REGLETA_PUNTOS'),
        ancho_solera_m=getattr(calib_in, 'ancho_solera_m', None),
        talud_z=getattr(calib_in, 'talud_z', None),
        numero_verticales_aforo=len(calib_in.puntos_seccion) if calib_in.puntos_seccion else getattr(calib_in, 'numero_verticales_aforo', 3),
        observaciones_aforo=getattr(calib_in, 'observaciones_aforo', None),
        es_vigente=True,
        activo=True
    )
    db.add(seccion)
    db.flush()

    if calib_in.puntos_seccion:
        for idx, pt in enumerate(calib_in.puntos_seccion, start=1):
            pto_db = PuntoSeccionCalibracion(
                id_seccion_calibracion=seccion.id_seccion_calibracion,
                orden_punto=pt.orden_punto or idx,
                distancia_orilla_m=pt.distancia_orilla_m,
                profundidad_lecho_m=pt.profundidad_lecho_m,
                ancho_subseccion_m=pt.ancho_subseccion_m,
                activo=True
            )
            db.add(pto_db)

    db.commit()
    db.refresh(nueva_calib)

    return CalibrationOut.model_validate(nueva_calib)


# ============================================================================
# 6. BITÁCORA Y MANTENIMIENTOS DE NODO
# ============================================================================
def _format_maint_out(maint: MantenimientoNodo) -> MantenimientoOut:
    out = MantenimientoOut.model_validate(maint)
    if maint.nodo:
        out.nodo_nombre = maint.nodo.nombre
        out.codigo_estacion = maint.nodo.codigo_estacion
        out.subcuenca = maint.nodo.subcuenca
    return out


@router.get("/maintenances/all", response_model=List[MantenimientoOut])
def list_all_maintenances(
    node_id: Optional[str] = Query(None, description="Filtrar por ID de nodo"),
    estado: Optional[str] = Query(None, description="Filtrar por estado: PROGRAMADO, EN_EJECUCION, COMPLETADO, CANCELADO"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoria: FISICO, LOGICO, HIDRAULICO"),
    db: Session = Depends(get_db)
):
    """
    Retorna la bitácora completa de mantenimientos preventivos y correctivos de toda la red de estaciones.
    """
    query = db.query(MantenimientoNodo).filter(MantenimientoNodo.activo == True)
    if node_id:
        query = query.filter(MantenimientoNodo.id_nodo == node_id)
    if estado:
        query = query.filter(MantenimientoNodo.estado_mantenimiento == estado)
    if tipo:
        query = query.filter(MantenimientoNodo.tipo_mantenimiento == tipo)
    if categoria:
        query = query.filter(MantenimientoNodo.categoria == categoria)

    maintenances = query.order_by(MantenimientoNodo.fecha_programada.desc()).all()
    return [_format_maint_out(m) for m in maintenances]


@router.get("/{node_id}/maintenances", response_model=List[MantenimientoOut])
def list_node_maintenances(
    node_id: str,
    estado: Optional[str] = Query(None, description="Filtrar por estado: PROGRAMADO, EN_EJECUCION, COMPLETADO, CANCELADO"),
    db: Session = Depends(get_db)
):
    """
    Lista el historial de mantenimientos físicos, lógicos y calibraciones de un nodo específico.
    """
    nodo = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El nodo '{node_id}' no existe."
        )

    query = db.query(MantenimientoNodo).filter(
        MantenimientoNodo.id_nodo == node_id,
        MantenimientoNodo.activo == True
    )
    if estado:
        query = query.filter(MantenimientoNodo.estado_mantenimiento == estado)

    maintenances = query.order_by(MantenimientoNodo.fecha_programada.desc()).all()
    return [_format_maint_out(m) for m in maintenances]


@router.post("/{node_id}/maintenances", response_model=MantenimientoOut, status_code=status.HTTP_201_CREATED)
def create_node_maintenance(
    node_id: str,
    maint_in: MantenimientoCreateIn,
    db: Session = Depends(get_db)
):
    """
    Registra una orden de mantenimiento preventivo, correctivo o calibración para un nodo.
    """
    nodo = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El nodo '{node_id}' no existe."
        )

    nuevo_mantenimiento = MantenimientoNodo(
        id_nodo=node_id,
        tipo_mantenimiento=maint_in.tipo_mantenimiento,
        categoria=maint_in.categoria,
        fecha_programada=maint_in.fecha_programada,
        fecha_ejecucion=maint_in.fecha_ejecucion,
        tecnico_responsable=maint_in.tecnico_responsable,
        descripcion_trabajo=maint_in.descripcion_trabajo,
        diagnostico_inicial=maint_in.diagnostico_inicial,
        acciones_realizadas=maint_in.acciones_realizadas,
        repuestos_utilizados=maint_in.repuestos_utilizados,
        firmware_version_anterior=maint_in.firmware_version_anterior,
        firmware_version_instalada=maint_in.firmware_version_instalada,
        costo_estimado=maint_in.costo_estimado or 0.0,
        estado_mantenimiento=maint_in.estado_mantenimiento or "PROGRAMADO",
        observaciones=maint_in.observaciones,
        activo=True
    )
    db.add(nuevo_mantenimiento)
    db.commit()
    db.refresh(nuevo_mantenimiento)
    return _format_maint_out(nuevo_mantenimiento)


@router.put("/maintenances/{maintenance_id}", response_model=MantenimientoOut)
def update_maintenance(
    maintenance_id: str,
    maint_update: MantenimientoUpdateIn,
    db: Session = Depends(get_db)
):
    """
    Actualiza el estado de una intervención de mantenimiento (ej. COMPLETADO, repuestos usados, diagnóstico).
    """
    maint = db.query(MantenimientoNodo).filter(MantenimientoNodo.id_mantenimiento == maintenance_id).first()
    if not maint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El mantenimiento '{maintenance_id}' no fue encontrado."
        )

    update_data = maint_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(maint, field, value)

    maint.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(maint)
    return _format_maint_out(maint)


@router.delete("/maintenances/{maintenance_id}")
def delete_maintenance(
    maintenance_id: str,
    db: Session = Depends(get_db)
):
    """
    Desactiva lógicamente una orden de mantenimiento archivándola.
    """
    maint = db.query(MantenimientoNodo).filter(MantenimientoNodo.id_mantenimiento == maintenance_id).first()
    if not maint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El mantenimiento '{maintenance_id}' no fue encontrado."
        )
    maint.activo = False
    maint.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"message": "Mantenimiento cancelado y archivado correctamente"}


