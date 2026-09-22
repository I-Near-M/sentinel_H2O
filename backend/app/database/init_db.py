import logging
import uuid
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from backend.app.database.session import engine, Base, SessionLocal
from backend.app.database.models import (
    TipoEntidad, CargoInstitucional, TipoUsoAgua, Entidad, Usuario, RolSistema,
    TipoRecursoHidrico, ConfiguracionRecursoHidrico, Nodo, CalibracionNodo, CalibracionSeccionHidraulica, PuntoSeccionCalibracion,
    UmbralConfig, DestinatarioAlerta, CultivoAgricola, ModeloIA, AnomaliaDetectadaIA,
    EstadisticaRegionalAgro, PerfilRiesgoRegionalAgro, IntencionSiembraAgro
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def sync_sqlite_schema_if_needed():
    """
    En entornos de desarrollo local / pruebas que usan SQLite,
    verifica si las tablas existentes tienen el esquema normalizado con modelos_ia, cultivos_agricolas y tablas MIDAGRI.
    Si detecta una versión antigua, regenera las tablas limpias.
    """
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if "nodos" in tables:
            cols = [c["name"] for c in inspector.get_columns("nodos")]
            if (
                "codigo_estacion" not in cols
                or "cultivos_agricolas" not in tables
                or "modelos_ia" not in tables
                or "tipos_recurso_hidrico" not in tables
                or "estadisticas_regionales_agro" not in tables
                or "roles_sistema" not in tables
            ):
                logger.info("Detectado esquema SQLite desactualizado. Actualizando tablas a la arquitectura 3NF/4NF con IA y MIDAGRI...")
                Base.metadata.drop_all(bind=engine)
                Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Aviso al verificar esquema SQLite: {e}")


def seed_base_catalogs(db: Session):
    """
    Siembra los catálogos base universales (3NF/4NF):
    - roles_sistema
    - tipos_entidad
    - cargos_institucionales
    - tipos_uso_agua
    - Entidad raíz de la plataforma
    - Singleton de configuración del recurso hídrico
    """
    # 0. Roles del Sistema RBAC Normalizado
    if db.query(RolSistema).count() == 0:
        logger.info("Sembrando catálogo base de roles del sistema...")
        roles = [
            RolSistema(
                codigo_rol="ADMIN_SISTEMA",
                nombre_amigable="Superadministrador de Plataforma",
                descripcion="Control maestro integral: configuración de cuenca, aprovisionamiento de estaciones, gestión institucional y auditoría forense inmutable.",
                nivel_jerarquia=1,
                grupo_multiuso="ADMINISTRACION",
                permisos_json=["MANAGE_TENANT", "MANAGE_NODES", "CALIBRATE_SENSORS", "MANAGE_USERS", "VIEW_AUDIT", "MANAGE_WATER_RIGHTS", "DISPATCH_ALERTS", "EXECUTE_ML_MODELS", "MANAGE_MAINTENANCE"],
                activo=True
            ),
            RolSistema(
                codigo_rol="OPERADOR_CENTRAL",
                nombre_amigable="Operador de Centro de Control de Cuenca",
                descripcion="Despacho hidráulico general, monitoreo de toda la red de estaciones, ejecución de simulación What-If, balance hídrico y despacho de alertas tempranas.",
                nivel_jerarquia=2,
                grupo_multiuso="CUENCA_GLOBAL",
                permisos_json=["VIEW_TELEMETRY", "DISPATCH_ALERTS", "EXECUTE_ML_MODELS", "VIEW_WATER_BALANCE", "MANAGE_TURNS", "VIEW_AUDIT_LOGS"],
                activo=True
            ),
            RolSistema(
                codigo_rol="TECNICO_MANTENIMIENTO",
                nombre_amigable="Técnico Especialista de Mantenimiento & Hardware",
                descripcion="Intervención técnica en estaciones hidrométricas, calibración física de sondas, aforo con molinete y regletas, mantenimiento preventivo/correctivo y actualización de firmware.",
                nivel_jerarquia=3,
                grupo_multiuso="MANTENIMIENTO_IOT",
                permisos_json=["VIEW_TELEMETRY", "CALIBRATE_SENSORS", "MANAGE_MAINTENANCE", "UPDATE_FIRMWARE", "LOG_FIELD_INCIDENT"],
                activo=True
            ),
            RolSistema(
                codigo_rol="OPERADOR_AGRARIO",
                nombre_amigable="Operador de Riego Agrario & Juntas de Usuarios",
                descripcion="Gestión de mita hídrica agrícola, entrega de dotación en bocatomas, comisiones de regantes y monitoreo de salinidad y conductividad para cultivos.",
                nivel_jerarquia=3,
                grupo_multiuso="AGRARIO",
                permisos_json=["VIEW_TELEMETRY", "MANAGE_TURNS", "CONFIRM_WATER_DELIVERY", "RECEIVE_ALERTS", "MANAGE_RECIPIENTS"],
                activo=True
            ),
            RolSistema(
                codigo_rol="OPERADOR_SANEAMIENTO",
                nombre_amigable="Operador de Agua Potable & Saneamiento (JASS / EPS)",
                descripcion="Supervisión de captaciones de agua para consumo humano, monitoreo riguroso de turbidez y pH para plantas de tratamiento y aviso por sedimentos anómalos.",
                nivel_jerarquia=3,
                grupo_multiuso="POBLACIONAL",
                permisos_json=["VIEW_TELEMETRY", "VIEW_WATER_BALANCE", "RECEIVE_ALERTS", "LOG_FIELD_INCIDENT"],
                activo=True
            ),
            RolSistema(
                codigo_rol="OPERADOR_ACUICOLA",
                nombre_amigable="Operador de Piscicultura & Recursos Acuícolas",
                descripcion="Control de calidad de agua en pozas de truchicultura/piscigranjas, monitoreo de temperatura, oxígeno disuelto y alertas de estrés térmico u osmótico.",
                nivel_jerarquia=3,
                grupo_multiuso="ACUICOLA",
                permisos_json=["VIEW_TELEMETRY", "RECEIVE_ALERTS", "LOG_FIELD_INCIDENT"],
                activo=True
            ),
            RolSistema(
                codigo_rol="FISCALIZADOR_VEEDOR",
                nombre_amigable="Auditor Hídrico & Fiscalizador (ANA / OEFA / Veedor)",
                descripcion="Fiscalización y veeduría comunitaria: verificación inmutable de caudal ecológico, calidad de efluentes según ECA Agua y consulta de bitácora forense.",
                nivel_jerarquia=4,
                grupo_multiuso="FISCALIZACION",
                permisos_json=["VIEW_TELEMETRY", "VIEW_AUDIT_LOGS", "VIEW_WATER_BALANCE", "EXPORT_FORENSIC_DATA"],
                activo=True
            ),
            # Roles de compatibilidad heredada
            RolSistema(
                codigo_rol="OPERADOR_JUNTA",
                nombre_amigable="Operador de Junta de Usuarios (Legacy)",
                descripcion="Rol heredado compatible con Operador Agrario de Junta.",
                nivel_jerarquia=3,
                grupo_multiuso="AGRARIO",
                permisos_json=["VIEW_TELEMETRY", "CALIBRATE_SENSORS", "MANAGE_TURNS", "MANAGE_RECIPIENTS", "VIEW_ALERTS", "MANAGE_MAINTENANCE"],
                activo=True
            ),
            RolSistema(
                codigo_rol="TOMERO_COMISION",
                nombre_amigable="Tomero / Delegado de Comisión (Legacy)",
                descripcion="Rol heredado para tomero de campo en bocatoma.",
                nivel_jerarquia=3,
                grupo_multiuso="AGRARIO",
                permisos_json=["VIEW_LOCAL_TELEMETRY", "CONFIRM_WATER_DELIVERY", "LOG_FIELD_INCIDENT", "RECEIVE_ALERTS"],
                activo=True
            ),
            RolSistema(
                codigo_rol="AUDITOR_VISOR",
                nombre_amigable="Auditor Visor (Legacy)",
                descripcion="Rol heredado para auditor y fiscalizador.",
                nivel_jerarquia=4,
                grupo_multiuso="FISCALIZACION",
                permisos_json=["VIEW_TELEMETRY", "VIEW_AUDIT_LOGS", "VIEW_WATER_BALANCE", "EXPORT_FORENSIC_DATA"],
                activo=True
            )
        ]
        db.add_all(roles)
        db.commit()

    # 0.1 Tipos de Recurso Hídrico para el Gemelo Digital 3D
    if db.query(TipoRecursoHidrico).count() == 0:
        logger.info("Sembrando catálogo base de tipos de recurso hídrico para Gemelo 3D...")
        recursos = [
            TipoRecursoHidrico(
                id_tipo_recurso="TRH-01-RIO",
                codigo="RIO",
                nombre="Río / Cuenca Fluvial",
                descripcion="Cuerpo lótico continuo con cauce natural dinámico",
                permite_riego_defecto=True,
                permite_piscicultura_defecto=False,
                geometria_3d_tipo="LINEA_FLUJO"
            ),
            TipoRecursoHidrico(
                id_tipo_recurso="TRH-02-CUENCA",
                codigo="CUENCA",
                nombre="Cuenca Hidrográfica Integral",
                descripcion="Área orográfica drenada por un sistema de drenaje natural",
                permite_riego_defecto=True,
                permite_piscicultura_defecto=True,
                geometria_3d_tipo="MALLA_VOLUMETRICA"
            ),
            TipoRecursoHidrico(
                id_tipo_recurso="TRH-03-LAGUNA",
                codigo="LAGUNA",
                nombre="Laguna / Lago Andino",
                descripcion="Cuerpo léntico de almacenamiento natural en alta montaña",
                permite_riego_defecto=False,
                permite_piscicultura_defecto=True,
                geometria_3d_tipo="SUPERFICIE_POLIGONAL"
            ),
            TipoRecursoHidrico(
                id_tipo_recurso="TRH-04-EMBALSE",
                codigo="EMBALSE",
                nombre="Embalse / Presa Hidráulica",
                descripcion="Vaso de almacenamiento artificial regulado por compuertas",
                permite_riego_defecto=True,
                permite_piscicultura_defecto=True,
                geometria_3d_tipo="VOLUMEN_EMBALSE"
            ),
            TipoRecursoHidrico(
                id_tipo_recurso="TRH-05-CANAL",
                codigo="CANAL_RIEGO",
                nombre="Canal Principal de Riego / Derivación",
                descripcion="Conducto artificial prismático para transporte y entrega de agua",
                permite_riego_defecto=True,
                permite_piscicultura_defecto=False,
                geometria_3d_tipo="CANAL_PRISMATICO"
            ),
            TipoRecursoHidrico(
                id_tipo_recurso="TRH-06-ACUIFERO",
                codigo="ACUIFERO",
                nombre="Acuífero / Sector Subterráneo",
                descripcion="Estrato subterráneo permeable con pozos de monitoreo",
                permite_riego_defecto=True,
                permite_piscicultura_defecto=False,
                geometria_3d_tipo="ESTRATO_SUBTERRANEO"
            ),
            TipoRecursoHidrico(
                id_tipo_recurso="TRH-07-SECTOR",
                codigo="SECTOR_HIDROLOGICO",
                nombre="Sector Hidrológico Delimitado",
                descripcion="Polígono específico de gestión para una junta de usuarios",
                permite_riego_defecto=True,
                permite_piscicultura_defecto=True,
                geometria_3d_tipo="POLIGONO_SUPERFICIAL"
            )
        ]
        db.add_all(recursos)
        db.commit()

    # 1. Tipos de Entidad
    if db.query(TipoEntidad).count() == 0:
        logger.info("Sembrando catálogo base de tipos de entidad...")
        tipos = [
            TipoEntidad(
                id_tipo_entidad="TE-01-GOB-NACIONAL",
                codigo="GUBERNAMENTAL_NACIONAL",
                nombre="Autoridad Nacional del Agua / Ministerio",
                descripcion="Entidad gubernamental de máxima jerarquía en la gestión del recurso hídrico.",
                permite_gestion_riego=True,
                permite_gestion_piscicultura=True
            ),
            TipoEntidad(
                id_tipo_entidad="TE-02-JUNTA-USUARIOS",
                codigo="JUNTA_USUARIOS",
                nombre="Junta de Usuarios de Sector Hidráulico",
                descripcion="Organización representativa de usuarios de agua para administración de infraestructura mayor y distribución.",
                permite_gestion_riego=True,
                permite_gestion_piscicultura=False
            ),
            TipoEntidad(
                id_tipo_entidad="TE-03-COMISION-REGANTES",
                codigo="COMISION_REGANTES",
                nombre="Comisión o Comité de Regantes",
                descripcion="Organización de base de usuarios para distribución de turnos de riego a nivel de subcuenca o canal.",
                permite_gestion_riego=True,
                permite_gestion_piscicultura=False
            ),
            TipoEntidad(
                id_tipo_entidad="TE-04-EPS-POTABLE",
                codigo="EMPRESA_AGUA_POTABLE",
                nombre="Empresa Prestadora de Servicios de Saneamiento (EPS)",
                descripcion="Empresa encargada de captación y potabilización para consumo poblacional.",
                permite_gestion_riego=False,
                permite_gestion_piscicultura=False
            ),
            TipoEntidad(
                id_tipo_entidad="TE-05-ASOC-PISCICOLA",
                codigo="ASOCIACION_PISCICOLA",
                nombre="Asociación / Cooperativa Acuícola y Piscícola",
                descripcion="Productores acuícolas dedicados a la crianza de trucha o especies hidrobiológicas.",
                permite_gestion_riego=False,
                permite_gestion_piscicultura=True
            ),
            TipoEntidad(
                id_tipo_entidad="TE-06-INVESTIGACION",
                codigo="UNIVERSIDAD_INVESTIGACION",
                nombre="Universidad o Centro de Investigación Hidrológica",
                descripcion="Institución académica y científica dedicada al monitoreo ambiental y modelamiento.",
                permite_gestion_riego=True,
                permite_gestion_piscicultura=True
            ),
            TipoEntidad(
                id_tipo_entidad="TE-07-COMUNIDAD-RURAL",
                codigo="COMUNIDAD_CAMPESINA",
                nombre="Comunidad Campesina / Sector Rural",
                descripcion="Comunidades locales y comités de agua y saneamiento rural (JASS).",
                permite_gestion_riego=True,
                permite_gestion_piscicultura=True
            )
        ]
        db.add_all(tipos)
        db.commit()

    # 2. Cargos Institucionales
    if db.query(CargoInstitucional).count() == 0:
        logger.info("Sembrando catálogo base de cargos institucionales...")
        cargos = [
            CargoInstitucional(
                id_cargo="CARGO-01-ADMIN-ALA",
                id_tipo_entidad="TE-01-GOB-NACIONAL",
                codigo_cargo="ADMINISTRADOR_ALA",
                nombre_cargo="Administrador Local de Agua (ALA)",
                nivel_jerarquia=1,
                descripcion="Autoridad reguladora del agua en la cuenca"
            ),
            CargoInstitucional(
                id_cargo="CARGO-02-ESP-HIDRICO",
                id_tipo_entidad="TE-01-GOB-NACIONAL",
                codigo_cargo="ESPECIALISTA_RECURSOS_HIDRICOS",
                nombre_cargo="Especialista en Calidad de Agua",
                nivel_jerarquia=2,
                descripcion="Ingeniero supervisor de monitoreo ambiental"
            ),
            CargoInstitucional(
                id_cargo="CARGO-03-PRES-JUNTA",
                id_tipo_entidad="TE-02-JUNTA-USUARIOS",
                codigo_cargo="PRESIDENTE_JUNTA",
                nombre_cargo="Presidente de Junta de Usuarios",
                nivel_jerarquia=1,
                descripcion="Titular directivo de la Junta de Usuarios"
            ),
            CargoInstitucional(
                id_cargo="CARGO-04-GERENTE-TEC",
                id_tipo_entidad="TE-02-JUNTA-USUARIOS",
                codigo_cargo="GERENTE_TECNICO",
                nombre_cargo="Gerente Técnico de Operaciones",
                nivel_jerarquia=2,
                descripcion="Jefe de operaciones y distribución de caudales"
            ),
            CargoInstitucional(
                id_cargo="CARGO-05-SECTORISTA",
                id_tipo_entidad="TE-02-JUNTA-USUARIOS",
                codigo_cargo="SECTORISTA_DISTRIBUCION",
                nombre_cargo="Sectorista Hidráulico",
                nivel_jerarquia=3,
                descripcion="Técnico de aforo y balance de derivación"
            ),
            CargoInstitucional(
                id_cargo="CARGO-06-TOMERO",
                id_tipo_entidad="TE-03-COMISION-REGANTES",
                codigo_cargo="TOMERO_CANALERO",
                nombre_cargo="Tomero / Operador de Compuertas",
                nivel_jerarquia=4,
                descripcion="Operador de campo en bocatomas y canales"
            ),
            CargoInstitucional(
                id_cargo="CARGO-07-PRES-COMISION",
                id_tipo_entidad="TE-03-COMISION-REGANTES",
                codigo_cargo="PRESIDENTE_COMISION",
                nombre_cargo="Presidente de Comisión de Regantes",
                nivel_jerarquia=2,
                descripcion="Representante electo de los regantes del ramal"
            ),
            CargoInstitucional(
                id_cargo="CARGO-08-SUP-PISCICOLA",
                id_tipo_entidad="TE-05-ASOC-PISCICOLA",
                codigo_cargo="SUPERVISOR_PISCICOLA",
                nombre_cargo="Supervisor Técnico Acuícola",
                nivel_jerarquia=3,
                descripcion="Técnico a cargo de estanques de truchicultura"
            ),
            CargoInstitucional(
                id_cargo="CARGO-09-OP-ESTACION",
                id_tipo_entidad="TE-06-INVESTIGACION",
                codigo_cargo="OPERADOR_ESTACION",
                nombre_cargo="Operador de Estación Hidrométrica",
                nivel_jerarquia=3,
                descripcion="Técnico encargado del mantenimiento y aforos del nodo"
            ),
            CargoInstitucional(
                id_cargo="CARGO-10-USUARIO-GEN",
                id_tipo_entidad="TE-07-COMUNIDAD-RURAL",
                codigo_cargo="USUARIO_GENERAL",
                nombre_cargo="Comunero / Beneficiario del Agua",
                nivel_jerarquia=5,
                descripcion="Usuario final receptor de avisos y alertas"
            )
        ]
        db.add_all(cargos)
        db.commit()

    # 3. Tipos de Uso del Agua
    if db.query(TipoUsoAgua).count() == 0:
        logger.info("Sembrando catálogo base de tipos de uso del agua...")
        usos = [
            TipoUsoAgua(
                id_tipo_uso="USO-01-AGRARIO",
                codigo="AGRARIO_RIEGO",
                nombre="Uso Agrario y Riego Tecnificado / Gravedad",
                unidad_medida_demanda="l/s",
                parametros_optimos_json={"ec_max_us_cm": 1200.0, "ph_min": 6.5, "ph_max": 8.5}
            ),
            TipoUsoAgua(
                id_tipo_uso="USO-02-ACUICOLA",
                codigo="ACUICOLA_PISCICOLA",
                nombre="Uso Acuícola y Piscicultura de Agua Fría (Trucha)",
                unidad_medida_demanda="l/s",
                parametros_optimos_json={"temp_max_c": 17.0, "od_min_mgl": 5.5, "ph_min": 6.5, "ph_max": 8.5}
            ),
            TipoUsoAgua(
                id_tipo_uso="USO-03-POBLACIONAL",
                codigo="POBLACIONAL_POTABLE",
                nombre="Uso Poblacional y Abastecimiento Potable",
                unidad_medida_demanda="m3/dia",
                parametros_optimos_json={"turb_max_ntu": 5.0, "ph_min": 6.5, "ph_max": 8.5}
            ),
            TipoUsoAgua(
                id_tipo_uso="USO-04-ENERGETICO",
                codigo="ENERGETICO_HIDROELECTRICO",
                nombre="Uso Energético e Hidroeléctrico",
                unidad_medida_demanda="m3/s"
            ),
            TipoUsoAgua(
                id_tipo_uso="USO-05-INDUSTRIAL",
                codigo="INDUSTRIAL",
                nombre="Uso Industrial y Minero",
                unidad_medida_demanda="l/s"
            ),
            TipoUsoAgua(
                id_tipo_uso="USO-06-ECOLOGICO",
                codigo="ECOLOGICO_AMBIENTAL",
                nombre="Caudal Ecológico y Conservación Ambiental",
                unidad_medida_demanda="m3/s"
            )
        ]
        db.add_all(usos)
        db.commit()

    # 4. Entidad Raíz de Plataforma
    entidad_raiz = db.query(Entidad).first()
    if not entidad_raiz:
        logger.info("Registrando Entidad Raíz de Plataforma...")
        tipo_gob = db.query(TipoEntidad).first()
        if tipo_gob:
            entidad_raiz = Entidad(
                id_entidad="0191e4b5-0004-7000-8000-000000000001",
                id_tipo_entidad=tipo_gob.id_tipo_entidad,
                nombre_entidad="Sentinel-H2O Core Platform",
                ruc="20000000001",
                telefono_contacto="+51999999999",
                email_contacto="admin@sentinel-h2o.org",
                direccion="Sede Central de Gobernanza Digital",
                activo=True
            )
            db.add(entidad_raiz)
            db.commit()

    # 5. Singleton Inicial de Configuración del Recurso Hídrico
    config = db.query(ConfiguracionRecursoHidrico).first()
    if not config:
        logger.info("Inicializando registro Singleton de Recurso Hídrico...")
        tipo_rh = db.query(TipoRecursoHidrico).first()
        config = ConfiguracionRecursoHidrico(
            id_config="0191e4b5-0000-7000-8000-000000000001",
            nombre_recurso="Recurso Hídrico No Configurado",
            id_tipo_recurso=tipo_rh.id_tipo_recurso if tipo_rh else None,
            tipo_recurso="RIO",
            pais="Perú",
            region="Nacional",
            ubicacion_detallada="Configure este recurso hídrico desde la Sala de Situación de Sentinel-H2O.",
            latitud_centro=-11.49,
            longitud_centro=-77.05,
            zoom_inicial=10,
            id_entidad_administradora=entidad_raiz.id_entidad if entidad_raiz else None,
            modulo_riego_habilitado=True,
            modulo_piscicultura_habilitado=True,
            modulo_ia_habilitado=True,
            configuracion_inicial_completada=False,
            activo=True
        )
        db.add(config)
        db.commit()

    # 6. Catálogo Base de Modelos de IA
    seed_ai_models(db)

    # 7. Catálogo Dinámico de Cultivos (Condicional a Perú / MIDAGRI)
    seed_crops_catalog(db)


def seed_ai_models(db: Session):
    """
    Siembra el catálogo maestro de modelos MLOps / IA activos en Sentinel-H2O.
    """
    if db.query(ModeloIA).count() == 0:
        logger.info("Sembrando catálogo base de modelos de IA / MLOps...")
        modelos = [
            ModeloIA(
                id_modelo="0191e4b5-0010-7000-8000-000000000001",
                codigo_modelo="GRU_HYDROLOGIC_24H",
                nombre="Pronosticador Recurrente GRU Hidrológico 24h",
                tipo_modelo="SERIE_TEMPORAL",
                framework="PYTORCH",
                version="3.0.0",
                descripcion="Proyección horaria de caudal, WQI, pH, EC y riesgo hídrico con dinámica solar e inercia pluvial.",
                metricas_rendimiento_json={"rmse": 0.038, "mae": 0.024, "r2": 0.945, "nse": 0.912},
                hiperparametros_json={"lookback_hours": 48, "hidden_dim": 64, "num_layers": 2, "dropout": 0.15},
                activo=True
            ),
            ModeloIA(
                id_modelo="0191e4b5-0010-7000-8000-000000000002",
                codigo_modelo="ISOFOREST_ANOMALY_V1",
                nombre="Detector de Anomalías Online Isolation Forest",
                tipo_modelo="CLASIFICADOR_ANOMALIAS",
                framework="SCIKIT_LEARN",
                version="1.0.0",
                descripcion="Detección en tiempo real de eventos atípicos y contaminación mediante aislamiento de hiperplanos.",
                metricas_rendimiento_json={"contamination": 0.05, "f1_score": 0.92, "precision": 0.94},
                hiperparametros_json={"n_estimators": 50, "random_state": 42},
                activo=True
            ),
            ModeloIA(
                id_modelo="0191e4b5-0010-7000-8000-000000000003",
                codigo_modelo="MAAS_HOFFMAN_AGRO_V1",
                nombre="Motor de Estrés Osmótico Maas-Hoffman",
                tipo_modelo="ESTRES_AGRONOMICO",
                framework="HEURISTICO",
                version="2.0.0",
                descripcion="Cálculo de tolerancia de salinidad y merma de rendimiento de cosecha según extracto de saturación.",
                metricas_rendimiento_json={"error_estimacion_pct": 2.1},
                activo=True
            ),
            ModeloIA(
                id_modelo="0191e4b5-0010-7000-8000-000000000004",
                codigo_modelo="CASCADE_MANNING_ROUTING_V1",
                nombre="Enrutador Hidráulico de Onda Cinemática Manning",
                tipo_modelo="SIMULADOR_FISICO",
                framework="HEURISTICO",
                version="2.0.0",
                descripcion="Modelado de celeridad, tiempo de tránsito de plumas y atenuación de solutos nodo a nodo.",
                metricas_rendimiento_json={"error_celeridad_pct": 3.8},
                activo=True
            )
        ]
        db.add_all(modelos)
        db.commit()


def seed_crops_catalog(db: Session, force_peru: bool = False):
    """
    Siembra el catálogo agrícola dinámico en base de datos.
    Si la cuenca está configurada en Perú (o se fuerza), puebla automáticamente los cultivos MIDAGRI.
    """
    config = db.query(ConfiguracionRecursoHidrico).first()
    es_peru = force_peru or (config and ("peru" in (config.pais or "").lower() or "perú" in (config.pais or "").lower() or config.pais == "PE"))

    if db.query(CultivoAgricola).count() == 0 and es_peru:
        logger.info("Recurso hídrico en Perú detectado: sembrando catálogo agronómico oficial MIDAGRI en BD...")
        try:
            from backend.app.ml.midagri_processor import DEFAULT_CROPS_PARAMS
            cultivos = []
            for cid, data in DEFAULT_CROPS_PARAMS.items():
                cultivos.append(
                    CultivoAgricola(
                        id_cultivo=cid,
                        codigo_catalogo="MIDAGRI_PE",
                        pais_origen="Perú",
                        region_natural=data.get("region_natural", "Costa"),
                        nombre=data.get("name", cid),
                        categoria=data.get("category", "General"),
                        demanda_hidrica_m3_ha=float(data.get("water_demand_m3_ha", 6000.0)),
                        ec_umbral_us_cm=float(data.get("ec_threshold_us_cm", 1500.0)),
                        salinidad_pendiente_pct=float(data.get("salinity_slope_pct", 10.0)),
                        ph_min=float(data.get("ph_min", 6.0)),
                        ph_max=float(data.get("ph_max", 7.5)),
                        turbidez_max_ntu=float(data.get("turbidity_max_ntu", 50.0)),
                        temp_agua_min_c=float(data.get("temp_water_min_c", 12.0)),
                        temp_agua_max_c=float(data.get("temp_water_max_c", 26.0)),
                        wqi_min=float(data.get("wqi_min", 60.0)),
                        dias_ciclo_vegetativo=int(data.get("growth_cycle_days", 180)),
                        rendimiento_base_kg_ha=float(data.get("base_yield_kg_ha", 15000.0)),
                        precio_base_moneda_kg=float(data.get("base_price_s_kg", 3.0)),
                        moneda_codigo="PEN",
                        nivel_resiliencia=data.get("resilience_level", "Media"),
                        descripcion=data.get("description"),
                        activo=True
                    )
                )
            db.add_all(cultivos)
            db.commit()
            logger.info(f"Sembrados exitosamente {len(cultivos)} cultivos de MIDAGRI en BD.")

            # Sincronizar y persistir estadísticas históricas SIEA y perfiles de riesgo ENA
            try:
                from backend.app.ml.midagri_processor import midagri_processor
                midagri_processor.sync_midagri_to_db(db=db)
                logger.info("Persistidas exitosamente estadísticas y perfiles de riesgo MIDAGRI en BD.")
            except Exception as sync_err:
                logger.warning(f"Aviso al sincronizar analítica MIDAGRI a BD: {sync_err}")
        except Exception as e:
            logger.error(f"Error sembrando catálogo MIDAGRI: {e}")
            db.rollback()


def seed_mvp_demo_nodes(db: Session):
    """
    Función auxiliar para sembrar los 3 nodos de demostración iniciales (usado en tests y demos).
    Garantiza compatibilidad relacional con UUID v7 y el esquema 3NF/4NF.
    """
    # Primero asegurar catálogos base
    seed_base_catalogs(db)

    if db.query(Nodo).first():
        return

    logger.info("Sembrando entidades y los 3 nodos MVP de demostración para pruebas...")

    # Sembrar entidades de demo
    e1 = db.query(Entidad).filter(Entidad.id_entidad == "ENT-01-ANA").first()
    if not e1:
        e1 = Entidad(
            id_entidad="ENT-01-ANA",
            id_tipo_entidad="TE-01-GOB-NACIONAL",
            nombre_entidad="Autoridad Nacional del Agua (ANA)",
            ruc="20501234567",
            telefono_contacto="+51965432109",
            email_contacto="ala@ana.gob.pe",
            activo=True
        )
        db.add(e1)

    e2 = db.query(Entidad).filter(Entidad.id_entidad == "ENT-02-JUNTA").first()
    if not e2:
        e2 = Entidad(
            id_entidad="ENT-02-JUNTA",
            id_tipo_entidad="TE-02-JUNTA-USUARIOS",
            nombre_entidad="Junta de Usuarios del Sector Hidráulico Central",
            ruc="20489123456",
            telefono_contacto="+51976543210",
            email_contacto="contacto@junta-valle.org",
            activo=True
        )
        db.add(e2)

    e3 = db.query(Entidad).filter(Entidad.id_entidad == "ENT-03-COMISION").first()
    if not e3:
        e3 = Entidad(
            id_entidad="ENT-03-COMISION",
            id_tipo_entidad="TE-03-COMISION-REGANTES",
            nombre_entidad="Comisión de Regantes Huayopampa",
            ruc="20345678901",
            telefono_contacto="+51987654321",
            email_contacto="huayopampa@comision-regantes.org",
            activo=True
        )
        db.add(e3)

    db.commit()

    # Nodos
    n1 = Nodo(
        id_nodo="NODO-01-CABECERA",
        codigo_estacion="NODO-01-CABECERA",
        id_entidad_responsable="ENT-01-ANA",
        nombre="Estación Cabecera Lagunas Vichaycocha",
        tramo_sector="CUENCA_ALTA",
        subcuenca="Vichaycocha",
        latitud=-11.0254000,
        longitud=-76.5123000,
        cota_msnm=4350.00,
        tipo_fuente="LAGUNA_REPRESADA",
        api_key_hash="hash_key_cabecera_secure_01",
        intervalo_envio_min=15,
        activo=True,
        descripcion="Monitoreo de calidad de agua virgen de deshielo y control de lagunas represadas."
    )
    n2 = Nodo(
        id_nodo="NODO-02-CONDUCCION",
        codigo_estacion="NODO-02-CONDUCCION",
        id_entidad_responsable="ENT-02-JUNTA",
        nombre="Estación Conducción Central Acos - Santo Domingo",
        tramo_sector="CUENCA_MEDIA",
        subcuenca="Media",
        latitud=-11.2789000,
        longitud=-76.8241000,
        cota_msnm=1250.00,
        tipo_fuente="RIO_PRINCIPAL",
        api_key_hash="hash_key_conduccion_secure_02",
        intervalo_envio_min=15,
        activo=True,
        descripcion="Punto de mezcla y cálculo de Lead Time de contaminantes hacia los canales de derivación."
    )
    n3 = Nodo(
        id_nodo="NODO-03-PARCELA",
        codigo_estacion="NODO-03-PARCELA",
        id_entidad_responsable="ENT-03-COMISION",
        nombre="Estación Bocatoma Parcela Piloto Huayopampa",
        tramo_sector="PARCELA_PILOTO",
        subcuenca="Añasmayo",
        latitud=-11.4521000,
        longitud=-77.0145000,
        cota_msnm=320.00,
        tipo_fuente="BOCATOMA_PARCELA",
        api_key_hash="hash_key_parcela_secure_03",
        intervalo_envio_min=10,
        activo=True,
        descripcion="Auditoría de volumen de riego y protección inmediata de frutales contra estrés osmótico."
    )
    db.add_all([n1, n2, n3])
    db.commit()

    # Calibraciones con Molinete Hidrométrico y Perfil de Regletas
    c1 = CalibracionNodo(
        id_calibracion="CALIB-01-CABECERA",
        id_nodo="NODO-01-CABECERA",
        ph_offset_v=2.5000,
        ph_slope=-0.1800,
        tds_factor_k=0.5000,
        tds_offset_v=0.0000,
        turb_v_clear=4.2500,
        turb_v_turbid=2.5000,
        distancia_fondo_sensor_cm=150.00,
        es_vigente=True,
        activo=True,
        calibrado_por="Ing. Hidráulico ANA"
    )
    c2 = CalibracionNodo(
        id_calibracion="CALIB-02-CONDUCCION",
        id_nodo="NODO-02-CONDUCCION",
        ph_offset_v=2.4800,
        ph_slope=-0.1800,
        tds_factor_k=0.5000,
        tds_offset_v=0.0000,
        turb_v_clear=4.2000,
        turb_v_turbid=2.4000,
        distancia_fondo_sensor_cm=200.00,
        es_vigente=True,
        activo=True,
        calibrado_por="Equipo Técnico Junta"
    )
    c3 = CalibracionNodo(
        id_calibracion="CALIB-03-PARCELA",
        id_nodo="NODO-03-PARCELA",
        ph_offset_v=2.5100,
        ph_slope=-0.1800,
        tds_factor_k=0.5000,
        tds_offset_v=0.0000,
        turb_v_clear=4.1500,
        turb_v_turbid=2.3500,
        distancia_fondo_sensor_cm=100.00,
        es_vigente=True,
        activo=True,
        calibrado_por="Operador Huayopampa"
    )
    db.add_all([c1, c2, c3])
    db.commit()

    # Secciones Hidráulicas y Molinete Hall
    s1 = CalibracionSeccionHidraulica(
        id_seccion_calibracion="SEC-01-CABECERA",
        id_calibracion="CALIB-01-CABECERA",
        id_nodo="NODO-01-CABECERA",
        ancho_total_rio_m=4.00,
        molinete_constante_a=0.2500,
        molinete_constante_b=0.0500,
        coeficiente_friccion=0.0350,
        tipo_seccion="REGLETA_PUNTOS",
        profundidad_maxima_m=1.40,
        area_mojada_referencia_m2=2.85,
        numero_verticales_aforo=5,
        observaciones_aforo="Aforo batimétrico con molinete Hall en lecho rocoso irregular",
        es_vigente=True,
        activo=True
    )
    s2 = CalibracionSeccionHidraulica(
        id_seccion_calibracion="SEC-02-CONDUCCION",
        id_calibracion="CALIB-02-CONDUCCION",
        id_nodo="NODO-02-CONDUCCION",
        ancho_total_rio_m=2.00,
        molinete_constante_a=0.2500,
        molinete_constante_b=0.0500,
        coeficiente_friccion=0.0300,
        tipo_seccion="RECTANGULAR",
        ancho_solera_m=2.00,
        profundidad_maxima_m=1.80,
        area_mojada_referencia_m2=3.60,
        numero_verticales_aforo=3,
        observaciones_aforo="Canal de aducción rectangular revestido en concreto",
        es_vigente=True,
        activo=True
    )
    s3 = CalibracionSeccionHidraulica(
        id_seccion_calibracion="SEC-03-PARCELA",
        id_calibracion="CALIB-03-PARCELA",
        id_nodo="NODO-03-PARCELA",
        ancho_total_rio_m=1.00,
        molinete_constante_a=0.2500,
        molinete_constante_b=0.0500,
        coeficiente_friccion=0.0250,
        tipo_seccion="RECTANGULAR",
        ancho_solera_m=1.00,
        profundidad_maxima_m=0.80,
        area_mojada_referencia_m2=0.80,
        numero_verticales_aforo=2,
        observaciones_aforo="Canal de entrega secundario con compuerta plana",
        es_vigente=True,
        activo=True
    )
    db.add_all([s1, s2, s3])
    db.commit()

    # Puntos de sección transversal por regletas en Cabecera
    p1 = PuntoSeccionCalibracion(id_punto="PUNTO-01-CAB", id_seccion_calibracion="SEC-01-CABECERA", orden_punto=1, distancia_orilla_m=0.0, profundidad_lecho_m=0.0, ancho_subseccion_m=0.5, activo=True)
    p2 = PuntoSeccionCalibracion(id_punto="PUNTO-02-CAB", id_seccion_calibracion="SEC-01-CABECERA", orden_punto=2, distancia_orilla_m=1.0, profundidad_lecho_m=0.8, ancho_subseccion_m=1.0, activo=True)
    p3 = PuntoSeccionCalibracion(id_punto="PUNTO-03-CAB", id_seccion_calibracion="SEC-01-CABECERA", orden_punto=3, distancia_orilla_m=2.0, profundidad_lecho_m=1.4, ancho_subseccion_m=1.0, activo=True)
    p4 = PuntoSeccionCalibracion(id_punto="PUNTO-04-CAB", id_seccion_calibracion="SEC-01-CABECERA", orden_punto=4, distancia_orilla_m=3.0, profundidad_lecho_m=0.9, ancho_subseccion_m=1.0, activo=True)
    p5 = PuntoSeccionCalibracion(id_punto="PUNTO-05-CAB", id_seccion_calibracion="SEC-01-CABECERA", orden_punto=5, distancia_orilla_m=4.0, profundidad_lecho_m=0.0, ancho_subseccion_m=0.5, activo=True)
    db.add_all([p1, p2, p3, p4, p5])

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
        temperatura_max_piscicola_c=16.00,
        oxigeno_min_piscicola_mgl=6.00,
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
        temperatura_max_piscicola_c=18.00,
        oxigeno_min_piscicola_mgl=5.50,
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
        temperatura_max_piscicola_c=18.00,
        oxigeno_min_piscicola_mgl=5.00,
        bateria_min_alerta_v=11.50
    )
    db.add_all([u1, u2, u3])

    # Destinatarios
    d1 = DestinatarioAlerta(
        id_entidad="ENT-03-COMISION",
        id_tipo_uso="USO-01-AGRARIO",
        id_nodo_suscrito="NODO-03-PARCELA",
        nombres="Juan Carlos",
        apellidos="Mendoza Quispe",
        dni_ruc="45892147",
        telefono_whatsapp="+51987654321",
        rol_usuario="AGRICULTOR",
        detalle_actividad="Melocotón Blanquillo",
        sector_predio="Sector Huayopampa Alta - Parcela 12",
        recibe_alertas_calidad=True,
        recibe_alertas_caudal=True,
        recibe_reporte_diario=True,
        activo=True
    )
    d2 = DestinatarioAlerta(
        id_entidad="ENT-02-JUNTA",
        id_tipo_uso="USO-01-AGRARIO",
        id_nodo_suscrito="NODO-02-CONDUCCION",
        nombres="Mario Alberto",
        apellidos="Robles",
        dni_ruc="10293847",
        telefono_whatsapp="+51976543210",
        rol_usuario="TOMERO",
        detalle_actividad="Distribución Central",
        sector_predio="Compuerta Principal Sector Acos",
        recibe_alertas_calidad=True,
        recibe_alertas_caudal=True,
        recibe_reporte_diario=False,
        activo=True
    )
    d3 = DestinatarioAlerta(
        id_entidad="ENT-01-ANA",
        id_tipo_uso="USO-06-ECOLOGICO",
        id_nodo_suscrito="NODO-01-CABECERA",
        nombres="Patricia",
        apellidos="Villanueva",
        dni_ruc="41235689",
        telefono_whatsapp="+51965432109",
        rol_usuario="ESPECIALISTA_ANA",
        detalle_actividad="Monitoreo Cuenca Alta",
        sector_predio="Consejo de Recursos Hídricos",
        recibe_alertas_calidad=True,
        recibe_alertas_caudal=True,
        recibe_reporte_diario=True,
        activo=True
    )
    db.add_all([d1, d2, d3])
    db.commit()


def init_db(db: Session = None, seed_demo_nodes: bool = False):
    """
    Crea las tablas en la base de datos si no existen.
    Garantiza que la base de datos arranque 100% limpia (0 entidades, 0 nodos, 0 registros)
    para que el usuario gestione sus propias entidades y nodos desde la Web App.
    Siembra únicamente los catálogos base indispensables.
    """
    sync_sqlite_schema_if_needed()
    Base.metadata.create_all(bind=engine)

    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        # Siempre asegurar que existan los catálogos base universales
        seed_base_catalogs(db)

        # Sembrar nodos de demo si se solicita por parámetro o variable de entorno
        import os
        should_seed_demo = seed_demo_nodes or os.getenv("SEED_DEMO_DATA", "false").lower() in ["true", "1", "yes"]
        if should_seed_demo:
            seed_mvp_demo_nodes(db)

        logger.info("Base de datos inicializada y lista para registro descentralizado.")
    except Exception as e:
        logger.error(f"Error inicializando base de datos: {e}")
        db.rollback()
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    init_db()
