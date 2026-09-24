import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard,
  Building2, 
  PlusCircle, 
  Radio, 
  Users, 
  Cpu, 
  BarChart3, 
  ExternalLink, 
  ShieldAlert, 
  UserCog,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Activity,
  Sparkles,
  Server,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export default function OpsSidebar({ 
  activeOpsTab, 
  setActiveOpsTab,
  grafanaUrl = 'http://localhost:3000'
}) {
  const { hasRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Arquitectura de información estructurada en 4 dominios operativos con iconos de sección
  const navigationSections = [
    {
      id: 'monitoring',
      title: 'Monitoreo & Operación',
      icon: Activity,
      items: [
        { 
          id: 'dashboard', 
          label: 'Sala de Situación', 
          desc: 'KPIs, Mapa y Feed en Vivo', 
          icon: LayoutDashboard, 
          roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
        },
        { 
          id: 'nodes', 
          label: 'Directorio de Nodos', 
          desc: 'Telemetría y Estado en Vivo', 
          icon: Radio, 
          roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
        },
        { 
          id: 'recipients', 
          label: 'Padrón de Regantes', 
          desc: 'Alertas WhatsApp & Tomeros', 
          icon: Users, 
          roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION'] 
        },
      ]
    },
    {
      id: 'analytics',
      title: 'Análisis & Modelación',
      icon: Sparkles,
      items: [
        { 
          id: 'simulator', 
          label: 'Simulador IA & What-If', 
          desc: 'Tiempos de Viaje & Escenarios', 
          icon: Cpu, 
          roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
        },
        { 
          id: 'grafana_embed', 
          label: 'Gemelo Digital', 
          desc: 'Visualización In-App', 
          icon: BarChart3, 
          roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
        },
      ]
    },
    {
      id: 'infrastructure',
      title: 'Infraestructura & IoT',
      icon: Server,
      items: [
        { 
          id: 'wizard', 
          label: 'Aprovisionar Estación', 
          desc: 'Wizard & Firmware ESP32', 
          icon: PlusCircle, 
          roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
          badge: 'Nuevo'
        },
      ]
    },
    {
      id: 'governance',
      title: 'Gobernanza & Sistema',
      icon: ShieldCheck,
      items: [
        { 
          id: 'entities', 
          label: 'Entidades Gestoras', 
          desc: 'Juntas, ANA y Comisiones', 
          icon: Building2, 
          roles: ['ADMIN_SISTEMA'] 
        },
        { 
          id: 'users', 
          label: 'Usuarios & Accesos', 
          desc: 'Control de Roles RBAC', 
          icon: UserCog, 
          roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'] 
        },
        { 
          id: 'audit', 
          label: 'Auditoría Forense', 
          desc: 'Trazabilidad y Snapshots', 
          icon: ShieldAlert, 
          roles: ['ADMIN_SISTEMA'] 
        },
        { 
          id: 'settings', 
          label: 'Ajustes de Cuenca', 
          desc: 'Identidad y Parámetros', 
          icon: Settings, 
          roles: ['ADMIN_SISTEMA'] 
        },
      ]
    }
  ];

  // Control de estado de secciones desplegables (Acordeón)
  const [openSections, setOpenSections] = useState(() => {
    return {
      monitoring: true,
      analytics: true,
      infrastructure: activeOpsTab === 'wizard',
      governance: ['entities', 'users', 'audit', 'settings'].includes(activeOpsTab),
    };
  });

  // Asegurar que si la pestaña activa cambia externamente, su sección padre se despliegue automáticamente
  useEffect(() => {
    const parentSection = navigationSections.find(sec =>
      sec.items.some(item => item.id === activeOpsTab)
    );
    if (parentSection) {
      setOpenSections(prev => {
        if (!prev[parentSection.id]) {
          return { ...prev, [parentSection.id]: true };
        }
        return prev;
      });
    }
  }, [activeOpsTab]);

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Filtrado reactivo por permisos RBAC
  const visibleSections = navigationSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => hasRole(item.roles))
    }))
    .filter(section => section.items.length > 0);

  // Lista plana de pestañas visibles
  const visibleTabs = visibleSections.flatMap(section => section.items);

  // Accesos directos principales para la barra inferior en móvil (máx 4)
  const mobilePrimaryIds = ['dashboard', 'nodes', 'recipients', 'simulator'];
  const mobilePrimaryTabs = visibleTabs.filter(tab => mobilePrimaryIds.includes(tab.id)).slice(0, 4);
  const isCurrentTabInMobilePrimary = mobilePrimaryTabs.some(tab => tab.id === activeOpsTab);

  return (
    <>
      {/* ======================================================== */}
      {/* SIDEBAR PARA ESCRITORIO (DESKTOP)                        */}
      {/* ======================================================== */}
      <aside 
        className={`hidden lg:flex flex-col h-[calc(100vh-5.5rem)] sticky top-20 spatial-sidebar rounded-2xl p-3 justify-between transition-all duration-300 shadow-xl ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Encabezado del Menú con Botón de Colapso */}
          <div className="flex items-center justify-between px-2 pb-2.5 border-b border-cyan-500/20 flex-shrink-0">
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  Navegación Cuenca
                </span>
              </div>
            ) : (
              <div className="mx-auto">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse block" />
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-500 dark:text-cyan-400 transition-all cursor-pointer ${
                isCollapsed ? 'mt-1' : ''
              }`}
              title={isCollapsed ? "Expandir barra lateral" : "Colapsar a modo compacto"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Lista de Navegación Organizada en Secciones Desplegables */}
          <div className="flex-1 overflow-y-auto space-y-2.5 my-2 pr-1 custom-scrollbar">
            {visibleSections.map((section, sIdx) => {
              const SectionIcon = section.icon;
              const isOpen = !!openSections[section.id];
              const containsActiveTab = section.items.some(item => item.id === activeOpsTab);

              return (
                <div key={section.id} className="space-y-1">
                  {/* Encabezado Desplegable (Modo Expandido) */}
                  {!isCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all cursor-pointer group select-none ${
                        containsActiveTab && !isOpen
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300'
                          : 'hover:bg-slate-200/60 dark:hover:bg-cyan-950/40 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SectionIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                          containsActiveTab 
                            ? 'text-cyan-500' 
                            : 'text-slate-400 dark:text-cyan-400/70 group-hover:text-cyan-500'
                        }`} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider truncate">
                          {section.title}
                        </span>
                        {/* Indicador si la sección contiene la pestaña activa y está cerrada */}
                        {containsActiveTab && !isOpen && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200/80 dark:bg-[#061821] text-slate-500 dark:text-cyan-400/70 border border-slate-300/60 dark:border-cyan-500/20">
                          {section.items.length}
                        </span>
                        <ChevronDown 
                          className={`w-3.5 h-3.5 text-slate-400 dark:text-cyan-400/60 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-cyan-500' : ''
                          }`}
                        />
                      </div>
                    </button>
                  ) : (
                    // Separador sutil en modo colapsado
                    sIdx > 0 && <div className="w-8 h-px bg-cyan-500/20 mx-auto my-1.5" />
                  )}

                  {/* Subsecciones (Opciones) Desplegables */}
                  {(!isCollapsed ? isOpen : true) && (
                    <div className={`${!isCollapsed ? 'pl-2.5 ml-2.5 border-l-2 border-slate-200 dark:border-cyan-500/20 space-y-1' : 'space-y-1'}`}>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeOpsTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveOpsTab(item.id)}
                            title={isCollapsed ? `${item.label} • ${item.desc}` : undefined}
                            className={`w-full flex items-center rounded-xl transition-all cursor-pointer group ${
                              isCollapsed ? 'justify-center p-2.5' : 'space-x-2.5 px-2 py-1.5 text-left'
                            } ${
                              isActive
                                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-cyan-950/40 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-transform group-hover:scale-105 ${
                              isActive
                                ? 'bg-slate-950/20 text-slate-950'
                                : 'bg-slate-100 dark:bg-[#061821] text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm'
                            }`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            {!isCollapsed && (
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold truncate leading-tight">{item.label}</span>
                                  {item.badge && (
                                    <span className={`text-[8px] px-1.5 py-0.2 font-mono font-bold rounded-md ml-1 ${
                                      isActive
                                        ? 'bg-slate-950/20 text-slate-950'
                                        : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                                    }`}>
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <div className={`text-[9.5px] truncate leading-normal ${
                                  isActive ? 'text-slate-950/80' : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                  {item.desc}
                                </div>
                              </div>
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

          {/* Acceso Directo a Grafana Pro */}
          <div className="pt-2 border-t border-cyan-500/20 flex-shrink-0">
            <a
              href={grafanaUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir Gemelo Digital en Grafana en una nueva pestaña"
              className={`w-full flex items-center rounded-xl bg-slate-100 dark:bg-[#061821] border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/5 shadow-sm transition-all group ${
                isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && (
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">Grafana Pro</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">Pestaña Completa</span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ExternalLink className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              )}
            </a>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* NAVEGACIÓN MÓVIL INFERIOR INTELIGENTE (BOTTOM BAR + SHEET)*/}
      {/* ======================================================== */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 spatial-sidebar rounded-2xl p-1.5 border border-cyan-500/30 shadow-2xl flex items-center justify-around">
        {/* Accesos rápidos primarios (máx 4) */}
        {mobilePrimaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeOpsTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveOpsTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-cyan-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 truncate max-w-[60px] font-medium">
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* Botón de Menú Completo para acceder a todas las secciones */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
            !isCurrentTabInMobilePrimary
              ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-cyan-500'
          }`}
        >
          <div className="relative">
            <Menu className="w-4 h-4" />
            {!isCurrentTabInMobilePrimary && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </div>
          <span className="text-[9px] mt-0.5 font-medium">Módulos</span>
        </button>
      </nav>

      {/* MODAL / DRAWER MÓVIL CON SECCIONES DESPLEGABLES */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          {/* Fondo para cerrar al tocar fuera */}
          <div 
            className="flex-1 w-full" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />

          <div className="spatial-card rounded-t-3xl border-t border-cyan-500/40 p-4 max-h-[82vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header del Drawer Móvil */}
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  Módulos de la Cuenca
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable con categorías desplegables */}
            <div className="flex-1 overflow-y-auto space-y-3 py-3 custom-scrollbar">
              {visibleSections.map((section) => {
                const SectionIcon = section.icon;
                const isOpen = !!openSections[section.id];
                const containsActiveTab = section.items.some(item => item.id === activeOpsTab);

                return (
                  <div key={section.id} className="space-y-1.5 rounded-xl border border-slate-200/80 dark:border-cyan-950/60 p-2 bg-slate-50/50 dark:bg-cyan-950/10">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <SectionIcon className="w-4 h-4 text-cyan-500" />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 dark:text-cyan-300">
                          {section.title}
                        </span>
                        {containsActiveTab && !isOpen && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
                          {section.items.length}
                        </span>
                        <ChevronDown 
                          className={`w-4 h-4 text-slate-400 dark:text-cyan-400/60 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-cyan-400' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeOpsTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveOpsTab(item.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`flex items-center space-x-3 p-2.5 rounded-xl text-left transition-all ${
                                isActive
                                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold shadow-md'
                                  : 'bg-white dark:bg-[#061821] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-cyan-900/40 hover:border-cyan-500/40'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                                isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-cyan-500/20 text-cyan-500 dark:text-cyan-400'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold truncate">{item.label}</span>
                                  {item.badge && (
                                    <span className="text-[9px] px-1 py-0.2 bg-cyan-500/30 text-cyan-900 dark:text-cyan-200 rounded font-mono font-bold">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] truncate block ${
                                  isActive ? 'text-slate-950/80' : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                  {item.desc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Enlace a Grafana Pro en el pie del modal */}
            <div className="pt-2 border-t border-cyan-500/20 mt-1">
              <a
                href={grafanaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold text-xs"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Abrir Grafana Pro (Ventana Externa)</span>
                </div>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
