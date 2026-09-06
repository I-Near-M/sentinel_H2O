import React from 'react';
import { 
  Building2, 
  PlusCircle, 
  Radio, 
  Users, 
  Cpu, 
  BarChart3, 
  ExternalLink, 
  ArrowLeft, 
  Activity, 
  Sparkles,
  ShieldCheck,
  Compass
} from 'lucide-react';

export default function OpsSidebar({ 
  activeOpsTab, 
  setActiveOpsTab, 
  setViewMode, 
  grafanaUrl 
}) {
  const steps = [
    { id: 'entities', stepNum: '1', label: 'Entidades Gestoras', desc: 'Juntas, ANA y Comisiones', icon: Building2 },
    { id: 'wizard', stepNum: '2', label: 'Aprovisionar Estación', desc: 'Wizard & Código C++ ESP32', icon: PlusCircle, highlight: true },
    { id: 'nodes', stepNum: '3', label: 'Directorio de Nodos', desc: 'Telemetría y Estado en Vivo', icon: Radio },
    { id: 'recipients', stepNum: '4', label: 'Padrón de Regantes', desc: 'Alertas WhatsApp & Tomeros', icon: Users },
    { id: 'simulator', stepNum: '5', label: 'Simulador IA & Lead Time', desc: 'Tiempos de Viaje & Escenarios', icon: Cpu },
  ];

  return (
    <>
      {/* SIDEBAR PARA ESCRITORIO (DESKTOP) */}
      <aside className="hidden lg:flex flex-col w-80 h-[calc(100vh-2rem)] sticky top-4 spatial-sidebar rounded-3xl p-5 justify-between">
        <div className="space-y-6">
          {/* Logo y Encabezado del Módulo de Implementación */}
          <div className="flex items-center space-x-3 pb-4 border-b border-onahau-200/80">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-onahau-500 to-onahau-300 p-0.5 shadow-md shadow-onahau-500/20">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-onahau-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base text-onahau-950 tracking-tight">
                  SENTINEL-H2O
                </span>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-onahau-100 text-onahau-700 border border-onahau-200">
                  OPS
                </span>
              </div>
              <span className="block text-[10px] text-onahau-700 font-semibold uppercase tracking-wider">
                Consola de Implementación
              </span>
            </div>
          </div>

          {/* Menú de Pasos y Módulos de Gestión */}
          <nav className="space-y-1.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-onahau-800/70 px-3 pb-1">
              Flujo de Implementación
            </div>
            {steps.map((item) => {
              const Icon = item.icon;
              const isActive = activeOpsTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveOpsTab(item.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-2xl text-left transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-onahau-500 to-onahau-400 text-white shadow-lg shadow-onahau-500/25 font-bold'
                      : item.highlight
                      ? 'bg-onahau-50 hover:bg-onahau-100/80 text-onahau-900 border border-onahau-200/80'
                      : 'text-onahau-900 hover:bg-onahau-100/60'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-onahau-700 border border-onahau-200 shadow-sm'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold truncate leading-tight">{item.label}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-onahau-700'}`}>
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Acceso Directo al Gemelo Virtual en Grafana */}
          <div className="pt-2">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-onahau-800/70 px-3 pb-2">
              Visualización Hidroinformática
            </div>
            <a
              href={grafanaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-br from-onahau-50 via-white to-onahau-100 border border-onahau-300 text-onahau-900 hover:border-onahau-500 shadow-sm transition-all group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-onahau-500/15 text-onahau-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-extrabold text-onahau-950">Gemelo Virtual 2D</span>
                  <span className="block text-[10px] text-onahau-700">Dashboards en Grafana</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-onahau-500 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>

        {/* Botón de Retorno al Portal Público */}
        <div className="pt-4 border-t border-onahau-200/80">
          <button
            onClick={() => setViewMode('public')}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl bg-white hover:bg-onahau-50 text-onahau-800 border border-onahau-200 text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Portal Informativo</span>
          </button>
        </div>
      </aside>

      {/* NAVEGACIÓN MÓVIL INFERIOR FLOTANTE (BOTTOM BAR) */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-50 spatial-header rounded-2xl p-2 border border-onahau-200 shadow-2xl flex items-center justify-around">
        {steps.map((item) => {
          const Icon = item.icon;
          const isActive = activeOpsTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveOpsTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-onahau-500 text-white shadow-md'
                  : 'text-onahau-800 hover:text-onahau-950'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-bold mt-0.5 truncate max-w-[50px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setViewMode('public')}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-onahau-700 hover:text-onahau-950"
          title="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">Salir</span>
        </button>
      </nav>
    </>
  );
}
