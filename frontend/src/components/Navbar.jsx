import React from 'react';
import { 
  Activity, 
  Sparkles, 
  ArrowRight,
  Compass,
  Layers,
  ShieldCheck,
  Globe2
} from 'lucide-react';

export default function Navbar({ setViewMode }) {
  return (
    <header className="sticky top-0 z-50 spatial-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo y Marca Sentinel-H2O */}
          <div 
            onClick={() => { setViewMode('public'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-onahau-500 via-onahau-400 to-onahau-200 p-0.5 shadow-lg shadow-onahau-500/20 group-hover:scale-105 transition-all">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-onahau-600 group-hover:animate-pulse" />
              </div>
            </div>
            <div>
              <span className="text-xl font-black text-onahau-950 tracking-tight block">
                SENTINEL-H2O
              </span>
              <span className="block text-[10px] text-onahau-700 font-bold tracking-wider uppercase">
                Gemelo Digital & Alerta Temprana de Cuenca
              </span>
            </div>
          </div>

          {/* Menú de Navegación de la Landing Pública */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-bold text-onahau-800">
            <a href="#que-ofrecemos" className="hover:text-onahau-600 transition-colors">¿Qué Ofrecemos?</a>
            <a href="#beneficios" className="hover:text-onahau-600 transition-colors">Beneficios Agrícolas</a>
            <a href="#metodologia" className="hover:text-onahau-600 transition-colors">Implementación en 3 Pasos</a>
            <a href="#replicabilidad" className="hover:text-onahau-600 transition-colors">Replicabilidad Global</a>
          </nav>

          {/* Botón de Llamada a la Acción Principal */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode('ops')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white shadow-lg shadow-onahau-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Implementar Sentinel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
