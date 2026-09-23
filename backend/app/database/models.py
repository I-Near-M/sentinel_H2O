import datetime
import uuid
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey, BigInteger, SmallInteger
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


import os
import time

def gen_uuid7_str() -> str:
    """Genera un UUID v7 monotónico en formato string según RFC 9562."""
    if hasattr(uuid, "uuid7"):
        return str(uuid.uuid7())
    # Generador compatible RFC 9562 para Python < 3.14 (Python 3.11 / 3.12 / 3.13)
    timestamp_ms = int(time.time() * 1000)
    rand_a = int.from_bytes(os.urandom(2), byteorder="big") & 0x0FFF
    rand_b = int.from_bytes(os.urandom(8), byteorder="big")
    high = (timestamp_ms << 16) | (0x7 << 12) | rand_a
    low = (0x2 << 62) | (rand_b & 0x3FFFFFFFFFFFFFFF)
    return str(uuid.UUID(int=(high << 64) | low))


# ========================================================================================
# 1. TIPOS DE ENTIDAD GESTORA (Catálogo Abierto Replicable)
# ========================================================================================
class TipoEntidad(Base):
    __tablename__ = "tipos_entidad"

    id_tipo_entidad = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    permite_gestion_riego = Column(Boolean, default=False, nullable=False)
    permite_gestion_piscicultura = Column(Boolean, default=False, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    cargos = relationship("CargoInstitucional", back_populates="tipo_entidad")
    entidades = relationship("Entidad", back_populates="tipo_entidad_rel")


# ========================================================================================
# 1.1 CARGOS INSTITUCIONALES (3NF / 4NF)
# ========================================================================================
class CargoInstitucional(Base):
    __tablename__ = "cargos_institucionales"

    id_cargo = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_tipo_entidad = Column(String(36), ForeignKey("tipos_entidad.id_tipo_entidad", ondelete="RESTRICT"), nullable=False, index=True)
    codigo_cargo = Column(String(50), nullable=False)
    nombre_cargo = Column(String(100), nullable=False)
    nivel_jerarquia = Column(Integer, default=1, nullable=False)
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    tipo_entidad = relationship("TipoEntidad", back_populates="cargos")
    usuarios = relationship("Usuario", back_populates="cargo")


# ========================================================================================
# 1.2 ENTIDADES / ORGANIZACIONES (Gobernanza Multientidad)
# ========================================================================================
class Entidad(Base):
    __tablename__ = "entidades"

    id_entidad = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_tipo_entidad = Column(String(36), ForeignKey("tipos_entidad.id_tipo_entidad", ondelete="RESTRICT"), nullable=False, index=True)
    nombre_entidad = Column(String(150), nullable=False)
    ruc = Column(String(20), nullable=True)
    telefono_contacto = Column(String(30), nullable=True)
    email_contacto = Column(String(100), nullable=True)
    direccion = Column(String(200), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    tipo_entidad_rel = relationship("TipoEntidad", back_populates="entidades")
    usuarios = relationship("Usuario", back_populates="entidad")
    nodos = relationship("Nodo", back_populates="entidad")
    destinatarios = relationship("DestinatarioAlerta", back_populates="entidad")
    turnos = relationship("TurnoRiego", back_populates="entidad")

    # Propiedad de compatibilidad con código anterior que esperaba un string enum
    @property
    def tipo_entidad(self) -> Optional[str]:
        if self.tipo_entidad_rel:
            return self.tipo_entidad_rel.codigo
        return "JUNTA_USUARIOS"

    @tipo_entidad.setter
    def tipo_entidad(self, val: Optional[str]):
        pass


# ========================================================================================
# 1.3 ROLES DEL SISTEMA (Catálogo RBAC Normalizado 3NF)
# ========================================================================================
class RolSistema(Base):
    __tablename__ = "roles_sistema"

    codigo_rol = Column(String(50), primary_key=True, index=True)
    nombre_amigable = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=False)
    nivel_jerarquia = Column(Integer, default=1, nullable=False)
    grupo_multiuso = Column(String(50), nullable=False)  # ADMINISTRACION, CUENCA_GLOBAL, MANTENIMIENTO_IOT, AGRARIO, POBLACIONAL, ACUICOLA, FISCALIZACION
    permisos_json = Column(JSON, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    usuarios = relationship("Usuario", back_populates="rol_rel")


# ========================================================================================
# 1.4 USUARIOS (Autenticación JWT, RBAC y Nombres Atómicos)
# ========================================================================================
class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_entidad = Column(String(36), ForeignKey("entidades.id_entidad", ondelete="SET NULL"), nullable=True, index=True)
    id_cargo = Column(String(36), ForeignKey("cargos_institucionales.id_cargo", ondelete="SET NULL"), nullable=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    telefono_contacto = Column(String(30), nullable=True)
    rol = Column(String(50), ForeignKey("roles_sistema.codigo_rol", onupdate="CASCADE", ondelete="RESTRICT"), default="AUDITOR_VISOR", nullable=False, index=True)
    activo = Column(Boolean, default=True, nullable=False)
    ultimo_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    entidad = relationship("Entidad", back_populates="usuarios")
    cargo = relationship("CargoInstitucional", back_populates="usuarios")
    rol_rel = relationship("RolSistema", back_populates="usuarios")
    nodos_creados = relationship("Nodo", back_populates="creador")
    calibraciones = relationship("CalibracionNodo", back_populates="calibrador")
    destinatarios_registrados = relationship("DestinatarioAlerta", back_populates="registrador")
    simulaciones_ejecutadas = relationship("SimulacionWhatIf", back_populates="ejecutor")
    auditorias = relationship("AuditoriaLog", back_populates="usuario")
    mantenimientos = relationship("MantenimientoNodo", back_populates="tecnico")

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombres} {self.apellidos}".strip()

    @nombre_completo.setter
    def nombre_completo(self, val: str):
        if val:
            parts = val.strip().split(" ", 1)
            self.nombres = parts[0]
            self.apellidos = parts[1] if len(parts) > 1 else "Usuario"
        else:
            self.nombres = "Usuario"
            self.apellidos = "Sistema"

    @property
    def cargo_institucional(self) -> Optional[str]:
        if self.cargo:
            return self.cargo.nombre_cargo
        return "Especialista Hídrico"

    @cargo_institucional.setter
    def cargo_institucional(self, val: Optional[str]):
        pass


# ========================================================================================
# 1.3 TIPOS DE RECURSO HÍDRICO (Catálogo Normalizado para el Gemelo Digital 3D)
# ========================================================================================
class TipoRecursoHidrico(Base):
    __tablename__ = "tipos_recurso_hidrico"

    id_tipo_recurso = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)  # CUENCA, RIO, LAGUNA, EMBALSE, CANAL_RIEGO, ACUIFERO, SECTOR_HIDROLOGICO
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    permite_riego_defecto = Column(Boolean, default=True, nullable=False)
    permite_piscicultura_defecto = Column(Boolean, default=False, nullable=False)
    geometria_3d_tipo = Column(String(50), default="LINEA_FLUJO", nullable=False)  # LINEA_FLUJO, SUPERFICIE_POLIGONAL, VOLUMEN_EMBALSE, CANAL_PRISMATICO
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    configuraciones = relationship("ConfiguracionRecursoHidrico", back_populates="tipo_recurso_rel")


# ========================================================================================
# 1.4 CONFIGURACIÓN DEL RECURSO HÍDRICO (Singleton de Gestión Hídrica)
# ========================================================================================
class ConfiguracionRecursoHidrico(Base):
    __tablename__ = "configuracion_recurso_hidrico"

    id_config = Column(String(36), primary_key=True, default=gen_uuid7_str)
    nombre_recurso = Column(String(150), nullable=False, default="Recurso Hídrico No Configurado")
    codigo_recurso = Column(String(50), default="RH-01", nullable=False)
    id_tipo_recurso = Column(String(36), ForeignKey("tipos_recurso_hidrico.id_tipo_recurso", ondelete="SET NULL"), nullable=True, index=True)
    tipo_recurso = Column(String(50), nullable=False, default="RIO")  # CUENCA, RIO, LAGUNA, EMBALSE, CANAL_RIEGO, ACUIFERO, SECTOR_HIDROLOGICO
    pais = Column(String(100), nullable=False, default="Perú")
    region = Column(String(100), nullable=False, default="Lima")
    cuenca_hidrografica = Column(String(100), nullable=True)
    sistema_hidrologico = Column(String(100), nullable=True)
    ubicacion_detallada = Column(Text, nullable=True)
    latitud_centro = Column(Float, nullable=False, default=-11.49)
    longitud_centro = Column(Float, nullable=False, default=-77.05)
    zoom_inicial = Column(Integer, nullable=False, default=10)
    cota_media_msnm = Column(Float, default=1200.0, nullable=True)
    superficie_km2 = Column(Float, default=3200.0, nullable=True)
    personal_encargado = Column(String(150), nullable=True)
    telefono_contacto_encargado = Column(String(30), nullable=True)
    email_contacto_encargado = Column(String(100), nullable=True)
    id_superadmin_responsable = Column(String(36), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    id_entidad_administradora = Column(String(36), ForeignKey("entidades.id_entidad", ondelete="SET NULL"), nullable=True)
    modulo_riego_habilitado = Column(Boolean, default=False, nullable=False)
    modulo_piscicultura_habilitado = Column(Boolean, default=False, nullable=False)
    modulo_ia_habilitado = Column(Boolean, default=True, nullable=False)
    configuracion_inicial_completada = Column(Boolean, default=False, nullable=False)
    version_sistema = Column(String(20), default="2.5.0", nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    tipo_recurso_rel = relationship("TipoRecursoHidrico", back_populates="configuraciones")
    superadmin = relationship("Usuario", foreign_keys=[id_superadmin_responsable])
    entidad = relationship("Entidad", foreign_keys=[id_entidad_administradora])

    # Propiedades de compatibilidad
    @property
    def nombre_cuenca(self) -> str:
        return self.nombre_recurso

    @nombre_cuenca.setter
    def nombre_cuenca(self, val: str):
        self.nombre_recurso = val

    @property
    def pais_region(self) -> str:
        return f"{self.region}, {self.pais}".strip(", ")

    @pais_region.setter
    def pais_region(self, val: str):
        if val:
            parts = [p.strip() for p in val.split(",")]
            if len(parts) > 1:
                self.region = parts[0]
                self.pais = parts[1]
            else:
                self.region = parts[0]

    @property
    def descripcion_cuenca(self) -> Optional[str]:
        return self.ubicacion_detallada

    @descripcion_cuenca.setter
    def descripcion_cuenca(self, val: Optional[str]):
        self.ubicacion_detallada = val

    @property
    def actualizado_por_usuario_id(self) -> Optional[str]:
        return self.id_superadmin_responsable

    @actualizado_por_usuario_id.setter
    def actualizado_por_usuario_id(self, val: Optional[str]):
        self.id_superadmin_responsable = val


# Alias de compatibilidad
ConfiguracionSistema = ConfiguracionRecursoHidrico


# ========================================================================================
# 1.5 LOGS DE AUDITORÍA FORENSE (Inmutable)
# ========================================================================================
class AuditoriaLog(Base):
    __tablename__ = "auditoria_logs"

    id_audit = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_usuario = Column(String(36), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True, index=True)
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
# 2. TIPOS DE USO DEL AGUA (Agricultura, Piscicultura, Poblacional, etc.)
# ========================================================================================
class TipoUsoAgua(Base):
    __tablename__ = "tipos_uso_agua"

    id_tipo_uso = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    unidad_medida_demanda = Column(String(30), default="l/s", nullable=False)
    parametros_optimos_json = Column(JSON, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    destinatarios = relationship("DestinatarioAlerta", back_populates="tipo_uso")


# ========================================================================================
# 3. NODOS TELEMÉTRICOS (Estaciones IoT)
# ========================================================================================
class Nodo(Base):
    __tablename__ = "nodos"

    id_nodo = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    codigo_estacion = Column(String(50), unique=True, nullable=False, index=True)
    id_entidad_responsable = Column(String(36), ForeignKey("entidades.id_entidad", ondelete="SET NULL"), nullable=True)
    creado_por_usuario_id = Column(String(36), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    nombre = Column(String(120), nullable=False)
    tramo_sector = Column(String(100), nullable=False)
    subcuenca = Column(String(100), nullable=True)
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)
    cota_msnm = Column(Float, nullable=False)
    tipo_fuente = Column(String(50), nullable=False)
    api_key_hash = Column(String(128), nullable=False)
    intervalo_envio_min = Column(Integer, default=15, nullable=False)
    estado_operativo = Column(String(30), default="ONLINE", nullable=False)  # ONLINE, OFFLINE, MANTENIMIENTO, DEBAJA
    activo = Column(Boolean, default=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    # Propiedad de compatibilidad con código anterior
    @property
    def sector_cuenca(self) -> str:
        return self.tramo_sector

    entidad = relationship("Entidad", back_populates="nodos")
    creador = relationship("Usuario", back_populates="nodos_creados")
    calibraciones = relationship("CalibracionNodo", back_populates="nodo")
    puntos_mantenimiento = relationship("MantenimientoNodo", back_populates="nodo")
    mediciones_raw = relationship("MedicionRaw", back_populates="nodo")
    mediciones_procesadas = relationship("MedicionProcesada", back_populates="nodo")
    clima = relationship("ClimaOpenWeather", back_populates="nodo", cascade="all, delete-orphan")
    umbral = relationship("UmbralConfig", back_populates="nodo", uselist=False, cascade="all, delete-orphan")
    destinatarios = relationship("DestinatarioAlerta", back_populates="nodo")
    alertas = relationship("AlertaLog", back_populates="nodo")
    predicciones = relationship("PrediccionIA", back_populates="nodo", cascade="all, delete-orphan")
    anomalias_ia = relationship("AnomaliaDetectadaIA", back_populates="nodo", cascade="all, delete-orphan")


# ========================================================================================
# 4. CALIBRACIONES DE NODO (Sensores Electroquímicos y Ultrasonido)
# ========================================================================================
class CalibracionNodo(Base):
    __tablename__ = "calibraciones_nodo"

    id_calibracion = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False, index=True)
    calibrado_por_usuario_id = Column(String(36), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    ph_offset_v = Column(Float, default=2.5000, nullable=False)
    ph_slope = Column(Float, default=-0.1800, nullable=False)
    tds_factor_k = Column(Float, default=0.5000, nullable=False)
    tds_offset_v = Column(Float, default=0.0000, nullable=False)
    turb_v_clear = Column(Float, default=4.2000, nullable=False)
    turb_v_turbid = Column(Float, default=2.5000, nullable=False)
    distancia_fondo_sensor_cm = Column(Float, nullable=False)
    fecha_calibracion = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    calibrado_por = Column(String(100), nullable=True)
    es_vigente = Column(Boolean, default=True, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    nodo = relationship("Nodo", back_populates="calibraciones")
    calibrador = relationship("Usuario", back_populates="calibraciones")
    seccion_hidraulica = relationship("CalibracionSeccionHidraulica", back_populates="calibracion", uselist=False, cascade="all, delete-orphan")

    # Propiedades de compatibilidad con código que lea de la sección
    @property
    def molinete_constante_a(self) -> float:
        if self.seccion_hidraulica:
            return self.seccion_hidraulica.molinete_constante_a
        return 0.2500

    @property
    def molinete_constante_b(self) -> float:
        if self.seccion_hidraulica:
            return self.seccion_hidraulica.molinete_constante_b
        return 0.0500

    @property
    def coeficiente_friccion(self) -> float:
        if self.seccion_hidraulica:
            return self.seccion_hidraulica.coeficiente_friccion
        return 0.0350

    @property
    def tipo_seccion(self) -> str:
        if self.seccion_hidraulica:
            return self.seccion_hidraulica.tipo_seccion
        return "REGLETA_PUNTOS"

    @property
    def ancho_total_rio_m(self) -> float:
        if self.seccion_hidraulica:
            return self.seccion_hidraulica.ancho_total_rio_m
        return 4.00

    @property
    def ancho_solera_m(self) -> Optional[float]:
        if self.seccion_hidraulica:
            return self.seccion_hidraulica.ancho_solera_m
        return 1.20

    @property
    def talud_z(self) -> Optional[float]:
        if self.seccion_hidraulica:
            return self.seccion_hidraulica.talud_z
        return 0.50

    @property
    def puntos_seccion(self):
        if self.seccion_hidraulica and self.seccion_hidraulica.puntos_seccion:
            return self.seccion_hidraulica.puntos_seccion
        return []

    @property
    def caudal_coef_k(self) -> float:
        return self.molinete_constante_a

    @caudal_coef_k.setter
    def caudal_coef_k(self, val: float):
        if self.seccion_hidraulica:
            self.seccion_hidraulica.molinete_constante_a = val

    @property
    def caudal_exp_n(self) -> float:
        return 1.5

    @caudal_exp_n.setter
    def caudal_exp_n(self, val: float):
        pass


# ========================================================================================
# 4.1 CALIBRACIÓN DE SECCIÓN HIDRÁULICA Y MOLINETE HALL
# ========================================================================================
class CalibracionSeccionHidraulica(Base):
    __tablename__ = "calibraciones_seccion_hidraulica"

    id_seccion_calibracion = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_calibracion = Column(String(36), ForeignKey("calibraciones_nodo.id_calibracion", ondelete="CASCADE"), nullable=False, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    ancho_total_rio_m = Column(Float, default=4.00, nullable=False)
    molinete_constante_a = Column(Float, default=0.2500, nullable=False)  # V = a * (RPM/60) + b
    molinete_constante_b = Column(Float, default=0.0500, nullable=False)
    coeficiente_friccion = Column(Float, default=0.0350, nullable=False)  # Manning n
    tipo_seccion = Column(String(50), default="REGLETA_PUNTOS", nullable=False)  # REGLETA_PUNTOS, RECTANGULAR, TRAPEZOIDAL, IRREGULAR
    ancho_solera_m = Column(Float, nullable=True)
    talud_z = Column(Float, nullable=True)
    profundidad_maxima_m = Column(Float, nullable=True)
    area_mojada_referencia_m2 = Column(Float, nullable=True)
    numero_verticales_aforo = Column(Integer, default=3, nullable=False)
    observaciones_aforo = Column(Text, nullable=True)
    es_vigente = Column(Boolean, default=True, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    calibracion = relationship("CalibracionNodo", back_populates="seccion_hidraulica")
    nodo = relationship("Nodo")
    puntos_seccion = relationship("PuntoSeccionCalibracion", back_populates="seccion_calibracion", cascade="all, delete-orphan", order_by="PuntoSeccionCalibracion.orden_punto")


# ========================================================================================
# 4.2 PUNTOS DE SECCIÓN DE CALIBRACIÓN (Perfil Batimétrico por Regletas)
# ========================================================================================
class PuntoSeccionCalibracion(Base):
    __tablename__ = "puntos_seccion_calibracion"

    id_punto = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_seccion_calibracion = Column(String(36), ForeignKey("calibraciones_seccion_hidraulica.id_seccion_calibracion", ondelete="CASCADE"), nullable=False, index=True)
    orden_punto = Column(Integer, nullable=False)  # 1 a N de margen izquierda a derecha
    distancia_orilla_m = Column(Float, nullable=False)
    profundidad_lecho_m = Column(Float, nullable=False)
    ancho_subseccion_m = Column(Float, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    seccion_calibracion = relationship("CalibracionSeccionHidraulica", back_populates="puntos_seccion")


# ========================================================================================
# 5. MANTENIMIENTOS DE NODO (Bitácora Histórica Física, Lógica e Hidráulica)
# ========================================================================================
class MantenimientoNodo(Base):
    __tablename__ = "mantenimientos_nodo"

    id_mantenimiento = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False, index=True)
    realizado_por_usuario_id = Column(String(36), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    tipo_mantenimiento = Column(String(50), nullable=False)  # PREVENTIVO, CORRECTIVO, CALIBRACION_SENSORES, etc.
    categoria = Column(String(30), nullable=False)  # FISICO, LOGICO, HIDRAULICO
    fecha_programada = Column(DateTime, nullable=False)
    fecha_ejecucion = Column(DateTime, nullable=True)
    tecnico_responsable = Column(String(150), nullable=False)
    descripcion_trabajo = Column(Text, nullable=False)
    diagnostico_inicial = Column(Text, nullable=True)
    acciones_realizadas = Column(Text, nullable=True)
    repuestos_utilizados = Column(Text, nullable=True)
    firmware_version_anterior = Column(String(50), nullable=True)
    firmware_version_instalada = Column(String(50), nullable=True)
    costo_estimado = Column(Float, default=0.0, nullable=True)
    estado_mantenimiento = Column(String(30), default="PROGRAMADO", nullable=False)
    observaciones = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    nodo = relationship("Nodo", back_populates="puntos_mantenimiento")
    tecnico = relationship("Usuario", back_populates="mantenimientos")


# ========================================================================================
# 6. MEDICIONES RAW (Telemetría Cruda con Efecto Hall)
# ========================================================================================
class MedicionRaw(Base):
    __tablename__ = "mediciones_raw"

    id_raw = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False, index=True)
    timestamp_servidor = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)
    timestamp_dispositivo_ms = Column(BigInteger, nullable=True)
    raw_v_ph = Column(Float, nullable=False)
    raw_v_tds = Column(Float, nullable=False)
    raw_v_turb = Column(Float, nullable=False)
    raw_dist_cm = Column(Float, nullable=False)
    temp_agua_c = Column(Float, nullable=False)
    hall_rpm = Column(Float, default=0.0, nullable=False)
    hall_pulsos = Column(Integer, default=0, nullable=False)
    hall_frecuencia_hz = Column(Float, default=0.0, nullable=False)
    battery_v = Column(Float, nullable=False)
    signal_rssi = Column(SmallInteger, nullable=True)
    payload_json_backup = Column(JSON, nullable=True)

    nodo = relationship("Nodo", back_populates="mediciones_raw")
    medicion_procesada = relationship("MedicionProcesada", back_populates="raw", uselist=False)


# ========================================================================================
# 7. MEDICIONES PROCESADAS (Molinete Hall, Caudal y Calidad Piscícola)
# ========================================================================================
class MedicionProcesada(Base):
    __tablename__ = "mediciones_procesadas"

    id_proc = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_raw = Column(String(36), ForeignKey("mediciones_raw.id_raw", ondelete="RESTRICT"), nullable=False, unique=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    ph = Column(Float, nullable=False)
    tds_ppm = Column(Float, nullable=False)
    ec_us_cm = Column(Float, nullable=False)
    turbidez_ntu = Column(Float, nullable=False)
    temp_agua_c = Column(Float, nullable=False)
    oxigeno_disuelto_mgl = Column(Float, nullable=True)
    saturacion_oxigeno_pct = Column(Float, nullable=True)
    tirante_agua_cm = Column(Float, nullable=False)
    velocidad_agua_ms = Column(Float, default=0.0, nullable=False)
    area_hidraulica_m2 = Column(Float, default=0.0, nullable=False)
    caudal_m3s = Column(Float, nullable=False)
    caudal_ls = Column(Float, nullable=False)
    wqi_score = Column(Float, nullable=False)
    wqi_categoria = Column(String(30), nullable=False)
    estado_salinidad = Column(String(30), nullable=False)
    estado_ph = Column(String(30), nullable=False)
    aptitud_piscicola = Column(String(30), default="NO_EVALUADO", nullable=False)

    raw = relationship("MedicionRaw", back_populates="medicion_procesada")
    nodo = relationship("Nodo", back_populates="mediciones_procesadas")
    alertas = relationship("AlertaLog", back_populates="medicion_procesada")

    @property
    def battery_v(self) -> float:
        return self.raw.battery_v if self.raw else 0.0

    @property
    def signal_rssi(self) -> Optional[int]:
        return self.raw.signal_rssi if self.raw else None



# ========================================================================================
# 8. CLIMA OPENWEATHERMAP
# ========================================================================================
class ClimaOpenWeather(Base):
    __tablename__ = "clima_openweather"

    id_clima = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
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
# 9. UMBRALES DE CONFIGURACIÓN
# ========================================================================================
class UmbralConfig(Base):
    __tablename__ = "umbrales_config"

    id_umbral = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, unique=True)
    ph_min_alerta = Column(Float, default=6.50, nullable=False)
    ph_max_alerta = Column(Float, default=8.50, nullable=False)
    ec_max_advertencia_us_cm = Column(Float, default=1200.00, nullable=False)
    ec_max_critico_us_cm = Column(Float, default=1500.00, nullable=False)
    tds_max_alerta_ppm = Column(Float, default=750.00, nullable=False)
    turb_max_alerta_ntu = Column(Float, default=50.00, nullable=False)
    tirante_min_alerta_cm = Column(Float, default=10.00, nullable=False)
    temperatura_max_piscicola_c = Column(Float, default=18.00, nullable=False)
    oxigeno_min_piscicola_mgl = Column(Float, default=5.50, nullable=False)
    bateria_min_alerta_v = Column(Float, default=11.50, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    fecha_actualizacion = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    nodo = relationship("Nodo", back_populates="umbral")


# ========================================================================================
# 10. DESTINATARIOS DE ALERTAS (Multiuso: Agrícola, Piscícola, etc.)
# ========================================================================================
class DestinatarioAlerta(Base):
    __tablename__ = "destinatarios_alertas"

    id_destinatario = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_entidad = Column(String(36), ForeignKey("entidades.id_entidad", ondelete="RESTRICT"), nullable=False, index=True)
    id_tipo_uso = Column(String(36), ForeignKey("tipos_uso_agua.id_tipo_uso", ondelete="RESTRICT"), nullable=False, index=True)
    id_nodo_suscrito = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False, index=True)
    registrado_por_usuario_id = Column(String(36), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    dni_ruc = Column(String(20), nullable=True)
    telefono_whatsapp = Column(String(30), nullable=False)
    email = Column(String(100), nullable=True)
    rol_usuario = Column(String(50), nullable=False, default="BENEFICIARIO_AGUA")
    detalle_actividad = Column(String(150), nullable=True)
    sector_predio = Column(String(100), nullable=True)
    recibe_alertas_calidad = Column(Boolean, default=True, nullable=False)
    recibe_alertas_caudal = Column(Boolean, default=True, nullable=False)
    recibe_alertas_mantenimiento = Column(Boolean, default=True, nullable=False)
    recibe_reporte_diario = Column(Boolean, default=False, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    entidad = relationship("Entidad", back_populates="destinatarios")
    tipo_uso = relationship("TipoUsoAgua", back_populates="destinatarios")
    nodo = relationship("Nodo", back_populates="destinatarios")
    registrador = relationship("Usuario", back_populates="destinatarios_registrados")
    turnos = relationship("TurnoRiego", back_populates="destinatario")

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombres} {self.apellidos}".strip()

    @nombre_completo.setter
    def nombre_completo(self, val: str):
        if val:
            parts = val.strip().split(" ", 1)
            self.nombres = parts[0]
            self.apellidos = parts[1] if len(parts) > 1 else "Usuario"
        else:
            self.nombres = "Beneficiario"
            self.apellidos = "Agua"

    @property
    def tipo_cultivo(self) -> Optional[str]:
        return self.detalle_actividad

    @tipo_cultivo.setter
    def tipo_cultivo(self, val: Optional[str]):
        self.detalle_actividad = val


# ========================================================================================
# 11. LOG DE ALERTAS
# ========================================================================================
class AlertaLog(Base):
    __tablename__ = "alertas_log"

    id_alerta = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False, index=True)
    id_proc = Column(String(36), ForeignKey("mediciones_procesadas.id_proc", ondelete="SET NULL"), nullable=True)
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
# 12. TURNOS DE RIEGO (Topología Hidráulica de Tramo Aguas Arriba / Aguas Abajo)
# ========================================================================================
class TurnoRiego(Base):
    __tablename__ = "turnos_riego"

    id_turno = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_entidad = Column(String(36), ForeignKey("entidades.id_entidad", ondelete="RESTRICT"), nullable=False)
    id_destinatario = Column(String(36), ForeignKey("destinatarios_alertas.id_destinatario", ondelete="RESTRICT"), nullable=False)
    id_nodo_aguas_arriba = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False)
    id_nodo_aguas_abajo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False)
    id_nodo_bocatoma = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="RESTRICT"), nullable=False)
    fecha_inicio_programada = Column(DateTime, nullable=False)
    fecha_fin_programada = Column(DateTime, nullable=False)
    horas_programadas = Column(Float, nullable=False)
    caudal_acordado_ls = Column(Float, nullable=False)
    volumen_programado_m3 = Column(Float, nullable=False)
    volumen_real_entregado_m3 = Column(Float, default=0.0, nullable=False)
    balance_impacto_tramo_pct = Column(Float, default=0.0, nullable=False)
    cumplimiento_pct = Column(Float, default=0.0, nullable=False)
    estado_turno = Column(String(50), default="PROGRAMADO", nullable=False)
    observaciones = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    entidad = relationship("Entidad", back_populates="turnos")
    destinatario = relationship("DestinatarioAlerta", back_populates="turnos")
    nodo_arriba = relationship("Nodo", foreign_keys=[id_nodo_aguas_arriba])
    nodo_abajo = relationship("Nodo", foreign_keys=[id_nodo_aguas_abajo])
    nodo_bocatoma = relationship("Nodo", foreign_keys=[id_nodo_bocatoma])

    @property
    def id_nodo(self) -> str:
        return self.id_nodo_bocatoma


# ========================================================================================
# 13. PREDICCIONES IA
# ========================================================================================
class PrediccionIA(Base):
    __tablename__ = "predicciones_ia"

    id_prediccion = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    fecha_emision = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    horizonte_horas = Column(SmallInteger, nullable=False)
    fecha_proyectada = Column(DateTime, nullable=False, index=True)
    caudal_predicho_m3s = Column(Float, nullable=False)
    wqi_predicho = Column(Float, nullable=False)
    ph_predicho = Column(Float, nullable=False)
    ec_predicho_us_cm = Column(Float, nullable=False)
    riesgo_estres_hidrico = Column(String(30), nullable=False)
    lead_time_horas_llegada_pluma = Column(Float, nullable=True)
    modelo_version = Column(String(50), default="GRU-Hydrologic-v3.0", nullable=False)

    nodo = relationship("Nodo", back_populates="predicciones")


# ========================================================================================
# 14. CULTIVOS AGRÍCOLAS (Catálogo Dinámico MIDAGRI / Internacional)
# ========================================================================================
class CultivoAgricola(Base):
    __tablename__ = "cultivos_agricolas"

    id_cultivo = Column(String(50), primary_key=True, index=True)
    codigo_catalogo = Column(String(50), default="MIDAGRI_PE", nullable=False)
    pais_origen = Column(String(50), default="Perú", nullable=False, index=True)
    region_natural = Column(String(30), default="Costa", nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    categoria = Column(String(80), nullable=False)
    demanda_hidrica_m3_ha = Column(Float, default=6000.0, nullable=False)
    ec_umbral_us_cm = Column(Float, default=1500.0, nullable=False)
    salinidad_pendiente_pct = Column(Float, default=10.0, nullable=False)
    ph_min = Column(Float, default=6.0, nullable=False)
    ph_max = Column(Float, default=7.5, nullable=False)
    turbidez_max_ntu = Column(Float, default=50.0, nullable=False)
    temp_agua_min_c = Column(Float, default=12.0, nullable=False)
    temp_agua_max_c = Column(Float, default=26.0, nullable=False)
    wqi_min = Column(Float, default=60.0, nullable=False)
    dias_ciclo_vegetativo = Column(Integer, default=180, nullable=False)
    rendimiento_base_kg_ha = Column(Float, default=15000.0, nullable=False)
    precio_base_moneda_kg = Column(Float, default=3.00, nullable=False)
    moneda_codigo = Column(String(5), default="PEN", nullable=False)
    nivel_resiliencia = Column(String(30), default="Media", nullable=False)
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    simulaciones = relationship("SimulacionWhatIf", back_populates="cultivo")
    estadisticas = relationship("EstadisticaRegionalAgro", back_populates="cultivo", cascade="all, delete-orphan")
    perfiles_riesgo = relationship("PerfilRiesgoRegionalAgro", back_populates="cultivo", cascade="all, delete-orphan")
    intenciones_siembra = relationship("IntencionSiembraAgro", back_populates="cultivo", cascade="all, delete-orphan")


# ========================================================================================
# 15. REGISTRO DE MODELOS DE INTELIGENCIA ARTIFICIAL (MLOps)
# ========================================================================================
class ModeloIA(Base):
    __tablename__ = "modelos_ia"

    id_modelo = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    codigo_modelo = Column(String(60), unique=True, nullable=False)
    nombre = Column(String(120), nullable=False)
    tipo_modelo = Column(String(50), nullable=False, index=True)
    framework = Column(String(40), default="SCIKIT_LEARN", nullable=False)
    version = Column(String(30), default="1.0.0", nullable=False)
    descripcion = Column(Text, nullable=True)
    metricas_rendimiento_json = Column(JSON, nullable=True)
    hiperparametros_json = Column(JSON, nullable=True)
    ruta_artefacto = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True, nullable=False, index=True)
    fecha_entrenamiento = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    anomalias = relationship("AnomaliaDetectadaIA", back_populates="modelo")


# ========================================================================================
# 16. ANOMALÍAS DETECTADAS POR IA
# ========================================================================================
class AnomaliaDetectadaIA(Base):
    __tablename__ = "anomalias_detectadas_ia"

    id_anomalia = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_nodo = Column(String(36), ForeignKey("nodos.id_nodo", ondelete="CASCADE"), nullable=False, index=True)
    id_modelo = Column(String(36), ForeignKey("modelos_ia.id_modelo", ondelete="SET NULL"), nullable=True)
    timestamp_deteccion = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)
    anomaly_score = Column(Float, nullable=False)
    tipo_evento = Column(String(60), nullable=False)
    severidad = Column(String(20), default="MEDIA", nullable=False)
    vector_lectura_json = Column(JSON, nullable=False)
    diagnostico_ia = Column(Text, nullable=False)
    accion_recomendada = Column(Text, nullable=True)
    estado_resolucion = Column(String(30), default="PENDIENTE", nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    nodo = relationship("Nodo", back_populates="anomalias_ia")
    modelo = relationship("ModeloIA", back_populates="anomalias")


# ========================================================================================
# 17. SIMULACIONES WHAT-IF ENRIQUECIDAS
# ========================================================================================
class SimulacionWhatIf(Base):
    __tablename__ = "simulaciones_whatif"

    id_simulacion = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_entidad = Column(String(36), ForeignKey("entidades.id_entidad", ondelete="SET NULL"), nullable=True)
    ejecutado_por_usuario_id = Column(String(36), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    id_cultivo = Column(String(50), ForeignKey("cultivos_agricolas.id_cultivo", ondelete="SET NULL"), nullable=True)
    titulo_escenario = Column(String(150), nullable=False)
    fecha_ejecucion = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    delta_precipitacion_pct = Column(Float, default=0.0, nullable=False)
    delta_salinidad_us_cm = Column(Float, default=0.0, nullable=False)
    delta_caudal_cabecera_pct = Column(Float, default=0.0, nullable=False)
    delta_ph = Column(Float, default=0.0, nullable=False)
    duracion_horas = Column(Integer, default=12, nullable=False)
    resultado_wqi_valle = Column(Float, nullable=False)
    resultado_caudal_valle_m3s = Column(Float, nullable=False)
    perdida_rendimiento_pct = Column(Float, default=0.0, nullable=False)
    nivel_estres_osmotico = Column(String(50), nullable=True)
    volumen_desembalse_m3 = Column(Float, nullable=True)
    resumen_impacto = Column(Text, nullable=False)
    payload_cascada_json = Column(JSON, nullable=True)
    ejecutado_por = Column(String(100), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    ejecutor = relationship("Usuario", back_populates="simulaciones_ejecutadas")
    cultivo = relationship("CultivoAgricola", back_populates="simulaciones")


# ========================================================================================
# 18. ESTADÍSTICAS REGIONALES AGRÍCOLAS (Histórico SIEA 2017-2023)
# ========================================================================================
class EstadisticaRegionalAgro(Base):
    __tablename__ = "estadisticas_regionales_agro"

    id_estadistica = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_cultivo = Column(String(50), ForeignKey("cultivos_agricolas.id_cultivo", ondelete="SET NULL"), nullable=True, index=True)
    codigo_cultivo = Column(String(50), nullable=False, index=True)
    departamento_region = Column(String(50), nullable=False, index=True)  # LIMA, ICA, JUNIN, NACIONAL, etc.
    region_natural = Column(String(20), default="COSTA", nullable=False)  # COSTA, SIERRA, SELVA
    anio = Column(Integer, nullable=False, index=True)  # 2017 a 2023
    siembras_ha = Column(Float, default=0.0, nullable=False)
    cosechas_ha = Column(Float, default=0.0, nullable=False)
    produccion_t = Column(Float, default=0.0, nullable=False)
    rendimiento_kgha = Column(Float, default=0.0, nullable=False)
    precio_chacra_skg = Column(Float, default=0.0, nullable=False)
    valor_bruto_produccion_pen = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    cultivo = relationship("CultivoAgricola", back_populates="estadisticas")


# ========================================================================================
# 19. PERFILES DE RIESGO REGIONAL AGRÍCOLA (Encuesta ENA 2024-2025)
# ========================================================================================
class PerfilRiesgoRegionalAgro(Base):
    __tablename__ = "perfiles_riesgo_regional_agro"

    id_perfil_riesgo = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_cultivo = Column(String(50), ForeignKey("cultivos_agricolas.id_cultivo", ondelete="SET NULL"), nullable=True, index=True)
    codigo_cultivo = Column(String(50), nullable=False, index=True)
    departamento_region = Column(String(50), nullable=False, index=True)
    region_natural = Column(String(20), default="COSTA", nullable=False)
    frecuencia_sequia_pct = Column(Float, default=0.0, nullable=False)
    frecuencia_inundacion_pct = Column(Float, default=0.0, nullable=False)
    frecuencia_plagas_pct = Column(Float, default=0.0, nullable=False)
    frecuencia_heladas_pct = Column(Float, default=0.0, nullable=False)
    perdida_rendimiento_promedio_pct = Column(Float, default=0.0, nullable=False)
    nivel_vulnerabilidad_hidrica = Column(String(20), default="MEDIA", nullable=False)  # ALTA, MEDIA, BAJA
    fuente_riego_principal = Column(String(50), default="GRAVEDAD_SUPERFICIAL", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    cultivo = relationship("CultivoAgricola", back_populates="perfiles_riesgo")


# ========================================================================================
# 20. INTENCIONES DE SIEMBRA AGRÍCOLA (Proyecciones de Campaña Agrícola)
# ========================================================================================
class IntencionSiembraAgro(Base):
    __tablename__ = "intenciones_siembra_agro"

    id_intencion = Column(String(36), primary_key=True, default=gen_uuid7_str, index=True)
    id_cultivo = Column(String(50), ForeignKey("cultivos_agricolas.id_cultivo", ondelete="SET NULL"), nullable=True, index=True)
    codigo_cultivo = Column(String(50), nullable=False, index=True)
    departamento_region = Column(String(50), nullable=False, index=True)
    campania_agricola = Column(String(30), default="2024-2025", nullable=False)
    superficie_proyectada_ha = Column(Float, default=0.0, nullable=False)
    variacion_vs_campania_anterior_pct = Column(Float, default=0.0, nullable=False)
    mes_inicio_siembras = Column(String(30), nullable=True)
    mes_fin_siembras = Column(String(30), nullable=True)
    requerimiento_hidrico_estimado_m3 = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    cultivo = relationship("CultivoAgricola", back_populates="intenciones_siembra")

