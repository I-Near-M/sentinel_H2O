import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.init_db import init_db
from backend.app.database.session import SessionLocal
from backend.app.database.models import (
    Usuario, Nodo, MantenimientoNodo, TipoRecursoHidrico,
    EstadisticaRegionalAgro, PerfilRiesgoRegionalAgro, IntencionSiembraAgro,
    MedicionRaw, MedicionProcesada
)
from backend.app.ml.midagri_processor import midagri_processor

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db(seed_demo_nodes=True)


def get_superadmin_token() -> str:
    """Inicia sesión con el superadministrador por defecto y retorna el token JWT."""
    from backend.app.core.security import create_access_token
    db = SessionLocal()
    admin = db.query(Usuario).filter(Usuario.rol == "ADMIN_SISTEMA").first()
    if admin:
        token = create_access_token({"sub": admin.id_usuario, "email": admin.email, "rol": "ADMIN_SISTEMA"})
        db.close()
        return token
    db.close()

    client.post("/api/v1/auth/bootstrap-admin", json={
        "email": "superadmin@sentinel-h2o.org",
        "password": "SuperAdminSecure2026!",
        "nombre_completo": "Superadmin Sistema",
        "cargo_institucional": "Administrador"
    })
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin@sentinel-h2o.org", "password": "SuperAdminSecure2026!"}
    )
    if resp.status_code == 200:
        return resp.json()["access_token"]
    return ""



def test_list_water_resource_types():
    """Verifica que el catálogo de tipos de recurso hídrico esté sembrado y accesible."""
    response = client.get("/api/v1/governance/water-resource-types")
    assert response.status_code == 200
    types = response.json()
    assert len(types) >= 5
    codes = [t["codigo"] for t in types]
    assert "RIO" in codes
    assert "CUENCA" in codes
    assert "LAGUNA" in codes
    assert "EMBALSE" in codes
    assert "CANAL_RIEGO" in codes


def test_node_maintenance_crud():
    """Verifica el ciclo de vida completo de una intervención de mantenimiento en un nodo."""
    node_id = "NODO-01-CABECERA"
    
    # 1. Crear mantenimiento
    maint_payload = {
        "id_nodo": node_id,
        "tipo_mantenimiento": "CALIBRACION_SENSORES",
        "categoria": "HIDRAULICO",
        "tecnico_responsable": "Ing. Carlos Mendoza",
        "descripcion_trabajo": "Calibración de regleta batimétrica y ajuste de molinete Hall",
        "diagnostico_inicial": "Fricción en rodamientos del molinete tras crecida",
        "acciones_realizadas": "Lubricación y reemplazo de sensor Hall",
        "repuestos_utilizados": "Módulo Hall A3144",
        "costo_estimado": 180.50,
        "estado_mantenimiento": "PROGRAMADO"
    }
    create_resp = client.post(f"/api/v1/nodes/{node_id}/maintenances", json=maint_payload)
    assert create_resp.status_code == 201
    maint_data = create_resp.json()
    maint_id = maint_data["id_mantenimiento"]
    assert maint_data["tecnico_responsable"] == "Ing. Carlos Mendoza"
    assert maint_data["estado_mantenimiento"] == "PROGRAMADO"

    # 2. Listar mantenimientos del nodo
    list_resp = client.get(f"/api/v1/nodes/{node_id}/maintenances")
    assert list_resp.status_code == 200
    maint_list = list_resp.json()
    assert len(maint_list) >= 1
    assert any(m["id_mantenimiento"] == maint_id for m in maint_list)

    # 3. Actualizar estado de mantenimiento
    update_payload = {
        "estado_mantenimiento": "COMPLETADO",
        "observaciones": "Pruebas de aforo conformes con velocidad de 1.45 m/s"
    }
    update_resp = client.put(f"/api/v1/nodes/maintenances/{maint_id}", json=update_payload)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["estado_mantenimiento"] == "COMPLETADO"
    assert "1.45 m/s" in updated_data["observaciones"]


def test_audit_logs_endpoint():
    """Verifica que los eventos de auditoría puedan ser consultados por el superadministrador."""
    token = get_superadmin_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    response = client.get("/api/v1/governance/audit-logs", headers=headers)
    assert response.status_code == 200
    logs = response.json()
    assert isinstance(logs, list)


def test_system_config_full_update():
    """Verifica la actualización de los campos avanzados del singleton de recurso hídrico."""
    token = get_superadmin_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    update_payload = {
        "nombre_recurso": "Río Chancay - Huaral",
        "codigo_recurso": "RH-CHANCAY-01",
        "tipo_recurso": "RIO",
        "pais": "Perú",
        "region": "Lima",
        "latitud_centro": -11.55,
        "longitud_centro": -77.10,
        "zoom_inicial": 11,
        "cota_media_msnm": 1450.0,
        "superficie_km2": 3150.0,
        "modulo_riego_habilitado": True,
        "modulo_piscicultura_habilitado": True,
        "modulo_ia_habilitado": True
    }
    put_resp = client.put("/api/v1/system/config", json=update_payload, headers=headers)
    assert put_resp.status_code == 200
    cfg = put_resp.json()
    assert cfg["nombre_recurso"] == "Río Chancay - Huaral"
    assert cfg["codigo_recurso"] == "RH-CHANCAY-01"
    assert cfg["latitud_centro"] == -11.55
    assert cfg["modulo_riego_habilitado"] is True

    # Verificar lectura pública
    get_resp = client.get("/api/v1/system/config")
    assert get_resp.status_code == 200
    public_cfg = get_resp.json()
    assert public_cfg["nombre_recurso"] == "Río Chancay - Huaral"


def test_midagri_db_persistence_and_queries():
    """Verifica que las tablas analíticas de MIDAGRI contengan registros y se consulten vía SQL."""
    db = SessionLocal()
    # Ejecutar sincronización de MIDAGRI si no estuviera ejecutada
    midagri_processor.sync_midagri_to_db(db=db)
    
    # Comprobar registros en base de datos
    stat_count = db.query(EstadisticaRegionalAgro).count()
    risk_count = db.query(PerfilRiesgoRegionalAgro).count()
    inten_count = db.query(IntencionSiembraAgro).count()
    db.close()

    assert stat_count > 0, "Debe haber registros en estadisticas_regionales_agro"
    assert risk_count > 0, "Debe haber registros en perfiles_riesgo_regional_agro"
    assert inten_count > 0, "Debe haber registros en intenciones_siembra_agro"

    # Consultar endpoints SQL para LIMA
    benchmarks_resp = client.get("/api/v1/predictions/agro/benchmarks/LIMA")
    assert benchmarks_resp.status_code == 200
    benchmarks = benchmarks_resp.json()
    assert len(benchmarks) > 0
    assert all(b["departamento_region"] in ["LIMA", "NACIONAL"] for b in benchmarks)

    risks_resp = client.get("/api/v1/predictions/agro/risk-profiles/LIMA")
    assert risks_resp.status_code == 200
    risks = risks_resp.json()
    assert len(risks) > 0

    intentions_resp = client.get("/api/v1/predictions/agro/planting-intentions/LIMA")
    assert intentions_resp.status_code == 200
    intentions = intentions_resp.json()
    assert len(intentions) > 0


def test_medicion_procesada_battery_properties():
    """Verifica que las propiedades battery_v y signal_rssi en MedicionProcesada funcionen correctamente."""
    db = SessionLocal()
    raw = MedicionRaw(
        id_nodo="NODO-01-CABECERA",
        raw_v_ph=2.5,
        raw_v_tds=0.8,
        raw_v_turb=3.2,
        raw_dist_cm=70.0,
        temp_agua_c=14.0,
        battery_v=12.45,
        signal_rssi=22
    )
    db.add(raw)
    db.flush()

    import datetime
    proc = MedicionProcesada(
        id_raw=raw.id_raw,
        id_nodo="NODO-01-CABECERA",
        timestamp=datetime.datetime.now(datetime.timezone.utc),
        ph=7.05,
        tds_ppm=340.0,
        ec_us_cm=680.0,
        turbidez_ntu=8.5,
        temp_agua_c=14.0,
        tirante_agua_cm=80.0,
        caudal_m3s=1.25,
        caudal_ls=1250.0,
        wqi_score=82.0,
        wqi_categoria="BUENA",
        estado_salinidad="OPTIMO",
        estado_ph="OPTIMO"
    )
    db.add(proc)
    db.commit()
    db.refresh(proc)

    assert proc.battery_v == 12.45
    assert proc.signal_rssi == 22
    db.close()
