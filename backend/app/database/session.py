import sys
import time
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Conexión dual MySQL / SQLite con reintentos para entornos Docker / Producción
connect_args = {}
db_url = settings.DATABASE_URL

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
else:
    engine = None
    is_testing = ("pytest" in sys.modules or any("pytest" in arg for arg in sys.argv))
    max_retries = 1 if is_testing else 15
    retry_interval = 2

    for attempt in range(1, max_retries + 1):
        try:
            candidate_engine = create_engine(
                db_url,
                connect_args=connect_args,
                pool_pre_ping=True,
                pool_size=15,
                max_overflow=25,
                pool_recycle=1800,
                pool_timeout=30
            )
            with candidate_engine.connect() as conn:
                logger.info(f"Conexión exitosa a MySQL en intento {attempt}.")
                engine = candidate_engine
                break
        except Exception as e:
            logger.warning(f"Intento {attempt}/{max_retries} conectando a base de datos MySQL ({db_url}): {e}")
            if attempt < max_retries:
                time.sleep(retry_interval)

    if engine is None:
        if settings.ENV == "development" or settings.ENV == "testing" or "pytest" in sys.modules:
            logger.warning("No se pudo conectar a MySQL. Usando fallback a SQLite local para pruebas.")
            db_url = "sqlite:///./sentinel_h2o.db"
            connect_args = {"check_same_thread": False}
            engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
        else:
            raise RuntimeError(f"Error crítico: No se pudo conectar a la base de datos MySQL requerida: {db_url}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Generador de sesión de base de datos para inyección de dependencias en FastAPI.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
