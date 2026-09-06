import datetime
import logging
import asyncio
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.schemas.telemetry import TelemetryIn
from backend.app.database.models import Nodo, CalibracionNodo, MedicionRaw, MedicionProcesada
from backend.app.services.processor import TelemetryProcessor
from backend.app.services.alert_engine import AlertEngine
from backend.app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class TelemetryService:
    """
    Servicio orquestador para la recepción, validación, procesamiento, persistencia y alerta de telemetría IoT.
    """

    @classmethod
    def ingest_telemetry(cls, db: Session, telemetry_in: TelemetryIn) -> MedicionProcesada:
        # 1. Validar existencia y estado del nodo
        nodo = db.query(Nodo).filter(Nodo.id_nodo == telemetry_in.node_id).first()
        if not nodo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El nodo '{telemetry_in.node_id}' no está registrado en el sistema. Por favor, regístrelo desde la plataforma web Sentinel-H2O para obtener su API Key autorizada."
            )

        if not nodo.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"El nodo '{telemetry_in.node_id}' se encuentra marcado como INACTIVO en la plataforma web."
            )

        # 2. Validar API Key del nodo
        if nodo.api_key_hash != telemetry_in.api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Autenticación fallida: API Key incorrecta para el nodo '{telemetry_in.node_id}'. Verifique o regenere la clave en la plataforma web Sentinel-H2O."
            )

        # 3. Obtener calibración activa del nodo
        calibracion = db.query(CalibracionNodo).filter(
            CalibracionNodo.id_nodo == telemetry_in.node_id,
            CalibracionNodo.es_vigente == True
        ).first()

        if not calibracion:
            calibracion = CalibracionNodo(
                id_nodo=telemetry_in.node_id,
                ph_offset_v=2.50,
                ph_slope=-0.18,
                tds_factor_k=0.50,
                tds_offset_v=0.0,
                turb_v_clear=4.20,
                turb_v_turbid=2.50,
                distancia_fondo_sensor_cm=150.0,
                caudal_coef_k=1.0,
                caudal_exp_n=1.5
            )

        now_utc = datetime.datetime.now(datetime.timezone.utc)

        # 4. Guardar registro inmutable de MedicionRaw
        medicion_raw = MedicionRaw(
            id_nodo=telemetry_in.node_id,
            timestamp_servidor=now_utc,
            timestamp_dispositivo_ms=telemetry_in.timestamp_ms,
            raw_v_ph=telemetry_in.raw_v_ph,
            raw_v_tds=telemetry_in.raw_v_tds,
            raw_v_turb=telemetry_in.raw_v_turb,
            raw_dist_cm=telemetry_in.raw_dist_cm,
            temp_agua_c=telemetry_in.temp_c,
            battery_v=telemetry_in.battery_v,
            signal_rssi=telemetry_in.signal_rssi,
            payload_json_backup=telemetry_in.model_dump()
        )
        db.add(medicion_raw)
        db.flush()

        # 5. Ejecutar Motor Científico y Procesamiento Físico
        proc_data = TelemetryProcessor.process_raw_telemetry(
            raw_v_ph=telemetry_in.raw_v_ph,
            raw_v_tds=telemetry_in.raw_v_tds,
            raw_v_turb=telemetry_in.raw_v_turb,
            raw_dist_cm=telemetry_in.raw_dist_cm,
            temp_c=telemetry_in.temp_c,
            calibracion=calibracion
        )

        # 6. Guardar MedicionProcesada
        medicion_proc = MedicionProcesada(
            id_raw=medicion_raw.id_raw,
            id_nodo=telemetry_in.node_id,
            timestamp=now_utc,
            ph=proc_data["ph"],
            tds_ppm=proc_data["tds_ppm"],
            ec_us_cm=proc_data["ec_us_cm"],
            turbidez_ntu=proc_data["turbidez_ntu"],
            temp_agua_c=proc_data["temp_agua_c"],
            tirante_agua_cm=proc_data["tirante_agua_cm"],
            caudal_m3s=proc_data["caudal_m3s"],
            caudal_ls=proc_data["caudal_ls"],
            wqi_score=proc_data["wqi_score"],
            wqi_categoria=proc_data["wqi_categoria"],
            estado_salinidad=proc_data["estado_salinidad"],
            estado_ph=proc_data["estado_ph"]
        )
        db.add(medicion_proc)
        db.flush()

        # 7. Evaluar y detonar alertas automáticas
        alertas = AlertEngine.evaluate_and_generate_alerts(
            db=db,
            id_nodo=telemetry_in.node_id,
            id_proc=medicion_proc.id_proc,
            processed_data=proc_data,
            battery_v=telemetry_in.battery_v
        )

        # 8. Despacho inmediato de alertas a los destinatarios (imprime en logs en modo Mock)
        for alt in alertas:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(NotificationService.dispatch_alert_to_recipients(db=db, alerta=alt))
                else:
                    loop.run_until_complete(NotificationService.dispatch_alert_to_recipients(db=db, alerta=alt))
            except Exception as e:
                logger.warning(f"Error despachando notificación: {e}")

        db.commit()
        db.refresh(medicion_proc)
        return medicion_proc
