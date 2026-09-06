from fastapi import Header, HTTPException, status
from backend.app.core.config import settings


def verify_master_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    """
    Verifica que la petición incluya la API Key maestra para endpoints administrativos.
    """
    if not x_api_key or x_api_key != settings.MASTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales no autorizadas: API Key maestra inválida o faltante.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return x_api_key
