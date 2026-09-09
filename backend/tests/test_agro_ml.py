import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ml.midagri_processor import midagri_processor
from backend.app.ml.crop_recommender import crop_suitability_engine
from backend.app.ml.agro_risk_model import agro_risk_model

client = TestClient(app)

def test_midagri_processor_catalog_expanded():
    """Verify that catalog contains Costa, Sierra, Selva crops and natural regions."""
    crops = midagri_processor.list_crops()
    assert len(crops) >= 20
    
    costa_crops = midagri_processor.list_crops(natural_region="Costa")
    sierra_crops = midagri_processor.list_crops(natural_region="Sierra")
    selva_crops = midagri_processor.list_crops(natural_region="Selva")
    
    assert len(costa_crops) >= 5
    assert len(sierra_crops) >= 5
    assert len(selva_crops) >= 4
    
    # Check specific crops
    palto = midagri_processor.get_crop("palto")
    assert palto is not None
    assert palto["region_natural"] == "Costa"
    
    papa = midagri_processor.get_crop("papa_nativa")
    assert papa is not None
    assert papa["region_natural"] == "Sierra"
    
    cafe = midagri_processor.get_crop("cafe")
    assert cafe is not None
    assert cafe["region_natural"] == "Selva"

def test_midagri_processor_regional_benchmarks():
    """Verify benchmarks for different departments in Costa, Sierra, and Selva."""
    for reg in ["LIMA", "JUNIN", "SAN_MARTIN", "CUSCO", "PUNO", "UCAYALI", "NACIONAL"]:
        bench = midagri_processor.get_regional_benchmark(reg)
        assert bench is not None
        assert "crops_stats" in bench
        assert "loss_profile" in bench
        assert "irrigation_profile" in bench
        assert "planting_intentions" in bench

def test_crop_recommender_multivariable_stress():
    """Test biophysical multi-parameter evaluation (EC, pH, Turbidity, Temp)."""
    # 1. Optimal conditions for Palto
    res_opt = crop_suitability_engine.evaluate_crop(
        crop_id="palto",
        ec_us_cm=800.0,
        ph=6.8,
        turbidity_ntu=15.0,
        temp_water_c=18.0,
        water_availability_ratio=1.0,
        region="LIMA"
    )
    assert res_opt["suitability_score"] >= 80.0
    assert res_opt["status_color"] == "green"
    assert "800" in res_opt["diagnostics"]["salinity"]

    # 2. Severe Salinity & High pH stress for Palto
    res_stressed = crop_suitability_engine.evaluate_crop(
        crop_id="palto",
        ec_us_cm=3500.0,
        ph=8.8,
        turbidity_ntu=250.0,
        temp_water_c=31.0,
        water_availability_ratio=0.7,
        region="LIMA"
    )
    assert res_stressed["suitability_score"] < 70.0
    assert res_stressed["status_color"] in ["yellow", "red"]
    assert res_stressed["extra_filtration_cost_s_ha"] > 0
    assert "dS/m" in res_stressed["diagnostics"]["salinity"]

def test_crop_recommender_sierra_selva():
    """Test evaluation of crops from Sierra and Selva."""
    # Sierra - Quinua (Highly tolerant to salinity)
    res_quinua = crop_suitability_engine.evaluate_crop(
        crop_id="quinua",
        ec_us_cm=3000.0,
        ph=7.0,
        turbidity_ntu=30.0,
        temp_water_c=14.0,
        water_availability_ratio=1.0,
        region="PUNO"
    )
    assert res_quinua["suitability_score"] >= 70.0
    
    # Selva - Cacao
    res_cacao = crop_suitability_engine.evaluate_crop(
        crop_id="cacao",
        ec_us_cm=600.0,
        ph=6.2,
        turbidity_ntu=20.0,
        temp_water_c=24.0,
        water_availability_ratio=1.0,
        region="SAN_MARTIN"
    )
    assert res_cacao["suitability_score"] >= 80.0

def test_agro_risk_model_whatif():
    """Test What-If simulation with multi-crop cédula."""
    sim = agro_risk_model.simulate_agro_scenario(
        crop_distribution_ha={"palto": 50, "mandarina": 30, "papa": 20},
        available_flow_m3s=0.5,
        ec_us_cm=1600.0,
        ph=7.5,
        turbidity_ntu=40.0,
        temp_water_c=20.0,
        irrigation_type="gravity",
        water_tariff_s_m3=0.045,
        region="LIMA"
    )
    assert sim["total_planned_ha"] == 100.0
    assert sim["gross_water_demand_mmc"] > 0
    assert "crops_summary" in sim
    assert len(sim["crops_summary"]) == 3
    assert "loss_attribution" in sim
    assert "tech_upgrade_potential" in sim

def test_planting_intentions_feasibility():
    """Test ENA planting intention feasibility vs river flow."""
    res = agro_risk_model.check_planting_intentions_feasibility(
        region="LIMA",
        available_flow_m3s=0.8,
        irrigation_type="gravity",
        simulated_duration_days=365
    )
    assert "total_declared_ha" in res
    assert "campaign_coverage_pct" in res
    assert "verdict" in res
    assert "intentions_breakdown" in res

def test_api_endpoints_agro():
    """Test all FastAPI endpoints related to agro ML."""
    # 1. Crops Catalog
    r = client.get("/api/v1/predictions/agro/crops")
    assert r.status_code == 200
    crops = r.json()
    assert len(crops) >= 20

    # 2. Crops Filtered by Natural Region
    r = client.get("/api/v1/predictions/agro/crops?natural_region=Sierra")
    assert r.status_code == 200
    sierra_crops = r.json()
    assert len(sierra_crops) >= 5
    assert all(c["region_natural"] == "Sierra" for c in sierra_crops)

    # 3. Regional Benchmark
    r = client.get("/api/v1/predictions/agro/regional-benchmarks?region=JUNIN")
    assert r.status_code == 200
    bench = r.json()
    assert bench["region"] == "JUNIN"

    # 4. Suitability
    r = client.post("/api/v1/predictions/agro/suitability", json={
        "crop_id": "palto",
        "ec_us_cm": 1200.0,
        "ph": 7.3,
        "turbidity_ntu": 25.0,
        "temp_water_c": 19.0,
        "water_availability_ratio": 1.0,
        "region": "LIMA"
    })
    assert r.status_code == 200
    data = r.json()
    assert len(data["evaluated_crops"]) == 1

    # 5. What-If
    r = client.post("/api/v1/predictions/agro/what-if", json={
        "crop_distribution_ha": {"palto": 40.0, "cafe": 20.0},
        "available_flow_m3s": 0.6,
        "ec_us_cm": 900.0,
        "ph": 7.0,
        "turbidity_ntu": 15.0,
        "temp_water_c": 19.0,
        "irrigation_type": "drip",
        "region": "LIMA"
    })
    assert r.status_code == 200
    whatif_data = r.json()
    assert whatif_data["total_planned_ha"] == 60.0

    # 6. Stress Simulation
    r = client.post("/api/v1/predictions/agro/stress-simulation", json={
        "crop_id": "palto",
        "ec_us_cm": 2500.0,
        "ph": 8.5,
        "turbidity_ntu": 180.0,
        "temp_water_c": 28.0,
        "water_availability_ratio": 0.8,
        "region": "LIMA"
    })
    assert r.status_code == 200
    stress_data = r.json()
    assert stress_data["crop_id"] == "palto"
    assert stress_data["economic_loss_ha_s"] >= 0
    assert len(stress_data["substitutes"]) > 0

    # 7. Intentions Feasibility
    r = client.post("/api/v1/predictions/agro/intentions-feasibility", json={
        "region": "JUNIN",
        "available_flow_m3s": 1.5,
        "irrigation_type": "gravity",
        "simulated_duration_days": 365
    })
    assert r.status_code == 200
    feasibility_data = r.json()
    assert feasibility_data["region"] == "JUNIN"
    assert "verdict" in feasibility_data
