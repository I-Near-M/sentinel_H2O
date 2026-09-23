import json
import math
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.app.database.session import get_db, SessionLocal
from backend.app.schemas.telemetry import TelemetryIn, ProcessedTelemetryOut
from backend.app.services.telemetry_service import TelemetryService
from backend.app.database.models import MedicionProcesada, MedicionRaw, AlertaLog, Nodo

logger = logging.getLogger(__name__)

router = APIRouter()


class TelemetryConnectionManager:
    """
    Gestor de conexiones WebSockets para distribución en tiempo real
    de telemetría de campo hacia la Sala de Situación y clientes conectados.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to WebSocket client: {e}")
                disconnected.append(connection)
        for dead_conn in disconnected:
            self.disconnect(dead_conn)


ws_manager = TelemetryConnectionManager()


def map_to_processed_out(proc: MedicionProcesada, alerta_reciente: Optional[AlertaLog] = None) -> ProcessedTelemetryOut:
    """
    Mapea una entidad MedicionProcesada y su MedicionRaw asociada al esquema enriquecido ProcessedTelemetryOut,
    incluyendo variables de sensores crudos (RAW), hidráulica fluvial (Froude y Manning) y batería 12V.
    """
    raw = proc.raw

    # 1. Hidráulica Fluvial: Froude Fr = V / sqrt(g * yh)
    g = 9.80665
    y_h = max(0.02, (proc.tirante_agua_cm or 0.0) / 100.0)
    v_ms = proc.velocidad_agua_ms if (proc.velocidad_agua_ms and proc.velocidad_agua_ms > 0) else (
        (proc.caudal_m3s / max(0.01, proc.area_hidraulica_m2)) if (proc.area_hidraulica_m2 and proc.area_hidraulica_m2 > 0) else 0.0
    )
    if v_ms == 0.0 and proc.caudal_m3s > 0:
        v_ms = round(proc.caudal_m3s / max(0.1, y_h * 3.5), 2)
    fr = round(v_ms / math.sqrt(g * y_h), 2)

    # Manning n de lecho de río aluvial (cantos rodados / piedras)
    manning_n = 0.035

    # 2. Batería 12V y % de carga solar
    raw_bat = raw.battery_v if raw else 12.6
    # Si viene en escala 3.7V - 4.2V (legacy), escalar a 12V
    if raw_bat < 6.0:
        v_bat = round(12.0 + (raw_bat - 3.7) * (1.2 / 0.5), 2)
        v_bat = max(11.8, min(14.2, v_bat))
    else:
        v_bat = round(raw_bat, 2)
    bat_pct = min(100, max(0, int(round(((v_bat - 11.5) / (12.8 - 11.5)) * 100))))
    if v_bat >= 13.2:
        bat_pct = 100  # Carga solar activa

    return ProcessedTelemetryOut(
        id_proc=proc.id_proc,
        id_nodo=proc.id_nodo,
        timestamp=proc.timestamp,
        ph=proc.ph,
        tds_ppm=proc.tds_ppm,
        ec_us_cm=proc.ec_us_cm,
        turbidez_ntu=proc.turbidez_ntu,
        temp_agua_c=proc.temp_agua_c,
        oxigeno_disuelto_mgl=proc.oxigeno_disuelto_mgl,
        saturacion_oxigeno_pct=proc.saturacion_oxigeno_pct,
        tirante_agua_cm=proc.tirante_agua_cm,
        velocidad_agua_ms=v_ms,
        area_hidraulica_m2=proc.area_hidraulica_m2 or round(y_h * 3.5, 2),
        caudal_m3s=proc.caudal_m3s,
        caudal_ls=proc.caudal_ls,
        wqi_score=proc.wqi_score,
        wqi_categoria=proc.wqi_categoria,
        estado_salinidad=proc.estado_salinidad,
        estado_ph=proc.estado_ph,
        aptitud_piscicola=proc.aptitud_piscicola or "NO_EVALUADO",
        battery_v=v_bat,
        bateria_pct=bat_pct,
        signal_rssi=raw.signal_rssi if (raw and raw.signal_rssi is not None) else 24,
        alerta_disparada=True if alerta_reciente else False,
        alerta_info={
            "tipo_evento": alerta_reciente.tipo_evento,
            "nivel_severidad": alerta_reciente.nivel_severidad,
            "mensaje_campesino": alerta_reciente.mensaje_campesino_whatsapp
        } if alerta_reciente else None,
        # Variables RAW de hardware
        raw_dist_cm=raw.raw_dist_cm if raw else None,
        raw_v_ph=raw.raw_v_ph if raw else None,
        raw_v_tds=raw.raw_v_tds if raw else None,
        raw_v_turb=raw.raw_v_turb if raw else None,
        hall_rpm=raw.hall_rpm if raw else None,
        hall_pulsos=raw.hall_pulsos if raw else None,
        hall_frecuencia_hz=raw.hall_frecuencia_hz if raw else None,
        froude=fr,
        manning_n=manning_n
    )


@router.websocket("/ws/live")
async def telemetry_websocket(websocket: WebSocket):
    """
    WebSocket endpoint para streaming bidireccional en vivo de telemetría de la cuenca.
    Emite cada nueva medición procesada en tiempo real hacia la consola web.
    Al conectar, envía de inmediato el último snapshot disponible de los nodos activos.
    """
    await ws_manager.connect(websocket)

    # Enviar snapshot inicial del estado de los nodos al conectar
    try:
        with SessionLocal() as db:
            nodos = db.query(Nodo).filter(Nodo.activo == True).all()
            for nodo in nodos:
                proc = db.query(MedicionProcesada).filter(
                    MedicionProcesada.id_nodo == nodo.id_nodo
                ).order_by(MedicionProcesada.timestamp.desc()).first()
                if proc:
                    alerta = db.query(AlertaLog).filter(AlertaLog.id_proc == proc.id_proc).first()
                    snap = map_to_processed_out(proc, alerta)
                    await websocket.send_json(snap.model_dump(mode="json"))
    except Exception as e:
        logger.warning(f"Aviso al enviar snapshot inicial por WebSocket: {e}")

    try:
        while True:
            # Mantener conexión viva y procesar pings/mensajes del cliente
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"Excepción en websocket loop: {e}")
        ws_manager.disconnect(websocket)


@router.post("/", response_model=ProcessedTelemetryOut, status_code=status.HTTP_201_CREATED)
async def receive_telemetry(telemetry_in: TelemetryIn, db: Session = Depends(get_db)):
    """
    **Endpoint de Ingesta IoT (ESP32 via HTTP POST con SIM800L GPRS o Wi-Fi)**:
    Recibe el payload JSON con voltajes analógicos crudos y mediciones físicas.
    Calcula en tiempo real el pH, TDS, EC con compensación térmica a 25°C (+2%/°C),
    tirante, caudal volumétrico (m³/s, l/s), score WQI y detona alertas si se transgreden umbrales.
    Transmite instantáneamente la telemetría procesada por WebSockets a los operadores.
    """
    proc = TelemetryService.ingest_telemetry(db=db, telemetry_in=telemetry_in)
    
    # Comprobar si esta medición generó alguna alerta
    alerta_reciente = db.query(AlertaLog).filter(AlertaLog.id_proc == proc.id_proc).first()
    
    response_data = map_to_processed_out(proc, alerta_reciente)

    # Difusión WebSocket en tiempo real hacia los dashboards conectados
    try:
        await ws_manager.broadcast(response_data.model_dump(mode="json"))
    except Exception as ws_err:
        logger.warning(f"No se pudo difundir por WebSocket: {ws_err}")

    return response_data


@router.get("/{node_id}/latest", response_model=ProcessedTelemetryOut)
def get_latest_telemetry(node_id: str, db: Session = Depends(get_db)):
    """
    Obtiene la última medición procesada disponible para un nodo específico con variables RAW e hidráulicas.
    """
    proc = db.query(MedicionProcesada).filter(
        MedicionProcesada.id_nodo == node_id
    ).order_by(MedicionProcesada.timestamp.desc()).first()

    if not proc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontraron registros de telemetría para el nodo '{node_id}'."
        )

    alerta_reciente = db.query(AlertaLog).filter(AlertaLog.id_proc == proc.id_proc).first()
    return map_to_processed_out(proc, alerta_reciente)


@router.get("/{node_id}/history", response_model=List[ProcessedTelemetryOut])
def get_telemetry_history(
    node_id: str,
    limit: int = Query(50, ge=1, le=1000, description="Cantidad de registros a retornar"),
    db: Session = Depends(get_db)
):
    """
    Obtiene la serie temporal histórica procesada de un nodo (para el gemelo digital o análisis).
    """
    records = db.query(MedicionProcesada).filter(
        MedicionProcesada.id_nodo == node_id
    ).order_by(MedicionProcesada.timestamp.desc()).limit(limit).all()

    result = []
    for proc in records:
        result.append(map_to_processed_out(proc, None))
    return result
