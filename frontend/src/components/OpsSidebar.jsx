import React, { useState } from 'react';
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
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings
} from 'lucide-react';

export default function OpsSidebar({ 
  activeOpsTab, 
  setActiveOpsTab,
  grafanaUrl = 'http://localhost:3000'
}) {
  const { hasRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allTabs = [
    { 
      id: 'dashboard', 
      label: 'Sala de Situación', 
      desc: 'KPIs, Mapa y Feed en Vivo', 
      icon: LayoutDashboard, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
    },
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
      id: 'wizard', 
      label: 'Aprovisionar Estación', 
      desc: 'Wizard & Código C++ ESP32', 
      icon: PlusCircle, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA'],
      highlight: true 
    },
    { 
      id: 'nodes', 
      label: 'Directorio de Nodos', 
      desc: 'Telemetría y Estado en Vivo', 
      icon: Radio, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
    },
    { 
      id: 'grafana_embed', 
      label: 'Gemelo en Grafana', 
      desc: 'Visualización In-App', 
      icon: BarChart3, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
    },
    { 
      id: 'recipients', 
      label: 'Padrón de Regantes', 
      desc: 'Alertas WhatsApp & Tomeros', 
      icon: Users, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION'] 
    },
    { 
      id: 'simulator', 
      label: 'Simulador IA & What-If', 
      desc: 'Tiempos de Viaje & Escenarios', 
      icon: Cpu, 
      roles: ['ADMIN_SISTEMA', 'OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'] 
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
      desc: 'Identidad y Dashboards', 
      icon: Settings, 
      roles: ['ADMIN_SISTEMA'] 
    },
  ];

  const visibleTabs = allTabs.filter(tab => hasRole(tab.roles));

  return (
    <>
      {/* SIDEBAR PARA ESCRITORIO (DESKTOP) */}
      <aside className={`hidden lg:flex flex-col h-[calc(100vh-5.5rem)] sticky top-20 spatial-sidebar rounded-2xl p-3 justify-between transition-all duration-300 shadow-xl ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}>
        <div className="space-y-3">
          {/* Encabezado del Menú con Botón de Colapso */}
          <div className="flex items-center justify-between px-2 pb-2 border-b border-cyan-500/20">
            {!isCollapsed && (
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                MÓDULOS DE GESTIÓN
              </span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-500 dark:text-cyan-400 transition-all cursor-pointer ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title={isCollapsed ? "Expandir barra lateral" : "Colapsar a modo icono"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Lista de Navegación */}
          <nav className="space-y-1.5">
            {visibleTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeOpsTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveOpsTab(item.id)}
                  title={isCollapsed ? `${item.label} - ${item.desc}` : undefined}
                  className={`w-full flex items-center rounded-xl transition-all cursor-pointer group ${
                    isCollapsed ? 'justify-center p-2.5' : 'space-x-3 p-2.5 text-left'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-bold'
                      : item.highlight
                      ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-200 border border-cyan-500/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-cyan-950/40 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-100 dark:bg-[#061821] text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold truncate leading-tight">{item.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-slate-950/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        {item.desc}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Acceso Directo a Grafana Pro */}
        <div className="pt-2 border-t border-cyan-500/20">
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir Grafana en ventana completa"
            className={`w-full flex items-center rounded-xl bg-slate-100 dark:bg-[#061821] border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 hover:border-cyan-400 shadow-sm transition-all group ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between p-2.5'
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
      </aside>

      {/* NAVEGACIÓN MÓVIL INFERIOR FLOTANTE (BOTTOM BAR) */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-50 spatial-sidebar rounded-2xl p-2 border border-cyan-500/30 shadow-2xl flex items-center justify-around overflow-x-auto">
        {visibleTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeOpsTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveOpsTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-cyan-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] mt-0.5 truncate max-w-[50px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
