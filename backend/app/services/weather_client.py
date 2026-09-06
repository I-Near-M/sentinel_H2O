import datetime
import logging
from typing import Optional, Dict, Any
import httpx
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.database.models import ClimaOpenWeather, Nodo

logger = logging.getLogger(__name__)


class WeatherClient:
    """
    Cliente asíncrono para la recolección de datos climáticos desde OpenWeatherMap API (Free Tier).
    """

    @classmethod
    async def fetch_current_weather(cls, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Consulta la API pública de OpenWeatherMap para unas coordenadas específicas.
        """
        if not settings.OPENWEATHER_API_KEY or settings.OPENWEATHER_API_KEY.strip() == "":
            logger.warning("OPENWEATHER_API_KEY no configurada. Se simulará lectura climática estándar.")
            return {
                "temp_ambiente_c": 19.5,
                "sensacion_termica_c": 19.0,
                "humedad_pct": 72.0,
                "presion_hpa": 1012.0,
                "lluvia_1h_mm": 0.0,
                "lluvia_3h_mm": 0.0,
                "nubosidad_pct": 20,
                "viento_vel_ms": 3.2,
                "viento_dir_deg": 210,
                "condicion_principal": "Clear",
                "descripcion_clima": "cielo claro (modo simulado)",
                "icono_codigo": "01d"
            }

        url = f"{settings.OPENWEATHER_BASE_URL}/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": settings.OPENWEATHER_API_KEY,
            "units": "metric",
            "lang": "es"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    rain_data = data.get("rain", {})
                    
                    return {
                        "temp_ambiente_c": round(data["main"]["temp"], 2),
                        "sensacion_termica_c": round(data["main"].get("feels_like", data["main"]["temp"]), 2),
                        "humedad_pct": float(data["main"]["humidity"]),
                        "presion_hpa": float(data["main"]["pressure"]),
                        "lluvia_1h_mm": float(rain_data.get("1h", 0.0)),
                        "lluvia_3h_mm": float(rain_data.get("3h", 0.0)),
                        "nubosidad_pct": int(data.get("clouds", {}).get("all", 0)),
                        "viento_vel_ms": float(data.get("wind", {}).get("speed", 0.0)),
                        "viento_dir_deg": int(data.get("wind", {}).get("deg", 0)),
                        "condicion_principal": data["weather"][0]["main"],
                        "descripcion_clima": data["weather"][0]["description"],
                        "icono_codigo": data["weather"][0].get("icon", "01d")
                    }
                else:
                    logger.error(f"Error OpenWeather API ({response.status_code}): {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Excepción al consultar OpenWeather API: {e}")
            return None

    @classmethod
    async def sync_weather_for_node(cls, db: Session, id_nodo: str) -> Optional[ClimaOpenWeather]:
        """
        Sincroniza y almacena el estado del clima para un nodo específico.
        """
        nodo = db.query(Nodo).filter(Nodo.id_nodo == id_nodo).first()
        if not nodo:
            logger.error(f"Nodo {id_nodo} no encontrado para sincronización de clima.")
            return None

        weather_data = await cls.fetch_current_weather(lat=nodo.latitud, lon=nodo.longitud)
        if not weather_data:
            return None

        registro_clima = ClimaOpenWeather(
            id_nodo=id_nodo,
            timestamp=datetime.datetime.utcnow(),
            temp_ambiente_c=weather_data["temp_ambiente_c"],
            sensacion_termica_c=weather_data["sensacion_termica_c"],
            humedad_pct=weather_data["humedad_pct"],
            presion_hpa=weather_data["presion_hpa"],
            lluvia_1h_mm=weather_data["lluvia_1h_mm"],
            lluvia_3h_mm=weather_data["lluvia_3h_mm"],
            nubosidad_pct=weather_data["nubosidad_pct"],
            viento_vel_ms=weather_data["viento_vel_ms"],
            viento_dir_deg=weather_data["viento_dir_deg"],
            condicion_principal=weather_data["condicion_principal"],
            descripcion_clima=weather_data["descripcion_clima"],
            icono_codigo=weather_data["icono_codigo"]
        )

        db.add(registro_clima)
        db.commit()
        db.refresh(registro_clima)
        return registro_clima
