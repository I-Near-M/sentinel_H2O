import React, { useState, useEffect } from 'react';
import { Cpu, Play, Clock, ArrowRight, ShieldAlert, Sparkles, Sliders, Waves, Droplets, Zap } from 'lucide-react';
import { predictionsApi, nodesApi } from '../services/api';

export default function WhatIfSimulatorView() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [scenarioType, setScenarioType] = useState('DESCARGA_REPRESA_POLLUCION');
  const [reductionPct, setReductionPct] = useState(60);
  const [salinityMultiplier, setSalinityMultiplier] = useState(2.8);
  const [durationHours, setDurationHours] = useState(12);
  
  const [loadingSim, setLoadingSim] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Lead Time Calculator state
  const [leadTimeOrigin, setLeadTimeOrigin] = useState('NODO-01-CABECERA');
  const [leadTimeDest, setLeadTimeDest] = useState('NODO-03-PARCELA');
  const [testCaudal, setTestCaudal] = useState(4.5);
  const [leadTimeResult, setLeadTimeResult] = useState(null);
  const [loadingLt, setLoadingLt] = useState(false);

  useEffect(() => {
    nodesApi.getNodes().then(res => {
      const data = res.data || [];
      setNodes(data);
      if (data.length > 0) {
        setSelectedNode(data[0].id_nodo);
        setLeadTimeOrigin(data[0].id_nodo);
        setLeadTimeDest(data[data.length - 1]?.id_nodo || data[0].id_nodo);
      }
    });
  }, []);

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setLoadingSim(true);
    try {
      const payload = {
        id_nodo: selectedNode,
        tipo_escenario: scenarioType,
        reduccion_caudal_pct: scenarioType === 'SEQUIA_EXTREMA' ? reductionPct : 0.0,
        multiplicador_salinidad: scenarioType !== 'SEQUIA_EXTREMA' ? salinityMultiplier : 1.0,
        duracion_horas: durationHours,
        ejecutado_por: "Operador Web Sentinel"
      };
      const res = await predictionsApi.simulateWhatIf(payload);
      setSimResult(res.data);
    } catch (err) {
      alert("Error ejecutando simulación: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingSim(false);
    }
  };

  const handleCalculateLeadTime = async (e) => {
    e.preventDefault();
    setLoadingLt(true);
    try {
      const res = await predictionsApi.getLeadTime(leadTimeOrigin, leadTimeDest, testCaudal);
      setLeadTimeResult(res.data);
    } catch (err) {
      alert("Error calculando tiempo de viaje: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingLt(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="spatial-card p-6 sm:p-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-onahau-100 border border-onahau-300 text-onahau-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Cpu className="w-3.5 h-3.5 text-onahau-600" />
          <span>Paso 5: Modelado Predictivo & Resiliencia</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-onahau-950 tracking-tight">
          Simulador de Escenarios "What-If" & Lead Time
        </h2>
        <p className="text-sm text-onahau-800 mt-1 max-w-2xl">
          Modela contingencias hidrológicas extremas (vertimientos, estiajes severos) y calcula el tiempo cinemático de transporte de solutos en la cuenca antes del impacto en parcela.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* PANEL 1: Simulador de Escenarios What-If */}
        <div className="spatial-card p-6 sm:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-onahau-950 font-black text-base border-b border-onahau-200 pb-3">
              <Sparkles className="w-5 h-5 text-onahau-500" />
              <span>Motor de Simulación What-If</span>
            </div>

            <form onSubmit={handleRunSimulation} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-onahau-900">Estación a Simular</label>
                <select
                  value={selectedNode}
                  onChange={(e) => setSelectedNode(e.target.value)}
                  className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-mono text-xs font-bold"
                >
                  {nodes.map(n => (
                    <option key={n.id_nodo} value={n.id_nodo}>{n.id_nodo} - {n.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-onahau-900">Tipo de Escenario</label>
                <select
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-medium"
                >
                  <option value="DESCARGA_REPRESA_POLLUCION">Vertimiento / Pico de Salinidad (x2.8 EC)</option>
                  <option value="SEQUIA_EXTREMA">Estiaje Severo / Sequía (-60% Caudal)</option>
                  <option value="DESCARGA_REPRESA">Descarga de Emergencia de Represa (+200% Caudal)</option>
                </select>
              </div>

              {scenarioType === 'SEQUIA_EXTREMA' ? (
                <div className="space-y-1 bg-onahau-50/80 p-4 rounded-xl border border-onahau-200">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-onahau-900">Reducción de Caudal</span>
                    <span className="font-mono text-amber-700 font-extrabold">{reductionPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={reductionPct}
                    onChange={(e) => setReductionPct(parseFloat(e.target.value))}
                    className="w-full accent-onahau-500 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="space-y-1 bg-onahau-50/80 p-4 rounded-xl border border-onahau-200">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-onahau-900">Multiplicador de Salinidad</span>
                    <span className="font-mono text-onahau-700 font-extrabold">{salinityMultiplier}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="5.0"
                    step="0.1"
                    value={salinityMultiplier}
                    onChange={(e) => setSalinityMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-onahau-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="space-y-1 bg-onahau-50/80 p-4 rounded-xl border border-onahau-200">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-onahau-900">Duración del Escenario</span>
                  <span className="font-mono text-onahau-700 font-extrabold">{durationHours} Horas</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="48"
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseInt(e.target.value))}
                  className="w-full accent-onahau-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={loadingSim || nodes.length === 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-onahau-500/25"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{loadingSim ? 'Calculando Inferencia...' : 'Ejecutar Simulación'}</span>
              </button>
            </form>
          </div>

          {/* Resultado de la simulación */}
          {simResult && (
            <div className="bg-onahau-50 border border-onahau-300 rounded-2xl p-5 space-y-3 text-xs mt-4">
              <div className="flex items-center justify-between border-b border-onahau-200 pb-2">
                <span className="font-black text-onahau-950 uppercase">{simResult.tipo_escenario}</span>
                <span className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                  simResult.alerta_detonada ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {simResult.alerta_detonada ? 'RIESGO CRÍTICO' : 'RIESGO CONTROLADO'}
                </span>
              </div>
              <p className="text-onahau-900 leading-relaxed font-medium">{simResult.impacto_resumen}</p>
              <div className="p-3 rounded-xl bg-white border border-onahau-300 text-onahau-900 font-medium shadow-sm">
                💡 <strong className="text-onahau-700">Recomendación Agronómica:</strong> {simResult.recomendacion_agronomica}
              </div>
            </div>
          )}
        </div>

        {/* PANEL 2: Calculadora Hidráulica de Lead Time */}
        <div className="spatial-card p-6 sm:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-onahau-950 font-black text-base border-b border-onahau-200 pb-3">
              <Clock className="w-5 h-5 text-onahau-600" />
              <span>Estimador de Tiempo de Tránsito (Lead Time)</span>
            </div>

            <form onSubmit={handleCalculateLeadTime} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-onahau-900">Punto de Origen</label>
                  <select
                    value={leadTimeOrigin}
                    onChange={(e) => setLeadTimeOrigin(e.target.value)}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-3 py-2.5 text-xs text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-mono font-bold"
                  >
                    {nodes.map(n => (
                      <option key={n.id_nodo} value={n.id_nodo}>{n.id_nodo}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-onahau-900">Punto de Destino</label>
                  <select
                    value={leadTimeDest}
                    onChange={(e) => setLeadTimeDest(e.target.value)}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-3 py-2.5 text-xs text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-mono font-bold"
                  >
                    {nodes.map(n => (
                      <option key={n.id_nodo} value={n.id_nodo}>{n.id_nodo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-onahau-900">Caudal en el Canal/Río (m³/s)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={testCaudal}
                  onChange={(e) => setTestCaudal(parseFloat(e.target.value))}
                  className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 font-mono font-bold focus:outline-none focus:border-onahau-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loadingLt || nodes.length === 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-onahau-600 to-onahau-500 hover:from-onahau-700 hover:to-onahau-600 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-onahau-600/25"
              >
                <Sliders className="w-4 h-4" />
                <span>{loadingLt ? 'Calculando Hidráulica...' : 'Calcular Ventana de Anticipación'}</span>
              </button>
            </form>
          </div>

          {/* Resultado de Lead Time */}
          {leadTimeResult && (
            <div className="bg-onahau-50 border border-onahau-300 rounded-2xl p-5 space-y-4 mt-4">
              <div className="text-center space-y-1">
                <span className="text-[11px] text-onahau-700 font-extrabold uppercase tracking-wider block">
                  Ventana de Anticipación para el Agricultor
                </span>
                <span className="text-3xl font-black text-onahau-700">
                  {leadTimeResult.tiempo_viaje_horas.toFixed(1)} Horas
                </span>
                <span className="text-xs text-onahau-800 block font-bold">
                  (~{leadTimeResult.ventana_anticipacion_minutos} minutos antes de que el agua llegue a la parcela)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-onahau-200">
                <div>
                  <span className="text-onahau-700 font-medium block">Distancia del Tramo:</span>
                  <span className="font-extrabold text-onahau-950">{leadTimeResult.distancia_km.toFixed(1)} km</span>
                </div>
                <div>
                  <span className="text-onahau-700 font-medium block">Velocidad de Flujo:</span>
                  <span className="font-extrabold text-onahau-700">{leadTimeResult.velocidad_flujo_ms.toFixed(2)} m/s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
