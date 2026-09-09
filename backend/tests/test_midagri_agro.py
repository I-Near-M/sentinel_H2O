"""
Unit and Integration Tests for MIDAGRI Agro-Hydrological Intelligence Engine & Endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ml.midagri_processor import midagri_processor
from backend.app.ml.crop_recommender import crop_suitability_engine
from backend.app.ml.agro_risk_model import agro_risk_model

client = TestClient(app)


def test_midagri_processor_catalog_and_benchmarks():
    """Validates that crops catalog and regional benchmarks load cleanly."""
    crops = midagri_processor.list_crops()
    assert len(crops) >= 12, "Should have at least 12 calibrated crops"
    
    crop_ids = [c["crop_id"] for c in crops]
    assert "palto" in crop_ids
    assert "mandarina" in crop_ids
    assert "vid" in crop_ids
    assert "granado" in crop_ids
    assert "quinua" in crop_ids

    # Check Lima benchmarks
    lima_bench = midagri_processor.get_regional_benchmark("LIMA")
    assert lima_bench is not None
    assert "crops_stats" in lima_bench
    assert "loss_profile" in lima_bench
    assert "irrigation_profile" in lima_bench
    
    loss_prof = lima_bench["loss_profile"]
    assert "total_incidents" in loss_prof
    assert "drought_deficit_pct" in loss_prof
    assert "salinity_soil_pct" in loss_prof


def test_crop_suitability_engine_salinity_impact():
    """Validates that salinity stress decreases suitability score according to Maas-Hoffman."""
    # Under low salinity (800 uS/cm = 0.8 dS/m)
    palto_low = crop_suitability_engine.evaluate_crop("palto", ec_us_cm=800.0, water_availability_ratio=1.0)
    assert palto_low["suitability_score"] >= 90.0
    assert palto_low["status"] == "Óptimo"

    # Under high salinity (3000 uS/cm = 3.0 dS/m, threshold is 1.5 dS/m)
    palto_high = crop_suitability_engine.evaluate_crop("palto", ec_us_cm=3000.0, water_availability_ratio=1.0)
    assert palto_high["suitability_score"] < palto_low["suitability_score"]
    assert palto_high["salinity_retention_pct"] < 100.0

    # Quinua / Granado should be resilient to 3000 uS/cm
    quinua_high = crop_suitability_engine.evaluate_crop("quinua", ec_us_cm=3000.0, water_availability_ratio=1.0)
    assert quinua_high["suitability_score"] >= 85.0
    assert quinua_high["salinity_retention_pct"] == 100.0


def test_recommend_resilient_substitutes():
    """Validates that engine recommends suitable resilient substitutes for stressed crops."""
    subs = crop_suitability_engine.recommend_resilient_substitutes(
        stressed_crop_id="palto",
        ec_us_cm=3200.0,
        water_availability_ratio=0.75,
        region="LIMA",
        top_k=3
    )
    assert len(subs) > 0
    for s in subs:
        assert s["crop_id"] != "palto"
        assert s["suitability_score"] >= 75.0
        assert "water_saving_m3_ha" in s


def test_agro_risk_model_scenario():
    """Validates water deficit and financial loss calculation."""
    crop_plan = {
        "palto": 100.0,
        "mandarina": 50.0,
        "vid": 40.0
    }
    sim = agro_risk_model.simulate_agro_scenario(
        crop_distribution_ha=crop_plan,
        available_flow_m3s=0.50,
        ec_us_cm=2600.0,
        irrigation_type="gravity",
        water_tariff_s_m3=0.045,
        region="LIMA"
    )

    assert sim["total_planned_ha"] == 190.0
    assert sim["gross_water_demand_mmc"] > 0
    assert sim["water_availability_mmc"] > 0
    assert sim["total_potential_revenue_s"] > 0
    assert sim["total_economic_loss_s"] >= 0
    assert sim["total_loss_pct"] >= 0
    assert len(sim["crops_summary"]) == 3


def test_api_agro_crops_catalog():
    """Tests GET /api/v1/predictions/agro/crops endpoint."""
    response = client.get("/api/v1/predictions/agro/crops")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 12
    first = data[0]
    assert "crop_id" in first
    assert "water_demand_m3_ha" in first
    assert "ec_threshold_us_cm" in first


def test_api_agro_regional_benchmarks():
    """Tests GET /api/v1/predictions/agro/regional-benchmarks endpoint."""
    response = client.get("/api/v1/predictions/agro/regional-benchmarks?region=LIMA")
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "LIMA"
    assert "crops_stats" in data
    assert "loss_profile" in data
    assert "irrigation_profile" in data


def test_api_agro_suitability():
    """Tests POST /api/v1/predictions/agro/suitability endpoint."""
    payload = {
        "ec_us_cm": 1800.0,
        "ph": 7.3,
        "wqi": 78.0,
        "water_availability_ratio": 0.9,
        "region": "LIMA"
    }
    response = client.post("/api/v1/predictions/agro/suitability", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["evaluated_crops"]) >= 12
    assert "suitability_score" in data["evaluated_crops"][0]


def test_api_agro_whatif():
    """Tests POST /api/v1/predictions/agro/what-if endpoint."""
    payload = {
        "titulo_escenario": "Test What-If Cédula Riego",
        "crop_distribution_ha": {
            "palto": 80.0,
            "vid": 40.0,
            "maiz_amarillo": 100.0
        },
        "available_flow_m3s": 0.85,
        "ec_us_cm": 2200.0,
        "irrigation_type": "gravity",
        "water_tariff_s_m3": 0.05,
        "region": "LIMA"
    }
    response = client.post("/api/v1/predictions/agro/what-if", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_planned_ha"] == 220.0
    assert data["gross_water_demand_mmc"] > 0
    assert "total_economic_loss_s" in data
    assert "net_agricultural_margin_s" in data
    assert len(data["crops_summary"]) == 3
