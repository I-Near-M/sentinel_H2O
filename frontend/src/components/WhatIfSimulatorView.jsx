import React, { useState, useEffect } from 'react';
import { 
  Cpu, Play, Clock, ArrowRight, ShieldAlert, Sparkles, 
  Sliders, Waves, Droplets, Zap, ChevronRight, Activity, 
  Layers, AlertTriangle, CheckCircle2, RefreshCw, BarChart3, 
  FileText, ShieldCheck, TrendingDown, TrendingUp, History, 
  Scale, Compass, ArrowDownCircle, Info
} from 'lucide-react';
import { predictionsApi, nodesApi } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';

export default function WhatIfSimulatorView() {
  const [activeTab, setActiveTab] = useState('multivariable');
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
  // ESTADOS DE CASCADA MULTITRAMO 3D (TAB 2)
  // -------------------------------------------------------------
  const [cascadeOrigin, setCascadeOrigin] = useState('');
  const [cascadeCaudal, setCascadeCaudal] = useState(2.2);
  const [cascadeSalinidad, setCascadeSalinidad] = useState(1650);
  const [cascadePh, setCascadePh] = useState(7.35);
  const [cascadeResult, setCascadeResult] = useState(null);
  const [loadingCascade, setLoadingCascade] = useState(false);
  const [isCascadeAnimating, setIsCascadeAnimating] = useState(false);

  // -------------------------------------------------------------
  // ESTADOS DE PRESCRIPCIÓN DE DILUCIÓN (TAB 3)
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
  // ESTADOS DE AUDITORÍA DE LA MITA (TAB 4)
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
  // HISTORIAL DE SIMULACIONES (TAB 5)
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
  // HANDLERS DE EJECUCIÓN CON ANIMACIÓN DE FASES
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
      alert("Error calculando cascada 3D: " + (err.response?.data?.detail || err.message));
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
      alert("Error calculando dilución hidráulica: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingDilution(false);
    }
  };

  const handleRunMitaAudit = async (e) => {
    e.preventDefault();
    setLoadingMita(true);
    try {
      const res = await predictionsApi.auditMitaDeficit(mitaForm);
      setMitaResult(res.data);
    } catch (err) {
      alert("Error en auditoría de La Mita: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingMita(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Encabezado Principal */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-500" />
            <span>Gemelo Digital · Módulo Predictivo y Prescriptivo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Motor de Simulación What-If & Hidráulica Fluvial
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
            Simula perturbaciones hidrodinámicas simultáneas, proyecta la cascada 3D de tiempos de viaje (Lead Time) por cotas, calcula descargas de rescate por dilución y audita balances de La Mita.
          </p>
        </div>
      </div>

      {/* Barra de Pestañas / Módulos de Simulación */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-cyan-900/60 pb-2">
        <button
          onClick={() => setActiveTab('multivariable')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'multivariable'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'bg-slate-100 dark:bg-[#061821] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-cyan-950/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>1. Simulación Multivariable & Agronomía</span>
        </button>

        <button
          onClick={() => setActiveTab('cascade')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'cascade'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'bg-slate-100 dark:bg-[#061821] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-cyan-950/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Cascada 3D & Timeline de Nodos</span>
        </button>

        <button
          onClick={() => setActiveTab('dilution')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'dilution'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'bg-slate-100 dark:bg-[#061821] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-cyan-950/60'
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>3. Prescripción de Dilución (Lavado)</span>
        </button>

        <button
          onClick={() => setActiveTab('mita')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'mita'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'bg-slate-100 dark:bg-[#061821] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-cyan-950/60'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>4. Auditoría de Desvíos de La Mita</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'bg-slate-100 dark:bg-[#061821] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-cyan-950/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>5. Historial Forense</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: SIMULACIÓN MULTIVARIABLE Y MATRIZ AGRONÓMICA                   */}
      {/* ========================================================================= */}
      {activeTab === 'multivariable' && (
        <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Columna Izquierda: Panel de Controles Sliders */}
          <div className="lg:col-span-6 space-y-6">
            <div className="spatial-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Parámetros Multivariables en Paralelo
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Modelo Maas-Hoffman
                </span>
              </div>

              <form onSubmit={handleRunMultiSimulation} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Estación Origen</label>
                    <select
                      value={multiForm.id_nodo_origen}
                      onChange={(e) => setMultiForm({ ...multiForm, id_nodo_origen: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    >
                      {nodes.map(n => (
                        <option key={n.id_nodo} value={n.id_nodo}>{n.id_nodo} - {n.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cultivo Diana a Proteger</label>
                    <select
                      value={multiForm.cultivo_diana}
                      onChange={(e) => setMultiForm({ ...multiForm, cultivo_diana: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400"
                    >
                      <option value="PALTOS_AGUACATE">🥑 Paltos (Aguacate Hass / Fuerte)</option>
                      <option value="MANDARINOS_CITRICOS">🍊 Mandarinos y Cítricos (W. Murcott)</option>
                      <option value="UVA_VID">🍇 Uva de Mesa / Vid (Red Globe)</option>
                      <option value="HORTALIZAS">🥬 Hortalizas (Fresa / Lechuga / Tomate)</option>
                      <option value="MAIZ_FORRAJE">🌽 Maíz Amarillo Duro / Forrajes</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre / Etiqueta del Escenario</label>
                  <input
                    type="text"
                    value={multiForm.titulo_escenario}
                    onChange={(e) => setMultiForm({ ...multiForm, titulo_escenario: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    placeholder="ej: Simulación de Estiaje Severo con Vertimiento..."
                  />
                </div>

                {/* Slider 1: Caudal Cabecera */}
                <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-xl border border-slate-200 dark:border-cyan-900/50 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-cyan-500" />
                      Variación de Caudal Cabecera (ΔQ)
                    </span>
                    <span className={`font-mono font-black ${multiForm.delta_caudal_pct < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {multiForm.delta_caudal_pct > 0 ? `+${multiForm.delta_caudal_pct}` : multiForm.delta_caudal_pct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="200"
                    step="5"
                    value={multiForm.delta_caudal_pct}
                    onChange={(e) => setMultiForm({ ...multiForm, delta_caudal_pct: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Slider 2: Salinidad EC */}
                <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-xl border border-slate-200 dark:border-cyan-900/50 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Incremento de Salinidad (ΔEC)
                    </span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                      +{multiForm.delta_salinidad_us_cm} µS/cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3500"
                    step="50"
                    value={multiForm.delta_salinidad_us_cm}
                    onChange={(e) => setMultiForm({ ...multiForm, delta_salinidad_us_cm: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Slider 3: Desviación de pH */}
                <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-xl border border-slate-200 dark:border-cyan-900/50 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-purple-500" />
                      Desviación de pH (ΔpH)
                    </span>
                    <span className={`font-mono font-black ${multiForm.delta_ph < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-purple-600 dark:text-purple-400'}`}>
                      {multiForm.delta_ph > 0 ? `+${multiForm.delta_ph}` : multiForm.delta_ph} pH
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-2.5"
                    max="2.5"
                    step="0.1"
                    value={multiForm.delta_ph}
                    onChange={(e) => setMultiForm({ ...multiForm, delta_ph: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Slider 4: Precipitación Pluvial */}
                <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-xl border border-slate-200 dark:border-cyan-900/50 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-500" />
                      Anomalía de Precipitación (ΔLluvia)
                    </span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                      {multiForm.delta_precipitacion_pct > 0 ? `+${multiForm.delta_precipitacion_pct}` : multiForm.delta_precipitacion_pct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="200"
                    step="10"
                    value={multiForm.delta_precipitacion_pct}
                    onChange={(e) => setMultiForm({ ...multiForm, delta_precipitacion_pct: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={simulatingPhase !== null}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{simulatingPhase ? 'Simulando en Gemelo...' : 'Ejecutar Simulación Multivariable'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Columna Derecha: Resultados y Animación de Fases */}
          <div className="lg:col-span-6 space-y-6">
            {/* Animación de Fases de Simulación */}
            {simulatingPhase && (
              <div className="spatial-card p-6 space-y-4 border border-cyan-500/50 bg-cyan-500/10 animate-pulse">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-cyan-500 animate-spin" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Motor Hidráulico & ML en Ejecución
                    </h4>
                    <p className="text-xs font-mono text-cyan-600 dark:text-cyan-300 mt-0.5">
                      {simulatingPhase}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-cyan-950/80 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full w-3/4 animate-pulse rounded-full" />
                </div>
              </div>
            )}

            {/* Resultado Multivariable */}
            {multiResult && !simulatingPhase && (
              <div className="spatial-card p-6 sm:p-8 space-y-6 border-l-4 border-l-cyan-500 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Resultado de Simulación</span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {multiResult.titulo_escenario}
                    </h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    multiResult.alerta_critica 
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300' 
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {multiResult.impacto_cultivo.nivel_estres_osmotico}
                  </span>
                </div>

                {/* Métricas Hidrológicas Clave */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-[#061821] rounded-xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">Caudal Proyectado</span>
                    <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                      {multiResult.caudal_proyectado_m3s.toFixed(2)} m³/s
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({multiResult.caudal_proyectado_ls.toLocaleString()} l/s)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#061821] rounded-xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">Salinidad Resultante</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {multiResult.salinidad_proyectada_ec.toFixed(0)} µS/cm
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      pH {multiResult.ph_proyectado.toFixed(1)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#061821] rounded-xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">WQI Proyectado</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {multiResult.wqi_proyectado.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 block">
                      {multiResult.wqi_categoria}
                    </span>
                  </div>
                </div>

                {/* Tarjeta de Impacto Maas-Hoffman en Cultivo */}
                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-500" />
                      Impacto en {multiResult.impacto_cultivo.nombre_legible}
                    </span>
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                      Pérdida Proyectada: {multiResult.impacto_cultivo.perdida_rendimiento_pct}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {multiResult.impacto_cultivo.diagnostico_agronomico}
                  </p>

                  <div className="p-3 bg-white dark:bg-[#072433] rounded-xl border border-amber-500/30 text-xs font-bold text-slate-900 dark:text-white flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Acción Recomendada:</strong> {multiResult.impacto_cultivo.accion_recomendada}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-[#061821] rounded-xl text-xs text-slate-600 dark:text-slate-400 font-mono">
                  {multiResult.resumen_ejecutivo}
                </div>
              </div>
            )}

            {!multiResult && !simulatingPhase && (
              <div className="spatial-card p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[350px]">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Listo para Iniciar Simulación Multivariable
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Ajusta los controles deslizantes a la izquierda para evaluar simultáneamente caudales, salinidad, pH y precipitaciones con el modelo agronómico Maas-Hoffman.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: CASCADA 3D ESCALONADA & TIMELINE DE NODOS                       */}
      {/* ========================================================================= */}
      {activeTab === 'cascade' && (
        <div className="space-y-6 animate-fade-in">
          {/* Panel de Configuración de Cascada */}
          <div className="spatial-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-500" />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Propagación Cinemática en Cascada 3D (Lead Time Multitramo)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Proyecta secuencialmente el viaje de la pluma de agua desde el punto de origen hacia todas las estaciones aguas abajo por gradiente de cota (msnm).
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRunCascade} className="grid sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Estación Origen del Evento</label>
                <select
                  value={cascadeOrigin}
                  onChange={(e) => setCascadeOrigin(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                >
                  {nodes.map(n => (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      {n.id_nodo} ({n.cota_msnm || 0} msnm)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Caudal de Transporte (m³/s)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={cascadeCaudal}
                  onChange={(e) => setCascadeCaudal(parseFloat(e.target.value) || 0.1)}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Salinidad Origen (µS/cm)</label>
                <input
                  type="number"
                  step="10"
                  min="100"
                  max="10000"
                  value={cascadeSalinidad}
                  onChange={(e) => setCascadeSalinidad(parseFloat(e.target.value) || 100)}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loadingCascade}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCascade ? 'animate-spin' : ''}`} />
                <span>{loadingCascade ? 'Calculando 3D...' : 'Proyectar Cascada'}</span>
              </button>
            </form>
          </div>

          {/* Diagrama Escalonado de Cotas 3D y Nodos */}
          {cascadeResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Perfil Topográfico & Cronograma Secuencial de Arribo
                </span>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {cascadeResult.total_estaciones_aguas_abajo} Estaciones Aguas Abajo Impactadas
                </span>
              </div>

              {/* Estación de Origen Header */}
              <div className="p-4 bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-500/40 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-black text-sm">
                    00
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 uppercase">PUNTO DE ORIGEN</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 font-bold">
                        {cascadeResult.cota_origen_msnm.toFixed(0)} msnm
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {cascadeResult.nombre_origen} ({cascadeResult.id_nodo_origen})
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block">
                    Q: {cascadeResult.caudal_efectivo_m3s.toFixed(2)} m³/s | EC: {cascadeSalinidad} µS/cm
                  </span>
                  <span className="text-[10px] text-slate-500 block">Tiempo t=0h 00min (Inicio del Evento)</span>
                </div>
              </div>

              {/* Secuencia Escalonada */}
              <div className="space-y-3 relative before:absolute before:left-7 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-teal-500 before:to-emerald-500">
                {cascadeResult.secuencia_nodos.map((hop, index) => {
                  const isCrit = hop.nivel_alerta === 'CRÍTICA';
                  const isWarn = hop.nivel_alerta === 'ADVERTENCIA';

                  return (
                    <div
                      key={hop.id_nodo}
                      className={`relative ml-4 pl-8 p-5 rounded-2xl border transition-all ${
                        isCrit
                          ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
                          : isWarn
                          ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
                          : 'bg-white dark:bg-[#061821] border-slate-200 dark:border-cyan-900/60 shadow-sm'
                      } ${isCascadeAnimating ? 'animate-pulse' : ''}`}
                    >
                      {/* Círculo indicador en la línea de tiempo */}
                      <div className={`absolute -left-3 top-6 w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono text-[10px] font-black z-10 ${
                        isCrit 
                          ? 'bg-rose-500 border-white text-white' 
                          : isWarn 
                          ? 'bg-amber-500 border-white text-slate-950' 
                          : 'bg-cyan-500 border-white text-slate-950'
                      }`}>
                        {hop.orden_secuencia}
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {hop.nombre} ({hop.id_nodo})
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#072433] text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-cyan-900/60">
                              ⛰️ {hop.cota_msnm.toFixed(0)} msnm (Desnivel: -{hop.desnivel_acumulado_m.toFixed(0)} m)
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#072433] text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-cyan-900/60">
                              📏 {hop.distancia_acumulada_km.toFixed(1)} km acumulados
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {hop.indicacion_operativa}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                          {/* Ventana de Anticipación */}
                          <div className="p-2.5 bg-slate-100 dark:bg-[#072433] rounded-xl text-center border border-slate-200 dark:border-cyan-900/60 min-w-[120px]">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Arribo del Frente</span>
                            <span className="text-sm font-black text-cyan-600 dark:text-cyan-400 block font-mono">
                              ~{hop.lead_time_frente_legible}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              ({hop.lead_time_frente_minutos} min de ventana)
                            </span>
                          </div>

                          {/* Pico y Despeje */}
                          <div className="p-2.5 bg-slate-100 dark:bg-[#072433] rounded-xl text-center border border-slate-200 dark:border-cyan-900/60 min-w-[110px]">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Pico / Despeje</span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block font-mono">
                              Pico: {hop.lead_time_pico_horas.toFixed(1)}h
                            </span>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-mono">
                              Limpio: {hop.lead_time_despeje_horas.toFixed(1)}h
                            </span>
                          </div>

                          {/* Salinidad Estimada */}
                          <div className="p-2.5 bg-slate-100 dark:bg-[#072433] rounded-xl text-center border border-slate-200 dark:border-cyan-900/60 min-w-[100px]">
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">Salinidad Est.</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white block font-mono">
                              {hop.salinidad_estimada_llegada_ec.toFixed(0)} µS/cm
                            </span>
                            <span className={`text-[9px] font-black uppercase block ${
                              isCrit ? 'text-rose-600 dark:text-rose-400' : isWarn ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {hop.estado_compuerta_recomendado.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-100 dark:bg-[#061821] rounded-xl text-xs text-slate-600 dark:text-slate-400 font-mono text-center">
                {cascadeResult.resumen_cascada}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: PRESCRIPCIÓN DE DILUCIÓN HIDRÁULICA (LAVADO)                    */}
      {/* ========================================================================= */}
      {activeTab === 'dilution' && (
        <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-5 space-y-6">
            <div className="spatial-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                <Droplets className="w-5 h-5 text-cyan-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Parámetros de Dilución de Emergencia
                </h3>
              </div>

              <form onSubmit={handleRunDilution} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Salinidad Actual en el Río (µS/cm) *
                  </label>
                  <input
                    type="number"
                    required
                    step="10"
                    min="200"
                    max="10000"
                    value={dilutionForm.salinidad_actual_rio_ec}
                    onChange={(e) => setDilutionForm({ ...dilutionForm, salinidad_actual_rio_ec: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Caudal Actual del Río (m³/s) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={dilutionForm.caudal_actual_rio_m3s}
                    onChange={(e) => setDilutionForm({ ...dilutionForm, caudal_actual_rio_m3s: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Salinidad Meta (µS/cm)
                    </label>
                    <input
                      type="number"
                      step="50"
                      min="300"
                      max="2000"
                      value={dilutionForm.salinidad_objetivo_ec}
                      onChange={(e) => setDilutionForm({ ...dilutionForm, salinidad_objetivo_ec: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      EC Agua Represa (µS/cm)
                    </label>
                    <input
                      type="number"
                      step="10"
                      min="50"
                      max="500"
                      value={dilutionForm.salinidad_agua_represa_ec}
                      onChange={(e) => setDilutionForm({ ...dilutionForm, salinidad_agua_represa_ec: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ventana de Lavado Deseada (Horas)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={dilutionForm.duracion_lavado_horas}
                    onChange={(e) => setDilutionForm({ ...dilutionForm, duracion_lavado_horas: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingDilution}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDilution ? 'animate-spin' : ''}`} />
                  <span>{loadingDilution ? 'Calculando Balance...' : 'Calcular Descarga de Rescate'}</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {dilutionResult && (
              <div className="spatial-card p-6 sm:p-8 space-y-6 border-l-4 border-l-teal-500 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Dictamen de Prescripción Hidráulica
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-500/20 border border-teal-500/40 text-teal-700 dark:text-teal-300">
                    {dilutionResult.factibilidad_operativa}
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Caudal a Desembalsar</span>
                    <span className="text-2xl font-black text-teal-600 dark:text-teal-400 block font-mono mt-1">
                      {dilutionResult.caudal_descarga_requerido_m3s.toFixed(2)} m³/s
                    </span>
                    <span className="text-xs text-slate-400 block font-mono">
                      ({dilutionResult.caudal_descarga_requerido_ls.toLocaleString()} l/s)
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Volumen Total</span>
                    <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 block font-mono mt-1">
                      {dilutionResult.volumen_total_desembalse_mmc.toFixed(4)} MMC
                    </span>
                    <span className="text-xs text-slate-400 block font-mono">
                      ({dilutionResult.volumen_total_desembalse_m3.toLocaleString()} m³)
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Caudal Total Río</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono mt-1">
                      {dilutionResult.caudal_total_resultante_m3s.toFixed(2)} m³/s
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-bold">
                      Meta: {dilutionResult.salinidad_objetivo_ec} µS/cm
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl space-y-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-teal-500" />
                    Instrucción Técnica para Operadores de Represa:
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {dilutionResult.prescripcion_tecnica}
                  </p>
                </div>
              </div>
            )}

            {!dilutionResult && (
              <div className="spatial-card p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[300px]">
                <Droplets className="w-10 h-10 text-slate-400" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Calculadora de Dilución Hidráulica
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Ingresa la salinidad actual del río y el caudal para calcular matemáticamente cuánta agua limpia debe soltar la presa para proteger las bocatomas de riego.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: AUDITORÍA DE DESVÍOS Y BALANCE DE LA MITA                       */}
      {/* ========================================================================= */}
      {activeTab === 'mita' && (
        <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-5 space-y-6">
            <div className="spatial-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
                <Scale className="w-5 h-5 text-cyan-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Auditoría de Sobre-Extracción en Toma
                </h3>
              </div>

              <form onSubmit={handleRunMitaAudit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bocatoma / Estación Auditada</label>
                  <select
                    value={mitaForm.id_nodo_infractor}
                    onChange={(e) => setMitaForm({ ...mitaForm, id_nodo_infractor: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  >
                    {nodes.map(n => (
                      <option key={n.id_nodo} value={n.id_nodo}>{n.id_nodo} - {n.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Caudal Excedente Sustraído (L/s) *
                  </label>
                  <input
                    type="number"
                    required
                    step="10"
                    min="1"
                    max="5000"
                    value={mitaForm.caudal_exceso_ls}
                    onChange={(e) => setMitaForm({ ...mitaForm, caudal_exceso_ls: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Duración del Desvío (Horas Continuas) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0.5"
                    max="72"
                    value={mitaForm.duracion_sobre_extraccion_horas}
                    onChange={(e) => setMitaForm({ ...mitaForm, duracion_sobre_extraccion_horas: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Caudal Nominal del Canal Principal (m³/s)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="20"
                    value={mitaForm.caudal_nominal_valle_m3s}
                    onChange={(e) => setMitaForm({ ...mitaForm, caudal_nominal_valle_m3s: parseFloat(e.target.value) || 1.5 })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingMita}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Scale className="w-4 h-4" />
                  <span>{loadingMita ? 'Auditando...' : 'Auditar Déficit de La Mita'}</span>
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {mitaResult && (
              <div className="spatial-card p-6 sm:p-8 space-y-6 border-l-4 border-l-rose-500 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Dictamen de Auditoría de Balance de La Mita
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300">
                    {mitaResult.impacto_caudal_ecologico.split(' ')[0]}
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Volumen Sustraído</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block font-mono mt-1">
                      {mitaResult.volumen_total_sustraido_m3.toLocaleString()} m³
                    </span>
                    <span className="text-xs text-slate-400 block font-mono">
                      (Exceso: {mitaResult.caudal_exceso_ls} l/s)
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Retraso en Turno</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block font-mono mt-1">
                      +{mitaResult.retraso_turno_valle_horas.toFixed(2)} Horas
                    </span>
                    <span className="text-xs text-slate-400 block font-bold">
                      Afecta tomas aguas abajo
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/60 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Área Perjudicada</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono mt-1">
                      ~{mitaResult.deficit_hectareas_afectadas.toFixed(0)} Ha
                    </span>
                    <span className="text-xs text-slate-400 block">
                      En parcelas diana
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    Informe Legal / Forense para la Junta de Usuarios:
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {mitaResult.dictamen_auditoria}
                  </p>
                </div>
              </div>
            )}

            {!mitaResult && (
              <div className="spatial-card p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[300px]">
                <Scale className="w-10 h-10 text-slate-400" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Auditoría de Turnos y Volúmenes de La Mita
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Calcula el impacto legal y operativo de sobre-extracciones en compuertas para sustentar actas de sanción o compensación hídrica entre comisiones.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 5: HISTORIAL FORENSE DE SIMULACIONES                              */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="spatial-card p-6 sm:p-8 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Historial Forense de Escenarios Ejecutados
              </h3>
            </div>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="px-3 py-1.5 bg-slate-100 dark:bg-[#072433] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-cyan-900/60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#072433]/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-cyan-900/60">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Título del Escenario</th>
                  <th className="py-3 px-4">Deltas Aplicados</th>
                  <th className="py-3 px-4">Q Proyectado</th>
                  <th className="py-3 px-4">WQI Resultante</th>
                  <th className="py-3 px-4">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-cyan-900/40 font-medium">
                {history.map((h) => (
                  <tr key={h.id_simulacion} className="hover:bg-slate-50 dark:hover:bg-cyan-950/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(h.fecha_ejecucion)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {h.titulo_escenario}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      Q: {h.delta_caudal_cabecera_pct}% | EC: +{h.delta_salinidad_us_cm} µS/cm | Lluvia: {h.delta_precipitacion_pct}%
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      {h.resultado_caudal_valle_m3s.toFixed(2)} m³/s
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                        {h.resultado_wqi_valle.toFixed(1)} WQI
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {h.ejecutado_por || 'Sistema'}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && !loadingHistory && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay registros de simulaciones guardadas aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
