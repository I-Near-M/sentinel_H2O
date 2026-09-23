import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { LoginPage } from './components/LoginPage';
import { OpsHeader } from './components/OpsHeader';
import OpsSidebar from './components/OpsSidebar';
import { DashboardOverview } from './components/DashboardOverview';
import ThreeDigitalTwin3D from './components/ThreeDigitalTwin3D';
import WhatIfSimulatorView from './components/WhatIfSimulatorView';
import GovernanceHub from './components/GovernanceHub';
import PredictiveAnalyticsHub from './components/PredictiveAnalyticsHub';
import { ProfileModal } from './components/ProfileModal';
import ErrorBoundary from './components/ErrorBoundary';
import { nodesApi, alertsApi } from './services/api';
import { Droplets } from 'lucide-react';

const VALID_OPS_TABS = [
  'dashboard',
  'twin3d',
  'predictions',
  'simulator',
  'governance'
];

// Mapeo retrocompatible para links directos que apuntan a subsecciones de gobernanza
const GOVERNANCE_HASH_MAP = {
  entities: 'entities',
  users: 'users',
  nodes: 'nodes',
  wizard: 'nodes',
  alerts: 'alerts',
  recipients: 'alerts',
  water: 'water',
  settings: 'water',
  irrigation: 'water',
  audit: 'audit'
};

// Mapeo para links directos que apuntan a subsecciones de analítica predictiva
const PREDICTIONS_HASH_MAP = {
  forecast: 'forecast',
  leadtime: 'leadtime',
  'irrigation-demand': 'irrigation-demand',
  mita: 'irrigation-demand',
  midagri: 'irrigation-demand',
  'crop-suitability': 'crop-suitability',
  crops: 'crop-suitability',
  suitability: 'crop-suitability',
  'anomalies-mlops': 'anomalies-mlops',
  anomalies: 'anomalies-mlops',
  mlops: 'anomalies-mlops'
};

export const parseRoute = (rawHash) => {
  const hash = (rawHash !== undefined 
    ? rawHash 
    : (typeof window !== 'undefined' ? window.location.hash : '')
  ).replace(/^#\/?/, '').trim();

  if (!hash) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sentinel_active_tab');
      if (stored && VALID_OPS_TABS.includes(stored)) {
        const storedGov = localStorage.getItem('sentinel_gov_subtab') || 'entities';
        const storedPred = localStorage.getItem('sentinel_pred_subtab') || 'forecast';
        return {
          tab: stored,
          subTab: stored === 'governance' ? storedGov : (stored === 'predictions' ? storedPred : null)
        };
      }
    }
    return { tab: 'dashboard', subTab: null };
  }

  const parts = hash.split('/');
  const mainPart = parts[0];
  const subPart = parts[1] || null;

  if (VALID_OPS_TABS.includes(mainPart)) {
    if (mainPart === 'governance') {
      const sub = (subPart && GOVERNANCE_HASH_MAP[subPart]) || 
        (typeof window !== 'undefined' ? localStorage.getItem('sentinel_gov_subtab') : null) || 
        'entities';
      return { tab: 'governance', subTab: sub };
    }
    if (mainPart === 'predictions') {
      const sub = (subPart && PREDICTIONS_HASH_MAP[subPart]) || 
        (typeof window !== 'undefined' ? localStorage.getItem('sentinel_pred_subtab') : null) || 
        'forecast';
      return { tab: 'predictions', subTab: sub };
    }
    return { tab: mainPart, subTab: null };
  }

  // Retrocompatibilidad: hashes directos a subsecciones
  if (GOVERNANCE_HASH_MAP[mainPart]) {
    return { tab: 'governance', subTab: GOVERNANCE_HASH_MAP[mainPart] };
  }
  if (PREDICTIONS_HASH_MAP[mainPart]) {
    return { tab: 'predictions', subTab: PREDICTIONS_HASH_MAP[mainPart] };
  }

  return { tab: 'dashboard', subTab: null };
};

export const formatRouteHash = (tab, subTab = null) => {
  if (tab === 'governance') {
    return `#governance/${subTab || 'entities'}`;
  }
  if (tab === 'predictions') {
    return `#predictions/${subTab || 'forecast'}`;
  }
  return `#${tab}`;
};

function OpsConsoleContent() {
  const { isAuthenticated, loading, user, hasRole } = useAuth();
  
  const initialRoute = parseRoute();
  const [activeOpsTab, setActiveOpsTabState] = useState(initialRoute.tab);
  const [govSubTab, setGovSubTab] = useState(
    initialRoute.tab === 'governance' && initialRoute.subTab 
      ? initialRoute.subTab 
      : (typeof window !== 'undefined' ? localStorage.getItem('sentinel_gov_subtab') || 'entities' : 'entities')
  );
  const [predSubTab, setPredSubTab] = useState(
    initialRoute.tab === 'predictions' && initialRoute.subTab 
      ? initialRoute.subTab 
      : (typeof window !== 'undefined' ? localStorage.getItem('sentinel_pred_subtab') || 'forecast' : 'forecast')
  );
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Inicializar entrada en historial de navegación si es la primera carga
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentRoute = parseRoute();
      const currentHash = formatRouteHash(currentRoute.tab, currentRoute.subTab);
      if (!window.history.state || window.history.state.tab !== currentRoute.tab) {
        window.history.replaceState(
          { tab: currentRoute.tab, subTab: currentRoute.subTab },
          '',
          currentHash
        );
      }
    }
  }, []);

  // Sincronizar navegación con el historial del navegador (Atrás / Adelante) sin recargar ni salir de localhost
  useEffect(() => {
    const handlePopState = (event) => {
      const route = event.state && event.state.tab 
        ? event.state 
        : parseRoute(window.location.hash);
      
      const { tab, subTab } = route;
      setActiveOpsTabState(tab);
      localStorage.setItem('sentinel_active_tab', tab);

      if (tab === 'governance') {
        const sub = subTab || 'entities';
        setGovSubTab(sub);
        localStorage.setItem('sentinel_gov_subtab', sub);
      } else if (tab === 'predictions') {
        const sub = subTab || 'forecast';
        setPredSubTab(sub);
        localStorage.setItem('sentinel_pred_subtab', sub);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Navegador centralizado SPA con soporte completo para historial (pushState / replaceState)
  const navigateTo = (tabInput, subTabInput = null, options = { pushHistory: true }) => {
    let resolvedTab = tabInput;
    let resolvedSubTab = subTabInput;

    if (!VALID_OPS_TABS.includes(resolvedTab)) {
      if (GOVERNANCE_HASH_MAP[resolvedTab]) {
        resolvedSubTab = GOVERNANCE_HASH_MAP[resolvedTab];
        resolvedTab = 'governance';
      } else if (PREDICTIONS_HASH_MAP[resolvedTab]) {
        resolvedSubTab = PREDICTIONS_HASH_MAP[resolvedTab];
        resolvedTab = 'predictions';
      } else {
        resolvedTab = 'dashboard';
        resolvedSubTab = null;
      }
    }

    if (resolvedTab === 'governance' && !resolvedSubTab) {
      resolvedSubTab = govSubTab || 'entities';
    } else if (resolvedTab === 'predictions' && !resolvedSubTab) {
      resolvedSubTab = predSubTab || 'forecast';
    }

    // Evitar navegación redundante si ya estamos en la misma pestaña y sub-pestaña
    if (
      resolvedTab === activeOpsTab &&
      ((resolvedTab !== 'governance' && resolvedTab !== 'predictions') ||
        (resolvedTab === 'governance' && resolvedSubTab === govSubTab) ||
        (resolvedTab === 'predictions' && resolvedSubTab === predSubTab))
    ) {
      return;
    }

    setActiveOpsTabState(resolvedTab);
    localStorage.setItem('sentinel_active_tab', resolvedTab);

    if (resolvedTab === 'governance') {
      setGovSubTab(resolvedSubTab);
      localStorage.setItem('sentinel_gov_subtab', resolvedSubTab);
    } else if (resolvedTab === 'predictions') {
      setPredSubTab(resolvedSubTab);
      localStorage.setItem('sentinel_pred_subtab', resolvedSubTab);
    }

    if (typeof window !== 'undefined') {
      const targetHash = formatRouteHash(resolvedTab, resolvedSubTab);
      if (options.pushHistory) {
        window.history.pushState({ tab: resolvedTab, subTab: resolvedSubTab }, '', targetHash);
      } else {
        window.history.replaceState({ tab: resolvedTab, subTab: resolvedSubTab }, '', targetHash);
      }
    }
  };

  const setActiveOpsTab = (tab, subTab = null) => {
    navigateTo(tab, subTab, { pushHistory: true });
  };

  // Validar permisos RBAC y redirigir automáticamente si no tiene acceso
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const roleRequirements = {
      governance: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
      simulator: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
      predictions: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'],
      twin3d: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'],
      dashboard: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR']
    };

    const required = roleRequirements[activeOpsTab];
    if (required && !hasRole(required)) {
      setActiveOpsTab('dashboard');
    }
  }, [isAuthenticated, loading, activeOpsTab, hasRole]);

  // Pantalla de carga mientras se verifica la sesión
  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-mono text-cyan-600 dark:text-cyan-300 tracking-widest uppercase">
            Cargando Consola Sentinel-H2O Digital Twin...
          </div>
        </div>
      </div>
    );
  }

  // Si no está autenticado, renderizar la pantalla de Login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Consola de Operaciones y Gemelo Digital
  return (
    <div className={`min-h-screen ${
      activeOpsTab === 'twin3d' ? 'h-[100dvh] lg:min-h-screen overflow-hidden lg:overflow-visible' : ''
    } bg-transparent text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300`}>
      <OpsHeader 
        onOpenProfile={() => setIsProfileOpen(true)} 
      />

      <div className={`flex-1 flex flex-col lg:flex-row ${
        activeOpsTab === 'twin3d' 
          ? 'p-2 sm:p-3 lg:p-5 gap-3 lg:gap-6 min-h-0 overflow-hidden' 
          : 'p-3 sm:p-5 gap-6'
      } max-w-[1850px] mx-auto w-full`}>
        {/* Barra lateral de los 5 Pilares Operativos con subsecciones desplegables */}
        <OpsSidebar
          activeOpsTab={activeOpsTab}
          setActiveOpsTab={setActiveOpsTab}
          activeGovSubTab={govSubTab}
          setActiveGovSubTab={(sub) => setActiveOpsTab('governance', sub)}
          activePredSubTab={predSubTab}
          setActivePredSubTab={(sub) => setActiveOpsTab('predictions', sub)}
        />

        {/* Espacio de trabajo activo */}
        <main className={`flex-1 w-full min-h-0 ${
          activeOpsTab === 'twin3d'
            ? 'pb-0 lg:pb-0 overflow-hidden flex flex-col'
            : 'pb-20 lg:pb-6 overflow-y-auto'
        }`}>
          <ErrorBoundary onReset={() => setActiveOpsTab('dashboard')}>
            {/* PILAR 1: SALA DE SITUACIÓN */}
            {activeOpsTab === 'dashboard' && (
              <DashboardOverview
                setActiveTab={setActiveOpsTab}
              />
            )}

            {/* PILAR 2: GEMELO DIGITAL 3D (THREE.JS WEBGL) */}
            {activeOpsTab === 'twin3d' && (
              <ThreeDigitalTwin3D 
                onNavigateWhatIf={(nodeId) => setActiveOpsTab('simulator')}
                onNavigateMaintenance={(nodeId) => setActiveOpsTab('governance', 'nodes')}
              />
            )}

            {/* PILAR 3: ANALÍTICA PREDICTIVA & IA */}
            {activeOpsTab === 'predictions' && (
              <PredictiveAnalyticsHub 
                activeSubTab={predSubTab} 
                setActiveSubTab={(sub) => setActiveOpsTab('predictions', sub)}
              />
            )}

            {/* PILAR 4: SIMULADOR WHAT-IF (SANDBOX) */}
            {activeOpsTab === 'simulator' && hasRole(['ADMIN_SISTEMA', 'OPERADOR_JUNTA']) && (
              <WhatIfSimulatorView />
            )}

            {/* PILAR 5: GOBERNANZA & CENTRO DE CONTROL UNIFICADO */}
            {activeOpsTab === 'governance' && hasRole(['ADMIN_SISTEMA', 'OPERADOR_JUNTA']) && (
              <GovernanceHub 
                activeSubTab={govSubTab} 
                setActiveSubTab={(sub) => setActiveOpsTab('governance', sub)}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Modal de Edición de Perfil */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SystemConfigProvider>
        <AuthProvider>
          <OpsConsoleContent />
        </AuthProvider>
      </SystemConfigProvider>
    </ThemeProvider>
  );
}
