import React, { useState, useEffect } from 'react';
import { 
  Cpu, Play, Clock, ArrowRight, ShieldAlert, Sparkles, 
  Sliders, Waves, Droplets, Zap, ChevronRight, Activity, 
  Layers, AlertTriangle, CheckCircle2, RefreshCw, BarChart3, 
  FileText, ShieldCheck, TrendingDown, TrendingUp, History, 
  Scale, Compass, ArrowDownCircle, Info, Sprout, Leaf,
  DollarSign, PieChart, Landmark, ArrowUpRight, Check,
  BadgeAlert, Gauge, HelpCircle
} from 'lucide-react';
import { predictionsApi, nodesApi } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';

export default function WhatIfSimulatorView() {
  const [activeTab, setActiveTab] = useState('agro');
  const [nodes, setNodes] = useState([]);
  const [loadingNodes, setLoadingNodes] = useState(true);

  // -------------------------------------------------------------
  // ESTADOS DEL SIMULADOR MULTIVARIABLE (TAB 1)
  // -------------------------------------------------------------
  const [multiForm, setMultiForm] = useState({
    id_nodo_origen: '',
    titulo_escenario: 'Simulación de Estiaje y Salinidad en Valle',
    delta_caudal_pct: -35,
    delta_salinidad_us_cm: 650,
    delta_ph: -0.3,
    delta_precipitacion_pct: -20,
    cultivo_diana: 'PALTOS_AGUACATE',
    duracion_horas: 12
  });
  const [multiResult, setMultiResult] = useState(null);
  const [simulatingPhase, setSimulatingPhase] = useState(null);

  // -------------------------------------------------------------
  // ESTADOS DE INTELIGENCIA AGRO-HÍDRICA & MIDAGRI (TAB 2 - NUEVO)
  // -------------------------------------------------------------
  const [agroRegion, setAgroRegion] = useState('LIMA');
  const [agroCropsCatalog, setAgroCropsCatalog] = useState([]);
  const [agroBenchmarks, setAgroBenchmarks] = useState(null);
  const [loadingAgroData, setLoadingAgroData] = useState(false);

  const [agroForm, setAgroForm] = useState({
    titulo_escenario: 'Plan de Siembra Valle Chancay - Campaña 2026',
    available_flow_m3s: 1.25,
    ec_us_cm: 1850,
    ph: 7.3,
    wqi: 72,
    irrigation_type: 'gravity',
    water_tariff_s_m3: 0.045,
    simulated_duration_days: 365,
    crop_distribution_ha: {
      palto: 120,
      mandarina: 80,
      vid: 50,
      maiz_amarillo: 100,
      papa: 40,
      fresa: 20
    }
  });

  const [agroResult, setAgroResult] = useState(null);
  const [simulatingAgroPhase, setSimulatingAgroPhase] = useState(null);

  // -------------------------------------------------------------
  // ESTADOS DE CASCADA MULTITRAMO 3D (TAB 3)
  // -------------------------------------------------------------
  const [cascadeOrigin, setCascadeOrigin] = useState('');
  const [cascadeCaudal, setCascadeCaudal] = useState(2.2);
  const [cascadeSalinidad, setCascadeSalinidad] = useState(1650);
  const [cascadePh, setCascadePh] = useState(7.35);
  const [cascadeResult, setCascadeResult] = useState(null);
  const [loadingCascade, setLoadingCascade] = useState(false);
  const [isCascadeAnimating, setIsCascadeAnimating] = useState(false);

  // -------------------------------------------------------------
  // ESTADOS DE PRESCRIPCIÓN DE DILUCIÓN (TAB 4)
  // -------------------------------------------------------------
  const [dilutionForm, setDilutionForm] = useState({
    salinidad_actual_rio_ec: 2200,
    caudal_actual_rio_m3s: 1.8,
    salinidad_objetivo_ec: 1000,
    salinidad_agua_represa_ec: 150,
    duracion_lavado_horas: 8
  });
  const [dilutionResult, setDilutionResult] = useState(null);
  const [loadingDilution, setLoadingDilution] = useState(false);

  // -------------------------------------------------------------
  // ESTADOS DE AUDITORÍA DE LA MITA (TAB 5)
  // -------------------------------------------------------------
  const [mitaForm, setMitaForm] = useState({
    id_nodo_infractor: '',
    caudal_exceso_ls: 400,
    duracion_sobre_extraccion_horas: 6,
    caudal_nominal_valle_m3s: 1.5
  });
  const [mitaResult, setMitaResult] = useState(null);
  const [loadingMita, setLoadingMita] = useState(false);

  // -------------------------------------------------------------
  // HISTORIAL DE SIMULACIONES (TAB 6)
  // -------------------------------------------------------------
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Cargar nodos iniciales
  useEffect(() => {
    setLoadingNodes(true);
    nodesApi.getNodes()
      .then(res => {
        const data = res.data || [];
        setNodes(data);
        if (data.length > 0) {
          setMultiForm(prev => ({ ...prev, id_nodo_origen: data[0].id_nodo }));
          setCascadeOrigin(data[0].id_nodo);
          setMitaForm(prev => ({ ...prev, id_nodo_infractor: data[1]?.id_nodo || data[0].id_nodo }));
        }
      })
      .catch(err => console.error("Error cargando estaciones:", err))
      .finally(() => setLoadingNodes(false));
  }, []);

  // Cargar catálogo de cultivos y benchmarks MIDAGRI
  useEffect(() => {
    setLoadingAgroData(true);
    Promise.all([
      predictionsApi.getAgroCrops(),
      predictionsApi.getAgroRegionalBenchmarks(agroRegion)
    ])
      .then(([cropsRes, benchRes]) => {
        setAgroCropsCatalog(cropsRes.data || []);
        setAgroBenchmarks(benchRes.data || null);
      })
      .catch(err => console.error("Error cargando datos MIDAGRI:", err))
      .finally(() => setLoadingAgroData(false));
  }, [agroRegion]);

  const loadHistory = () => {
    setLoadingHistory(true);
    predictionsApi.getSimulationsHistory(25)
      .then(res => setHistory(res.data || []))
      .catch(err => console.error("Error cargando historial:", err))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // -------------------------------------------------------------
  // HANDLERS AGRO-HÍDRICO MIDAGRI
  // -------------------------------------------------------------
  const handleAgroCropHaChange = (cropId, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setAgroForm(prev => ({
      ...prev,
      crop_distribution_ha: {
        ...prev.crop_distribution_ha,
        [cropId]: num
      }
    }));
  };

  const applyAgroPreset = (presetType) => {
    if (presetType === 'chancay_tradicional') {
      setAgroForm(prev => ({
        ...prev,
        titulo_escenario: 'Valle Chancay-Huaral Tradicional',
        available_flow_m3s: 1.40,
        ec_us_cm: 1650,
        irrigation_type: 'gravity',
        crop_distribution_ha: {
          palto: 120,
          mandarina: 80,
          vid: 50,
          maiz_amarillo: 100,
          papa: 40,
          fresa: 20
        }
      }));
    } else if (presetType === 'agroexportacion') {
      setAgroForm(prev => ({
        ...prev,
        titulo_escenario: 'Agroexportación Intensiva de Alto Valor',
        available_flow_m3s: 1.80,
        ec_us_cm: 1350,
        irrigation_type: 'drip',
        crop_distribution_ha: {
          palto: 200,
          mandarina: 150,
          vid: 80,
          fresa: 60,
          esparrago: 40
        }
      }));
    } else if (presetType === 'sequia_resiliente') {
      setAgroForm(prev => ({
        ...prev,
        titulo_escenario: 'Plan de Contingencia ante Sequía & Salinización (IA)',
        available_flow_m3s: 0.65,
        ec_us_cm: 2900,
        irrigation_type: 'drip',
        crop_distribution_ha: {
          granado: 100,
          olivo: 80,
          quinua: 60,
          vid: 50,
          esparrago: 40
        }
      }));
    }
  };

  const handleRunAgroSimulation = async (e) => {
    if (e) e.preventDefault();
    setSimulatingAgroPhase("1/4: Ingestando estadísticas históricas SIEA (2017-2023) y microdatos ENA...");

    setTimeout(() => {
      setSimulatingAgroPhase("2/4: Calculando balance hídrico de cédula y curvas de salinidad Maas-Hoffman...");
    }, 450);

    setTimeout(() => {
      setSimulatingAgroPhase("3/4: Ejecutando modelo ML de riesgo agro-económico y pérdidas en Soles (S/.)...");
    }, 900);

    try {
      const res = await predictionsApi.simulateAgroWhatIf({
        titulo_escenario: agroForm.titulo_escenario,
        crop_distribution_ha: agroForm.crop_distribution_ha,
        available_flow_m3s: agroForm.available_flow_m3s,
        ec_us_cm: agroForm.ec_us_cm,
        ph: agroForm.ph,
        wqi: agroForm.wqi,
        irrigation_type: agroForm.irrigation_type,
        water_tariff_s_m3: agroForm.water_tariff_s_m3,
        region: agroRegion,
        simulated_duration_days: agroForm.simulated_duration_days
      });

      setTimeout(() => {
        setSimulatingAgroPhase("4/4: Optimizando recomendaciones de sustitución y tecnificación...");
        setTimeout(() => {
          setAgroResult(res.data);
          setSimulatingAgroPhase(null);
        }, 400);
      }, 1300);

    } catch (err) {
      setSimulatingAgroPhase(null);
      alert("Error ejecutando simulación agro-hídrica: " + (err.response?.data?.detail || err.message));
    }
  };

  // -------------------------------------------------------------
  // HANDLERS MULTIVARIABLE (TAB 1)
  // -------------------------------------------------------------
  const handleRunMultiSimulation = async (e) => {
    e.preventDefault();
    setSimulatingPhase("1/4: Ingestando línea base de sensores y topología...");
    
    setTimeout(() => {
      setSimulatingPhase("2/4: Calculando hidrodinámica Leopold-Maddock...");
    }, 450);

    setTimeout(() => {
      setSimulatingPhase("3/4: Evaluando modelo de salinidad Maas-Hoffman (FAO)...");
    }, 900);

    try {
      const res = await predictionsApi.simulateMultiVariable({
        ...multiForm,
        ejecutado_por: "Operador de Cuenca"
      });

      setTimeout(() => {
        setSimulatingPhase("4/4: Generando prescripción agronómica y WQI...");
        setTimeout(() => {
          setMultiResult(res.data);
          setSimulatingPhase(null);
        }, 400);
      }, 1300);

    } catch (err) {
      setSimulatingPhase(null);
      alert("Error ejecutando simulación multivariable: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleRunCascade = async (e) => {
    e.preventDefault();
    setLoadingCascade(true);
    setIsCascadeAnimating(true);
    try {
      const res = await predictionsApi.getCascadeLeadTime({
        id_nodo_origen: cascadeOrigin,
        caudal_transporte_m3s: cascadeCaudal,
        salinidad_origen_ec: cascadeSalinidad,
        ph_origen: cascadePh
      });
      setCascadeResult(res.data);
    } catch (err) {
      alert("Error calculando propagación en cascada: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingCascade(false);
      setTimeout(() => setIsCascadeAnimating(false), 2000);
    }
  };

  const handleRunDilution = async (e) => {
    e.preventDefault();
    setLoadingDilution(true);
    try {
      const res = await predictionsApi.prescribeDilution(dilutionForm);
      setDilutionResult(res.data);
    } catch (err) {
      alert("Error calculando prescripción de dilución: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingDilution(false);
    }
  };

  const handleRunMita = async (e) => {
    e.preventDefault();
    setLoadingMita(true);
    try {
      const res = await predictionsApi.auditMitaDeficit(mitaForm);
      setMitaResult(res.data);
    } catch (err) {
      alert("Error en auditoría forense de La Mita: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingMita(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE CABECERA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Agro-DSS & Motor What-If MIDAGRI
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              SIEA 2017-2023 & ENA 2024-2025
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Simulador de Escenarios What-If & Decisiones Agro-Hídricas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Modelación predictiva multivariable, balance hídrico de cédula de cultivo, pérdidas económicas en S/. y tiempo de tránsito hidráulico.
          </p>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('agro')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'agro'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            Inteligencia Agrícola MIDAGRI
          </button>

          <button
            onClick={() => setActiveTab('multivariable')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'multivariable'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Multivariable & Calidad
          </button>

          <button
            onClick={() => setActiveTab('cascade')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'cascade'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Lead Time Cascada
          </button>

          <button
            onClick={() => setActiveTab('dilution')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dilution'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            Dilución de Rescate
          </button>

          <button
            onClick={() => setActiveTab('mita')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'mita'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Auditoría La Mita
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial Forense
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* PESTAÑA AGRO-HÍDRICA & MIDAGRI (NUEVA) */}
      {/* ============================================================= */}
      {activeTab === 'agro' && (
        <div className="space-y-6">
          {/* BARRA DE CONTROL REGIONAL Y PRESETS */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Región Agrícola:</span>
                <select
                  value={agroRegion}
                  onChange={(e) => setAgroRegion(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="LIMA">LIMA (Valle Chancay-Huaral / Huaura)</option>
                  <option value="ICA">ICA (Valle de Ica / Pisco / Chincha)</option>
                  <option value="LA LIBERTAD">LA LIBERTAD (Chao / Virú / Moche)</option>
                  <option value="PIURA">PIURA (Chira / Piura)</option>
                  <option value="AREQUIPA">AREQUIPA (Majes / Camaná / Tambo)</option>
                  <option value="ANCASH">ÁNCASH (Santa / Casma / Nepeña)</option>
                  <option value="NACIONAL">PROMEDIO NACIONAL PERÚ</option>
                </select>
              </div>

              {agroBenchmarks && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3">
                  <span>Pérdida Histórica ENA: <strong className="text-amber-600 dark:text-amber-400">{agroBenchmarks.loss_profile?.drought_deficit_pct || 30}% sequía</strong></span>
                  <span>|</span>
                  <span>Riego Gravedad: <strong className="text-slate-700 dark:text-slate-300">{agroBenchmarks.irrigation_profile?.gravity_pct || 60}%</strong></span>
                </div>
              )}
            </div>

            {/* PRESETS RÁPIDOS */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Escenarios Típicos:</span>
              <button
                type="button"
                onClick={() => applyAgroPreset('chancay_tradicional')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                Chancay Tradicional
              </button>
              <button
                type="button"
                onClick={() => applyAgroPreset('agroexportacion')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
              >
                Agroexportación Intensiva
              </button>
              <button
                type="button"
                onClick={() => applyAgroPreset('sequia_resiliente')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
              >
                Contingencia Sequía (IA)
              </button>
            </div>
          </div>

          {/* GRID DE CONFIGURACIÓN: CÉDULA DE CULTIVOS + PARÁMETROS HIDRÁULICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMNA IZQUIERDA: CONFIGURADOR DE HECTÁREAS (7 COLS) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Cédula de Cultivo Planificada (Hectáreas)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Asigna la superficie a regar para evaluar la demanda volumétrica contra la oferta del río.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Hectáreas:</span>
                  <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                    {Object.values(agroForm.crop_distribution_ha).reduce((a, b) => a + b, 0)} ha
                  </div>
                </div>
              </div>

              {/* LISTADO DE CULTIVOS CON SLIDERS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
                {agroCropsCatalog.map(crop => {
                  const ha = agroForm.crop_distribution_ha[crop.crop_id] || 0;
                  const isResilient = crop.category?.includes('Resilientes');

                  return (
                    <div
                      key={crop.crop_id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        ha > 0
                          ? isResilient 
                            ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800'
                            : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[170px]" title={crop.name}>
                            {crop.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            Demanda: {crop.water_demand_m3_ha?.toLocaleString()} m³/ha | CE máx: {crop.ec_threshold_us_cm} µS/cm
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="2000"
                          step="5"
                          value={ha}
                          onChange={(e) => handleAgroCropHaChange(crop.crop_id, e.target.value)}
                          className="w-16 px-2 py-1 text-xs font-bold text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="300"
                          step="5"
                          value={ha}
                          onChange={(e) => handleAgroCropHaChange(crop.crop_id, e.target.value)}
                          className="w-full accent-emerald-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA DERECHA: PARÁMETROS HIDRÁULICOS & CALIDAD (5 COLS) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/80 rounded-xl text-blue-600 dark:text-blue-400">
                    <Waves className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Oferta Hídrica & Calidad del Agua
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Parámetros ambientales del río/canal para abastecer el valle.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* CAUDAL DISPONIBLE */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Caudal Disponible en Río/Toma:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{agroForm.available_flow_m3s} m³/s ({Math.round(agroForm.available_flow_m3s * 1000)} l/s)</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="8.0"
                      step="0.05"
                      value={agroForm.available_flow_m3s}
                      onChange={(e) => setAgroForm(prev => ({ ...prev, available_flow_m3s: parseFloat(e.target.value) }))}
                      className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Estiaje Severo (0.1 m³/s)</span>
                      <span>Avenida Plena (8.0 m³/s)</span>
                    </div>
                  </div>

                  {/* SALINIDAD / CONDUCTIVIDAD */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Salinidad del Agua (Conductividad EC):</span>
                      <span className={`font-bold ${agroForm.ec_us_cm > 2000 ? 'text-rose-600' : agroForm.ec_us_cm > 1500 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {agroForm.ec_us_cm} µS/cm ({(agroForm.ec_us_cm / 1000).toFixed(2)} dS/m)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="5000"
                      step="50"
                      value={agroForm.ec_us_cm}
                      onChange={(e) => setAgroForm(prev => ({ ...prev, ec_us_cm: parseFloat(e.target.value) }))}
                      className="w-full accent-amber-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Agua Pura Laguna (300 µS/cm)</span>
                      <span>Agua Muy Salina (5000 µS/cm)</span>
                    </div>
                  </div>

                  {/* TIPO DE RIEGO Y EFICIENCIA */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tecnología de Riego:</label>
                      <select
                        value={agroForm.irrigation_type}
                        onChange={(e) => setAgroForm(prev => ({ ...prev, irrigation_type: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                      >
                        <option value="gravity">Gravedad / Surcos (55% ef.)</option>
                        <option value="sprinkler">Aspersión (75% ef.)</option>
                        <option value="drip">Goteo Tecnificado (88% ef.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tarifa de Agua (S/./m³):</label>
                      <input
                        type="number"
                        min="0.01"
                        max="0.50"
                        step="0.005"
                        value={agroForm.water_tariff_s_m3}
                        onChange={(e) => setAgroForm(prev => ({ ...prev, water_tariff_s_m3: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÓN EJECUTAR SIMULACIÓN */}
              <div className="pt-3">
                <button
                  type="button"
                  disabled={simulatingAgroPhase !== null}
                  onClick={handleRunAgroSimulation}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {simulatingAgroPhase ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{simulatingAgroPhase}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Ejecutar Simulación Agro-Hídrica MIDAGRI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RESULTADOS DE LA SIMULACIÓN AGRO-HÍDRICA */}
          {agroResult && (
            <div className="space-y-6 animate-fade-in">
              {/* KPIS PRINCIPALES */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* BALANCE HÍDRICO */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Balance Hídrico Anual</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      agroResult.water_deficit_mmc === 0 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {agroResult.water_balance_status}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {agroResult.water_coverage_pct}%
                    </div>
                    <span className="text-xs text-slate-500">Cobertura de la demanda</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Demanda: <strong>{agroResult.gross_water_demand_mmc} MMC</strong></span>
                    <span>Oferta: <strong>{agroResult.water_availability_mmc} MMC</strong></span>
                  </div>
                </div>

                {/* PÉRDIDA ECONÓMICA PROYECTADA */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pérdida Económica Proyectada</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      -{agroResult.total_loss_pct}% Merma
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                      S/. {agroResult.total_economic_loss_s?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-slate-500">Por estrés salino y déficit de riego</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Potencial: <strong>S/. {Math.round(agroResult.total_potential_revenue_s / 1000)}k</strong></span>
                    <span>Proyectado: <strong>S/. {Math.round(agroResult.total_stressed_revenue_s / 1000)}k</strong></span>
                  </div>
                </div>

                {/* MARGEN NETO AGRÍCOLA */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Margen Neto Agrícola</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      S/. {agroResult.net_agricultural_margin_s?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-slate-500">Ingreso menos canon de agua</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>Costo Agua: <strong>S/. {Math.round(agroResult.total_water_cost_s).toLocaleString()}</strong></span>
                    <span>Cultivos en Riesgo: <strong>{agroResult.at_risk_crops_count}</strong></span>
                  </div>
                </div>

                {/* POTENCIAL DE TECNIFICACIÓN */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border border-blue-200 dark:border-indigo-900 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Potencial por Tecnificación</span>
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">
                      +{agroResult.tech_upgrade_potential?.water_saved_mmc} MMC
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">Ahorro migrando a Riego por Goteo</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-blue-200/60 dark:border-indigo-900 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Cobertura con Goteo: <strong>{agroResult.tech_upgrade_potential?.feasibility_boost_pct}%</strong></span>
                  </div>
                </div>
              </div>

              {/* ATRIBUCIÓN DE CAUSAS Y DESGLOSE POR CULTIVO */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ATRIBUCIÓN DE CAUSAS (4 COLS) */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Atribución de Causas de Merma
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Proporción de pérdidas atribuibles a salinidad vs estrés por déficit de volumen.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-amber-700 dark:text-amber-400">Estrés por Salinidad (EC):</span>
                        <span>{agroResult.loss_attribution?.salinity_share_pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${agroResult.loss_attribution?.salinity_share_pct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-rose-700 dark:text-rose-400">Déficit de Caudal / Sequía:</span>
                        <span>{agroResult.loss_attribution?.drought_deficit_share_pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${agroResult.loss_attribution?.drought_deficit_share_pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Diagnóstico Biofísico:</span>
                    {agroResult.loss_attribution?.salinity_share_pct > 60 ? (
                      <span>La salinidad elevada ({agroResult.loss_attribution?.ec_measured_us_cm} µS/cm) es el factor dominante de merma. Se recomienda priorizar cultivos tolerantes a sales o lavado de sales con descargas de cabecera.</span>
                    ) : agroResult.loss_attribution?.drought_deficit_share_pct > 60 ? (
                      <span>El déficit volumétrico de agua es la principal limitante. Se requiere tecnificación inmediata a riego presurizado o reducción de cédula de cultivo.</span>
                    ) : (
                      <span>Impacto mixto balanceado entre carga salina y disponibilidad de caudal.</span>
                    )}
                  </div>
                </div>

                {/* TABLA DETALLADA DE CÉDULA DE CULTIVOS (8 COLS) */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Desglose Agronómico & Recomendaciones IA por Cultivo
                      </h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Cultivo</th>
                          <th className="py-2.5 px-3 text-right">Área (ha)</th>
                          <th className="py-2.5 px-3 text-right">Demanda</th>
                          <th className="py-2.5 px-3 text-center">Score Aptitud</th>
                          <th className="py-2.5 px-3 text-right">Pérdida (S/.)</th>
                          <th className="py-2.5 px-3 text-right">Ingreso Proyectado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {agroResult.crops_summary.map(crop => (
                          <React.Fragment key={crop.crop_id}>
                            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{crop.crop_name}</div>
                                <span className="text-[10px] text-slate-500">{crop.category}</span>
                              </td>
                              <td className="py-3 px-3 text-right font-semibold">{crop.planned_ha} ha</td>
                              <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">{crop.water_demand_mmc} MMC</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  crop.status_color === 'green'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : crop.status_color === 'blue'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : crop.status_color === 'yellow'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {crop.suitability_score}% ({crop.status})
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                                -S/. {crop.economic_loss_s?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                                S/. {crop.stressed_revenue_s?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                            </tr>

                            {/* RECOMENDACIÓN DE SUSTITUTOS RESILIENTES */}
                            {crop.substitutes && crop.substitutes.length > 0 && (
                              <tr className="bg-purple-50/50 dark:bg-purple-950/20">
                                <td colSpan="6" className="py-2.5 px-3">
                                  <div className="flex items-center gap-2 text-[11px] text-purple-900 dark:text-purple-300">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                    <span className="font-bold">Recomendación IA Resiliente:</span>
                                    <span>Para mitigar pérdidas en {crop.crop_name}, considera sustituir hectáreas por: </span>
                                    <div className="flex flex-wrap gap-1.5 ml-1">
                                      {crop.substitutes.map(sub => (
                                        <span key={sub.crop_id} className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 font-semibold text-purple-900 dark:text-purple-200">
                                          {sub.crop_name} ({sub.suitability_score}% apto | Ahorro: {sub.water_saving_m3_ha} m³/ha)
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* PESTAÑA 1: SIMULADOR MULTIVARIABLE CLÁSICO */}
      {/* ============================================================= */}
      {activeTab === 'multivariable' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Parámetros de Simulación What-If
              </h2>
            </div>

            <form onSubmit={handleRunMultiSimulation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estación de Origen / Perturbación:
                </label>
                <select
                  value={multiForm.id_nodo_origen}
                  onChange={(e) => setMultiForm({ ...multiForm, id_nodo_origen: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {nodes.map(n => (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      {n.nombre} ({n.id_nodo}) - {n.cota_msnm} msnm
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título del Escenario:
                </label>
                <input
                  type="text"
                  value={multiForm.titulo_escenario}
                  onChange={(e) => setMultiForm({ ...multiForm, titulo_escenario: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* SLIDERS DE CONTROL */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Variación de Caudal (%):</span>
                  <span className="font-bold text-blue-600">{multiForm.delta_caudal_pct}%</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="300"
                  step="5"
                  value={multiForm.delta_caudal_pct}
                  onChange={(e) => setMultiForm({ ...multiForm, delta_caudal_pct: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Incremento de Salinidad (µS/cm):</span>
                  <span className="font-bold text-amber-600">+{multiForm.delta_salinidad_us_cm} µS/cm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  step="50"
                  value={multiForm.delta_salinidad_us_cm}
                  onChange={(e) => setMultiForm({ ...multiForm, delta_salinidad_us_cm: parseFloat(e.target.value) })}
                  className="w-full accent-amber-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Desviación de pH:</span>
                  <span className="font-bold text-purple-600">{multiForm.delta_ph > 0 ? `+${multiForm.delta_ph}` : multiForm.delta_ph}</span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.1"
                  value={multiForm.delta_ph}
                  onChange={(e) => setMultiForm({ ...multiForm, delta_ph: parseFloat(e.target.value) })}
                  className="w-full accent-purple-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cultivo Agrícola Diana:
                </label>
                <select
                  value={multiForm.cultivo_diana}
                  onChange={(e) => setMultiForm({ ...multiForm, cultivo_diana: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="PALTOS_AGUACATE">Paltos / Aguacate Hass (Muy Sensible a Sales)</option>
                  <option value="MANDARINOS_CITRICOS">Mandarinos y Cítricos W. Murcott (Alta Sensibilidad)</option>
                  <option value="UVA_VID">Uva de Mesa / Vid (Tolerancia Media)</option>
                  <option value="HORTALIZAS">Hortalizas / Fresa (Alta Sensibilidad)</option>
                  <option value="MAIZ_FORRAJE">Maíz Amarillo y Forrajes (Moderado)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={simulatingPhase !== null}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {simulatingPhase ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{simulatingPhase}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Ejecutar Simulación Multivariable</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RESULTADOS MULTIVARIABLE */}
          <div className="lg:col-span-7 space-y-4">
            {multiResult ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Resultado de Simulación #{multiResult.id_simulacion}</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{multiResult.titulo_escenario}</h3>
                  </div>
                  {multiResult.alerta_critica && (
                    <span className="px-3 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs font-bold rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      ALERTA CRÍTICA
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] text-slate-500 font-semibold block">Caudal Proyectado</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">{multiResult.caudal_proyectado_m3s} m³/s</span>
                    <span className="text-[10px] text-slate-400 block">{multiResult.caudal_proyectado_ls} l/s</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] text-slate-500 font-semibold block">Salinidad (EC)</span>
                    <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{multiResult.salinidad_proyectada_ec} µS/cm</span>
                    <span className="text-[10px] text-slate-400 block">Base: {multiResult.salinidad_base_ec}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] text-slate-500 font-semibold block">pH Proyectado</span>
                    <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">{multiResult.ph_proyectado}</span>
                    <span className="text-[10px] text-slate-400 block">Base: {multiResult.ph_base}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] text-slate-500 font-semibold block">Calidad WQI</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{multiResult.wqi_proyectado}</span>
                    <span className="text-[10px] text-slate-400 block">{multiResult.wqi_categoria}</span>
                  </div>
                </div>

                {/* TARJETA MAAS-HOFFMAN AGRONÓMICA */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800/70 dark:to-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Sprout className="w-4 h-4 text-amber-600" />
                      Impacto Agronómico Maas-Hoffman: {multiResult.impacto_cultivo?.nombre_legible}
                    </span>
                    <span className="text-xs font-extrabold text-rose-600">
                      -{multiResult.impacto_cultivo?.perdida_rendimiento_pct}% Pérdida
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {multiResult.impacto_cultivo?.diagnostico_agronomico}
                  </p>
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Acción Recomendada:</strong> {multiResult.impacto_cultivo?.accion_recomendada}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <Sliders className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Simulador Multivariable Listo</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">Configura las variaciones de caudal y salinidad a la izquierda y presiona Ejecutar para ver la respuesta biofísica.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* PESTAÑA 2: LEAD TIME & CASCADA 3D */}
      {/* ============================================================= */}
      {activeTab === 'cascade' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Simulador de Propagación en Cascada Multitramo (Topología Hidráulica 3D)
              </h2>
            </div>

            <form onSubmit={handleRunCascade} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estación Origen del Evento:
                </label>
                <select
                  value={cascadeOrigin}
                  onChange={(e) => setCascadeOrigin(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {nodes.map(n => (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      {n.nombre} ({n.id_nodo}) - {n.cota_msnm} msnm
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Caudal de Transporte (m³/s):
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="50"
                  step="0.1"
                  value={cascadeCaudal}
                  onChange={(e) => setCascadeCaudal(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Salinidad en Origen (µS/cm):
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="50"
                  value={cascadeSalinidad}
                  onChange={(e) => setCascadeSalinidad(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loadingCascade}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loadingCascade ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  <span>Calcular Timeline en Cascada</span>
                </button>
              </div>
            </form>
          </div>

          {cascadeResult && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Timeline de Tránsito desde {cascadeResult.nombre_origen} ({cascadeResult.cota_origen_msnm} msnm)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Caudal simulado: {cascadeResult.caudal_efectivo_m3s} m³/s | {cascadeResult.total_estaciones_aguas_abajo} estaciones receptoras aguas abajo
                  </p>
                </div>
              </div>

              {/* LÍNEA DE TIEMPO EN CASCADA CON ANIMACIÓN */}
              <div className="space-y-4">
                {cascadeResult.secuencia_nodos.map((hop, index) => (
                  <div
                    key={hop.id_nodo}
                    className={`p-4 rounded-xl border transition-all ${
                      isCascadeAnimating ? 'animate-pulse' : ''
                    } ${
                      hop.nivel_alerta === 'CRITICO'
                        ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                        : hop.nivel_alerta === 'ALERTA'
                        ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">
                          {hop.orden_secuencia}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{hop.nombre}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-semibold">
                              {hop.cota_msnm} msnm (Δ{hop.desnivel_acumulado_m}m)
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            Distancia: +{hop.distancia_tramo_km} km (Acumulado: {hop.distancia_acumulada_km} km) | Vel. Media: {hop.velocidad_media_kmh} km/h
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Llegada Frente</span>
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{hop.lead_time_frente_legible}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 block">Salinidad Llegada</span>
                          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">{hop.salinidad_estimada_llegada_ec} µS/cm</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 block">Compuertas</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{hop.estado_compuerta_recomendado}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/40 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{hop.indicacion_operativa}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* PESTAÑA 3: PRESCRIPCIÓN DE DILUCIÓN */}
      {/* ============================================================= */}
      {activeTab === 'dilution' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Prescriptor de Dilución de Rescate
              </h2>
            </div>

            <form onSubmit={handleRunDilution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Salinidad Actual en Río (µS/cm):
                </label>
                <input
                  type="number"
                  min="200"
                  max="8000"
                  value={dilutionForm.salinidad_actual_rio_ec}
                  onChange={(e) => setDilutionForm({ ...dilutionForm, salinidad_actual_rio_ec: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Caudal Actual del Río (m³/s):
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="30"
                  step="0.1"
                  value={dilutionForm.caudal_actual_rio_m3s}
                  onChange={(e) => setDilutionForm({ ...dilutionForm, caudal_actual_rio_m3s: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Salinidad Objetivo / Segura (µS/cm):
                </label>
                <input
                  type="number"
                  min="200"
                  max="2500"
                  value={dilutionForm.salinidad_objetivo_ec}
                  onChange={(e) => setDilutionForm({ ...dilutionForm, salinidad_objetivo_ec: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ventana de Lavado (Horas):
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={dilutionForm.duracion_lavado_horas}
                  onChange={(e) => setDilutionForm({ ...dilutionForm, duracion_lavado_horas: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loadingDilution}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loadingDilution ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                <span>Calcular Descarga de Dilución</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7">
            {dilutionResult ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Prescripción Hidráulica de Desembalse
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Descarga Requerida</span>
                    <span className="text-lg font-extrabold text-blue-600">{dilutionResult.caudal_descarga_requerido_m3s} m³/s</span>
                    <span className="text-[10px] text-slate-400">{dilutionResult.caudal_descarga_requerido_ls} l/s</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Volumen Total</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">{dilutionResult.volumen_total_desembalse_mmc} MMC</span>
                    <span className="text-[10px] text-slate-400">{dilutionResult.volumen_total_desembalse_m3?.toLocaleString()} m³</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Caudal Total Río</span>
                    <span className="text-lg font-extrabold text-emerald-600">{dilutionResult.caudal_total_resultante_m3s} m³/s</span>
                    <span className="text-[10px] text-slate-400">Río + Descarga</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-bold block mb-1">Prescripción Oficial:</span>
                  {dilutionResult.prescripcion_tecnica}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <Droplets className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Prescriptor de Dilución</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">Calcula el volumen exacto a liberar desde lagunas o represas para lavar plumas de salinidad.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* PESTAÑA 4: AUDITORÍA DE LA MITA */}
      {/* ============================================================= */}
      {activeTab === 'mita' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Auditoría Forense de La Mita
              </h2>
            </div>

            <form onSubmit={handleRunMita} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bocatoma / Nodo Infractor:
                </label>
                <select
                  value={mitaForm.id_nodo_infractor}
                  onChange={(e) => setMitaForm({ ...mitaForm, id_nodo_infractor: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {nodes.map(n => (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      {n.nombre} ({n.id_nodo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Caudal en Exceso Sobre Asignación (l/s):
                </label>
                <input
                  type="number"
                  min="10"
                  max="3000"
                  step="10"
                  value={mitaForm.caudal_exceso_ls}
                  onChange={(e) => setMitaForm({ ...mitaForm, caudal_exceso_ls: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duración de Sobre-Extracción (Horas):
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="48"
                  step="0.5"
                  value={mitaForm.duracion_sobre_extraccion_horas}
                  onChange={(e) => setMitaForm({ ...mitaForm, duracion_sobre_extraccion_horas: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loadingMita}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loadingMita ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                <span>Generar Dictamen Forense de Turnos</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7">
            {mitaResult ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Balance Forense de Afectación de Turnos
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Volumen Sustraído</span>
                    <span className="text-lg font-extrabold text-rose-600">{mitaResult.volumen_total_sustraido_m3?.toLocaleString()} m³</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Retraso en Turno</span>
                    <span className="text-lg font-extrabold text-amber-600">+{mitaResult.retraso_turno_valle_horas} horas</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Hectáreas Afectadas</span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">~{mitaResult.deficit_hectareas_afectadas} ha</span>
                  </div>
                </div>

                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-bold block mb-1">Dictamen Forense:</span>
                  {mitaResult.dictamen_auditoria}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <Scale className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Auditoría de Turnos de Riego</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">Cuantifica el impacto de sobre-extracciones no autorizadas en el retraso del turno de comisiones aguas abajo.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* PESTAÑA 5: HISTORIAL FORENSE */}
      {/* ============================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Historial Forense de Simulaciones
              </h2>
            </div>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Título Escenario</th>
                  <th className="py-2.5 px-3">Fecha Ejecución</th>
                  <th className="py-2.5 px-3">Caudal Proyectado</th>
                  <th className="py-2.5 px-3">WQI Valle</th>
                  <th className="py-2.5 px-3">Ejecutado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map(sim => (
                  <tr key={sim.id_simulacion} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">#{sim.id_simulacion}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{sim.titulo_escenario}</td>
                    <td className="py-2.5 px-3 text-slate-500">{formatDateTime(sim.fecha_ejecucion)}</td>
                    <td className="py-2.5 px-3 font-bold">{sim.resultado_caudal_valle_m3s} m³/s</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{sim.resultado_wqi_valle}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{sim.ejecutado_por}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
