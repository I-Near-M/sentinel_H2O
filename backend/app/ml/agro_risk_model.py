"""
Sentinel-H2O: Agro-Economic Risk, Planting Intentions Feasibility & Cédula Optimizer
Calculates gross margins, financial loss under water/salinity/pH stress,
ENA planting intention feasibility, and optimal crop reallocation.
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
        turbidity_ntu: float = 20.0,
        temp_water_c: float = 18.5,
        wqi: float = 75.0,
        irrigation_type: str = "gravity",
        water_tariff_s_m3: float = 0.045,
        region: str = "LIMA",
        simulated_duration_days: int = 365
    ) -> Dict[str, Any]:
        """
        Executes a comprehensive Agro-Hydrological & Economic scenario simulation.
        """
        eff_map = {
            "gravity": 0.55,
            "sprinkler": 0.75,
            "drip": 0.88
        }
        eff = eff_map.get(irrigation_type.lower(), 0.65)

        total_available_m3 = available_flow_m3s * 86400.0 * simulated_duration_days
        total_available_mmc = round(float(total_available_m3 / 1_000_000.0), 3)

        total_net_demand_m3 = 0.0
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
        total_gross_demand_mmc = round(float(total_gross_demand_m3 / 1_000_000.0), 3)

        if total_gross_demand_m3 > 0:
            water_ratio = min(1.0, total_available_m3 / total_gross_demand_m3)
        else:
            water_ratio = 1.0

        water_deficit_m3 = max(0.0, total_gross_demand_m3 - total_available_m3)
        water_deficit_mmc = round(float(water_deficit_m3 / 1_000_000.0), 3)
        water_coverage_pct = round(float((min(total_available_m3, total_gross_demand_m3) / max(1.0, total_gross_demand_m3)) * 100.0), 1)

        total_potential_revenue_s = 0.0
        total_stressed_revenue_s = 0.0
        total_economic_loss_s = 0.0
        total_water_cost_s = 0.0
        total_extra_filtration_cost_s = 0.0
        at_risk_crops_count = 0

        crops_summary = []
        for crop_id, ha in crop_distribution_ha.items():
            if ha <= 0:
                continue
            eval_res = self.suitability_engine.evaluate_crop(
                crop_id=crop_id,
                ec_us_cm=ec_us_cm,
                ph=ph,
                turbidity_ntu=turbidity_ntu,
                temp_water_c=temp_water_c,
                water_availability_ratio=water_ratio,
                region=region
            )

            crop_net_demand_m3 = ha * eval_res["water_demand_m3_ha"] * (simulated_duration_days / 365.0)
            crop_gross_demand_m3 = crop_net_demand_m3 / eff
            crop_water_cost_s = crop_gross_demand_m3 * water_tariff_s_m3
            total_water_cost_s += crop_water_cost_s

            crop_filtration_cost = ha * eval_res.get("extra_filtration_cost_s_ha", 0.0)
            total_extra_filtration_cost_s += crop_filtration_cost

            base_yield_kg = ha * eval_res["base_yield_kg_ha"]
            pot_revenue = base_yield_kg * eval_res["farmgate_price_s_kg"]

            stressed_yield_kg = ha * eval_res["expected_yield_kg_ha"]
            stressed_revenue = stressed_yield_kg * eval_res["farmgate_price_s_kg"]

            loss_s = max(0.0, pot_revenue - stressed_revenue)
            loss_pct = round(float((loss_s / max(1.0, pot_revenue)) * 100.0), 1)

            total_potential_revenue_s += pot_revenue
            total_stressed_revenue_s += stressed_revenue
            total_economic_loss_s += loss_s

            if eval_res["suitability_score"] < 65.0:
                at_risk_crops_count += 1

            substitutes = []
            if eval_res["suitability_score"] < 70.0:
                substitutes = self.suitability_engine.recommend_resilient_substitutes(
                    stressed_crop_id=crop_id,
                    ec_us_cm=ec_us_cm,
                    ph=ph,
                    turbidity_ntu=turbidity_ntu,
                    temp_water_c=temp_water_c,
                    water_availability_ratio=water_ratio,
                    region=region,
                    top_k=2
                )

            crops_summary.append({
                "crop_id": crop_id,
                "crop_name": eval_res["crop_name"],
                "region_natural": eval_res.get("region_natural", "Costa"),
                "category": eval_res["category"],
                "planned_ha": float(ha),
                "suitability_score": float(eval_res["suitability_score"]),
                "status": eval_res["status"],
                "status_color": eval_res["status_color"],
                "water_demand_mmc": round(float(crop_gross_demand_m3 / 1_000_000.0), 4),
                "potential_revenue_s": round(float(pot_revenue), 2),
                "stressed_revenue_s": round(float(stressed_revenue), 2),
                "economic_loss_s": round(float(loss_s), 2),
                "loss_pct": loss_pct,
                "water_cost_s": round(float(crop_water_cost_s), 2),
                "filtration_extra_cost_s": round(float(crop_filtration_cost), 2),
                "net_margin_s": round(float(stressed_revenue - crop_water_cost_s - crop_filtration_cost), 2),
                "diagnostics": eval_res.get("diagnostics", {}),
                "substitutes": substitutes
            })

        # Loss Cause Attribution
        evals = [self.suitability_engine.evaluate_crop(cid, ec_us_cm, ph, turbidity_ntu, temp_water_c, water_ratio, region) for cid in crop_distribution_ha.keys()]
        sal_loss = float(np.mean([100.0 - e["salinity_retention_pct"] for e in evals])) if evals else 0.0
        drought_loss = float(max(0.0, 100.0 - (water_ratio * 100.0)))
        ph_loss = float(np.mean([100.0 - e["ph_factor_pct"] for e in evals])) if evals else 0.0
        turb_loss = float(np.mean([100.0 - e["turbidity_factor_pct"] for e in evals])) if evals else 0.0

        tot_stress = sal_loss + drought_loss + ph_loss + turb_loss
        if tot_stress > 0:
            sal_share = round(float((sal_loss / tot_stress) * 100.0), 1)
            drought_share = round(float((drought_loss / tot_stress) * 100.0), 1)
            ph_share = round(float((ph_loss / tot_stress) * 100.0), 1)
            turb_share = round(float((turb_loss / tot_stress) * 100.0), 1)
        else:
            sal_share, drought_share, ph_share, turb_share = 0.0, 0.0, 0.0, 0.0

        net_agricultural_margin_s = round(float(total_stressed_revenue_s - total_water_cost_s - total_extra_filtration_cost_s), 2)
        total_loss_pct = round(float((total_economic_loss_s / max(1.0, total_potential_revenue_s)) * 100.0), 1)

        drip_demand_mmc = round(float((total_net_demand_m3 / 0.88) / 1_000_000.0), 3)
        water_saved_by_drip_mmc = round(float(max(0.0, total_gross_demand_mmc - drip_demand_mmc)), 3)

        return {
            "region": region,
            "simulated_duration_days": simulated_duration_days,
            "irrigation_type": irrigation_type,
            "irrigation_efficiency": eff,
            "total_planned_ha": round(float(total_planned_ha), 1),
            "available_flow_m3s": round(float(available_flow_m3s), 2),
            "water_availability_mmc": total_available_mmc,
            "gross_water_demand_mmc": total_gross_demand_mmc,
            "net_water_demand_mmc": round(float(total_net_demand_m3 / 1_000_000.0), 3),
            "water_deficit_mmc": water_deficit_mmc,
            "water_coverage_pct": water_coverage_pct,
            "water_balance_status": "Superávit Hídrico" if water_deficit_mmc == 0 else "Déficit / Estrés Hídrico",
            "water_balance_color": "green" if water_deficit_mmc == 0 else "red",
            "total_potential_revenue_s": round(float(total_potential_revenue_s), 2),
            "total_stressed_revenue_s": round(float(total_stressed_revenue_s), 2),
            "total_economic_loss_s": round(float(total_economic_loss_s), 2),
            "total_loss_pct": total_loss_pct,
            "total_water_cost_s": round(float(total_water_cost_s), 2),
            "total_extra_filtration_cost_s": round(float(total_extra_filtration_cost_s), 2),
            "net_agricultural_margin_s": net_agricultural_margin_s,
            "at_risk_crops_count": at_risk_crops_count,
            "loss_attribution": {
                "salinity_share_pct": sal_share,
                "drought_deficit_share_pct": drought_share,
                "ph_lockout_share_pct": ph_share,
                "turbidity_clog_share_pct": turb_share,
                "ec_measured_us_cm": float(ec_us_cm),
                "ph_measured": float(ph),
                "turbidity_measured_ntu": float(turbidity_ntu)
            },
            "tech_upgrade_potential": {
                "drip_demand_mmc": drip_demand_mmc,
                "water_saved_mmc": water_saved_by_drip_mmc,
                "feasibility_boost_pct": round(float(min(100.0, (total_available_mmc / max(0.001, drip_demand_mmc)) * 100.0)), 1)
            },
            "crops_summary": crops_summary
        }

    def check_planting_intentions_feasibility(
        self,
        region: str = "LIMA",
        available_flow_m3s: float = 1.20,
        irrigation_type: str = "gravity",
        simulated_duration_days: int = 365
    ) -> Dict[str, Any]:
        """
        Crosses ENA declared planting intentions with forecasted river flow to detect campaign over-sowing risk.
        """
        reg_bench = self.processor.get_regional_benchmark(region)
        intentions = reg_bench.get("planting_intentions", [])
        
        eff = 0.55 if irrigation_type == "gravity" else 0.75 if irrigation_type == "sprinkler" else 0.88
        total_avail_mmc = round(float((available_flow_m3s * 86400.0 * simulated_duration_days) / 1_000_000.0), 3)

        intentions_summary = []
        total_planned_ha = 0.0
        total_demand_m3 = 0.0

        for item in intentions:
            crop_name = item.get("crop", "")
            ha = float(item.get("planned_ha", 0.0))
            if ha <= 0:
                continue

            # Match to catalog
            matched_crop = None
            for c in self.processor.list_crops():
                if c["name"].upper() in crop_name or crop_name in c["name"].upper() or c["crop_id"].upper() in crop_name:
                    matched_crop = c
                    break
            
            demand_ha = matched_crop["water_demand_m3_ha"] if matched_crop else 6000.0
            gross_m3 = (ha * demand_ha) / eff
            total_planned_ha += ha
            total_demand_m3 += gross_m3

            intentions_summary.append({
                "crop_declared": crop_name,
                "declarations_count": item.get("declaration_count", 1),
                "planned_ha": round(ha, 1),
                "water_demand_mmc": round(float(gross_m3 / 1_000_000.0), 3)
            })

        total_demand_mmc = round(float(total_demand_m3 / 1_000_000.0), 3)
        deficit_mmc = round(float(max(0.0, total_demand_mmc - total_avail_mmc)), 3)
        coverage_pct = round(float((min(total_avail_mmc, total_demand_mmc) / max(0.001, total_demand_mmc)) * 100.0), 1)

        ha_secured = round(float(total_planned_ha * (coverage_pct / 100.0)), 1)
        ha_at_risk = round(float(total_planned_ha - ha_secured), 1)

        if coverage_pct >= 95.0:
            campaign_verdict = "CAMPAÑA FACTIBLE (Seguridad Hídrica Plena)"
            verdict_color = "green"
            recom = "La dotación hídrica proyectada cubre satisfactoriamente las intenciones de siembra declaradas en ENA."
        elif coverage_pct >= 75.0:
            campaign_verdict = "ESTRÉS HÍDRICO MODERADO (Monitoreo de Turnos Requerido)"
            verdict_color = "yellow"
            recom = f"Déficit de {deficit_mmc} MMC. Se aconseja restringir siembras tardías de alta demanda hídrica o escalonar turnos de La Mita."
        else:
            campaign_verdict = "ALERTA CRÍTICA DE QUIEBRE DE CAMPAÑA AGRARIA"
            verdict_color = "red"
            recom = f"Déficit severo de {deficit_mmc} MMC ({ha_at_risk} ha en riesgo). Se requiere activación de contingencia, tecnificación y cultivo de reemplazo."

        return {
            "region": region,
            "total_declared_ha": round(total_planned_ha, 1),
            "available_flow_m3s": round(float(available_flow_m3s), 2),
            "water_availability_mmc": total_avail_mmc,
            "total_intentions_demand_mmc": total_demand_mmc,
            "water_deficit_mmc": deficit_mmc,
            "campaign_coverage_pct": coverage_pct,
            "hectares_secured_ha": ha_secured,
            "hectares_at_risk_ha": ha_at_risk,
            "verdict": campaign_verdict,
            "verdict_color": verdict_color,
            "recommendation": recom,
            "intentions_breakdown": intentions_summary[:10]
        }


agro_risk_model = AgroLossRiskModel()
