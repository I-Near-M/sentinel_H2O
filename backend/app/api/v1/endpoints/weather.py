from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import ClimaOpenWeather, Nodo
from backend.app.schemas.weather import WeatherRecordOut, WeatherSyncResponse
from backend.app.services.weather_client import WeatherClient

router = APIRouter()


@router.get("/{node_id}/current", response_model=WeatherRecordOut)
def get_current_node_weather(node_id: str, db: Session = Depends(get_db)):
    """
    Retorna el último registro meteorológico disponible para las coordenadas del nodo.
    """
    clima = db.query(ClimaOpenWeather).filter(
        ClimaOpenWeather.id_nodo == node_id
    ).order_by(ClimaOpenWeather.timestamp.desc()).first()

    if not clima:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No hay registros meteorológicos para el nodo '{node_id}'. Ejecute una sincronización."
        )
    return clima


@router.post("/{node_id}/sync", response_model=WeatherSyncResponse)
async def sync_weather_endpoint(node_id: str, db: Session = Depends(get_db)):
    """
    Fuerza la consulta a la API de OpenWeatherMap usando las coordenadas del nodo
    y persiste los datos meteorológicos (lluvia, humedad, temperatura, presión).
    """
    registro = await WeatherClient.sync_weather_for_node(db=db, id_nodo=node_id)
    if not registro:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo sincronizar el clima para el nodo '{node_id}'."
        )

    return WeatherSyncResponse(
        status="SUCCESS",
        id_nodo=node_id,
        datos_clima=WeatherRecordOut.model_validate(registro),
        mensaje=f"Clima sincronizado exitosamente para {node_id} ({registro.descripcion_clima}, {registro.temp_ambiente_c}°C)."
    )
