import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSystemConfig } from '../context/SystemConfigContext';
import { 
  Droplets, ExternalLink, LogOut, Shield, 
  Building2, UserCheck, Moon, Sun, User 
} from 'lucide-react';

export const OpsHeader = ({ onOpenProfile, grafanaUrl = 'http://localhost:3000' }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { nombre_cuenca, pais_region } = useSystemConfig();

  const getRoleBadge = (rol) => {
    switch (rol) {
      case 'ADMIN_SISTEMA':
        return { label: 'ADMIN SISTEMA', bg: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40', icon: Shield };
      case 'OPERADOR_JUNTA':
        return { label: 'OPERADOR JUNTA', bg: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40', icon: Building2 };
      case 'TOMERO_COMISION':
        return { label: 'TOMERO COMISIÓN', bg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40', icon: UserCheck };
      case 'AUDITOR_VISOR':
      default:
        return { label: 'AUDITOR / VEEDOR', bg: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40', icon: Shield };
    }
  };

  const roleMeta = getRoleBadge(user?.rol);
  const RoleIcon = roleMeta.icon;

  return (
    <header className="spatial-header px-4 sm:px-6 py-3 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl shadow-sm">
          <Droplets className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              SENTINEL<span className="text-cyan-500 dark:text-cyan-400">H2O</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              OPERATIVO
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-cyan-200/60 font-mono tracking-wider truncate max-w-[220px] sm:max-w-[350px]">
            {nombre_cuenca ? `${nombre_cuenca} · ${pais_region}` : 'Consola de Gobernanza Hídrica'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Toggle Modo Oscuro / Claro */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-cyan-300 hover:bg-slate-200 dark:hover:bg-cyan-950/50 border border-slate-300 dark:border-cyan-500/30 rounded-xl transition-all cursor-pointer"
          title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-600" />}
        </button>

        {/* Acceso a Grafana Externo */}
        <a
          href={grafanaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-700 dark:text-cyan-300 text-xs font-semibold rounded-xl shadow-sm items-center gap-1.5 transition-all duration-150"
          title="Abrir Gemelo Digital en Grafana (Pestaña Completa)"
        >
          <span>Grafana Pro</span>
          <ExternalLink className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
        </a>

        {/* Botón de Perfil de Usuario */}
        {user && (
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 border border-slate-300 dark:border-cyan-900/60 rounded-xl transition-all cursor-pointer text-left group"
            title="Ver y editar mi perfil de usuario"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors">
                {user.nombre_completo}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {user.nombre_entidad || user.cargo_institucional || 'Gobernanza Cuenca'}
              </div>
            </div>

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border font-mono ${roleMeta.bg}`}>
              <RoleIcon className="w-3 h-3" />
              <span className="hidden md:inline">{roleMeta.label}</span>
            </span>
          </button>
        )}

        {/* Cerrar Sesión */}
        <button
          onClick={logout}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 rounded-xl transition-all cursor-pointer"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
