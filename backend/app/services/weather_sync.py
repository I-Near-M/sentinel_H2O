import asyncio
import logging
from sqlalchemy.orm import Session
from backend.app.database.session import SessionLocal
from backend.app.database.models import Nodo
from backend.app.services.weather_client import WeatherClient

logger = logging.getLogger(__name__)

class WeatherSyncWorker:
    """
    Servicio en segundo plano que sincroniza periódicamente la información
    meteorológica de OpenWeatherMap para todos los nodos activos de la cuenca.
    """
    def __init__(self, interval_seconds: int = 1800): # 30 minutos por defecto
        self.interval_seconds = interval_seconds
        self._running = False
        self._task = None

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"WeatherSyncWorker iniciado (Intervalo: {self.interval_seconds}s).")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("WeatherSyncWorker detenido.")

    async def _run_loop(self):
        # Esperar 10 segundos antes del primer sync para permitir arranque completo del sistema
        await asyncio.sleep(10)
        while self._running:
            try:
                await self.sync_all_nodes()
            except Exception as e:
                logger.error(f"Error en ciclo de WeatherSyncWorker: {e}")
            
            try:
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                break

    async def sync_all_nodes(self):
        db: Session = SessionLocal()
        try:
            nodos = db.query(Nodo).filter(Nodo.activo == True).all()
            if not nodos:
                # Si no hay nodos activos explícitos, buscar todos los nodos
                nodos = db.query(Nodo).all()
                
            if not nodos:
                logger.info("WeatherSync: No hay estaciones/nodos registrados para sincronizar clima.")
                return

            logger.info(f"WeatherSync: Sincronizando clima para {len(nodos)} estación(es)...")
            for nodo in nodos:
                try:
                    await WeatherClient.sync_weather_for_node(db=db, id_nodo=nodo.id_nodo)
                    # Pequeña pausa de 1s para no saturar rate limit
                    await asyncio.sleep(1)
                except Exception as node_err:
                    logger.warning(f"WeatherSync error en nodo {nodo.id_nodo}: {node_err}")
        finally:
            db.close()

weather_worker = WeatherSyncWorker(interval_seconds=1800)
