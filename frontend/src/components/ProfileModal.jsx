import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { 
  X, User, Phone, Lock, Shield, Building2, 
  Check, AlertCircle, Calendar, KeyRound, Save 
} from 'lucide-react';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUserLocal } = useAuth();
  
  const [formData, setFormData] = useState({
    nombre_completo: user?.nombre_completo || '',
    telefono_contacto: user?.telefono_contacto || '',
    password_actual: '',
    password_nuevo: '',
    password_confirmacion: ''
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (formData.password_nuevo) {
      if (!formData.password_actual) {
        setErrorMsg('Debes ingresar tu contraseña actual para establecer una nueva contraseña.');
        return;
      }
      if (formData.password_nuevo.length < 6) {
        setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (formData.password_nuevo !== formData.password_confirmacion) {
        setErrorMsg('La confirmación de contraseña no coincide.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        nombre_completo: formData.nombre_completo.trim(),
        telefono_contacto: formData.telefono_contacto.trim(),
      };
      if (formData.password_nuevo) {
        payload.password_actual = formData.password_actual;
        payload.password_nuevo = formData.password_nuevo;
      }

      const res = await authApi.updateProfile(payload);
      updateUserLocal(res.data);
      setSuccessMsg('¡Perfil actualizado con éxito!');
      setFormData(prev => ({
        ...prev,
        password_actual: '',
        password_nuevo: '',
        password_confirmacion: ''
      }));
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al actualizar el perfil de usuario.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (rol) => {
    switch (rol) {
      case 'ADMIN_SISTEMA': return 'Superadministrador del Sistema';
      case 'OPERADOR_JUNTA': return 'Operador Junta de Usuarios';
      case 'TOMERO_COMISION': return 'Tomero / Comisión de Regantes';
      case 'AUDITOR_VISOR': return 'Auditor / Veedor de Cuenca';
      default: return rol;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="spatial-card w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-800/20 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera del Modal */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-cyan-500/20">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Mi Perfil Operativo</h2>
            <p className="text-xs text-slate-600 dark:text-cyan-200/70 font-mono">
              {user.email} · ID #{user.id_usuario}
            </p>
          </div>
        </div>

        {/* Notificaciones */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Ficha Institucional Fija */}
        <div className="grid grid-cols-2 gap-3 p-4 mb-6 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">
              Rol de Gobernanza
            </span>
            <span className="font-bold text-slate-900 dark:text-cyan-300 flex items-center gap-1 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              {getRoleLabel(user.rol)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">
              Entidad Adscrita
            </span>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              {user.nombre_entidad || user.cargo_institucional || 'Nivel Central'}
            </span>
          </div>
          <div className="col-span-2 pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Usuario: <strong className="text-slate-700 dark:text-slate-200">@{user.username}</strong></span>
            <span>Último acceso: {user.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleDateString() : 'Activo ahora'}</span>
          </div>
        </div>

        {/* Formulario de Edición */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-500" />
              <span>Nombre Completo *</span>
            </label>
            <input
              type="text"
              name="nombre_completo"
              required
              value={formData.nombre_completo}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-cyan-500" />
              <span>Teléfono Móvil / WhatsApp de Alertas</span>
            </label>
            <input
              type="text"
              name="telefono_contacto"
              placeholder="+51 999 999 999"
              value={formData.telefono_contacto}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Cambio de Contraseña Opcional */}
          <div className="pt-3 border-t border-cyan-500/20 space-y-3">
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
              <span>Cambiar Contraseña (Opcional)</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Contraseña Actual (Requerida si cambias de clave)
                </label>
                <input
                  type="password"
                  name="password_actual"
                  value={formData.password_actual}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Tu contraseña actual"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  name="password_nuevo"
                  value={formData.password_nuevo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  name="password_confirmacion"
                  value={formData.password_confirmacion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Repite la nueva contraseña"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
