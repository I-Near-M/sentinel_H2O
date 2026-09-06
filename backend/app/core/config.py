import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuración centralizada del backend de Sentinel-H2O.
    """
    PROJECT_NAME: str = "Sentinel-H2O Backend API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    ENV: str = "production"

    # Base de Datos (MySQL en Docker / Fallback a SQLite en desarrollo local)
    DATABASE_URL: str = "mysql+pymysql://sentinel_user:sentinel_password_2026@sentinel-db:3306/sentinel_h2o_db"

    # OpenWeatherMap API (Free Tier)
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # Notificaciones WhatsApp (Meta Cloud API oficial o Mock para desarrollo)
    WHATSAPP_PROVIDER: str = "meta_cloud"  # 'meta_cloud' o 'mock'
    WHATSAPP_API_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""

    # Hardware SIM800L SMS Fallback
    ENABLE_SIM800L_EDGE_SMS: bool = True

    # Seguridad y Clave Maestra de API
    MASTER_API_KEY: str = "sentinel_h2o_master_secret_2026"
    ALLOWED_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
