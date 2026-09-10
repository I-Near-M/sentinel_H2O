import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { 
  ShieldCheck, Lock, Mail, User, AlertTriangle, 
  Sparkles, CheckCircle2, ChevronRight, Droplets, 
  MapPin, Globe2, Compass 
} from 'lucide-react';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { validateEmail, getPasswordStrength } from '../utils/validators';

export const LoginPage = () => {
  const { login, registerFirstAdmin, error: authError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estado de primer despliegue (Setup status)
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [basinConfig, setBasinConfig] = useState({
    nombre_cuenca: '',
    pais_region: '',
    latitud_centro: -11.49,
    longitud_centro: -77.05,
    zoom_inicial: 10
  });

  // Campos de Bootstrap Superadmin
  const [bootstrapName, setBootstrapName] = useState('');
  const [bootstrapCargo, setBootstrapCargo] = useState('Especialista ANA / Administrador');
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await authApi.getSetupStatus();
        const firstSetup = res.data.is_first_setup;
        setIsFirstSetup(firstSetup);
        if (res.data.config) {
          if (firstSetup) {
            setBasinConfig({
              nombre_cuenca: '',
              pais_region: '',
              latitud_centro: res.data.config.latitud_centro ?? -11.49,
              longitud_centro: res.data.config.longitud_centro ?? -77.05,
              zoom_inicial: res.data.config.zoom_inicial ?? 10
            });
          } else {
            setBasinConfig(res.data.config);
          }
        }
      } catch (err) {
        console.warn('No se pudo verificar estado de setup inicial:', err);
      } finally {
        setCheckingSetup(false);
      }
    };
    checkStatus();
  }, []);

  const handleBasinConfigChange = (e) => {
    const { name, value, type } = e.target;
    setBasinConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    if (isFirstSetup) {
      if (!bootstrapName.trim() || !email.trim() || !password.trim()) {
        setErrorMessage('Por favor complete todos los campos obligatorios.');
        setLoading(false);
        return;
      }

      const emailCheck = validateEmail(email, true);
      if (!emailCheck.isValid) {
        setErrorMessage(emailCheck.error);
        setLoading(false);
        return;
      }

      const pwdStrength = getPasswordStrength(password);
      if (!pwdStrength.isValid) {
        setErrorMessage(`La contraseña no cumple la política de seguridad: ${pwdStrength.errors.join(' ')}`);
        setLoading(false);
        return;
      }

      if (!basinConfig.nombre_cuenca.trim() || !basinConfig.pais_region.trim()) {
        setErrorMessage('Por favor ingrese el nombre de la cuenca y la región/país.');
        setLoading(false);
        return;
      }
      const res = await registerFirstAdmin({
        email: emailCheck.formatted,
        password: password.trim(),
        nombre_completo: bootstrapName.trim(),
        cargo_institucional: bootstrapCargo.trim(),
        nombre_cuenca: basinConfig.nombre_cuenca.trim(),
        pais_region: basinConfig.pais_region.trim(),
        latitud_centro: basinConfig.latitud_centro,
        longitud_centro: basinConfig.longitud_centro,
        zoom_inicial: basinConfig.zoom_inicial
      });
      if (res.success) {
        setBootstrapSuccess(true);
        window.dispatchEvent(new CustomEvent('system:config_updated', { detail: basinConfig }));
      } else {
        setErrorMessage(res.error || 'No se pudo inicializar el superadministrador.');
      }
    } else {
      if (!email.trim() || !password.trim()) {
        setErrorMessage('Por favor ingrese su correo institucional y contraseña.');
        setLoading(false);
        return;
      }
      const res = await login(email.trim(), password.trim());
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales no válidas.');
      }
    }
    setLoading(false);
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-[#073145] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-cyan-950/80 border border-cyan-500/30 rounded-2xl animate-pulse">
            <Droplets className="w-10 h-10 text-cyan-400" />
          </div>
          <div className="text-sm font-mono text-cyan-200/80 tracking-widest uppercase">
            Iniciando Sentinel-H2O...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#073145] via-[#051c27] to-[#030d12] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className={`w-full relative z-10 ${isFirstSetup ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-cyan-950/60 border border-cyan-500/30 rounded-2xl shadow-xl shadow-cyan-950/50 mb-4 backdrop-blur-md">
            <Droplets className="w-9 h-9 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            SENTINEL<span className="text-cyan-400">H2O</span>
          </h1>
          <p className="text-xs sm:text-sm text-cyan-200/80 mt-1 uppercase tracking-wider font-mono">
            {isFirstSetup 
              ? (basinConfig.nombre_cuenca ? `${basinConfig.nombre_cuenca} · ${basinConfig.pais_region || 'Configuración Inicial'}` : 'Gobernanza Hídrica Descentralizada · Primer Despliegue')
              : (basinConfig.nombre_cuenca ? `${basinConfig.nombre_cuenca} · ${basinConfig.pais_region}` : 'Gobernanza Hídrica Descentralizada')}
          </p>
        </div>

        <div className="bg-[#0b2938]/85 border border-cyan-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-cyan-900/60">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isFirstSetup ? (
                  <>
                    <span>Puesta en Marcha Inicial</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                      SETUP 1-CLICK
                    </span>
                  </>
                ) : (
                  'Acceso Institucional'
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isFirstSetup
                  ? 'Configura la identidad de tu cuenca y el usuario Superadministrador'
                  : 'Ingresa tus credenciales autorizadas de gobernanza'}
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-cyan-400/80" />
          </div>

          {(errorMessage || authError) && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-start gap-3 text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage || authError}</span>
            </div>
          )}

          {bootstrapSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-start gap-3 text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>¡Despliegue y Superadministrador configurados con éxito! Iniciando sesión...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SECCIÓN DE IDENTIDAD DE CUENCA (Solo si es Primer Despliegue) */}
            {isFirstSetup && (
              <div className="p-4 bg-[#061e2b]/80 border border-cyan-500/30 rounded-2xl space-y-3 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 border-b border-cyan-900/60 pb-2">
                  <Globe2 className="w-4 h-4 text-cyan-400" />
                  <span>Identidad de la Cuenca / Recurso Hídrico</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-cyan-200/80 mb-1">
                      Nombre de la Cuenca / Río *
                    </label>
                    <input
                      type="text"
                      name="nombre_cuenca"
                      required
                      placeholder="ej: Cuenca Mantaro, Río Ebro, etc."
                      value={basinConfig.nombre_cuenca}
                      onChange={handleBasinConfigChange}
                      className="w-full bg-[#03141d] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-200/80 mb-1">
                      País / Región *
                    </label>
                    <input
                      type="text"
                      name="pais_region"
                      required
                      placeholder="ej: Junín, Perú"
                      value={basinConfig.pais_region}
                      onChange={handleBasinConfigChange}
                      className="w-full bg-[#03141d] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Latitud Centro</label>
                    <input
                      type="number"
                      step="0.0001"
                      name="latitud_centro"
                      value={basinConfig.latitud_centro}
                      onChange={handleBasinConfigChange}
                      className="w-full bg-[#03141d] border border-cyan-500/30 rounded-lg px-2 py-1.5 text-[11px] font-mono text-cyan-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Longitud Centro</label>
                    <input
                      type="number"
                      step="0.0001"
                      name="longitud_centro"
                      value={basinConfig.longitud_centro}
                      onChange={handleBasinConfigChange}
                      className="w-full bg-[#03141d] border border-cyan-500/30 rounded-lg px-2 py-1.5 text-[11px] font-mono text-cyan-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Zoom Inicial</label>
                    <input
                      type="number"
                      name="zoom_inicial"
                      min="1"
                      max="18"
                      value={basinConfig.zoom_inicial}
                      onChange={handleBasinConfigChange}
                      className="w-full bg-[#03141d] border border-cyan-500/30 rounded-lg px-2 py-1.5 text-[11px] font-mono text-cyan-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN DEL SUPERADMINISTRADOR */}
            {isFirstSetup && (
              <>
                <div>
                  <label className="block text-xs font-medium text-cyan-200/80 mb-1 font-mono">
                    NOMBRE COMPLETO DEL SUPERADMIN *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-cyan-500/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ing. Carlos Mendoza"
                      value={bootstrapName}
                      onChange={(e) => setBootstrapName(e.target.value)}
                      className="w-full bg-[#061e2b]/90 border border-cyan-500/30 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-200/80 mb-1 font-mono">
                    CARGO INSTITUCIONAL
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Administrador General de Cuenca"
                    value={bootstrapCargo}
                    onChange={(e) => setBootstrapCargo(e.target.value)}
                    className="w-full bg-[#061e2b]/90 border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-cyan-200/80 mb-1 font-mono">
                CORREO ELECTRÓNICO *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-cyan-500/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@institucion.gob.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#061e2b]/90 border border-cyan-500/30 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-cyan-200/80 mb-1 font-mono">
                {isFirstSetup ? 'CONTRASEÑA ROBUSTA *' : 'CONTRASEÑA *'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-cyan-500/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoComplete={isFirstSetup ? "new-password" : "current-password"}
                  placeholder={isFirstSetup ? 'Mínimo 8 caracteres (A-Z, a-z, 0-9, @#$)' : '••••••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#061e2b]/90 border border-cyan-500/30 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
                />
              </div>
              {isFirstSetup && password.length > 0 && (
                <PasswordStrengthMeter password={password} showCriteria={true} />
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 text-[#03131c] font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 flex items-center justify-center gap-2 text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#03131c] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isFirstSetup ? 'Completar Despliegue de Cuenca' : 'Entrar a la Consola'}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6">
          Sentinel-H2O Open Source Platform • Gobernanza Hídrica Descentralizada
        </p>
      </div>
    </div>
  );
};
