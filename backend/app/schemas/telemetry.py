import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class TelemetryIn(BaseModel):
    """
    Esquema del JSON recibido desde el microcontrolador ESP32 de campo vía HTTP POST.
    Incluye telemetría electroquímica, ultrasónica y sensor de efecto Hall para molinete.
    """
    node_id: str = Field(..., description="ID único o código del nodo emisor", json_schema_extra={"example": "EST-01-CABECERA"})
    api_key: str = Field(..., description="API Key secreta del nodo", json_schema_extra={"example": "hash_key_parcela_secure_03"})
    battery_v: float = Field(..., ge=0.0, le=20.0, description="Voltaje de la batería en Voltios", json_schema_extra={"example": 3.95})
    signal_rssi: Optional[int] = Field(None, ge=0, le=31, description="Calidad de señal celular CSQ (0-31)", json_schema_extra={"example": 18})
    temp_c: float = Field(..., ge=-10.0, le=60.0, description="Temperatura del agua medida por DS18B20", json_schema_extra={"example": 14.5})
    raw_dist_cm: float = Field(..., ge=0.0, le=2000.0, description="Distancia al espejo de agua medida por JSN-SR04T (cm)", json_schema_extra={"example": 65.4})
    raw_v_ph: float = Field(..., ge=0.0, le=3.3, description="Voltaje analógico del sensor de pH PH-4502C", json_schema_extra={"example": 2.49})
    raw_v_tds: float = Field(..., ge=0.0, le=3.3, description="Voltaje analógico del módulo Keyestudio TDS", json_schema_extra={"example": 0.82})
    raw_v_turb: float = Field(..., ge=0.0, le=3.3, description="Voltaje analógico tras divisor de TS-300B", json_schema_extra={"example": 3.10})
    hall_rpm: float = Field(default=0.0, ge=0.0, le=5000.0, description="Revoluciones por minuto medidas por sensor de efecto Hall", json_schema_extra={"example": 124.5})
    hall_pulsos: int = Field(default=0, ge=0, description="Conteo de pulsos de interrupción en el intervalo", json_schema_extra={"example": 450})
    hall_frecuencia_hz: float = Field(default=0.0, ge=0.0, description="Frecuencia de pulsos en Hertz", json_schema_extra={"example": 7.5})
    timestamp_ms: Optional[int] = Field(None, description="Milisegundos de uptime del ESP32", json_schema_extra={"example": 1289400})


class ProcessedTelemetryOut(BaseModel):
    """
    Esquema de respuesta tras procesar y calcular los indicadores científicos, volumétricos y agro-acuícolas.
    """
    id_proc: str
    id_nodo: str
    timestamp: datetime.datetime
    ph: float
    tds_ppm: float
    ec_us_cm: float
    turbidez_ntu: float
    temp_agua_c: float
    oxigeno_disuelto_mgl: Optional[float] = None
    saturacion_oxigeno_pct: Optional[float] = None
    tirante_agua_cm: float
    velocidad_agua_ms: float = 0.0
    area_hidraulica_m2: float = 0.0
    caudal_m3s: float
    caudal_ls: float
    wqi_score: float
    wqi_categoria: str
    estado_salinidad: str
    estado_ph: str
    aptitud_piscicola: str = "NO_EVALUADO"
    battery_v: float
    bateria_pct: Optional[int] = None
    signal_rssi: Optional[int] = None
    alerta_disparada: bool = False
    alerta_info: Optional[Dict[str, Any]] = None

    # Variables RAW de instrumentación física (hardware directo)
    raw_dist_cm: Optional[float] = None
    raw_v_ph: Optional[float] = None
    raw_v_tds: Optional[float] = None
    raw_v_turb: Optional[float] = None
    hall_rpm: Optional[float] = None
    hall_pulsos: Optional[int] = None
    hall_frecuencia_hz: Optional[float] = None

    # Parámetros Hidráulicos Avanzados
    froude: Optional[float] = None
    manning_n: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
