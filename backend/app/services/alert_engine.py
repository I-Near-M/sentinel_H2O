import datetime
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.database.models import AlertaLog, UmbralConfig, Nodo, DestinatarioAlerta
from backend.app.ml.lead_time import HydraulicLeadTimeEstimator
from backend.app.ml.anomaly_detector import anomaly_detector

logger = logging.getLogger(__name__)


class AlertEngine:
    """
    Motor de detección y generación de alertas tempranas agronómicas e hidrológicas.
    Integra el detector de anomalías por Isolation Forest y el estimador de Lead Time de contaminantes.
    """

    @classmethod
    def evaluate_and_generate_alerts(
        cls,
        db: Session,
        id_nodo: str,
        id_proc: int,
        processed_data: Dict[str, Any],
        battery_v: float
    ) -> List[AlertaLog]:
        """
        Evalúa las mediciones procesadas contra umbrales y mediante inferencia de IA.
        """
        umbral = db.query(UmbralConfig).filter(UmbralConfig.id_nodo == id_nodo).first()
        nodo = db.query(Nodo).filter(Nodo.id_nodo == id_nodo).first()
        nombre_nodo = nodo.nombre if nodo else id_nodo
        subcuenca = nodo.subcuenca if nodo else "Chancay-Huaral"

        if not umbral:
            return []

        alertas_generadas = []

        # 1. Inferencia In-Line de Anomalías (Isolation Forest)
        eval_ia = anomaly_detector.evaluate_reading(
            ph=processed_data["ph"],
            tds_ppm=processed_data["tds_ppm"],
            ec_us_cm=processed_data["ec_us_cm"],
            turbidez_ntu=processed_data["turbidez_ntu"],
            temp_agua_c=processed_data["temp_agua_c"],
            caudal_m3s=processed_data["caudal_m3s"],
            wqi_score=processed_data["wqi_score"]
        )

        # Si el nodo está aguas arriba (Cabecera o Conducción), calcular Lead Time hacia la parcela
        lead_time_info = ""
        if id_nodo in ["NODO-01-CABECERA", "NODO-02-CONDUCCION"]:
            lt = HydraulicLeadTimeEstimator.estimate_travel_time(
                origen_nodo_id=id_nodo,
                destino_nodo_id="NODO-03-PARCELA",
                caudal_origen_m3s=processed_data["caudal_m3s"]
            )
            lead_time_info = f"\n⏱️ *Tiempo estimado de llegada al valle:* ~{lt['tiempo_legible']} (Ventana: {lt['ventana_anticipacion_minutos']} min)."

        # 2. Evaluación de Salinidad / Conductividad Eléctrica (EC)
        ec = processed_data["ec_us_cm"]
        if ec >= umbral.ec_max_critico_us_cm:
            msg_tecnico = (
                f"[CRÍTICO] Transgresión de Conductividad Eléctrica en {nombre_nodo} ({subcuenca}). "
                f"Valor registrado: {ec:.1f} uS/cm (Umbral crítico: {umbral.ec_max_critico_us_cm:.1f} uS/cm). "
                f"Riesgo inminente de estrés osmótico y daño fitotóxico radicular en frutales. "
                f"Diagnóstico IA: {eval_ia['diagnostico_ia']} (Confianza: {eval_ia['confianza']*100:.0f}%)."
            )
            msg_whatsapp = (
                f"🔴 *¡ALERTA SENTINEL-H2O!* ({subcuenca})\n"
                f"Se detectó *AGUA CON ALTA SALINIDAD* ({ec:.0f} µS/cm) en {nombre_nodo}.\n"
                f"{lead_time_info}\n"
                f"⚠️ *Recomendación Agrícola:* No abras compuertas hacia tus frutales en las próximas 2 horas "
                f"para evitar el quemado de raíces y caída de fruta. Te avisaremos cuando la calidad se normalice."
            )
            alerta = AlertaLog(
                id_nodo=id_nodo,
                id_proc=id_proc,
                nivel_severidad="CRITICO_ROJO",
                tipo_evento="SALINIDAD_ALTA",
                variable_origen="ec_us_cm",
                valor_registrado=ec,
                valor_umbral=umbral.ec_max_critico_us_cm,
                mensaje_tecnico=msg_tecnico,
                mensaje_campesino_whatsapp=msg_whatsapp,
                estado_envio_whatsapp="PENDIENTE"
            )
            db.add(alerta)
            alertas_generadas.append(alerta)

        elif ec >= umbral.ec_max_advertencia_us_cm:
            msg_tecnico = (
                f"[ADVERTENCIA] Salinidad elevada en {nombre_nodo}. "
                f"EC: {ec:.1f} uS/cm (Umbral advertencia: {umbral.ec_max_advertencia_us_cm:.1f} uS/cm)."
            )
            msg_whatsapp = (
                f"🟡 *Aviso Sentinel-H2O:* Salinidad moderada ({ec:.0f} µS/cm) en {nombre_nodo}. "
                f"Monitoree el drenaje de su parcela."
            )
            alerta = AlertaLog(
                id_nodo=id_nodo,
                id_proc=id_proc,
                nivel_severidad="ADVERTENCIA_AMARILLA",
                tipo_evento="SALINIDAD_ALTA",
                variable_origen="ec_us_cm",
                valor_registrado=ec,
                valor_umbral=umbral.ec_max_advertencia_us_cm,
                mensaje_tecnico=msg_tecnico,
                mensaje_campesino_whatsapp=msg_whatsapp,
                estado_envio_whatsapp="PENDIENTE"
            )
            db.add(alerta)
            alertas_generadas.append(alerta)

        # 3. Evaluación de pH Fuera de Rango
        ph = processed_data["ph"]
        if ph < umbral.ph_min_alerta or ph > umbral.ph_max_alerta:
            tipo_ph = "ácida" if ph < umbral.ph_min_alerta else "alcalina"
            msg_tecnico = (
                f"[CRÍTICO] Alteración de pH en {nombre_nodo}. Valor registrado: {ph:.2f}. "
                f"Rango de seguridad: {umbral.ph_min_alerta:.2f} - {umbral.ph_max_alerta:.2f}. "
                f"Riesgo de taponamiento en riego presurizado e ineficacia de fertilización soluble. "
                f"Diagnóstico IA: {eval_ia['diagnostico_ia']}."
            )
            msg_whatsapp = (
                f"🔴 *¡ALERTA DE pH!* ({subcuenca})\n"
                f"El agua viene anormalmente *{tipo_ph.upper()}* (pH {ph:.2f}) en {nombre_nodo}.\n"
                f"{lead_time_info}\n"
                f"⚠️ *Precaución:* No apliques fertilizantes por fertirriego hasta que el pH vuelva al rango 6.5 - 8.5."
            )
            alerta = AlertaLog(
                id_nodo=id_nodo,
                id_proc=id_proc,
                nivel_severidad="CRITICO_ROJO",
                tipo_evento="PH_FUERA_RANGO",
                variable_origen="ph",
                valor_registrado=ph,
                valor_umbral=umbral.ph_min_alerta if ph < umbral.ph_min_alerta else umbral.ph_max_alerta,
                mensaje_tecnico=msg_tecnico,
                mensaje_campesino_whatsapp=msg_whatsapp,
                estado_envio_whatsapp="PENDIENTE"
            )
            db.add(alerta)
            alertas_generadas.append(alerta)

        # 4. Evaluación de Turbidez
        turb = processed_data["turbidez_ntu"]
        if turb >= umbral.turb_max_alerta_ntu:
            msg_tecnico = (
                f"[ADVERTENCIA] Turbidez alta en {nombre_nodo}: {turb:.1f} NTU "
                f"(Límite: {umbral.turb_max_alerta_ntu:.1f} NTU). Arrastre de lodos o crecida de quebrada."
            )
            msg_whatsapp = (
                f"🟡 *Aviso de Turbidez:* Agua turbia con sedimentos ({turb:.0f} NTU) en {nombre_nodo}. "
                f"Verifica tus filtros de cabezal antes de regar."
            )
            alerta = AlertaLog(
                id_nodo=id_nodo,
                id_proc=id_proc,
                nivel_severidad="ADVERTENCIA_AMARILLA",
                tipo_evento="TURBIDEZ_ALTA",
                variable_origen="turbidez_ntu",
                valor_registrado=turb,
                valor_umbral=umbral.turb_max_alerta_ntu,
                mensaje_tecnico=msg_tecnico,
                mensaje_campesino_whatsapp=msg_whatsapp,
                estado_envio_whatsapp="PENDIENTE"
            )
            db.add(alerta)
            alertas_generadas.append(alerta)

        # 5. Evaluación de Batería Baja
        if battery_v <= umbral.bateria_min_alerta_v:
            msg_tecnico = (
                f"[HARDWARE] Tensión de batería baja en {nombre_nodo}: {battery_v:.2f} V "
                f"(Límite operativo: {umbral.bateria_min_alerta_v:.2f} V). Revisar panel solar o acumulador."
            )
            msg_whatsapp = (
                f"⚙️ *Aviso Técnico:* La estación {nombre_nodo} reporta batería baja ({battery_v:.2f} V)."
            )
            alerta = AlertaLog(
                id_nodo=id_nodo,
                id_proc=id_proc,
                nivel_severidad="ADVERTENCIA_AMARILLA",
                tipo_evento="BATERIA_BAJA",
                variable_origen="battery_v",
                valor_registrado=battery_v,
                valor_umbral=umbral.bateria_min_alerta_v,
                mensaje_tecnico=msg_tecnico,
                mensaje_campesino_whatsapp=msg_whatsapp,
                estado_envio_whatsapp="PENDIENTE"
            )
            db.add(alerta)
            alertas_generadas.append(alerta)

        if alertas_generadas:
            db.flush()
            destinatarios = db.query(DestinatarioAlerta).filter(
                DestinatarioAlerta.id_nodo_suscrito == id_nodo,
                DestinatarioAlerta.activo == True
            ).all()
            
            for alt in alertas_generadas:
                alt.destinatarios_notificados_count = len(destinatarios)

        return alertas_generadas
