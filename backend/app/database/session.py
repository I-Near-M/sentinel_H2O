import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Conexión dual MySQL / SQLite con Fallback de Desarrollo Local
connect_args = {}
db_url = settings.DATABASE_URL

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_size=15,
        max_overflow=25,
        pool_recycle=1800,
        pool_timeout=30
    )
    # Probar conexión si es remota
    if not db_url.startswith("sqlite"):
        with engine.connect() as conn:
            pass
except Exception as e:
    # Si MySQL no está levantado en local (ej. corriendo pytest sin docker), fallback a SQLite
    logger.warning(f"No se pudo conectar a {db_url} ({e}). Usando SQLite local de desarrollo 'sqlite:///./sentinel_h2o.db'.")
    db_url = "sqlite:///./sentinel_h2o.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)

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
