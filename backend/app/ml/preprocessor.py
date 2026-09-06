import math
import numpy as np
from typing import List, Dict, Any, Tuple


class TimeSeriesPreprocessor:
    """
    Preprocesador de series temporales para el motor de Machine Learning de Sentinel-H2O.
    Genera variables de retardo (lags), estadísticas móviles y codificación cíclica de tiempo.
    """

    @staticmethod
    def encode_cyclical_time(hour: int, day_of_year: int) -> Dict[str, float]:
        """
        Codifica la hora del día y el día del año en funciones senoidales y cosenoidales
        para que los modelos capturen la continuidad temporal (ej: hora 23 y hora 0 son continuas).
        """
        sin_hour = math.sin(2 * math.pi * hour / 24.0)
        cos_hour = math.cos(2 * math.pi * hour / 24.0)
        sin_day = math.sin(2 * math.pi * day_of_year / 365.25)
        cos_day = math.cos(2 * math.pi * day_of_year / 365.25)

        return {
            "sin_hour": round(sin_hour, 4),
            "cos_hour": round(cos_hour, 4),
            "sin_day": round(sin_day, 4),
            "cos_day": round(cos_day, 4)
        }

    @staticmethod
    def extract_features_vector(
        ph: float,
        tds_ppm: float,
        ec_us_cm: float,
        turbidez_ntu: float,
        temp_agua_c: float,
        caudal_m3s: float,
        wqi_score: float,
        hour: int = 12,
        day_of_year: int = 200,
        lluvia_1h_mm: float = 0.0,
        temp_ambiente_c: float = 20.0
    ) -> np.ndarray:
        """
        Construye un vector de características normalizadas (features) para inferencia de ML.
        """
        cyclic = TimeSeriesPreprocessor.encode_cyclical_time(hour, day_of_year)
        
        vector = np.array([
            ph,
            tds_ppm,
            ec_us_cm,
            turbidez_ntu,
            temp_agua_c,
            caudal_m3s,
            wqi_score,
            lluvia_1h_mm,
            temp_ambiente_c,
            cyclic["sin_hour"],
            cyclic["cos_hour"],
            cyclic["sin_day"],
            cyclic["cos_day"]
        ], dtype=np.float32)

        return vector
