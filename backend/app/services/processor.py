import math
from typing import Tuple, Dict, Any, Optional, List


class TelemetryProcessor:
    """
    Motor científico de procesamiento físico, electroquímico, hidrométrico y acuícola.
    Calcula caudales por molinete hidrométrico con sensor de efecto Hall y perfil de regletas,
    e índices ambientales (WQI y Aptitud Piscícola para truchas).
    """

    @staticmethod
    def calc_ph(raw_v_ph: float, ph_offset_v: float = 2.5000, ph_slope: float = -0.1800) -> Tuple[float, str]:
        """
        Calcula el pH a partir del voltaje analógico de la sonda PH-4502C.
        pH = 7.0 + (V_medido - V_offset) / slope
        """
        slope = ph_slope if abs(ph_slope) > 0.01 else -0.1800
        delta_v = raw_v_ph - ph_offset_v
        ph = 7.0 + (delta_v / slope)
        ph = max(0.0, min(14.0, round(ph, 2)))

        if ph < 6.5:
            estado_ph = "ACIDO_PELIGROSO"
        elif ph <= 8.5:
            estado_ph = "OPTIMO"
        else:
            estado_ph = "ALCALINO_PELIGROSO"

        return ph, estado_ph

    @staticmethod
    def calc_tds_and_ec(
        raw_v_tds: float,
        temp_agua_c: float = 25.0,
        tds_factor_k: float = 0.5000,
        tds_offset_v: float = 0.0000
    ) -> Tuple[float, float, str]:
        """
        Calcula TDS (ppm) y Conductividad Eléctrica (EC en uS/cm) con compensación térmica a 25°C.
        """
        v_ajustado = max(0.0, raw_v_tds - tds_offset_v)
        
        # Curva de conversión no lineal del sensor Keyestudio TDS
        tds_raw = (133.42 * (v_ajustado ** 3) - 255.86 * (v_ajustado ** 2) + 857.39 * v_ajustado) * 0.5
        tds_raw = max(0.0, tds_raw)

        # Coeficiente de compensación térmica estándar: 2% por grado Celsius respecto a 25°C
        coef_termico = 1.0 + 0.02 * (temp_agua_c - 25.0)
        if coef_termico <= 0.1:
            coef_termico = 0.1

        tds_ppm = round(tds_raw / coef_termico, 2)
        
        # Conductividad Eléctrica (EC en uS/cm) = TDS (ppm) / k
        factor_k = tds_factor_k if tds_factor_k > 0.05 else 0.5000
        ec_us_cm = round(tds_ppm / factor_k, 2)

        # Evaluación agronómica de salinidad
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
        """
        v_sensor = raw_v_turb * divider_ratio
        
        if v_sensor >= turb_v_clear:
            return 0.5

        if turb_v_clear == turb_v_turbid:
            return 10.0

        fraccion = (turb_v_clear - v_sensor) / (turb_v_clear - turb_v_turbid)
        fraccion = max(0.0, min(1.0, fraccion))
        
        ntu = (fraccion ** 1.3) * 3000.0
        return round(ntu, 2)

    @staticmethod
    def calc_flow_velocity_hall(
        hall_rpm: float,
        constante_a: float = 0.2500,
        constante_b: float = 0.0500
    ) -> float:
        """
        Calcula la velocidad lineal del agua (m/s) según la ecuación de calibración del molinete:
        V = a * (RPM / 60) + b   (o V = a * RPM + b según unidades del paso de hélice)
        Por estándar hidrométrico (ISO 748), usamos velocidad de rotación por segundo n = RPM / 60:
        V = a * (RPM / 60.0) + (b if RPM > 0 else 0)
        """
        if hall_rpm <= 0.001:
            return 0.0
        n_rps = hall_rpm / 60.0
        velocidad = constante_a * n_rps + constante_b
        return round(max(0.0, velocidad), 4)

    @staticmethod
    def calc_cross_sectional_area(
        tirante_cm: float,
        puntos_seccion: Optional[List[Any]] = None,
        tipo_seccion: str = "REGLETA_PUNTOS",
        ancho_solera_m: Optional[float] = None,
        talud_z: Optional[float] = None
    ) -> float:
        """
        Calcula el área hidráulica de la sección mojada A(h) en m².
        Integra las mediciones batimétricas de regleta (2 a 10+ puntos) o geometría estándar.
        """
        if tirante_cm <= 0.001:
            return 0.0

        h_m = tirante_cm / 100.0

        # Si se cuenta con perfil transversal de regletas (Mid-Section / Método de los trapecios)
        if puntos_seccion and len(puntos_seccion) >= 2:
            puntos_ordenados = sorted(
                puntos_seccion,
                key=lambda p: getattr(p, 'distancia_orilla_m', 0.0)
            )
            area_total = 0.0
            for i in range(len(puntos_ordenados) - 1):
                p1 = puntos_ordenados[i]
                p2 = puntos_ordenados[i + 1]
                x1 = getattr(p1, 'distancia_orilla_m', 0.0)
                x2 = getattr(p2, 'distancia_orilla_m', 0.0)
                d1 = getattr(p1, 'profundidad_lecho_m', 0.0)
                d2 = getattr(p2, 'profundidad_lecho_m', 0.0)

                # Tirante local en cada vertical
                y1 = max(0.0, h_m - d1)
                y2 = max(0.0, h_m - d2)
                dx = abs(x2 - x1)
                area_total += ((y1 + y2) / 2.0) * dx

            if area_total > 0.0001:
                return round(area_total, 4)

        # Si es canal rectangular
        b = ancho_solera_m if (ancho_solera_m and ancho_solera_m > 0) else 1.20
        if tipo_seccion == "RECTANGULAR":
            return round(b * h_m, 4)

        # Si es canal trapezoidal: A = (b + z*h)*h
        z = talud_z if (talud_z and talud_z >= 0) else 0.50
        if tipo_seccion == "TRAPEZOIDAL":
            return round((b + z * h_m) * h_m, 4)

        # Por defecto (sección promedio aproximada)
        return round(b * h_m, 4)

    @classmethod
    def calc_water_level_and_flow(
        cls,
        raw_dist_cm: float,
        distancia_fondo_sensor_cm: float,
        hall_rpm: float = 0.0,
        calibracion: Optional[Any] = None,
        caudal_coef_k: Optional[float] = None,
        caudal_exp_n: Optional[float] = None
    ) -> Tuple[float, float, float, float, float]:
        """
        Calcula tirante (cm), velocidad (m/s), área (m²), caudal en m³/s y l/s.
        Utiliza aforo por molinete de efecto Hall Q = A * V.
        Si hall_rpm es 0 y se suministran coeficientes de vertedero, mantiene soporte de respaldo.
        """
        tirante_cm = distancia_fondo_sensor_cm - raw_dist_cm
        tirante_cm = max(0.0, round(tirante_cm, 2))
        h_m = tirante_cm / 100.0

        constante_a = getattr(calibracion, 'molinete_constante_a', 0.2500) if calibracion else 0.2500
        constante_b = getattr(calibracion, 'molinete_constante_b', 0.0500) if calibracion else 0.0500
        tipo_seccion = getattr(calibracion, 'tipo_seccion', 'REGLETA_PUNTOS') if calibracion else 'REGLETA_PUNTOS'
        ancho_solera_m = getattr(calibracion, 'ancho_solera_m', 1.20) if calibracion else 1.20
        talud_z = getattr(calibracion, 'talud_z', 0.50) if calibracion else 0.50
        puntos_seccion = getattr(calibracion, 'puntos_seccion', None) if calibracion else None

        # 1. Velocidad por molinete
        velocidad_ms = cls.calc_flow_velocity_hall(hall_rpm, constante_a, constante_b)

        # 2. Área de la sección transversal
        area_m2 = cls.calc_cross_sectional_area(
            tirante_cm=tirante_cm,
            puntos_seccion=puntos_seccion,
            tipo_seccion=tipo_seccion,
            ancho_solera_m=ancho_solera_m,
            talud_z=talud_z
        )

        if h_m <= 0.001:
            caudal_m3s = 0.0
            velocidad_ms = 0.0
        elif hall_rpm > 0.0:
            # Cálculo por molinete hidrométrico: Q = A * V
            caudal_m3s = round(area_m2 * velocidad_ms, 4)
        elif caudal_coef_k is not None and caudal_exp_n is not None:
            # Compatibilidad con pruebas previas que prueben ecuación empírica
            caudal_m3s = round(caudal_coef_k * (h_m ** caudal_exp_n), 4)
            velocidad_ms = round(caudal_m3s / max(0.001, area_m2), 4)
        else:
            # Manning de aproximación si no hay giro de molinete pero hay agua fluyendo
            n_manning = getattr(calibracion, 'coeficiente_friccion', 0.0350) if calibracion else 0.0350
            pend_s = 0.002
            radio_hid = area_m2 / max(0.01, (ancho_solera_m or 1.2) + 2.0 * h_m)
            v_manning = (1.0 / n_manning) * (radio_hid ** (2.0 / 3.0)) * (pend_s ** 0.5)
            caudal_m3s = round(area_m2 * v_manning, 4)
            velocidad_ms = round(v_manning, 4)

        caudal_ls = round(caudal_m3s * 1000.0, 2)
        return tirante_cm, velocidad_ms, area_m2, caudal_m3s, caudal_ls

    @staticmethod
    def calc_pisciculture_suitability(temp_c: float, oxigeno_mgl: Optional[float] = None) -> Tuple[float, float, str]:
        """
        Evalúa la aptitud del agua para piscicultura de agua fría (Trucha Arcoíris).
        Calcula o estima saturación de oxígeno según temperatura y clasifica el riesgo.
        """
        # Estimación empírica de concentración de saturación de O2 (Benson-Krause a 1 atm)
        t_kelvin = temp_c + 273.15
        od_sat = max(5.0, 14.652 - 0.41022 * temp_c + 0.007991 * (temp_c ** 2) - 0.000077774 * (temp_c ** 3))
        
        od_real = oxigeno_mgl if (oxigeno_mgl is not None and oxigeno_mgl > 0) else round(od_sat * 0.85, 2)
        sat_pct = round((od_real / od_sat) * 100.0, 1)

        if temp_c > 20.0 or od_real < 4.5:
            aptitud = "NO_APTO"
        elif temp_c > 17.0:
            aptitud = "ALERTA_TERMICA"
        elif od_real < 6.0:
            aptitud = "DEFICIT_OXIGENO"
        else:
            aptitud = "OPTIMO"

        return round(od_real, 2), sat_pct, aptitud

    @staticmethod
    def calc_wqi(
        ph: float,
        temp_c: float,
        tds_ppm: float,
        ec_us_cm: float,
        turbidez_ntu: float
    ) -> Tuple[float, str]:
        """
        Calcula el Índice de Calidad del Agua (WQI) Min-Max normalizado y ponderado.
        """
        norm_ph = min(1.0, max(0.0, abs(ph - 7.5) / 1.5))
        norm_temp = min(1.0, max(0.0, (temp_c - 5.0) / 35.0))
        norm_tds = min(1.0, max(0.0, tds_ppm / 1000.0))
        norm_ec = min(1.0, max(0.0, ec_us_cm / 2000.0))
        norm_turb = min(1.0, max(0.0, turbidez_ntu / 50.0))

        suma_ponderada = (
            2.5 * norm_ph +
            1.5 * norm_temp +
            2.0 * norm_tds +
            2.0 * norm_ec +
            2.0 * norm_turb
        )

        wqi = round(suma_ponderada * 10.0, 2)
        wqi = max(0.0, min(100.0, wqi))

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
        calibracion: Any,
        hall_rpm: float = 0.0
    ) -> Dict[str, Any]:
        """
        Procesa una muestra cruda completa usando los factores de calibración y molinete Hall.
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

        tirante_cm, velocidad_ms, area_m2, caudal_m3s, caudal_ls = cls.calc_water_level_and_flow(
            raw_dist_cm=raw_dist_cm,
            distancia_fondo_sensor_cm=calibracion.distancia_fondo_sensor_cm,
            hall_rpm=hall_rpm,
            calibracion=calibracion
        )

        wqi_score, wqi_categoria = cls.calc_wqi(
            ph=ph,
            temp_c=temp_c,
            tds_ppm=tds_ppm,
            ec_us_cm=ec_us_cm,
            turbidez_ntu=turbidez_ntu
        )

        od_real, sat_pct, aptitud_piscicola = cls.calc_pisciculture_suitability(temp_c=temp_c)

        return {
            "ph": ph,
            "estado_ph": estado_ph,
            "tds_ppm": tds_ppm,
            "ec_us_cm": ec_us_cm,
            "estado_salinidad": estado_salinidad,
            "turbidez_ntu": turbidez_ntu,
            "temp_agua_c": temp_c,
            "oxigeno_disuelto_mgl": od_real,
            "saturacion_oxigeno_pct": sat_pct,
            "aptitud_piscicola": aptitud_piscicola,
            "tirante_agua_cm": tirante_cm,
            "velocidad_agua_ms": velocidad_ms,
            "area_hidraulica_m2": area_m2,
            "caudal_m3s": caudal_m3s,
            "caudal_ls": caudal_ls,
            "wqi_score": wqi_score,
            "wqi_categoria": wqi_categoria
        }
