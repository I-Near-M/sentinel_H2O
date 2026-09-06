import datetime
import logging
import httpx
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.database.models import AlertaLog, DestinatarioAlerta

logger = logging.getLogger("sentinel.notifications")


class NotificationService:
    """
    Servicio de despacho de alertas para WhatsApp y SMS.
    En modo 'mock', formatea e imprime las alertas en consola/logs de Docker.
    """

    @classmethod
    async def send_whatsapp_alert(
        cls,
        phone_number: str,
        message_text: str
    ) -> bool:
        """
        Envía un mensaje de texto de alerta por WhatsApp al número especificado.
        """
        provider = settings.WHATSAPP_PROVIDER.lower()
        clean_phone = phone_number.replace(" ", "").replace("-", "").replace("+", "")

        # 1. Modo Mock (Visualización clara en logs de Docker y consola)
        if provider == "mock" or not settings.WHATSAPP_API_TOKEN:
            border = "=" * 70
            print(f"\n{border}\n[📲 ALERTA WHATSAPP MOCK DESPACHADA]")
            print(f"Destinatario: +{clean_phone}")
            print(f"Timestamp:    {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Mensaje:\n{message_text}")
            print(f"{border}\n")
            logger.info(f"[WHATSAPP MOCK] Alerta despachada a +{clean_phone}")
            return True

        # 2. Modo Meta WhatsApp Cloud API Oficial
        elif provider == "meta_cloud":
            if not settings.WHATSAPP_PHONE_NUMBER_ID:
                logger.warning("[META WHATSAPP] Falta configurar WHATSAPP_PHONE_NUMBER_ID en .env")
                return False

            url = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
                "Content-Type": "application/json"
            }
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "text",
                "text": {"preview_url": False, "body": message_text}
            }

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    return bool(resp.status_code in [200, 201])
            except Exception as e:
                logger.error(f"[META CLOUD EXCEPTION] Error enviando a {clean_phone}: {e}")
                return False

        return False

    @classmethod
    async def dispatch_alert_to_recipients(
        cls,
        db: Session,
        alerta: AlertaLog
    ) -> int:
        """
        Despacha la alerta a todos los destinatarios activos suscritos al nodo.
        """
        destinatarios = db.query(DestinatarioAlerta).filter(
            DestinatarioAlerta.id_nodo_suscrito == alerta.id_nodo,
            DestinatarioAlerta.activo == True
        ).all()

        if not destinatarios:
            alerta.estado_envio_whatsapp = "SIN_DESTINATARIOS"
            db.commit()
            return 0

        enviados = 0
        for dest in destinatarios:
            if alerta.tipo_evento in ["SALINIDAD_ALTA", "PH_FUERA_RANGO", "TURBIDEZ_ALTA"] and not dest.recibe_alertas_calidad:
                continue
            if alerta.tipo_evento == "CAUDAL_CRITICO" and not dest.recibe_alertas_caudal:
                continue

            success = await cls.send_whatsapp_alert(
                phone_number=dest.telefono_whatsapp,
                message_text=alerta.mensaje_campesino_whatsapp
            )
            if success:
                enviados += 1

        if enviados > 0:
            alerta.estado_envio_whatsapp = "ENVIADO"
            alerta.destinatarios_notificados_count = enviados
            alerta.fecha_envio = datetime.datetime.now(datetime.timezone.utc)
            db.commit()

        return enviados
