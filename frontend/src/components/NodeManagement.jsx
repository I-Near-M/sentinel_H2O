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
  Sparkles
} from 'lucide-react';
import { nodesApi } from '../services/api';

export default function NodeManagement({ setActiveTab, grafanaUrl }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyModal, setApiKeyModal] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchNodes = () => {
    setLoading(true);
    nodesApi.getNodes()
      .then(res => setNodes(res.data || []))
      .catch(err => console.error("Error obteniendo nodos:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (nodeId, nodeName) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la estación '${nodeName}' (${nodeId})? Esta acción borrará todas sus mediciones y alertas asociadas.`)) {
      try {
        await nodesApi.deleteNode(nodeId);
        fetchNodes();
      } catch (err) {
        alert("Error al eliminar nodo: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleRegenerateKey = async (nodeId) => {
    if (window.confirm(`¿Regenerar la API Key de '${nodeId}'? La clave anterior dejará de funcionar de inmediato.`)) {
      try {
        const res = await nodesApi.regenerateApiKey(nodeId);
        setApiKeyModal(res.data);
      } catch (err) {
        alert("Error regenerando API Key: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-onahau-100 border border-onahau-300 text-onahau-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5 text-onahau-600 animate-pulse" />
            <span>Paso 3: Telemetría & Supervisión en Vivo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-onahau-950 tracking-tight">
            Directorio y Monitoreo de Estaciones IoT
          </h2>
          <p className="text-sm text-onahau-800 mt-1 max-w-2xl">
            Supervisa el estado de enlace celular GSM (CSQ), tensión de batería solar de 12V, calidad WQI y salinidad en tiempo real.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchNodes}
            className="p-3 rounded-2xl bg-white hover:bg-onahau-50 text-onahau-800 border border-onahau-200 transition-all shadow-sm"
            title="Actualizar estado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-onahau-500' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('wizard')}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white font-extrabold shadow-lg shadow-onahau-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Aprovisionar Estación</span>
          </button>
        </div>
      </div>

      {/* Grid de Nodos */}
      {loading && nodes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-onahau-500 animate-spin mx-auto" />
          <p className="text-sm text-onahau-700 font-bold">Cargando estaciones telemétricas...</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="spatial-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-onahau-100 border border-onahau-200 flex items-center justify-center mx-auto text-onahau-600">
            <Radio className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-onahau-950">No hay estaciones registradas aún</h3>
          <p className="text-sm text-onahau-700 max-w-md mx-auto">
            La base de datos arranca limpia. Utiliza el Asistente de Provisión para registrar tu primera estación física y obtener su clave de comunicación.
          </p>
          <button
            onClick={() => setActiveTab('wizard')}
            className="px-6 py-3 rounded-2xl bg-onahau-500 hover:bg-onahau-600 text-white font-extrabold text-sm shadow-md"
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
                className={`spatial-card p-6 space-y-5 flex flex-col justify-between ${
                  isCritical 
                    ? 'border-red-400 bg-red-50/40 shadow-red-500/10' 
                    : isOnline 
                    ? 'border-onahau-300' 
                    : 'border-slate-200 opacity-90'
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-lg bg-onahau-100 text-onahau-800 border border-onahau-200">
                      {node.id_nodo}
                    </span>
                    
                    {/* Badge de Estado */}
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isOnline
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isDelayed
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : isDelayed ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                      <span>{node.estado_operativo}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-black text-onahau-950 leading-snug">
                    {node.nombre}
                  </h3>
                  <p className="text-xs text-onahau-700">
                    {node.subcuenca || 'Cuenca General'} • {node.sector_cuenca || 'Sector'} ({node.cota_msnm ? `${node.cota_msnm} msnm` : '0 msnm'})
                  </p>
                </div>

                {/* Métricas de Calidad de Agua */}
                <div className="grid grid-cols-2 gap-3 bg-onahau-50/80 p-4 rounded-2xl border border-onahau-200">
                  <div>
                    <span className="text-[10px] text-onahau-700 font-bold block">Índice WQI</span>
                    <span className="text-base font-black text-onahau-950">
                      {node.ultimo_wqi_score !== null ? `${node.ultimo_wqi_score.toFixed(1)} / 100` : '—'}
                    </span>
                    <span className="text-[10px] text-onahau-600 block font-bold">
                      {node.ultimo_wqi_categoria || 'Sin datos'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-onahau-700 font-bold block">Salinidad / EC</span>
                    <span className={`text-base font-black ${isCritical ? 'text-red-600' : 'text-onahau-800'}`}>
                      {node.ultimo_ec_us_cm !== null ? `${node.ultimo_ec_us_cm.toFixed(0)} µS/cm` : '—'}
                    </span>
                    <span className="text-[10px] text-onahau-700 block font-medium">
                      pH: {node.ultimo_ph !== null ? node.ultimo_ph.toFixed(2) : '—'}
                    </span>
                  </div>
                </div>

                {/* Estado de Hardware (Batería y Señal) */}
                <div className="flex items-center justify-between text-xs text-onahau-800 pt-2 border-t border-onahau-200/80">
                  <div className="flex items-center space-x-1.5" title="Tensión de Batería Solar 12V">
                    <Battery className={`w-4 h-4 ${node.bateria_v && node.bateria_v < 11.5 ? 'text-amber-600' : 'text-onahau-600'}`} />
                    <span className="font-mono font-bold">{node.bateria_v !== null ? `${node.bateria_v.toFixed(2)} V` : '—'}</span>
                  </div>

                  <div className="flex items-center space-x-1.5" title="Intensidad de Señal Celular GSM">
                    <Signal className="w-4 h-4 text-onahau-500" />
                    <span className="font-mono font-bold">{node.signal_rssi !== null ? `${node.signal_rssi}/31 CSQ` : '—'}</span>
                  </div>

                  <div className="flex items-center space-x-1" title="Última transmisión recibida">
                    <Clock className="w-3.5 h-3.5 text-onahau-400" />
                    <span className="text-[10px] text-onahau-600 font-medium">
                      {node.ultima_conexion ? new Date(node.ultima_conexion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center justify-between pt-2 border-t border-onahau-100">
                  <a
                    href={grafanaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs font-bold text-onahau-600 hover:text-onahau-800"
                  >
                    <span>Ver en Grafana</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleRegenerateKey(node.id_nodo)}
                      className="p-2 rounded-xl bg-white hover:bg-amber-50 text-onahau-700 hover:text-amber-700 border border-onahau-200 transition-colors"
                      title="Regenerar API Key"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(node.id_nodo, node.nombre)}
                      className="p-2 rounded-xl bg-white hover:bg-red-50 text-onahau-700 hover:text-red-600 border border-onahau-200 transition-colors"
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

      {/* Modal de API Key Regenerada */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-onahau-950/40 backdrop-blur-md p-4">
          <div className="bg-white border border-onahau-300 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-onahau-100 pb-3">
              <h3 className="text-lg font-black text-onahau-950 flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-onahau-600" />
                <span>Nueva API Key Generada</span>
              </h3>
              <button
                onClick={() => copyToClipboard(apiKeyModal.cpp_config_snippet)}
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-onahau-100 hover:bg-onahau-200 text-onahau-800 text-xs font-bold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Snippet'}</span>
              </button>
            </div>
            
            <p className="text-onahau-800 text-xs">
              Se ha emitido una nueva credencial para la estación <strong className="text-onahau-950">{apiKeyModal.id_nodo}</strong>. Reemplázala en <code className="text-onahau-700 font-mono font-bold bg-onahau-50 px-1 py-0.5 rounded">firmware/include/config.h</code> del ESP32.
            </p>
            
            <pre className="font-mono text-xs text-onahau-100 bg-onahau-950 p-4 rounded-xl border border-onahau-800 overflow-x-auto">
              {apiKeyModal.cpp_config_snippet}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setApiKeyModal(null)}
                className="px-6 py-2.5 rounded-xl bg-onahau-500 hover:bg-onahau-600 text-white font-extrabold text-xs shadow-md"
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
