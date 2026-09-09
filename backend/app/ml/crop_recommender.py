"""
Sentinel-H2O: Multi-Criteria Crop Suitability & AI Recommender Engine
Combines FAO-56 / Maas-Hoffman biophysical salinity & water balance models
with scikit-learn ML models and MIDAGRI historical calibration.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from sklearn.ensemble import RandomForestRegressor

from backend.app.ml.midagri_processor import midagri_processor, DEFAULT_CROPS_PARAMS

logger = logging.getLogger("sentinel.ml.crop_recommender")
logger.setLevel(logging.INFO)


class CropSuitabilityEngine:
    """Evaluates crop suitability and recommends resilient target crops under water quality & availability stress."""

    def __init__(self):
        self.processor = midagri_processor
        self.ml_model: Optional[RandomForestRegressor] = None
        self._train_baseline_ml_model()

    def _train_baseline_ml_model(self) -> None:
        """Trains a lightweight RandomForest regressor on synthetic-calibrated agronomic grid."""
        np.random.seed(42)
        X_train = []
        y_train = []

        crops = self.processor.list_crops()
        for c in crops:
            ec_th = c["ec_threshold_us_cm"]
            slope = c["salinity_slope_pct"]
            demand = c["water_demand_m3_ha"]

            # Generate parameter variations
            for ec in np.linspace(400, 5000, 20):
                for wqi in np.linspace(30, 95, 10):
                    for water_ratio in np.linspace(0.4, 1.2, 10):
                        # Maas Hoffman calculation
                        ec_ds = ec / 1000.0
                        th_ds = ec_th / 1000.0
                        if ec_ds <= th_ds:
                            k_sal = 1.0
                        else:
                            k_sal = max(0.0, 1.0 - (slope * (ec_ds - th_ds)) / 100.0)

                        k_wqi = min(1.0, max(0.2, wqi / c["wqi_min"]))
                        k_water = min(1.0, water_ratio)

                        suitability = 100.0 * (0.40 * k_sal + 0.35 * k_water + 0.25 * k_wqi)
                        
                        # Features: [ec, wqi, water_ratio, ec_threshold, slope, demand]
                        X_train.append([ec, wqi, water_ratio, ec_th, slope, demand])
                        y_train.append(suitability)

        X_train = np.array(X_train)
        y_train = np.array(y_train)

        self.ml_model = RandomForestRegressor(n_estimators=30, max_depth=8, random_state=42)
        self.ml_model.fit(X_train, y_train)
        logger.info(f"CropSuitabilityEngine ML model trained on {len(X_train)} calibrated samples.")

    def evaluate_crop(
        self,
        crop_id: str,
        ec_us_cm: float,
        ph: float = 7.2,
        wqi: float = 75.0,
        water_availability_ratio: float = 1.0,
        region: str = "LIMA"
    ) -> Dict[str, Any]:
        """
        Evaluates a single crop's agronomic suitability under specified water conditions.
        
        Args:
            crop_id: Identifier of crop (e.g., 'palto', 'mandarina', 'vid')
            ec_us_cm: Electrical conductivity of irrigation water in uS/cm
            ph: pH of water
            wqi: Water Quality Index (0-100)
            water_availability_ratio: Available volume / Required volume (1.0 = 100% full supply)
            region: Peruvian department/region for benchmark data
        """
        crop = self.processor.get_crop(crop_id)
        if not crop:
            raise ValueError(f"Crop '{crop_id}' not found in catalog.")

        ec_th = crop["ec_threshold_us_cm"]
        slope = crop["salinity_slope_pct"]
        ec_ds = ec_us_cm / 1000.0
        th_ds = ec_th / 1000.0

        # 1. Salinity Factor (Maas-Hoffman)
        if ec_ds <= th_ds:
            k_sal = 1.0
            salinity_penalty_pct = 0.0
        else:
            salinity_penalty_pct = min(100.0, slope * (ec_ds - th_ds))
            k_sal = max(0.0, 1.0 - (salinity_penalty_pct / 100.0))

        # 2. Water Quality Index Factor
        wqi_min = crop.get("wqi_min", 60.0)
        if wqi >= wqi_min:
            k_wqi = 1.0
        else:
            k_wqi = max(0.2, wqi / max(1.0, wqi_min))

        # 3. pH Factor
        ph_min = crop.get("ph_min", 6.0)
        ph_max = crop.get("ph_max", 7.5)
        if ph_min <= ph <= ph_max:
            k_ph = 1.0
        else:
            dist = min(abs(ph - ph_min), abs(ph - ph_max))
            k_ph = max(0.3, 1.0 - (dist * 0.35))

        # 4. Water Availability Factor
        k_water = min(1.0, max(0.0, water_availability_ratio))

        # 5. Combined Biophysical Score (0-100)
        biophysical_score = 100.0 * (
            0.40 * k_sal +
            0.30 * k_water +
            0.15 * k_wqi +
            0.15 * k_ph
        )

        # 6. ML Model Refinement
        ml_input = np.array([[ec_us_cm, wqi, water_availability_ratio, ec_th, slope, crop["water_demand_m3_ha"]]])
        ml_score = float(self.ml_model.predict(ml_input)[0]) if self.ml_model else biophysical_score

        # Blended final score (70% biophysical FAO-56 + 30% ML)
        final_score = round(0.70 * biophysical_score + 0.30 * ml_score, 1)
        final_score = max(0.0, min(100.0, final_score))

        # Overall Stress & Yield Retention
        total_stress_factor = round(k_sal * k_water * ((k_wqi + k_ph) / 2.0), 3)
        expected_yield_kg_ha = round(crop["base_yield_kg_ha"] * total_stress_factor, 1)

        # Determine Suitability Status
        if final_score >= 82.0:
            status = "Óptimo"
            status_color = "green"
            recommendation_msg = "Condiciones plenamente favorables para producción de alta calidad y rendimiento óptimo."
        elif final_score >= 65.0:
            status = "Aceptable"
            status_color = "blue"
            recommendation_msg = "Viable agronómicamente. Se recomienda monitorear lavado de sales y uniformidad de riego."
        elif final_score >= 45.0:
            status = "En Riesgo / Estrés Moderado"
            status_color = "yellow"
            recommendation_msg = "Pérdida moderada de rendimiento por salinidad/déficit. Requiere tecnificación o ajuste de lámina de riego."
        else:
            status = "Crítico / No Recomendado"
            status_color = "red"
            recommendation_msg = "Alto riesgo de quema foliar, aborto floral o pérdida severa. Se aconseja pivotar a cultivos tolerantes."

        # Regional benchmark comparison
        reg_bench = self.processor.get_regional_benchmark(region)
        crops_stats = reg_bench.get("crops_stats", {}).get(crop_id, {})
        regional_mean_yield = crops_stats.get("mean_yield_kg_ha", crop["base_yield_kg_ha"])
        regional_mean_price = crops_stats.get("mean_price_s_kg", crop["base_price_s_kg"])

        return {
            "crop_id": crop_id,
            "crop_name": crop["name"],
            "category": crop["category"],
            "suitability_score": final_score,
            "status": status,
            "status_color": status_color,
            "resilience_level": crop["resilience_level"],
            "stress_factor_ks": total_stress_factor,
            "salinity_retention_pct": round(k_sal * 100.0, 1),
            "water_availability_pct": round(k_water * 100.0, 1),
            "wqi_factor_pct": round(k_wqi * 100.0, 1),
            "ph_factor_pct": round(k_ph * 100.0, 1),
            "expected_yield_kg_ha": expected_yield_kg_ha,
            "base_yield_kg_ha": crop["base_yield_kg_ha"],
            "regional_mean_yield_kg_ha": regional_mean_yield,
            "farmgate_price_s_kg": regional_mean_price,
            "water_demand_m3_ha": crop["water_demand_m3_ha"],
            "ec_threshold_us_cm": crop["ec_threshold_us_cm"],
            "recommendation": recommendation_msg
        }

    def evaluate_all_crops(
        self,
        ec_us_cm: float,
        ph: float = 7.2,
        wqi: float = 75.0,
        water_availability_ratio: float = 1.0,
        region: str = "LIMA"
    ) -> List[Dict[str, Any]]:
        """Evaluates and ranks all crops in the catalog from most to least suitable."""
        results = []
        for crop in self.processor.list_crops():
            eval_res = self.evaluate_crop(
                crop_id=crop["crop_id"],
                ec_us_cm=ec_us_cm,
                ph=ph,
                wqi=wqi,
                water_availability_ratio=water_availability_ratio,
                region=region
            )
            results.append(eval_res)

        # Sort descending by suitability score
        results.sort(key=lambda x: x["suitability_score"], reverse=True)
        return results

    def recommend_resilient_substitutes(
        self,
        stressed_crop_id: str,
        ec_us_cm: float,
        ph: float = 7.2,
        wqi: float = 75.0,
        water_availability_ratio: float = 1.0,
        region: str = "LIMA",
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """Finds the best resilient replacement crops that maintain > 80% suitability under current stress."""
        all_evaluated = self.evaluate_all_crops(
            ec_us_cm=ec_us_cm,
            ph=ph,
            wqi=wqi,
            water_availability_ratio=water_availability_ratio,
            region=region
        )

        orig_crop = self.processor.get_crop(stressed_crop_id)
        orig_demand = orig_crop["water_demand_m3_ha"] if orig_crop else 10000.0

        substitutes = []
        for eval_c in all_evaluated:
            if eval_c["crop_id"] != stressed_crop_id and eval_c["suitability_score"] >= 75.0:
                water_saving_m3_ha = max(0.0, orig_demand - eval_c["water_demand_m3_ha"])
                expected_gross_income_ha = round(eval_c["expected_yield_kg_ha"] * eval_c["farmgate_price_s_kg"], 2)
                substitutes.append({
                    "crop_id": eval_c["crop_id"],
                    "crop_name": eval_c["crop_name"],
                    "category": eval_c["category"],
                    "suitability_score": eval_c["suitability_score"],
                    "status": eval_c["status"],
                    "resilience_level": eval_c["resilience_level"],
                    "water_demand_m3_ha": eval_c["water_demand_m3_ha"],
                    "water_saving_m3_ha": round(water_saving_m3_ha, 1),
                    "expected_yield_kg_ha": eval_c["expected_yield_kg_ha"],
                    "farmgate_price_s_kg": eval_c["farmgate_price_s_kg"],
                    "expected_gross_income_s_ha": expected_gross_income_ha,
                    "rationale": f"Tolerancia a CE de {eval_c['ec_threshold_us_cm']:.0f} uS/cm con ahorro hídrico de {water_saving_m3_ha:.0f} m3/ha."
                })

        return substitutes[:top_k]


crop_suitability_engine = CropSuitabilityEngine()
