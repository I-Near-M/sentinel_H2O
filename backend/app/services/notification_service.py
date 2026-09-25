import datetime
import logging
import httpx
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.database.session import SessionLocal
from backend.app.database.models import AlertaLog, DestinatarioAlerta

logger = logging.getLogger("sentinel.notifications")


class NotificationService:
    """
    Servicio de despacho de alertas para WhatsApp y SMS.
    Soporta modo 'mock' (consola/logs) y 'meta_cloud' (Meta WhatsApp Cloud API oficial).
    """

    @classmethod
    def clean_phone_number(cls, phone_number: str) -> str:
        """
        Limpia y normaliza el número telefónico al estándar E.164 exigido por Meta (solo dígitos).
        Si es un número móvil peruano de 9 dígitos que empieza en 9, le antepone '51'.
        """
        clean = (
            str(phone_number)
            .strip()
            .replace(" ", "")
            .replace("-", "")
            .replace("+", "")
            .replace("(", "")
            .replace(")", "")
        )
        if len(clean) == 9 and clean.startswith("9"):
            clean = f"51{clean}"
        return clean

    @classmethod
    async def send_whatsapp_message_detailed(
        cls,
        phone_number: str,
        message_text: Optional[str] = None,
        template_name: Optional[str] = None,
        template_language: str = "en_US"
    ) -> Dict[str, Any]:
        """
        Envío detallado de mensaje de WhatsApp (texto libre o plantilla oficial de Meta).
        Retorna un diccionario completo con diagnóstico técnico y códigos de error de Meta.
        """
        provider = settings.WHATSAPP_PROVIDER.lower()
        clean_phone = cls.clean_phone_number(phone_number)

        # 1. Modo Mock (Visualización clara en logs de Docker y consola)
        if provider == "mock" or not settings.WHATSAPP_API_TOKEN:
            border = "=" * 70
            tipo = f"PLANTILLA '{template_name}'" if template_name else "TEXTO LIBRE"
            contenido = f"Plantilla: {template_name} ({template_language})" if template_name else message_text
            print(f"\n{border}\n[📲 ALERTA WHATSAPP MOCK DESPACHADA — {tipo}]")
            print(f"Destinatario: +{clean_phone}")
            print(f"Timestamp:    {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Contenido:\n{contenido}")
            print(f"{border}\n")
            logger.info(f"[WHATSAPP MOCK] Alerta despachada a +{clean_phone}")
            return {
                "success": True,
                "provider": "mock",
                "recipient": clean_phone,
                "status_code": 200,
                "message": "Mensaje simulado correctamente en consola/logs de Docker."
            }

        # 2. Modo Meta WhatsApp Cloud API Oficial
        elif provider == "meta_cloud":
            if not settings.WHATSAPP_PHONE_NUMBER_ID:
                err_msg = "Falta configurar WHATSAPP_PHONE_NUMBER_ID en .env y docker-compose.yml"
                logger.warning(f"[META WHATSAPP] {err_msg}")
                return {
                    "success": False,
                    "provider": "meta_cloud",
                    "recipient": clean_phone,
                    "error_code": "CONFIG_ERROR",
                    "diagnostic": err_msg
                }

            version = getattr(settings, "WHATSAPP_API_VERSION", "v21.0")
            url = f"https://graph.facebook.com/{version}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
                "Content-Type": "application/json"
            }

            if template_name:
                payload = {
                    "messaging_product": "whatsapp",
                    "to": clean_phone,
                    "type": "template",
                    "template": {
                        "name": template_name,
                        "language": {"code": template_language}
                    }
                }
            else:
                payload = {
                    "messaging_product": "whatsapp",
                    "to": clean_phone,
                    "type": "text",
                    "text": {"preview_url": False, "body": message_text or ""}
                }

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    
                    if resp.status_code in [200, 201]:
                        data = resp.json()
                        messages = data.get("messages", [])
                        meta_msg_id = messages[0].get("id") if messages else "ok"
                        logger.info(f"[META CLOUD SUCCESS] Mensaje entregado a +{clean_phone} (ID: {meta_msg_id})")
                        return {
                            "success": True,
                            "provider": "meta_cloud",
                            "recipient": clean_phone,
                            "status_code": resp.status_code,
                            "meta_message_id": meta_msg_id
                        }
                    else:
                        try:
                            err_json = resp.json().get("error", {})
                        except Exception:
                            err_json = {"message": resp.text}

                        code = err_json.get("code")
                        raw_msg = err_json.get("message", "Error de Meta API")
                        details = err_json.get("error_data", {}).get("details", "")

                        # Diagnósticos comprensibles en español
                        if code == 131047:
                            diagnostic = (
                                "Ventana de 24 horas expirada. El destinatario debe responder o enviar un mensaje "
                                "primero al número de prueba, o bien utilizar una plantilla aprobada (template)."
                            )
                        elif code == 190:
                            diagnostic = (
                                "Token de acceso de Meta expirado o inválido. Genere un nuevo token en Meta for Developers "
                                "o configure un Token Permanente de Usuario del Sistema."
                            )
                        elif code == 131030:
                            diagnostic = (
                                f"El número +{clean_phone} no está en la lista de números de prueba autorizados "
                                f"en la consola de Meta for Developers (Modo Desarrollo)."
                            )
                        elif code == 131026:
                            diagnostic = (
                                f"Mensaje no entregable al número +{clean_phone}. Verifique que el número tenga "
                                f"una cuenta activa en WhatsApp."
                            )
                        else:
                            diagnostic = f"{raw_msg}. {details}".strip()

                        logger.error(
                            f"[META CLOUD ERROR] Falló envío a +{clean_phone} (HTTP {resp.status_code}, "
                            f"Código Meta: {code}): {diagnostic} | Detalle crudo: {resp.text}"
                        )
                        return {
                            "success": False,
                            "provider": "meta_cloud",
                            "recipient": clean_phone,
                            "status_code": resp.status_code,
                            "error_code": code,
                            "error_message": raw_msg,
                            "diagnostic": diagnostic,
                            "raw_error": resp.text
                        }

            except Exception as e:
                logger.error(f"[META CLOUD EXCEPTION] Error de conexión enviando a +{clean_phone}: {e}")
                return {
                    "success": False,
                    "provider": "meta_cloud",
                    "recipient": clean_phone,
                    "error_code": "NETWORK_EXCEPTION",
                    "diagnostic": f"Error de red/conexión con Meta Graph API: {str(e)}"
                }

        return {
            "success": False,
            "provider": provider,
            "recipient": clean_phone,
            "diagnostic": f"Proveedor '{provider}' no reconocido."
        }

    @classmethod
    async def send_whatsapp_alert(
        cls,
        phone_number: str,
        message_text: str
    ) -> bool:
        """
        Envía un mensaje de texto de alerta por WhatsApp al número especificado.
        Mantiene compatibilidad con el resto del sistema retornando True o False.
        """
        result = await cls.send_whatsapp_message_detailed(
            phone_number=phone_number,
            message_text=message_text
        )
        return result["success"]

    @classmethod
    async def send_whatsapp_template(
        cls,
        phone_number: str,
        template_name: str = "hello_world",
        template_language: str = "en_US"
    ) -> Dict[str, Any]:
        """
        Envía una plantilla oficial de WhatsApp (ej: 'hello_world') para pruebas o inicio de conversación.
        """
        return await cls.send_whatsapp_message_detailed(
            phone_number=phone_number,
            template_name=template_name,
            template_language=template_language
        )

    @classmethod
    async def dispatch_alert_to_recipients(
        cls,
        alerta: AlertaLog,
        db: Optional[Session] = None
    ) -> int:
        """
        Despacha la alerta a todos los destinatarios activos suscritos al nodo correspondiente.
        Si no se provee sesión de base de datos o corre en tarea background aislada, crea su propia sesión.
        """
        close_session = False
        if db is None:
            db = SessionLocal()
            close_session = True

        try:
            # Recargar o asegurar alerta en la sesión activa
            alerta_id = alerta.id_alerta
            alerta_db = db.query(AlertaLog).filter(AlertaLog.id_alerta == alerta_id).first() if alerta_id else alerta
            if not alerta_db:
                alerta_db = alerta

            destinatarios = db.query(DestinatarioAlerta).filter(
                DestinatarioAlerta.id_nodo_suscrito == alerta_db.id_nodo,
                DestinatarioAlerta.activo == True
            ).all()

            if not destinatarios:
                alerta_db.estado_envio_whatsapp = "SIN_DESTINATARIOS"
                db.commit()
                return 0

            enviados = 0
            for dest in destinatarios:
                if alerta_db.tipo_evento in ["SALINIDAD_ALTA", "PH_FUERA_RANGO", "TURBIDEZ_ALTA"] and not dest.recibe_alertas_calidad:
                    continue
                if alerta_db.tipo_evento == "CAUDAL_CRITICO" and not dest.recibe_alertas_caudal:
                    continue

                success = await cls.send_whatsapp_alert(
                    phone_number=dest.telefono_whatsapp,
                    message_text=alerta_db.mensaje_campesino_whatsapp
                )
                if success:
                    enviados += 1

            if enviados > 0:
                alerta_db.estado_envio_whatsapp = "ENVIADO"
                alerta_db.destinatarios_notificados_count = enviados
                alerta_db.fecha_envio = datetime.datetime.now(datetime.timezone.utc)
            else:
                alerta_db.estado_envio_whatsapp = "FALLO_ENVIO"

            db.commit()
            return enviados

        except Exception as e:
            logger.error(f"Error despachando alerta a destinatarios: {e}")
            if db:
                db.rollback()
            return 0
        finally:
            if close_session and db:
                db.close()
