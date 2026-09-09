import React, { useState, useEffect } from 'react';
import { useSystemConfig } from '../context/SystemConfigContext';
import { 
  Settings, Globe2, MapPin, Layers, Plus, 
  Trash2, Save, RefreshCw, Check, AlertCircle, 
  BarChart3, Sparkles, Compass, Lock, ShieldCheck
} from 'lucide-react';

const SYSTEM_DASHBOARD_UIDS = [
  'sentinel-01-cuenca',
  'sentinel-02-nodo-detalle',
  'sentinel-03-ia-predicciones',
  'sentinel-04-balance-volumen',
  'sentinel-05-clima-hidrologia',
  'sentinel-06-iot-energia-red',
];

export const SystemSettingsManagement = () => {
  const { config, updateConfig, refreshConfig } = useSystemConfig();

  const [formData, setFormData] = useState({
    nombre_cuenca: '',
    pais_region: '',
    descripcion_cuenca: '',
    latitud_centro: -11.49,
    longitud_centro: -77.05,
    zoom_inicial: 10,
    dashboards_grafana: []
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (config) {
      setFormData({
        nombre_cuenca: config.nombre_cuenca || 'Cuenca Chancay-Huaral',
        pais_region: config.pais_region || 'Lima, Perú',
        descripcion_cuenca: config.descripcion_cuenca || '',
        latitud_centro: config.latitud_centro ?? -11.49,
        longitud_centro: config.longitud_centro ?? -77.05,
        zoom_inicial: config.zoom_inicial ?? 10,
        dashboards_grafana: config.dashboards_grafana ? [...config.dashboards_grafana] : []
      });
    }
  }, [config]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleDashboardChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.dashboards_grafana];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, dashboards_grafana: updated };
    });
  };

  const handleAddDashboard = () => {
    setFormData(prev => ({
      ...prev,
      dashboards_grafana: [
        ...prev.dashboards_grafana,
        {
          uid: `sentinel-${prev.dashboards_grafana.length + 1}-custom`,
          label: `Nuevo Tablero (${prev.dashboards_grafana.length + 1})`,
          desc: 'Descripción del nuevo tablero de telemetría',
          icon: 'BarChart3'
        }
      ]
    }));
  };

  const handleRemoveDashboard = (index) => {
    const target = formData.dashboards_grafana[index];
    if (target && SYSTEM_DASHBOARD_UIDS.includes(target.uid)) {
      alert("Los tableros base del sistema no pueden ser eliminados ya que forman parte del núcleo de telemetría.");
      return;
    }
    if (formData.dashboards_grafana.length <= 1) {
      alert("Debe existir al menos un tablero de Grafana configurado.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      dashboards_grafana: prev.dashboards_grafana.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await updateConfig(formData);
      setSuccessMsg('¡Configuración de cuenca y tableros actualizada exitosamente!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setErrorMsg(err.response?.data?.detail || 'Error al guardar la configuración del sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Settings className="w-3.5 h-3.5 text-cyan-500" />
            <span>Parámetros Globales & Open Source</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Ajustes del Sistema & Identidad de Cuenca
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Personaliza el nombre de la cuenca, país, coordenadas de mapa satelital y lista de tableros de Grafana sin modificar el código fuente.
          </p>
        </div>

        <button
          onClick={refreshConfig}
          disabled={loading}
          className="p-3 rounded-2xl bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-cyan-900/60 transition-all shadow-sm self-start md:self-auto cursor-pointer"
          title="Recargar configuración"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
        </button>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BLOQUE 1: IDENTIDAD DE CUENCA */}
        <div className="spatial-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
            <Globe2 className="w-5 h-5 text-cyan-500" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              1. Identidad Hidrográfica y Geográfica
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre de la Cuenca / Recurso Hídrico *
              </label>
              <input
                type="text"
                name="nombre_cuenca"
                required
                value={formData.nombre_cuenca}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                placeholder="ej: Cuenca Chancay-Huaral, Río Ebro, etc."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                País / Departamento / Región *
              </label>
              <input
                type="text"
                name="pais_region"
                required
                value={formData.pais_region}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                placeholder="ej: Lima, Perú"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Descripción Institucional de la Cuenca
              </label>
              <textarea
                rows={2}
                name="descripcion_cuenca"
                value={formData.descripcion_cuenca}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                placeholder="Breve descripción para la cabecera y reportes oficiales..."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-cyan-900/60">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Latitud Centro GPS</label>
              <input
                type="number"
                step="0.0001"
                name="latitud_centro"
                value={formData.latitud_centro}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Longitud Centro GPS</label>
              <input
                type="number"
                step="0.0001"
                name="longitud_centro"
                value={formData.longitud_centro}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Zoom Inicial Mapa</label>
              <input
                type="number"
                min="1"
                max="18"
                name="zoom_inicial"
                value={formData.zoom_inicial}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: TABLEROS DE GRAFANA DINÁMICOS */}
        <div className="spatial-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-500" />
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  2. Tableros de Grafana Vinculados
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configura los UIDs y nombres de los tableros accesibles en el Gemelo Virtual
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddDashboard}
              className="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Tablero</span>
            </button>
          </div>

          <div className="space-y-3">
            {formData.dashboards_grafana.map((dash, index) => {
              const isSystem = SYSTEM_DASHBOARD_UIDS.includes(dash.uid);

              return (
                <div
                  key={dash.uid || index}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSystem 
                      ? 'bg-slate-50/80 dark:bg-[#061821]/80 border-slate-200 dark:border-cyan-900/40'
                      : 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30'
                  }`}
                >
                  <div className="grid sm:grid-cols-3 gap-3 flex-1 w-full">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">UID Grafana</label>
                        {isSystem ? (
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            <Lock className="w-2.5 h-2.5" /> Base Sistema
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Sparkles className="w-2.5 h-2.5" /> Personalizado
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        disabled={isSystem}
                        value={dash.uid}
                        onChange={(e) => handleDashboardChange(index, 'uid', e.target.value)}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold ${
                          isSystem
                            ? 'bg-slate-100 dark:bg-[#041219] border-slate-200 dark:border-cyan-950 text-cyan-600 dark:text-cyan-400 cursor-not-allowed opacity-85'
                            : 'bg-white dark:bg-[#072433] border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                        }`}
                        title={isSystem ? 'UID vinculado permanentemente al aprovisionamiento base de Grafana' : 'UID del nuevo dashboard en Grafana'}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título Visible</label>
                      <input
                        type="text"
                        required
                        value={dash.label}
                        onChange={(e) => handleDashboardChange(index, 'label', e.target.value)}
                        className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:border-cyan-500"
                        placeholder="ej: 01 · Sala de Control..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción</label>
                      <input
                        type="text"
                        value={dash.desc}
                        onChange={(e) => handleDashboardChange(index, 'desc', e.target.value)}
                        className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:border-cyan-500"
                        placeholder="Descripción breve..."
                      />
                    </div>
                  </div>

                  {isSystem ? (
                    <div 
                      className="p-2 text-slate-400 dark:text-slate-600 rounded-lg cursor-not-allowed self-end sm:self-center flex items-center justify-center opacity-60"
                      title="Tablero base del sistema no eliminable"
                    >
                      <Lock className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveDashboard(index)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer self-end sm:self-center"
                      title="Eliminar tablero personalizado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón de Guardar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Guardando Ajustes...' : 'Guardar Configuración Global'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
