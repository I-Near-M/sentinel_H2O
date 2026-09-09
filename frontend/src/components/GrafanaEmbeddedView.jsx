import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSystemConfig } from '../context/SystemConfigContext';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, ExternalLink, RefreshCw, Maximize2, 
  Minimize2, Clock, Layers, Sparkles, Info, 
  Radio, Cpu, Waves, CloudSun, Activity, Shield 
} from 'lucide-react';

export const GrafanaEmbeddedView = ({ grafanaBaseUrl = 'http://localhost:3000' }) => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { dashboards_grafana, nombre_cuenca } = useSystemConfig();

  const dashboardsList = (dashboards_grafana && dashboards_grafana.length > 0)
    ? dashboards_grafana
    : [
        {
          uid: 'sentinel-01-cuenca',
          label: '01 · Sala de Control & Gemelo Cuenca',
          desc: 'Visión integral, WQI y caudales por sector',
        }
      ];

  const [selectedUid, setSelectedUidState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sentinel_grafana_dashboard_uid');
      if (stored) return stored;
    }
    return dashboardsList[0]?.uid || 'sentinel-01-cuenca';
  });

  const setSelectedUid = (uid) => {
    setSelectedUidState(uid);
    localStorage.setItem('sentinel_grafana_dashboard_uid', uid);
  };

  const [timeRange, setTimeRange] = useState('now-24h');
  const [refreshInterval, setRefreshInterval] = useState('30s');
  const [isKiosk, setIsKiosk] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Asegurarse de que selectedUid sea válido si la lista cambia
  useEffect(() => {
    if (dashboardsList.length > 0 && !dashboardsList.some(d => d.uid === selectedUid)) {
      setSelectedUid(dashboardsList[0].uid);
    }
  }, [dashboardsList, selectedUid]);

  // Normalizar URL base
  const cleanBaseUrl = grafanaBaseUrl.replace(/\/$/, '');

  // URL del iframe de Grafana con parámetros de kiosk, tema y refresco
  const grafanaTheme = isDark ? 'dark' : 'light';
  const kioskParam = isKiosk ? '&kiosk' : '';
  const refreshParam = refreshInterval ? `&refresh=${refreshInterval}` : '';
  
  // URL exacta del dashboard seleccionado
  const iframeSrc = `${cleanBaseUrl}/d/${selectedUid}?orgId=1&from=${timeRange}&to=now${refreshParam}&theme=${grafanaTheme}${kioskParam}`;
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('sentinel_token')) || '';
  const directHref = `${cleanBaseUrl}/d/${selectedUid}?orgId=1&from=${timeRange}&to=now`;
  const externalHref = `/api/v1/auth/grafana-sso?token=${encodeURIComponent(token)}&redirect_to=${encodeURIComponent(directHref)}`;

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const currentDashboard = dashboardsList.find(d => d.uid === selectedUid) || dashboardsList[0];

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#051c27] p-4 flex flex-col' : ''}`}>
      {/* Barra de Control y Filtros */}
      <div className="spatial-card p-4 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Gemelo Virtual en Grafana
                </h2>
                {user ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                    SSO: {user.rol === 'ADMIN_SISTEMA' ? 'ADMIN' : user.rol === 'OPERADOR_JUNTA' ? 'EDITOR' : 'VISOR'}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    VISOR ANÓNIMO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-cyan-200/70">
                {currentDashboard.desc}
              </p>
            </div>
          </div>

          {/* Opciones Rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Tablero */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <Layers className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
              <select
                value={selectedUid}
                onChange={(e) => setSelectedUid(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-cyan-200 focus:outline-none cursor-pointer max-w-[220px] truncate"
              >
                {dashboardsList.map((d) => (
                  <option key={d.uid} value={d.uid} className="bg-[#072433] text-white">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Rango Temporal */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl p-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
              <button
                onClick={() => setTimeRange('now-6h')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'now-6h' 
                    ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-cyan-400'
                }`}
              >
                6h
              </button>
              <button
                onClick={() => setTimeRange('now-24h')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'now-24h' 
                    ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-cyan-400'
                }`}
              >
                24h
              </button>
              <button
                onClick={() => setTimeRange('now-7d')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'now-7d' 
                    ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-cyan-400'
                }`}
              >
                7d
              </button>
              <button
                onClick={() => setTimeRange('now-30d')}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'now-30d' 
                    ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-cyan-400'
                }`}
              >
                30d
              </button>
            </div>

            {/* Selector de Auto-Refresco */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 dark:text-cyan-200 focus:outline-none cursor-pointer"
              >
                <option value="10s" className="bg-[#072433] text-white">10s</option>
                <option value="30s" className="bg-[#072433] text-white">30s</option>
                <option value="1m" className="bg-[#072433] text-white">1m</option>
                <option value="5m" className="bg-[#072433] text-white">5m</option>
                <option value="" className="bg-[#072433] text-white">Pausa</option>
              </select>
            </div>

            {/* Toggle Kiosk */}
            <button
              onClick={() => setIsKiosk(!isKiosk)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isKiosk
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-500 dark:text-cyan-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
              title="Ocultar o mostrar barra de navegación de Grafana"
            >
              Kiosko: {isKiosk ? 'ON' : 'OFF'}
            </button>

            {/* Botón de Ayuda / Credenciales Grafana */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showInfo 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' 
                  : 'border-slate-300 dark:border-cyan-900/60 text-slate-500 dark:text-slate-400 hover:text-amber-400'
              }`}
              title="Información de acceso y credenciales de Grafana"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Pantalla Completa */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl border border-slate-300 dark:border-cyan-900/60 hover:bg-slate-100 dark:hover:bg-cyan-950/40 text-slate-600 dark:text-cyan-400 transition-all cursor-pointer"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Abrir en Pestaña Externa */}
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Grafana Pro</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Panel Desplegable de Ayuda sobre Autenticación Grafana */}
        {showInfo && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2 text-slate-800 dark:text-amber-200/90 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
              <Shield className="w-4 h-4" />
              <span>Gobernanza de Acceso a Grafana (Sentinel-H2O vs Grafana Auth)</span>
            </div>
            <p className="leading-relaxed">
              <strong>1. Visualización Abierta (Viewer)</strong>: Los tableros cuentan con acceso anónimo habilitado para que los operadores y regantes puedan consultar el gemelo virtual sin iniciar sesión adicionalmente en Grafana.
            </p>
            <p className="leading-relaxed">
              <strong>2. Edición Avanzada de Tableros (Admin Grafana)</strong>: El usuario creado en la Consola de Gobernación administra la plataforma y la base de datos MySQL. Si necesitas editar las consultas SQL de Grafana o crear nuevos paneles en Grafana Pro, debes iniciar sesión en Grafana con el usuario maestro: <code className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-amber-400 font-bold">admin</code> y la contraseña definida en tu docker-compose/env: <code className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-amber-400 font-bold">sentinel_admin_2026</code>.
            </p>
          </div>
        )}
      </div>

      {/* Contenedor Iframe */}
      <div className={`spatial-card overflow-hidden border border-cyan-500/30 relative ${isFullscreen ? 'flex-1 h-full' : 'h-[calc(100vh-14rem)] min-h-[620px]'}`}>
        <iframe
          src={iframeSrc}
          title={`Sentinel-H2O - ${currentDashboard.label}`}
          className="w-full h-full border-0 rounded-2xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
        />
      </div>
    </div>
  );
};
