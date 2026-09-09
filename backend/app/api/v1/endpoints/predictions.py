import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import Nodo, MedicionProcesada
from backend.app.schemas.predictions import (
    Forecast24hResponse, HourlyForecastItem,
    LeadTimeRequest, LeadTimeResponse,
    WhatIfRequest, WhatIfResponse,
    MultiVariableWhatIfRequest, MultiVariableWhatIfResponse,
    CascadeLeadTimeRequest, CascadeLeadTimeResponse,
    DilutionPrescriptionRequest, DilutionPrescriptionResponse,
    MitaAuditRequest, MitaAuditResponse,
    AgroCropItem, AgroRegionalBenchmarkResponse,
    CropSuitabilityRequest, CropSuitabilityResponse, CropSuitabilityItem,
    AgroScenarioWhatIfRequest, AgroScenarioWhatIfResponse, AgroCropSummaryItem
)
from backend.app.ml.gru_predictor import GRUTimeSeriesPredictor
from backend.app.ml.lead_time import HydraulicLeadTimeEstimator
from backend.app.ml.whatif_simulator import WhatIfSimulator
from backend.app.ml.midagri_processor import midagri_processor
from backend.app.ml.crop_recommender import crop_suitability_engine
from backend.app.ml.agro_risk_model import agro_risk_model

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
    **Estimación del Tiempo de Viaje de Contaminación (Lead Time Punto a Punto)**:
    Calcula la velocidad hidrodinámica y el tiempo que tardará una pluma detectada aguas arriba
    en llegar a la bocatoma de riego destino.
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


@router.post("/lead-time/cascade", response_model=CascadeLeadTimeResponse)
def calculate_cascade_lead_time(req: CascadeLeadTimeRequest, db: Session = Depends(get_db)):
    """
    **Propagación en Cascada Multitramo (Timeline Secuencial de Nodos Aguas Abajo)**:
    Calcula el tiempo de tránsito (frente, pico, despeje), atenuación de salinidad
    y recomendación de compuertas para toda la secuencia de estaciones aguas abajo del nodo origen.
    """
    caudal = req.caudal_transporte_m3s
    salinidad = req.salinidad_origen_ec
    ph = req.ph_origen

    if caudal is None or salinidad is None or ph is None:
        last_proc = db.query(MedicionProcesada).filter(
            MedicionProcesada.id_nodo == req.id_nodo_origen
        ).order_by(MedicionProcesada.timestamp.desc()).first()

        if caudal is None:
            caudal = last_proc.caudal_m3s if last_proc else 1.5
        if salinidad is None:
            salinidad = last_proc.ec_us_cm if last_proc else 1200.0
        if ph is None:
            ph = last_proc.ph if last_proc else 7.35

    res = HydraulicLeadTimeEstimator.calculate_cascade_propagation(
        origen_nodo_id=req.id_nodo_origen,
        caudal_transporte_m3s=caudal,
        salinidad_origen_ec=salinidad,
        ph_origen=ph,
        db=db
    )
    return CascadeLeadTimeResponse(**res)


@router.post("/simulate-whatif", response_model=WhatIfResponse)
def simulate_whatif_scenario(req: WhatIfRequest, db: Session = Depends(get_db)):
    """
    **Simulador Clásico de Escenarios 'What-If'**:
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


@router.post("/simulate-multivariable", response_model=MultiVariableWhatIfResponse)
def simulate_multivariable_scenario(req: MultiVariableWhatIfRequest, db: Session = Depends(get_db)):
    """
    **Motor de Simulación Multivariable & Matriz Agronómica (Maas-Hoffman)**:
    Evalúa en paralelo variaciones de Caudal, Salinidad, pH y Lluvia con
    diagnóstico de pérdida de rendimiento específico para el cultivo diana.
    """
    res = WhatIfSimulator.run_multivariable_simulation(
        db=db,
        id_nodo_origen=req.id_nodo_origen or "NODO-01-CABECERA",
        titulo_escenario=req.titulo_escenario or "Escenario Multivariable",
        delta_caudal_pct=req.delta_caudal_pct,
        delta_salinidad_us_cm=req.delta_salinidad_us_cm,
        delta_ph=req.delta_ph,
        delta_precipitacion_pct=req.delta_precipitacion_pct,
        cultivo_diana=req.cultivo_diana,
        duracion_horas=req.duracion_horas,
        ejecutado_por=req.ejecutado_por
    )
    return MultiVariableWhatIfResponse(**res)


@router.post("/prescribe-dilution", response_model=DilutionPrescriptionResponse)
def prescribe_hydraulic_dilution(req: DilutionPrescriptionRequest):
    """
    **Prescriptor de Dilución Hidráulica (Lavado de Cuenca)**:
    Calcula el caudal y volumen de descarga requeridos desde una represa limpia
    para diluir una concentración salina en el río antes de las bocatomas.
    """
    res = WhatIfSimulator.calculate_dilution_prescription(
        salinidad_actual_rio_ec=req.salinidad_actual_rio_ec,
        caudal_actual_rio_m3s=req.caudal_actual_rio_m3s,
        salinidad_objetivo_ec=req.salinidad_objetivo_ec,
        salinidad_agua_represa_ec=req.salinidad_agua_represa_ec,
        duracion_lavado_horas=req.duracion_lavado_horas
    )
    return DilutionPrescriptionResponse(**res)


@router.post("/audit-mita-deficit", response_model=MitaAuditResponse)
def audit_mita_deficit(req: MitaAuditRequest):
    """
    **Auditoría de Desvíos y Balance de La Mita**:
    Cuantifica el volumen sustraído en exceso en una bocatoma,
    el retraso en horas para el siguiente turno de riego y el impacto en caudal ecológico.
    """
    res = WhatIfSimulator.calculate_mita_audit(
        id_nodo_infractor=req.id_nodo_infractor,
        caudal_exceso_ls=req.caudal_exceso_ls,
        duracion_sobre_extraccion_horas=req.duracion_sobre_extraccion_horas,
        caudal_nominal_valle_m3s=req.caudal_nominal_valle_m3s or 1.5
    )
    return MitaAuditResponse(**res)


@router.get("/simulations-history", response_model=List[Dict[str, Any]])
def get_simulations_history(limit: int = 20, db: Session = Depends(get_db)):
    """
    **Historial de Simulaciones**:
    Retorna los registros forenses de las simulaciones ejecutadas en el sistema.
    """
    return WhatIfSimulator.get_simulations_history(db=db, limit=limit)


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


# =========================================================================
# NUEVOS ENDPOINTS: INTELIGENCIA AGRO-HÍDRICA & MODELOS MIDAGRI
# =========================================================================

@router.get("/agro/crops", response_model=List[AgroCropItem])
def get_agro_crops_catalog():
    """
    **Catálogo Agronómico de Cultivos MIDAGRI**:
    Retorna el listado de cultivos calibrados con requerimientos hídricos (m³/ha),
    umbrales de salinidad (uS/cm), rendimientos base y cotizaciones en chacra (S/./kg).
    """
    crops = midagri_processor.list_crops()
    return [AgroCropItem(**c) for c in crops]


@router.get("/agro/regional-benchmarks", response_model=AgroRegionalBenchmarkResponse)
def get_agro_regional_benchmarks(region: str = Query("LIMA", description="Departamento / Región agrícola")):
    """
    **Benchmarking Histórico Regional MIDAGRI (SIEA 2017-2023 & ENA 2024-2025)**:
    Retorna series de rendimiento promedio, precios, perfil de pérdidas por sequía/salinidad,
    tecnificación del riego e intenciones de siembra registradas en la encuesta agraria.
    """
    bench = midagri_processor.get_regional_benchmark(region=region)
    return AgroRegionalBenchmarkResponse(
        region=bench.get("region", region),
        crops_stats=bench.get("crops_stats", {}),
        loss_profile=bench.get("loss_profile", {}),
        irrigation_profile=bench.get("irrigation_profile", {}),
        planting_intentions=bench.get("planting_intentions", [])
    )


@router.post("/agro/suitability", response_model=CropSuitabilityResponse)
def evaluate_crop_suitability(req: CropSuitabilityRequest):
    """
    **Evaluador de Aptitud Agronómica & Resiliencia por Cultivo (IA & FAO-56)**:
    Calcula el índice de aptitud (0-100%), retención de rendimiento y semáforo de viabilidad
    para cultivos agrícolas frente a la salinidad (EC), pH, WQI y disponibilidad hídrica del agua.
    """
    if req.crop_id:
        eval_res = crop_suitability_engine.evaluate_crop(
            crop_id=req.crop_id,
            ec_us_cm=req.ec_us_cm,
            ph=req.ph,
            wqi=req.wqi,
            water_availability_ratio=req.water_availability_ratio,
            region=req.region
        )
        evaluated_list = [CropSuitabilityItem(**eval_res)]
    else:
        all_res = crop_suitability_engine.evaluate_all_crops(
            ec_us_cm=req.ec_us_cm,
            ph=req.ph,
            wqi=req.wqi,
            water_availability_ratio=req.water_availability_ratio,
            region=req.region
        )
        evaluated_list = [CropSuitabilityItem(**r) for r in all_res]

    return CropSuitabilityResponse(
        ec_us_cm=req.ec_us_cm,
        ph=req.ph,
        wqi=req.wqi,
        water_availability_ratio=req.water_availability_ratio,
        region=req.region,
        evaluated_crops=evaluated_list
    )


@router.post("/agro/what-if", response_model=AgroScenarioWhatIfResponse)
def simulate_agro_whatif_scenario(req: AgroScenarioWhatIfRequest):
    """
    **Simulador What-If de Cédula Agrícola & Pérdidas Económicas (MIDAGRI Engine)**:
    Evalúa un plan de siembra multicultivo contra la oferta de agua disponible del río y la salinidad,
    proyectando el balance hídrico en MMC, pérdidas económicas en S/. y recomendaciones de cultivo sustituto.
    """
    sim_res = agro_risk_model.simulate_agro_scenario(
        crop_distribution_ha=req.crop_distribution_ha,
        available_flow_m3s=req.available_flow_m3s,
        ec_us_cm=req.ec_us_cm,
        ph=req.ph or 7.2,
        wqi=req.wqi or 75.0,
        irrigation_type=req.irrigation_type or "gravity",
        water_tariff_s_m3=req.water_tariff_s_m3 or 0.045,
        region=req.region or "LIMA",
        simulated_duration_days=req.simulated_duration_days or 365
    )

    crops_summary_items = [
        AgroCropSummaryItem(
            crop_id=c["crop_id"],
            crop_name=c["crop_name"],
            category=c["category"],
            planned_ha=c["planned_ha"],
            suitability_score=c["suitability_score"],
            status=c["status"],
            status_color=c["status_color"],
            water_demand_mmc=c["water_demand_mmc"],
            potential_revenue_s=c["potential_revenue_s"],
            stressed_revenue_s=c["stressed_revenue_s"],
            economic_loss_s=c["economic_loss_s"],
            loss_pct=c["loss_pct"],
            water_cost_s=c["water_cost_s"],
            net_margin_s=c["net_margin_s"],
            substitutes=c.get("substitutes", [])
        )
        for c in sim_res["crops_summary"]
    ]

    return AgroScenarioWhatIfResponse(
        region=sim_res["region"],
        simulated_duration_days=sim_res["simulated_duration_days"],
        irrigation_type=sim_res["irrigation_type"],
        irrigation_efficiency=sim_res["irrigation_efficiency"],
        total_planned_ha=sim_res["total_planned_ha"],
        available_flow_m3s=sim_res["available_flow_m3s"],
        water_availability_mmc=sim_res["water_availability_mmc"],
        gross_water_demand_mmc=sim_res["gross_water_demand_mmc"],
        net_water_demand_mmc=sim_res["net_water_demand_mmc"],
        water_deficit_mmc=sim_res["water_deficit_mmc"],
        water_coverage_pct=sim_res["water_coverage_pct"],
        water_balance_status=sim_res["water_balance_status"],
        water_balance_color=sim_res["water_balance_color"],
        total_potential_revenue_s=sim_res["total_potential_revenue_s"],
        total_stressed_revenue_s=sim_res["total_stressed_revenue_s"],
        total_economic_loss_s=sim_res["total_economic_loss_s"],
        total_loss_pct=sim_res["total_loss_pct"],
        total_water_cost_s=sim_res["total_water_cost_s"],
        net_agricultural_margin_s=sim_res["net_agricultural_margin_s"],
        at_risk_crops_count=sim_res["at_risk_crops_count"],
        loss_attribution=sim_res["loss_attribution"],
        tech_upgrade_potential=sim_res["tech_upgrade_potential"],
        crops_summary=crops_summary_items
    )
