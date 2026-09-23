import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard,
  Box, 
  Cpu, 
  ShieldCheck, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  Radio,
  Bell,
  Droplets,
  X,
  Sparkles,
  TrendingUp,
  Timer,
  Sprout,
  CheckCircle2,
  Activity
} from 'lucide-react';

export default function OpsSidebar({ 
  activeOpsTab, 
  setActiveOpsTab,
  activeGovSubTab = 'entities',
  setActiveGovSubTab,
  activePredSubTab = 'forecast',
  setActivePredSubTab
}) {
  const { hasRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [govAccordionOpen, setGovAccordionOpen] = useState(true);
  const [predAccordionOpen, setPredAccordionOpen] = useState(true);
  const [showMobileGovSheet, setShowMobileGovSheet] = useState(false);
  const [showMobilePredSheet, setShowMobilePredSheet] = useState(false);

  // Las 5 Subsecciones Maestras de Analítica Predictiva & IA
  const predictionsSubItems = [
    { id: 'forecast', label: 'Pronóstico Hídrico 24h & Crecidas', shortLabel: 'Pronóstico 24h', icon: TrendingUp },
    { id: 'leadtime', label: 'Propagación, Lead Time & Dilución', shortLabel: 'Propagación', icon: Timer },
    { id: 'irrigation-demand', label: 'Demanda Hídrica, Mita & ENA', shortLabel: 'Demanda & Mita', icon: Sprout },
    { id: 'crop-suitability', label: 'Aptitud de Cultivos & Sales', shortLabel: 'Aptitud & Sales', icon: CheckCircle2 },
    { id: 'anomalies-mlops', label: 'Anomalías, IoT & MLOps', shortLabel: 'Anomalías & IoT', icon: Activity },
  ];

  // Las 6 Subsecciones Maestras de Gobernanza
  const governanceSubItems = [
    { id: 'entities', label: 'Estructura Institucional', shortLabel: 'Institucional', icon: Building2 },
    { id: 'users', label: 'Usuarios & Roles RBAC', shortLabel: 'Usuarios', icon: Users },
    { id: 'nodes', label: 'Red de Estaciones & Nodos', shortLabel: 'Estaciones', icon: Radio },
    { id: 'alerts', label: 'Alertas & Padrón Multiuso', shortLabel: 'Alertas', icon: Bell },
    { id: 'water', label: 'Cuenca & Marco Hídrico', shortLabel: 'Marco Hídrico', icon: Droplets },
    { id: 'audit', label: 'Auditoría Forense', shortLabel: 'Auditoría', icon: ShieldCheck },
  ];

  // Si se selecciona la pestaña correspondiente, asegurar que el acordeón esté abierto
  useEffect(() => {
    if (activeOpsTab === 'governance') {
      setGovAccordionOpen(true);
    } else if (activeOpsTab === 'predictions') {
      setPredAccordionOpen(true);
    }
  }, [activeOpsTab]);

  // 5 Pilares Arquitectónicos de Sentinel-H2O
  const coreTabs = [
    { 
      id: 'dashboard', 
      label: 'Sala de Situación', 
      desc: 'KPIs 1Hz, Mini-Twin & Despacho', 
      icon: LayoutDashboard, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
    },
    { 
      id: 'twin3d', 
      label: 'Gemelo Digital 3D', 
      desc: 'Three.js WebGL (Macro & Micro)', 
      icon: Box, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'],
      highlight: true
    },
    { 
      id: 'predictions', 
      label: 'Analítica Predictiva & IA', 
      desc: '5 Subsecciones Desplegables', 
      icon: Sparkles, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'],
      hasSubmenu: true
    },
    { 
      id: 'simulator', 
      label: 'Simulador What-If', 
      desc: 'Sandbox, Cascada & Maas-Hoffman', 
      icon: Cpu, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'] 
    },
    { 
      id: 'governance', 
      label: 'Gobernanza & ANA', 
      desc: '6 Subsecciones Desplegables', 
      icon: ShieldCheck, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
      hasSubmenu: true
    }
  ];

  const visibleTabs = coreTabs.filter(tab => hasRole(tab.roles));

  const handleGovSubItemClick = (subId) => {
    if (setActiveGovSubTab) {
      setActiveGovSubTab(subId);
    } else {
      setActiveOpsTab('governance', subId);
    }
    setShowMobileGovSheet(false);
  };

  const handlePredSubItemClick = (subId) => {
    if (setActivePredSubTab) {
      setActivePredSubTab(subId);
    } else {
      setActiveOpsTab('predictions', subId);
    }
    setShowMobilePredSheet(false);
  };

  return (
    <>
      {/* ===================================================================== */}
      {/* SIDEBAR PARA ESCRITORIO (DESKTOP) */}
      {/* ===================================================================== */}
      <aside className={`hidden lg:flex flex-col h-[calc(100vh-5.5rem)] sticky top-20 spatial-sidebar backdrop-blur-md rounded-2xl p-3 justify-between transition-all duration-300 shadow-xl dark:shadow-2xl z-30 ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}>
        {/* Encabezado y Navegación Principal */}
        <div className="space-y-4 overflow-y-auto no-scrollbar pr-1">
          <div className="flex items-center justify-between px-2 py-1">
            {!isCollapsed && (
              <div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase">
                  Módulos Sentinel
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Digital Twin SCADA</p>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mx-auto cursor-pointer"
              title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-1.5">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeOpsTab === tab.id;
              const isGovernance = tab.id === 'governance';
              const isPredictions = tab.id === 'predictions';
              const hasSub = isGovernance || isPredictions;

              return (
                <div key={tab.id} className="space-y-1">
                  {/* Botón Principal del Módulo */}
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                        if (isGovernance) {
                          setActiveOpsTab(tab.id, activeGovSubTab || 'entities');
                          setGovAccordionOpen(true);
                        } else if (isPredictions) {
                          setActiveOpsTab(tab.id, activePredSubTab || 'forecast');
                          setPredAccordionOpen(true);
                        } else {
                          setActiveOpsTab(tab.id);
                        }
                      } else if (isGovernance) {
                        if (isActive) {
                          setGovAccordionOpen(!govAccordionOpen);
                        } else {
                          setActiveOpsTab('governance', activeGovSubTab || 'entities');
                          setGovAccordionOpen(true);
                        }
                      } else if (isPredictions) {
                        if (isActive) {
                          setPredAccordionOpen(!predAccordionOpen);
                        } else {
                          setActiveOpsTab('predictions', activePredSubTab || 'forecast');
                          setPredAccordionOpen(true);
                        }
                      } else {
                        setActiveOpsTab(tab.id);
                      }
                    }}
                    className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group text-left relative cursor-pointer ${
                      isActive 
                        ? tab.id === 'simulator'
                          ? 'bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-500/60 text-violet-900 dark:text-violet-200 shadow-md shadow-violet-500/10 dark:shadow-violet-900/20'
                          : tab.id === 'predictions'
                          ? 'bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/60 text-purple-900 dark:text-purple-200 shadow-md shadow-purple-500/10 dark:shadow-purple-900/20'
                          : 'bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/60 text-cyan-900 dark:text-cyan-200 shadow-md shadow-cyan-500/10 dark:shadow-cyan-950/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                    title={isCollapsed ? tab.label : undefined}
                  >
                    <div className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                      isActive 
                        ? tab.id === 'simulator' 
                          ? 'bg-violet-500 text-white dark:text-slate-950' 
                          : tab.id === 'predictions'
                          ? 'bg-purple-500 text-white dark:text-slate-950'
                          : 'bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-white'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {!isCollapsed && (
                      <div className="ml-3 flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className={`text-xs font-semibold leading-tight ${
                              isActive 
                                ? tab.id === 'predictions' ? 'text-purple-950 dark:text-white font-bold' : 'text-cyan-950 dark:text-white font-bold' 
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {tab.label}
                            </span>
                            {tab.highlight && !isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            )}
                          </div>
                          {hasSub && (
                            <span className="text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors ml-1">
                              {(isGovernance ? govAccordionOpen : predAccordionOpen) ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tab.desc}
                        </p>
                      </div>
                    )}

                    {isActive && !hasSub && (
                      <div className={`absolute right-2 w-1.5 h-6 rounded-full ${
                        tab.id === 'simulator' ? 'bg-violet-400' : 'bg-cyan-500 dark:bg-cyan-400'
                      }`} />
                    )}
                  </button>

                  {/* SUBSECCIONES DESPLEGABLES DE PREDICCIONES (ACCORDION) */}
                  {isPredictions && predAccordionOpen && !isCollapsed && (
                    <div className="pl-3 pr-1 py-1 space-y-1 ml-5 border-l-2 border-slate-200 dark:border-slate-800 animate-fade-in">
                      {predictionsSubItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeOpsTab === 'predictions' && activePredSubTab === sub.id;

                        return (
                          <button
                            key={sub.id}
                            onClick={() => handlePredSubItemClick(sub.id)}
                            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                              isSubActive
                                ? 'bg-purple-500/15 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold border border-purple-400/40 dark:border-purple-500/40 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span className="truncate">{sub.label}</span>
                            {isSubActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 ml-auto flex-shrink-0 animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* SUBSECCIONES DESPLEGABLES DE GOBERNANZA (ACCORDION) */}
                  {isGovernance && govAccordionOpen && !isCollapsed && (
                    <div className="pl-3 pr-1 py-1 space-y-1 ml-5 border-l-2 border-slate-200 dark:border-slate-800 animate-fade-in">
                      {governanceSubItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeOpsTab === 'governance' && activeGovSubTab === sub.id;

                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleGovSubItemClick(sub.id)}
                            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer ${
                              isSubActive
                                ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-400/40 dark:border-cyan-500/40 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span className="truncate">{sub.label}</span>
                            {isSubActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 ml-auto flex-shrink-0 animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie de Barra: Estado de Enlace Celular 2G GPRS (SIM800L) & Telemetría */}
        <div className="border-t border-slate-200 dark:border-slate-800/80 pt-3 space-y-2">
          {!isCollapsed ? (
            <div className="bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">GPRS 2G · SIM800L</span>
                </div>
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">Movistar 2G</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Enlace Celular IoT:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">CSQ 24/31 • Óptimo</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Enlace Celular 2G GPRS (SIM800L Movistar) Activo">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* ===================================================================== */}
      {/* NAVEGACIÓN MÓVIL (BOTTOM BAR) & HOJA DESPLEGABLE */}
      {/* ===================================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-3 z-50 flex justify-around items-center shadow-2xl">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeOpsTab === tab.id;
          const isGovernance = tab.id === 'governance';
          const isPredictions = tab.id === 'predictions';

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isGovernance) {
                  if (isActive) {
                    setShowMobileGovSheet(true);
                  } else {
                    setActiveOpsTab('governance', activeGovSubTab || 'entities');
                    setShowMobileGovSheet(true);
                  }
                } else if (isPredictions) {
                  if (isActive) {
                    setShowMobilePredSheet(true);
                  } else {
                    setActiveOpsTab('predictions', activePredSubTab || 'forecast');
                    setShowMobilePredSheet(true);
                  }
                } else {
                  setActiveOpsTab(tab.id);
                  setShowMobileGovSheet(false);
                  setShowMobilePredSheet(false);
                }
              }}
              className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors cursor-pointer relative ${
                isActive 
                  ? (isPredictions ? 'text-purple-600 dark:text-purple-400' : 'text-cyan-600 dark:text-cyan-400') 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium truncate max-w-[65px]">
                {tab.label.split(' ')[0]}
              </span>
              {(isGovernance || isPredictions) && isActive && (
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                  isPredictions ? 'bg-purple-500 dark:bg-purple-400' : 'bg-cyan-500 dark:bg-cyan-400'
                }`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* MODAL / BOTTOM SHEET MÓVIL PARA SUBSECCIONES DE PREDICCIONES */}
      {showMobilePredSheet && (
        <div className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border-t border-purple-500/40 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Analítica Predictiva & IA</h3>
              </div>
              <button
                onClick={() => setShowMobilePredSheet(false)}
                className="p-1 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seleccione la dimensión analítica predictiva:
            </p>

            <div className="grid grid-cols-1 gap-2 pb-6">
              {predictionsSubItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = activePredSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handlePredSubItemClick(sub.id)}
                    className={`w-full flex items-center space-x-3 p-3.5 rounded-2xl text-xs font-bold transition-all text-left ${
                      isSubActive
                        ? 'bg-purple-500 text-white dark:text-slate-950 shadow-lg shadow-purple-500/20'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET MÓVIL PARA SUBSECCIONES DE GOBERNANZA */}
      {showMobileGovSheet && (
        <div className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border-t border-cyan-500/40 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Gobernanza Institucional</h3>
              </div>
              <button
                onClick={() => setShowMobileGovSheet(false)}
                className="p-1 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seleccione la subsección que desea administrar:
            </p>

            <div className="grid grid-cols-1 gap-2 pb-6">
              {governanceSubItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = activeGovSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleGovSubItemClick(sub.id)}
                    className={`w-full flex items-center space-x-3 p-3.5 rounded-2xl text-xs font-bold transition-all text-left ${
                      isSubActive
                        ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
