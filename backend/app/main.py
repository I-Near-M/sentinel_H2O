from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.v1.api import api_router
from backend.app.database.init_db import init_db


from backend.app.services.weather_sync import weather_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Verificar conexión e infraestructura de base de datos limpia (0 registros)
    init_db()
    # Iniciar sincronizador meteorológico en segundo plano
    await weather_worker.start()
    yield
    # Shutdown: Detener tareas en segundo plano limpiamente
    await weather_worker.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "API Backend de **Sentinel-H2O**: Gemelo Virtual Descentralizado de la Cuenca Chancay-Huaral. "
        "Recepción de telemetría IoT de campo (ESP32 / SIM800L), procesamiento electroquímico e hidrológico "
        "(WQI Min-Max, compensación térmica al +2%/°C, conversión nivel-caudal), ingesta de OpenWeatherMap "
        "y motor de alertas tempranas campesinas para WhatsApp y de supervisión para la ANA."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar endpoints de la API v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Estado General"])
def root():
    return {
        "sistema": "Sentinel-H2O | Backend API",
        "version": settings.VERSION,
        "estado": "OPERACIONAL",
        "documentacion": "/docs",
        "cuenca": "Chancay-Huaral (Perú)"
    }
