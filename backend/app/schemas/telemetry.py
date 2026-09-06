import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class TelemetryIn(BaseModel):
    """
    Esquema del JSON recibido desde el microcontrolador ESP32 de campo vía HTTP POST.
    """
    node_id: str = Field(..., description="ID único del nodo emisor", json_schema_extra={"example": "NODO-03-PARCELA"})
    api_key: str = Field(..., description="API Key secreta del nodo", json_schema_extra={"example": "hash_key_parcela_secure_03"})
    battery_v: float = Field(..., ge=0.0, le=20.0, description="Voltaje de la batería en Voltios", json_schema_extra={"example": 3.95})
    signal_rssi: Optional[int] = Field(None, ge=0, le=31, description="Calidad de señal celular CSQ (0-31)", json_schema_extra={"example": 18})
    temp_c: float = Field(..., ge=-10.0, le=60.0, description="Temperatura del agua medida por DS18B20", json_schema_extra={"example": 18.5})
    raw_dist_cm: float = Field(..., ge=0.0, le=600.0, description="Distancia al espejo de agua medida por JSN-SR04T (cm)", json_schema_extra={"example": 65.4})
    raw_v_ph: float = Field(..., ge=0.0, le=3.3, description="Voltaje analógico del sensor de pH PH-4502C", json_schema_extra={"example": 2.49})
    raw_v_tds: float = Field(..., ge=0.0, le=3.3, description="Voltaje analógico del módulo Keyestudio TDS", json_schema_extra={"example": 0.82})
    raw_v_turb: float = Field(..., ge=0.0, le=3.3, description="Voltaje analógico tras divisor de TS-300B", json_schema_extra={"example": 3.10})
    timestamp_ms: Optional[int] = Field(None, description="Milisegundos de uptime del ESP32", json_schema_extra={"example": 1289400})


class ProcessedTelemetryOut(BaseModel):
    """
    Esquema de respuesta tras procesar y calcular los indicadores científicos y volumétricos.
    """
    id_proc: int
    id_nodo: str
    timestamp: datetime.datetime
    ph: float
    tds_ppm: float
    ec_us_cm: float
    turbidez_ntu: float
    temp_agua_c: float
    tirante_agua_cm: float
    caudal_m3s: float
    caudal_ls: float
    wqi_score: float
    wqi_categoria: str
    estado_salinidad: str
    estado_ph: str
    battery_v: float
    signal_rssi: Optional[int]
    alerta_disparada: bool = False
    alerta_info: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
