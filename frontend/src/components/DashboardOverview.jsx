import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSystemConfig } from '../context/SystemConfigContext';
import { WatershedMap } from './WatershedMap';
import { nodesApi, alertsApi, weatherApi } from '../services/api';
import { formatTime, formatDate } from '../utils/dateUtils';
import { 
  Activity, Radio, Droplets, ShieldAlert, 
  Building2, PlusCircle, Users, ArrowRight, 
  CheckCircle2, Sparkles, ExternalLink, RefreshCw, 
  Zap, CloudSun, Waves, BarChart3
} from 'lucide-react';

export const DashboardOverview = ({ setActiveTab, grafanaUrl = 'http://localhost:3000' }) => {
  const { user, hasRole } = useAuth();
  const { nombre_cuenca, pais_region } = useSystemConfig();
  
  const [nodes, setNodes] = useState([]);
  const [entities, setEntities] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [nodesRes, entitiesRes, recipientsRes, alertsRes] = await Promise.all([
        nodesApi.getNodes(),
        nodesApi.getEntities(),
        alertsApi.getRecipients(),
        alertsApi.getRecentAlerts(10).catch(() => ({ data: [] })),
      ]);

      const nodesList = nodesRes.data || [];
      setNodes(nodesList);
      setEntities(entitiesRes.data || []);
      setRecipients(recipientsRes.data || []);
      setRecentAlerts(alertsRes.data || []);
    } catch (err) {
      console.error("Error cargando datos de sala de situación:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Conexión WebSocket para telemetría en vivo
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/telemetry/ws/live`;

    let ws = null;
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLiveEvents(prev => [data, ...prev.slice(0, 19)]);
            // Actualizar el nodo correspondiente en la lista local si existe
            setNodes(prevNodes => prevNodes.map(n => {
              if (n.id_nodo === data.id_nodo) {
                return {
                  ...n,
                  wqi_score: data.wqi_score,
                  wqi_categoria: data.wqi_categoria,
                  caudal_m3s: data.caudal_m3s,
                  estado_operativo: 'ONLINE',
                  ultimo_reporte: data.timestamp
                };
              }
              return n;
            }));
          } catch (e) {
            // Mensaje de texto simple (ej. pong)
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
        };

        ws.onclose = () => {
          setWsConnected(false);
          // Reintento automático cada 5 segundos
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
      } catch (err) {
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Métricas calculadas
  const totalNodes = nodes.length;
  const onlineNodes = nodes.filter(n => n.estado_operativo === 'ONLINE' || n.estado === 'ACTIVO').length;
  const totalEntities = entities.length;
  const totalSubscribers = recipients.length;
  
  const totalCaudal = nodes.reduce((acc, n) => acc + (n.caudal_m3s || 0), 0);
  const avgWqi = nodes.length > 0
    ? (nodes.reduce((acc, n) => acc + (n.wqi_score || 75), 0) / nodes.length).toFixed(1)
    : '--';

  const isFirstDeploy = totalEntities === 0 || totalNodes === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner de Bienvenida y Estado del Sistema */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {wsConnected ? 'TELEMETRÍA EN VIVO ACTIVA' : 'SALA DE SITUACIÓN CONECTADA'}
            </span>
            <span className="text-xs text-slate-500 dark:text-cyan-200/60 font-mono">
              {nombre_cuenca ? `${nombre_cuenca} (${pais_region})` : 'Cuenca Hídrica'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Sala de Situación & Gobernanza Hídrica
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Monitoreo en tiempo real de la calidad del agua (WQI), niveles hidrométricos, caudales y alertas tempranas para las Juntas de Usuarios y Comisiones de Regantes.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {hasRole('ADMIN_SISTEMA') && totalEntities === 0 && (
            <button
              onClick={() => setActiveTab('entities')}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>1. Registrar Entidad Gestora</span>
            </button>
          )}

          {hasRole(['ADMIN_SISTEMA', 'OPERADOR_JUNTA']) && (
            <button
              onClick={() => setActiveTab('wizard')}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Aprovisionar Estación</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('grafana_embed')}
            className="px-4 py-2.5 bg-slate-100 dark:bg-cyan-950/60 hover:bg-slate-200 dark:hover:bg-cyan-900/60 border border-slate-300 dark:border-cyan-500/30 text-slate-800 dark:text-cyan-300 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Gemelo Virtual Grafana</span>
          </button>
        </div>
      </div>

      {/* CHECKLIST DE ONBOARDING INICIAL (Si no hay datos registrados) */}
      {isFirstDeploy && (
        <div className="spatial-card p-6 bg-gradient-to-br from-amber-500/10 via-cyan-500/10 to-transparent border border-amber-500/30 rounded-2xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Guía de Puesta en Marcha ({nombre_cuenca || 'Primer Despliegue'})
              </h3>
              <p className="text-xs text-slate-600 dark:text-amber-200/80">
                La base de datos se encuentra limpia. Sigue los 4 pasos esenciales para dejar el gemelo virtual operativo:
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Paso 1 */}
            <div className={`p-4 rounded-xl border transition-all ${
              totalEntities > 0 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-slate-50 dark:bg-[#061821] border-slate-200 dark:border-cyan-900/60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Paso 1 · Estructura
                </span>
                {totalEntities > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Entidades Gestoras</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Registra la Junta de Usuarios o Comisión de Regantes de {nombre_cuenca || 'la cuenca'}.
              </p>
              {totalEntities === 0 && hasRole('ADMIN_SISTEMA') && (
                <button
                  onClick={() => setActiveTab('entities')}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Crear Entidad</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Paso 2 */}
            <div className={`p-4 rounded-xl border transition-all ${
              totalNodes > 0 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-slate-50 dark:bg-[#061821] border-slate-200 dark:border-cyan-900/60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Paso 2 · Hardware IoT
                </span>
                {totalNodes > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Aprovisionar Estación</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Configura los sensores ESP32, coordenadas GPS y aforadores hidráulicos.
              </p>
              {totalNodes === 0 && (
                <button
                  onClick={() => setActiveTab('wizard')}
                  disabled={totalEntities === 0}
                  className={`text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    totalEntities > 0 ? 'text-cyan-400 hover:text-cyan-300' : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Abrir Wizard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Paso 3 */}
            <div className={`p-4 rounded-xl border transition-all ${
              totalSubscribers > 0 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-slate-50 dark:bg-[#061821] border-slate-200 dark:border-cyan-900/60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Paso 3 · Alertas WhatsApp
                </span>
                {totalSubscribers > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Padrón de Regantes</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Agrega números móviles de tomeros y presidentes para alertas críticas.
              </p>
              {totalSubscribers === 0 && (
                <button
                  onClick={() => setActiveTab('recipients')}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ir al Padrón</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Paso 4 */}
            <div className="p-4 rounded-xl border bg-slate-50 dark:bg-[#061821] border-slate-200 dark:border-cyan-900/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Paso 4 · Visualización
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Gemelo en Grafana</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Visualiza hidrogramas, correlaciones electroquímicas y mapas térmicos.
              </p>
              <button
                onClick={() => setActiveTab('grafana_embed')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Dashboards</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TARJETAS DE KPIS Y MÉTRICAS GLOBALES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Estaciones Activas */}
        <div className="spatial-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estaciones de Campo
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {onlineNodes}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              / {totalNodes} en línea
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-cyan-200/70 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${onlineNodes > 0 ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            <span>{totalNodes === 0 ? '0 estaciones registradas' : `${((onlineNodes / totalNodes) * 100).toFixed(0)}% operativas`}</span>
          </div>
        </div>

        {/* KPI 2: Caudal Total Estimado */}
        <div className="spatial-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Caudal Total Monitoreado
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-teal-400 font-mono">
              {totalCaudal.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              m³/s
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-teal-200/70">
            Aforo hidráulico automatizado
          </div>
        </div>

        {/* KPI 3: Calidad de Agua Promedio WQI */}
        <div className="spatial-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Índice Calidad WQI
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-emerald-400 font-mono">
              {avgWqi}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              / 100 pts
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-emerald-200/70">
            {parseFloat(avgWqi) >= 70 ? 'Calidad Buena / Apta Riego' : 'Supervisión Continua'}
          </div>
        </div>

        {/* KPI 4: Regantes y Alertas */}
        <div className="spatial-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Regantes & Tomeros
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-purple-300 font-mono">
              {totalSubscribers}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              suscritos
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-purple-200/70">
            Difusión WhatsApp activa
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: MAPA GEOESPACIAL + FEED EN VIVO */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* MAPA INTERACTIVO NATIVO LEAFLET */}
        <div className="lg:col-span-2 spatial-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Mapa Satelital de {nombre_cuenca || 'la Cuenca'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-cyan-200/70">
                  Ubicación de estaciones telemétricas con pulsos de estado WQI en vivo
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('nodes')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-cyan-950/40 hover:bg-slate-200 dark:hover:bg-cyan-900/60 border border-slate-300 dark:border-cyan-500/30 text-slate-800 dark:text-cyan-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Directorio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <WatershedMap
            nodes={nodes}
            onSelectNode={() => setActiveTab('nodes')}
            className="h-[460px] w-full"
          />
        </div>

        {/* FEED EN TIEMPO REAL & ALERTAS RECIENTES */}
        <div className="spatial-card p-4 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Eventos en Vivo
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                WS STREAM
              </span>
            </div>

            {/* Lista de Eventos / Telemetrías recientes */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {liveEvents.length === 0 && recentAlerts.length === 0 && (
                <div className="text-center py-10 space-y-2 text-slate-400">
                  <Radio className="w-8 h-8 mx-auto text-slate-500/60" />
                  <p className="text-xs font-mono">Esperando paquetes de telemetría de campo...</p>
                  <p className="text-[10px] text-slate-500">
                    Las mediciones transmitidas por ESP32 aparecerán instantáneamente aquí.
                  </p>
                </div>
              )}

              {/* Eventos WebSocket en vivo */}
              {liveEvents.map((evt, idx) => (
                <div
                  key={`live-${idx}-${evt.id_proc || idx}`}
                  className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-1 animate-slide-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">{evt.id_nodo}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatTime(evt.timestamp)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 text-cyan-200">
                    <div>WQI: <strong className="text-white">{evt.wqi_score}</strong></div>
                    <div>pH: <strong className="text-white">{evt.ph}</strong></div>
                    <div>Q: <strong className="text-white">{evt.caudal_m3s} m³/s</strong></div>
                  </div>
                  {evt.alerta_disparada && (
                    <div className="text-[10px] text-amber-300 font-bold pt-1 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      <span>{evt.alerta_info?.tipo_evento || 'Alerta de Umbral Superado'}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Alertas Recientes históricas */}
              {recentAlerts.slice(0, 4).map((alert, idx) => (
                <div
                  key={`alert-${alert.id_alerta || idx}`}
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      {alert.tipo_evento}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2">
                    {alert.mensaje_campesino_whatsapp || alert.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer del feed */}
          <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[11px] text-slate-400">
            <span>Servidor Backend Activo</span>
            <button
              onClick={loadData}
              className="hover:text-cyan-400 flex items-center gap-1 cursor-pointer font-bold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refrescar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
