import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.init_db import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db(seed_demo_nodes=True)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["sistema"] == "Sentinel-H2O | Backend API"
    assert data["estado"] == "OPERACIONAL"


def test_list_nodes():
    response = client.get("/api/v1/nodes/")
    assert response.status_code == 200
    nodes = response.json()
    assert len(nodes) >= 3
    node_ids = [n["id_nodo"] for n in nodes]
    assert "NODO-01-CABECERA" in node_ids
    assert "NODO-02-CONDUCCION" in node_ids
    assert "NODO-03-PARCELA" in node_ids


def test_receive_normal_telemetry():
    payload = {
        "node_id": "NODO-03-PARCELA",
        "api_key": "hash_key_parcela_secure_03",
        "battery_v": 12.60,
        "signal_rssi": 20,
        "temp_c": 17.5,
        "raw_dist_cm": 65.0,
        "raw_v_ph": 2.50,
        "raw_v_tds": 0.65,
        "raw_v_turb": 3.20,
        "timestamp_ms": 50000
    }
    response = client.post("/api/v1/telemetry/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id_nodo"] == "NODO-03-PARCELA"
    assert 6.9 <= data["ph"] <= 7.2  # Calibrado a offset 2.51V -> pH 7.06
    assert data["estado_ph"] == "OPTIMO"
    assert data["wqi_score"] >= 0.0
    assert data["alerta_disparada"] is False


def test_receive_high_salinity_critical_alert():
    # Voltaje TDS alto (~1.95V) produce salinidad crítica (>1500 uS/cm)
    payload = {
        "node_id": "NODO-03-PARCELA",
        "api_key": "hash_key_parcela_secure_03",
        "battery_v": 12.40,
        "signal_rssi": 18,
        "temp_c": 19.0,
        "raw_dist_cm": 60.0,
        "raw_v_ph": 2.49,
        "raw_v_tds": 1.95,
        "raw_v_turb": 3.10,
        "timestamp_ms": 60000
    }
    response = client.post("/api/v1/telemetry/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["estado_salinidad"] == "PELIGRO_ESTRES_OSMOTICO"
    assert data["alerta_disparada"] is True
    assert data["alerta_info"]["tipo_evento"] == "SALINIDAD_ALTA"
    assert data["alerta_info"]["nivel_severidad"] == "CRITICO_ROJO"
    assert "No abras compuertas hacia tus frutales" in data["alerta_info"]["mensaje_campesino"]


def test_get_node_history():
    response = client.get("/api/v1/telemetry/NODO-03-PARCELA/history?limit=10")
    assert response.status_code == 200
    history = response.json()
    assert len(history) >= 2


def test_unregistered_node_error():
    # Nodo no registrado en el sistema
    payload = {
        "node_id": "NODO-99-DESCONOCIDO",
        "api_key": "clave_inventada",
        "battery_v": 12.50,
        "temp_c": 18.0,
        "raw_dist_cm": 70.0,
        "raw_v_ph": 2.50,
        "raw_v_tds": 0.50,
        "raw_v_turb": 3.00
    }
    response = client.post("/api/v1/telemetry/", json=payload)
    assert response.status_code == 404
    assert "no está registrado" in response.json()["detail"]


def test_invalid_api_key():
    payload = {
        "node_id": "NODO-03-PARCELA",
        "api_key": "wrong_key_fake",
        "battery_v": 12.50,
        "temp_c": 18.0,
        "raw_dist_cm": 70.0,
        "raw_v_ph": 2.50,
        "raw_v_tds": 0.50,
        "raw_v_turb": 3.00
    }
    response = client.post("/api/v1/telemetry/", json=payload)
    assert response.status_code == 401
    assert "API Key incorrecta" in response.json()["detail"]


def test_node_provisioning_wizard_dynamic():
    import uuid
    node_unique_id = f"NODO-05-{uuid.uuid4().hex[:6].upper()}"
    # 1. Provisión de un nuevo nodo dinámico desde la web
    provision_payload = {
        "id_nodo": node_unique_id,
        "nombre": "Estación Bocatoma Canal Principal Valle",
        "id_entidad_responsable": 2,
        "sector_cuenca": "CUENCA_BAJA",
        "subcuenca": "Chancay Bajo",
        "latitud": -11.5500,
        "longitud": -77.1200,
        "cota_msnm": 180.0,
        "tipo_fuente": "CANAL_DERIVACION",
        "intervalo_envio_min": 15,
        "caudal_coef_k": 0.690,  # Parshall 1 pie
        "caudal_exp_n": 1.522,
        "ec_max_critico_us_cm": 1400.0
    }
    prov_resp = client.post("/api/v1/nodes/provision", json=provision_payload)
    assert prov_resp.status_code == 201
    prov_data = prov_resp.json()
    assert prov_data["id_nodo"] == node_unique_id
    assert "api_key_plaintext" in prov_data
    assert "#define NODE_API_KEY" in prov_data["cpp_config_snippet"]
    api_key_generada = prov_data["api_key_plaintext"]

    # 2. Enviar telemetría usando la nueva API Key generada
    telemetry_payload = {
        "node_id": node_unique_id,
        "api_key": api_key_generada,
        "battery_v": 12.70,
        "signal_rssi": 25,
        "temp_c": 18.2,
        "raw_dist_cm": 45.0,
        "raw_v_ph": 2.50,
        "raw_v_tds": 0.40,
        "raw_v_turb": 2.80,
        "timestamp_ms": 1000
    }
    tel_resp = client.post("/api/v1/telemetry/", json=telemetry_payload)
    assert tel_resp.status_code == 201
    tel_data = tel_resp.json()
    assert tel_data["id_nodo"] == node_unique_id
    assert tel_data["ph"] >= 6.5


def test_node_calibration_get_and_update():
    # 1. Actualizar/Registrar calibración para un nodo existente
    node_id = "NODO-01-CABECERA"
    update_payload = {
        "ph_offset_v": 2.485,
        "ph_slope": -0.183,
        "tds_factor_k": 0.520,
        "tds_offset_v": 0.010,
        "turb_v_clear": 4.150,
        "turb_v_turbid": 2.420,
        "distancia_fondo_sensor_cm": 135.5,
        "caudal_coef_k": 0.535,
        "caudal_exp_n": 1.530,
        "calibrado_por": "Ing. Residente de Prueba"
    }
    post_resp = client.post(f"/api/v1/nodes/{node_id}/calibration", json=update_payload)
    assert post_resp.status_code == 201
    saved_data = post_resp.json()
    assert saved_data["ph_offset_v"] == 2.485
    assert saved_data["calibrado_por"] == "Ing. Residente de Prueba"
    assert saved_data["distancia_fondo_sensor_cm"] == 135.5

    # 2. Consultar la calibración activa mediante GET
    calib_resp = client.get(f"/api/v1/nodes/{node_id}/calibration")
    assert calib_resp.status_code == 200
    calib_data = calib_resp.json()
    assert calib_data["ph_offset_v"] == 2.485
    assert calib_data["caudal_coef_k"] == 0.535
    assert calib_data["es_vigente"] is True


