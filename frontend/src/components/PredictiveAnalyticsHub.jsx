import React, { useState } from 'react';
import { 
  TrendingUp, 
  Timer, 
  Sprout, 
  CheckCircle2, 
  Activity, 
  ChevronRight, 
  Sparkles,
  Cpu,
  Layers,
  HelpCircle,
  Database
} from 'lucide-react';
import HydrologicalForecastView from './predictions/HydrologicalForecastView';
import HydrodynamicLeadTimeView from './predictions/HydrodynamicLeadTimeView';
import WaterDemandMitaView from './predictions/WaterDemandMitaView';
import CropSuitabilityEconomicView from './predictions/CropSuitabilityEconomicView';
import AnomalyMlopsHealthView from './predictions/AnomalyMlopsHealthView';
import ErrorBoundary from './ErrorBoundary';

export default function PredictiveAnalyticsHub({
  activeSubTab = 'forecast',
  setActiveSubTab
}) {
  const [fallbackTab, setFallbackTab] = useState('forecast');

  // Normalización de sub-pestaña activa
  const normalizeTab = (tab) => {
    if (tab === 'midagri' || tab === 'mita') return 'irrigation-demand';
    if (tab === 'suitability' || tab === 'crops') return 'crop-suitability';
    if (tab === 'anomalies' || tab === 'mlops') return 'anomalies-mlops';
    if (['forecast', 'leadtime', 'irrigation-demand', 'crop-suitability', 'anomalies-mlops'].includes(tab)) {
      return tab;
    }
    return 'forecast';
  };

  const currentTab = normalizeTab(activeSubTab || fallbackTab);

  const handleTabChange = (tabId) => {
    if (setActiveSubTab) {
      setActiveSubTab(tabId);
    } else {
      setFallbackTab(tabId);
    }
  };

  // Metadatos de las 5 Subsecciones Maestras de Analítica Predictiva
  const subsectionMeta = {
    forecast: {
      title: 'Pronóstico Hídrico 24h & Crecidas Fluviales',
      desc: 'Proyección continua horaria de caudales y calidad WQI mediante Deep Learning recurrente (GRU) y alerta de avenidas.',
      icon: TrendingUp,
      badge: 'Modelo GRU 24h'
    },
    leadtime: {
      title: 'Propagación Hidrodinámica, Lead Time & Dilución',
      desc: 'Estimación de tiempo de tránsito de contaminantes por el río, propagación en cascada multitramo y prescriptor de lavado con lagunas.',
      icon: Timer,
      badge: 'Saint-Venant 1D'
    },
    'irrigation-demand': {
      title: 'Demanda Hídrica por Cultivo, Mita & Factibilidad ENA',
      desc: 'Cálculo de lámina de riego volumétrica Kc (FAO-56), auditoría predictiva de turnos de riego y factibilidad de intenciones de siembra.',
      icon: Sprout,
      badge: 'FAO-56 & ENA'
    },
    'crop-suitability': {
      title: 'Aptitud de Cultivos, Salinidad Maas-Hoffman & Precios SIEA',
      desc: 'Evaluación de retención de cosecha de frutales frente a sales (EC), pérdidas económicas en Soles y recomendación de variedades sustitutas.',
      icon: CheckCircle2,
      badge: 'Maas-Hoffman'
    },
    'anomalies-mlops': {
      title: 'Detección de Anomalías, Salud de Sensores & MLOps',
      desc: 'Clasificador multivariable no supervisado (Isolation Forest), autonomía de batería solar 12V y detección de deriva de sondas.',
      icon: Activity,
      badge: 'Isolation Forest'
    }
  };

  const currentMeta = subsectionMeta[currentTab] || subsectionMeta.forecast;
  const ActiveIcon = currentMeta.icon;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Institucional de Analítica Predictiva */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            {/* Breadcrumb de Navegación */}
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Módulos Sentinel</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
              <span className="text-cyan-600 dark:text-cyan-400">Analítica Predictiva & IA</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
              <span className="text-slate-700 dark:text-slate-200 font-bold">{currentMeta.title.split('&')[0]}</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <ActiveIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {currentMeta.title}
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    {currentMeta.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                  {currentMeta.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Píldoras de Estado Rápido MLOps */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600 dark:text-slate-300">Inferencia GRU:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">R² 94.2%</span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono">
              <span className="text-slate-600 dark:text-slate-300">Base MIDAGRI:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">SIEA / ENA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Renderizado de la Subsección Activa con ErrorBoundary Defensivo */}
      <ErrorBoundary 
        key={currentTab} 
        title={`Error al cargar la subsección: ${currentMeta.title}`}
        onReset={() => handleTabChange('forecast')}
      >
        {currentTab === 'forecast' && <HydrologicalForecastView />}
        {currentTab === 'leadtime' && <HydrodynamicLeadTimeView />}
        {currentTab === 'irrigation-demand' && <WaterDemandMitaView />}
        {currentTab === 'crop-suitability' && <CropSuitabilityEconomicView />}
        {currentTab === 'anomalies-mlops' && <AnomalyMlopsHealthView />}
      </ErrorBoundary>
    </div>
  );
}
