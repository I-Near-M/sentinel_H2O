import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import Nodo, MedicionProcesada
from backend.app.schemas.predictions import (
    Forecast24hResponse, HourlyForecastItem,
    LeadTimeRequest, LeadTimeResponse,
    WhatIfRequest, WhatIfResponse
)
from backend.app.ml.gru_predictor import GRUTimeSeriesPredictor
from backend.app.ml.lead_time import HydraulicLeadTimeEstimator
from backend.app.ml.whatif_simulator import WhatIfSimulator

router = APIRouter()


@router.get("/{node_id}/forecast-24h", response_model=Forecast24hResponse)
def get_node_forecast_24h(node_id: str, db: Session = Depends(get_db)):
    """
    **Pronóstico de Disponibilidad Hídrica y Calidad a 24 Horas (Modelo GRU)**:
    Genera y retorna la proyección horaria (+1h a +24h) de caudal (m³/s, l/s),
    WQI, salinidad (EC), pH y nivel de riesgo de estrés hídrico.
    """
    nodo = db.query(Nodo).filter(Nodo.id_nodo == node_id).first()
    if not nodo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nodo '{node_id}' no encontrado."
        )

    forecast_items = GRUTimeSeriesPredictor.forecast_24h(
        db=db,
        id_nodo=node_id,
        persist_in_db=True
    )

    return Forecast24hResponse(
        id_nodo=node_id,
        fecha_emision=datetime.datetime.now(datetime.timezone.utc),
        modelo_ia="GRU-Shallow-v1.0",
        pronostico_24h=[HourlyForecastItem(**item) for item in forecast_items]
    )


@router.post("/lead-time", response_model=LeadTimeResponse)
def calculate_lead_time(req: LeadTimeRequest, db: Session = Depends(get_db)):
    """
    **Estimación del Tiempo de Viaje de Contaminación (Lead Time)**:
    Calcula la velocidad hidrodinámica y el tiempo que tardará una pluma detectada aguas arriba
    (ej: en Vichaycocha o Acos) en llegar a la bocatoma de riego (Huayopampa / Huaral).
    """
    caudal = req.caudal_origen_m3s
    if caudal is None:
        last_proc = db.query(MedicionProcesada).filter(
            MedicionProcesada.id_nodo == req.origen_nodo_id
        ).order_by(MedicionProcesada.timestamp.desc()).first()
        caudal = last_proc.caudal_m3s if last_proc else 1.20

    res = HydraulicLeadTimeEstimator.estimate_travel_time(
        origen_nodo_id=req.origen_nodo_id,
        destino_nodo_id=req.destino_nodo_id,
        caudal_origen_m3s=caudal,
        db=db
    )
    return LeadTimeResponse(**res)


@router.post("/simulate-whatif", response_model=WhatIfResponse)
def simulate_whatif_scenario(req: WhatIfRequest, db: Session = Depends(get_db)):
    """
    **Simulador de Escenarios 'What-If'**:
    Permite evaluar el impacto teórico de sequías severas (-% precipitación),
    descargas de lagunas o incrementos de salinidad en el valle.
    """
    res = WhatIfSimulator.run_simulation(
        db=db,
        titulo_escenario=req.titulo_escenario,
        delta_precipitacion_pct=req.delta_precipitacion_pct,
        delta_salinidad_us_cm=req.delta_salinidad_us_cm,
        delta_caudal_cabecera_pct=req.delta_caudal_cabecera_pct,
        id_entidad=req.id_entidad,
        ejecutado_por=req.ejecutado_por
    )
    return WhatIfResponse(**res)


@router.post("/sync-all-forecasts")
def sync_all_forecasts_batch(db: Session = Depends(get_db)):
    """
    **Worker Batch**: Genera y refresca los pronósticos a 24 horas de todos los nodos activos de la cuenca.
    """
    nodos = db.query(Nodo).filter(Nodo.activo == True).all()
    count = 0
    for n in nodos:
        GRUTimeSeriesPredictor.forecast_24h(db=db, id_nodo=n.id_nodo, persist_in_db=True)
        count += 1

    return {
        "status": "SUCCESS",
        "nodos_actualizados": count,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "mensaje": f"Pronósticos a 24h generados exitosamente para {count} nodos."
    }
