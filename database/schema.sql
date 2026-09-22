-- ========================================================================================
-- PROYECTO: SENTINEL-H2O — Plataforma de Gobernanza Hídrica y Gemelo Digital 3D
-- AUTOR: Equipo Técnico Sentinel-H2O
-- DESCRIPCIÓN: Esquema Relacional de Base de Datos MySQL (Normalizado 3NF / 4NF)
-- VERSION: 3.0 (UUID v7, Recurso Hídrico Singleton, Molinete Hall, Regletas, Piscicultura)
-- ========================================================================================

CREATE DATABASE IF NOT EXISTS `sentinel_h2o_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `sentinel_h2o_db`;

-- Desactivar temporalmente revisión de claves foráneas para recreación ordenada si aplica
SET FOREIGN_KEY_CHECKS = 0;

-- ========================================================================================
-- 1. TABLA: TIPOS DE ENTIDAD GESTORA (Catálogo Abierto Replicable)
-- Define la naturaleza institucional de las entidades (ANA, Juntas, Piscicultura, etc.)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `tipos_entidad` (
  `id_tipo_entidad` CHAR(36) PRIMARY KEY COMMENT 'UUID v7 identificador único',
  `codigo` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Identificador mnemotécnico (ej: AUTORIDAD_NACIONAL, JUNTA_USUARIOS)',
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo del tipo institucional',
  `descripcion` TEXT NULL,
  `permite_gestion_riego` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Habilita asignación y control de turnos de riego',
  `permite_gestion_piscicultura` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Habilita monitoreo de criaderos acuícolas / truchas',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Catálogo extensible de tipos de organizaciones gestoras del agua';

-- ========================================================================================
-- 1.1 TABLA: CARGOS INSTITUCIONALES (3NF / 4NF)
-- Cada tipo de entidad define sus propios cargos válidos y jerarquías permitidas.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `cargos_institucionales` (
  `id_cargo` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_tipo_entidad` CHAR(36) NOT NULL COMMENT 'Tipo de entidad a la que pertenece el cargo',
  `codigo_cargo` VARCHAR(50) NOT NULL,
  `nombre_cargo` VARCHAR(100) NOT NULL COMMENT 'ej: Director de Recursos Hídricos, Tomero Sectorial, Biólogo Acuícola',
  `nivel_jerarquia` INT NOT NULL DEFAULT 1 COMMENT '1 = Operativo/Campo, 2 = Técnico, 3 = Directivo/Administrador',
  `descripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cargo_tipo_entidad` (`id_tipo_entidad`),
  CONSTRAINT `fk_cargo_tipo_entidad` FOREIGN KEY (`id_tipo_entidad`) REFERENCES `tipos_entidad` (`id_tipo_entidad`) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Cargos institucionales tipados y validados según tipo de entidad';

-- ========================================================================================
-- 1.2 TABLA: ENTIDADES / ORGANIZACIONES (Instancias Locales de Gestión)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `entidades` (
  `id_entidad` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_tipo_entidad` CHAR(36) NOT NULL,
  `nombre_entidad` VARCHAR(150) NOT NULL COMMENT 'Nombre oficial de la institución local',
  `ruc` VARCHAR(20) NULL COMMENT 'Identificador tributario opcional',
  `telefono_contacto` VARCHAR(30) NULL,
  `email_contacto` VARCHAR(100) NULL,
  `direccion` VARCHAR(200) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_entidad_tipo` (`id_tipo_entidad`),
  CONSTRAINT `fk_entidad_tipo` FOREIGN KEY (`id_tipo_entidad`) REFERENCES `tipos_entidad` (`id_tipo_entidad`) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Organizaciones gestoras registradas en el sistema';

-- ========================================================================================
-- 1.3 TABLA: ROLES DEL SISTEMA (Catálogo RBAC Normalizado)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `roles_sistema` (
  `codigo_rol` VARCHAR(50) PRIMARY KEY COMMENT 'Identificador único del rol (ej: ADMIN_SISTEMA)',
  `nombre_amigable` VARCHAR(100) NOT NULL COMMENT 'Nombre legible del rol',
  `descripcion` TEXT NOT NULL COMMENT 'Descripción y alcance de responsabilidades',
  `nivel_jerarquia` INT NOT NULL DEFAULT 1 COMMENT 'Jerarquía numérica',
  `grupo_multiuso` VARCHAR(50) NOT NULL COMMENT 'ADMINISTRACION, CUENCA_GLOBAL, MANTENIMIENTO_IOT, AGRARIO, POBLACIONAL, ACUICOLA, FISCALIZACION',
  `permisos_json` JSON NOT NULL COMMENT 'Array JSON de permisos asociados',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Catálogo normalizado de roles y perfiles RBAC del sistema';

-- ========================================================================================
-- 1.4 TABLA: USUARIOS (Autenticación JWT, RBAC y Nombres Atómicos)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_entidad` CHAR(36) NULL COMMENT 'Entidad donde labora (NULL para superadministradores de plataforma)',
  `id_cargo` CHAR(36) NULL COMMENT 'Cargo institucional validado según su entidad',
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `nombres` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(100) NOT NULL,
  `telefono_contacto` VARCHAR(30) NULL,
  `rol` VARCHAR(50) NOT NULL DEFAULT 'AUDITOR_VISOR' COMMENT 'Código referenciado a roles_sistema',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `ultimo_login` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_usuario_email` (`email`),
  INDEX `idx_usuario_rol` (`rol`),
  INDEX `idx_usuario_entidad` (`id_entidad`),
  INDEX `idx_usuario_cargo` (`id_cargo`),
  CONSTRAINT `fk_usuario_entidad` FOREIGN KEY (`id_entidad`) REFERENCES `entidades` (`id_entidad`) ON DELETE SET NULL,
  CONSTRAINT `fk_usuario_cargo` FOREIGN KEY (`id_cargo`) REFERENCES `cargos_institucionales` (`id_cargo`) ON DELETE SET NULL,
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol`) REFERENCES `roles_sistema` (`codigo_rol`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Usuarios institucionales con RBAC y datos atómicos';

-- ========================================================================================
-- 1.3 TABLA: TIPOS DE RECURSO HÍDRICO (Catálogo Normalizado para Gemelo 3D)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `tipos_recurso_hidrico` (
  `id_tipo_recurso` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `codigo` VARCHAR(50) NOT NULL UNIQUE COMMENT 'CUENCA, RIO, LAGUNA, EMBALSE, CANAL_RIEGO, ACUIFERO, SECTOR_HIDROLOGICO',
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `permite_riego_defecto` BOOLEAN NOT NULL DEFAULT TRUE,
  `permite_piscicultura_defecto` BOOLEAN NOT NULL DEFAULT FALSE,
  `geometria_3d_tipo` VARCHAR(50) NOT NULL DEFAULT 'LINEA_FLUJO' COMMENT 'LINEA_FLUJO, SUPERFICIE_POLIGONAL, VOLUMEN_EMBALSE, CANAL_PRISMATICO',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Catálogo normalizado de tipologías de cuerpos hídricos para el Gemelo 3D';

-- ========================================================================================
-- 1.4 TABLA: CONFIGURACIÓN DEL RECURSO HÍDRICO (Singleton de Gestión)
-- Modela el único bloque o cuerpo hídrico monitoreado por este despliegue.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `configuracion_recurso_hidrico` (
  `id_config` CHAR(36) PRIMARY KEY COMMENT 'UUID v7 determinista (Singleton)',
  `nombre_recurso` VARCHAR(150) NOT NULL COMMENT 'Nombre del cuerpo de agua (ej: Río Chancay, Laguna Conococha)',
  `codigo_recurso` VARCHAR(50) NOT NULL DEFAULT 'RH-01',
  `id_tipo_recurso` CHAR(36) NULL COMMENT 'FK hacia tipos_recurso_hidrico',
  `tipo_recurso` ENUM('CUENCA', 'RIO', 'LAGUNA', 'EMBALSE', 'CANAL_RIEGO', 'ACUIFERO', 'SECTOR_HIDROLOGICO') NOT NULL DEFAULT 'RIO',
  `pais` VARCHAR(100) NOT NULL DEFAULT 'Perú',
  `region` VARCHAR(100) NOT NULL DEFAULT 'Lima',
  `cuenca_hidrografica` VARCHAR(100) NULL,
  `sistema_hidrologico` VARCHAR(100) NULL,
  `ubicacion_detallada` TEXT NULL,
  `latitud_centro` DECIMAL(10, 7) NOT NULL DEFAULT -11.4900000,
  `longitud_centro` DECIMAL(10, 7) NOT NULL DEFAULT -77.0500000,
  `zoom_inicial` TINYINT NOT NULL DEFAULT 10,
  `cota_media_msnm` DECIMAL(8, 2) NULL DEFAULT 1200.00,
  `superficie_km2` DECIMAL(10, 2) NULL DEFAULT 3200.00,
  `personal_encargado` VARCHAR(150) NULL COMMENT 'Nombre del funcionario o ingeniero titular',
  `telefono_contacto_encargado` VARCHAR(30) NULL,
  `email_contacto_encargado` VARCHAR(100) NULL,
  `id_superadmin_responsable` CHAR(36) NULL COMMENT 'FK hacia la cuenta principal de administración',
  `id_entidad_administradora` CHAR(36) NULL COMMENT 'FK hacia la institución que custodia el recurso',
  `modulo_riego_habilitado` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Habilita turnos de riego (solo si aplica)',
  `modulo_piscicultura_habilitado` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Habilita monitoreo de calidad para truchas/piscigranjas',
  `modulo_ia_habilitado` BOOLEAN NOT NULL DEFAULT TRUE,
  `configuracion_inicial_completada` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Control del Setup Wizard en primer despliegue',
  `version_sistema` VARCHAR(20) NOT NULL DEFAULT '2.5.0',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_config_tipo_recurso` FOREIGN KEY (`id_tipo_recurso`) REFERENCES `tipos_recurso_hidrico` (`id_tipo_recurso`) ON DELETE SET NULL,
  CONSTRAINT `fk_config_superadmin` FOREIGN KEY (`id_superadmin_responsable`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_config_entidad` FOREIGN KEY (`id_entidad_administradora`) REFERENCES `entidades` (`id_entidad`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Parámetros del recurso hídrico monitoreado (Patrón Singleton)';

-- ========================================================================================
-- 1.5 TABLA: LOGS DE AUDITORÍA FORENSE (Inmutable)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `auditoria_logs` (
  `id_audit` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_usuario` CHAR(36) NULL,
  `email_usuario` VARCHAR(120) NULL,
  `accion` VARCHAR(50) NOT NULL,
  `tabla_afectada` VARCHAR(50) NOT NULL,
  `id_registro_afectado` VARCHAR(100) NULL,
  `valores_previos_json` JSON NULL,
  `valores_nuevos_json` JSON NULL,
  `ip_origen` VARCHAR(45) NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_usuario` (`id_usuario`),
  INDEX `idx_audit_tabla` (`tabla_afectada`),
  INDEX `idx_audit_timestamp` (`timestamp`),
  CONSTRAINT `fk_audit_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Registro de auditoría forense inmutable de cambios de configuración';

-- ========================================================================================
-- 2. TABLA: TIPOS DE USO DEL AGUA (Agricultura, Piscicultura, Poblacional, etc.)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `tipos_uso_agua` (
  `id_tipo_uso` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `codigo` VARCHAR(50) NOT NULL UNIQUE COMMENT 'AGRICOLA, PISCICOLA_TRUCHAS, CONSUMO_HUMANO, ECOLOGICO, ENERGETICO',
  `nombre` VARCHAR(100) NOT NULL,
  `unidad_medida_demanda` VARCHAR(30) NOT NULL DEFAULT 'l/s',
  `parametros_optimos_json` JSON NULL COMMENT 'Rangos óptimos recomendados de temperatura, OD, EC y pH',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Catálogo de destinos productivos y ecológicos del agua';

-- ========================================================================================
-- 3. TABLA: NODOS TELEMÉTRICOS (Estaciones Físicas IoT de Campo)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `nodos` (
  `id_nodo` CHAR(36) PRIMARY KEY COMMENT 'UUID v7 identificador global inmutable',
  `codigo_estacion` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Código mnemotécnico visible (ej: EST-01-CABECERA)',
  `id_entidad_responsable` CHAR(36) NULL COMMENT 'Entidad que opera la estación',
  `creado_por_usuario_id` CHAR(36) NULL,
  `nombre` VARCHAR(120) NOT NULL COMMENT 'Nombre descriptivo de la estación',
  `tramo_sector` VARCHAR(100) NOT NULL COMMENT 'Sector hidrográfico o tramo físico del recurso',
  `subcuenca` VARCHAR(100) NULL COMMENT 'Microcuenca, afluente o ramal secundario',
  `latitud` DECIMAL(10, 7) NOT NULL,
  `longitud` DECIMAL(10, 7) NOT NULL,
  `cota_msnm` DECIMAL(7, 2) NOT NULL,
  `tipo_fuente` VARCHAR(50) NOT NULL COMMENT 'RIO_PRINCIPAL, LAGUNA, CANAL_DERIVACION, BOCATOMA_PISCICOLA, MANANTIAL',
  `api_key_hash` VARCHAR(128) NOT NULL COMMENT 'Hash SHA-256 para autenticación del ESP32',
  `intervalo_envio_min` INT NOT NULL DEFAULT 15,
  `estado_operativo` ENUM('ONLINE', 'OFFLINE', 'MANTENIMIENTO', 'DEBAJA') NOT NULL DEFAULT 'ONLINE',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `descripcion` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_nodos_codigo` (`codigo_estacion`),
  INDEX `idx_nodos_entidad` (`id_entidad_responsable`),
  CONSTRAINT `fk_nodos_entidad` FOREIGN KEY (`id_entidad_responsable`) REFERENCES `entidades` (`id_entidad`) ON DELETE SET NULL,
  CONSTRAINT `fk_nodos_usuario` FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Estaciones telemétricas IoT desplegadas en el recurso hídrico';

-- ========================================================================================
-- 4. TABLA: CALIBRACIONES DE NODO (Sensores Electroquímicos y Ultrasonido)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `calibraciones_nodo` (
  `id_calibracion` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_nodo` CHAR(36) NOT NULL,
  `calibrado_por_usuario_id` CHAR(36) NULL,
  `ph_offset_v` DECIMAL(6, 4) NOT NULL DEFAULT 2.5000 COMMENT 'Voltaje buffer pH 7.00',
  `ph_slope` DECIMAL(6, 4) NOT NULL DEFAULT -0.1800 COMMENT 'Delta V / pH',
  `tds_factor_k` DECIMAL(6, 4) NOT NULL DEFAULT 0.5000 COMMENT 'Relación TDS a EC',
  `tds_offset_v` DECIMAL(6, 4) NOT NULL DEFAULT 0.0000,
  `turb_v_clear` DECIMAL(6, 4) NOT NULL DEFAULT 4.2000 COMMENT 'Voltaje agua cristalina 0 NTU',
  `turb_v_turbid` DECIMAL(6, 4) NOT NULL DEFAULT 2.5000 COMMENT 'Voltaje agua turbia 3000 NTU',
  `distancia_fondo_sensor_cm` DECIMAL(6, 2) NOT NULL COMMENT 'Altura de montaje del ultrasonido sobre el lecho',
  `fecha_calibracion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calibrado_por` VARCHAR(100) NULL,
  `es_vigente` BOOLEAN NOT NULL DEFAULT TRUE,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX `idx_calib_nodo` (`id_nodo`),
  CONSTRAINT `fk_calib_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT,
  CONSTRAINT `fk_calib_usuario` FOREIGN KEY (`calibrado_por_usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Parámetros de conversión y sensores electroquímicos de estación';

-- ========================================================================================
-- 4.1 TABLA: CALIBRACIONES DE SECCIÓN HIDRÁULICA Y MOLINETE HALL
-- Modela el aforo físico real del río medido con regletas y molinete de superficie
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `calibraciones_seccion_hidraulica` (
  `id_seccion_calibracion` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_calibracion` CHAR(36) NOT NULL,
  `id_nodo` CHAR(36) NOT NULL,
  `ancho_total_rio_m` DECIMAL(6, 2) NOT NULL DEFAULT 4.00 COMMENT 'Ancho total del espejo de agua de orilla a orilla',
  `molinete_constante_a` DECIMAL(8, 4) NOT NULL DEFAULT 0.2500 COMMENT 'Paso de hélice / pendiente velocidad V = a*RPM + b',
  `molinete_constante_b` DECIMAL(8, 4) NOT NULL DEFAULT 0.0500 COMMENT 'Velocidad de arranque o fricción del molinete (m/s)',
  `coeficiente_friccion` DECIMAL(6, 4) NOT NULL DEFAULT 0.0350 COMMENT 'Rugosidad Manning n del lecho fluvial',
  `tipo_seccion` ENUM('REGLETA_PUNTOS', 'RECTANGULAR', 'TRAPEZOIDAL', 'IRREGULAR') NOT NULL DEFAULT 'REGLETA_PUNTOS',
  `ancho_solera_m` DECIMAL(6, 2) NULL,
  `talud_z` DECIMAL(6, 2) NULL,
  `profundidad_maxima_m` DECIMAL(6, 2) NULL COMMENT 'Profundidad máxima leída con regleta',
  `area_mojada_referencia_m2` DECIMAL(8, 4) NULL,
  `numero_verticales_aforo` INT NOT NULL DEFAULT 3,
  `observaciones_aforo` TEXT NULL,
  `es_vigente` BOOLEAN NOT NULL DEFAULT TRUE,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_seccion_nodo` (`id_nodo`),
  INDEX `idx_seccion_calib` (`id_calibracion`),
  CONSTRAINT `fk_seccion_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE,
  CONSTRAINT `fk_seccion_calib_nodo` FOREIGN KEY (`id_calibracion`) REFERENCES `calibraciones_nodo` (`id_calibracion`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Parámetros de sección transversal física, aforo con regletas y molinete Hall';

-- ========================================================================================
-- 4.2 TABLA: PUNTOS DE SECCIÓN DE CALIBRACIÓN (Perfil Batimétrico con Regletas)
-- Mediciones transversales con regleta tomadas en campo según el ancho del río
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `puntos_seccion_calibracion` (
  `id_punto` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_seccion_calibracion` CHAR(36) NOT NULL,
  `orden_punto` INT NOT NULL COMMENT 'Secuencia transversal de 1 a N de izquierda a derecha',
  `distancia_orilla_m` DECIMAL(6, 2) NOT NULL COMMENT 'Distancia acumulada desde la orilla de referencia (m)',
  `profundidad_lecho_m` DECIMAL(6, 2) NOT NULL COMMENT 'Profundidad de fondo leída con la regleta (m)',
  `ancho_subseccion_m` DECIMAL(6, 2) NULL COMMENT 'Ancho de influencia de la vertical para integración de área',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_puntos_seccion_calib` (`id_seccion_calibracion`),
  CONSTRAINT `fk_puntos_seccion_calib` FOREIGN KEY (`id_seccion_calibracion`) REFERENCES `calibraciones_seccion_hidraulica` (`id_seccion_calibracion`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Puntos batimétricos transversales de aforo por regleta';

-- ========================================================================================
-- 5. TABLA: MANTENIMIENTOS DE NODO (Control Histórico Físico, Lógico e Hidráulico)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `mantenimientos_nodo` (
  `id_mantenimiento` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_nodo` CHAR(36) NOT NULL,
  `realizado_por_usuario_id` CHAR(36) NULL,
  `tipo_mantenimiento` ENUM('PREVENTIVO', 'CORRECTIVO', 'CALIBRACION_SENSORES', 'ACTUALIZACION_FIRMWARE', 'LIMPIEZA_SONDAS', 'CAMBIO_BATERIA_SOLAR', 'AFORO_REGLETAS') NOT NULL,
  `categoria` ENUM('FISICO', 'LOGICO', 'HIDRAULICO') NOT NULL,
  `fecha_programada` DATETIME NOT NULL,
  `fecha_ejecucion` DATETIME NULL,
  `tecnico_responsable` VARCHAR(150) NOT NULL,
  `descripcion_trabajo` TEXT NOT NULL,
  `diagnostico_inicial` TEXT NULL,
  `acciones_realizadas` TEXT NULL,
  `repuestos_utilizados` TEXT NULL,
  `firmware_version_anterior` VARCHAR(50) NULL,
  `firmware_version_instalada` VARCHAR(50) NULL,
  `costo_estimado` DECIMAL(10, 2) NULL DEFAULT 0.00,
  `estado_mantenimiento` ENUM('PROGRAMADO', 'EN_EJECUCION', 'COMPLETADO', 'CANCELADO') NOT NULL DEFAULT 'PROGRAMADO',
  `observaciones` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_mant_nodo` (`id_nodo`),
  CONSTRAINT `fk_mant_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT,
  CONSTRAINT `fk_mant_usuario` FOREIGN KEY (`realizado_por_usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Bitácora inmutable de mantenimiento de estaciones telemétricas';

-- ========================================================================================
-- 6. TABLA: MEDICIONES RAW (Telemetría Cruda Inmutable del ESP32 con Efecto Hall)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `mediciones_raw` (
  `id_raw` CHAR(36) PRIMARY KEY COMMENT 'UUID v7 monotónico',
  `id_nodo` CHAR(36) NOT NULL,
  `timestamp_servidor` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `timestamp_dispositivo_ms` BIGINT NULL COMMENT 'Milisegundos de uptime o RTC del ESP32',
  `raw_v_ph` DECIMAL(5, 3) NOT NULL COMMENT 'Voltaje sensor pH (0.000 - 3.300 V)',
  `raw_v_tds` DECIMAL(5, 3) NOT NULL COMMENT 'Voltaje sensor TDS (0.000 - 3.300 V)',
  `raw_v_turb` DECIMAL(5, 3) NOT NULL COMMENT 'Voltaje sensor turbidez óptico',
  `raw_dist_cm` DECIMAL(6, 2) NOT NULL COMMENT 'Distancia al espejo de agua por ultrasonido',
  `temp_agua_c` DECIMAL(5, 2) NOT NULL COMMENT 'Temperatura medida con DS18B20',
  `hall_rpm` DECIMAL(7, 2) NOT NULL DEFAULT 0.00 COMMENT 'Revoluciones por minuto del molinete leídas por sensor Hall',
  `hall_pulsos` INT NOT NULL DEFAULT 0 COMMENT 'Conteo de pulsos en el intervalo de integración',
  `hall_frecuencia_hz` DECIMAL(7, 2) NOT NULL DEFAULT 0.00 COMMENT 'Frecuencia de pulsos en Hertz',
  `battery_v` DECIMAL(4, 2) NOT NULL COMMENT 'Voltaje de batería de alimentación',
  `signal_rssi` TINYINT NULL COMMENT 'Nivel de señal celular CSQ (0 - 31)',
  `payload_json_backup` JSON NULL,
  INDEX `idx_raw_nodo_fecha` (`id_nodo`, `timestamp_servidor`),
  CONSTRAINT `fk_raw_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Registro crudo inmutable con telemetría de efecto Hall';

-- ========================================================================================
-- 7. TABLA: MEDICIONES PROCESADAS (Capa Científica, Molinete Hall y Calidad de Agua)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `mediciones_procesadas` (
  `id_proc` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_raw` CHAR(36) NOT NULL UNIQUE COMMENT 'Relación 1:1 con la medición cruda',
  `id_nodo` CHAR(36) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `ph` DECIMAL(4, 2) NOT NULL,
  `tds_ppm` DECIMAL(7, 2) NOT NULL,
  `ec_us_cm` DECIMAL(7, 2) NOT NULL,
  `turbidez_ntu` DECIMAL(7, 2) NOT NULL,
  `temp_agua_c` DECIMAL(5, 2) NOT NULL,
  `oxigeno_disuelto_mgl` DECIMAL(5, 2) NULL COMMENT 'Oxígeno disuelto estimado o medido para piscicultura (mg/L)',
  `saturacion_oxigeno_pct` DECIMAL(5, 2) NULL COMMENT 'Porcentaje de saturación de O2',
  `tirante_agua_cm` DECIMAL(6, 2) NOT NULL COMMENT 'Profundidad de la lámina de agua respecto al lecho',
  `velocidad_agua_ms` DECIMAL(6, 4) NOT NULL COMMENT 'Velocidad lineal calculada del molinete: V = a*RPM + b',
  `area_hidraulica_m2` DECIMAL(8, 4) NOT NULL COMMENT 'Área de la sección mojada A(h) integrada por regletas',
  `caudal_m3s` DECIMAL(8, 4) NOT NULL COMMENT 'Caudal instantáneo Q = A * V',
  `caudal_ls` DECIMAL(8, 2) NOT NULL COMMENT 'Caudal instantáneo en l/s',
  `wqi_score` DECIMAL(5, 2) NOT NULL COMMENT 'Índice de Calidad de Agua Min-Max Ponderado (0 - 100)',
  `wqi_categoria` ENUM('EXCELENTE', 'BUENA', 'POBRE', 'MALA', 'MUY_MALA') NOT NULL,
  `estado_salinidad` ENUM('OPTIMO', 'PRECAUCION', 'PELIGRO_ESTRES_OSMOTICO') NOT NULL,
  `estado_ph` ENUM('ACIDO_PELIGROSO', 'OPTIMO', 'ALCALINO_PELIGROSO') NOT NULL,
  `aptitud_piscicola` ENUM('OPTIMO', 'ALERTA_TERMICA', 'DEFICIT_OXIGENO', 'NO_APTO', 'NO_EVALUADO') NOT NULL DEFAULT 'NO_EVALUADO',
  INDEX `idx_proc_nodo_fecha` (`id_nodo`, `timestamp`),
  CONSTRAINT `fk_proc_raw` FOREIGN KEY (`id_raw`) REFERENCES `mediciones_raw` (`id_raw`) ON DELETE RESTRICT,
  CONSTRAINT `fk_proc_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Telemetría procesada con caudal por molinete y evaluación agro-acuícola';

-- ========================================================================================
-- 8. TABLA: CLIMA OPENWEATHERMAP (Correlación Meteorológica)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `clima_openweather` (
  `id_clima` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_nodo` CHAR(36) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `temp_ambiente_c` DECIMAL(5, 2) NOT NULL,
  `sensacion_termica_c` DECIMAL(5, 2) NULL,
  `humedad_pct` DECIMAL(5, 2) NOT NULL,
  `presion_hpa` DECIMAL(6, 1) NOT NULL,
  `lluvia_1h_mm` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `lluvia_3h_mm` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `nubosidad_pct` TINYINT NOT NULL DEFAULT 0,
  `viento_vel_ms` DECIMAL(5, 2) NULL,
  `viento_dir_deg` SMALLINT NULL,
  `condicion_principal` VARCHAR(50) NOT NULL,
  `descripcion_clima` VARCHAR(100) NOT NULL,
  `icono_codigo` VARCHAR(10) NULL,
  INDEX `idx_clima_nodo_fecha` (`id_nodo`, `timestamp`),
  CONSTRAINT `fk_clima_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Datos meteorológicos por coordenadas de nodo';

-- ========================================================================================
-- 9. TABLA: CONFIGURACIÓN DE UMBRALES DE ALERTA
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `umbrales_config` (
  `id_umbral` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_nodo` CHAR(36) NOT NULL UNIQUE,
  `ph_min_alerta` DECIMAL(4, 2) NOT NULL DEFAULT 6.50,
  `ph_max_alerta` DECIMAL(4, 2) NOT NULL DEFAULT 8.50,
  `ec_max_advertencia_us_cm` DECIMAL(7, 2) NOT NULL DEFAULT 1200.00,
  `ec_max_critico_us_cm` DECIMAL(7, 2) NOT NULL DEFAULT 1500.00,
  `tds_max_alerta_ppm` DECIMAL(7, 2) NOT NULL DEFAULT 750.00,
  `turb_max_alerta_ntu` DECIMAL(7, 2) NOT NULL DEFAULT 50.00,
  `tirante_min_alerta_cm` DECIMAL(6, 2) NOT NULL DEFAULT 10.00,
  `temperatura_max_piscicola_c` DECIMAL(4, 2) NOT NULL DEFAULT 18.00 COMMENT 'Alerta de temperatura alta para truchas',
  `oxigeno_min_piscicola_mgl` DECIMAL(4, 2) NOT NULL DEFAULT 5.50 COMMENT 'Alerta de déficit de oxígeno',
  `bateria_min_alerta_v` DECIMAL(4, 2) NOT NULL DEFAULT 11.50,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_umbrales_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Límites de tolerancia agronómica, acuícola y física por estación';

-- ========================================================================================
-- 10. TABLA: DESTINATARIOS DE ALERTAS (Multiuso: Regantes, Piscicultores, Veedores)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `destinatarios_alertas` (
  `id_destinatario` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_entidad` CHAR(36) NOT NULL,
  `id_tipo_uso` CHAR(36) NOT NULL COMMENT 'Uso productivo (Agrícola, Piscícola, etc.)',
  `id_nodo_suscrito` CHAR(36) NOT NULL,
  `registrado_por_usuario_id` CHAR(36) NULL,
  `nombres` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(100) NOT NULL,
  `dni_ruc` VARCHAR(20) NULL,
  `telefono_whatsapp` VARCHAR(30) NOT NULL,
  `email` VARCHAR(100) NULL,
  `rol_usuario` VARCHAR(50) NOT NULL DEFAULT 'BENEFICIARIO_AGUA',
  `detalle_actividad` VARCHAR(150) NULL COMMENT 'ej: Parcela Huayopampa Melocotonero / Piscigranja 4 Pozas Trucha',
  `sector_predio` VARCHAR(100) NULL,
  `recibe_alertas_calidad` BOOLEAN NOT NULL DEFAULT TRUE,
  `recibe_alertas_caudal` BOOLEAN NOT NULL DEFAULT TRUE,
  `recibe_alertas_mantenimiento` BOOLEAN NOT NULL DEFAULT TRUE,
  `recibe_reporte_diario` BOOLEAN NOT NULL DEFAULT FALSE,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_dest_entidad` (`id_entidad`),
  INDEX `idx_dest_nodo` (`id_nodo_suscrito`),
  INDEX `idx_dest_uso` (`id_tipo_uso`),
  CONSTRAINT `fk_dest_entidad` FOREIGN KEY (`id_entidad`) REFERENCES `entidades` (`id_entidad`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dest_uso` FOREIGN KEY (`id_tipo_uso`) REFERENCES `tipos_uso_agua` (`id_tipo_uso`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dest_nodo` FOREIGN KEY (`id_nodo_suscrito`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dest_usuario` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Usuarios suscritos a alertas segmentadas según actividad y tramo';

-- ========================================================================================
-- 11. TABLA: LOG DE ALERTAS Y EVENTOS
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `alertas_log` (
  `id_alerta` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_nodo` CHAR(36) NOT NULL,
  `id_proc` CHAR(36) NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nivel_severidad` ENUM('INFO', 'ADVERTENCIA_AMARILLA', 'CRITICO_ROJO') NOT NULL,
  `tipo_evento` ENUM('SALINIDAD_ALTA', 'PH_FUERA_RANGO', 'TURBIDEZ_ALTA', 'ESTIAJE_CAUDAL_BAJO', 'CRECIDA_CAUDAL_ALTO', 'ESTRES_TERMICO_PISCICOLA', 'DEFICIT_OXIGENO_TRUCHAS', 'BATERIA_BAJA', 'FALLO_SENSOR', 'DESCONEXION_NODO') NOT NULL,
  `variable_origen` VARCHAR(50) NOT NULL,
  `valor_registrado` DECIMAL(10, 2) NOT NULL,
  `valor_umbral` DECIMAL(10, 2) NOT NULL,
  `mensaje_tecnico` TEXT NOT NULL,
  `mensaje_campesino_whatsapp` TEXT NOT NULL,
  `estado_envio_whatsapp` ENUM('PENDIENTE', 'ENVIADO', 'FALLIDO', 'OMITIDO') NOT NULL DEFAULT 'PENDIENTE',
  `destinatarios_notificados_count` INT NOT NULL DEFAULT 0,
  `fecha_envio` DATETIME NULL,
  INDEX `idx_alerta_nodo_fecha` (`id_nodo`, `timestamp`),
  CONSTRAINT `fk_alerta_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT,
  CONSTRAINT `fk_alerta_proc` FOREIGN KEY (`id_proc`) REFERENCES `mediciones_procesadas` (`id_proc`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Historial de contingencias y difusión de alertas tempranas';

-- ========================================================================================
-- 12. TABLA: TURNOS DE RIEGO (Topología Hidráulica Entre Nodos y Balance en Tiempo Real)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `turnos_riego` (
  `id_turno` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_entidad` CHAR(36) NOT NULL COMMENT 'Entidad emisora de la orden de distribución',
  `id_destinatario` CHAR(36) NOT NULL COMMENT 'Usuario o regante asignado',
  `id_nodo_aguas_arriba` CHAR(36) NOT NULL COMMENT 'Estación upstream del tramo hidrográfico',
  `id_nodo_aguas_abajo` CHAR(36) NOT NULL COMMENT 'Estación downstream de control',
  `id_nodo_bocatoma` CHAR(36) NOT NULL COMMENT 'Punto de toma o derivación física',
  `fecha_inicio_programada` DATETIME NOT NULL,
  `fecha_fin_programada` DATETIME NOT NULL,
  `horas_programadas` DECIMAL(4, 2) NOT NULL,
  `caudal_acordado_ls` DECIMAL(6, 2) NOT NULL,
  `volumen_programado_m3` DECIMAL(8, 2) NOT NULL,
  `volumen_real_entregado_m3` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `balance_impacto_tramo_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Porcentaje de impacto sobre el caudal aguas abajo',
  `cumplimiento_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `estado_turno` ENUM('PROGRAMADO', 'EN_EJECUCION', 'COMPLETADO_EXITOSO', 'DEFICIT_VOLUMEN', 'CANCELADO_CONTAMINACION', 'CANCELADO_ADMIN') NOT NULL DEFAULT 'PROGRAMADO',
  `observaciones` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_turno_dest` (`id_destinatario`),
  INDEX `idx_turno_tramos` (`id_nodo_aguas_arriba`, `id_nodo_aguas_abajo`),
  CONSTRAINT `fk_turno_entidad` FOREIGN KEY (`id_entidad`) REFERENCES `entidades` (`id_entidad`) ON DELETE RESTRICT,
  CONSTRAINT `fk_turno_dest` FOREIGN KEY (`id_destinatario`) REFERENCES `destinatarios_alertas` (`id_destinatario`) ON DELETE RESTRICT,
  CONSTRAINT `fk_turno_arriba` FOREIGN KEY (`id_nodo_aguas_arriba`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT,
  CONSTRAINT `fk_turno_abajo` FOREIGN KEY (`id_nodo_aguas_abajo`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT,
  CONSTRAINT `fk_turno_bocatoma` FOREIGN KEY (`id_nodo_bocatoma`) REFERENCES `nodos` (`id_nodo`) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Turnos de dotación con modelado topológico de afectación a la red';

-- ========================================================================================
-- 13. TABLA: PREDICCIONES DE INTELIGENCIA ARTIFICIAL (Modelos GRU / Lead Time)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `predicciones_ia` (
  `id_prediccion` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_nodo` CHAR(36) NOT NULL,
  `fecha_emision` DATETIME NOT NULL,
  `horizonte_horas` TINYINT NOT NULL,
  `fecha_proyectada` DATETIME NOT NULL,
  `caudal_predicho_m3s` DECIMAL(8, 4) NOT NULL,
  `wqi_predicho` DECIMAL(5, 2) NOT NULL,
  `ph_predicho` DECIMAL(4, 2) NOT NULL,
  `ec_predicho_us_cm` DECIMAL(7, 2) NOT NULL,
  `riesgo_estres_hidrico` ENUM('BAJO', 'MODERADO', 'ALTO', 'CRITICO') NOT NULL,
  `lead_time_horas_llegada_pluma` DECIMAL(4, 2) NULL,
  `modelo_version` VARCHAR(50) NOT NULL DEFAULT 'GRU-Hydrologic-v3.0',
  INDEX `idx_pred_nodo_proy` (`id_nodo`, `fecha_proyectada`),
  CONSTRAINT `fk_pred_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Series temporales proyectadas por el motor de IA';

-- ========================================================================================
-- 14. TABLA: CULTIVOS AGRÍCOLAS (Catálogo Dinámico MIDAGRI / Internacional)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `cultivos_agricolas` (
  `id_cultivo` VARCHAR(50) PRIMARY KEY COMMENT 'ID único mnemotécnico (ej: palto, papa, vid)',
  `codigo_catalogo` VARCHAR(50) NOT NULL DEFAULT 'MIDAGRI_PE',
  `pais_origen` VARCHAR(50) NOT NULL DEFAULT 'Perú',
  `region_natural` VARCHAR(30) NOT NULL DEFAULT 'Costa' COMMENT 'Costa, Sierra, Selva, Transversal, Nacional',
  `nombre` VARCHAR(100) NOT NULL,
  `categoria` VARCHAR(80) NOT NULL,
  `demanda_hidrica_m3_ha` DECIMAL(8, 2) NOT NULL DEFAULT 6000.00,
  `ec_umbral_us_cm` DECIMAL(7, 2) NOT NULL DEFAULT 1500.00,
  `salinidad_pendiente_pct` DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  `ph_min` DECIMAL(4, 2) NOT NULL DEFAULT 6.00,
  `ph_max` DECIMAL(4, 2) NOT NULL DEFAULT 7.50,
  `turbidez_max_ntu` DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
  `temp_agua_min_c` DECIMAL(4, 2) NOT NULL DEFAULT 12.00,
  `temp_agua_max_c` DECIMAL(4, 2) NOT NULL DEFAULT 26.00,
  `wqi_min` DECIMAL(5, 2) NOT NULL DEFAULT 60.00,
  `dias_ciclo_vegetativo` INT NOT NULL DEFAULT 180,
  `rendimiento_base_kg_ha` DECIMAL(10, 2) NOT NULL DEFAULT 15000.00,
  `precio_base_moneda_kg` DECIMAL(6, 2) NOT NULL DEFAULT 3.00,
  `moneda_codigo` VARCHAR(5) NOT NULL DEFAULT 'PEN',
  `nivel_resiliencia` VARCHAR(30) NOT NULL DEFAULT 'Media',
  `descripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cultivos_region` (`region_natural`),
  INDEX `idx_cultivos_pais` (`pais_origen`)
) ENGINE=InnoDB COMMENT='Catálogo biofísico y agronómico de cultivos para modelos What-If y estrés osmótico';

-- ========================================================================================
-- 15. TABLA: REGISTRO DE MODELOS DE INTELIGENCIA ARTIFICIAL (MLOps)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `modelos_ia` (
  `id_modelo` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `codigo_modelo` VARCHAR(60) NOT NULL UNIQUE,
  `nombre` VARCHAR(120) NOT NULL,
  `tipo_modelo` ENUM('SERIE_TEMPORAL', 'CLASIFICADOR_ANOMALIAS', 'SIMULADOR_FISICO', 'GRAFO_ESPACIAL', 'ESTRES_AGRONOMICO') NOT NULL,
  `framework` VARCHAR(40) NOT NULL DEFAULT 'SCIKIT_LEARN',
  `version` VARCHAR(30) NOT NULL DEFAULT '1.0.0',
  `descripcion` TEXT NULL,
  `metricas_rendimiento_json` JSON NULL,
  `hiperparametros_json` JSON NULL,
  `ruta_artefacto` VARCHAR(255) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `fecha_entrenamiento` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_modelos_tipo` (`tipo_modelo`),
  INDEX `idx_modelos_activo` (`activo`)
) ENGINE=InnoDB COMMENT='Catálogo de versiones y métricas de modelos IA';

-- ========================================================================================
-- 16. TABLA: ANOMALÍAS DETECTADAS POR IA
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `anomalias_detectadas_ia` (
  `id_anomalia` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_nodo` CHAR(36) NOT NULL,
  `id_modelo` CHAR(36) NULL,
  `timestamp_deteccion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `anomaly_score` DECIMAL(6, 4) NOT NULL,
  `tipo_evento` VARCHAR(60) NOT NULL,
  `severidad` ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
  `vector_lectura_json` JSON NOT NULL,
  `diagnostico_ia` TEXT NOT NULL,
  `accion_recomendada` TEXT NULL,
  `estado_resolucion` ENUM('PENDIENTE', 'VERIFICADO_CAMPO', 'FALSA_ALARMA', 'RESUELTO') NOT NULL DEFAULT 'PENDIENTE',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_anomalia_nodo` (`id_nodo`),
  INDEX `idx_anomalia_timestamp` (`timestamp_deteccion`),
  CONSTRAINT `fk_anomalia_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE,
  CONSTRAINT `fk_anomalia_modelo` FOREIGN KEY (`id_modelo`) REFERENCES `modelos_ia` (`id_modelo`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Incidentes anómalos detectados por algoritmos ML/DL';

-- ========================================================================================
-- 17. TABLA: SIMULACIONES "WHAT-IF" ENRIQUECIDAS
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `simulaciones_whatif` (
  `id_simulacion` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_entidad` CHAR(36) NULL,
  `ejecutado_por_usuario_id` CHAR(36) NULL,
  `id_cultivo` VARCHAR(50) NULL,
  `titulo_escenario` VARCHAR(150) NOT NULL,
  `fecha_ejecucion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delta_precipitacion_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `delta_salinidad_us_cm` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
  `delta_caudal_cabecera_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `delta_ph` DECIMAL(4, 2) NOT NULL DEFAULT 0.00,
  `duracion_horas` INT NOT NULL DEFAULT 12,
  `resultado_wqi_valle` DECIMAL(5, 2) NOT NULL,
  `resultado_caudal_valle_m3s` DECIMAL(8, 4) NOT NULL,
  `perdida_rendimiento_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `nivel_estres_osmotico` VARCHAR(50) NULL,
  `volumen_desembalse_m3` DECIMAL(12, 2) NULL,
  `resumen_impacto` TEXT NOT NULL,
  `payload_cascada_json` JSON NULL COMMENT 'Datos de animación de propagación para el Gemelo Digital 3D',
  `ejecutado_por` VARCHAR(100) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT `fk_whatif_entidad` FOREIGN KEY (`id_entidad`) REFERENCES `entidades` (`id_entidad`) ON DELETE SET NULL,
  CONSTRAINT `fk_whatif_usuario` FOREIGN KEY (`ejecutado_por_usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_whatif_cultivo` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos_agricolas` (`id_cultivo`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Escenarios prospectivos What-If ejecutados y proyecciones 3D';

-- ========================================================================================
-- 18. TABLA: ESTADÍSTICAS REGIONALES AGRÍCOLAS (Histórico SIEA 2017-2023)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `estadisticas_regionales_agro` (
  `id_estadistica` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_cultivo` VARCHAR(50) NULL,
  `codigo_cultivo` VARCHAR(50) NOT NULL,
  `departamento_region` VARCHAR(50) NOT NULL,
  `region_natural` VARCHAR(20) NOT NULL DEFAULT 'COSTA',
  `anio` INT NOT NULL,
  `siembras_ha` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `cosechas_ha` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `produccion_t` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `rendimiento_kgha` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `precio_chacra_skg` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `valor_bruto_produccion_pen` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_estadistica_cultivo` (`id_cultivo`),
  INDEX `idx_estadistica_depto` (`departamento_region`),
  INDEX `idx_estadistica_anio` (`anio`),
  CONSTRAINT `fk_est_cultivo` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos_agricolas` (`id_cultivo`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Histórico estadístico agrícola por departamento';

-- ========================================================================================
-- 19. TABLA: PERFILES DE RIESGO REGIONAL AGRÍCOLA (Encuesta ENA 2024-2025)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `perfiles_riesgo_regional_agro` (
  `id_perfil_riesgo` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_cultivo` VARCHAR(50) NULL,
  `codigo_cultivo` VARCHAR(50) NOT NULL,
  `departamento_region` VARCHAR(50) NOT NULL,
  `region_natural` VARCHAR(20) NOT NULL DEFAULT 'COSTA',
  `frecuencia_sequia_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `frecuencia_inundacion_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `frecuencia_plagas_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `frecuencia_heladas_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `perdida_rendimiento_promedio_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `nivel_vulnerabilidad_hidrica` ENUM('BAJA', 'MEDIA', 'ALTA') NOT NULL DEFAULT 'MEDIA',
  `fuente_riego_principal` VARCHAR(50) NOT NULL DEFAULT 'GRAVEDAD_SUPERFICIAL',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_riesgo_cultivo` (`id_cultivo`),
  INDEX `idx_riesgo_depto` (`departamento_region`),
  CONSTRAINT `fk_riesgo_cultivo` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos_agricolas` (`id_cultivo`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Perfiles de riesgo y vulnerabilidad agroclimática por departamento';

-- ========================================================================================
-- 20. TABLA: INTENCIONES DE SIEMBRA AGRÍCOLA (Campañas Agrícolas Oficiales)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `intenciones_siembra_agro` (
  `id_intencion` CHAR(36) PRIMARY KEY COMMENT 'UUID v7',
  `id_cultivo` VARCHAR(50) NULL,
  `codigo_cultivo` VARCHAR(50) NOT NULL,
  `departamento_region` VARCHAR(50) NOT NULL,
  `campania_agricola` VARCHAR(30) NOT NULL DEFAULT '2024-2025',
  `superficie_proyectada_ha` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `variacion_vs_campania_anterior_pct` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `mes_inicio_siembras` VARCHAR(30) NULL,
  `mes_fin_siembras` VARCHAR(30) NULL,
  `requerimiento_hidrico_estimado_m3` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_intencion_cultivo` (`id_cultivo`),
  INDEX `idx_intencion_depto` (`departamento_region`),
  CONSTRAINT `fk_intencion_cultivo` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos_agricolas` (`id_cultivo`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Metas e intenciones de siembra y demanda volumétrica';

-- ========================================================================================
-- REACTIVAR CLAVES FORÁNEAS
-- ========================================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================================================
-- SEMILLERO LIMPIO (CLEAN SLATE SEED)
-- Solo se siembran catálogos maestros y la entidad/cargo raíz para el primer despliegue.
-- ========================================================================================

-- 0. Catálogo Base de Tipos de Recurso Hídrico para Gemelo 3D
INSERT INTO `tipos_recurso_hidrico` (`id_tipo_recurso`, `codigo`, `nombre`, `descripcion`, `permite_riego_defecto`, `permite_piscicultura_defecto`, `geometria_3d_tipo`, `activo`) VALUES
('0191e4b5-0000-7000-8000-000000000001', 'RIO', 'Río / Cuenca Fluvial', 'Cuerpo lótico continuo con cauce natural dinámico', TRUE, FALSE, 'LINEA_FLUJO', TRUE),
('0191e4b5-0000-7000-8000-000000000002', 'CUENCA', 'Cuenca Hidrográfica Integral', 'Área orográfica drenada por un sistema de drenaje natural', TRUE, TRUE, 'MALLA_VOLUMETRICA', TRUE),
('0191e4b5-0000-7000-8000-000000000003', 'LAGUNA', 'Laguna / Lago Andino', 'Cuerpo léntico de almacenamiento natural en alta montaña', FALSE, TRUE, 'SUPERFICIE_POLIGONAL', TRUE),
('0191e4b5-0000-7000-8000-000000000004', 'EMBALSE', 'Embalse / Presa Hidráulica', 'Vaso de almacenamiento artificial regulado por compuertas', TRUE, TRUE, 'VOLUMEN_EMBALSE', TRUE),
('0191e4b5-0000-7000-8000-000000000005', 'CANAL_RIEGO', 'Canal Principal de Riego / Derivación', 'Conducto artificial prismático para transporte y entrega de agua', TRUE, FALSE, 'CANAL_PRISMATICO', TRUE),
('0191e4b5-0000-7000-8000-000000000006', 'ACUIFERO', 'Acuífero / Sector Subterráneo', 'Estrato subterráneo permeable con pozos de monitoreo', TRUE, FALSE, 'ESTRATO_SUBTERRANEO', TRUE),
('0191e4b5-0000-7000-8000-000000000007', 'SECTOR_HIDROLOGICO', 'Sector Hidrológico Delimitado', 'Polígono específico de gestión para una junta de usuarios', TRUE, TRUE, 'POLIGONO_SUPERFICIAL', TRUE)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- 1. Catálogo Base de Tipos de Entidad
INSERT INTO `tipos_entidad` (`id_tipo_entidad`, `codigo`, `nombre`, `descripcion`, `permite_gestion_riego`, `permite_gestion_piscicultura`, `activo`) VALUES
('0191e4b5-0001-7000-8000-000000000001', 'AUTORIDAD_NACIONAL', 'Autoridad Nacional / Organismo Regulador', 'Supervisión estatal de recursos hídricos, calidad ambiental y gobernanza general.', FALSE, FALSE, TRUE),
('0191e4b5-0001-7000-8000-000000000002', 'ENTIDAD_MONITOREO', 'Organismo de Monitoreo Ambiental / Científico', 'Monitoreo técnico, laboratorios, universidades o centros de investigación.', FALSE, TRUE, TRUE),
('0191e4b5-0001-7000-8000-000000000003', 'JUNTA_USUARIOS', 'Junta de Usuarios de Sector Hidráulico', 'Administración y distribución mayor del agua en cuencas, valles o distritos de riego.', TRUE, FALSE, TRUE),
('0191e4b5-0001-7000-8000-000000000004', 'COMISION_REGANTES', 'Comisión / Comité de Regantes', 'Distribución menor en canales de derivación y coordinación de turnos con agricultores.', TRUE, FALSE, TRUE),
('0191e4b5-0001-7000-8000-000000000005', 'ASOCIACION_PISCICOLA', 'Asociación / Empresa Piscícola o Acuícola', 'Monitoreo de calidad de agua fría para criaderos de truchas u otras especies acuícolas.', FALSE, TRUE, TRUE),
('0191e4b5-0001-7000-8000-000000000006', 'EMPRESA_OPERADORA', 'Empresa Operadora (Hidroeléctrica / Saneamiento / Minera)', 'Monitoreo de captaciones, vertimientos autorizados y responsabilidad corporativa.', FALSE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- 2. Cargos Institucionales Base Vinculados
INSERT INTO `cargos_institucionales` (`id_cargo`, `id_tipo_entidad`, `codigo_cargo`, `nombre_cargo`, `nivel_jerarquia`, `descripcion`, `activo`) VALUES
-- AUTORIDAD_NACIONAL
('0191e4b5-0002-7000-8000-000000000001', '0191e4b5-0001-7000-8000-000000000001', 'SUPERADMIN_PLATAFORMA', 'Superadministrador Sentinel-H2O', 3, 'Control maestro y configuración global de la plataforma', TRUE),
('0191e4b5-0002-7000-8000-000000000002', '0191e4b5-0001-7000-8000-000000000001', 'DIRECTOR_RECURSOS_HIDRICOS', 'Director / Especialista de Recursos Hídricos', 3, 'Planificación estratégica y fiscalización', TRUE),
('0191e4b5-0002-7000-8000-000000000010', '0191e4b5-0001-7000-8000-000000000001', 'ADMIN_ALA', 'Administrador Local de Agua (ALA)', 3, 'Autoridad reguladora del agua en la cuenca', TRUE),
('0191e4b5-0002-7000-8000-000000000011', '0191e4b5-0001-7000-8000-000000000001', 'ESP_CALIDAD_AGUA', 'Especialista en Calidad de Agua', 2, 'Supervisión de parámetros físico-químicos y ECA', TRUE),
-- JUNTA_USUARIOS
('0191e4b5-0002-7000-8000-000000000003', '0191e4b5-0001-7000-8000-000000000003', 'INGENIERO_DISTRIBUCION', 'Ingeniero de Operación y Distribución', 2, 'Cálculo de balances y asignación de dotaciones', TRUE),
('0191e4b5-0002-7000-8000-000000000012', '0191e4b5-0001-7000-8000-000000000003', 'ADMIN_CUENCA', 'Administrador General de Cuenca', 3, 'Máxima responsabilidad en gestión y gobernanza hídrica', TRUE),
('0191e4b5-0002-7000-8000-000000000013', '0191e4b5-0001-7000-8000-000000000003', 'PRESIDENTE_JUNTA', 'Presidente de Junta de Usuarios', 3, 'Titular directivo representativo de los usuarios', TRUE),
('0191e4b5-0002-7000-8000-000000000014', '0191e4b5-0001-7000-8000-000000000003', 'GERENTE_TECNICO', 'Gerente Técnico de Operaciones', 2, 'Dirección técnica y planificación de campañas de riego', TRUE),
('0191e4b5-0002-7000-8000-000000000015', '0191e4b5-0001-7000-8000-000000000003', 'SECTORISTA_HIDRAULICO', 'Sectorista Hidráulico', 2, 'Control de aforos y entrega en sectores hidráulicos', TRUE),
-- COMISION_REGANTES
('0191e4b5-0002-7000-8000-000000000004', '0191e4b5-0001-7000-8000-000000000004', 'TOMERO_SECTORIAL', 'Tomero Sectorial de Canal', 1, 'Apertura y cierre físico de compuertas y vigilancia de campo', TRUE),
('0191e4b5-0002-7000-8000-000000000016', '0191e4b5-0001-7000-8000-000000000004', 'PRESIDENTE_COMISION', 'Presidente de Comisión de Regantes', 3, 'Representante electo de los regantes del subsector', TRUE),
('0191e4b5-0002-7000-8000-000000000017', '0191e4b5-0001-7000-8000-000000000004', 'OPERADOR_COMPUERTAS', 'Operador de Compuertas y Aforador', 1, 'Control de compuertas y entrega de agua en parcelas', TRUE),
-- ASOCIACION_PISCICOLA
('0191e4b5-0002-7000-8000-000000000005', '0191e4b5-0001-7000-8000-000000000005', 'BIOLOGO_ACUICOLA', 'Biólogo Acuícola / Responsable de Piscigranja', 2, 'Monitoreo de biomasa, temperatura y oxígeno disuelto para truchas', TRUE),
('0191e4b5-0002-7000-8000-000000000018', '0191e4b5-0001-7000-8000-000000000005', 'SUP_ACUICOLA', 'Supervisor Técnico Acuícola', 2, 'Control de calidad del agua en estanques y biofiltros', TRUE),
-- ENTIDAD_MONITOREO
('0191e4b5-0002-7000-8000-000000000006', '0191e4b5-0001-7000-8000-000000000002', 'AUDITOR_AMBIENTAL', 'Auditor / Veedor Ciudadano', 1, 'Auditoría externa y lectura pública de indicadores', TRUE),
('0191e4b5-0002-7000-8000-000000000019', '0191e4b5-0001-7000-8000-000000000002', 'DIRECTOR_CIENTIFICO', 'Director de Investigación Hidrológica', 3, 'Modelamiento numérico y proyectos ambientales', TRUE),
('0191e4b5-0002-7000-8000-000000000020', '0191e4b5-0001-7000-8000-000000000002', 'OPERADOR_ESTACION', 'Operador de Estación Hidrométrica', 2, 'Mantenimiento preventivo y calibración electroquímica', TRUE),
-- EMPRESA_OPERADORA
('0191e4b5-0002-7000-8000-000000000021', '0191e4b5-0001-7000-8000-000000000006', 'GERENTE_SANEAMIENTO', 'Gerente de Operaciones y Saneamiento', 3, 'Gestión de captaciones de agua cruda y potabilización', TRUE)
ON DUPLICATE KEY UPDATE `nombre_cargo` = VALUES(`nombre_cargo`);

-- 3. Catálogo Base de Tipos de Uso del Agua
INSERT INTO `tipos_uso_agua` (`id_tipo_uso`, `codigo`, `nombre`, `unidad_medida_demanda`, `parametros_optimos_json`, `activo`) VALUES
('0191e4b5-0003-7000-8000-000000000001', 'AGRICOLA', 'Uso Agrario y Riego', 'm3/ha/mes', '{"ec_max_optima_us_cm": 1200, "ph_min": 6.5, "ph_max": 8.5}', TRUE),
('0191e4b5-0003-7000-8000-000000000002', 'PISCICOLA_TRUCHAS', 'Piscicultura en Agua Fría (Trucha Arcoíris)', 'l/s', '{"temp_max_optima_c": 16.0, "temp_critica_c": 18.0, "oxigeno_min_mgl": 6.5, "ph_min": 6.8, "ph_max": 8.0}', TRUE),
('0191e4b5-0003-7000-8000-000000000003', 'CONSUMO_HUMANO', 'Consumo Poblacional y Agua Potable', 'l/persona/dia', '{"turbidez_max_ntu": 5.0, "ph_min": 6.5, "ph_max": 8.5, "ec_max_us_cm": 1000}', TRUE),
('0191e4b5-0003-7000-8000-000000000004', 'ECOLOGICO_CONSERVACION', 'Caudal Ecológico y Conservación de Ecosistemas', 'm3/s', '{"wqi_minimo": 70.0, "oxigeno_min_mgl": 5.0}', TRUE)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- 4. Entidad Raíz Inicial de Plataforma
INSERT INTO `entidades` (`id_entidad`, `id_tipo_entidad`, `nombre_entidad`, `ruc`, `telefono_contacto`, `email_contacto`, `direccion`, `activo`) VALUES
('0191e4b5-0004-7000-8000-000000000001', '0191e4b5-0001-7000-8000-000000000001', 'Sentinel-H2O Core Platform', NULL, NULL, 'admin@sentinel-h2o.org', 'Sede Central', TRUE)
ON DUPLICATE KEY UPDATE `nombre_entidad` = VALUES(`nombre_entidad`);

-- 5. Configuración Inicial Singleton Pendiente de Aprovisionamiento (Setup Wizard)
INSERT INTO `configuracion_recurso_hidrico` (
  `id_config`, `nombre_recurso`, `tipo_recurso`, `pais`, `region`, `ubicacion_detallada`, 
  `latitud_centro`, `longitud_centro`, `zoom_inicial`, `id_entidad_administradora`,
  `modulo_riego_habilitado`, `modulo_piscicultura_habilitado`, `modulo_ia_habilitado`, 
  `configuracion_inicial_completada`, `activo`
) VALUES (
  '0191e4b5-0000-7000-8000-000000000001', 'Recurso Hídrico No Configurado', 'RIO', 'Perú', 'Nacional', 
  'Pendiente de parametrización por el Administrador en el primer despliegue.',
  -11.4900000, -77.0500000, 10, '0191e4b5-0004-7000-8000-000000000001',
  FALSE, FALSE, TRUE, FALSE, TRUE
)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;
