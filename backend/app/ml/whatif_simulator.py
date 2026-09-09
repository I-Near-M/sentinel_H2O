import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from backend.app.database.models import SimulacionWhatIf, MedicionProcesada, Nodo
from backend.app.services.processor import TelemetryProcessor


class WhatIfSimulator:
    """
    Simulador de escenarios hidrológicos, de calidad del agua y agronomía de precisión 'What-If'.
    Soporta simulación multivariable simultánea, modelo de salinidad Maas-Hoffman por cultivo,
    prescripción de dilución hidráulica para lavado de cauce y auditoría de desvíos de La Mita.
    """

    CROP_THRESHOLDS = {
        "PALTOS_AGUACATE": {
            "nombre": "Paltos (Aguacate Hass / Fuerte)",
            "a_threshold_ds_m": 1.3,
            "b_slope_pct": 21.0,
            "umbral_ec_us_cm": 1300.0,
            "sensibilidad": "Muy Alta",
            "alerta_cierre": "Cerrar compuertas de inmediato si la salinidad supera 1,200 µS/cm para evitar necrosis foliar."
        },
        "MANDARINOS_CITRICOS": {
            "nombre": "Mandarinos y Cítricos (W. Murcott / Tango)",
            "a_threshold_ds_m": 1.7,
            "b_slope_pct": 16.0,
            "umbral_ec_us_cm": 1700.0,
            "sensibilidad": "Alta",
            "alerta_cierre": "Suspender riego si EC supera 1,500 µS/cm. Monitorear acumulación de cloruros."
        },
        "UVA_VID": {
            "nombre": "Uva de Mesa / Vid (Red Globe / Sweet Globe)",
            "a_threshold_ds_m": 2.5,
            "b_slope_pct": 9.6,
            "umbral_ec_us_cm": 2500.0,
            "sensibilidad": "Moderada",
            "alerta_cierre": "Aplicar riego de sobrelavado si la conductividad supera los 2,000 µS/cm."
        },
        "HORTALIZAS": {
            "nombre": "Hortalizas de Hoja y Fruto (Fresa / Lechuga / Tomate)",
            "a_threshold_ds_m": 1.5,
            "b_slope_pct": 14.0,
            "umbral_ec_us_cm": 1500.0,
            "sensibilidad": "Alta",
            "alerta_cierre": "Interrumpir captación en tomas de hortalizas si la salinidad excede 1,300 µS/cm."
        },
        "MAIZ_FORRAJE": {
            "nombre": "Maíz Amarillo Duro y Forrajes",
            "a_threshold_ds_m": 2.7,
            "b_slope_pct": 7.0,
            "umbral_ec_us_cm": 2700.0,
            "sensibilidad": "Tolerancia Media",
            "alerta_cierre": "Riego admisible hasta 2,500 µS/cm. Reducir frecuencia si el drenaje es lento."
        }
    }

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
        Compatibilidad retroactiva: ejecuta la simulación clásica what-if.
        """
        res_multi = cls.run_multivariable_simulation(
            db=db,
            id_nodo_origen="NODO-01-CABECERA",
            titulo_escenario=titulo_escenario,
            delta_caudal_pct=delta_caudal_cabecera_pct,
            delta_salinidad_us_cm=delta_salinidad_us_cm,
            delta_ph=0.0,
            delta_precipitacion_pct=delta_precipitacion_pct,
            cultivo_diana="PALTOS_AGUACATE",
            duracion_horas=12,
            ejecutado_por=ejecutado_por
        )

        return {
            "id_simulacion": res_multi["id_simulacion"],
            "titulo_escenario": res_multi["titulo_escenario"],
            "caudal_valle_proyectado_m3s": res_multi["caudal_proyectado_m3s"],
            "caudal_valle_proyectado_ls": res_multi["caudal_proyectado_ls"],
            "salinidad_proyectada_ec": res_multi["salinidad_proyectada_ec"],
            "tds_proyectado_ppm": res_multi["tds_proyectado_ppm"],
            "turbidez_proyectada_ntu": res_multi["turbidez_proyectada_ntu"],
            "wqi_score_proyectado": res_multi["wqi_proyectado"],
            "wqi_categoria_proyectada": res_multi["wqi_categoria"],
            "resumen_impacto": res_multi["resumen_ejecutivo"]
        }

    @classmethod
    def run_multivariable_simulation(
        cls,
        db: Session,
        id_nodo_origen: str = "NODO-01-CABECERA",
        titulo_escenario: str = "Escenario Multivariable",
        delta_caudal_pct: float = 0.0,
        delta_salinidad_us_cm: float = 0.0,
        delta_ph: float = 0.0,
        delta_precipitacion_pct: float = 0.0,
        cultivo_diana: str = "PALTOS_AGUACATE",
        duracion_horas: int = 12,
        ejecutado_por: Optional[str] = "Operador Sentinel"
    ) -> Dict[str, Any]:
        """
        Ejecuta la simulación multivariable simultánea de impacto hidrodinámico,
        calidad del agua WQI y modelo Maas-Hoffman por cultivo.
        """
        # 1. Obtener línea base del nodo origen (o último registro en BD)
        last_proc = db.query(MedicionProcesada).filter(
            MedicionProcesada.id_nodo == id_nodo_origen
        ).order_by(MedicionProcesada.timestamp.desc()).first()

        if not last_proc:
            last_proc = db.query(MedicionProcesada).order_by(MedicionProcesada.timestamp.desc()).first()

        base_caudal = last_proc.caudal_m3s if last_proc else 1.20
        base_ec = last_proc.ec_us_cm if last_proc else 650.0
        base_ph = last_proc.ph if last_proc else 7.35
        base_temp = last_proc.temp_agua_c if last_proc else 18.5
        base_turb = last_proc.turbidez_ntu if last_proc else 8.5

        # 2. Modelado de Caudal resultante (Aporte de cabecera + Escorrentía pluvial)
        factor_caudal = 1.0 + (delta_caudal_pct / 100.0) * 0.70 + (delta_precipitacion_pct / 100.0) * 0.30
        sim_caudal = max(0.02, round(base_caudal * factor_caudal, 4))

        # 3. Modelado de Salinidad (Ley de Concentración por Dilución)
        factor_dilucion = base_caudal / (sim_caudal + 0.001)
        sim_ec = base_ec * (factor_dilucion ** 0.28) + delta_salinidad_us_cm
        sim_ec = max(80.0, round(sim_ec, 2))
        sim_tds = round(sim_ec * 0.5, 2)

        # 4. Modelado de pH
        sim_ph = round(min(11.5, max(3.0, base_ph + delta_ph)), 2)

        # 5. Modelado de Turbidez
        factor_turb = max(0.5, 1.0 + (delta_precipitacion_pct / 100.0) * 0.85)
        sim_turb = max(1.0, round(base_turb * factor_turb, 2))

        # 6. Cálculo del Water Quality Index (WQI)
        wqi_base, _ = TelemetryProcessor.calc_wqi(
            ph=base_ph, temp_c=base_temp, tds_ppm=round(base_ec * 0.5, 1), ec_us_cm=base_ec, turbidez_ntu=base_turb
        )
        wqi_sim, wqi_cat = TelemetryProcessor.calc_wqi(
            ph=sim_ph, temp_c=base_temp, tds_ppm=sim_tds, ec_us_cm=sim_ec, turbidez_ntu=sim_turb
        )

        # 7. Modelo Maas-Hoffman de Pérdida Agronómica
        crop_info = cls.CROP_THRESHOLDS.get(cultivo_diana, cls.CROP_THRESHOLDS["PALTOS_AGUACATE"])
        ec_w_ds_m = sim_ec / 1000.0  # Salinidad del agua en dS/m
        ec_e_ds_m = round(ec_w_ds_m * 1.5, 2)  # Extracto de saturación del suelo

        a_thresh = crop_info["a_threshold_ds_m"]
        b_slope = crop_info["b_slope_pct"]

        if ec_e_ds_m > a_thresh:
            perdida_pct = round(min(100.0, b_slope * (ec_e_ds_m - a_thresh)), 1)
        else:
            perdida_pct = 0.0

        if perdida_pct >= 25.0 or sim_ec >= crop_info["umbral_ec_us_cm"]:
            estres = "CRÍTICO (Severo)"
            alerta_critica = True
            accion = crop_info["alerta_cierre"]
            diag = (
                f"Estrés osmótico agudo en {crop_info['nombre']}. Salinidad en suelo proyectada: {ec_e_ds_m} dS/m "
                f"(Umbral: {a_thresh} dS/m). Pérdida estimada de cosecha: {perdida_pct}%."
            )
        elif perdida_pct > 5.0 or sim_ec >= (crop_info["umbral_ec_us_cm"] * 0.85):
            estres = "MODERADO (Precaución)"
            alerta_critica = False
            accion = "Monitorear compuertas y programar riego complementario de lavado de sales."
            diag = (
                f"Pérdida potencial de {perdida_pct}% en {crop_info['nombre']}. "
                f"La conductividad se encuentra cercana al umbral límite."
            )
        else:
            estres = "CONTROLADO (Óptimo)"
            alerta_critica = False
            accion = "Operación normal. Calidad hídrica y caudal aptos para riego tecnificado."
            diag = f"Condición óptima para {crop_info['nombre']}. Sin pérdidas de rendimiento estimadas (0%)."

        resumen = (
            f"Escenario '{titulo_escenario}': Caudal proyectado en {sim_caudal:.3f} m³/s ({sim_caudal*1000:.0f} l/s). "
            f"Salinidad: {sim_ec:.1f} µS/cm | pH: {sim_ph:.2f} | WQI: {wqi_sim:.1f} ({wqi_cat}). "
            f"Cultivo {crop_info['nombre']}: Pérdida proyectada de {perdida_pct}% ({estres})."
        )

        # 8. Persistir en base de datos
        sim_record = SimulacionWhatIf(
            titulo_escenario=titulo_escenario,
            fecha_ejecucion=datetime.datetime.now(datetime.timezone.utc),
            delta_precipitacion_pct=delta_precipitacion_pct,
            delta_salinidad_us_cm=delta_salinidad_us_cm,
            delta_caudal_cabecera_pct=delta_caudal_pct,
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
            "id_nodo_origen": id_nodo_origen,
            "caudal_base_m3s": round(base_caudal, 3),
            "caudal_proyectado_m3s": sim_caudal,
            "caudal_proyectado_ls": round(sim_caudal * 1000.0, 1),
            "salinidad_base_ec": round(base_ec, 1),
            "salinidad_proyectada_ec": sim_ec,
            "tds_proyectado_ppm": sim_tds,
            "ph_base": round(base_ph, 2),
            "ph_proyectado": sim_ph,
            "turbidez_proyectada_ntu": sim_turb,
            "wqi_base": round(wqi_base, 1),
            "wqi_proyectado": wqi_sim,
            "wqi_categoria": wqi_cat,
            "impacto_cultivo": {
                "cultivo": cultivo_diana,
                "nombre_legible": crop_info["nombre"],
                "umbral_salinidad_ec_us_cm": crop_info["umbral_ec_us_cm"],
                "salinidad_efectiva_suelo_ec_e": ec_e_ds_m,
                "perdida_rendimiento_pct": perdida_pct,
                "nivel_estres_osmotico": estres,
                "diagnostico_agronomico": diag,
                "accion_recomendada": accion
            },
            "resumen_ejecutivo": resumen,
            "alerta_critica": alerta_critica
        }

    @classmethod
    def calculate_dilution_prescription(
        cls,
        salinidad_actual_rio_ec: float,
        caudal_actual_rio_m3s: float,
        salinidad_objetivo_ec: float = 1000.0,
        salinidad_agua_represa_ec: float = 150.0,
        duracion_lavado_horas: int = 8
    ) -> Dict[str, Any]:
        """
        Calcula el caudal y volumen de descarga de rescate requerido desde una represa o laguna
        para diluir una pluma salina en el río hasta un nivel seguro antes de las bocatomas.
        """
        # Si la salinidad actual ya está por debajo o igual al objetivo, no se requiere descarga
        if salinidad_actual_rio_ec <= salinidad_objetivo_ec:
            return {
                "caudal_rio_actual_m3s": caudal_actual_rio_m3s,
                "salinidad_actual_rio_ec": salinidad_actual_rio_ec,
                "salinidad_objetivo_ec": salinidad_objetivo_ec,
                "caudal_descarga_requerido_m3s": 0.0,
                "caudal_descarga_requerido_ls": 0.0,
                "caudal_total_resultante_m3s": caudal_actual_rio_m3s,
                "volumen_total_desembalse_m3": 0.0,
                "volumen_total_desembalse_mmc": 0.0,
                "duracion_lavado_horas": duracion_lavado_horas,
                "factibilidad_operativa": "NO_REQUERIDA",
                "prescripcion_tecnica": (
                    f"La salinidad actual ({salinidad_actual_rio_ec:.1f} µS/cm) ya se encuentra dentro del rango seguro "
                    f"(<= {salinidad_objetivo_ec:.1f} µS/cm). No se requiere desembalse de dilución."
                )
            }

        # Balance de Masa: Q_rio * C_rio + Q_descarga * C_represa = (Q_rio + Q_descarga) * C_objetivo
        denominador = salinidad_objetivo_ec - salinidad_agua_represa_ec
        if denominador <= 0:
            denominador = 1.0

        q_descarga = caudal_actual_rio_m3s * ((salinidad_actual_rio_ec - salinidad_objetivo_ec) / denominador)
        q_descarga = round(max(0.0, q_descarga), 3)
        q_descarga_ls = round(q_descarga * 1000.0, 1)

        q_total = round(caudal_actual_rio_m3s + q_descarga, 3)
        vol_total_m3 = round(q_descarga * duracion_lavado_horas * 3600.0, 1)
        vol_total_mmc = round(vol_total_m3 / 1_000_000.0, 4)

        if q_descarga > 15.0:
            factibilidad = "RIESGO_HIDRÁULICO_ALTO"
            prescripcion = (
                f"El caudal de descarga requerido ({q_descarga:.2f} m³/s / {q_descarga_ls:.0f} l/s) es muy elevado y podría "
                f"generar desbordes. Se recomienda combinar descarga moderada ({min(10.0, q_descarga):.1f} m³/s) con "
                f"el cierre temporal de bocatomas agrícolas durante {duracion_lavado_horas} horas."
            )
        else:
            factibilidad = "FACTIBLE_Y_RECOMENDADO"
            prescripcion = (
                f"Se prescribe una descarga de rescate de {q_descarga:.3f} m³/s ({q_descarga_ls:.0f} l/s) desde la represa "
                f"durante una ventana de {duracion_lavado_horas} horas. Volumen total a desembalsar: {vol_total_m3:,.0f} m³ "
                f"({vol_total_mmc:.4f} MMC). Esto reducirá la salinidad a {salinidad_objetivo_ec:.0f} µS/cm."
            )

        return {
            "caudal_rio_actual_m3s": caudal_actual_rio_m3s,
            "salinidad_actual_rio_ec": salinidad_actual_rio_ec,
            "salinidad_objetivo_ec": salinidad_objetivo_ec,
            "caudal_descarga_requerido_m3s": q_descarga,
            "caudal_descarga_requerido_ls": q_descarga_ls,
            "caudal_total_resultante_m3s": q_total,
            "volumen_total_desembalse_m3": vol_total_m3,
            "volumen_total_desembalse_mmc": vol_total_mmc,
            "duracion_lavado_horas": duracion_lavado_horas,
            "factibilidad_operativa": factibilidad,
            "prescripcion_tecnica": prescripcion
        }

    @classmethod
    def calculate_mita_audit(
        cls,
        id_nodo_infractor: str,
        caudal_exceso_ls: float,
        duracion_sobre_extraccion_horas: float,
        caudal_nominal_valle_m3s: float = 1.5
    ) -> Dict[str, Any]:
        """
        Audita el balance volumétrico y calcula el déficit acumulado y retraso en turnos de riego
        provocado por sobre-extracciones no autorizadas en bocatomas superiores.
        """
        q_exceso_m3s = caudal_exceso_ls / 1000.0
        vol_total_sustraido_m3 = round(q_exceso_m3s * duracion_sobre_extraccion_horas * 3600.0, 1)

        # Tiempo de retraso que sufrirá la red para recuperar el volumen perdido
        q_nominal_efectivo = max(0.1, caudal_nominal_valle_m3s)
        retraso_horas = round(vol_total_sustraido_m3 / (q_nominal_efectivo * 3600.0), 2)

        # Estimación de hectáreas afectadas (promedio 60 m³/ha por turno de riego tecnificado/gravedad)
        ha_afectadas = round(vol_total_sustraido_m3 / 60.0, 1)

        pct_caudal_afectado = (q_exceso_m3s / q_nominal_efectivo) * 100.0
        if pct_caudal_afectado > 30.0:
            impacto = "SEVERO (Pérdida crítica de caudal ecológico y desabastecimiento de tomas bajas)"
        elif pct_caudal_afectado > 10.0:
            impacto = "MODERADO (Retraso en turnos de La Mita y desbalance de presión en compuertas)"
        else:
            impacto = "LEVE (Desviación menor pero registrable en auditoría forense)"

        dictamen = (
            f"Auditoría Forense en {id_nodo_infractor}: La sobre-extracción no autorizada de {caudal_exceso_ls:.0f} l/s "
            f"durante {duracion_sobre_extraccion_horas:.1f} horas representó una sustracción acumulada de "
            f"{vol_total_sustraido_m3:,.0f} m³. Esto genera un retraso de {retraso_horas:.2f} horas en la entrega "
            f"del turno de riego a las comisiones aguas abajo y perjudica el riego de ~{ha_afectadas:.0f} hectáreas."
        )

        return {
            "id_nodo_infractor": id_nodo_infractor,
            "caudal_exceso_ls": caudal_exceso_ls,
            "caudal_exceso_m3s": round(q_exceso_m3s, 4),
            "duracion_horas": duracion_sobre_extraccion_horas,
            "volumen_total_sustraido_m3": vol_total_sustraido_m3,
            "retraso_turno_valle_horas": retraso_horas,
            "deficit_hectareas_afectadas": ha_afectadas,
            "impacto_caudal_ecologico": impacto,
            "dictamen_auditoria": dictamen
        }

    @classmethod
    def get_simulations_history(cls, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retorna el historial de simulaciones ejecutadas en el sistema.
        """
        records = db.query(SimulacionWhatIf).order_by(SimulacionWhatIf.fecha_ejecucion.desc()).limit(limit).all()
        return [
            {
                "id_simulacion": r.id_simulacion,
                "titulo_escenario": r.titulo_escenario,
                "fecha_ejecucion": r.fecha_ejecucion.isoformat() if r.fecha_ejecucion else None,
                "delta_precipitacion_pct": r.delta_precipitacion_pct,
                "delta_salinidad_us_cm": r.delta_salinidad_us_cm,
                "delta_caudal_cabecera_pct": r.delta_caudal_cabecera_pct,
                "resultado_wqi_valle": r.resultado_wqi_valle,
                "resultado_caudal_valle_m3s": r.resultado_caudal_valle_m3s,
                "resumen_impacto": r.resumen_impacto,
                "ejecutado_por": r.ejecutado_por
            }
            for r in records
        ]

