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
    DATABASE_URL: str = "sqlite:///./sentinel_h2o_local.db"

    # OpenWeatherMap API (Free Tier)
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # Notificaciones WhatsApp (Meta Cloud API oficial o Mock para desarrollo)
    WHATSAPP_PROVIDER: str = "mock"  # 'meta_cloud' o 'mock'
    WHATSAPP_API_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""

    # Hardware SIM800L SMS Fallback
    ENABLE_SIM800L_EDGE_SMS: bool = True

    # Seguridad, JWT y Clave Maestra de API
    MASTER_API_KEY: str = "sentinel_dev_master_key_change_in_prod"
    JWT_SECRET_KEY: str = "sentinel_dev_jwt_secret_change_in_production_32b"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas de vigencia
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
