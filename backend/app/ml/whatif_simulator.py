import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.database.models import SimulacionWhatIf, MedicionProcesada
from backend.app.services.processor import TelemetryProcessor


class WhatIfSimulator:
    """
    Simulador de escenarios hidrológicos y de calidad del agua 'What-If' para la Cuenca Chancay-Huaral.
    Evalúa el impacto aguas abajo ante sequías severas, tormentas o vertimientos en cabecera.
    """

    @classmethod
    def run_simulation(
        cls,
        db: Session,
        titulo_escenario: str,
        delta_precipitacion_pct: float = 0.0,
        delta_salinidad_us_cm: float = 0.0,
        delta_caudal_cabecera_pct: float = 0.0,
        id_entidad: Optional[int] = None,
        ejecutado_por: Optional[str] = "Usuario Dashboard"
    ) -> Dict[str, Any]:
        """
        Ejecuta la simulación de impacto aguas abajo (Valle / Parcela Piloto).
        """
        # 1. Obtener línea base actual del valle (Nodo 3 Parcela Piloto)
        last_valle = db.query(MedicionProcesada).filter(
            MedicionProcesada.id_nodo == "NODO-03-PARCELA"
        ).order_by(MedicionProcesada.timestamp.desc()).first()

        base_caudal = last_valle.caudal_m3s if last_valle else 1.20
        base_ec = last_valle.ec_us_cm if last_valle else 650.0
        base_ph = last_valle.ph if last_valle else 7.30
        base_temp = last_valle.temp_agua_c if last_valle else 18.0
        base_turb = last_valle.turbidez_ntu if last_valle else 8.0

        # 2. Modelar impacto en Caudal aguas abajo
        # El caudal del valle depende de la descarga de cabecera y el aporte de escorrentía pluvial
        factor_caudal = 1.0 + (delta_caudal_cabecera_pct / 100.0) * 0.65 + (delta_precipitacion_pct / 100.0) * 0.35
        sim_caudal = max(0.02, round(base_caudal * factor_caudal, 4))

        # 3. Modelar impacto en Salinidad (EC) y TDS
        # La reducción de caudal aumenta la concentración de sales (menos dilución)
        factor_concentracion = base_caudal / (sim_caudal + 0.001)
        sim_ec = base_ec * (factor_concentracion ** 0.3) + delta_salinidad_us_cm
        sim_ec = max(100.0, round(sim_ec, 2))
        sim_tds = round(sim_ec * 0.5, 2)

        # 4. Modelar Turbidez (aumenta con exceso de precipitación por arrastre de sedimentos)
        factor_turb = max(0.5, 1.0 + (delta_precipitacion_pct / 100.0) * 0.8)
        sim_turb = max(1.0, round(base_turb * factor_turb, 2))

        # 5. Calcular WQI simulado
        wqi_sim, wqi_cat = TelemetryProcessor.calc_wqi(
            ph=base_ph,
            temp_c=base_temp,
            tds_ppm=sim_tds,
            ec_us_cm=sim_ec,
            turbidez_ntu=sim_turb
        )

        # 6. Generar resumen ejecutivo del impacto
        if sim_ec > 1500.0:
            riesgo_agr = "CRÍTICO: Alto riesgo de estrés osmótico y toxicidad en frutales."
        elif sim_ec > 1200.0:
            riesgo_agr = "MODERADO: Precaución en suelos con drenaje deficiente."
        else:
            riesgo_agr = "BAJO: Calidad hídrica adecuada para riego."

        resumen = (
            f"Escenario '{titulo_escenario}': Caudal en valle proyectado en {sim_caudal:.3f} m³/s "
            f"({sim_caudal*1000:.0f} l/s). Salinidad resultante: {sim_ec:.1f} µS/cm. "
            f"WQI: {wqi_sim:.1f} ({wqi_cat}). {riesgo_agr}"
        )

        # 7. Persistir en base de datos
        sim_record = SimulacionWhatIf(
            id_entidad=id_entidad,
            titulo_escenario=titulo_escenario,
            fecha_ejecucion=datetime.datetime.now(datetime.timezone.utc),
            delta_precipitacion_pct=delta_precipitacion_pct,
            delta_salinidad_us_cm=delta_salinidad_us_cm,
            delta_caudal_cabecera_pct=delta_caudal_cabecera_pct,
            resultado_wqi_valle=wqi_sim,
            resultado_caudal_valle_m3s=sim_caudal,
            resumen_impacto=resumen,
            ejecutado_por=ejecutado_por
        )
        db.add(sim_record)
        db.commit()
        db.refresh(sim_record)

        return {
            "id_simulacion": sim_record.id_simulacion,
            "titulo_escenario": titulo_escenario,
            "caudal_valle_proyectado_m3s": sim_caudal,
            "caudal_valle_proyectado_ls": round(sim_caudal * 1000.0, 1),
            "salinidad_proyectada_ec": sim_ec,
            "tds_proyectado_ppm": sim_tds,
            "turbidez_proyectada_ntu": sim_turb,
            "wqi_score_proyectado": wqi_sim,
            "wqi_categoria_proyectada": wqi_cat,
            "resumen_impacto": resumen
        }
