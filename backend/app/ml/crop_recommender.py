"""
Sentinel-H2O: Multi-Criteria Crop Suitability & AI Recommender Engine
Combines FAO-56 / Maas-Hoffman biophysical salinity, pH nutrient lock-out,
turbidity clogging, and thermal stress models with scikit-learn ML and MIDAGRI calibration.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from sklearn.ensemble import RandomForestRegressor

from backend.app.ml.midagri_processor import midagri_processor

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

            for ec in np.linspace(300, 5500, 15):
                for ph in np.linspace(4.5, 9.0, 8):
                    for water_ratio in np.linspace(0.4, 1.1, 8):
                        ec_ds = ec / 1000.0
                        th_ds = ec_th / 1000.0
                        k_sal = 1.0 if ec_ds <= th_ds else max(0.0, 1.0 - (slope * (ec_ds - th_ds)) / 100.0)

                        ph_min = c.get("ph_min", 6.0)
                        ph_max = c.get("ph_max", 7.5)
                        if ph_min <= ph <= ph_max:
                            k_ph = 1.0
                        else:
                            dist = min(abs(ph - ph_min), abs(ph - ph_max))
                            k_ph = max(0.3, 1.0 - (dist * 0.30))

                        k_water = min(1.0, water_ratio)
                        suitability = 100.0 * (0.40 * k_sal + 0.35 * k_water + 0.25 * k_ph)
                        
                        X_train.append([ec, ph, water_ratio, ec_th, slope, demand])
                        y_train.append(suitability)

        X_train = np.array(X_train)
        y_train = np.array(y_train)

        self.ml_model = RandomForestRegressor(n_estimators=35, max_depth=8, random_state=42)
        self.ml_model.fit(X_train, y_train)
        logger.info(f"CropSuitabilityEngine ML model trained on {len(X_train)} calibrated multi-regional samples.")

    def evaluate_crop(
        self,
        crop_id: str,
        ec_us_cm: float,
        ph: float = 7.2,
        turbidity_ntu: float = 20.0,
        temp_water_c: float = 18.5,
        water_availability_ratio: float = 1.0,
        region: str = "LIMA"
    ) -> Dict[str, Any]:
        """
        Evaluates a single crop's agronomic suitability under specified water quality & flow conditions.
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
            salinity_diag = f"Salinidad óptima ({ec_us_cm:.0f} µS/cm <= {ec_th:.0f} µS/cm). Sin merma osmótica."
        else:
            salinity_penalty_pct = min(100.0, slope * (ec_ds - th_ds))
            k_sal = max(0.0, 1.0 - (salinity_penalty_pct / 100.0))
            salinity_diag = f"Estrés salino activo (+{(ec_ds - th_ds):.2f} dS/m sobre umbral). Merma por sales: -{salinity_penalty_pct:.1f}%."

        # 2. pH Nutrient Lock-out Factor (Truog / FAO)
        ph_min = crop.get("ph_min", 5.5)
        ph_max = crop.get("ph_max", 7.5)
        if ph_min <= ph <= ph_max:
            k_ph = 1.0
            ph_diag = f"pH en rango agronómico ideal ({ph:.2f} dentro de [{ph_min:.1f} - {ph_max:.1f}])."
        elif ph < ph_min:
            dist = ph_min - ph
            k_ph = max(0.25, 1.0 - (dist * 0.32))
            ph_diag = f"Agua ácida (pH {ph:.2f} < {ph_min:.1f}). Bloqueo de Fósforo (P), Calcio (Ca) y riesgo de toxicidad por Aluminio."
        else:
            dist = ph - ph_max
            k_ph = max(0.30, 1.0 - (dist * 0.28))
            ph_diag = f"Agua alcalina (pH {ph:.2f} > {ph_max:.1f}). Bloqueo de micronutrientes (Hierro, Zinc, Manganeso). Riesgo de clorosis."

        # 3. Turbidity & Sediments Factor
        turb_max = crop.get("turbidity_max_ntu", 60.0)
        if turbidity_ntu <= turb_max:
            k_turb = 1.0
            turb_diag = f"Turbidez admisible ({turbidity_ntu:.1f} NTU <= {turb_max:.0f} NTU). Mínimo riesgo de colmatación."
            extra_filtration_cost_s_ha = 0.0
        else:
            excess_ratio = (turbidity_ntu - turb_max) / max(1.0, turb_max)
            k_turb = max(0.40, 1.0 - (excess_ratio * 0.22))
            extra_filtration_cost_s_ha = round(min(650.0, excess_ratio * 120.0), 2)
            turb_diag = f"Exceso de sedimentos ({turbidity_ntu:.1f} NTU). Riesgo de obturación de goteros/aspersores (+S/. {extra_filtration_cost_s_ha}/ha en filtrado)."

        # 4. Water Temperature Factor
        t_min = crop.get("temp_water_min_c", 12.0)
        t_max = crop.get("temp_water_max_c", 26.0)
        if t_min <= temp_water_c <= t_max:
            k_temp = 1.0
            temp_diag = f"Temperatura de agua adecuada ({temp_water_c:.1f} °C en rango [{t_min:.0f} - {t_max:.0f} °C])."
        elif temp_water_c > t_max:
            dist = temp_water_c - t_max
            k_temp = max(0.35, 1.0 - (dist * 0.09))
            temp_diag = f"Agua caliente ({temp_water_c:.1f} °C > {t_max:.0f} °C). Caída de oxígeno disuelto en raíz y riesgo de pudrición radicular (Phytophthora)."
        else:
            dist = t_min - temp_water_c
            k_temp = max(0.35, 1.0 - (dist * 0.12))
            temp_diag = f"Agua fría ({temp_water_c:.1f} °C < {t_min:.0f} °C). Retardo en elongación radicular y asimilación hídrica."

        # 5. Water Availability Factor
        k_water = min(1.0, max(0.0, water_availability_ratio))

        # 6. Combined Biophysical Score (0-100)
        biophysical_score = 100.0 * (
            0.30 * k_sal +
            0.25 * k_water +
            0.20 * k_ph +
            0.15 * k_turb +
            0.10 * k_temp
        )

        # 7. ML Model Refinement
        ml_input = np.array([[ec_us_cm, ph, water_availability_ratio, ec_th, slope, crop["water_demand_m3_ha"]]])
        ml_score = float(self.ml_model.predict(ml_input)[0]) if self.ml_model else biophysical_score

        final_score = round(float(0.70 * biophysical_score + 0.30 * ml_score), 1)
        final_score = max(0.0, min(100.0, final_score))

        # Overall Stress & Yield Retention
        total_stress_factor = round(float(k_sal * k_water * k_ph * ((k_turb + k_temp) / 2.0)), 3)
        expected_yield_kg_ha = round(float(crop["base_yield_kg_ha"] * total_stress_factor), 1)

        # Status & Color
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
            recommendation_msg = "Pérdida moderada de rendimiento por estrés hídrico/químico. Requiere acondicionamiento o ajuste de lámina."
        else:
            status = "Crítico / No Recomendado"
            status_color = "red"
            recommendation_msg = "Alto riesgo de aborto floral, quemadura foliar o pérdida severa. Se aconseja pivotar a cultivos tolerantes."

        # Regional benchmark comparison
        reg_bench = self.processor.get_regional_benchmark(region)
        crops_stats = reg_bench.get("crops_stats", {}).get(crop_id, {})
        regional_mean_yield = float(crops_stats.get("mean_yield_kg_ha", crop["base_yield_kg_ha"]))
        regional_mean_price = float(crops_stats.get("mean_price_s_kg", crop["base_price_s_kg"]))

        return {
            "crop_id": crop_id,
            "crop_name": crop["name"],
            "region_natural": crop.get("region_natural", "Costa"),
            "category": crop["category"],
            "suitability_score": final_score,
            "status": status,
            "status_color": status_color,
            "resilience_level": crop["resilience_level"],
            "stress_factor_ks": total_stress_factor,
            "salinity_retention_pct": round(float(k_sal * 100.0), 1),
            "ph_factor_pct": round(float(k_ph * 100.0), 1),
            "turbidity_factor_pct": round(float(k_turb * 100.0), 1),
            "temperature_factor_pct": round(float(k_temp * 100.0), 1),
            "water_availability_pct": round(float(k_water * 100.0), 1),
            "expected_yield_kg_ha": expected_yield_kg_ha,
            "base_yield_kg_ha": float(crop["base_yield_kg_ha"]),
            "regional_mean_yield_kg_ha": regional_mean_yield,
            "farmgate_price_s_kg": regional_mean_price,
            "water_demand_m3_ha": float(crop["water_demand_m3_ha"]),
            "ec_threshold_us_cm": float(crop["ec_threshold_us_cm"]),
            "extra_filtration_cost_s_ha": extra_filtration_cost_s_ha,
            "diagnostics": {
                "salinity": salinity_diag,
                "ph": ph_diag,
                "turbidity": turb_diag,
                "temperature": temp_diag
            },
            "recommendation": recommendation_msg
        }

    def evaluate_all_crops(
        self,
        ec_us_cm: float,
        ph: float = 7.2,
        turbidity_ntu: float = 20.0,
        temp_water_c: float = 18.5,
        water_availability_ratio: float = 1.0,
        region: str = "LIMA",
        natural_region: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Evaluates and ranks crops in the catalog from most to least suitable."""
        crops_list = self.processor.list_crops(natural_region=natural_region)
        results = []
        for crop in crops_list:
            eval_res = self.evaluate_crop(
                crop_id=crop["crop_id"],
                ec_us_cm=ec_us_cm,
                ph=ph,
                turbidity_ntu=turbidity_ntu,
                temp_water_c=temp_water_c,
                water_availability_ratio=water_availability_ratio,
                region=region
            )
            results.append(eval_res)

        results.sort(key=lambda x: x["suitability_score"], reverse=True)
        return results

    def recommend_resilient_substitutes(
        self,
        stressed_crop_id: str,
        ec_us_cm: float,
        ph: float = 7.2,
        turbidity_ntu: float = 20.0,
        temp_water_c: float = 18.5,
        water_availability_ratio: float = 1.0,
        region: str = "LIMA",
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """Finds the best resilient replacement crops that maintain > 75% suitability under current stress."""
        orig_crop = self.processor.get_crop(stressed_crop_id)
        nat_reg = orig_crop.get("region_natural") if orig_crop else None

        all_evaluated = self.evaluate_all_crops(
            ec_us_cm=ec_us_cm,
            ph=ph,
            turbidity_ntu=turbidity_ntu,
            temp_water_c=temp_water_c,
            water_availability_ratio=water_availability_ratio,
            region=region,
            natural_region=None
        )

        orig_demand = orig_crop["water_demand_m3_ha"] if orig_crop else 10000.0

        substitutes = []
        for eval_c in all_evaluated:
            if eval_c["crop_id"] != stressed_crop_id and eval_c["suitability_score"] >= 75.0:
                water_saving_m3_ha = max(0.0, orig_demand - eval_c["water_demand_m3_ha"])
                expected_gross_income_ha = round(float(eval_c["expected_yield_kg_ha"] * eval_c["farmgate_price_s_kg"]), 2)
                substitutes.append({
                    "crop_id": eval_c["crop_id"],
                    "crop_name": eval_c["crop_name"],
                    "region_natural": eval_c.get("region_natural", "Costa"),
                    "category": eval_c["category"],
                    "suitability_score": eval_c["suitability_score"],
                    "status": eval_c["status"],
                    "resilience_level": eval_c["resilience_level"],
                    "water_demand_m3_ha": eval_c["water_demand_m3_ha"],
                    "water_saving_m3_ha": round(float(water_saving_m3_ha), 1),
                    "expected_yield_kg_ha": eval_c["expected_yield_kg_ha"],
                    "farmgate_price_s_kg": eval_c["farmgate_price_s_kg"],
                    "expected_gross_income_s_ha": expected_gross_income_ha,
                    "rationale": f"Tolerancia a CE de {eval_c['ec_threshold_us_cm']:.0f} uS/cm con ahorro hídrico de {water_saving_m3_ha:.0f} m3/ha."
                })

        return substitutes[:top_k]


crop_suitability_engine = CropSuitabilityEngine()
