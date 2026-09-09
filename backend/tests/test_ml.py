import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.init_db import init_db
from backend.app.ml.anomaly_detector import OnlineAnomalyDetector
from backend.app.ml.lead_time import HydraulicLeadTimeEstimator
from backend.app.ml.whatif_simulator import WhatIfSimulator
from backend.app.database.session import SessionLocal

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def test_anomaly_detector_normal():
    detector = OnlineAnomalyDetector()
    res = detector.evaluate_reading(
        ph=7.4,
        tds_ppm=320.0,
        ec_us_cm=640.0,
        turbidez_ntu=4.0,
        temp_agua_c=16.5,
        caudal_m3s=1.2,
        wqi_score=22.0
    )
    assert res["is_anomaly"] is False
    assert res["nivel_severidad"] == "NORMAL"
    assert res["confianza"] > 0.60


def test_anomaly_detector_osmotic_stress():
    detector = OnlineAnomalyDetector()
    res = detector.evaluate_reading(
        ph=7.2,
        tds_ppm=950.0,
        ec_us_cm=1900.0,
        turbidez_ntu=8.0,
        temp_agua_c=22.0,
        caudal_m3s=0.4,
        wqi_score=78.0
    )
    assert res["is_anomaly"] is True
    assert res["diagnostico_ia"] == "RIESGO_CRITICO_ESTRES_OSMOTICO"
    assert res["nivel_severidad"] == "CRITICO_ROJO"


def test_lead_time_calculation():
    res = HydraulicLeadTimeEstimator.estimate_travel_time(
        origen_nodo_id="NODO-02-CONDUCCION",
        destino_nodo_id="NODO-03-PARCELA",
        caudal_origen_m3s=1.5
    )
    assert res["distancia_km"] == 18.5
    assert res["velocidad_flujo_kmh"] > 5.0
    assert res["lead_time_frente_horas"] > 0.5
    assert res["ventana_anticipacion_minutos"] > 30
    assert "horas" in res["recomendacion_accion"] or "minutos" in res["recomendacion_accion"]


def test_forecast_24h_endpoint():
    response = client.get("/api/v1/predictions/NODO-03-PARCELA/forecast-24h")
    assert response.status_code == 200
    data = response.json()
    assert data["id_nodo"] == "NODO-03-PARCELA"
    assert data["modelo_ia"] == "GRU-Shallow-v1.0"
    assert len(data["pronostico_24h"]) == 24
    
    # Comprobar el primer y último paso
    p1 = data["pronostico_24h"][0]
    assert p1["horizonte_horas"] == 1
    assert p1["caudal_predicho_m3s"] > 0.0
    assert p1["wqi_predicho"] >= 0.0
    assert p1["riesgo_estres_hidrico"] in ["BAJO", "MODERADO", "ALTO", "CRITICO"]


def test_lead_time_endpoint():
    payload = {
        "origen_nodo_id": "NODO-01-CABECERA",
        "destino_nodo_id": "NODO-03-PARCELA",
        "caudal_origen_m3s": 2.0
    }
    response = client.post("/api/v1/predictions/lead-time", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["distancia_km"] == 63.5
    assert data["ventana_anticipacion_minutos"] > 60


def test_simulate_whatif_endpoint():
    payload = {
        "titulo_escenario": "Prueba de Estrés Hídrico -50%",
        "delta_precipitacion_pct": -50.0,
        "delta_salinidad_us_cm": 400.0,
        "delta_caudal_cabecera_pct": -30.0,
        "id_entidad": 2,
        "ejecutado_por": "Ingeniero Evaluador"
    }
    response = client.post("/api/v1/predictions/simulate-whatif", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["titulo_escenario"] == "Prueba de Estrés Hídrico -50%"
    assert data["salinidad_proyectada_ec"] > 0.0
    assert data["caudal_valle_proyectado_m3s"] > 0.0
    assert "Escenario" in data["resumen_impacto"]


def test_simulate_multivariable_endpoint():
    payload = {
        "id_nodo_origen": "NODO-01-CABECERA",
        "titulo_escenario": "Impacto en Paltos por Sequía",
        "delta_caudal_pct": -40.0,
        "delta_salinidad_us_cm": 600.0,
        "delta_ph": -0.5,
        "delta_precipitacion_pct": -20.0,
        "cultivo_diana": "PALTOS_AGUACATE",
        "duracion_horas": 12,
        "ejecutado_por": "Especialista Agrónomo"
    }
    response = client.post("/api/v1/predictions/simulate-multivariable", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["titulo_escenario"] == "Impacto en Paltos por Sequía"
    assert data["caudal_proyectado_m3s"] > 0.0
    assert data["salinidad_proyectada_ec"] > 600.0
    assert "impacto_cultivo" in data
    assert data["impacto_cultivo"]["cultivo"] == "PALTOS_AGUACATE"
    assert data["impacto_cultivo"]["perdida_rendimiento_pct"] >= 0.0
    assert data["impacto_cultivo"]["nivel_estres_osmotico"] in ["CRÍTICO (Severo)", "MODERADO (Precaución)", "CONTROLADO (Óptimo)"]


def test_cascade_lead_time_endpoint():
    payload = {
        "id_nodo_origen": "NODO-01-CABECERA",
        "caudal_transporte_m3s": 2.5,
        "salinidad_origen_ec": 1800.0,
        "ph_origen": 7.2
    }
    response = client.post("/api/v1/predictions/lead-time/cascade", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id_nodo_origen"] == "NODO-01-CABECERA"
    assert data["total_estaciones_aguas_abajo"] >= 2
    assert len(data["secuencia_nodos"]) >= 2
    hop1 = data["secuencia_nodos"][0]
    assert hop1["orden_secuencia"] == 1
    assert hop1["lead_time_frente_minutos"] > 0
    assert hop1["estado_compuerta_recomendado"] in ["CERRAR_COMPUERTAS_INMEDIATO", "ALERTA_PREVENTIVA_VIGILANCIA", "OPERACIÓN_NORMAL"]


def test_prescribe_dilution_endpoint():
    payload = {
        "salinidad_actual_rio_ec": 2200.0,
        "caudal_actual_rio_m3s": 2.0,
        "salinidad_objetivo_ec": 1000.0,
        "salinidad_agua_represa_ec": 150.0,
        "duracion_lavado_horas": 8
    }
    response = client.post("/api/v1/predictions/prescribe-dilution", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["caudal_descarga_requerido_m3s"] > 0.0
    assert data["volumen_total_desembalse_m3"] > 0.0
    assert "descarga de rescate" in data["prescripcion_tecnica"] or "FACTIBLE" in data["factibilidad_operativa"]


def test_audit_mita_deficit_endpoint():
    payload = {
        "id_nodo_infractor": "NODO-02-CONDUCCION",
        "caudal_exceso_ls": 350.0,
        "duracion_sobre_extraccion_horas": 6.0,
        "caudal_nominal_valle_m3s": 1.5
    }
    response = client.post("/api/v1/predictions/audit-mita-deficit", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert pytest.approx(data["volumen_total_sustraido_m3"], 0.1) == 7560.0
    assert data["retraso_turno_valle_horas"] > 0.5
    assert "Auditoría Forense" in data["dictamen_auditoria"]


def test_simulations_history_endpoint():
    response = client.get("/api/v1/predictions/simulations-history?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_sync_all_forecasts_batch():
    response = client.post("/api/v1/predictions/sync-all-forecasts")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["nodos_actualizados"] >= 3

