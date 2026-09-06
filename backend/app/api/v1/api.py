from fastapi import APIRouter
from backend.app.api.v1.endpoints import telemetry, nodes, alerts, weather, predictions

api_router = APIRouter()

api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetría IoT"])
api_router.include_router(nodes.router, prefix="/nodes", tags=["Nodos de la Cuenca"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alertas & Destinatarios"])
api_router.include_router(weather.router, prefix="/weather", tags=["Clima OpenWeather"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["Motor de Inteligencia Artificial"])
