import React, { createContext, useContext, useState, useEffect } from 'react';
import { systemApi } from '../services/api';

const DEFAULT_CONFIG = {
  nombre_cuenca: '',
  pais_region: '',
  descripcion_cuenca: 'Gemelo Digital de Seguridad Hídrica y Gobernanza',
  latitud_centro: -11.49,
  longitud_centro: -77.05,
  zoom_inicial: 10,
};

const SystemConfigContext = createContext(null);

export const SystemConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await systemApi.getConfig();
      if (res.data) {
        setConfig(res.data);
      }
    } catch (err) {
      console.warn('Usando configuración de cuenca por defecto:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    const handleConfigRefresh = () => fetchConfig();
    window.addEventListener('system:config_updated', handleConfigRefresh);
    window.addEventListener('auth:login_success', handleConfigRefresh);
    return () => {
      window.removeEventListener('system:config_updated', handleConfigRefresh);
      window.removeEventListener('auth:login_success', handleConfigRefresh);
    };
  }, []);

  const updateConfig = async (newConfigData) => {
    const res = await systemApi.updateConfig(newConfigData);
    if (res.data) {
      setConfig(res.data);
      window.dispatchEvent(new CustomEvent('system:config_updated', { detail: res.data }));
    }
    return res.data;
  };

  const value = {
    config,
    loading,
    refreshConfig: fetchConfig,
    updateConfig,
    nombre_cuenca: config.nombre_cuenca || DEFAULT_CONFIG.nombre_cuenca,
    pais_region: config.pais_region || DEFAULT_CONFIG.pais_region,
    latitud_centro: config.latitud_centro ?? DEFAULT_CONFIG.latitud_centro,
    longitud_centro: config.longitud_centro ?? DEFAULT_CONFIG.longitud_centro,
    zoom_inicial: config.zoom_inicial ?? DEFAULT_CONFIG.zoom_inicial,
  };

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig debe ser utilizado dentro de un SystemConfigProvider');
  }
  return context;
};
