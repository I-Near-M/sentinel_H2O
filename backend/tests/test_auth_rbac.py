import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database.session import Base, get_db
from backend.app.database.models import Usuario, Entidad

# Base de datos SQLite en memoria para tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_bootstrap_first_admin_and_login(client):
    # 1. Crear primer superadministrador
    resp_boot = client.post("/api/v1/auth/bootstrap-admin", json={
        "email": "admin@sentinel.org",
        "password": "Password123!",
        "nombre_completo": "Ing. Carlos Mendoza",
        "cargo_institucional": "Especialista ANA"
    })
    assert resp_boot.status_code == 200
    data = resp_boot.json()
    assert data["email"] == "admin@sentinel.org"
    assert data["rol"] == "ADMIN_SISTEMA"

    # 2. Intentar login con credenciales erradas
    resp_fail = client.post("/api/v1/auth/login", json={
        "email": "admin@sentinel.org",
        "password": "WrongPassword"
    })
    assert resp_fail.status_code == 401

    # 3. Login correcto
    resp_login = client.post("/api/v1/auth/login", json={
        "email": "admin@sentinel.org",
        "password": "Password123!"
    })
    assert resp_login.status_code == 200
    login_data = resp_login.json()
    assert "access_token" in login_data
    token = login_data["access_token"]

    # 4. Validar /me con token
    headers = {"Authorization": f"Bearer {token}"}
    resp_me = client.get("/api/v1/auth/me", headers=headers)
    assert resp_me.status_code == 200
    assert resp_me.json()["email"] == "admin@sentinel.org"


def test_rbac_user_creation_and_audit(client):
    # 1. Bootstrap Admin
    client.post("/api/v1/auth/bootstrap-admin", json={
        "email": "superadmin@sentinel.org",
        "password": "Password123!",
        "nombre_completo": "Super Admin ANA"
    })

    # Login Admin
    login_res = client.post("/api/v1/auth/login", json={
        "email": "superadmin@sentinel.org",
        "password": "Password123!"
    })
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Admin crea un Operador de Junta
    res_create_op = client.post("/api/v1/auth/users", headers=admin_headers, json={
        "email": "operador@junta.pe",
        "password": "OperadorPass2026!",
        "nombre_completo": "Juan Pérez",
        "cargo_institucional": "Ingeniero de Operaciones",
        "rol": "OPERADOR_JUNTA"
    })
    assert res_create_op.status_code == 200
    assert res_create_op.json()["rol"] == "OPERADOR_JUNTA"

    # 3. Login como Operador
    op_login_res = client.post("/api/v1/auth/login", json={
        "email": "operador@junta.pe",
        "password": "OperadorPass2026!"
    })
    assert op_login_res.status_code == 200
    op_token = op_login_res.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # 4. Operador NO debe tener acceso a /api/v1/auth/audit (solo ADMIN_SISTEMA)
    res_audit_forbidden = client.get("/api/v1/auth/audit", headers=op_headers)
    assert res_audit_forbidden.status_code == 403

    # 5. Admin SI debe tener acceso a /api/v1/auth/audit
    res_audit_ok = client.get("/api/v1/auth/audit", headers=admin_headers)
    assert res_audit_ok.status_code == 200
    logs = res_audit_ok.json()
    assert len(logs) >= 2  # Debe contener login y create_user


def test_setup_status_and_system_config(client):
    # 1. En DB limpia, is_first_setup debe ser True
    res_status = client.get("/api/v1/auth/setup-status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["is_first_setup"] is True
    assert status_data["setup_completed"] is False
    assert "nombre_cuenca" in status_data["config"]

    # 2. Inicializar primer Superadmin personalizando la cuenca (ej: Cuenca Río Ebro)
    res_boot = client.post("/api/v1/auth/bootstrap-admin", json={
        "email": "admin@ebro.es",
        "password": "PasswordEbro123!",
        "nombre_completo": "Administrador Cuenca Ebro",
        "nombre_cuenca": "Cuenca del Río Ebro",
        "pais_region": "Zaragoza, España",
        "latitud_centro": 41.6561,
        "longitud_centro": -0.8773,
        "zoom_inicial": 9
    })
    assert res_boot.status_code == 200

    # 3. Tras bootstrap, is_first_setup debe ser False y setup_completed True
    res_status_after = client.get("/api/v1/auth/setup-status")
    assert res_status_after.status_code == 200
    data_after = res_status_after.json()
    assert data_after["is_first_setup"] is False
    assert data_after["setup_completed"] is True
    assert data_after["config"]["nombre_cuenca"] == "Cuenca del Río Ebro"
    assert data_after["config"]["pais_region"] == "Zaragoza, España"

    # 4. Intentar otro bootstrap debe ser bloqueado con 400 Bad Request
    res_boot_blocked = client.post("/api/v1/auth/bootstrap-admin", json={
        "email": "hacker@test.com",
        "password": "Password123!",
        "nombre_completo": "Intruso"
    })
    assert res_boot_blocked.status_code == 400

    # 5. Obtener config pública
    res_cfg = client.get("/api/v1/system/config")
    assert res_cfg.status_code == 200
    assert res_cfg.json()["nombre_cuenca"] == "Cuenca del Río Ebro"

