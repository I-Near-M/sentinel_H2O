import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey, BigInteger, SmallInteger
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

# Clave primaria adaptable para MySQL (BigInteger) y SQLite (Integer AUTOINCREMENT)
AutoBigIntPK = BigInteger().with_variant(Integer, "sqlite")


# ========================================================================================
# 1. ENTIDADES / ORGANIZACIONES
# ========================================================================================
class Entidad(Base):
    __tablename__ = "entidades"

    id_entidad = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre_entidad = Column(String(150), nullable=False)
    tipo_entidad = Column(String(50), nullable=False, default="COMISION_REGANTES")
    ruc = Column(String(20), nullable=True)
    telefono_contacto = Column(String(30), nullable=True)
    email_contacto = Column(String(100), nullable=True)
    direccion = Column(String(200), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    usuarios = relationship("Usuario", back_populates="entidad")
    nodos = relationship("Nodo", back_populates="entidad")
    destinatarios = relationship("DestinatarioAlerta", back_populates="entidad")
    turnos = relationship("TurnoRiego", back_populates="entidad")


# ========================================================================================
# 1.1 USUARIOS (Autenticación JWT y RBAC de 4 Niveles)
# ========================================================================================
class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_entidad = Column(Integer, ForeignKey("entidades.id_entidad", ondelete="SET NULL"), nullable=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    telefono_contacto = Column(String(30), nullable=True)
    cargo_institucional = Column(String(100), nullable=True)
    rol = Column(String(50), default="AUDITOR_VISOR", nullable=False)  # ADMIN_SISTEMA, OPERADOR_JUNTA, TOMERO_COMISION, AUDITOR_VISOR
    activo = Column(Boolean, default=True, nullable=False)
    ultimo_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    entidad = relationship("Entidad", back_populates="usuarios")
    nodos_creados = relationship("Nodo", back_populates="creador")
    calibraciones = relationship("CalibracionNodo", back_populates="calibrador")
    destinatarios_registrados = relationship("DestinatarioAlerta", back_populates="registrador")
    simulaciones_ejecutadas = relationship("SimulacionWhatIf", back_populates="ejecutor")
    auditorias = relationship("AuditoriaLog", back_populates="usuario")


# ========================================================================================
# 1.2 LOGS DE AUDITORÍA FORENSE (Trazabilidad Inmutable)
# ========================================================================================
class AuditoriaLog(Base):
    __tablename__ = "auditoria_logs"

    id_audit = Column(AutoBigIntPK, primary_key=True, index=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True, index=True)
    email_usuario = Column(String(120), nullable=True)
    accion = Column(String(50), nullable=False, index=True)
    tabla_afectada = Column(String(50), nullable=False, index=True)
    id_registro_afectado = Column(String(100), nullable=True)
    valores_previos_json = Column(JSON, nullable=True)
    valores_nuevos_json = Column(JSON, nullable=True)
    ip_origen = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)

    usuario = relationship("Usuario", back_populates="auditorias")


# ========================================================================================
# 2. NODOS TELEMÉTRICOS
# ========================================================================================
class Nodo(Base):
    __tablename__ = "nodos"

    id_nodo = Column(String(50), primary_key=True, index=True)
    id_entidad_responsable = Column(Integer, ForeignKey("entidades.id_entidad"), nullable=True)
    creado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    nombre = Column(String(100), nullable=False)
    sector_cuenca = Column(String(50), nullable=False)
    subcuenca = Column(String(100), nullable=False)
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)
    cota_msnm = Column(Float, nullable=False)
    tipo_fuente = Column(String(50), nullable=False)
    api_key_hash = Column(String(128), nullable=False)
    intervalo_envio_min = Column(Integer, default=15, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    entidad = relationship("Entidad", back_populates="nodos")
    creador = relationship("Usuario", back_populates="nodos_creados")
    calibraciones = relationship("CalibracionNodo", back_populates="nodo", cascade="all, delete-orphan")
    mediciones_raw = relationship("MedicionRaw", back_populates="nodo", cascade="all, delete-orphan")
    mediciones_procesadas = relationship("MedicionProcesada", back_populates="nodo", cascade="all, delete-orphan")
    clima = relationship("ClimaOpenWeather", back_populates="nodo", cascade="all, delete-orphan")
    umbral = relationship("UmbralConfig", back_populates="nodo", uselist=False, cascade="all, delete-orphan")
    destinatarios = relationship("DestinatarioAlerta", back_populates="nodo")
    alertas = relationship("AlertaLog", back_populates="nodo", cascade="all, delete-orphan")
    turnos = relationship("TurnoRiego", back_populates="nodo")
    predicciones = relationship("PrediccionIA", back_populates="nodo", cascade="all, delete-orphan")


# ========================================================================================
# 3. CALIBRACIONES DE NODO
# ========================================================================================
class CalibracionNodo(Base):
    __tablename__ = "calibraciones_nodo"

    id_calibracion = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_nodo = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False)
    calibrado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    ph_offset_v = Column(Float, default=2.5000, nullable=False)
    ph_slope = Column(Float, default=-0.1800, nullable=False)
    tds_factor_k = Column(Float, default=0.5000, nullable=False)
    tds_offset_v = Column(Float, default=0.0000, nullable=False)
    turb_v_clear = Column(Float, default=4.2000, nullable=False)
    turb_v_turbid = Column(Float, default=2.5000, nullable=False)
    distancia_fondo_sensor_cm = Column(Float, nullable=False)
    caudal_coef_k = Column(Float, default=1.0000, nullable=False)
    caudal_exp_n = Column(Float, default=1.5000, nullable=False)
    fecha_calibracion = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    calibrado_por = Column(String(100), nullable=True)
    es_vigente = Column(Boolean, default=True, nullable=False)

    nodo = relationship("Nodo", back_populates="calibraciones")
    calibrador = relationship("Usuario", back_populates="calibraciones")


# ========================================================================================
# 4. MEDICIONES RAW
# ========================================================================================
class MedicionRaw(Base):
    __tablename__ = "mediciones_raw"

    id_raw = Column(AutoBigIntPK, primary_key=True, index=True, autoincrement=True)
    id_nodo = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    timestamp_servidor = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)
    timestamp_dispositivo_ms = Column(BigInteger, nullable=True)
    raw_v_ph = Column(Float, nullable=False)
    raw_v_tds = Column(Float, nullable=False)
    raw_v_turb = Column(Float, nullable=False)
    raw_dist_cm = Column(Float, nullable=False)
    temp_agua_c = Column(Float, nullable=False)
    battery_v = Column(Float, nullable=False)
    signal_rssi = Column(SmallInteger, nullable=True)
    payload_json_backup = Column(JSON, nullable=True)

    nodo = relationship("Nodo", back_populates="mediciones_raw")
    medicion_procesada = relationship("MedicionProcesada", back_populates="raw", uselist=False, cascade="all, delete-orphan")


# ========================================================================================
# 5. MEDICIONES PROCESADAS
# ========================================================================================
class MedicionProcesada(Base):
    __tablename__ = "mediciones_procesadas"

    id_proc = Column(AutoBigIntPK, primary_key=True, index=True, autoincrement=True)
    id_raw = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("mediciones_raw.id_raw", ondelete="CASCADE"), nullable=False, unique=True)
    id_nodo = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    ph = Column(Float, nullable=False)
    tds_ppm = Column(Float, nullable=False)
    ec_us_cm = Column(Float, nullable=False)
    turbidez_ntu = Column(Float, nullable=False)
    temp_agua_c = Column(Float, nullable=False)
    tirante_agua_cm = Column(Float, nullable=False)
    caudal_m3s = Column(Float, nullable=False)
    caudal_ls = Column(Float, nullable=False)
    wqi_score = Column(Float, nullable=False)
    wqi_categoria = Column(String(30), nullable=False)
    estado_salinidad = Column(String(30), nullable=False)
    estado_ph = Column(String(30), nullable=False)

    raw = relationship("MedicionRaw", back_populates="medicion_procesada")
    nodo = relationship("Nodo", back_populates="mediciones_procesadas")
    alertas = relationship("AlertaLog", back_populates="medicion_procesada")


# ========================================================================================
# 6. CLIMA OPENWEATHERMAP
# ========================================================================================
class ClimaOpenWeather(Base):
    __tablename__ = "clima_openweather"

    id_clima = Column(AutoBigIntPK, primary_key=True, index=True, autoincrement=True)
    id_nodo = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    temp_ambiente_c = Column(Float, nullable=False)
    sensacion_termica_c = Column(Float, nullable=True)
    humedad_pct = Column(Float, nullable=False)
    presion_hpa = Column(Float, nullable=False)
    lluvia_1h_mm = Column(Float, default=0.0, nullable=False)
    lluvia_3h_mm = Column(Float, default=0.0, nullable=False)
    nubosidad_pct = Column(SmallInteger, default=0, nullable=False)
    viento_vel_ms = Column(Float, nullable=True)
    viento_dir_deg = Column(SmallInteger, nullable=True)
    condicion_principal = Column(String(50), nullable=False)
    descripcion_clima = Column(String(100), nullable=False)
    icono_codigo = Column(String(10), nullable=True)

    nodo = relationship("Nodo", back_populates="clima")


# ========================================================================================
# 7. UMBRALES DE CONFIGURACIÓN
# ========================================================================================
class UmbralConfig(Base):
    __tablename__ = "umbrales_config"

    id_umbral = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_nodo = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, unique=True)
    ph_min_alerta = Column(Float, default=6.50, nullable=False)
    ph_max_alerta = Column(Float, default=8.50, nullable=False)
    ec_max_advertencia_us_cm = Column(Float, default=1200.00, nullable=False)
    ec_max_critico_us_cm = Column(Float, default=1500.00, nullable=False)
    tds_max_alerta_ppm = Column(Float, default=750.00, nullable=False)
    turb_max_alerta_ntu = Column(Float, default=50.00, nullable=False)
    tirante_min_alerta_cm = Column(Float, default=10.00, nullable=False)
    bateria_min_alerta_v = Column(Float, default=11.50, nullable=False)
    fecha_actualizacion = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    nodo = relationship("Nodo", back_populates="umbral")


# ========================================================================================
# 8. DESTINATARIOS DE ALERTAS (Multientidad)
# ========================================================================================
class DestinatarioAlerta(Base):
    __tablename__ = "destinatarios_alertas"

    id_destinatario = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_entidad = Column(Integer, ForeignKey("entidades.id_entidad", ondelete="CASCADE"), nullable=False, index=True)
    id_nodo_suscrito = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    registrado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    nombre_completo = Column(String(150), nullable=False)
    dni_ruc = Column(String(20), nullable=True)
    telefono_whatsapp = Column(String(30), nullable=False)
    email = Column(String(100), nullable=True)
    rol_usuario = Column(String(50), nullable=False, default="AGRICULTOR")
    tipo_cultivo = Column(String(100), nullable=True)
    sector_predio = Column(String(100), nullable=True)
    recibe_alertas_calidad = Column(Boolean, default=True, nullable=False)
    recibe_alertas_caudal = Column(Boolean, default=True, nullable=False)
    recibe_reporte_diario = Column(Boolean, default=False, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    entidad = relationship("Entidad", back_populates="destinatarios")
    nodo = relationship("Nodo", back_populates="destinatarios")
    registrador = relationship("Usuario", back_populates="destinatarios_registrados")
    turnos = relationship("TurnoRiego", back_populates="destinatario")


# ========================================================================================
# 9. LOG DE ALERTAS
# ========================================================================================
class AlertaLog(Base):
    __tablename__ = "alertas_log"

    id_alerta = Column(AutoBigIntPK, primary_key=True, index=True, autoincrement=True)
    id_nodo = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    id_proc = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("mediciones_procesadas.id_proc", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)
    nivel_severidad = Column(String(30), nullable=False)
    tipo_evento = Column(String(50), nullable=False)
    variable_origen = Column(String(50), nullable=False)
    valor_registrado = Column(Float, nullable=False)
    valor_umbral = Column(Float, nullable=False)
    mensaje_tecnico = Column(Text, nullable=False)
    mensaje_campesino_whatsapp = Column(Text, nullable=False)
    estado_envio_whatsapp = Column(String(30), default="PENDIENTE", nullable=False)
    destinatarios_notificados_count = Column(Integer, default=0, nullable=False)
    fecha_envio = Column(DateTime, nullable=True)

    nodo = relationship("Nodo", back_populates="alertas")
    medicion_procesada = relationship("MedicionProcesada", back_populates="alertas")


# ========================================================================================
# 10. TURNOS DE RIEGO / AUDITORÍA DE "LA MITA"
# ========================================================================================
class TurnoRiego(Base):
    __tablename__ = "turnos_riego"

    id_turno = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_entidad = Column(Integer, ForeignKey("entidades.id_entidad", ondelete="CASCADE"), nullable=False)
    id_destinatario = Column(Integer, ForeignKey("destinatarios_alertas.id_destinatario", ondelete="CASCADE"), nullable=False)
    id_nodo = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False)
    fecha_inicio_programada = Column(DateTime, nullable=False)
    fecha_fin_programada = Column(DateTime, nullable=False)
    horas_programadas = Column(Float, nullable=False)
    caudal_acordado_ls = Column(Float, nullable=False)
    volumen_programado_m3 = Column(Float, nullable=False)
    volumen_real_entregado_m3 = Column(Float, default=0.0, nullable=False)
    cumplimiento_pct = Column(Float, default=0.0, nullable=False)
    estado_turno = Column(String(50), default="PROGRAMADO", nullable=False)
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    entidad = relationship("Entidad", back_populates="turnos")
    destinatario = relationship("DestinatarioAlerta", back_populates="turnos")
    nodo = relationship("Nodo", back_populates="turnos")


# ========================================================================================
# 11. PREDICCIONES IA
# ========================================================================================
class PrediccionIA(Base):
    __tablename__ = "predicciones_ia"

    id_prediccion = Column(AutoBigIntPK, primary_key=True, index=True, autoincrement=True)
    id_nodo = Column(String(50), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    fecha_emision = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    horizonte_horas = Column(SmallInteger, nullable=False)
    fecha_proyectada = Column(DateTime, nullable=False, index=True)
    caudal_predicho_m3s = Column(Float, nullable=False)
    wqi_predicho = Column(Float, nullable=False)
    ph_predicho = Column(Float, nullable=False)
    ec_predicho_us_cm = Column(Float, nullable=False)
    riesgo_estres_hidrico = Column(String(30), nullable=False)
    lead_time_horas_llegada_pluma = Column(Float, nullable=True)
    modelo_version = Column(String(50), default="GRU-Shallow-v1.0", nullable=False)

    nodo = relationship("Nodo", back_populates="predicciones")


# ========================================================================================
# 12. SIMULACIONES WHAT-IF
# ========================================================================================
class SimulacionWhatIf(Base):
    __tablename__ = "simulaciones_whatif"

    id_simulacion = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_entidad = Column(Integer, ForeignKey("entidades.id_entidad", ondelete="SET NULL"), nullable=True)
    ejecutado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    titulo_escenario = Column(String(150), nullable=False)
    fecha_ejecucion = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    delta_precipitacion_pct = Column(Float, default=0.0, nullable=False)
    delta_salinidad_us_cm = Column(Float, default=0.0, nullable=False)
    delta_caudal_cabecera_pct = Column(Float, default=0.0, nullable=False)
    resultado_wqi_valle = Column(Float, nullable=False)
    resultado_caudal_valle_m3s = Column(Float, nullable=False)
    resumen_impacto = Column(Text, nullable=False)
    ejecutado_por = Column(String(100), nullable=True)

    ejecutor = relationship("Usuario", back_populates="simulaciones_ejecutadas")


# ========================================================================================
# 13. CONFIGURACIÓN DINÁMICA DEL SISTEMA Y CUENCA (Open Source Agnóstico)
# ========================================================================================
class ConfiguracionSistema(Base):
    __tablename__ = "configuracion_sistema"

    id_config = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre_cuenca = Column(String(150), nullable=False, default="Cuenca Chancay-Huaral")
    pais_region = Column(String(100), nullable=False, default="Lima, Perú")
    descripcion_cuenca = Column(Text, nullable=True)
    latitud_centro = Column(Float, nullable=False, default=-11.49)
    longitud_centro = Column(Float, nullable=False, default=-77.05)
    zoom_inicial = Column(Integer, nullable=False, default=10)
    dashboards_grafana_json = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    actualizado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)

    actualizador = relationship("Usuario")

