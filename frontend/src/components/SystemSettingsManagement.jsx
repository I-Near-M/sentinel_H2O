import React, { useState, useEffect } from 'react';
import { useSystemConfig } from '../context/SystemConfigContext';
import { 
  Settings, Globe2, Save, RefreshCw, Check, AlertCircle
} from 'lucide-react';

export const SystemSettingsManagement = () => {
  const { config, updateConfig, refreshConfig } = useSystemConfig();

  const [formData, setFormData] = useState({
    nombre_cuenca: '',
    pais_region: '',
    descripcion_cuenca: '',
    latitud_centro: -11.49,
    longitud_centro: -77.05,
    zoom_inicial: 10
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
        zoom_inicial: config.zoom_inicial ?? 10
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
            Personaliza el nombre de la cuenca, país y coordenadas de mapa satelital sin modificar el código fuente.
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
