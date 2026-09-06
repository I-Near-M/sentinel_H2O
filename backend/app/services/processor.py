import math
from typing import Dict, Any, Tuple


class TelemetryProcessor:
    """
    Motor científico y físico para el procesamiento de telemetría de Sentinel-H2O.
    Ejecuta calibración remota, compensación térmica al +2%/°C, conversión hidrométrica y WQI.
    """

    @staticmethod
    def calc_ph(raw_v_ph: float, ph_offset_v: float = 2.50, ph_slope: float = -0.18) -> Tuple[float, str]:
        """
        Calcula el pH a partir del voltaje analógico de la sonda E-201-C / PH-4502C.
        """
        # Relación lineal: V = offset + slope * (pH - 7.0)
        # pH = 7.0 + (V - offset) / slope
        delta_v = raw_v_ph - ph_offset_v
        ph = 7.0 + (delta_v / ph_slope)
        ph = max(0.0, min(14.0, round(ph, 2)))

        if ph < 6.50:
            estado = "ACIDO_PELIGROSO"
        elif ph > 8.50:
            estado = "ALCALINO_PELIGROSO"
        else:
            estado = "OPTIMO"

        return ph, estado

    @staticmethod
    def calc_tds_and_ec(
        raw_v_tds: float,
        temp_agua_c: float,
        tds_factor_k: float = 0.5000,
        tds_offset_v: float = 0.0
    ) -> Tuple[float, float, str]:
        """
        Calcula TDS (ppm) y Conductividad Eléctrica (uS/cm) con compensación térmica a 25°C (+2%/°C).
        """
        v_ajustado = max(0.0, raw_v_tds - tds_offset_v)
        
        # Ecuación polinómica estándar de sensor analógico TDS
        # TDS_raw (ppm) = (133.42 * V^3 - 255.86 * V^2 + 857.39 * V) * 0.5
        tds_raw = (133.42 * (v_ajustado ** 3) - 255.86 * (v_ajustado ** 2) + 857.39 * v_ajustado) * 0.5
        tds_raw = max(0.0, tds_raw)

        # Coeficiente de compensación térmica estándar internacional a 25°C (+2% por grado Celsius)
        coef_termico = 1.0 + 0.02 * (temp_agua_c - 25.0)
        if coef_termico <= 0.1:
            coef_termico = 0.1

        tds_ppm = round(tds_raw / coef_termico, 2)
        
        # Conductividad Eléctrica (EC en uS/cm) = TDS (ppm) / k  (donde k suele ser 0.5 a 0.65)
        factor_k = tds_factor_k if tds_factor_k > 0.05 else 0.5000
        ec_us_cm = round(tds_ppm / factor_k, 2)

        # Evaluación agronómica de salinidad para frutales
        if ec_us_cm < 1200.0:
            estado_salinidad = "OPTIMO"
        elif ec_us_cm <= 1500.0:
            estado_salinidad = "PRECAUCION"
        else:
            estado_salinidad = "PELIGRO_ESTRES_OSMOTICO"

        return tds_ppm, ec_us_cm, estado_salinidad

    @staticmethod
    def calc_turbidity(
        raw_v_turb: float,
        turb_v_clear: float = 4.20,
        turb_v_turbid: float = 2.50,
        divider_ratio: float = 1.5
    ) -> float:
        """
        Calcula la turbidez en unidades NTU a partir de la sonda óptica TS-300B.
        Considera el escalamiento del divisor resistivo (de 3.0V a 4.5V).
        """
        # Reconstruir voltaje original del sensor (antes del divisor de tensión)
        v_sensor = raw_v_turb * divider_ratio
        
        if v_sensor >= turb_v_clear:
            return 0.5  # Agua completamente transparente

        if turb_v_clear == turb_v_turbid:
            return 10.0

        # Normalización en rango calibrado (0 a 3000 NTU)
        fraccion = (turb_v_clear - v_sensor) / (turb_v_clear - turb_v_turbid)
        fraccion = max(0.0, min(1.0, fraccion))
        
        # Curva de respuesta óptica no lineal
        ntu = (fraccion ** 1.3) * 3000.0
        return round(ntu, 2)

    @staticmethod
    def calc_water_level_and_flow(
        raw_dist_cm: float,
        distancia_fondo_sensor_cm: float,
        caudal_coef_k: float = 1.0000,
        caudal_exp_n: float = 1.5000
    ) -> Tuple[float, float, float]:
        """
        Convierte la distancia ultrasónica (JSN-SR04T) a tirante de agua (cm) y Caudal (m³/s y l/s).
        """
        tirante_cm = distancia_fondo_sensor_cm - raw_dist_cm
        tirante_cm = max(0.0, round(tirante_cm, 2))

        # Tirante en metros
        h_m = tirante_cm / 100.0

        # Curva hidrológica Q = K * h^N
        if h_m <= 0.001:
            caudal_m3s = 0.0
        else:
            caudal_m3s = caudal_coef_k * (h_m ** caudal_exp_n)

        caudal_m3s = round(caudal_m3s, 4)
        caudal_ls = round(caudal_m3s * 1000.0, 2)

        return tirante_cm, caudal_m3s, caudal_ls

    @staticmethod
    def calc_wqi(
        ph: float,
        temp_c: float,
        tds_ppm: float,
        ec_us_cm: float,
        turbidez_ntu: float
    ) -> Tuple[float, str]:
        """
        Calcula el Índice de Calidad del Agua (WQI) Min-Max normalizado y ponderado
        basado en la metodología de Horton / NSF-WQI adaptada (Tsolaki et al., MDPI 2026).
        Score: 0 - 100 (Donde 0-30 es Excelente, 31-50 Buena, 51-70 Pobre, 71-90 Mala, 91-100 Muy Mala).
        """
        # 1. Normalización Min-Max de cada parámetro (0.0 es óptimo, 1.0 es degradado)
        norm_ph = min(1.0, max(0.0, abs(ph - 7.5) / 1.5))
        norm_temp = min(1.0, max(0.0, (temp_c - 5.0) / 35.0))
        norm_tds = min(1.0, max(0.0, tds_ppm / 1000.0))
        norm_ec = min(1.0, max(0.0, ec_us_cm / 2000.0))
        norm_turb = min(1.0, max(0.0, turbidez_ntu / 50.0))

        # 2. Ponderación por importancia ambiental y agrícola
        # pH: 25%, Temp: 15%, TDS: 20%, EC: 20%, Turbidez: 20%
        suma_ponderada = (
            2.5 * norm_ph +
            1.5 * norm_temp +
            2.0 * norm_tds +
            2.0 * norm_ec +
            2.0 * norm_turb
        )

        wqi = round(suma_ponderada * 10.0, 2)
        wqi = max(0.0, min(100.0, wqi))

        # 3. Clasificación
        if wqi <= 30.0:
            categoria = "EXCELENTE"
        elif wqi <= 50.0:
            categoria = "BUENA"
        elif wqi <= 70.0:
            categoria = "POBRE"
        elif wqi <= 90.0:
            categoria = "MALA"
        else:
            categoria = "MUY_MALA"

        return wqi, categoria

    @classmethod
    def process_raw_telemetry(
        cls,
        raw_v_ph: float,
        raw_v_tds: float,
        raw_v_turb: float,
        raw_dist_cm: float,
        temp_c: float,
        calibracion: Any
    ) -> Dict[str, Any]:
        """
        Procesa una muestra cruda completa usando los factores de calibración del nodo.
        """
        ph, estado_ph = cls.calc_ph(
            raw_v_ph=raw_v_ph,
            ph_offset_v=calibracion.ph_offset_v,
            ph_slope=calibracion.ph_slope
        )

        tds_ppm, ec_us_cm, estado_salinidad = cls.calc_tds_and_ec(
            raw_v_tds=raw_v_tds,
            temp_agua_c=temp_c,
            tds_factor_k=calibracion.tds_factor_k,
            tds_offset_v=calibracion.tds_offset_v
        )

        turbidez_ntu = cls.calc_turbidity(
            raw_v_turb=raw_v_turb,
            turb_v_clear=calibracion.turb_v_clear,
            turb_v_turbid=calibracion.turb_v_turbid
        )

        tirante_cm, caudal_m3s, caudal_ls = cls.calc_water_level_and_flow(
            raw_dist_cm=raw_dist_cm,
            distancia_fondo_sensor_cm=calibracion.distancia_fondo_sensor_cm,
            caudal_coef_k=calibracion.caudal_coef_k,
            caudal_exp_n=calibracion.caudal_exp_n
        )

        wqi_score, wqi_categoria = cls.calc_wqi(
            ph=ph,
            temp_c=temp_c,
            tds_ppm=tds_ppm,
            ec_us_cm=ec_us_cm,
            turbidez_ntu=turbidez_ntu
        )

        return {
            "ph": ph,
            "estado_ph": estado_ph,
            "tds_ppm": tds_ppm,
            "ec_us_cm": ec_us_cm,
            "estado_salinidad": estado_salinidad,
            "turbidez_ntu": turbidez_ntu,
            "temp_agua_c": temp_c,
            "tirante_agua_cm": tirante_cm,
            "caudal_m3s": caudal_m3s,
            "caudal_ls": caudal_ls,
            "wqi_score": wqi_score,
            "wqi_categoria": wqi_categoria
        }
