import numpy as np
from typing import Dict, Any, Tuple
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from backend.app.ml.preprocessor import TimeSeriesPreprocessor


class OnlineAnomalyDetector:
    """
    Detector de anomalías en tiempo real (In-Line) para Sentinel-H2O.
    Combina Isolation Forest (no supervisado) con un clasificador de patrones de riesgo agronómico.
    """

    def __init__(self):
        # 1. Isolation Forest pre-entrenado con rangos físicos nominales de la cuenca
        self.iso_forest = IsolationForest(
            n_estimators=50,
            contamination=0.05,
            random_state=42
        )
        self._init_baseline_model()

    def _init_baseline_model(self):
        """
        Inicializa el modelo con una distribución representativa de condiciones normales
        y perturbaciones sintéticas calibradas para la Cuenca Chancay-Huaral.
        """
        # Generar matriz sintética base para calibrar el IsolationForest
        np.random.seed(42)
        n_samples = 200
        
        # Muestras normales en Chancay-Huaral:
        # pH: 7.2 - 8.1, TDS: 200 - 500, EC: 400 - 1000, Turb: 2 - 20, Temp: 12 - 20, Q: 0.2 - 2.5
        ph_norm = np.random.uniform(7.0, 8.2, n_samples)
        tds_norm = np.random.uniform(200.0, 500.0, n_samples)
        ec_norm = tds_norm / 0.5
        turb_norm = np.random.uniform(2.0, 25.0, n_samples)
        temp_norm = np.random.uniform(12.0, 20.0, n_samples)
        caudal_norm = np.random.uniform(0.2, 3.0, n_samples)
        wqi_norm = np.random.uniform(15.0, 45.0, n_samples)
        lluvia_norm = np.random.uniform(0.0, 2.0, n_samples)
        temp_amb = np.random.uniform(15.0, 25.0, n_samples)
        
        X_train = []
        for i in range(n_samples):
            vec = TimeSeriesPreprocessor.extract_features_vector(
                ph=ph_norm[i],
                tds_ppm=tds_norm[i],
                ec_us_cm=ec_norm[i],
                turbidez_ntu=turb_norm[i],
                temp_agua_c=temp_norm[i],
                caudal_m3s=caudal_norm[i],
                wqi_score=wqi_norm[i],
                hour=np.random.randint(0, 24),
                day_of_year=np.random.randint(1, 365),
                lluvia_1h_mm=lluvia_norm[i],
                temp_ambiente_c=temp_amb[i]
            )
            X_train.append(vec)

        self.iso_forest.fit(np.array(X_train))

    def evaluate_reading(
        self,
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
    ) -> Dict[str, Any]:
        """
        Evalúa un vector de telemetría y determina:
        - anomaly_score: Score de aislamiento (-1 anómalo, 1 normal)
        - is_anomaly: Booleano
        - diagnostico_ia: Clasificación del tipo de evento detectado
        - nivel_confianza: Probabilidad estimada (0.0 - 1.0)
        """
        vec = TimeSeriesPreprocessor.extract_features_vector(
            ph=ph,
            tds_ppm=tds_ppm,
            ec_us_cm=ec_us_cm,
            turbidez_ntu=turbidez_ntu,
            temp_agua_c=temp_agua_c,
            caudal_m3s=caudal_m3s,
            wqi_score=wqi_score,
            hour=hour,
            day_of_year=day_of_year,
            lluvia_1h_mm=lluvia_1h_mm,
            temp_ambiente_c=temp_ambiente_c
        ).reshape(1, -1)

        raw_score = self.iso_forest.decision_function(vec)[0]  # Positivo = normal, Negativo = anómalo
        pred_label = self.iso_forest.predict(vec)[0]  # 1 = normal, -1 = anómalo

        is_anomaly = bool(pred_label == -1 or ec_us_cm > 1500.0 or ph < 6.5 or ph > 8.5 or turbidez_ntu > 60.0)

        # Diagnóstico experto guiado por reglas y patrones multivariables
        diagnostico = "ESTADO_NORMAL"
        severidad = "NORMAL"
        
        if ec_us_cm >= 1500.0:
            diagnostico = "RIESGO_CRITICO_ESTRES_OSMOTICO"
            severidad = "CRITICO_ROJO"
        elif ec_us_cm >= 1200.0:
            diagnostico = "ADVERTENCIA_SALINIDAD_ELEVADA"
            severidad = "ADVERTENCIA_AMARILLA"
        elif ph < 6.50:
            diagnostico = "VERTIMIENTO_ACIDO_O_PASIVO_MINERO"
            severidad = "CRITICO_ROJO"
        elif ph > 8.50:
            diagnostico = "ALCALINIDAD_ELEVADA_RESIDUOS"
            severidad = "CRITICO_ROJO"
        elif turbidez_ntu >= 50.0:
            diagnostico = "CRECIDA_O_SEDIMENTACION_EXCESIVA"
            severidad = "ADVERTENCIA_AMARILLA"
        elif pred_label == -1:
            diagnostico = "ANOMALIA_MULTIVARIABLE_DESCONOCIDA"
            severidad = "ADVERTENCIA_AMARILLA"

        # Confianza del diagnóstico (0.5 a 0.99)
        confianza = min(0.99, max(0.50, round(0.70 + abs(raw_score) * 0.5, 2)))

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(float(raw_score), 4),
            "diagnostico_ia": diagnostico,
            "nivel_severidad": severidad,
            "confianza": confianza
        }


# Instancia singleton para inferencia in-line rápida en memoria
anomaly_detector = OnlineAnomalyDetector()
