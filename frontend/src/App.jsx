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
import { ProfileModal } from './components/ProfileModal';
import { nodesApi, alertsApi } from './services/api';
import { Droplets } from 'lucide-react';

const VALID_OPS_TABS = [
  'dashboard',
  'twin3d',
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

const getInitialOpsTab = () => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && VALID_OPS_TABS.includes(hash)) {
      return hash;
    }
    if (hash && GOVERNANCE_HASH_MAP[hash]) {
      return 'governance';
    }
    const stored = localStorage.getItem('sentinel_active_tab');
    if (stored && VALID_OPS_TABS.includes(stored)) {
      return stored;
    }
  }
  return 'dashboard';
};

const getInitialGovSubTab = () => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && GOVERNANCE_HASH_MAP[hash]) {
      return GOVERNANCE_HASH_MAP[hash];
    }
    const stored = localStorage.getItem('sentinel_gov_subtab');
    if (stored) return stored;
  }
  return 'entities';
};

function OpsConsoleContent() {
  const { isAuthenticated, loading, user, hasRole } = useAuth();
  const [activeOpsTab, setActiveOpsTabState] = useState(getInitialOpsTab);
  const [govSubTab, setGovSubTab] = useState(getInitialGovSubTab);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const setActiveOpsTab = (tab, subTab = null) => {
    if (VALID_OPS_TABS.includes(tab)) {
      setActiveOpsTabState(tab);
      localStorage.setItem('sentinel_active_tab', tab);
      if (subTab) {
        setGovSubTab(subTab);
        localStorage.setItem('sentinel_gov_subtab', subTab);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `#${subTab}`);
        }
      } else if (typeof window !== 'undefined' && window.location.hash !== `#${tab}`) {
        window.history.replaceState(null, '', `#${tab}`);
      }
    } else if (GOVERNANCE_HASH_MAP[tab]) {
      setActiveOpsTabState('governance');
      const mappedSub = GOVERNANCE_HASH_MAP[tab];
      setGovSubTab(mappedSub);
      localStorage.setItem('sentinel_active_tab', 'governance');
      localStorage.setItem('sentinel_gov_subtab', mappedSub);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${tab}`);
      }
    }
  };

  // Sincronizar navegación con historial (atrás / adelante)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_OPS_TABS.includes(hash) && hash !== activeOpsTab) {
        setActiveOpsTabState(hash);
        localStorage.setItem('sentinel_active_tab', hash);
      } else if (hash && GOVERNANCE_HASH_MAP[hash]) {
        setActiveOpsTabState('governance');
        setGovSubTab(GOVERNANCE_HASH_MAP[hash]);
        localStorage.setItem('sentinel_active_tab', 'governance');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeOpsTab]);

  // Validar permisos RBAC y redirigir automáticamente
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const roleRequirements = {
      governance: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
      simulator: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
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
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <OpsHeader 
        onOpenProfile={() => setIsProfileOpen(true)} 
      />

      <div className="flex-1 flex flex-col lg:flex-row p-3 sm:p-5 gap-6 max-w-[1850px] mx-auto w-full">
        {/* Barra lateral de los 4 Pilares Operativos con subsecciones desplegables */}
        <OpsSidebar
          activeOpsTab={activeOpsTab}
          setActiveOpsTab={setActiveOpsTab}
          activeGovSubTab={govSubTab}
          setActiveGovSubTab={(sub) => setActiveOpsTab('governance', sub)}
        />

        {/* Espacio de trabajo activo */}
        <main className="flex-1 w-full pb-20 lg:pb-6 overflow-y-auto">
          
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

          {/* PILAR 3: SIMULADOR WHAT-IF (SANDBOX) */}
          {activeOpsTab === 'simulator' && hasRole(['ADMIN_SISTEMA', 'OPERADOR_JUNTA']) && (
            <WhatIfSimulatorView />
          )}

          {/* PILAR 4: GOBERNANZA & CENTRO DE CONTROL UNIFICADO */}
          {activeOpsTab === 'governance' && hasRole(['ADMIN_SISTEMA', 'OPERADOR_JUNTA']) && (
            <GovernanceHub 
              activeSubTab={govSubTab} 
              setActiveSubTab={(sub) => setActiveOpsTab('governance', sub)}
            />
          )}

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
