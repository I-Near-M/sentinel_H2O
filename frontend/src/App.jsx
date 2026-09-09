import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { LoginPage } from './components/LoginPage';
import { OpsHeader } from './components/OpsHeader';
import OpsSidebar from './components/OpsSidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { GrafanaEmbeddedView } from './components/GrafanaEmbeddedView';
import EntitiesManagement from './components/EntitiesManagement';
import { UserManagement } from './components/UserManagement';
import NodeManagement from './components/NodeManagement';
import NodeProvisionWizard from './components/NodeProvisionWizard';
import RecipientsManagement from './components/RecipientsManagement';
import WhatIfSimulatorView from './components/WhatIfSimulatorView';
import { AuditManagement } from './components/AuditManagement';
import { SystemSettingsManagement } from './components/SystemSettingsManagement';
import { ProfileModal } from './components/ProfileModal';
import { nodesApi, alertsApi } from './services/api';
import { Droplets } from 'lucide-react';

const VALID_OPS_TABS = [
  'dashboard',
  'entities',
  'users',
  'wizard',
  'nodes',
  'grafana_embed',
  'recipients',
  'simulator',
  'audit',
  'settings'
];

const getInitialOpsTab = () => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && VALID_OPS_TABS.includes(hash)) {
      return hash;
    }
    const stored = localStorage.getItem('sentinel_active_tab');
    if (stored && VALID_OPS_TABS.includes(stored)) {
      return stored;
    }
  }
  return 'dashboard';
};

function OpsConsoleContent() {
  const { isAuthenticated, loading, user, hasRole } = useAuth();
  const [activeOpsTab, setActiveOpsTabState] = useState(getInitialOpsTab);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const setActiveOpsTab = (tab) => {
    if (VALID_OPS_TABS.includes(tab)) {
      setActiveOpsTabState(tab);
      localStorage.setItem('sentinel_active_tab', tab);
      if (typeof window !== 'undefined' && window.location.hash !== `#${tab}`) {
        window.history.replaceState(null, '', `#${tab}`);
      }
    }
  };

  // Sincronizar si el usuario navega con botones de atrás/adelante del navegador
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_OPS_TABS.includes(hash) && hash !== activeOpsTab) {
        setActiveOpsTabState(hash);
        localStorage.setItem('sentinel_active_tab', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeOpsTab]);

  // Asegurar que el hash refleje la pestaña activa inicial
  useEffect(() => {
    if (isAuthenticated && activeOpsTab) {
      localStorage.setItem('sentinel_active_tab', activeOpsTab);
      if (typeof window !== 'undefined' && window.location.hash !== `#${activeOpsTab}`) {
        window.history.replaceState(null, '', `#${activeOpsTab}`);
      }
    }
  }, [isAuthenticated, activeOpsTab]);

  // Validar permisos RBAC y redirigir si el rol no tiene acceso a la pestaña solicitada
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const roleRequirements = {
      entities: ['ADMIN_SISTEMA'],
      users: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
      wizard: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
      recipients: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION'],
      audit: ['ADMIN_SISTEMA'],
      settings: ['ADMIN_SISTEMA'],
    };

    const required = roleRequirements[activeOpsTab];
    if (required && !hasRole(required)) {
      setActiveOpsTab('dashboard');
    }
  }, [isAuthenticated, loading, activeOpsTab, hasRole]);

  const [stats, setStats] = useState({
    totalNodes: 0,
    onlineNodes: 0,
    totalSubscribers: 0,
  });

  const getDynamicGrafanaUrl = () => {
    return '/grafana';
  };

  const getGrafanaSsoUrl = (targetPath = '/grafana/') => {
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('sentinel_token')) || '';
    const redirectTarget = targetPath.startsWith('/grafana') ? targetPath : `/grafana${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;
    return `/api/v1/auth/grafana-sso?token=${encodeURIComponent(token)}&redirect_to=${encodeURIComponent(redirectTarget)}`;
  };

  const grafanaBaseUrl = getDynamicGrafanaUrl();
  const grafanaSsoUrl = getGrafanaSsoUrl('/grafana/');

  const fetchGlobalStats = async () => {
    if (!isAuthenticated) return;
    try {
      const [nodesRes, recRes] = await Promise.all([
        nodesApi.getNodes(),
        alertsApi.getRecipients()
      ]);
      const nodes = nodesRes.data || [];
      const online = nodes.filter(n => n.estado_operativo === 'ONLINE').length;
      setStats({
        totalNodes: nodes.length,
        onlineNodes: online,
        totalSubscribers: (recRes.data || []).length,
      });
    } catch (err) {
      console.error("Error cargando estadísticas de cuenca:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGlobalStats();
    }
  }, [isAuthenticated]);

  // Pantalla de carga mientras se verifica la sesión
  if (loading) {
    return (
      <div className="min-h-screen bg-[#073145] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-cyan-950/80 border border-cyan-500/30 rounded-2xl animate-pulse">
            <Droplets className="w-10 h-10 text-cyan-400" />
          </div>
          <div className="text-sm font-mono text-cyan-200/80 tracking-widest uppercase">
            Cargando Consola Sentinel-H2O...
          </div>
        </div>
      </div>
    );
  }

  // Si no está autenticado, renderizar la pantalla de Login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Usuario autenticado: Consola de Operaciones y Gobernanza Pura
  return (
    <div className="min-h-screen font-sans flex flex-col transition-colors duration-300">
      <OpsHeader 
        onOpenProfile={() => setIsProfileOpen(true)} 
        grafanaUrl={grafanaSsoUrl}
      />

      <div className="flex-1 flex flex-col lg:flex-row p-3 sm:p-5 gap-6 max-w-[1750px] mx-auto w-full">
        {/* Barra lateral con filtrado de roles RBAC y colapso inteligente */}
        <OpsSidebar
          activeOpsTab={activeOpsTab}
          setActiveOpsTab={setActiveOpsTab}
          grafanaUrl={grafanaSsoUrl}
        />

        {/* Espacio de trabajo activo */}
        <main className="flex-1 w-full pb-20 lg:pb-6 overflow-y-auto">
          {activeOpsTab === 'dashboard' && (
            <DashboardOverview
              setActiveTab={setActiveOpsTab}
              grafanaUrl={grafanaSsoUrl}
            />
          )}

          {activeOpsTab === 'grafana_embed' && (
            <GrafanaEmbeddedView
              grafanaBaseUrl={grafanaBaseUrl}
            />
          )}

          {activeOpsTab === 'entities' && hasRole('ADMIN_SISTEMA') && (
            <EntitiesManagement onEntityCreated={fetchGlobalStats} />
          )}

          {activeOpsTab === 'users' && hasRole(['ADMIN_SISTEMA', 'OPERADOR_JUNTA']) && (
            <UserManagement />
          )}

          {activeOpsTab === 'wizard' && hasRole(['ADMIN_SISTEMA', 'OPERADOR_JUNTA']) && (
            <NodeProvisionWizard
              setActiveTab={setActiveOpsTab}
              onNodeCreated={() => {
                fetchGlobalStats();
                setActiveOpsTab('nodes');
              }}
            />
          )}

          {activeOpsTab === 'nodes' && (
            <NodeManagement
              setActiveTab={setActiveOpsTab}
              grafanaUrl={grafanaSsoUrl}
            />
          )}

          {activeOpsTab === 'recipients' && hasRole(['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION']) && (
            <RecipientsManagement />
          )}

          {activeOpsTab === 'simulator' && (
            <WhatIfSimulatorView />
          )}

          {activeOpsTab === 'audit' && hasRole('ADMIN_SISTEMA') && (
            <AuditManagement />
          )}

          {activeOpsTab === 'settings' && hasRole('ADMIN_SISTEMA') && (
            <SystemSettingsManagement />
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
