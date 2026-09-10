import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Battery, 
  Signal, 
  Trash2, 
  KeyRound, 
  RefreshCw, 
  PlusCircle, 
  Clock, 
  Activity, 
  Droplets,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  Sliders,
  Sparkles,
  X
} from 'lucide-react';
import { nodesApi } from '../services/api';

export default function NodeManagement({ setActiveTab, grafanaUrl }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyModal, setApiKeyModal] = useState(null);
  const [copied, setCopied] = useState(false);

  // Estado de Calibración
  const [calibModalNode, setCalibModalNode] = useState(null);
  const [calibLoading, setCalibLoading] = useState(false);
  const [calibSaving, setCalibSaving] = useState(false);
  const [calibSuccess, setCalibSuccess] = useState(false);
  const [calibForm, setCalibForm] = useState({
    ph_offset_v: 2.5000,
    ph_slope: -0.1800,
    tds_factor_k: 0.5000,
    tds_offset_v: 0.0000,
    turb_v_clear: 4.2000,
    turb_v_turbid: 2.5000,
    distancia_fondo_sensor_cm: 120.0,
    caudal_coef_k: 0.3810,
    caudal_exp_n: 1.5800,
    calibrado_por: 'Operador Técnico'
  });

  const fetchNodes = () => {
    setLoading(true);
    nodesApi.getNodes()
      .then(res => setNodes(res.data || []))
      .catch(err => console.error("Error obteniendo nodos:", err))
      .finally(() => setLoading(false));
  };

  // Carga inicial al montar el componente
  useEffect(() => {
    fetchNodes();
  }, []);

  const openCalibration = async (node) => {
    setCalibModalNode(node);
    setCalibLoading(true);
    setCalibSuccess(false);
    try {
      const res = await nodesApi.getNodeCalibration(node.id_nodo);
      if (res.data) {
        setCalibForm({
          ph_offset_v: res.data.ph_offset_v ?? 2.5000,
          ph_slope: res.data.ph_slope ?? -0.1800,
          tds_factor_k: res.data.tds_factor_k ?? 0.5000,
          tds_offset_v: res.data.tds_offset_v ?? 0.0000,
          turb_v_clear: res.data.turb_v_clear ?? 4.2000,
          turb_v_turbid: res.data.turb_v_turbid ?? 2.5000,
          distancia_fondo_sensor_cm: res.data.distancia_fondo_sensor_cm ?? 120.0,
          caudal_coef_k: res.data.caudal_coef_k ?? 0.3810,
          caudal_exp_n: res.data.caudal_exp_n ?? 1.5800,
          calibrado_por: res.data.calibrado_por || 'Operador Técnico'
        });
      }
    } catch (err) {
      console.warn("Sin calibración previa, usando valores por defecto:", err);
    } finally {
      setCalibLoading(false);
    }
  };

  const handleSaveCalibration = async (e) => {
    e.preventDefault();
    if (!calibModalNode) return;
    setCalibSaving(true);
    try {
      await nodesApi.updateNodeCalibration(calibModalNode.id_nodo, calibForm);
      setCalibSuccess(true);
      setTimeout(() => {
        setCalibSuccess(false);
        setCalibModalNode(null);
      }, 1500);
    } catch (err) {
      alert("Error al guardar calibración: " + (err.response?.data?.detail || err.message));
    } finally {
      setCalibSaving(false);
    }
  };

  const handleRegenerateKey = async (nodeId) => {
    if (window.confirm(`¿Seguro que deseas regenerar la API Key del nodo ${nodeId}? La clave anterior dejará de funcionar inmediatamente.`)) {
      try {
        const res = await nodesApi.regenerateApiKey(nodeId);
        setApiKeyModal(res.data);
      } catch (err) {
        alert("Error regenerando API Key: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleDelete = async (nodeId, name) => {
    if (window.confirm(`¿Eliminar la estación ${name} (${nodeId})? Esta acción eliminará el nodo y sus calibraciones asociadas.`)) {
      try {
        await nodesApi.deleteNode(nodeId);
        fetchNodes();
      } catch (err) {
        alert("Error al eliminar estación: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <span>Paso 3: Telemetría & Supervisión en Vivo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Directorio y Monitoreo de Estaciones IoT
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Supervisa el estado de enlace celular GSM (CSQ), tensión de batería solar de 12V, calidad WQI y salinidad en tiempo real.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchNodes}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-cyan-300 border border-slate-300 dark:border-cyan-900/60 transition-all shadow-sm cursor-pointer"
            title="Actualizar estado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('wizard')}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold shadow-lg shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Aprovisionar Estación</span>
          </button>
        </div>
      </div>

      {/* Grid de Nodos */}
      {loading && nodes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">Cargando estaciones telemétricas...</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="spatial-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-600 dark:text-cyan-400">
            <Radio className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">No hay estaciones registradas aún</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            La base de datos arranca limpia. Utiliza el Asistente de Provisión para registrar tu primera estación física y obtener su clave de comunicación.
          </p>
          <button
            onClick={() => setActiveTab('wizard')}
            className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm shadow-md cursor-pointer"
          >
            Registrar Primera Estación
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nodes.map((node) => {
            const isOnline = node.estado_operativo === 'ONLINE';
            const isDelayed = node.estado_operativo === 'DELAYED';
            const isCritical = node.estado_salinidad === 'PELIGRO_ESTRES_OSMOTICO';

            return (
              <div
                key={node.id_nodo}
                className={`spatial-card p-6 space-y-5 flex flex-col justify-between border transition-all ${
                  isCritical 
                    ? 'border-rose-400/80 bg-rose-500/5 shadow-rose-500/10' 
                    : isOnline 
                    ? 'border-cyan-500/30 shadow-cyan-500/5' 
                    : 'border-slate-200 dark:border-slate-800 opacity-90'
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-cyan-950/80 text-slate-800 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30">
                      {node.id_nodo}
                    </span>
                    
                    {/* Badge de Estado */}
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isOnline
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40'
                        : isDelayed
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-500/40'
                        : 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : isDelayed ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                      <span>{node.estado_operativo}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                    {node.nombre}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {node.subcuenca || 'Cuenca General'} • {node.sector_cuenca || 'Sector'} ({node.cota_msnm ? `${node.cota_msnm} msnm` : '0 msnm'})
                  </p>
                </div>

                {/* Métricas de Calidad de Agua */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#061821]/80 p-4 rounded-2xl border border-slate-200 dark:border-cyan-900/40">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Índice WQI</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {node.ultimo_wqi_score !== null ? `${node.ultimo_wqi_score.toFixed(1)} / 100` : '—'}
                    </span>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block font-bold">
                      {node.ultimo_wqi_categoria || 'Sin datos'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Salinidad / EC</span>
                    <span className={`text-base font-black ${isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      {node.ultimo_ec_us_cm !== null ? `${node.ultimo_ec_us_cm.toFixed(0)} µS/cm` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      pH: {node.ultimo_ph !== null ? node.ultimo_ph.toFixed(2) : '—'}
                    </span>
                  </div>
                </div>

                {/* Estado de Hardware (Batería y Señal) */}
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-cyan-900/40">
                  <div className="flex items-center space-x-1.5" title="Tensión de Batería Solar 12V">
                    <Battery className={`w-4 h-4 ${node.bateria_v && node.bateria_v < 11.5 ? 'text-amber-500' : 'text-cyan-500'}`} />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{node.bateria_v !== null ? `${node.bateria_v.toFixed(2)} V` : '—'}</span>
                  </div>

                  <div className="flex items-center space-x-1.5" title="Intensidad de Señal Celular GSM">
                    <Signal className="w-4 h-4 text-cyan-500" />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{node.signal_rssi !== null ? `${node.signal_rssi}/31 CSQ` : '—'}</span>
                  </div>

                  <div className="flex items-center space-x-1" title="Última transmisión recibida">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {node.ultima_conexion ? new Date(node.ultima_conexion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-cyan-950/60">
                  <a
                    href={grafanaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors"
                  >
                    <span>Ver en Grafana</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openCalibration(node)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 transition-colors cursor-pointer"
                      title="Calibrar Sensores y Aforo"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRegenerateKey(node.id_nodo)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 transition-colors cursor-pointer"
                      title="Regenerar API Key"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(node.id_nodo, node.nombre)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-cyan-950/60 dark:hover:bg-rose-950/50 border border-slate-300 dark:border-cyan-500/30 text-slate-700 hover:text-rose-600 dark:text-cyan-300 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar Estación"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Calibración de Sensores y Aforo */}
      {calibModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Calibración de Sondas & Aforador
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Estación: <strong className="text-slate-900 dark:text-cyan-300 font-mono">{calibModalNode.id_nodo}</strong> — {calibModalNode.nombre}
                </p>
              </div>

              {/* Presets Rápidos */}
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCalibForm(prev => ({
                      ...prev,
                      ph_offset_v: 2.5000,
                      ph_slope: -0.1800,
                      tds_factor_k: 0.5000,
                      tds_offset_v: 0.0000,
                      turb_v_clear: 4.2000,
                      turb_v_turbid: 2.5000
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-cyan-950 text-slate-700 dark:text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Estándar Lab
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalibForm(prev => ({
                      ...prev,
                      ph_offset_v: 2.4800,
                      ph_slope: -0.1840,
                      tds_factor_k: 0.5000,
                      tds_offset_v: 0.0000,
                      turb_v_clear: 4.2000,
                      turb_v_turbid: 2.4000
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-cyan-950 text-slate-700 dark:text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Valle Chancay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalibForm(prev => ({
                      ...prev,
                      ph_offset_v: 2.5000,
                      ph_slope: -0.1800,
                      tds_factor_k: 0.5000,
                      tds_offset_v: 0.0000,
                      turb_v_clear: 4.2500,
                      turb_v_turbid: 2.5000
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-cyan-950 text-slate-700 dark:text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Alta Cabecera
                </button>
              </div>
            </div>

            {calibLoading ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">Consultando calibración activa...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveCalibration} className="space-y-4">
                {calibSuccess && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-pulse">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>¡Calibración guardada y aplicada exitosamente para la estación!</span>
                  </div>
                )}

                {/* Sondas Analógicas */}
                <div className="grid sm:grid-cols-3 gap-3">
                  {/* pH */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Sonda pH (PH-4502C)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold">ADC1_CH4</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Offset pH 7.0 (V)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.ph_offset_v}
                        onChange={e => setCalibForm({ ...calibForm, ph_offset_v: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Slope (V/pH)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.ph_slope}
                        onChange={e => setCalibForm({ ...calibForm, ph_slope: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                  </div>

                  {/* Salinidad */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Salinidad (Keyestudio)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold">ADC1_CH6</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Factor Conversión K</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.tds_factor_k}
                        onChange={e => setCalibForm({ ...calibForm, tds_factor_k: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Offset en Seco (V)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.tds_offset_v}
                        onChange={e => setCalibForm({ ...calibForm, tds_offset_v: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                  </div>

                  {/* Turbidez */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Turbidez (TS-300B)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-mono font-bold">ADC1_CH7</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">V Clara (0 NTU)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.turb_v_clear}
                        onChange={e => setCalibForm({ ...calibForm, turb_v_clear: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">V Turbia (100 NTU)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.turb_v_turbid}
                        onChange={e => setCalibForm({ ...calibForm, turb_v_turbid: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Aforo Hidráulico y Ultrasonido */}
                <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">Aforador Hidráulico & Sensor Ultrasónico JSN-SR04T (Q = K · hᴺ)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-mono font-bold">GPIO32/33</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Distancia Sensor-Fondo (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={calibForm.distancia_fondo_sensor_cm}
                        onChange={e => setCalibForm({ ...calibForm, distancia_fondo_sensor_cm: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Coeficiente Caudal K</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.caudal_coef_k}
                        onChange={e => setCalibForm({ ...calibForm, caudal_coef_k: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Exponente Caudal N</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.caudal_exp_n}
                        onChange={e => setCalibForm({ ...calibForm, caudal_exp_n: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Calibrador & Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Técnico / Responsable:</label>
                    <input
                      type="text"
                      value={calibForm.calibrado_por}
                      onChange={e => setCalibForm({ ...calibForm, calibrado_por: e.target.value })}
                      placeholder="ej: Juan Pérez (Ing. Hidráulico)"
                      className="bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="flex items-center space-x-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setCalibModalNode(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={calibSaving}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      {calibSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{calibSaving ? 'Guardando...' : 'Aplicar Calibración'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de API Key Regenerada */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-cyan-500" />
                <span>Nueva API Key Generada</span>
              </h3>
              <button
                onClick={() => copyToClipboard(apiKeyModal.cpp_config_snippet)}
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Snippet'}</span>
              </button>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 text-xs">
              Se ha emitido una nueva credencial para la estación <strong className="text-slate-900 dark:text-cyan-300 font-mono">{apiKeyModal.id_nodo}</strong>. Reemplázala en <code className="text-cyan-600 dark:text-cyan-400 font-mono font-bold bg-slate-100 dark:bg-[#03131c] px-1.5 py-0.5 rounded">firmware/include/config.h</code> del ESP32.
            </p>
            
            <pre className="font-mono text-xs text-cyan-300 bg-[#03131c] p-4 rounded-xl border border-cyan-900/60 overflow-x-auto">
              {apiKeyModal.cpp_config_snippet}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setApiKeyModal(null)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-md cursor-pointer"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
