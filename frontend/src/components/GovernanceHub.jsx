import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Radio, 
  Bell, 
  Droplets, 
  ShieldCheck, 
  PlusCircle, 
  Database,
  ChevronRight,
  Layers
} from 'lucide-react';
import NodeManagement from './NodeManagement';
import NodeProvisionWizard from './NodeProvisionWizard';
import EntitiesManagement from './EntitiesManagement';
import { UserManagement } from './UserManagement';
import AlertsMultiuseHub from './AlertsMultiuseHub';
import WaterFrameworkManagement from './WaterFrameworkManagement';
import { AuditManagement } from './AuditManagement';

export default function GovernanceHub({ 
  activeSubTab = 'entities',
  setActiveSubTab
}) {
  // Normalización de compatibilidad para pestañas heredadas
  const normalizeTab = (tab) => {
    if (tab === 'irrigation' || tab === 'settings') return 'water';
    if (tab === 'recipients') return 'alerts';
    return tab || 'entities';
  };

  const [fallbackTab, setFallbackTab] = useState('entities');
  const [showWizard, setShowWizard] = useState(false);

  const currentTab = normalizeTab(activeSubTab || fallbackTab);

  const handleTabChange = (tabId) => {
    if (setActiveSubTab) {
      setActiveSubTab(tabId);
    } else {
      setFallbackTab(tabId);
    }
    if (tabId === 'nodes') setShowWizard(false);
  };

  // Metadatos de las 6 Subsecciones Maestras
  const subsectionMeta = {
    entities: {
      title: 'Estructura Institucional & Cargos',
      desc: 'Administración de Juntas de Usuarios, Autoridades de Agua (ANA/ALA), Comisiones de Regantes, tipos de organización y cargos.',
      icon: Building2,
      badge: 'Gobernanza'
    },
    users: {
      title: 'Usuarios & Seguridad RBAC',
      desc: 'Directorio centralizado de credenciales, políticas de acceso institucional y matriz de privilegios de 4 niveles.',
      icon: Users,
      badge: 'Seguridad'
    },
    nodes: {
      title: 'Red de Estaciones & Aprovisionamiento',
      desc: 'Inventario de estaciones telemétricas, wizard de aforo fluvial con molinete Hall, batimetría con regletas y mantenimiento.',
      icon: Radio,
      badge: 'Hardware & Aforo'
    },
    alerts: {
      title: 'Alertas Tempranas & Padrón Multiuso',
      desc: 'Padrón segmentado (Agrario, Truchas, JASS, Veedores), umbrales ECA Agua Cat 3/4 y bitácora de contingencias despachadas.',
      icon: Bell,
      badge: 'Mensajería WhatsApp'
    },
    water: {
      title: 'Cuenca & Marco Hídrico Integral',
      desc: 'Configuración singleton de cuenca, clasificación de recursos, orden de prelación según Ley 29338, cultivos y turnos de mita.',
      icon: Droplets,
      badge: 'Ley 29338'
    },
    audit: {
      title: 'Auditoría Forense & Cumplimiento',
      desc: 'Bitácora inmutable de transacciones, recalibraciones de compuertas y operaciones del sistema con verificación criptográfica.',
      icon: ShieldCheck,
      badge: 'Inmutable SHA-256'
    }
  };

  const currentMeta = subsectionMeta[currentTab] || subsectionMeta.entities;
  const ActiveIcon = currentMeta.icon;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Institucional de Gobernanza (Limpio y Despejado) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            {/* Breadcrumb de Navegación */}
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Módulos Sentinel</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
              <span className="text-cyan-600 dark:text-cyan-400">Gobernanza & ANA</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
              <span className="text-slate-900 dark:text-white font-bold">{currentMeta.badge}</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                <ActiveIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentMeta.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-3xl">
                  {currentMeta.desc}
                </p>
              </div>
            </div>
          </div>

          {/* KPI Pills de Integridad y Telemetría */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <div className="px-3 py-1.5 bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-600 dark:text-slate-400">TimescaleDB:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Sync 100%</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs flex items-center space-x-2">
              <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-slate-600 dark:text-slate-400">Integridad:</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-300 font-semibold">SHA-256</span>
            </div>
          </div>
        </div>

        {/* Selector Desplegable para Dispositivos Móviles (en Desktop se navega desde el Sidebar) */}
        <div className="lg:hidden mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <label className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-1.5 block uppercase tracking-wider">
            Subsección Activa (Cambiar en 1 tap):
          </label>
          <select
            value={currentTab}
            onChange={(e) => handleTabChange(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="entities" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🏢 1. Estructura Institucional & Cargos</option>
            <option value="users" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">👥 2. Usuarios & Roles RBAC</option>
            <option value="nodes" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">📡 3. Red de Estaciones & Aprovisionamiento</option>
            <option value="alerts" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🚨 4. Alertas Tempranas & Padrón Multiuso</option>
            <option value="water" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🌊 5. Cuenca & Marco Hídrico</option>
            <option value="audit" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">🛡️ 6. Auditoría Forense & Trazabilidad</option>
          </select>
        </div>
      </div>

      {/* Contenido Dinámico de la Subsección Seleccionada */}
      <div className="transition-all duration-200">
        
        {/* SUBSECCIÓN 1: ESTRUCTURA INSTITUCIONAL */}
        {currentTab === 'entities' && (
          <EntitiesManagement />
        )}

        {/* SUBSECCIÓN 2: USUARIOS & ROLES RBAC */}
        {currentTab === 'users' && (
          <UserManagement />
        )}

        {/* SUBSECCIÓN 3: RED DE ESTACIONES & APROVISIONAMIENTO */}
        {currentTab === 'nodes' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowWizard(!showWizard)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-cyan-900/30 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{showWizard ? '← Volver a Lista de Nodos' : '+ Aprovisionar Nuevo Nodo (Wizard Aforo)'}</span>
              </button>
            </div>

            {showWizard ? (
              <NodeProvisionWizard onComplete={() => setShowWizard(false)} />
            ) : (
              <NodeManagement setActiveTab={(tab) => {
                if (tab === 'wizard') setShowWizard(true);
              }} />
            )}
          </div>
        )}

        {/* SUBSECCIÓN 4: ALERTAS & PADRÓN MULTIUSO */}
        {currentTab === 'alerts' && (
          <AlertsMultiuseHub />
        )}

        {/* SUBSECCIÓN 5: CUENCA & MARCO HÍDRICO */}
        {currentTab === 'water' && (
          <WaterFrameworkManagement />
        )}

        {/* SUBSECCIÓN 6: AUDITORÍA FORENSE INMUTABLE */}
        {currentTab === 'audit' && (
          <AuditManagement />
        )}

      </div>
    </div>
  );
}
