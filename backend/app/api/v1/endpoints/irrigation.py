import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import (
    TurnoRiego, Entidad, DestinatarioAlerta, Nodo, MedicionProcesada, Usuario
)
from backend.app.schemas.irrigation import (
    TurnoRiegoCreate, TurnoRiegoUpdate, TurnoRiegoResponse,
    ReachHydraulicImpactRequest, ReachHydraulicImpactResponse
)
from backend.app.api.deps import get_current_user

router = APIRouter()


@router.get("/shifts", response_model=List[TurnoRiegoResponse])
def list_irrigation_shifts(
    estado: Optional[str] = Query(None, description="Filtrar por estado: PROGRAMADO, EN_EJECUCION, COMPLETADO_EXITOSO, etc."),
    id_entidad: Optional[str] = Query(None, description="Filtrar por entidad gestora"),
    db: Session = Depends(get_db)
):
    """Lista todos los turnos de riego activos con modelado de tramos aguas arriba y aguas abajo."""
    query = db.query(TurnoRiego).filter(TurnoRiego.activo == True)
    if estado:
        query = query.filter(TurnoRiego.estado_turno == estado)
    if id_entidad:
        query = query.filter(TurnoRiego.id_entidad == id_entidad)

    shifts = query.order_by(TurnoRiego.fecha_inicio_programada.desc()).all()
    results = []

    for s in shifts:
        dest = db.query(DestinatarioAlerta).filter(DestinatarioAlerta.id_destinatario == s.id_destinatario).first()
        ent = db.query(Entidad).filter(Entidad.id_entidad == s.id_entidad).first()
        n_arr = db.query(Nodo).filter(Nodo.id_nodo == s.id_nodo_aguas_arriba).first()
        n_aba = db.query(Nodo).filter(Nodo.id_nodo == s.id_nodo_aguas_abajo).first()
        n_boc = db.query(Nodo).filter(Nodo.id_nodo == s.id_nodo_bocatoma).first()

        results.append(
            TurnoRiegoResponse(
                id_turno=s.id_turno,
                id_entidad=s.id_entidad,
                id_destinatario=s.id_destinatario,
                id_nodo_aguas_arriba=s.id_nodo_aguas_arriba,
                id_nodo_aguas_abajo=s.id_nodo_aguas_abajo,
                id_nodo_bocatoma=s.id_nodo_bocatoma,
                fecha_inicio_programada=s.fecha_inicio_programada,
                fecha_fin_programada=s.fecha_fin_programada,
                horas_programadas=s.horas_programadas,
                caudal_acordado_ls=s.caudal_acordado_ls,
                volumen_programado_m3=s.volumen_programado_m3,
                volumen_real_entregado_m3=s.volumen_real_entregado_m3,
                balance_impacto_tramo_pct=s.balance_impacto_tramo_pct,
                cumplimiento_pct=s.cumplimiento_pct,
                estado_turno=s.estado_turno,
                observaciones=s.observaciones,
                activo=s.activo,
                created_at=s.created_at,
                nombre_regante=f"{dest.nombres} {dest.apellidos}" if dest else "Regante Desconocido",
                nombre_entidad=ent.nombre_entidad if ent else "Entidad",
                nombre_nodo_arriba=n_arr.nombre if n_arr else s.id_nodo_aguas_arriba,
                nombre_nodo_abajo=n_aba.nombre if n_aba else s.id_nodo_aguas_abajo,
                nombre_nodo_bocatoma=n_boc.nombre if n_boc else s.id_nodo_bocatoma
            )
        )

    return results


@router.post("/shifts", response_model=TurnoRiegoResponse, status_code=status.HTTP_201_CREATED)
def create_irrigation_shift(
    payload: TurnoRiegoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Crea y programa un nuevo turno de riego delimitado entre tramos hidrométricos.
    Valida que la entidad tenga permisos normativos de gestión de riego.
    """
    ent = db.query(Entidad).filter(Entidad.id_entidad == payload.id_entidad, Entidad.activo == True).first()
    if not ent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidad emisora no encontrada.")

    # Validar que el tipo de entidad tenga habilitada la gestión de riego
    if ent.tipo_entidad_rel and not ent.tipo_entidad_rel.permite_gestion_riego:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"La entidad '{ent.nombre_entidad}' de tipo '{ent.tipo_entidad_rel.nombre}' no tiene facultades normativas para asignar turnos de riego."
        )

    dest = db.query(DestinatarioAlerta).filter(DestinatarioAlerta.id_destinatario == payload.id_destinatario).first()
    if not dest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regante destinatario no encontrado.")

    # Calcular volumen si no se especificó
    volumen_calc = payload.volumen_programado_m3
    if volumen_calc is None:
        volumen_calc = round((payload.caudal_acordado_ls / 1000.0) * (payload.horas_programadas * 3600.0), 2)

    # Calcular balance de impacto preliminar respecto al caudal actual del nodo aguas arriba
    last_proc = db.query(MedicionProcesada).filter(
        MedicionProcesada.id_nodo == payload.id_nodo_aguas_arriba
    ).order_by(MedicionProcesada.timestamp.desc()).first()

    q_arriba = last_proc.caudal_m3s if last_proc else 1.50
    q_captacion_m3s = payload.caudal_acordado_ls / 1000.0
    impacto_pct = round(min(100.0, (q_captacion_m3s / max(0.01, q_arriba)) * 100.0), 2)

    nuevo_turno = TurnoRiego(
        id_entidad=payload.id_entidad,
        id_destinatario=payload.id_destinatario,
        id_nodo_aguas_arriba=payload.id_nodo_aguas_arriba,
        id_nodo_aguas_abajo=payload.id_nodo_aguas_abajo,
        id_nodo_bocatoma=payload.id_nodo_bocatoma,
        fecha_inicio_programada=payload.fecha_inicio_programada,
        fecha_fin_programada=payload.fecha_fin_programada,
        horas_programadas=payload.horas_programadas,
        caudal_acordado_ls=payload.caudal_acordado_ls,
        volumen_programado_m3=volumen_calc,
        volumen_real_entregado_m3=0.0,
        balance_impacto_tramo_pct=impacto_pct,
        cumplimiento_pct=0.0,
        estado_turno="PROGRAMADO",
        observaciones=payload.observaciones,
        activo=True
    )
    db.add(nuevo_turno)
    db.commit()
    db.refresh(nuevo_turno)

    n_arr = db.query(Nodo).filter(Nodo.id_nodo == payload.id_nodo_aguas_arriba).first()
    n_aba = db.query(Nodo).filter(Nodo.id_nodo == payload.id_nodo_aguas_abajo).first()
    n_boc = db.query(Nodo).filter(Nodo.id_nodo == payload.id_nodo_bocatoma).first()

    return TurnoRiegoResponse(
        id_turno=nuevo_turno.id_turno,
        id_entidad=nuevo_turno.id_entidad,
        id_destinatario=nuevo_turno.id_destinatario,
        id_nodo_aguas_arriba=nuevo_turno.id_nodo_aguas_arriba,
        id_nodo_aguas_abajo=nuevo_turno.id_nodo_aguas_abajo,
        id_nodo_bocatoma=nuevo_turno.id_nodo_bocatoma,
        fecha_inicio_programada=nuevo_turno.fecha_inicio_programada,
        fecha_fin_programada=nuevo_turno.fecha_fin_programada,
        horas_programadas=nuevo_turno.horas_programadas,
        caudal_acordado_ls=nuevo_turno.caudal_acordado_ls,
        volumen_programado_m3=nuevo_turno.volumen_programado_m3,
        volumen_real_entregado_m3=nuevo_turno.volumen_real_entregado_m3,
        balance_impacto_tramo_pct=nuevo_turno.balance_impacto_tramo_pct,
        cumplimiento_pct=nuevo_turno.cumplimiento_pct,
        estado_turno=nuevo_turno.estado_turno,
        observaciones=nuevo_turno.observaciones,
        activo=nuevo_turno.activo,
        created_at=nuevo_turno.created_at,
        nombre_regante=f"{dest.nombres} {dest.apellidos}",
        nombre_entidad=ent.nombre_entidad,
        nombre_nodo_arriba=n_arr.nombre if n_arr else payload.id_nodo_aguas_arriba,
        nombre_nodo_abajo=n_aba.nombre if n_aba else payload.id_nodo_aguas_abajo,
        nombre_nodo_bocatoma=n_boc.nombre if n_boc else payload.id_nodo_bocatoma
    )


@router.post("/simulate-reach-impact", response_model=ReachHydraulicImpactResponse)
def simulate_reach_hydraulic_impact(
    req: ReachHydraulicImpactRequest,
    db: Session = Depends(get_db)
):
    """
    Calcula en tiempo real cómo impactará la derivación de un turno de riego
    sobre el caudal del tramo fluvial entre el nodo aguas arriba y aguas abajo.
    """
    last_proc = db.query(MedicionProcesada).filter(
        MedicionProcesada.id_nodo == req.id_nodo_aguas_arriba
    ).order_by(MedicionProcesada.timestamp.desc()).first()

    caudal_arriba = last_proc.caudal_m3s if last_proc else 1.20
    q_captacion_m3s = round(req.caudal_captacion_ls / 1000.0, 4)
    q_abajo_proy = max(0.0, round(caudal_arriba - q_captacion_m3s, 4))
    reduccion_pct = round(min(100.0, (q_captacion_m3s / max(0.01, caudal_arriba)) * 100.0), 2)
    volumen_m3 = round(q_captacion_m3s * (req.duracion_horas * 3600.0), 2)

    # Verificación de caudal ecológico residual mínimo (0.10 m³/s)
    if q_abajo_proy < 0.10:
        ecologico = "CRÍTICO - RIESGO DE SECADO DE CAUCE"
        viable = False
        obs = f"La captación de {req.caudal_captacion_ls} l/s dejaría el tramo aguas abajo en {q_abajo_proy*1000:.0f} l/s, violando el caudal ecológico mínimo."
    elif q_abajo_proy < 0.25:
        ecologico = "ALERTA AMARILLA - CAUDAL RESIDUAL AJUSTADO"
        viable = True
        obs = f"Derivación factible pero cercana al umbral de estiaje. Supervisar nodo downstream."
    else:
        ecologico = "ÓPTIMO - CAUDAL ECOLÓGICO PRESERVADO"
        viable = True
        obs = f"Derivación viable. El caudal aguas abajo proyectado ({q_abajo_proy:.3f} m³/s) garantiza continuidad de flujo."

    return ReachHydraulicImpactResponse(
        id_nodo_aguas_arriba=req.id_nodo_aguas_arriba,
        id_nodo_aguas_abajo=req.id_nodo_aguas_abajo,
        caudal_arriba_actual_m3s=round(caudal_arriba, 3),
        caudal_arriba_actual_ls=round(caudal_arriba * 1000.0, 1),
        caudal_captacion_ls=req.caudal_captacion_ls,
        caudal_captacion_m3s=q_captacion_m3s,
        caudal_abajo_proyectado_m3s=q_abajo_proy,
        caudal_abajo_proyectado_ls=round(q_abajo_proy * 1000.0, 1),
        reduccion_caudal_tramo_pct=reduccion_pct,
        volumen_turno_m3=volumen_m3,
        impacto_caudal_ecologico=ecologico,
        es_viable=viable,
        observacion_hidraulica=obs
    )


@router.put("/shifts/{id_turno}/status")
def update_shift_status(
    id_turno: str,
    estado_turno: str = Query(..., description="PROGRAMADO, EN_EJECUCION, COMPLETADO_EXITOSO, DEFICIT_VOLUMEN, CANCELADO_CONTAMINACION, CANCELADO_ADMIN"),
    volumen_real_entregado_m3: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Actualiza el estado y volumen real de un turno de riego."""
    s = db.query(TurnoRiego).filter(TurnoRiego.id_turno == id_turno, TurnoRiego.activo == True).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turno no encontrado.")

    s.estado_turno = estado_turno
    if volumen_real_entregado_m3 is not None:
        s.volumen_real_entregado_m3 = volumen_real_entregado_m3
        if s.volumen_programado_m3 > 0:
            s.cumplimiento_pct = round(min(100.0, (volumen_real_entregado_m3 / s.volumen_programado_m3) * 100.0), 1)

    db.commit()
    return {"message": f"Turno {id_turno} actualizado a estado '{estado_turno}'"}


@router.delete("/shifts/{id_turno}")
def delete_shift(
    id_turno: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Cancela y desactiva un turno de riego."""
    s = db.query(TurnoRiego).filter(TurnoRiego.id_turno == id_turno).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turno no encontrado.")

    s.activo = False
    s.estado_turno = "CANCELADO_ADMIN"
    db.commit()
    return {"message": f"Turno {id_turno} cancelado y desactivado."}
