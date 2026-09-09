-- ========================================================================================
-- PROYECTO: SENTINEL-H2O — Gemelo Virtual de la Cuenca Chancay-Huaral
-- AUTOR: Equipo Técnico Sentinel-H2O (I Concurso CyT Seguridad Hídrica - ANA)
-- DESCRIPCIÓN: Esquema Relacional de Base de Datos MySQL (Fase MVP 3 Nodos + N-Nodos)
-- VERSION: 2.0 (Multientidad, OpenWeatherMap, Calibración Remota, Alertas e IA)
-- ========================================================================================

CREATE DATABASE IF NOT EXISTS `sentinel_h2o_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `sentinel_h2o_db`;

-- ========================================================================================
-- 1. TABLA: ENTIDADES / ORGANIZACIONES (Gobernanza Multientidad)
-- Permite mapear qué entidad pública o privada administra y registra a los regantes.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `entidades` (
  `id_entidad` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre_entidad` VARCHAR(150) NOT NULL COMMENT 'Nombre oficial de la institución o junta',
  `tipo_entidad` ENUM('GUBERNAMENTAL_ANA', 'JUNTA_USUARIOS', 'COMISION_REGANTES', 'COOPERATIVA_AGRARIA', 'OTRO') NOT NULL,
  `ruc` VARCHAR(20) NULL COMMENT 'RUC institucional opcional',
  `telefono_contacto` VARCHAR(30) NULL,
  `email_contacto` VARCHAR(100) NULL,
  `direccion` VARCHAR(200) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Catálogo de entidades gestoras del agua (ANA, Juntas, Comisiones)';

-- ========================================================================================
-- 2. TABLA: NODOS TELEMÉTRICOS (Infraestructura IoT de Campo)
-- Catálogo agnóstico a la cantidad de nodos (Soporta 3 MVP o 50+ nodos sin cambios)
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `nodos` (
  `id_nodo` VARCHAR(50) PRIMARY KEY COMMENT 'Identificador único (ej: NODO-01-CABECERA)',
  `id_entidad_responsable` INT NULL COMMENT 'Entidad que custodia el nodo',
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre legible del punto de monitoreo',
  `sector_cuenca` ENUM('CUENCA_ALTA', 'CUENCA_MEDIA', 'CUENCA_BAJA', 'PARCELA_PILOTO') NOT NULL,
  `subcuenca` VARCHAR(100) NOT NULL COMMENT 'Subcuenca hidrográfica (ej: Vichaycocha, Baños, Añasmayo)',
  `latitud` DECIMAL(10, 7) NOT NULL COMMENT 'Latitud geográfica decimal WGS84',
  `longitud` DECIMAL(10, 7) NOT NULL COMMENT 'Longitud geográfica decimal WGS84',
  `cota_msnm` DECIMAL(7, 2) NOT NULL COMMENT 'Altitud en msnm',
  `tipo_fuente` ENUM('RIO_PRINCIPAL', 'LAGUNA_REPRESADA', 'CANAL_DERIVACION', 'BOCATOMA_PARCELA', 'DRENAJE') NOT NULL,
  `api_key_hash` VARCHAR(128) NOT NULL COMMENT 'Hash o token seguro para autenticación HTTP del ESP32',
  `intervalo_envio_min` INT NOT NULL DEFAULT 15 COMMENT 'Frecuencia de telemetría esperada en minutos',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `descripcion` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_nodos_entidad` FOREIGN KEY (`id_entidad_responsable`) REFERENCES `entidades` (`id_entidad`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Puntos de monitoreo físico IoT desplegados a lo largo de la cuenca';

-- ========================================================================================
-- 3. TABLA: CALIBRACIONES DE NODO (Calibración Remota sin reprogramar Firmware)
-- Factores de conversión analógica, offsets, distancias y curvas hidráulicas.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `calibraciones_nodo` (
  `id_calibracion` INT AUTO_INCREMENT PRIMARY KEY,
  `id_nodo` VARCHAR(50) NOT NULL,
  `ph_offset_v` DECIMAL(6, 4) NOT NULL DEFAULT 2.5000 COMMENT 'Voltaje analógico a pH neutro 7.00',
  `ph_slope` DECIMAL(6, 4) NOT NULL DEFAULT -0.1800 COMMENT 'Delta Voltaje por unidad de pH',
  `tds_factor_k` DECIMAL(6, 4) NOT NULL DEFAULT 0.5000 COMMENT 'Relación TDS (ppm) a EC (uS/cm)',
  `tds_offset_v` DECIMAL(6, 4) NOT NULL DEFAULT 0.0000 COMMENT 'Offset de tensión del sensor TDS',
  `turb_v_clear` DECIMAL(6, 4) NOT NULL DEFAULT 4.2000 COMMENT 'Voltaje en agua cristalina (0 NTU)',
  `turb_v_turbid` DECIMAL(6, 4) NOT NULL DEFAULT 2.5000 COMMENT 'Voltaje a máxima turbidez (3000 NTU)',
  `distancia_fondo_sensor_cm` DECIMAL(6, 2) NOT NULL COMMENT 'Distancia del sensor ultrasónico al lecho/fondo del canal',
  `caudal_coef_k` DECIMAL(8, 4) NOT NULL DEFAULT 1.0000 COMMENT 'Coeficiente K en curva Q = K * h^N',
  `caudal_exp_n` DECIMAL(6, 4) NOT NULL DEFAULT 1.5000 COMMENT 'Exponente N en curva nivel-caudal',
  `fecha_calibracion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calibrado_por` VARCHAR(100) NULL,
  `es_vigente` BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT `fk_calib_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Parámetros de calibración física y curvas hidráulicas por nodo';

-- ========================================================================================
-- 4. TABLA: MEDICIONES RAW (Datos Crudos Inmutables del ESP32)
-- Almacena los voltajes analógicos, distancias y salud del hardware tal cual llegaron.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `mediciones_raw` (
  `id_raw` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_nodo` VARCHAR(50) NOT NULL,
  `timestamp_servidor` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `timestamp_dispositivo_ms` BIGINT NULL COMMENT 'Milisegundos de uptime o RTC del ESP32',
  `raw_v_ph` DECIMAL(5, 3) NOT NULL COMMENT 'Voltaje leído de sonda pH PH-4502C (0.000 - 3.300 V)',
  `raw_v_tds` DECIMAL(5, 3) NOT NULL COMMENT 'Voltaje leído de módulo Keyestudio TDS (0.000 - 2.300 V)',
  `raw_v_turb` DECIMAL(5, 3) NOT NULL COMMENT 'Voltaje leído tras divisor resistivo de TS-300B (0.000 - 3.300 V)',
  `raw_dist_cm` DECIMAL(6, 2) NOT NULL COMMENT 'Distancia al espejo de agua por ultrasonido JSN-SR04T',
  `temp_agua_c` DECIMAL(5, 2) NOT NULL COMMENT 'Temperatura medida directamente por sonda digital DS18B20',
  `battery_v` DECIMAL(4, 2) NOT NULL COMMENT 'Tensión de batería LiFePO4 / 18650',
  `signal_rssi` TINYINT NULL COMMENT 'Calidad de señal celular GSM (0 - 31 CSQ)',
  `payload_json_backup` JSON NULL COMMENT 'Copia íntegra del JSON recibido para auditoría',
  INDEX `idx_raw_nodo_fecha` (`id_nodo`, `timestamp_servidor`),
  CONSTRAINT `fk_raw_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Registro inmutable de telemetría cruda recibida de campo';

-- ========================================================================================
-- 5. TABLA: MEDICIONES PROCESADAS (Capa Científica, WQI y Caudales)
-- Generada por el Backend en Python tras aplicar compensación térmica y curvas.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `mediciones_procesadas` (
  `id_proc` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_raw` BIGINT NOT NULL UNIQUE COMMENT 'Relación 1:1 con la medición cruda de origen',
  `id_nodo` VARCHAR(50) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `ph` DECIMAL(4, 2) NOT NULL COMMENT 'Potencial de Hidrógeno (0.00 - 14.00)',
  `tds_ppm` DECIMAL(7, 2) NOT NULL COMMENT 'Sólidos Disueltos Totales compensados a 25°C (PPM)',
  `ec_us_cm` DECIMAL(7, 2) NOT NULL COMMENT 'Conductividad Eléctrica estimada (uS/cm)',
  `turbidez_ntu` DECIMAL(7, 2) NOT NULL COMMENT 'Turbidez del agua en unidades NTU',
  `temp_agua_c` DECIMAL(5, 2) NOT NULL COMMENT 'Temperatura del agua en grados Celsius',
  `tirante_agua_cm` DECIMAL(6, 2) NOT NULL COMMENT 'Profundidad/Nivel real del agua en el canal (cm)',
  `caudal_m3s` DECIMAL(8, 4) NOT NULL COMMENT 'Caudal instantáneo en metros cúbicos por segundo',
  `caudal_ls` DECIMAL(8, 2) NOT NULL COMMENT 'Caudal instantáneo en litros por segundo',
  `wqi_score` DECIMAL(5, 2) NOT NULL COMMENT 'Índice de Calidad de Agua Min-Max Ponderado (0 - 100)',
  `wqi_categoria` ENUM('EXCELENTE', 'BUENA', 'POBRE', 'MALA', 'MUY_MALA') NOT NULL,
  `estado_salinidad` ENUM('OPTIMO', 'PRECAUCION', 'PELIGRO_ESTRES_OSMOTICO') NOT NULL,
  `estado_ph` ENUM('ACIDO_PELIGROSO', 'OPTIMO', 'ALCALINO_PELIGROSO') NOT NULL,
  INDEX `idx_proc_nodo_fecha` (`id_nodo`, `timestamp`),
  CONSTRAINT `fk_proc_raw` FOREIGN KEY (`id_raw`) REFERENCES `mediciones_raw` (`id_raw`) ON DELETE CASCADE,
  CONSTRAINT `fk_proc_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Variables físicas, electroquímicas y volumétricas calculadas';

-- ========================================================================================
-- 6. TABLA: CLIMA OPENWEATHERMAP (Historial Meteorológico por Coordenadas de Nodo)
-- Ingesta asíncrona periódica de lluvia, humedad y temperatura para correlación con IA.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `clima_openweather` (
  `id_clima` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_nodo` VARCHAR(50) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `temp_ambiente_c` DECIMAL(5, 2) NOT NULL COMMENT 'Temperatura del aire en °C',
  `sensacion_termica_c` DECIMAL(5, 2) NULL,
  `humedad_pct` DECIMAL(5, 2) NOT NULL COMMENT 'Humedad relativa en %',
  `presion_hpa` DECIMAL(6, 1) NOT NULL COMMENT 'Presión atmosférica en hPa',
  `lluvia_1h_mm` DECIMAL(6, 2) NOT NULL DEFAULT 0.00 COMMENT 'Lluvia acumulada en la última hora (mm)',
  `lluvia_3h_mm` DECIMAL(6, 2) NOT NULL DEFAULT 0.00 COMMENT 'Lluvia acumulada en 3 horas (mm)',
  `nubosidad_pct` TINYINT NOT NULL DEFAULT 0 COMMENT 'Porcentaje de nubosidad (0 - 100%)',
  `viento_vel_ms` DECIMAL(5, 2) NULL COMMENT 'Velocidad del viento en m/s',
  `viento_dir_deg` SMALLINT NULL COMMENT 'Dirección del viento en grados (0 - 360)',
  `condicion_principal` VARCHAR(50) NOT NULL COMMENT 'ej: Rain, Clear, Clouds',
  `descripcion_clima` VARCHAR(100) NOT NULL COMMENT 'ej: lluvia moderada, cielo despejado',
  `icono_codigo` VARCHAR(10) NULL COMMENT 'Código de icono OpenWeather (ej: 10d, 01n)',
  INDEX `idx_clima_nodo_fecha` (`id_nodo`, `timestamp`),
  CONSTRAINT `fk_clima_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Datos meteorológicos locales recolectados de OpenWeather API';

-- ========================================================================================
-- 7. TABLA: CONFIGURACIÓN DE UMBRALES DE ALERTA DINÁMICOS
-- Define límites específicos de salinidad, pH y caudales ajustados por sector y cultivo.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `umbrales_config` (
  `id_umbral` INT AUTO_INCREMENT PRIMARY KEY,
  `id_nodo` VARCHAR(50) NOT NULL UNIQUE,
  `ph_min_alerta` DECIMAL(4, 2) NOT NULL DEFAULT 6.50,
  `ph_max_alerta` DECIMAL(4, 2) NOT NULL DEFAULT 8.50,
  `ec_max_advertencia_us_cm` DECIMAL(7, 2) NOT NULL DEFAULT 1200.00,
  `ec_max_critico_us_cm` DECIMAL(7, 2) NOT NULL DEFAULT 1500.00 COMMENT 'Límite crítico de quema en frutales',
  `tds_max_alerta_ppm` DECIMAL(7, 2) NOT NULL DEFAULT 750.00,
  `turb_max_alerta_ntu` DECIMAL(7, 2) NOT NULL DEFAULT 50.00,
  `tirante_min_alerta_cm` DECIMAL(6, 2) NOT NULL DEFAULT 10.00 COMMENT 'Alerta de canal seco / corte de agua',
  `bateria_min_alerta_v` DECIMAL(4, 2) NOT NULL DEFAULT 11.50 COMMENT 'Alerta de recarga solar deficiente en bateria 12V',
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_umbrales_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Límites de tolerancia agronómica y física por punto de monitoreo';

-- ========================================================================================
-- 8. TABLA: DESTINATARIOS DE ALERTAS (Segmentación Multientidad y Regantes)
-- Mapea a qué entidad pertenece cada usuario, qué rol tiene y qué alertas recibe vía WhatsApp.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `destinatarios_alertas` (
  `id_destinatario` INT AUTO_INCREMENT PRIMARY KEY,
  `id_entidad` INT NOT NULL COMMENT 'Entidad que registró al usuario (ANA, Junta de Usuarios, etc.)',
  `id_nodo_suscrito` VARCHAR(50) NOT NULL COMMENT 'Nodo o canal del que recibe información directa',
  `nombre_completo` VARCHAR(150) NOT NULL,
  `dni_ruc` VARCHAR(20) NULL,
  `telefono_whatsapp` VARCHAR(30) NOT NULL COMMENT 'Número con código de país (ej: +51987654321)',
  `email` VARCHAR(100) NULL,
  `rol_usuario` ENUM('AGRICULTOR', 'TOMERO', 'DIRIGENTE_JUNTA', 'ESPECIALISTA_ANA', 'ADMIN_SISTEMA') NOT NULL,
  `tipo_cultivo` VARCHAR(100) NULL COMMENT 'ej: Melocotón Blanquillo, Manzana, Cítricos, Palto',
  `sector_predio` VARCHAR(100) NULL COMMENT 'ej: Sector Huayopampa - Parcela El Naranjal',
  `recibe_alertas_calidad` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Alertas de pH, salinidad y contaminantes',
  `recibe_alertas_caudal` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Avisos de inicio/corte de turno de agua',
  `recibe_reporte_diario` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Resumen matutino de calidad y volumen',
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_dest_entidad` (`id_entidad`),
  INDEX `idx_dest_nodo` (`id_nodo_suscrito`),
  CONSTRAINT `fk_dest_entidad` FOREIGN KEY (`id_entidad`) REFERENCES `entidades` (`id_entidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_dest_nodo` FOREIGN KEY (`id_nodo_suscrito`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Usuarios finales suscritos a alertas segmentadas según entidad y nodo';

-- ========================================================================================
-- 9. TABLA: LOG DE ALERTAS Y EVENTOS (Registro de Contingencias)
-- Guarda tanto el log técnico para ingenieros como el mensaje campesino enviado a WhatsApp.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `alertas_log` (
  `id_alerta` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_nodo` VARCHAR(50) NOT NULL,
  `id_proc` BIGINT NULL COMMENT 'Medición procesada que detonó la alerta (si aplica)',
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nivel_severidad` ENUM('INFO', 'ADVERTENCIA_AMARILLA', 'CRITICO_ROJO') NOT NULL,
  `tipo_evento` ENUM('SALINIDAD_ALTA', 'PH_FUERA_RANGO', 'TURBIDEZ_ALTA', 'ESTIAJE_CAUDAL_BAJO', 'BATERIA_BAJA', 'FALLO_SENSOR', 'DESCONEXION_NODO') NOT NULL,
  `variable_origen` VARCHAR(50) NOT NULL COMMENT 'Variable evaluada (ej: ec_us_cm, ph, tirante_agua_cm)',
  `valor_registrado` DECIMAL(10, 2) NOT NULL,
  `valor_umbral` DECIMAL(10, 2) NOT NULL,
  `mensaje_tecnico` TEXT NOT NULL COMMENT 'Detalle técnico para dashboards y auditoría',
  `mensaje_campesino_whatsapp` TEXT NOT NULL COMMENT 'Mensaje claro y accionable enviado al agricultor',
  `estado_envio_whatsapp` ENUM('PENDIENTE', 'ENVIADO', 'FALLIDO', 'OMITIDO') NOT NULL DEFAULT 'PENDIENTE',
  `destinatarios_notificados_count` INT NOT NULL DEFAULT 0,
  `fecha_envio` DATETIME NULL,
  INDEX `idx_alerta_nodo_fecha` (`id_nodo`, `timestamp`),
  CONSTRAINT `fk_alerta_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE,
  CONSTRAINT `fk_alerta_proc` FOREIGN KEY (`id_proc`) REFERENCES `mediciones_procesadas` (`id_proc`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Historial de alertas tempranas y registro de envíos a WhatsApp';

-- ========================================================================================
-- 10. TABLA: TURNOS DE RIEGO / "LA MITA" (Auditoría de Volúmenes de Agua)
-- Control y auditoría de la dotación programada vs volumen real entregado al regante.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `turnos_riego` (
  `id_turno` INT AUTO_INCREMENT PRIMARY KEY,
  `id_entidad` INT NOT NULL COMMENT 'Entidad emisora de la orden de riego',
  `id_destinatario` INT NOT NULL COMMENT 'Agricultor asignado',
  `id_nodo` VARCHAR(50) NOT NULL COMMENT 'Bocatoma de entrega',
  `fecha_inicio_programada` DATETIME NOT NULL,
  `fecha_fin_programada` DATETIME NOT NULL,
  `horas_programadas` DECIMAL(4, 2) NOT NULL,
  `caudal_acordado_ls` DECIMAL(6, 2) NOT NULL COMMENT 'Caudal teórico contratado en l/s',
  `volumen_programado_m3` DECIMAL(8, 2) NOT NULL COMMENT 'Volumen teórico total contratado',
  `volumen_real_entregado_m3` DECIMAL(8, 2) NOT NULL DEFAULT 0.00 COMMENT 'Volumen medido por integración',
  `cumplimiento_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT '(Volumen Real / Volumen Programado) * 100',
  `estado_turno` ENUM('PROGRAMADO', 'EN_EJECUCION', 'COMPLETADO_EXITOSO', 'DEFICIT_VOLUMEN', 'CANCELADO_CONTAMINACION') NOT NULL DEFAULT 'PROGRAMADO',
  `observaciones` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_turno_dest` (`id_destinatario`),
  INDEX `idx_turno_nodo_fecha` (`id_nodo`, `fecha_inicio_programada`),
  CONSTRAINT `fk_turno_entidad` FOREIGN KEY (`id_entidad`) REFERENCES `entidades` (`id_entidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_turno_dest` FOREIGN KEY (`id_destinatario`) REFERENCES `destinatarios_alertas` (`id_destinatario`) ON DELETE CASCADE,
  CONSTRAINT `fk_turno_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Auditoría de turnos de riego y balances de volumen entregado';

-- ========================================================================================
-- 11. TABLA: PREDICCIONES DE INTELIGENCIA ARTIFICIAL (Modelos GRU / Deep Learning)
-- Almacena pronósticos a 24 horas y cálculo del Lead Time de avance de pluma contaminante.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `predicciones_ia` (
  `id_prediccion` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_nodo` VARCHAR(50) NOT NULL,
  `fecha_emision` DATETIME NOT NULL COMMENT 'Momento en que el modelo generó la predicción',
  `horizonte_horas` TINYINT NOT NULL COMMENT 'Horizonte de tiempo proyectado (+1h a +24h)',
  `fecha_proyectada` DATETIME NOT NULL COMMENT 'Fecha y hora estimada para el valor predicho',
  `caudal_predicho_m3s` DECIMAL(8, 4) NOT NULL,
  `wqi_predicho` DECIMAL(5, 2) NOT NULL,
  `ph_predicho` DECIMAL(4, 2) NOT NULL,
  `ec_predicho_us_cm` DECIMAL(7, 2) NOT NULL,
  `riesgo_estres_hidrico` ENUM('BAJO', 'MODERADO', 'ALTO', 'CRITICO') NOT NULL,
  `lead_time_horas_llegada_pluma` DECIMAL(4, 2) NULL COMMENT 'Horas estimadas de arribo de pluma aguas abajo',
  `modelo_version` VARCHAR(50) NOT NULL DEFAULT 'GRU-Shallow-v1.0',
  INDEX `idx_pred_nodo_proy` (`id_nodo`, `fecha_proyectada`),
  CONSTRAINT `fk_pred_nodo` FOREIGN KEY (`id_nodo`) REFERENCES `nodos` (`id_nodo`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Pronósticos de series temporales generados por el modelo de IA';

-- ========================================================================================
-- 12. TABLA: SIMULACIONES "WHAT-IF" (Experimentación de Escenarios Hipotéticos)
-- Permite a ingenieros evaluar impactos de sequías severas o descargas aguas arriba.
-- ========================================================================================
CREATE TABLE IF NOT EXISTS `simulaciones_whatif` (
  `id_simulacion` INT AUTO_INCREMENT PRIMARY KEY,
  `id_entidad` INT NULL,
  `titulo_escenario` VARCHAR(150) NOT NULL,
  `fecha_ejecucion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `delta_precipitacion_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Variación porcentual de lluvia (ej: -40.0%)',
  `delta_salinidad_us_cm` DECIMAL(7, 2) NOT NULL DEFAULT 0.00 COMMENT 'Incremento simulado de salinidad en cabecera',
  `delta_caudal_cabecera_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `resultado_wqi_valle` DECIMAL(5, 2) NOT NULL,
  `resultado_caudal_valle_m3s` DECIMAL(8, 4) NOT NULL,
  `resumen_impacto` TEXT NOT NULL,
  `ejecutado_por` VARCHAR(100) NULL,
  CONSTRAINT `fk_whatif_entidad` FOREIGN KEY (`id_entidad`) REFERENCES `entidades` (`id_entidad`) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Registro de simulaciones predictivas What-If ejecutadas';

