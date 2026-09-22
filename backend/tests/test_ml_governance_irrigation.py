import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.database.init_db import init_db

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    db = SessionLocal()
    init_db(db, seed_demo_nodes=True)
    db.close()


def test_list_ai_models_mlops():
    """Valida el catálogo MLOps de modelos de Deep Learning y Machine Learning."""
    response = client.get("/api/v1/predictions/models")
    assert response.status_code == 200
    models = response.json()
    assert len(models) >= 4
    codigos = [m["codigo_modelo"] for m in models]
    assert "GRU_HYDROLOGIC_24H" in codigos
    assert "ISOFOREST_ANOMALY_V1" in codigos
    assert "MAAS_HOFFMAN_AGRO_V1" in codigos


def test_dynamic_crops_catalog_and_create():
    """Valida la consulta y creación dinámica de cultivos agrícolas."""
    # 1. Consultar catálogo desde la BD (sembrado para Perú)
    response = client.get("/api/v1/predictions/agro/crops")
    assert response.status_code == 200
    crops = response.json()
    assert len(crops) >= 20
    crop_ids = [c["crop_id"] for c in crops]
    assert "palto" in crop_ids
    assert "papa" in crop_ids

    # 2. Filtrar por región natural Costa
    res_costa = client.get("/api/v1/predictions/agro/crops?natural_region=Costa")
    assert res_costa.status_code == 200
    crops_costa = res_costa.json()
    assert all(c["region_natural"] == "Costa" for c in crops_costa)

    # 3. Crear un cultivo personalizado con ID único
    import uuid
    uid = f"crop_{uuid.uuid4().hex[:6]}"
    custom_crop = {
        "id_cultivo": uid,
        "codigo_catalogo": "CUSTOM_VALLE",
        "pais_origen": "Perú",
        "region_natural": "Costa",
        "nombre": "Arándano Azul (Biloxi)",
        "categoria": "Berries / Agroexportación",
        "demanda_hidrica_m3_ha": 8200.0,
        "ec_umbral_us_cm": 1100.0,
        "salinidad_pendiente_pct": 18.0,
        "ph_min": 4.8,
        "ph_max": 5.8,
        "turbidez_max_ntu": 25.0,
        "temp_agua_min_c": 14.0,
        "temp_agua_max_c": 22.0,
        "wqi_min": 75.0,
        "dias_ciclo_vegetativo": 365,
        "rendimiento_base_kg_ha": 14000.0,
        "precio_base_moneda_kg": 6.80,
        "moneda_codigo": "PEN",
        "nivel_resiliencia": "Baja",
        "descripcion": "Sensible a la alcalinidad y a la salinidad de agua de pozo o río."
    }
    create_res = client.post("/api/v1/predictions/agro/crops", json=custom_crop)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["crop_id"] == uid
    assert created["ec_threshold_us_cm"] == 1100.0


def test_st_graph_3d_mesh_profile():
    """Valida la generación de malla continua interpolada para el Canvas 3D."""
    response = client.get("/api/v1/predictions/st-graph/mesh-3d?samples_per_reach=5")
    assert response.status_code == 200
    data = response.json()
    assert "profile_points" in data
    assert "network_topology" in data
    assert len(data["profile_points"]) > 0
    # Verificar que los puntos contengan coordenadas y variables fisicoquímicas
    first_pt = data["profile_points"][0]
    assert "lat" in first_pt
    assert "lon" in first_pt
    assert "cota_msnm" in first_pt
    assert "caudal_m3s" in first_pt
    assert "wqi" in first_pt


def test_governance_catalogs():
    """Valida la consulta de tipos de entidad, cargos y tipos de uso."""
    res_te = client.get("/api/v1/governance/entity-types")
    assert res_te.status_code == 200
    assert len(res_te.json()) >= 5

    res_roles = client.get("/api/v1/governance/roles")
    assert res_roles.status_code == 200
    assert len(res_roles.json()) >= 5

    res_uses = client.get("/api/v1/governance/water-uses")
    assert res_uses.status_code == 200
    assert len(res_uses.json()) >= 4

    res_entities = client.get("/api/v1/governance/entities")
    assert res_entities.status_code == 200
    assert len(res_entities.json()) >= 1


def test_irrigation_shifts_and_hydraulic_reach_simulation():
    """Valida la simulación de impacto en tramos y la creación de turnos de riego."""
    # 1. Simular impacto de una derivación de 300 l/s entre Nodo Cabecera y Conducción
    sim_payload = {
        "id_nodo_aguas_arriba": "NODO-01-CABECERA",
        "id_nodo_aguas_abajo": "NODO-02-CONDUCCION",
        "caudal_captacion_ls": 300.0,
        "duracion_horas": 4.0
    }
    sim_res = client.post("/api/v1/irrigation/simulate-reach-impact", json=sim_payload)
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["caudal_captacion_ls"] == 300.0
    assert sim_data["caudal_captacion_m3s"] == 0.3
    assert sim_data["volumen_turno_m3"] == 4320.0
    assert "caudal_abajo_proyectado_m3s" in sim_data
    assert "reduccion_caudal_tramo_pct" in sim_data
