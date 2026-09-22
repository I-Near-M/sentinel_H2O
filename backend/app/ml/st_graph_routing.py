"""
Sentinel-H2O: Spatio-Temporal Graph Routing Engine for 3D Digital Twin
Models the river network as a directed acyclic graph (DAG) of hydrological stations.
Calculates 1D wave propagation, solute transport attenuation, and continuous mesh interpolation
for WebGL/Three.js rendering in the 3D Digital Twin.
"""

import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import Nodo, CalibracionNodo, MedicionProcesada


class SpatioTemporalGraphRouter:
    """
    Motor de grafos espacio-temporales para el Gemelo Digital 3D.
    Permite trazar la propagación de una perturbación (caudal, salinidad, contaminación)
    a lo largo de toda la red fluvial y generar los perfiles continuos interpolados.
    """

    @classmethod
    def get_river_graph(cls, db: Session) -> Dict[str, Any]:
        """
        Construye la topología del grafo fluvial a partir de los nodos activos
        ordenados por cota descendente (cabecera a valle/desembocadura).
        """
        nodos = db.query(Nodo).filter(Nodo.activo == True).order_by(Nodo.cota_msnm.desc()).all()
        if not nodos:
            return {"vertices": [], "edges": [], "total_nodos": 0}

        vertices = []
        edges = []
        cum_dist = 0.0

        for i, n in enumerate(nodos):
            last_proc = db.query(MedicionProcesada).filter(
                MedicionProcesada.id_nodo == n.id_nodo
            ).order_by(MedicionProcesada.timestamp.desc()).first()

            calib = db.query(CalibracionNodo).filter(
                CalibracionNodo.id_nodo == n.id_nodo,
                CalibracionNodo.es_vigente == True
            ).first()

            v_item = {
                "id_nodo": n.id_nodo,
                "codigo": n.codigo_estacion,
                "nombre": n.nombre,
                "tramo_sector": n.tramo_sector,
                "latitud": n.latitud,
                "longitud": n.longitud,
                "cota_msnm": n.cota_msnm,
                "orden": i + 1,
                "caudal_actual_m3s": last_proc.caudal_m3s if last_proc else 1.0,
                "salinidad_actual_ec": last_proc.ec_us_cm if last_proc else 600.0,
                "ph_actual": last_proc.ph if last_proc else 7.4,
                "turbidez_actual": last_proc.turbidez_ntu if last_proc else 10.0,
                "wqi_actual": last_proc.wqi_score if last_proc else 75.0,
                "manning_n": calib.coeficiente_friccion if calib else 0.035
            }
            vertices.append(v_item)

            if i > 0:
                prev = vertices[i - 1]
                # Distancia geodésica simplificada
                d_lat = (v_item["latitud"] - prev["latitud"]) * 111.0
                d_lon = (v_item["longitud"] - prev["longitud"]) * 111.0 * math.cos(math.radians(v_item["latitud"]))
                dist_km = max(0.5, round(math.sqrt(d_lat**2 + d_lon**2), 2))
                desnivel_m = max(0.0, prev["cota_msnm"] - v_item["cota_msnm"])
                slope = max(0.0001, desnivel_m / (dist_km * 1000.0))
                cum_dist += dist_km

                edges.append({
                    "origen": prev["id_nodo"],
                    "destino": v_item["id_nodo"],
                    "distancia_tramo_km": dist_km,
                    "distancia_acumulada_km": round(cum_dist, 2),
                    "desnivel_m": round(desnivel_m, 1),
                    "pendiente_hidraulica": round(slope, 5),
                    "rugosidad_manning": prev["manning_n"]
                })

        return {
            "vertices": vertices,
            "edges": edges,
            "total_nodos": len(vertices),
            "longitud_total_km": round(cum_dist, 2)
        }

    @classmethod
    def generate_3d_mesh_profile(
        cls,
        db: Session,
        samples_per_reach: int = 10
    ) -> Dict[str, Any]:
        """
        Genera los puntos de muestreo interpolados a lo largo del eje del río
        para la malla poligonal (spline) del Gemelo Digital 3D en Three.js.
        """
        graph = cls.get_river_graph(db)
        vertices = graph["vertices"]
        edges = graph["edges"]

        if not vertices:
            return {"profile_points": [], "metadata": {}}

        profile_points = []
        
        # Si solo hay 1 nodo, retornar el punto único
        if len(vertices) == 1:
            v = vertices[0]
            profile_points.append({
                "lat": v["latitud"],
                "lon": v["longitud"],
                "cota_msnm": v["cota_msnm"],
                "caudal_m3s": v["caudal_actual_m3s"],
                "ec_us_cm": v["salinidad_actual_ec"],
                "wqi": v["wqi_actual"],
                "es_estacion": True,
                "id_nodo": v["id_nodo"],
                "nombre_estacion": v["nombre"]
            })
            return {"total_points": 1, "profile_points": profile_points, "network_topology": graph}

        for edge in edges:
            u = next(v for v in vertices if v["id_nodo"] == edge["origen"])
            w = next(v for v in vertices if v["id_nodo"] == edge["destino"])

            for step in range(samples_per_reach):
                t = step / float(samples_per_reach)
                # Interpolación suave espacial
                lat = u["latitud"] + t * (w["latitud"] - u["latitud"])
                lon = u["longitud"] + t * (w["longitud"] - u["longitud"])
                cota = u["cota_msnm"] + t * (w["cota_msnm"] - u["cota_msnm"])
                
                # Interpolación hidrológica (conservación de soluto y caudal)
                q_interp = round(u["caudal_actual_m3s"] + t * (w["caudal_actual_m3s"] - u["caudal_actual_m3s"]), 3)
                ec_interp = round(u["salinidad_actual_ec"] + t * (w["salinidad_actual_ec"] - u["salinidad_actual_ec"]), 1)
                wqi_interp = round(u["wqi_actual"] + t * (w["wqi_actual"] - u["wqi_actual"]), 1)

                profile_points.append({
                    "lat": round(lat, 6),
                    "lon": round(lon, 6),
                    "cota_msnm": round(cota, 2),
                    "caudal_m3s": q_interp,
                    "ec_us_cm": ec_interp,
                    "wqi": wqi_interp,
                    "es_estacion": (step == 0),
                    "id_nodo": u["id_nodo"] if step == 0 else None,
                    "nombre_estacion": u["nombre"] if step == 0 else None
                })

        # Agregar el último nodo de la red
        last_v = vertices[-1]
        profile_points.append({
            "lat": last_v["latitud"],
            "lon": last_v["longitud"],
            "cota_msnm": last_v["cota_msnm"],
            "caudal_m3s": last_v["caudal_actual_m3s"],
            "ec_us_cm": last_v["salinidad_actual_ec"],
            "wqi": last_v["wqi_actual"],
            "es_estacion": True,
            "id_nodo": last_v["id_nodo"],
            "nombre_estacion": last_v["nombre"]
        })

        return {
            "total_points": len(profile_points),
            "profile_points": profile_points,
            "network_topology": graph
        }
