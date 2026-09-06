import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OpsSidebar from './components/OpsSidebar';
import HeroSection from './components/HeroSection';
import EntitiesManagement from './components/EntitiesManagement';
import NodeManagement from './components/NodeManagement';
import NodeProvisionWizard from './components/NodeProvisionWizard';
import RecipientsManagement from './components/RecipientsManagement';
import WhatIfSimulatorView from './components/WhatIfSimulatorView';
import Footer from './components/Footer';
import { nodesApi, alertsApi } from './services/api';

export default function App() {
  // 'public' (Landing Page) | 'ops' (Console Backoffice & Implementation)
  const [viewMode, setViewMode] = useState('public');
  
  // Pasos dentro de 'ops': 'entities' | 'wizard' | 'nodes' | 'recipients' | 'simulator'
  const [activeOpsTab, setActiveOpsTab] = useState('entities');

  const [stats, setStats] = useState({
    totalNodes: 0,
    onlineNodes: 0,
    totalSubscribers: 0,
    leadTimeMin: 35
  });

  const grafanaUrl = import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000';

  const fetchGlobalStats = async () => {
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
        leadTimeMin: 35
      });
    } catch (err) {
      console.error("Error cargando estadísticas globales:", err);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
  }, [viewMode, activeOpsTab]);

  const handleStartImplementation = (targetTab = 'entities') => {
    setActiveOpsTab(targetTab);
    setViewMode('ops');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3fdfe] text-[#073145] font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* VISTA 1: PORTAL PÚBLICO (LANDING PAGE) */}
      {viewMode === 'public' && (
        <>
          <Navbar setViewMode={setViewMode} />
          
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <HeroSection onStartImplementation={handleStartImplementation} />
          </main>

          <Footer 
            grafanaUrl={grafanaUrl} 
            onStartImplementation={handleStartImplementation} 
          />
        </>
      )}

      {/* VISTA 2: CONSOLA DE OPERACIONES & IMPLEMENTACIÓN (OPS SIDEBAR LAYOUT) */}
      {viewMode === 'ops' && (
        <div className="min-h-screen flex flex-col lg:flex-row p-3 sm:p-5 gap-6 max-w-[1600px] mx-auto w-full">
          {/* Sidebar lateral en escritorio / Barra inferior en móvil */}
          <OpsSidebar 
            activeOpsTab={activeOpsTab}
            setActiveOpsTab={setActiveOpsTab}
            setViewMode={setViewMode}
            grafanaUrl={grafanaUrl}
          />

          {/* Área de Trabajo de Gestión e Implementación */}
          <main className="flex-1 w-full pb-20 lg:pb-6 overflow-y-auto">
            {activeOpsTab === 'entities' && (
              <EntitiesManagement onEntityCreated={fetchGlobalStats} />
            )}

            {activeOpsTab === 'wizard' && (
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
                grafanaUrl={grafanaUrl}
              />
            )}

            {activeOpsTab === 'recipients' && (
              <RecipientsManagement />
            )}

            {activeOpsTab === 'simulator' && (
              <WhatIfSimulatorView />
            )}
          </main>
        </div>
      )}

    </div>
  );
}
