import math
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import Nodo


class HydraulicLeadTimeEstimator:
    """
    Modelo cinemático-hidráulico y probabilístico para estimar el tiempo de viaje (Lead Time)
    de una pluma contaminante o pulso de salinidad a lo largo de cualquier tramo de la cuenca.
    Soporta cálculo dinámico de distancia 3D (Haversine + Elevación + Sinuosidad de cauce).
    """

    # Factor de sinuosidad media del cauce de montaña (Chancay-Huaral y cuencas andinas)
    # Relación entre la longitud real del río con meandros y la distancia geodésica rectilínea
    FACTOR_SINUOSIDAD_DEFAULT = 1.28

    # Coeficientes de geometría hidráulica (Leopold-Maddock: v = a * Q^b)
    # Calibrados para la alta pendiente media de la cuenca (47.7%)
    VEL_COEF_A = 1.75  # m/s a Q = 1 m³/s
    VEL_EXP_B = 0.38   # Exponente de velocidad hidráulica

    # Distancias hidráulicas calibradas de referencia (en kilómetros) para los nodos del estudio base
    DISTANCIAS_CALIBRADAS_KM = {
        ("NODO-01-CABECERA", "NODO-02-CONDUCCION"): 45.0,
        ("NODO-02-CONDUCCION", "NODO-03-PARCELA"): 18.5,
        ("NODO-01-CABECERA", "NODO-03-PARCELA"): 63.5
    }

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calcula la distancia geodésica en línea recta sobre la superficie terrestre (fórmula de Haversine).
        """
        r = 6371.0  # Radio medio de la Tierra en km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    @classmethod
    def calculate_cauce_distance_3d_km(
        cls,
        lat1: float,
        lon1: float,
        cota1_msnm: float,
        lat2: float,
        lon2: float,
        cota2_msnm: float,
        sinuosidad: float = FACTOR_SINUOSIDAD_DEFAULT
    ) -> float:
        """
        Calcula la distancia real de recorrido del agua considerando:
        1. Distancia geodésica 2D (Haversine).
        2. Desnivel topográfico 3D (diferencia de cotas en msnm).
        3. Factor de sinuosidad del cauce natural / canal.
        """
        d_2d_km = cls.haversine_distance_km(lat1, lon1, lat2, lon2)
        delta_cota_km = abs(cota1_msnm - cota2_msnm) / 1000.0

        # Distancia euclidiana 3D
        d_3d_km = math.sqrt(d_2d_km ** 2 + delta_cota_km ** 2)

        # Distancia real a lo largo del cauce fluvial con meandros
        d_cauce_km = d_3d_km * sinuosidad
        return round(max(0.5, d_cauce_km), 2)

    @classmethod
    def get_distance_between_nodes(
        cls,
        origen_nodo_id: str,
        destino_nodo_id: str,
        db: Optional[Session] = None
    ) -> float:
        """
        Obtiene la distancia entre dos nodos.
        Si existen cotas y coordenadas en la base de datos, calcula la distancia 3D real de cauce;
        de lo contrario, recurre a la tabla de distancias calibradas o al valor por defecto.
        """
        # 1. Si existe en la tabla de calibraciones históricas
        key = (origen_nodo_id, destino_nodo_id)
        if key in cls.DISTANCIAS_CALIBRADAS_KM:
            return cls.DISTANCIAS_CALIBRADAS_KM[key]

        # 2. Si se provee la sesión de DB, consultar coordenadas geodésicas y cotas
        if db is not None:
            nodo_a = db.query(Nodo).filter(Nodo.id_nodo == origen_nodo_id).first()
            nodo_b = db.query(Nodo).filter(Nodo.id_nodo == destino_nodo_id).first()

            if nodo_a and nodo_b:
                return cls.calculate_cauce_distance_3d_km(
                    lat1=nodo_a.latitud,
                    lon1=nodo_a.longitud,
                    cota1_msnm=nodo_a.cota_msnm,
                    lat2=nodo_b.latitud,
                    lon2=nodo_b.longitud,
                    cota2_msnm=nodo_b.cota_msnm
                )

        # 3. Valor fallback estimado si no hay datos espaciales
        return 20.0

    @classmethod
    def estimate_travel_time(
        cls,
        origen_nodo_id: str,
        destino_nodo_id: str = "NODO-03-PARCELA",
        caudal_origen_m3s: float = 1.5,
        tipo_contaminante: str = "SALINIDAD_EC",
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Calcula el tiempo de viaje estimado (en horas y minutos) y la ventana de anticipación
        para que los agricultores cierren compuertas antes del arribo de la pluma.
        """
        distancia_km = cls.get_distance_between_nodes(origen_nodo_id, destino_nodo_id, db=db)

        # 1. Caudal efectivo mínimo para evitar división por cero
        q_efectivo = max(0.1, caudal_origen_m3s)

        # 2. Velocidad media del flujo (m/s) según ley potencial hidráulica
        v_media_ms = cls.VEL_COEF_A * (q_efectivo ** cls.VEL_EXP_B)
        v_media_kmh = v_media_ms * 3.6  # Conversión a km/h

        # 3. Tiempo medio de viaje (horas)
        tiempo_medio_horas = distancia_km / v_media_kmh

        # 4. Dispersión hidrodinámica (Frente de pluma vs Cola de pluma)
        # El frente de avance viaja más rápido (t_min) debido a la velocidad máxima en el eje del cauce
        t_arribo_frente_h = round(tiempo_medio_horas * 0.80, 2)  # Primera llegada (alerta máxima)
        t_pico_maximo_h = round(tiempo_medio_horas, 2)            # Pico de concentración
        t_despeje_cola_h = round(tiempo_medio_horas * 1.35, 2)   # Dispersión y normalización

        # Formato legible en horas y minutos
        frente_min = int(t_arribo_frente_h * 60)
        pico_min = int(t_pico_maximo_h * 60)
        horas_str = f"{frente_min // 60}h {frente_min % 60}min"

        recomendacion = (
            f"La pluma detectada en {origen_nodo_id} tardará aproximadamente {horas_str} "
            f"en alcanzar {destino_nodo_id} (Distancia calculada: {distancia_km:.1f} km). "
            f"Se dispone de una ventana de acción de {frente_min} minutos para interrumpir "
            f"la captación y cerrar compuertas."
        )

        return {
            "origen_nodo_id": origen_nodo_id,
            "destino_nodo_id": destino_nodo_id,
            "distancia_km": distancia_km,
            "caudal_transporte_m3s": round(q_efectivo, 3),
            "velocidad_flujo_kmh": round(v_media_kmh, 2),
            "lead_time_frente_horas": t_arribo_frente_h,
            "lead_time_pico_horas": t_pico_maximo_h,
            "lead_time_despeje_horas": t_despeje_cola_h,
            "ventana_anticipacion_minutos": frente_min,
            "tiempo_legible": horas_str,
            "recomendacion_accion": recomendacion
        }

    @classmethod
    def calculate_cascade_propagation(
        cls,
        origen_nodo_id: str,
        caudal_transporte_m3s: float = 1.5,
        salinidad_origen_ec: float = 1400.0,
        ph_origen: float = 7.4,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Calcula la propagación hidrodinámica secuencial (Lead Time multitramo)
        desde el nodo origen hacia todas las estaciones situadas aguas abajo.
        """
        if db is None:
            return {
                "id_nodo_origen": origen_nodo_id,
                "nombre_origen": origen_nodo_id,
                "cota_origen_msnm": 3000.0,
                "caudal_efectivo_m3s": caudal_transporte_m3s,
                "total_estaciones_aguas_abajo": 0,
                "secuencia_nodos": [],
                "resumen_cascada": "No se pudo conectar con la base de datos para calcular la topología."
            }

        nodo_origen = db.query(Nodo).filter(Nodo.id_nodo == origen_nodo_id).first()
        if not nodo_origen:
            return {
                "id_nodo_origen": origen_nodo_id,
                "nombre_origen": origen_nodo_id,
                "cota_origen_msnm": 0.0,
                "caudal_efectivo_m3s": caudal_transporte_m3s,
                "total_estaciones_aguas_abajo": 0,
                "secuencia_nodos": [],
                "resumen_cascada": f"Nodo origen '{origen_nodo_id}' no encontrado."
            }

        # Obtener todos los nodos activos y ordenarlos por cota descendente (de mayor a menor altitud)
        todos_nodos = db.query(Nodo).filter(Nodo.activo == True).order_by(Nodo.cota_msnm.desc()).all()

        # Filtrar nodos que están aguas abajo del nodo de origen (menor cota)
        cota_origen = nodo_origen.cota_msnm or 3000.0
        nodos_aguas_abajo = [n for n in todos_nodos if n.id_nodo != origen_nodo_id and (n.cota_msnm or 0) <= cota_origen]

        # Si no hay nodos de menor cota (o tienen la misma cota), ordenar por distancia Haversine
        if not nodos_aguas_abajo:
            otros = [n for n in todos_nodos if n.id_nodo != origen_nodo_id]
            otros.sort(key=lambda n: cls.haversine_distance_km(nodo_origen.latitud, nodo_origen.longitud, n.latitud, n.longitud))
            nodos_aguas_abajo = otros

        q_efectivo = max(0.1, caudal_transporte_m3s)
        v_media_ms = cls.VEL_COEF_A * (q_efectivo ** cls.VEL_EXP_B)
        v_media_kmh = v_media_ms * 3.6

        secuencia = []
        dist_acumulada = 0.0
        prev_lat, prev_lon, prev_cota = nodo_origen.latitud, nodo_origen.longitud, cota_origen

        for idx, n in enumerate(nodos_aguas_abajo, start=1):
            curr_cota = n.cota_msnm or 100.0
            dist_tramo = cls.calculate_cauce_distance_3d_km(
                lat1=prev_lat, lon1=prev_lon, cota1_msnm=prev_cota,
                lat2=n.latitud, lon2=n.longitud, cota2_msnm=curr_cota
            )
            # Asegurar consistencia acumulada directa desde origen si el tramo es pequeño
            dist_directa_origen = cls.calculate_cauce_distance_3d_km(
                lat1=nodo_origen.latitud, lon1=nodo_origen.longitud, cota1_msnm=cota_origen,
                lat2=n.latitud, lon2=n.longitud, cota2_msnm=curr_cota
            )
            dist_acumulada = max(dist_acumulada + dist_tramo, dist_directa_origen)

            desnivel_acum = max(0.0, cota_origen - curr_cota)
            t_medio_h = dist_acumulada / v_media_kmh
            t_frente_h = round(t_medio_h * 0.80, 2)
            t_pico_h = round(t_medio_h, 2)
            t_despeje_h = round(t_medio_h * 1.35, 2)
            frente_min = int(t_frente_h * 60)
            frente_legible = f"{frente_min // 60}h {frente_min % 60}min"

            # Atenuación leve de salinidad por volumen de cauce (2% a 15% según distancia)
            factor_atenuacion = max(0.85, 1.0 - (dist_acumulada / 200.0) * 0.20)
            ec_llegada = round(salinidad_origen_ec * factor_atenuacion, 1)

            # Estimación WQI aproximado a la llegada
            if ec_llegada > 1600 or ph_origen < 6.5 or ph_origen > 8.5:
                wqi_est = 42.0
                alerta = "CRÍTICA"
                compuerta = "CERRAR_COMPUERTAS_INMEDIATO"
                indicacion = f"Alerta Roja: Interrumpir captación en {frente_min} min. Salinidad estimada de arribo: {ec_llegada} µS/cm."
            elif ec_llegada > 1150:
                wqi_est = 64.0
                alerta = "ADVERTENCIA"
                compuerta = "ALERTA_PREVENTIVA_VIGILANCIA"
                indicacion = f"Alerta Amarilla: Monitorear paso de pluma en ~{frente_legible}. Salinidad moderada."
            else:
                wqi_est = 86.0
                alerta = "CONTROLADO"
                compuerta = "OPERACIÓN_NORMAL"
                indicacion = f"Condición Segura: Agua apta para riego. Tiempo de tránsito estimado: {frente_legible}."

            secuencia.append({
                "orden_secuencia": idx,
                "id_nodo": n.id_nodo,
                "nombre": n.nombre or n.id_nodo,
                "sector_cuenca": n.sector_cuenca or "CUENCA_MEDIA",
                "cota_msnm": curr_cota,
                "desnivel_acumulado_m": round(desnivel_acum, 1),
                "distancia_tramo_km": round(dist_tramo, 1),
                "distancia_acumulada_km": round(dist_acumulada, 1),
                "velocidad_media_ms": round(v_media_ms, 2),
                "velocidad_media_kmh": round(v_media_kmh, 2),
                "lead_time_frente_horas": t_frente_h,
                "lead_time_frente_minutos": frente_min,
                "lead_time_frente_legible": frente_legible,
                "lead_time_pico_horas": t_pico_h,
                "lead_time_despeje_horas": t_despeje_h,
                "salinidad_estimada_llegada_ec": ec_llegada,
                "wqi_estimado_llegada": wqi_est,
                "estado_compuerta_recomendado": compuerta,
                "nivel_alerta": alerta,
                "indicacion_operativa": indicacion
            })

            prev_lat, prev_lon, prev_cota = n.latitud, n.longitud, curr_cota

        resumen = (
            f"Cascada desde {nodo_origen.nombre or origen_nodo_id} ({cota_origen:.0f} msnm): "
            f"Se proyectó el tránsito hidrodinámico hacia {len(secuencia)} estaciones aguas abajo. "
            f"Tiempo de arribo al punto terminal: ~{secuencia[-1]['lead_time_frente_legible'] if secuencia else '0 min'} "
            f"a una velocidad media de {v_media_kmh:.1f} km/h."
        )

        return {
            "id_nodo_origen": origen_nodo_id,
            "nombre_origen": nodo_origen.nombre or origen_nodo_id,
            "cota_origen_msnm": cota_origen,
            "caudal_efectivo_m3s": round(q_efectivo, 3),
            "total_estaciones_aguas_abajo": len(secuencia),
            "secuencia_nodos": secuencia,
            "resumen_cascada": resumen
        }

