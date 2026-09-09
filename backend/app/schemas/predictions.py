import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class HourlyForecastItem(BaseModel):
    horizonte_horas: int = Field(..., description="Paso horario futuro (+1 a +24)")
    fecha_proyectada: str
    caudal_predicho_m3s: float
    caudal_predicho_ls: float
    wqi_predicho: float
    wqi_categoria: str
    ph_predicho: float
    ec_predicho_us_cm: float
    tds_predicho_ppm: float
    temp_predicha_c: float
    turbidez_predicha_ntu: float
    riesgo_estres_hidrico: str


class Forecast24hResponse(BaseModel):
    id_nodo: str
    fecha_emision: datetime.datetime
    modelo_ia: str = "GRU-Shallow-v1.0"
    pronostico_24h: List[HourlyForecastItem]

    model_config = ConfigDict(from_attributes=True)


class LeadTimeRequest(BaseModel):
    origen_nodo_id: str = Field(..., json_schema_extra={"example": "NODO-01-CABECERA"})
    destino_nodo_id: str = Field("NODO-03-PARCELA", json_schema_extra={"example": "NODO-03-PARCELA"})
    caudal_origen_m3s: Optional[float] = Field(None, description="Caudal instantáneo en m³/s (si no se provee, se toma la última lectura)", json_schema_extra={"example": 1.8})


class LeadTimeResponse(BaseModel):
    origen_nodo_id: str
    destino_nodo_id: str
    distancia_km: float
    caudal_transporte_m3s: float
    velocidad_flujo_kmh: float
    lead_time_frente_horas: float
    lead_time_pico_horas: float
    lead_time_despeje_horas: float
    ventana_anticipacion_minutos: int
    tiempo_legible: str
    recomendacion_accion: str


class WhatIfRequest(BaseModel):
    titulo_escenario: str = Field(..., json_schema_extra={"example": "Simulación de Sequía Severa -40% Lluvia"})
    delta_precipitacion_pct: float = Field(0.0, ge=-100.0, le=500.0, description="Variación % de lluvia", json_schema_extra={"example": -40.0})
    delta_salinidad_us_cm: float = Field(0.0, ge=0.0, le=5000.0, description="Incremento de salinidad en uS/cm", json_schema_extra={"example": 350.0})
    delta_caudal_cabecera_pct: float = Field(0.0, ge=-100.0, le=200.0, description="Variación % en descarga de lagunas", json_schema_extra={"example": -20.0})
    id_entidad: Optional[int] = Field(None, json_schema_extra={"example": 2})
    ejecutado_por: Optional[str] = Field("Ingeniero de Cuenca", json_schema_extra={"example": "Ingeniero de Cuenca"})


class WhatIfResponse(BaseModel):
    id_simulacion: int
    titulo_escenario: str
    caudal_valle_proyectado_m3s: float
    caudal_valle_proyectado_ls: float
    salinidad_proyectada_ec: float
    tds_proyectado_ppm: float
    turbidez_proyectada_ntu: float
    wqi_score_proyectado: float
    wqi_categoria_proyectada: str
    resumen_impacto: str


# =========================================================================
# ESQUEMAS PARA MOTOR WHAT-IF AVANZADO MULTIVARIABLE
# =========================================================================

class MultiVariableWhatIfRequest(BaseModel):
    id_nodo_origen: Optional[str] = Field("NODO-01-CABECERA", description="Nodo donde se origina el evento")
    titulo_escenario: Optional[str] = Field("Escenario Personalizado", description="Nombre o etiqueta descriptiva")
    delta_caudal_pct: float = Field(0.0, ge=-90.0, le=300.0, description="Variación % en caudal (-90% a +300%)")
    delta_salinidad_us_cm: float = Field(0.0, ge=0.0, le=5000.0, description="Incremento de salinidad en uS/cm (0 a 5000)")
    delta_ph: float = Field(0.0, ge=-3.0, le=3.0, description="Desviación de pH (-3.0 a +3.0)")
    delta_precipitacion_pct: float = Field(0.0, ge=-100.0, le=300.0, description="Variación % de lluvia (-100% a +300%)")
    cultivo_diana: str = Field("PALTOS_AGUACATE", description="Cultivo agrícola a evaluar (PALTOS_AGUACATE, MANDARINOS_CITRICOS, UVA_VID, HORTALIZAS, MAIZ_FORRAJE)")
    duracion_horas: int = Field(12, ge=1, le=72, description="Duración del evento en horas")
    ejecutado_por: Optional[str] = Field("Operador Sentinel", description="Usuario que ejecuta la simulación")


class CropImpactResult(BaseModel):
    cultivo: str
    nombre_legible: str
    umbral_salinidad_ec_us_cm: float
    salinidad_efectiva_suelo_ec_e: float
    perdida_rendimiento_pct: float
    nivel_estres_osmotico: str
    diagnostico_agronomico: str
    accion_recomendada: str


class MultiVariableWhatIfResponse(BaseModel):
    id_simulacion: int
    titulo_escenario: str
    id_nodo_origen: str
    caudal_base_m3s: float
    caudal_proyectado_m3s: float
    caudal_proyectado_ls: float
    salinidad_base_ec: float
    salinidad_proyectada_ec: float
    tds_proyectado_ppm: float
    ph_base: float
    ph_proyectado: float
    turbidez_proyectada_ntu: float
    wqi_base: float
    wqi_proyectado: float
    wqi_categoria: str
    impacto_cultivo: CropImpactResult
    resumen_ejecutivo: str
    alerta_critica: bool


# -------------------------------------------------------------------------
# ESQUEMAS PARA CASCADA MULTITRAMO (LEAD TIME POR SECUENCIA DE NODOS)
# -------------------------------------------------------------------------

class CascadeLeadTimeRequest(BaseModel):
    id_nodo_origen: str = Field(..., description="Nodo donde inicia la perturbación/evento")
    caudal_transporte_m3s: Optional[float] = Field(None, description="Caudal de transporte en m³/s")
    salinidad_origen_ec: Optional[float] = Field(None, description="Salinidad en origen en uS/cm")
    ph_origen: Optional[float] = Field(None, description="pH en origen")


class CascadeHopItem(BaseModel):
    orden_secuencia: int
    id_nodo: str
    nombre: str
    sector_cuenca: str
    cota_msnm: float
    desnivel_acumulado_m: float
    distancia_tramo_km: float
    distancia_acumulada_km: float
    velocidad_media_ms: float
    velocidad_media_kmh: float
    lead_time_frente_horas: float
    lead_time_frente_minutos: int
    lead_time_frente_legible: str
    lead_time_pico_horas: float
    lead_time_despeje_horas: float
    salinidad_estimada_llegada_ec: float
    wqi_estimado_llegada: float
    estado_compuerta_recomendado: str
    nivel_alerta: str
    indicacion_operativa: str


class CascadeLeadTimeResponse(BaseModel):
    id_nodo_origen: str
    nombre_origen: str
    cota_origen_msnm: float
    caudal_efectivo_m3s: float
    total_estaciones_aguas_abajo: int
    secuencia_nodos: List[CascadeHopItem]
    resumen_cascada: str


# -------------------------------------------------------------------------
# ESQUEMAS PARA PRESCRIPCIÓN DE DILUCIÓN HIDRÁULICA
# -------------------------------------------------------------------------

class DilutionPrescriptionRequest(BaseModel):
    id_nodo_cabecera: Optional[str] = Field("NODO-01-CABECERA", description="Nodo de cabecera")
    salinidad_actual_rio_ec: float = Field(..., ge=200.0, le=10000.0, description="Salinidad actual detectada en río (uS/cm)")
    caudal_actual_rio_m3s: float = Field(..., ge=0.1, le=100.0, description="Caudal actual del río (m³/s)")
    salinidad_objetivo_ec: float = Field(1000.0, ge=200.0, le=3000.0, description="Salinidad meta para entrega segura (uS/cm)")
    salinidad_agua_represa_ec: float = Field(150.0, ge=50.0, le=500.0, description="Salinidad de reserva pura en represa (uS/cm)")
    duracion_lavado_horas: int = Field(8, ge=1, le=48, description="Ventana de lavado deseada en horas")


class DilutionPrescriptionResponse(BaseModel):
    caudal_rio_actual_m3s: float
    salinidad_actual_rio_ec: float
    salinidad_objetivo_ec: float
    caudal_descarga_requerido_m3s: float
    caudal_descarga_requerido_ls: float
    caudal_total_resultante_m3s: float
    volumen_total_desembalse_m3: float
    volumen_total_desembalse_mmc: float
    duracion_lavado_horas: int
    factibilidad_operativa: str
    prescripcion_tecnica: str


# -------------------------------------------------------------------------
# ESQUEMAS PARA AUDITORÍA DE DESVÍOS Y BALANCE DE LA MITA
# -------------------------------------------------------------------------

class MitaAuditRequest(BaseModel):
    id_nodo_infractor: str = Field(..., description="Nodo o bocatoma donde se registra sobre-extracción")
    caudal_exceso_ls: float = Field(..., ge=1.0, le=5000.0, description="Caudal extraído por encima de la asignación (l/s)")
    duracion_sobre_extraccion_horas: float = Field(..., ge=0.5, le=72.0, description="Horas continuas de sobre-extracción")
    caudal_nominal_valle_m3s: Optional[float] = Field(1.5, description="Caudal nominal base del canal del valle")


class MitaAuditResponse(BaseModel):
    id_nodo_infractor: str
    caudal_exceso_ls: float
    caudal_exceso_m3s: float
    duracion_horas: float
    volumen_total_sustraido_m3: float
    retraso_turno_valle_horas: float
    deficit_hectareas_afectadas: float
    impacto_caudal_ecologico: str
    dictamen_auditoria: str


# # =========================================================================
# ESQUEMAS PARA INTELIGENCIA AGRO-HÍDRICA & DECISIONES MIDAGRI
# =========================================================================

class AgroCropItem(BaseModel):
    crop_id: str
    name: str
    region_natural: Optional[str] = "Costa"
    category: str
    water_demand_m3_ha: float
    ec_threshold_us_cm: float
    salinity_slope_pct: float
    ph_min: float
    ph_max: float
    turbidity_max_ntu: Optional[float] = 100.0
    temp_min_c: Optional[float] = 12.0
    temp_max_c: Optional[float] = 30.0
    wqi_min: float
    growth_cycle_days: int
    base_yield_kg_ha: float
    base_price_s_kg: float
    resilience_level: str
    description: str


class AgroRegionalBenchmarkResponse(BaseModel):
    region: str
    crops_stats: Dict[str, Any]
    loss_profile: Dict[str, Any]
    irrigation_profile: Dict[str, Any]
    planting_intentions: List[Dict[str, Any]]


class CropSuitabilityRequest(BaseModel):
    crop_id: Optional[str] = Field(None, description="ID del cultivo (opcional; si se omite evalúa todo el catálogo)")
    ec_us_cm: float = Field(..., ge=50.0, le=15000.0, description="Conductividad eléctrica del agua en uS/cm")
    ph: float = Field(7.2, ge=3.0, le=11.0, description="pH del agua de riego")
    turbidity_ntu: Optional[float] = Field(20.0, ge=0.0, le=3000.0, description="Turbidez en NTU")
    temp_water_c: Optional[float] = Field(18.5, ge=5.0, le=45.0, description="Temperatura del agua en °C")
    wqi: Optional[float] = Field(75.0, ge=0.0, le=100.0, description="Índice de Calidad del Agua WQI")
    water_availability_ratio: float = Field(1.0, ge=0.0, le=2.0, description="Ratio Oferta/Demanda de agua (1.0 = 100% abastecimiento)")
    region: str = Field("LIMA", description="Región o departamento de referencia")
    natural_region: Optional[str] = Field(None, description="Filtrar por región natural ('Costa', 'Sierra', 'Selva')")


class CropSuitabilityItem(BaseModel):
    crop_id: str
    crop_name: str
    region_natural: Optional[str] = "Costa"
    category: str
    suitability_score: float
    status: str
    status_color: str
    resilience_level: str
    stress_factor_ks: float
    salinity_retention_pct: float
    ph_factor_pct: float
    turbidity_factor_pct: Optional[float] = 100.0
    temperature_factor_pct: Optional[float] = 100.0
    water_availability_pct: float
    expected_yield_kg_ha: float
    base_yield_kg_ha: float
    regional_mean_yield_kg_ha: float
    farmgate_price_s_kg: float
    water_demand_m3_ha: float
    ec_threshold_us_cm: float
    extra_filtration_cost_s_ha: Optional[float] = 0.0
    diagnostics: Optional[Dict[str, Any]] = None
    recommendation: str


class CropSuitabilityResponse(BaseModel):
    ec_us_cm: float
    ph: float
    wqi: float
    water_availability_ratio: float
    region: str
    evaluated_crops: List[CropSuitabilityItem]


class AgroScenarioWhatIfRequest(BaseModel):
    titulo_escenario: Optional[str] = Field("Simulación Agro-Hídrica MIDAGRI", description="Título descriptivo del escenario")
    crop_distribution_ha: Dict[str, float] = Field(..., description="Distribución de hectáreas por cultivo (ej: {'palto': 120, 'mandarina': 80})")
    available_flow_m3s: float = Field(..., ge=0.01, le=100.0, description="Caudal disponible de río/canal para agricultura en m³/s")
    ec_us_cm: float = Field(..., ge=50.0, le=15000.0, description="Conductividad eléctrica del agua en uS/cm")
    ph: Optional[float] = Field(7.2, ge=3.0, le=11.0, description="pH del agua de riego")
    turbidity_ntu: Optional[float] = Field(20.0, ge=0.0, le=3000.0, description="Turbidez en NTU")
    temp_water_c: Optional[float] = Field(18.5, ge=5.0, le=45.0, description="Temperatura del agua en °C")
    wqi: Optional[float] = Field(75.0, ge=0.0, le=100.0, description="Índice WQI")
    irrigation_type: Optional[str] = Field("gravity", description="Tipo de riego: 'gravity', 'sprinkler', 'drip'")
    water_tariff_s_m3: Optional[float] = Field(0.045, ge=0.0, le=1.0, description="Tarifa del agua de riego en S/. por m³")
    region: Optional[str] = Field("LIMA", description="Región de referencia")
    simulated_duration_days: Optional[int] = Field(365, ge=1, le=730, description="Horizonte de simulación en días (365 = campaña anual)")


class AgroCropSummaryItem(BaseModel):
    crop_id: str
    crop_name: str
    region_natural: Optional[str] = "Costa"
    category: str
    planned_ha: float
    suitability_score: float
    status: str
    status_color: str
    water_demand_mmc: float
    potential_revenue_s: float
    stressed_revenue_s: float
    economic_loss_s: float
    loss_pct: float
    water_cost_s: float
    filtration_extra_cost_s: Optional[float] = 0.0
    net_margin_s: float
    diagnostics: Optional[Dict[str, Any]] = None
    substitutes: List[Dict[str, Any]]


class AgroScenarioWhatIfResponse(BaseModel):
    region: str
    simulated_duration_days: int
    irrigation_type: str
    irrigation_efficiency: float
    total_planned_ha: float
    available_flow_m3s: float
    water_availability_mmc: float
    gross_water_demand_mmc: float
    net_water_demand_mmc: float
    water_deficit_mmc: float
    water_coverage_pct: float
    water_balance_status: str
    water_balance_color: str
    total_potential_revenue_s: float
    total_stressed_revenue_s: float
    total_economic_loss_s: float
    total_loss_pct: float
    total_water_cost_s: float
    total_extra_filtration_cost_s: Optional[float] = 0.0
    net_agricultural_margin_s: float
    at_risk_crops_count: int
    loss_attribution: Dict[str, Any]
    tech_upgrade_potential: Dict[str, Any]
    crops_summary: List[AgroCropSummaryItem]


class WaterQualityStressSimulationRequest(BaseModel):
    crop_id: str = Field(..., description="ID del cultivo a evaluar bajo estrés")
    ec_us_cm: float = Field(..., ge=50.0, le=15000.0, description="Conductividad eléctrica (uS/cm)")
    ph: float = Field(7.2, ge=3.0, le=11.0, description="pH del agua de riego")
    turbidity_ntu: float = Field(20.0, ge=0.0, le=3000.0, description="Turbidez en NTU")
    temp_water_c: float = Field(18.5, ge=5.0, le=45.0, description="Temperatura del agua (°C)")
    water_availability_ratio: float = Field(1.0, ge=0.0, le=2.0, description="Ratio de disponibilidad de caudal (1.0 = 100%)")
    region: str = Field("LIMA", description="Región departamental de referencia")


class WaterQualityStressSimulationResponse(BaseModel):
    crop_id: str
    crop_name: str
    region_natural: str
    category: str
    suitability_score: float
    status: str
    status_color: str
    resilience_level: str
    stress_factor_ks: float
    expected_yield_kg_ha: float
    base_yield_kg_ha: float
    regional_mean_yield_kg_ha: float
    farmgate_price_s_kg: float
    potential_revenue_ha_s: float
    stressed_revenue_ha_s: float
    economic_loss_ha_s: float
    extra_filtration_cost_s_ha: float
    salinity_retention_pct: float
    ph_factor_pct: float
    turbidity_factor_pct: float
    temperature_factor_pct: float
    water_availability_pct: float
    diagnostics: Dict[str, Any]
    recommendation: str
    substitutes: List[Dict[str, Any]]


class PlantingIntentionsFeasibilityRequest(BaseModel):
    region: str = Field("LIMA", description="Departamento a evaluar")
    available_flow_m3s: float = Field(1.20, ge=0.01, le=100.0, description="Caudal asignado al valle/región en m³/s")
    irrigation_type: str = Field("gravity", description="Tecnología de riego ('gravity', 'sprinkler', 'drip')")
    simulated_duration_days: int = Field(365, ge=30, le=730, description="Días de campaña agraria")


class PlantingIntentionsFeasibilityResponse(BaseModel):
    region: str
    total_declared_ha: float
    available_flow_m3s: float
    water_availability_mmc: float
    total_intentions_demand_mmc: float
    water_deficit_mmc: float
    campaign_coverage_pct: float
    hectares_secured_ha: float
    hectares_at_risk_ha: float
    verdict: str
    verdict_color: str
    recommendation: str
    intentions_breakdown: List[Dict[str, Any]]
