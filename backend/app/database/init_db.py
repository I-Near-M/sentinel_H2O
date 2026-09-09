import logging
from sqlalchemy.orm import Session
from backend.app.database.session import engine, Base, SessionLocal
from backend.app.database.models import Entidad, Nodo, CalibracionNodo, UmbralConfig, DestinatarioAlerta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_mvp_demo_nodes(db: Session):
    """
    Función auxiliar para sembrar los 3 nodos de demostración iniciales (usado en tests y demos).
    """
    if db.query(Nodo).first():
        return

    logger.info("Sembrando los 3 nodos MVP de demostración...")
    n1 = Nodo(
        id_nodo="NODO-01-CABECERA",
        id_entidad_responsable=1,
        nombre="Estación Cabecera Lagunas Vichaycocha",
        sector_cuenca="CUENCA_ALTA",
        subcuenca="Vichaycocha",
        latitud=-11.0254000,
        longitud=-76.5123000,
        cota_msnm=4350.00,
        tipo_fuente="LAGUNA_REPRESADA",
        api_key_hash="hash_key_cabecera_secure_01",
        intervalo_envio_min=15,
        descripcion="Monitoreo de calidad de agua virgen de deshielo y control de lagunas represadas."
    )
    n2 = Nodo(
        id_nodo="NODO-02-CONDUCCION",
        id_entidad_responsable=2,
        nombre="Estación Conducción Central Acos - Santo Domingo",
        sector_cuenca="CUENCA_MEDIA",
        subcuenca="Media",
        latitud=-11.2789000,
        longitud=-76.8241000,
        cota_msnm=1250.00,
        tipo_fuente="RIO_PRINCIPAL",
        api_key_hash="hash_key_conduccion_secure_02",
        intervalo_envio_min=15,
        descripcion="Punto de mezcla y cálculo de Lead Time de contaminantes hacia los canales de derivación."
    )
    n3 = Nodo(
        id_nodo="NODO-03-PARCELA",
        id_entidad_responsable=3,
        nombre="Estación Bocatoma Parcela Piloto Huayopampa",
        sector_cuenca="PARCELA_PILOTO",
        subcuenca="Añasmayo",
        latitud=-11.4521000,
        longitud=-77.0145000,
        cota_msnm=320.00,
        tipo_fuente="BOCATOMA_PARCELA",
        api_key_hash="hash_key_parcela_secure_03",
        intervalo_envio_min=10,
        descripcion="Auditoría de volumen de riego y protección inmediata de frutales contra estrés osmótico."
    )
    db.add_all([n1, n2, n3])
    db.commit()

    # Calibraciones
    c1 = CalibracionNodo(
        id_nodo="NODO-01-CABECERA",
        ph_offset_v=2.5000,
        ph_slope=-0.1800,
        tds_factor_k=0.5000,
        tds_offset_v=0.0000,
        turb_v_clear=4.2500,
        turb_v_turbid=2.5000,
        distancia_fondo_sensor_cm=150.00,
        caudal_coef_k=1.4500,
        caudal_exp_n=1.6000,
        calibrado_por="Ing. Hidráulico ANA"
    )
    c2 = CalibracionNodo(
        id_nodo="NODO-02-CONDUCCION",
        ph_offset_v=2.4800,
        ph_slope=-0.1800,
        tds_factor_k=0.5000,
        tds_offset_v=0.0000,
        turb_v_clear=4.2000,
        turb_v_turbid=2.4000,
        distancia_fondo_sensor_cm=200.00,
        caudal_coef_k=2.1000,
        caudal_exp_n=1.5500,
        calibrado_por="Equipo Técnico Junta"
    )
    c3 = CalibracionNodo(
        id_nodo="NODO-03-PARCELA",
        ph_offset_v=2.5100,
        ph_slope=-0.1800,
        tds_factor_k=0.5000,
        tds_offset_v=0.0000,
        turb_v_clear=4.1500,
        turb_v_turbid=2.3500,
        distancia_fondo_sensor_cm=100.00,
        caudal_coef_k=0.8500,
        caudal_exp_n=1.5000,
        calibrado_por="Operador Huayopampa"
    )
    db.add_all([c1, c2, c3])

    # Umbrales
    u1 = UmbralConfig(
        id_nodo="NODO-01-CABECERA",
        ph_min_alerta=6.50,
        ph_max_alerta=8.50,
        ec_max_advertencia_us_cm=800.00,
        ec_max_critico_us_cm=1200.00,
        tds_max_alerta_ppm=600.00,
        turb_max_alerta_ntu=30.00,
        tirante_min_alerta_cm=15.00,
        bateria_min_alerta_v=11.50
    )
    u2 = UmbralConfig(
        id_nodo="NODO-02-CONDUCCION",
        ph_min_alerta=6.50,
        ph_max_alerta=8.50,
        ec_max_advertencia_us_cm=1000.00,
        ec_max_critico_us_cm=1500.00,
        tds_max_alerta_ppm=750.00,
        turb_max_alerta_ntu=50.00,
        tirante_min_alerta_cm=20.00,
        bateria_min_alerta_v=11.50
    )
    u3 = UmbralConfig(
        id_nodo="NODO-03-PARCELA",
        ph_min_alerta=6.50,
        ph_max_alerta=8.50,
        ec_max_advertencia_us_cm=1200.00,
        ec_max_critico_us_cm=1500.00,
        tds_max_alerta_ppm=750.00,
        turb_max_alerta_ntu=40.00,
        tirante_min_alerta_cm=10.00,
        bateria_min_alerta_v=11.50
    )
    db.add_all([u1, u2, u3])

    # Destinatarios
    d1 = DestinatarioAlerta(
        id_entidad=3,
        id_nodo_suscrito="NODO-03-PARCELA",
        nombre_completo="Juan Carlos Mendoza Quispe",
        dni_ruc="45892147",
        telefono_whatsapp="+51987654321",
        rol_usuario="AGRICULTOR",
        tipo_cultivo="Melocotón Blanquillo",
        sector_predio="Sector Huayopampa Alta - Parcela 12",
        recibe_alertas_calidad=True,
        recibe_alertas_caudal=True,
        recibe_reporte_diario=True
    )
    d2 = DestinatarioAlerta(
        id_entidad=2,
        id_nodo_suscrito="NODO-02-CONDUCCION",
        nombre_completo="Mario Alberto Robles",
        dni_ruc="10293847",
        telefono_whatsapp="+51976543210",
        rol_usuario="TOMERO",
        sector_predio="Compuerta Principal Sector Acos",
        recibe_alertas_calidad=True,
        recibe_alertas_caudal=True,
        recibe_reporte_diario=False
    )
    d3 = DestinatarioAlerta(
        id_entidad=1,
        id_nodo_suscrito="NODO-01-CABECERA",
        nombre_completo="Ing. Patricia Villanueva (Especialista ANA)",
        dni_ruc="41235689",
        telefono_whatsapp="+51965432109",
        rol_usuario="ESPECIALISTA_ANA",
        sector_predio="Consejo de Cuenca Chancay-Huaral",
        recibe_alertas_calidad=True,
        recibe_alertas_caudal=True,
        recibe_reporte_diario=True
    )
    db.add_all([d1, d2, d3])
    db.commit()


def init_db(db: Session = None, seed_demo_nodes: bool = False):
    """
    Crea las tablas en la base de datos si no existen.
    Garantiza que la base de datos arranque 100% limpia (0 entidades, 0 nodos, 0 registros)
    para que el usuario gestione sus propias entidades y nodos desde la Web App.
    """
    Base.metadata.create_all(bind=engine)
    
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        # Solo sembrar nodos si se solicita explícitamente (ej: en suites de tests automatizados)
        if seed_demo_nodes:
            seed_mvp_demo_nodes(db)
            
        logger.info("Base de datos inicializada limpia y lista para registro descentralizado.")
    except Exception as e:
        logger.error(f"Error inicializando base de datos: {e}")
        db.rollback()
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    init_db()
