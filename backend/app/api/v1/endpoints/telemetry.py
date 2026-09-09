import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.telemetry import TelemetryIn, ProcessedTelemetryOut
from backend.app.services.telemetry_service import TelemetryService
from backend.app.database.models import MedicionProcesada, MedicionRaw, AlertaLog

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


@router.websocket("/ws/live")
async def telemetry_websocket(websocket: WebSocket):
    """
    WebSocket endpoint para streaming bidireccional en vivo de telemetría de la cuenca.
    Emite cada nueva medición procesada en tiempo real hacia la consola web.
    """
    await ws_manager.connect(websocket)
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
    **Endpoint de Ingesta IoT (ESP32 via HTTP POST con SIM800L o Wi-Fi)**:
    Recibe el payload JSON con voltajes analógicos crudos y mediciones físicas.
    Calcula en tiempo real el pH, TDS, EC con compensación térmica a 25°C (+2%/°C),
    tirante, caudal volumétrico (m³/s, l/s), score WQI y detona alertas si se transgreden umbrales.
    Transmite instantáneamente la telemetría procesada por WebSockets a los operadores.
    """
    proc = TelemetryService.ingest_telemetry(db=db, telemetry_in=telemetry_in)
    
    # Comprobar si esta medición generó alguna alerta
    alerta_reciente = db.query(AlertaLog).filter(AlertaLog.id_proc == proc.id_proc).first()
    
    response_data = ProcessedTelemetryOut(
        id_proc=proc.id_proc,
        id_nodo=proc.id_nodo,
        timestamp=proc.timestamp,
        ph=proc.ph,
        tds_ppm=proc.tds_ppm,
        ec_us_cm=proc.ec_us_cm,
        turbidez_ntu=proc.turbidez_ntu,
        temp_agua_c=proc.temp_agua_c,
        tirante_agua_cm=proc.tirante_agua_cm,
        caudal_m3s=proc.caudal_m3s,
        caudal_ls=proc.caudal_ls,
        wqi_score=proc.wqi_score,
        wqi_categoria=proc.wqi_categoria,
        estado_salinidad=proc.estado_salinidad,
        estado_ph=proc.estado_ph,
        battery_v=proc.raw.battery_v,
        signal_rssi=proc.raw.signal_rssi,
        alerta_disparada=True if alerta_reciente else False,
        alerta_info={
            "tipo_evento": alerta_reciente.tipo_evento,
            "nivel_severidad": alerta_reciente.nivel_severidad,
            "mensaje_campesino": alerta_reciente.mensaje_campesino_whatsapp
        } if alerta_reciente else None
    )

    # Difusión WebSocket en tiempo real hacia los dashboards conectados
    try:
        await ws_manager.broadcast(response_data.model_dump(mode="json"))
    except Exception as ws_err:
        logger.warning(f"No se pudo difundir por WebSocket: {ws_err}")

    return response_data


@router.get("/{node_id}/latest", response_model=ProcessedTelemetryOut)
def get_latest_telemetry(node_id: str, db: Session = Depends(get_db)):
    """
    Obtiene la última medición procesada disponible para un nodo específico.
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

    return ProcessedTelemetryOut(
        id_proc=proc.id_proc,
        id_nodo=proc.id_nodo,
        timestamp=proc.timestamp,
        ph=proc.ph,
        tds_ppm=proc.tds_ppm,
        ec_us_cm=proc.ec_us_cm,
        turbidez_ntu=proc.turbidez_ntu,
        temp_agua_c=proc.temp_agua_c,
        tirante_agua_cm=proc.tirante_agua_cm,
        caudal_m3s=proc.caudal_m3s,
        caudal_ls=proc.caudal_ls,
        wqi_score=proc.wqi_score,
        wqi_categoria=proc.wqi_categoria,
        estado_salinidad=proc.estado_salinidad,
        estado_ph=proc.estado_ph,
        battery_v=proc.raw.battery_v,
        signal_rssi=proc.raw.signal_rssi,
        alerta_disparada=True if alerta_reciente else False,
        alerta_info={
            "tipo_evento": alerta_reciente.tipo_evento,
            "nivel_severidad": alerta_reciente.nivel_severidad,
            "mensaje_campesino": alerta_reciente.mensaje_campesino_whatsapp
        } if alerta_reciente else None
    )


@router.get("/{node_id}/history", response_model=List[ProcessedTelemetryOut])
def get_telemetry_history(
    node_id: str,
    limit: int = Query(50, ge=1, le=1000, description="Cantidad de registros a retornar"),
    db: Session = Depends(get_db)
):
    """
    Obtiene la serie temporal histórica procesada de un nodo (para Grafana o análisis).
    """
    records = db.query(MedicionProcesada).filter(
        MedicionProcesada.id_nodo == node_id
    ).order_by(MedicionProcesada.timestamp.desc()).limit(limit).all()

    result = []
    for proc in records:
        result.append(ProcessedTelemetryOut(
            id_proc=proc.id_proc,
            id_nodo=proc.id_nodo,
            timestamp=proc.timestamp,
            ph=proc.ph,
            tds_ppm=proc.tds_ppm,
            ec_us_cm=proc.ec_us_cm,
            turbidez_ntu=proc.turbidez_ntu,
            temp_agua_c=proc.temp_agua_c,
            tirante_agua_cm=proc.tirante_agua_cm,
            caudal_m3s=proc.caudal_m3s,
            caudal_ls=proc.caudal_ls,
            wqi_score=proc.wqi_score,
            wqi_categoria=proc.wqi_categoria,
            estado_salinidad=proc.estado_salinidad,
            estado_ph=proc.estado_ph,
            battery_v=proc.raw.battery_v if proc.raw else 0.0,
            signal_rssi=proc.raw.signal_rssi if proc.raw else None
        ))
    return result
