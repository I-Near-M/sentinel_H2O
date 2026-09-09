"""
Sentinel-H2O: Agro-Economic Risk & Loss Model
Calculates gross margins, financial loss under water/salinity stress,
and water balance feasibility based on MIDAGRI SIEA/ENA microdata.
"""

import logging
from typing import Dict, List, Any, Optional
import numpy as np

from backend.app.ml.midagri_processor import midagri_processor
from backend.app.ml.crop_recommender import crop_suitability_engine

logger = logging.getLogger("sentinel.ml.agro_risk_model")
logger.setLevel(logging.INFO)


class AgroLossRiskModel:
    """Calculates economic loss, gross margin, and crop cédula water balance."""

    def __init__(self):
        self.processor = midagri_processor
        self.suitability_engine = crop_suitability_engine

    def simulate_agro_scenario(
        self,
        crop_distribution_ha: Dict[str, float],
        available_flow_m3s: float,
        ec_us_cm: float,
        ph: float = 7.2,
        wqi: float = 75.0,
        irrigation_type: str = "gravity",
        water_tariff_s_m3: float = 0.045,
        region: str = "LIMA",
        simulated_duration_days: int = 365
    ) -> Dict[str, Any]:
        """
        Executes a comprehensive Agro-Hydrological & Economic scenario simulation.
        
        Args:
            crop_distribution_ha: Dict of crop_id -> planned hectares (e.g. {'palto': 150, 'mandarina': 80})
            available_flow_m3s: Available river/canal flow rate in m3/s for agriculture
            ec_us_cm: Electrical conductivity in uS/cm
            ph: Water pH
            wqi: Water quality index
            irrigation_type: 'gravity' (0.55 eff), 'sprinkler' (0.75 eff), 'drip' (0.88 eff)
            water_tariff_s_m3: Water fee per m3 (S/.)
            region: Region for benchmarking
            simulated_duration_days: Horizon period in days (e.g., 365 for annual campaign)
        """
        # 1. Irrigation Efficiency
        eff_map = {
            "gravity": 0.55,
            "sprinkler": 0.75,
            "drip": 0.88
        }
        eff = eff_map.get(irrigation_type.lower(), 0.65)

        # 2. Total Water Availability in Volume (MMC = Million m3)
        total_available_m3 = available_flow_m3s * 86400.0 * simulated_duration_days
        total_available_mmc = round(total_available_m3 / 1_000_000.0, 3)

        # 3. Calculate Total Net & Gross Crop Water Demand
        total_net_demand_m3 = 0.0
        crop_evaluations = []
        total_planned_ha = 0.0

        for crop_id, ha in crop_distribution_ha.items():
            if ha <= 0:
                continue
            crop = self.processor.get_crop(crop_id)
            if not crop:
                continue
            
            total_planned_ha += ha
            net_crop_demand_m3 = ha * crop["water_demand_m3_ha"] * (simulated_duration_days / 365.0)
            total_net_demand_m3 += net_crop_demand_m3

        total_gross_demand_m3 = total_net_demand_m3 / eff if eff > 0 else total_net_demand_m3
        total_gross_demand_mmc = round(total_gross_demand_m3 / 1_000_000.0, 3)

        # 4. Water Availability Ratio (Supply / Demand)
        if total_gross_demand_m3 > 0:
            water_ratio = min(1.0, total_available_m3 / total_gross_demand_m3)
        else:
            water_ratio = 1.0

        water_deficit_m3 = max(0.0, total_gross_demand_m3 - total_available_m3)
        water_deficit_mmc = round(water_deficit_m3 / 1_000_000.0, 3)
        water_coverage_pct = round((min(total_available_m3, total_gross_demand_m3) / max(1.0, total_gross_demand_m3)) * 100.0, 1)

        # 5. Financial & Yield Impact Per Crop
        total_potential_revenue_s = 0.0
        total_stressed_revenue_s = 0.0
        total_economic_loss_s = 0.0
        total_water_cost_s = 0.0
        at_risk_crops_count = 0

        crops_summary = []
        for crop_id, ha in crop_distribution_ha.items():
            if ha <= 0:
                continue
            eval_res = self.suitability_engine.evaluate_crop(
                crop_id=crop_id,
                ec_us_cm=ec_us_cm,
                ph=ph,
                wqi=wqi,
                water_availability_ratio=water_ratio,
                region=region
            )

            crop_net_demand_m3 = ha * eval_res["water_demand_m3_ha"] * (simulated_duration_days / 365.0)
            crop_gross_demand_m3 = crop_net_demand_m3 / eff
            crop_water_cost_s = crop_gross_demand_m3 * water_tariff_s_m3
            total_water_cost_s += crop_water_cost_s

            base_yield_kg = ha * eval_res["base_yield_kg_ha"]
            pot_revenue = base_yield_kg * eval_res["farmgate_price_s_kg"]

            stressed_yield_kg = ha * eval_res["expected_yield_kg_ha"]
            stressed_revenue = stressed_yield_kg * eval_res["farmgate_price_s_kg"]

            loss_s = max(0.0, pot_revenue - stressed_revenue)
            loss_pct = round((loss_s / max(1.0, pot_revenue)) * 100.0, 1)

            total_potential_revenue_s += pot_revenue
            total_stressed_revenue_s += stressed_revenue
            total_economic_loss_s += loss_s

            if eval_res["suitability_score"] < 65.0:
                at_risk_crops_count += 1

            # Get resilient alternatives if stressed
            substitutes = []
            if eval_res["suitability_score"] < 70.0:
                substitutes = self.suitability_engine.recommend_resilient_substitutes(
                    stressed_crop_id=crop_id,
                    ec_us_cm=ec_us_cm,
                    ph=ph,
                    wqi=wqi,
                    water_availability_ratio=water_ratio,
                    region=region,
                    top_k=2
                )

            crops_summary.append({
                "crop_id": crop_id,
                "crop_name": eval_res["crop_name"],
                "category": eval_res["category"],
                "planned_ha": ha,
                "suitability_score": eval_res["suitability_score"],
                "status": eval_res["status"],
                "status_color": eval_res["status_color"],
                "water_demand_mmc": round(crop_gross_demand_m3 / 1_000_000.0, 4),
                "potential_revenue_s": round(pot_revenue, 2),
                "stressed_revenue_s": round(stressed_revenue, 2),
                "economic_loss_s": round(loss_s, 2),
                "loss_pct": loss_pct,
                "water_cost_s": round(crop_water_cost_s, 2),
                "net_margin_s": round(stressed_revenue - crop_water_cost_s, 2),
                "substitutes": substitutes
            })

        # 6. Loss Cause Attribution (% due to salinity vs % due to drought deficit)
        avg_sal_retention = np.mean([c["salinity_retention_pct"] for c in [self.suitability_engine.evaluate_crop(cid, ec_us_cm, ph, wqi, water_ratio, region) for cid in crop_distribution_ha.keys()]]) if crop_distribution_ha else 100.0
        salinity_impact_weight = max(0.0, 100.0 - avg_sal_retention)
        drought_impact_weight = max(0.0, 100.0 - (water_ratio * 100.0))
        tot_impact = salinity_impact_weight + drought_impact_weight
        
        if tot_impact > 0:
            salinity_share_pct = round((salinity_impact_weight / tot_impact) * 100.0, 1)
            drought_share_pct = round((drought_impact_weight / tot_impact) * 100.0, 1)
        else:
            salinity_share_pct = 0.0
            drought_share_pct = 0.0

        # Overall Economic Summary
        net_agricultural_margin_s = round(total_stressed_revenue_s - total_water_cost_s, 2)
        total_loss_pct = round((total_economic_loss_s / max(1.0, total_potential_revenue_s)) * 100.0, 1)

        # Efficiency Upgrade Recommendation
        drip_demand_mmc = round((total_net_demand_m3 / 0.88) / 1_000_000.0, 3)
        water_saved_by_drip_mmc = round(max(0.0, total_gross_demand_mmc - drip_demand_mmc), 3)

        return {
            "region": region,
            "simulated_duration_days": simulated_duration_days,
            "irrigation_type": irrigation_type,
            "irrigation_efficiency": eff,
            "total_planned_ha": round(total_planned_ha, 1),
            "available_flow_m3s": round(available_flow_m3s, 2),
            "water_availability_mmc": total_available_mmc,
            "gross_water_demand_mmc": total_gross_demand_mmc,
            "net_water_demand_mmc": round(total_net_demand_m3 / 1_000_000.0, 3),
            "water_deficit_mmc": water_deficit_mmc,
            "water_coverage_pct": water_coverage_pct,
            "water_balance_status": "Superávit Hídrico" if water_deficit_mmc == 0 else "Déficit / Estrés Hídrico",
            "water_balance_color": "green" if water_deficit_mmc == 0 else "red",
            "total_potential_revenue_s": round(total_potential_revenue_s, 2),
            "total_stressed_revenue_s": round(total_stressed_revenue_s, 2),
            "total_economic_loss_s": round(total_economic_loss_s, 2),
            "total_loss_pct": total_loss_pct,
            "total_water_cost_s": round(total_water_cost_s, 2),
            "net_agricultural_margin_s": net_agricultural_margin_s,
            "at_risk_crops_count": at_risk_crops_count,
            "loss_attribution": {
                "salinity_share_pct": salinity_share_pct,
                "drought_deficit_share_pct": drought_share_pct,
                "ec_measured_us_cm": ec_us_cm
            },
            "tech_upgrade_potential": {
                "drip_demand_mmc": drip_demand_mmc,
                "water_saved_mmc": water_saved_by_drip_mmc,
                "feasibility_boost_pct": round(min(100.0, (total_available_mmc / max(0.001, drip_demand_mmc)) * 100.0), 1)
            },
            "crops_summary": crops_summary
        }


agro_risk_model = AgroLossRiskModel()
