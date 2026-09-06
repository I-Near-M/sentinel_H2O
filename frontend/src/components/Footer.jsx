import React from 'react';
import { Activity, Heart, Sparkles, Globe2, ArrowRight } from 'lucide-react';

export default function Footer({ onStartImplementation }) {
  return (
    <footer className="spatial-header border-t border-onahau-200 py-12 text-onahau-800 text-xs mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-onahau-200/80 pb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-onahau-500 to-onahau-300 p-0.5 shadow-md shadow-onahau-500/20">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-onahau-600" />
              </div>
            </div>
            <div>
              <span className="font-black text-sm text-onahau-950 tracking-tight block">SENTINEL-H2O</span>
              <span className="block text-[10px] text-onahau-700 font-bold uppercase tracking-wider">
                Gemelo Digital & Alerta Temprana de Cuenca
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-onahau-800 font-bold">
            <a href="#que-ofrecemos" className="hover:text-onahau-500 transition-colors">¿Qué Ofrecemos?</a>
            <a href="#beneficios" className="hover:text-onahau-500 transition-colors">Beneficios</a>
            <a href="#metodologia" className="hover:text-onahau-500 transition-colors">Metodología</a>
            <a href="#replicabilidad" className="hover:text-onahau-500 transition-colors">Replicabilidad</a>
            {onStartImplementation && (
              <button 
                onClick={() => onStartImplementation('entities')}
                className="text-onahau-600 hover:text-onahau-500 font-black flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Implementar Sentinel</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-onahau-700 text-[11px]">
          <p>
            © {new Date().getFullYear()} Sentinel-H2O. Plataforma de código abierto para 
            <strong> Juntas de Usuarios de Riego</strong>, <strong>Comisiones de Regantes</strong> y <strong>Autoridades Nacionales del Agua</strong>.
          </p>
          <p className="flex items-center space-x-1">
            <span>Hardware Solar Abierto & IA</span>
            <Heart className="w-3.5 h-3.5 text-onahau-500 fill-current inline" />
            <span>para la Resiliencia Hídrica</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
