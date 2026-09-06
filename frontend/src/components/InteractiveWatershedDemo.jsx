import React, { useState } from 'react';
import { 
  Droplets, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  Activity, 
  Waves, 
  Sparkles, 
  Clock, 
  Zap, 
  ArrowRight,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';

export default function InteractiveWatershedDemo({ onOpenWizard }) {
  const [selectedNode, setSelectedNode] = useState('cabecera');
  const [simulationMode, setSimulationMode] = useState('normal'); // 'normal' | 'salinity_spike'

  const isSimulatedAlert = simulationMode === 'salinity_spike';

  const nodesData = {
    cabecera: {
      title: 'Nodo 1: Cabecera & Lagunas',
      subtitle: 'Vichaycocha — 4,350 msnm',
      role: 'Monitoreo de Fuentes Naturales y Deshielos',
      ph: 7.42,
      ec: isSimulatedAlert ? 2100 : 185,
      wqi: isSimulatedAlert ? 48.2 : 95.8,
      status: isSimulatedAlert ? 'CRÍTICO' : 'EXCELENTE',
      caudal: '1.85 m³/s',
      leadTime: '0 min (Origen)',
      desc: 'Detecta el inicio del ciclo hidrológico y vertimientos en alta montaña.'
    },
    conduccion: {
      title: 'Nodo 2: Canal de Conducción Central',
      subtitle: 'Valle Medio — 1,250 msnm',
      role: 'Cálculo de Transporte Cinemático',
      ph: isSimulatedAlert ? 6.95 : 7.60,
      ec: isSimulatedAlert ? 1850 : 540,
      wqi: isSimulatedAlert ? 54.0 : 88.3,
      status: isSimulatedAlert ? 'ALERTA' : 'BUENA',
      caudal: '3.42 m³/s',
      leadTime: isSimulatedAlert ? 'En tránsito (~22 min a compuerta)' : 'Normal (~25 min)',
      desc: 'Modela la velocidad del flujo y la dispersión de solutos en el canal matriz.'
    },
    parcela: {
      title: 'Nodo 3: Bocatoma & Parcela Piloto',
      subtitle: 'Valle Agrícola Huayopampa — 320 msnm',
      role: 'Control Temprano de Compuerta & Protección Frutal',
      ph: 7.65,
      ec: isSimulatedAlert ? 1200 : 610,
      wqi: isSimulatedAlert ? 62.5 : 84.7,
      status: isSimulatedAlert ? 'VENTANA DE ACCIÓN' : 'ÓPTIMO',
      caudal: '0.85 m³/s',
      leadTime: isSimulatedAlert ? '⚡ ¡Alerta recibida! 35 min antes del ingreso' : '35 min de buffer preventivo',
      desc: 'Dispara WhatsApp al tomero antes de que el agua salina queme las raíces.'
    }
  };

  const current = nodesData[selectedNode];

  return (
    <div className="relative rounded-3xl glass-panel p-6 sm:p-8 lg:p-10 border border-teal-500/20 overflow-hidden space-y-8">
      {/* Luz ambiental de fondo */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Cabecera del Componente Interactivo */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 relative z-10">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5 animate-pulse text-teal-400" />
            <span>Simulación Topológica en Vivo</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Recorrido Hidráulico: <span className="bg-gradient-to-r from-teal-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">De la Fuente al Surco</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Observa cómo Sentinel-H2O detecta picos de salinidad en cabecera y calcula el tiempo de viaje cinemático hasta la compuerta del agricultor.
          </p>
        </div>

        {/* Botón de Modo Simulación */}
        <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setSimulationMode('normal')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              simulationMode === 'normal'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Flujo Normal (Limpio)
          </button>
          <button
            onClick={() => setSimulationMode('salinity_spike')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              simulationMode === 'salinity_spike'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 animate-pulse'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simular Pico Salino</span>
          </button>
        </div>
      </div>

      {/* Diagrama Esquemático del Río / Canal con Nodos Conectados */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* NODO 1: CABECERA */}
        <button
          onClick={() => setSelectedNode('cabecera')}
          className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden ${
            selectedNode === 'cabecera'
              ? 'bg-slate-900/90 border-teal-400/80 shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/50'
              : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isSimulatedAlert ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isSimulatedAlert ? 'Pico Salino' : '4,350 msnm'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">Cabecera de Cuenca</h4>
          <p className="text-xs text-slate-400 mt-0.5">Vichaycocha (Lagunas)</p>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">EC Salinidad:</span>
            <span className={`font-mono font-bold ${isSimulatedAlert ? 'text-red-400' : 'text-teal-300'}`}>
              {nodesData.cabecera.ec} µS/cm
            </span>
          </div>
        </button>

        {/* NODO 2: CONDUCCIÓN */}
        <button
          onClick={() => setSelectedNode('conduccion')}
          className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden ${
            selectedNode === 'conduccion'
              ? 'bg-slate-900/90 border-cyan-400/80 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50'
              : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
              1,250 msnm
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">Canal Conducción Central</h4>
          <p className="text-xs text-slate-400 mt-0.5">Acos - Reparto Matriz</p>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">EC Salinidad:</span>
            <span className={`font-mono font-bold ${isSimulatedAlert ? 'text-amber-400' : 'text-cyan-300'}`}>
              {nodesData.conduccion.ec} µS/cm
            </span>
          </div>
        </button>

        {/* NODO 3: PARCELA */}
        <button
          onClick={() => setSelectedNode('parcela')}
          className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden ${
            selectedNode === 'parcela'
              ? 'bg-slate-900/90 border-emerald-400/80 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50'
              : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isSimulatedAlert ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              320 msnm
            </span>
          </div>
          <h4 className="text-sm font-bold text-white">Bocatoma & Parcela</h4>
          <p className="text-xs text-slate-400 mt-0.5">Huayopampa (Frutales)</p>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Ventana Alerta:</span>
            <span className="font-mono font-bold text-emerald-400">
              ~35 min anticipado
            </span>
          </div>
        </button>
      </div>

      {/* Detalle del Nodo Seleccionado & Telemetría en Tiempo Real */}
      <div className="relative z-10 bg-slate-950/70 rounded-2xl border border-slate-800/90 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/70 pb-3">
          <div>
            <h4 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <span>{current.title}</span>
              <span className="text-xs font-medium text-teal-400 font-mono">({current.subtitle})</span>
            </h4>
            <p className="text-xs text-slate-400">{current.desc}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Calidad WQI:</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              current.wqi >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {current.wqi.toFixed(1)} / 100 ({current.status})
            </span>
          </div>
        </div>

        {/* Métricas del Nodo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Salinidad (EC)</span>
            <span className={`text-base sm:text-lg font-mono font-bold ${current.ec > 1500 ? 'text-red-400' : 'text-cyan-300'}`}>
              {current.ec} <span className="text-xs font-normal text-slate-400">µS/cm</span>
            </span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">pH de Riego</span>
            <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
              {current.ph} <span className="text-xs font-normal text-slate-400">pH</span>
            </span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Caudal Volumétrico</span>
            <span className="text-base sm:text-lg font-mono font-bold text-teal-300">
              {current.caudal}
            </span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Ventana de Reacción</span>
            <span className="text-xs sm:text-sm font-semibold text-amber-400 block pt-0.5">
              {current.leadTime}
            </span>
          </div>
        </div>

        {/* Banner de Aviso de WhatsApp Temprano */}
        {isSimulatedAlert && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-red-500/15 to-transparent border border-amber-500/30 flex items-start space-x-3">
            <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-bounce" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-amber-300 block">
                ⚡ ¡Alerta Temprana Despachada por WhatsApp a Tomeros y Regantes!
              </span>
              <p className="text-slate-300">
                Se detectó una anomalía en Cabecera (EC: 2100 µS/cm). El modelo de transporte cinemático proyecta que el agua salina llegará a la parcela en <strong>~35 minutos</strong>. El tomero tiene tiempo suficiente para cerrar la compuerta y desviar el flujo al canal de purga.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
