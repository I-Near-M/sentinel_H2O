"""
Sentinel-H2O: MIDAGRI Data Ingestion and Normalization Processor
Extracts, cleans, and standardizes agricultural statistics from MIDAGRI SIEA (2017-2023)
and ENA (Encuesta Nacional Agraria 2024-2025) across all Peruvian agro-ecological regions
(Costa, Sierra, Selva and Nacional).
"""

import os
import glob
import json
import logging
import unicodedata
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger("sentinel.ml.midagri_processor")
logger.setLevel(logging.INFO)

# Expanded national crops catalog with agronomic, biophysical and economic parameters
DEFAULT_CROPS_PARAMS: Dict[str, Dict[str, Any]] = {
    # --- COSTA ---
    "palto": {
        "crop_id": "palto",
        "name": "Palto (Palta Hass / Fuerte)",
        "region_natural": "Costa",
        "category": "Frutales / Agroexportación",
        "water_demand_m3_ha": 10500.0,
        "ec_threshold_us_cm": 1500.0,     # 1.5 dS/m
        "salinity_slope_pct": 14.0,
        "ph_min": 6.0,
        "ph_max": 7.5,
        "turbidity_max_ntu": 40.0,
        "temp_water_min_c": 14.0,
        "temp_water_max_c": 24.0,
        "wqi_min": 65.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 15500.0,
        "base_price_s_kg": 4.80,
        "resilience_level": "Baja",
        "description": "Cultivo de alta rentabilidad pero muy sensible al estrés por cloruros/sales y déficit hídrico continuo."
    },
    "mandarina": {
        "crop_id": "mandarina",
        "name": "Mandarina / Cítricos (Satsuma, W. Murcott)",
        "region_natural": "Costa",
        "category": "Frutales / Agroexportación",
        "water_demand_m3_ha": 9200.0,
        "ec_threshold_us_cm": 1700.0,     # 1.7 dS/m
        "salinity_slope_pct": 13.0,
        "ph_min": 6.0,
        "ph_max": 7.5,
        "turbidity_max_ntu": 50.0,
        "temp_water_min_c": 15.0,
        "temp_water_max_c": 26.0,
        "wqi_min": 60.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 28000.0,
        "base_price_s_kg": 2.20,
        "resilience_level": "Media-Baja",
        "description": "Sensible al encharcamiento y a la salinidad moderada. Requiere riego uniforme en floración."
    },
    "vid": {
        "crop_id": "vid",
        "name": "Vid (Uva de Mesa / Pisco)",
        "region_natural": "Costa",
        "category": "Frutales / Agroexportación",
        "water_demand_m3_ha": 7800.0,
        "ec_threshold_us_cm": 2500.0,     # 2.5 dS/m
        "salinity_slope_pct": 9.6,
        "ph_min": 6.0,
        "ph_max": 8.0,
        "turbidity_max_ntu": 80.0,
        "temp_water_min_c": 12.0,
        "temp_water_max_c": 26.0,
        "wqi_min": 55.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 19500.0,
        "base_price_s_kg": 3.40,
        "resilience_level": "Media",
        "description": "Moderadamente tolerante a la salinidad y con buena respuesta al riego deficitario controlado."
    },
    "esparrago": {
        "crop_id": "esparrago",
        "name": "Espárrago Verde / Blanco",
        "region_natural": "Costa",
        "category": "Hortalizas / Agroexportación",
        "water_demand_m3_ha": 11500.0,
        "ec_threshold_us_cm": 4100.0,     # 4.1 dS/m
        "salinity_slope_pct": 2.0,
        "ph_min": 6.0,
        "ph_max": 8.2,
        "turbidity_max_ntu": 100.0,
        "temp_water_min_c": 14.0,
        "temp_water_max_c": 28.0,
        "wqi_min": 50.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 12000.0,
        "base_price_s_kg": 6.50,
        "resilience_level": "Alta",
        "description": "Alta demanda volumétrica de agua pero excelente tolerancia a la salinidad y suelos arenosos."
    },
    "fresa": {
        "crop_id": "fresa",
        "name": "Fresa (San Andreas / Camarosa)",
        "region_natural": "Costa",
        "category": "Hortalizas / Bayas",
        "water_demand_m3_ha": 5800.0,
        "ec_threshold_us_cm": 1000.0,     # 1.0 dS/m
        "salinity_slope_pct": 33.0,
        "ph_min": 5.8,
        "ph_max": 6.8,
        "turbidity_max_ntu": 30.0,
        "temp_water_min_c": 12.0,
        "temp_water_max_c": 22.0,
        "wqi_min": 70.0,
        "growth_cycle_days": 210,
        "base_yield_kg_ha": 32000.0,
        "base_price_s_kg": 3.80,
        "resilience_level": "Muy Baja",
        "description": "Extremadamente sensible a sales y cloro. Requiere alta calidad de agua y riego presurizado por goteo."
    },
    "maiz_amarillo": {
        "crop_id": "maiz_amarillo",
        "name": "Maíz Amarillo Duro",
        "region_natural": "Costa",
        "category": "Granos / Cereales",
        "water_demand_m3_ha": 6200.0,
        "ec_threshold_us_cm": 2700.0,     # 2.7 dS/m
        "salinity_slope_pct": 12.0,
        "ph_min": 5.8,
        "ph_max": 7.8,
        "turbidity_max_ntu": 120.0,
        "temp_water_min_c": 14.0,
        "temp_water_max_c": 30.0,
        "wqi_min": 50.0,
        "growth_cycle_days": 140,
        "base_yield_kg_ha": 8500.0,
        "base_price_s_kg": 1.45,
        "resilience_level": "Media-Alta",
        "description": "Cultivo transitorio tradicional de la costa con demanda hídrica moderada y alta rotación."
    },
    "cebolla": {
        "crop_id": "cebolla",
        "name": "Cebolla Roja / Amarilla",
        "region_natural": "Costa",
        "category": "Hortalizas",
        "water_demand_m3_ha": 4800.0,
        "ec_threshold_us_cm": 1200.0,
        "salinity_slope_pct": 16.0,
        "ph_min": 6.0,
        "ph_max": 7.2,
        "turbidity_max_ntu": 50.0,
        "temp_water_min_c": 12.0,
        "temp_water_max_c": 24.0,
        "wqi_min": 65.0,
        "growth_cycle_days": 130,
        "base_yield_kg_ha": 38000.0,
        "base_price_s_kg": 1.15,
        "resilience_level": "Baja",
        "description": "Sensible a la salinidad en germinación y desarrollo inicial de bulbos."
    },
    "algodon": {
        "crop_id": "algodon",
        "name": "Algodón (Tangüis / Pima)",
        "region_natural": "Costa",
        "category": "Industriales / Fibras",
        "water_demand_m3_ha": 7500.0,
        "ec_threshold_us_cm": 4500.0,     # 4.5 dS/m
        "salinity_slope_pct": 5.2,
        "ph_min": 6.0,
        "ph_max": 8.5,
        "turbidity_max_ntu": 150.0,
        "temp_water_min_c": 16.0,
        "temp_water_max_c": 32.0,
        "wqi_min": 45.0,
        "growth_cycle_days": 180,
        "base_yield_kg_ha": 3200.0,
        "base_price_s_kg": 4.20,
        "resilience_level": "Alta",
        "description": "Fibra textil peruana con excelente tolerancia a sales y calor en valles de Ica, Pisco y Piura."
    },

    # --- SIERRA ---
    "papa": {
        "crop_id": "papa",
        "name": "Papa (Blanca / Canchán / Yungay)",
        "region_natural": "Sierra",
        "category": "Tubérculos",
        "water_demand_m3_ha": 5200.0,
        "ec_threshold_us_cm": 1700.0,     # 1.7 dS/m
        "salinity_slope_pct": 12.0,
        "ph_min": 5.5,
        "ph_max": 7.2,
        "turbidity_max_ntu": 60.0,
        "temp_water_min_c": 8.0,
        "temp_water_max_c": 20.0,
        "wqi_min": 60.0,
        "growth_cycle_days": 120,
        "base_yield_kg_ha": 22000.0,
        "base_price_s_kg": 1.30,
        "resilience_level": "Media",
        "description": "Sensible al déficit hídrico en fase de tuberización y a salinidades medias."
    },
    "papa_nativa": {
        "crop_id": "papa_nativa",
        "name": "Papa Nativa (Huamantanga / Peruanita / Tumbay)",
        "region_natural": "Sierra",
        "category": "Tubérculos",
        "water_demand_m3_ha": 4600.0,
        "ec_threshold_us_cm": 2000.0,
        "salinity_slope_pct": 10.0,
        "ph_min": 5.0,
        "ph_max": 7.0,
        "turbidity_max_ntu": 80.0,
        "temp_water_min_c": 6.0,
        "temp_water_max_c": 18.0,
        "wqi_min": 55.0,
        "growth_cycle_days": 150,
        "base_yield_kg_ha": 16000.0,
        "base_price_s_kg": 2.60,
        "resilience_level": "Media-Alta",
        "description": "Cultivo andino de altura con alta rusticidad y cotización premium en gastronomía."
    },
    "maiz_amilaceo": {
        "crop_id": "maiz_amilaceo",
        "name": "Maíz Amiláceo / Choclo (Cusco / Mantaro)",
        "region_natural": "Sierra",
        "category": "Granos / Cereales",
        "water_demand_m3_ha": 5400.0,
        "ec_threshold_us_cm": 2200.0,
        "salinity_slope_pct": 11.0,
        "ph_min": 5.5,
        "ph_max": 7.5,
        "turbidity_max_ntu": 90.0,
        "temp_water_min_c": 8.0,
        "temp_water_max_c": 22.0,
        "wqi_min": 55.0,
        "growth_cycle_days": 180,
        "base_yield_kg_ha": 4800.0,
        "base_price_s_kg": 3.10,
        "resilience_level": "Media",
        "description": "Maíz blanco gigante y choclo de valles interandinos con alto arraigo cultural y alimentario."
    },
    "quinua": {
        "crop_id": "quinua",
        "name": "Quinua (Blanca Junín / Salcedo / Pasankalla)",
        "region_natural": "Sierra",
        "category": "Resilientes / Granos Andinos",
        "water_demand_m3_ha": 3500.0,
        "ec_threshold_us_cm": 6000.0,     # 6.0 dS/m (Halófita facultativa)
        "salinity_slope_pct": 1.5,
        "ph_min": 5.2,
        "ph_max": 8.5,
        "turbidity_max_ntu": 150.0,
        "temp_water_min_c": 5.0,
        "temp_water_max_c": 22.0,
        "wqi_min": 35.0,
        "growth_cycle_days": 135,
        "base_yield_kg_ha": 3200.0,
        "base_price_s_kg": 6.80,
        "resilience_level": "Excepcional",
        "description": "Extrema resiliencia a la sequía, frío y salinidad, con alta cotización en mercado internacional."
    },
    "haba": {
        "crop_id": "haba",
        "name": "Haba (Verde / Grano Seco)",
        "region_natural": "Sierra",
        "category": "Leguminosas",
        "water_demand_m3_ha": 4200.0,
        "ec_threshold_us_cm": 1600.0,
        "salinity_slope_pct": 13.5,
        "ph_min": 6.0,
        "ph_max": 7.8,
        "turbidity_max_ntu": 70.0,
        "temp_water_min_c": 8.0,
        "temp_water_max_c": 20.0,
        "wqi_min": 60.0,
        "growth_cycle_days": 140,
        "base_yield_kg_ha": 6500.0,
        "base_price_s_kg": 2.40,
        "resilience_level": "Media",
        "description": "Leguminosa fijadora de nitrógeno fundamental para rotación de parcelas en la sierra."
    },
    "cebada": {
        "crop_id": "cebada",
        "name": "Cebada (Grano / Forrajera)",
        "region_natural": "Sierra",
        "category": "Granos / Cereales",
        "water_demand_m3_ha": 4000.0,
        "ec_threshold_us_cm": 5000.0,     # 5.0 dS/m
        "salinity_slope_pct": 5.0,
        "ph_min": 5.8,
        "ph_max": 8.2,
        "turbidity_max_ntu": 120.0,
        "temp_water_min_c": 6.0,
        "temp_water_max_c": 22.0,
        "wqi_min": 45.0,
        "growth_cycle_days": 125,
        "base_yield_kg_ha": 3800.0,
        "base_price_s_kg": 1.60,
        "resilience_level": "Alta",
        "description": "Cereal de gran rusticidad, tolerante a suelos salinos y escasez hídrica en puna y altiplano."
    },
    "avena_forrajera": {
        "crop_id": "avena_forrajera",
        "name": "Avena Forrajera (Vilcanota / Mantaro)",
        "region_natural": "Sierra",
        "category": "Forrajes",
        "water_demand_m3_ha": 4500.0,
        "ec_threshold_us_cm": 3500.0,
        "salinity_slope_pct": 8.0,
        "ph_min": 5.5,
        "ph_max": 7.8,
        "turbidity_max_ntu": 100.0,
        "temp_water_min_c": 6.0,
        "temp_water_max_c": 22.0,
        "wqi_min": 45.0,
        "growth_cycle_days": 110,
        "base_yield_kg_ha": 28000.0,
        "base_price_s_kg": 0.38,
        "resilience_level": "Alta",
        "description": "Forraje verde y henificado indispensable para ganado vacuno y ovino en Puno, Cusco y Junín."
    },
    "alcachofa": {
        "crop_id": "alcachofa",
        "name": "Alcachofa (Sin Espinas / Criolla)",
        "region_natural": "Sierra",
        "category": "Hortalizas / Agroexportación",
        "water_demand_m3_ha": 7200.0,
        "ec_threshold_us_cm": 3000.0,
        "salinity_slope_pct": 8.5,
        "ph_min": 6.0,
        "ph_max": 7.8,
        "turbidity_max_ntu": 60.0,
        "temp_water_min_c": 10.0,
        "temp_water_max_c": 22.0,
        "wqi_min": 55.0,
        "growth_cycle_days": 180,
        "base_yield_kg_ha": 18500.0,
        "base_price_s_kg": 2.80,
        "resilience_level": "Media-Alta",
        "description": "Hortaliza de agroexportación cultivada con éxito en el Valle del Mantaro (Junín) y costa."
    },

    # --- SELVA ---
    "cafe": {
        "crop_id": "cafe",
        "name": "Café Pergamino (Typica, Bourbon, Caturra)",
        "region_natural": "Selva",
        "category": "Agroforestería / Agroexportación",
        "water_demand_m3_ha": 8500.0,
        "ec_threshold_us_cm": 1400.0,
        "salinity_slope_pct": 15.0,
        "ph_min": 5.0,
        "ph_max": 6.8,     # Prefiere aguas/suelos ligeramente ácidos
        "turbidity_max_ntu": 50.0,
        "temp_water_min_c": 16.0,
        "temp_water_max_c": 26.0,
        "wqi_min": 65.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 1800.0,
        "base_price_s_kg": 9.50,
        "resilience_level": "Media",
        "description": "Cultivo bandera de selva alta (San Martín, Chanchamayo, Jaén). Requiere suelos sin sales y buen drenaje."
    },
    "cacao": {
        "crop_id": "cacao",
        "name": "Cacao (Criollo / Fino de Aroma / CCN-51)",
        "region_natural": "Selva",
        "category": "Agroforestería / Agroexportación",
        "water_demand_m3_ha": 9500.0,
        "ec_threshold_us_cm": 1500.0,
        "salinity_slope_pct": 14.0,
        "ph_min": 5.5,
        "ph_max": 7.2,
        "turbidity_max_ntu": 60.0,
        "temp_water_min_c": 18.0,
        "temp_water_max_c": 28.0,
        "wqi_min": 60.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 1400.0,
        "base_price_s_kg": 12.00,
        "resilience_level": "Media",
        "description": "Cultivo de selva de alto valor internacional, sensible al estrés salino y anegamiento prolongado."
    },
    "palma_aceitera": {
        "crop_id": "palma_aceitera",
        "name": "Palma Aceitera (Tenera)",
        "region_natural": "Selva",
        "category": "Industriales / Oleaginosas",
        "water_demand_m3_ha": 12500.0,
        "ec_threshold_us_cm": 2500.0,
        "salinity_slope_pct": 8.0,
        "ph_min": 4.8,
        "ph_max": 7.0,
        "turbidity_max_ntu": 100.0,
        "temp_water_min_c": 20.0,
        "temp_water_max_c": 32.0,
        "wqi_min": 50.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 22000.0,
        "base_price_s_kg": 0.65,
        "resilience_level": "Alta",
        "description": "Oleaginosa perenne de selva baja (Ucayali, San Martín) con alta demanda de humedad constante."
    },
    "platano": {
        "crop_id": "platano",
        "name": "Plátano / Banano (Bellaco / Seda / Isla)",
        "region_natural": "Selva",
        "category": "Frutales",
        "water_demand_m3_ha": 11000.0,
        "ec_threshold_us_cm": 1500.0,
        "salinity_slope_pct": 14.0,
        "ph_min": 5.5,
        "ph_max": 7.5,
        "turbidity_max_ntu": 80.0,
        "temp_water_min_c": 18.0,
        "temp_water_max_c": 30.0,
        "wqi_min": 55.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 26000.0,
        "base_price_s_kg": 1.20,
        "resilience_level": "Media-Baja",
        "description": "Frutal básico para seguridad alimentaria en la cuenca amazónica y costa norte."
    },
    "yuca": {
        "crop_id": "yuca",
        "name": "Yuca (Brava / Dulce / Señorita)",
        "region_natural": "Selva",
        "category": "Tubérculos / Raíces",
        "water_demand_m3_ha": 5200.0,
        "ec_threshold_us_cm": 3000.0,
        "salinity_slope_pct": 8.0,
        "ph_min": 4.5,     # Muy tolerante a acidez de selva
        "ph_max": 7.5,
        "turbidity_max_ntu": 120.0,
        "temp_water_min_c": 16.0,
        "temp_water_max_c": 32.0,
        "wqi_min": 45.0,
        "growth_cycle_days": 270,
        "base_yield_kg_ha": 18000.0,
        "base_price_s_kg": 1.10,
        "resilience_level": "Alta",
        "description": "Raíz rústica tropical con excelente capacidad de adaptación a suelos ácidos y periodos de sequía."
    },

    # --- RESILIENTES IA ---
    "granado": {
        "crop_id": "granado",
        "name": "Granado (Wonderful) - [Cultivo Resiliente IA]",
        "region_natural": "Costa",
        "category": "Resilientes / Alternativos",
        "water_demand_m3_ha": 5200.0,
        "ec_threshold_us_cm": 4000.0,     # 4.0 dS/m
        "salinity_slope_pct": 4.5,
        "ph_min": 6.0,
        "ph_max": 8.2,
        "turbidity_max_ntu": 100.0,
        "temp_water_min_c": 12.0,
        "temp_water_max_c": 30.0,
        "wqi_min": 45.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 17000.0,
        "base_price_s_kg": 4.50,
        "resilience_level": "Muy Alta",
        "description": "Recomendado como sustituto ante estrés hídrico y salinidad severa en valles costeros."
    },
    "olivo": {
        "crop_id": "olivo",
        "name": "Olivo (Aceituna Criolla / Sevillana) - [Cultivo Resiliente IA]",
        "region_natural": "Costa",
        "category": "Resilientes / Alternativos",
        "water_demand_m3_ha": 4200.0,
        "ec_threshold_us_cm": 4500.0,     # 4.5 dS/m
        "salinity_slope_pct": 3.0,
        "ph_min": 6.0,
        "ph_max": 8.5,
        "turbidity_max_ntu": 120.0,
        "temp_water_min_c": 10.0,
        "temp_water_max_c": 30.0,
        "wqi_min": 40.0,
        "growth_cycle_days": 365,
        "base_yield_kg_ha": 9000.0,
        "base_price_s_kg": 5.20,
        "resilience_level": "Muy Alta",
        "description": "Excelente tolerancia a la escasez de agua y a aguas con alta carga de sales solubles."
    }
}

# Regional Classification of Peru
REGIONS_INFO = {
    "COSTA": ["LIMA", "ICA", "LA LIBERTAD", "PIURA", "LAMBAYEQUE", "AREQUIPA", "ANCASH", "TACNA", "MOQUEGUA", "TUMBES"],
    "SIERRA": ["JUNIN", "CUSCO", "PUNO", "AYACUCHO", "CAJAMARCA", "HUANUCO", "APURIMAC", "HUANCAVELICA", "PASCO"],
    "SELVA": ["SAN MARTIN", "UCAYALI", "LORETO", "MADRE DE DIOS", "AMAZONAS"],
    "NACIONAL": ["NACIONAL"]
}

class MIDAGRIProcessor:
    """Processes SIEA and ENA agricultural data across Costa, Sierra and Selva."""

    def __init__(self, data_root: Optional[str] = None):
        if data_root is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
            self.data_root = os.path.join(base_dir, "data", "midagri")
        else:
            self.data_root = data_root

        self.cache_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(self.cache_dir, exist_ok=True)
        
        self.crops_catalog: Dict[str, Dict[str, Any]] = {}
        self.regional_benchmarks: Dict[str, Any] = {}
        self.loss_risk_profiles: Dict[str, Any] = {}
        self.intentions_summary: Dict[str, Any] = {}
        
        self.load_or_build_all()

    @staticmethod
    def clean_text(s: Any) -> str:
        """Standardizes text string removing accents and extra spaces."""
        if s is None or pd.isna(s):
            return ""
        s = str(s).strip()
        return unicodedata.normalize("NFKD", s).encode("ASCII", "ignore").decode("ASCII").upper()

    def get_natural_region_for_department(self, dept: str) -> str:
        """Returns Costa, Sierra or Selva for a given department."""
        d_clean = self.clean_text(dept)
        for nat_reg, depts in REGIONS_INFO.items():
            if d_clean in depts:
                return nat_reg
        return "COSTA"

    def load_or_build_all(self, force_rebuild: bool = False) -> None:
        """Loads processed data from cache if available; otherwise builds from raw datasets."""
        crops_cache_path = os.path.join(self.cache_dir, "midagri_crops_catalog.json")
        benchmarks_cache_path = os.path.join(self.cache_dir, "midagri_regional_benchmarks.json")
        losses_cache_path = os.path.join(self.cache_dir, "midagri_loss_risk_profiles.json")

        if not force_rebuild and os.path.exists(crops_cache_path) and os.path.exists(benchmarks_cache_path):
            try:
                with open(crops_cache_path, "r", encoding="utf-8") as f:
                    self.crops_catalog = json.load(f)
                with open(benchmarks_cache_path, "r", encoding="utf-8") as f:
                    self.regional_benchmarks = json.load(f)
                if os.path.exists(losses_cache_path):
                    with open(losses_cache_path, "r", encoding="utf-8") as f:
                        self.loss_risk_profiles = json.load(f)
                logger.info("Loaded MIDAGRI datasets from cache successfully.")
                return
            except Exception as e:
                logger.warning(f"Error reading cache, rebuilding from raw files: {e}")

        self.build_from_raw_files()

    def build_from_raw_files(self) -> None:
        """Parses raw SIEA Excel files (2017-2023) and ENA CSV files (2024-2025)."""
        logger.info(f"Processing raw MIDAGRI datasets from {self.data_root}...")
        
        siea_records = self._parse_siea()
        ena_losses, ena_intentions, ena_irrig = self._parse_ena()
        self._consolidate_benchmarks(siea_records, ena_losses, ena_intentions, ena_irrig)
        self._save_cache()
        logger.info("MIDAGRI processing and caching completed successfully.")

    def _parse_siea(self) -> List[Dict[str, Any]]:
        """Extracts tabular records from SIEA Excel files."""
        siea_dir = os.path.join(self.data_root, "siea")
        if not os.path.exists(siea_dir):
            logger.warning(f"SIEA directory {siea_dir} not found. Using default agronomic baselines.")
            return []

        all_records = []
        excel_files = sorted(glob.glob(os.path.join(siea_dir, "datos_agricola_*.*")))
        
        valid_regions = {
            'NACIONAL', 'AMAZONAS', 'ANCASH', 'APURIMAC', 'AREQUIPA', 'AYACUCHO', 'CAJAMARCA', 
            'CALLAO', 'CUSCO', 'HUANCAVELICA', 'HUANUCO', 'ICA', 'JUNIN', 'LA LIBERTAD', 
            'LAMBAYEQUE', 'LIMA', 'LORETO', 'MADRE DE DIOS', 'MOQUEGUA', 'PASCO', 'PIURA', 
            'PUNO', 'SAN MARTIN', 'TACNA', 'TUMBES', 'UCAYALI'
        }

        metrics = [
            ('SIEMBRAS', 'siembras_ha'),
            ('COSECHA', 'cosecha_ha'),
            ('PRODUCCION', 'produccion_t'),
            ('RDTO', 'rendimiento_kgha'),
            ('PRECIO', 'precio_chacra_skg')
        ]

        for fn in excel_files:
            try:
                base_fn = os.path.basename(fn)
                yr_str = "".join([c for c in base_fn if c.isdigit()])
                if not yr_str:
                    continue
                year = int(yr_str)
                xl = pd.ExcelFile(fn)
                sheets_map = {self.clean_text(s): s for s in xl.sheet_names}

                for match_kw, metric_name in metrics:
                    matched = [s for k, s in sheets_map.items() if match_kw in k]
                    if not matched:
                        continue
                    sname = matched[0]
                    df = pd.read_excel(fn, sheet_name=sname, header=None)
                    
                    i = 0
                    while i < len(df):
                        row_vals = [self.clean_text(x) for x in df.iloc[i].dropna().values]
                        if len(row_vals) > 0 and ('REGION' in row_vals[0] or 'REG' in row_vals[0]):
                            header_row = df.iloc[i]
                            col_crops = {}
                            for col_idx, cval in enumerate(header_row):
                                cname = self.clean_text(cval)
                                if cname and 'REGION' not in cname and 'CUADRO' not in cname:
                                    col_crops[col_idx] = cname
                            
                            i += 1
                            while i < len(df):
                                r = df.iloc[i]
                                reg_name = self.clean_text(r.iloc[0]) if len(r) > 0 else ''
                                if not reg_name or 'REGION' in reg_name or 'FUENTE' in reg_name or 'NOTA' in reg_name:
                                    break
                                if reg_name in valid_regions:
                                    for col_idx, crop in col_crops.items():
                                        if col_idx < len(r):
                                            val = r.iloc[col_idx]
                                            try:
                                                val_num = float(val) if not pd.isna(val) else 0.0
                                            except Exception:
                                                val_num = 0.0
                                            all_records.append({
                                                'year': year,
                                                'metric': metric_name,
                                                'region': reg_name,
                                                'crop': crop,
                                                'value': val_num
                                            })
                                i += 1
                        else:
                            i += 1
            except Exception as e:
                logger.warning(f"Error parsing SIEA file {fn}: {e}")

        return all_records

    def _parse_ena(self) -> tuple:
        """Parses ENA loss, intention and irrigation microdata."""
        ena_dir = os.path.join(self.data_root, "ena")
        losses_by_region: Dict[str, Dict[str, Any]] = {}
        intentions_by_region: Dict[str, List[Dict[str, Any]]] = {}
        irrigation_by_region: Dict[str, Dict[str, float]] = {}

        if not os.path.exists(ena_dir):
            logger.warning(f"ENA directory {ena_dir} not found.")
            return losses_by_region, intentions_by_region, irrigation_by_region

        loss_files = glob.glob(os.path.join(ena_dir, "**/04_CAP200B_1.csv"), recursive=True)
        for lf in loss_files:
            try:
                df = pd.read_csv(lf, encoding="latin1", low_memory=False)
                for reg, group in df.groupby("NOMBREDD"):
                    reg_clean = self.clean_text(reg)
                    if not reg_clean:
                        continue
                    if reg_clean not in losses_by_region:
                        losses_by_region[reg_clean] = {
                            "total_incidents": 0,
                            "drought_deficit_count": 0,
                            "excess_water_flood_count": 0,
                            "salinity_soil_count": 0,
                            "pests_count": 0,
                            "frost_hail_count": 0,
                            "total_area_lost_ha": 0.0
                        }
                    
                    losses_by_region[reg_clean]["total_incidents"] += len(group)
                    losses_by_region[reg_clean]["drought_deficit_count"] += int(group["P224E_1"].fillna(0).sum()) if "P224E_1" in group.columns else 0
                    losses_by_region[reg_clean]["excess_water_flood_count"] += int(group["P224E_2"].fillna(0).sum()) if "P224E_2" in group.columns else 0
                    losses_by_region[reg_clean]["salinity_soil_count"] += int(group["P224E_3"].fillna(0).sum()) if "P224E_3" in group.columns else 0
                    losses_by_region[reg_clean]["pests_count"] += int(group["P224E_4"].fillna(0).sum()) if "P224E_4" in group.columns else 0
                    losses_by_region[reg_clean]["frost_hail_count"] += int(group["P224E_5"].fillna(0).sum()) if "P224E_5" in group.columns else 0
                    if "P224D_SUP_1" in group.columns:
                        losses_by_region[reg_clean]["total_area_lost_ha"] += float(group["P224D_SUP_1"].fillna(0).sum())
            except Exception as e:
                logger.warning(f"Error parsing ENA loss file {lf}: {e}")

        is_files = glob.glob(os.path.join(ena_dir, "**/20_CAP1200A_IS.csv"), recursive=True)
        for isf in is_files:
            try:
                df_is = pd.read_csv(isf, encoding="latin1", low_memory=False)
                for reg, group in df_is.groupby("NOMBREDD"):
                    reg_clean = self.clean_text(reg)
                    if not reg_clean:
                        continue
                    if reg_clean not in intentions_by_region:
                        intentions_by_region[reg_clean] = []
                    
                    top_crops = group["P1202_NOM"].value_counts().head(10)
                    for crop_name, count in top_crops.items():
                        c_clean = self.clean_text(crop_name)
                        sub = group[group["P1202_NOM"] == crop_name]
                        area_ha = float(sub["P1203_SUP_1"].fillna(0).sum()) if "P1203_SUP_1" in sub.columns else 0.0
                        intentions_by_region[reg_clean].append({
                            "crop": c_clean,
                            "declaration_count": int(count),
                            "planned_ha": round(area_ha, 2)
                        })
            except Exception as e:
                logger.warning(f"Error parsing ENA intention file {isf}: {e}")

        irrig_files = glob.glob(os.path.join(ena_dir, "**/02_CAP100B_01.csv"), recursive=True)
        for irrf in irrig_files:
            try:
                df_ir = pd.read_csv(irrf, encoding="latin1", low_memory=False)
                for reg, group in df_ir.groupby("NOMBREDD"):
                    reg_clean = self.clean_text(reg)
                    if not reg_clean:
                        continue
                    grav = int(group["P229A_1"].fillna(0).sum()) if "P229A_1" in group.columns else 0
                    asp = int(group["P229A_2"].fillna(0).sum()) if "P229A_2" in group.columns else 0
                    got = int(group["P229A_3"].fillna(0).sum()) if "P229A_3" in group.columns else 0
                    tot = max(1, grav + asp + got)
                    irrigation_by_region[reg_clean] = {
                        "gravity_pct": round((grav / tot) * 100, 1),
                        "sprinkler_pct": round((asp / tot) * 100, 1),
                        "drip_pct": round((got / tot) * 100, 1),
                        "average_efficiency": round((grav*0.55 + asp*0.75 + got*0.88) / tot, 2)
                    }
            except Exception as e:
                logger.warning(f"Error parsing ENA irrigation file {irrf}: {e}")

        return losses_by_region, intentions_by_region, irrigation_by_region

    def _consolidate_benchmarks(self, siea_recs: List[Dict[str, Any]], ena_losses: Dict[str, Any], 
                                ena_intentions: Dict[str, Any], ena_irrig: Dict[str, Any]) -> None:
        """Builds combined crop catalog and regional benchmarks."""
        self.crops_catalog = {k: dict(v) for k, v in DEFAULT_CROPS_PARAMS.items()}

        crop_aliases = {
            "palto": ["PALTO", "PALTA"],
            "mandarina": ["MANDARINA", "TANGELO", "NARANJA", "CITRICOS"],
            "vid": ["VID", "UVA"],
            "esparrago": ["ESPARRAGO"],
            "fresa": ["FRESA"],
            "maiz_amarillo": ["MAIZ A. DURO", "MAIZ AMARILLO DURO", "MAIZ DURO"],
            "cebolla": ["CEBOLLA", "CEBOLLA CABEZA"],
            "algodon": ["ALGODON", "ALGODON RAMA"],
            "papa": ["PAPA", "PAPA BLANCA", "PAPA COLOR"],
            "papa_nativa": ["PAPA NATIVA", "PAPA AMARILLA", "HUAMANTANGA"],
            "maiz_amilaceo": ["MAIZ AMILACEO", "MAIZ CHOCLO", "CHOCLO"],
            "quinua": ["QUINUA"],
            "haba": ["HABA", "HABA GRANO SECO", "HABA VERDE"],
            "cebada": ["CEBADA", "CEBADA GRANO", "CEBADA FORRAJERA"],
            "avena_forrajera": ["AVENA FORRAJERA", "AVENA GRANO"],
            "alcachofa": ["ALCACHOFA"],
            "cafe": ["CAFE", "CAFE PERGAMINO"],
            "cacao": ["CACAO"],
            "palma_aceitera": ["PALMA ACEITERA", "PALMA"],
            "platano": ["PLATANO", "BANANO"],
            "yuca": ["YUCA"]
        }

        df_siea = pd.DataFrame(siea_recs) if siea_recs else pd.DataFrame()
        
        all_regions = [
            'LIMA', 'ICA', 'LA LIBERTAD', 'PIURA', 'LAMBAYEQUE', 'AREQUIPA', 'ANCASH', 'TACNA', 'MOQUEGUA', 'TUMBES',
            'JUNIN', 'CUSCO', 'PUNO', 'AYACUCHO', 'CAJAMARCA', 'HUANUCO', 'APURIMAC', 'HUANCAVELICA', 'PASCO',
            'SAN MARTIN', 'UCAYALI', 'LORETO', 'MADRE DE DIOS', 'AMAZONAS', 'CALLAO', 'NACIONAL'
        ]
        
        self.regional_benchmarks = {}
        for reg in all_regions:
            reg_clean = self.clean_text(reg)
            nat_reg = self.get_natural_region_for_department(reg_clean)
            
            self.regional_benchmarks[reg_clean] = {
                "region": reg_clean,
                "natural_region": nat_reg,
                "crops_stats": {},
                "loss_profile": ena_losses.get(reg_clean, {
                    "total_incidents": 150,
                    "drought_deficit_pct": 35.0,
                    "salinity_soil_pct": 20.0,
                    "excess_water_pct": 10.0,
                    "pests_pct": 35.0,
                    "frost_hail_pct": 15.0,
                    "annual_loss_risk_score": 0.28
                }),
                "irrigation_profile": ena_irrig.get(reg_clean, {
                    "gravity_pct": 65.0,
                    "sprinkler_pct": 15.0,
                    "drip_pct": 20.0,
                    "average_efficiency": 0.65
                }),
                "planting_intentions": ena_intentions.get(reg_clean, [])
            }

            lp = self.regional_benchmarks[reg_clean]["loss_profile"]
            if "total_incidents" in lp and lp["total_incidents"] > 0:
                tot = lp["total_incidents"]
                lp["drought_deficit_pct"] = round((lp.get("drought_deficit_count", 0) / tot) * 100, 1)
                lp["salinity_soil_pct"] = round((lp.get("salinity_soil_count", 0) / tot) * 100, 1)
                lp["excess_water_pct"] = round((lp.get("excess_water_flood_count", 0) / tot) * 100, 1)
                lp["pests_pct"] = round((lp.get("pests_count", 0) / tot) * 100, 1)
                lp["frost_hail_pct"] = round((lp.get("frost_hail_count", 0) / tot) * 100, 1)
                lp["annual_loss_risk_score"] = round((lp.get("drought_deficit_count", 0) + lp.get("salinity_soil_count", 0)) / max(1, tot), 2)

            if not df_siea.empty:
                df_reg = df_siea[df_siea['region'] == reg_clean]
                for cid, aliases in crop_aliases.items():
                    sub = df_reg[df_reg['crop'].isin(aliases)]
                    if not sub.empty:
                        rdto_vals = sub[sub['metric'] == 'rendimiento_kgha']['value'].values
                        rdto_vals = [v for v in rdto_vals if v > 50]
                        mean_rdto = float(np.mean(rdto_vals)) if len(rdto_vals) > 0 else DEFAULT_CROPS_PARAMS.get(cid, {}).get("base_yield_kg_ha", 10000.0)
                        
                        price_vals = sub[sub['metric'] == 'precio_chacra_skg']['value'].values
                        price_vals = [v for v in price_vals if v > 0.1]
                        mean_price = float(np.mean(price_vals)) if len(price_vals) > 0 else DEFAULT_CROPS_PARAMS.get(cid, {}).get("base_price_s_kg", 2.0)

                        area_vals = sub[sub['metric'] == 'cosecha_ha']['value'].values
                        mean_area = float(np.mean(area_vals)) if len(area_vals) > 0 else 0.0

                        self.regional_benchmarks[reg_clean]["crops_stats"][cid] = {
                            "mean_yield_kg_ha": round(mean_rdto, 1),
                            "mean_price_s_kg": round(mean_price, 2),
                            "avg_harvested_ha": round(mean_area, 1)
                        }

    def _save_cache(self) -> None:
        """Serializes catalog and regional benchmarks to JSON."""
        crops_cache_path = os.path.join(self.cache_dir, "midagri_crops_catalog.json")
        benchmarks_cache_path = os.path.join(self.cache_dir, "midagri_regional_benchmarks.json")
        losses_cache_path = os.path.join(self.cache_dir, "midagri_loss_risk_profiles.json")

        with open(crops_cache_path, "w", encoding="utf-8") as f:
            json.dump(self.crops_catalog, f, indent=2, ensure_ascii=False)
        with open(benchmarks_cache_path, "w", encoding="utf-8") as f:
            json.dump(self.regional_benchmarks, f, indent=2, ensure_ascii=False)
        with open(losses_cache_path, "w", encoding="utf-8") as f:
            json.dump({k: v.get("loss_profile", {}) for k, v in self.regional_benchmarks.items()}, f, indent=2, ensure_ascii=False)

    def get_crop(self, crop_id: str) -> Optional[Dict[str, Any]]:
        """Returns metadata and agronomic parameters for a given crop."""
        return self.crops_catalog.get(crop_id)

    def list_crops(self, natural_region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns the list of available crops, optionally filtered by natural region."""
        crops = list(self.crops_catalog.values())
        if natural_region and natural_region.upper() != "TODAS":
            return [c for c in crops if c.get("region_natural", "").lower() == natural_region.lower()]
        return crops

    def get_regional_benchmark(self, region: str = "LIMA") -> Dict[str, Any]:
        """Returns historical benchmark statistics for a region."""
        reg_clean = self.clean_text(region)
        return self.regional_benchmarks.get(reg_clean, self.regional_benchmarks.get("LIMA", {}))


midagri_processor = MIDAGRIProcessor()
