import pytest
from backend.app.services.processor import TelemetryProcessor


def test_calc_ph_neutral():
    # A 2.50V con offset 2.50V, el pH debe ser exactamente 7.00
    ph, estado = TelemetryProcessor.calc_ph(raw_v_ph=2.50, ph_offset_v=2.50, ph_slope=-0.18)
    assert ph == 7.00
    assert estado == "OPTIMO"


def test_calc_ph_acidic_and_alkaline():
    # Voltaje alto -> pH ácido
    ph_ac, est_ac = TelemetryProcessor.calc_ph(raw_v_ph=2.70, ph_offset_v=2.50, ph_slope=-0.18)
    assert ph_ac < 6.50
    assert est_ac == "ACIDO_PELIGROSO"

    # Voltaje bajo -> pH alcalino
    ph_alk, est_alk = TelemetryProcessor.calc_ph(raw_v_ph=2.10, ph_offset_v=2.50, ph_slope=-0.18)
    assert ph_alk > 8.50
    assert est_alk == "ALCALINO_PELIGROSO"


def test_tds_thermal_compensation():
    # A 25°C el factor térmico es 1.0 (sin cambio)
    tds_25, ec_25, est_25 = TelemetryProcessor.calc_tds_and_ec(raw_v_tds=1.0, temp_agua_c=25.0)
    
    # A 35°C el agua está más caliente (+10°C), por lo que el TDS compensado a 25°C debe ser menor que el no compensado
    tds_35, ec_35, est_35 = TelemetryProcessor.calc_tds_and_ec(raw_v_tds=1.0, temp_agua_c=35.0)
    
    assert tds_35 < tds_25
    # Conductividad EC = TDS / 0.5 = 2 * TDS
    assert round(ec_25, 1) == round(tds_25 / 0.5, 1)


def test_water_level_and_flow():
    # Soporte a 100 cm, sensor mide 40 cm -> Tirante = 60 cm (0.6 m)
    tirante, v_ms, area_m2, q_m3s, q_ls = TelemetryProcessor.calc_water_level_and_flow(
        raw_dist_cm=40.0,
        distancia_fondo_sensor_cm=100.0,
        caudal_coef_k=1.0,
        caudal_exp_n=1.5
    )
    assert tirante == 60.0
    # Q = 1.0 * (0.6)^1.5 ≈ 0.4648 m³/s ≈ 464.76 l/s
    assert q_m3s > 0.45 and q_m3s < 0.48
    assert q_ls > 450.0 and q_ls < 480.0


def test_hall_effect_molinete_velocity_and_flow():
    # V = a * (RPM / 60) + b
    # A 120 RPM (2 rps) -> V = 0.25 * 2 + 0.05 = 0.55 m/s
    v = TelemetryProcessor.calc_flow_velocity_hall(hall_rpm=120.0, constante_a=0.25, constante_b=0.05)
    assert round(v, 2) == 0.55

    # Flujo con RPM reales de campo: RPM=240 (4 rps) -> V = 0.25*4 + 0.05 = 1.05 m/s
    v_field = TelemetryProcessor.calc_flow_velocity_hall(hall_rpm=240.0, constante_a=0.25, constante_b=0.05)
    assert round(v_field, 2) == 1.05

    # Área de sección transversal rectangular: b=1.5m, h=0.8m -> A = 1.2 m²
    area = TelemetryProcessor.calc_cross_sectional_area(tirante_cm=80.0, tipo_seccion="RECTANGULAR", ancho_solera_m=1.5)
    assert round(area, 2) == 1.20


def test_pisciculture_cold_water_suitability():
    # Agua óptima para trucha: 14°C, Oxígeno 8.5 mg/L
    od, sat, aptitud = TelemetryProcessor.calc_pisciculture_suitability(temp_c=14.0, oxigeno_mgl=8.5)
    assert aptitud == "OPTIMO"
    assert sat > 80.0

    # Agua crítica (demasiado caliente > 20°C):
    _, _, aptitud_caliente = TelemetryProcessor.calc_pisciculture_suitability(temp_c=22.0, oxigeno_mgl=5.0)
    assert aptitud_caliente == "NO_APTO"


def test_wqi_calculation():
    # Agua de excelente calidad (pH 7.5, Temp 15°C, TDS 100 ppm, EC 200 uS/cm, Turb 1 NTU)
    wqi_exc, cat_exc = TelemetryProcessor.calc_wqi(
        ph=7.5,
        temp_c=15.0,
        tds_ppm=100.0,
        ec_us_cm=200.0,
        turbidez_ntu=1.0
    )
    assert wqi_exc <= 30.0
    assert cat_exc == "EXCELENTE"

    # Agua altamente degradada (pH 5.0, Temp 30°C, TDS 900 ppm, EC 1800 uS/cm, Turb 45 NTU)
    wqi_bad, cat_bad = TelemetryProcessor.calc_wqi(
        ph=5.0,
        temp_c=30.0,
        tds_ppm=900.0,
        ec_us_cm=1800.0,
        turbidez_ntu=45.0
    )
    assert wqi_bad > 60.0
    assert cat_bad in ["POBRE", "MALA", "MUY_MALA"]
