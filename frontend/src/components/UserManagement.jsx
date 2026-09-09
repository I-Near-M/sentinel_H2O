import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, nodesApi } from '../services/api';
import { 
  Users, UserPlus, Shield, CheckCircle2, 
  XCircle, Mail, Phone, Lock, Building, RefreshCw, Key
} from 'lucide-react';

export const UserManagement = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    telefono_contacto: '',
    cargo_institucional: '',
    rol: 'OPERADOR_JUNTA',
    id_entidad: '',
    activo: true,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsersAndEntities = async () => {
    setLoading(true);
    try {
      const [usersRes, entitiesRes] = await Promise.all([
        authApi.getUsers(),
        nodesApi.getEntities(),
      ]);
      setUsers(usersRes.data);
      setEntities(entitiesRes.data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsersAndEntities();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      nombre_completo: '',
      telefono_contacto: '',
      cargo_institucional: '',
      rol: currentUser?.rol === 'OPERADOR_JUNTA' ? 'TOMERO_COMISION' : 'OPERADOR_JUNTA',
      id_entidad: currentUser?.id_entidad || '',
      activo: true,
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setModalMode('edit');
    setSelectedUser(u);
    setFormData({
      email: u.email,
      password: '',
      nombre_completo: u.nombre_completo,
      telefono_contacto: u.telefono_contacto || '',
      cargo_institucional: u.cargo_institucional || '',
      rol: u.rol,
      id_entidad: u.id_entidad || '',
      activo: u.activo,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        if (!formData.password || formData.password.length < 6) {
          setFormError('La contraseña debe tener al menos 6 caracteres.');
          setSubmitting(false);
          return;
        }
        await authApi.createUser({
          ...formData,
          id_entidad: formData.id_entidad ? parseInt(formData.id_entidad) : null,
        });
      } else {
        const updatePayload = {
          nombre_completo: formData.nombre_completo,
          email: formData.email,
          telefono_contacto: formData.telefono_contacto,
          cargo_institucional: formData.cargo_institucional,
          rol: formData.rol,
          id_entidad: formData.id_entidad ? parseInt(formData.id_entidad) : null,
          activo: formData.activo,
        };
        if (formData.password && formData.password.trim().length > 0) {
          updatePayload.password = formData.password.trim();
        }
        await authApi.updateUser(selectedUser.id_usuario, updatePayload);
      }
      setShowModal(false);
      fetchUsersAndEntities();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al guardar usuario');
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (u) => {
    const isDeactivating = u.activo;
    const confirmMsg = isDeactivating
      ? `¿Desactivar/Deshabilitar la cuenta de "${u.nombre_completo}" (${u.email})?\n\nEl usuario ya no podrá iniciar sesión en la plataforma, pero se mantendrá su historial de auditoría.`
      : `¿Reactivar la cuenta de "${u.nombre_completo}" (${u.email})?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isDeactivating) {
        await authApi.deactivateUser(u.id_usuario);
      } else {
        await authApi.updateUser(u.id_usuario, { activo: true });
      }
      fetchUsersAndEntities();
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo actualizar el estado.');
    }
  };

  const getRoleLabel = (rol) => {
    switch (rol) {
      case 'ADMIN_SISTEMA': 
        return { 
          name: 'Admin Sistema', 
          color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-500/40' 
        };
      case 'OPERADOR_JUNTA': 
        return { 
          name: 'Operador Junta', 
          color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/40' 
        };
      case 'TOMERO_COMISION': 
        return { 
          name: 'Tomero Comisión', 
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40' 
        };
      case 'AUDITOR_VISOR': 
      default: 
        return { 
          name: 'Auditor Veedor', 
          color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600/40' 
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="spatial-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Usuarios & Control de Acceso (RBAC)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Gestión de Usuarios y Roles
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Gestión de credenciales, roles jerárquicos de 4 niveles y delegación institucional de la cuenca.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsersAndEntities}
            disabled={loading}
            className="p-2.5 bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 border border-slate-300 dark:border-cyan-900/60 text-slate-700 dark:text-cyan-300 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Refrescar usuarios"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#061e2b]/90 border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-bold">Usuario</th>
                <th className="py-3.5 px-4 font-bold">Rol Institucional</th>
                <th className="py-3.5 px-4 font-bold">Entidad Asignada</th>
                <th className="py-3.5 px-4 font-bold">Contacto</th>
                <th className="py-3.5 px-4 font-bold">Estado</th>
                <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-500 dark:text-slate-400 font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-500" />
                    Cargando usuarios del sistema...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleInfo = getRoleLabel(u.rol);
                  return (
                    <tr key={u.id_usuario} className="hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{u.nombre_completo}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border font-mono ${roleInfo.color}`}>
                          <Shield className="w-3 h-3" />
                          {roleInfo.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {u.nombre_entidad || <span className="text-slate-400 dark:text-slate-500 italic">Global / Cuenca</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {u.telefono_contacto || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.activo ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                            <XCircle className="w-3.5 h-3.5" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        {u.id_usuario === currentUser?.id_usuario ? (
                          <span className="inline-block px-2.5 py-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium italic border border-slate-200 dark:border-slate-800 rounded-lg">
                            Tu Cuenta
                          </span>
                        ) : (
                          (hasRole('ADMIN_SISTEMA') || hasRole('OPERADOR_JUNTA')) && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`px-2.5 py-1 border rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                u.activo
                                  ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                              }`}
                              title={u.activo ? 'Desactivar / Deshabilitar acceso' : 'Reactivar acceso'}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Crear / Editar Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-500" />
              <span>{modalMode === 'create' ? 'Registrar Nuevo Usuario' : 'Editar Usuario'}</span>
            </h3>

            {formError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">NOMBRE COMPLETO *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  placeholder="Ej: Pedro Valdivia"
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">CORREO ELECTRÓNICO *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@junta.pe"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">
                    {modalMode === 'create' ? 'CONTRASEÑA *' : 'NUEVA CONTRASEÑA (Opcional)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={modalMode === 'create' ? 'Mínimo 6 caracteres' : 'Dejar vacío para no cambiar'}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">ROL DEL SISTEMA *</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {hasRole('ADMIN_SISTEMA') && (
                      <>
                        <option value="ADMIN_SISTEMA" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">👑 ADMIN_SISTEMA (Superadmin)</option>
                        <option value="OPERADOR_JUNTA" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">🏢 OPERADOR_JUNTA (Técnico)</option>
                      </>
                    )}
                    <option value="TOMERO_COMISION" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">🚜 TOMERO_COMISION (Campo)</option>
                    <option value="AUDITOR_VISOR" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">👁️ AUDITOR_VISOR (Solo Lectura)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">ENTIDAD ASIGNADA</label>
                  <select
                    value={formData.id_entidad}
                    onChange={(e) => setFormData({ ...formData, id_entidad: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Global / Sin Entidad Específica</option>
                    {entities.map((ent) => (
                      <option key={ent.id_entidad} value={ent.id_entidad} className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                        {ent.nombre_entidad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">TELÉFONO DE CONTACTO</label>
                  <input
                    type="text"
                    value={formData.telefono_contacto}
                    onChange={(e) => setFormData({ ...formData, telefono_contacto: e.target.value })}
                    placeholder="+51 987654321"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">CARGO INSTITUCIONAL</label>
                  <input
                    type="text"
                    value={formData.cargo_institucional}
                    onChange={(e) => setFormData({ ...formData, cargo_institucional: e.target.value })}
                    placeholder="Ej: Encargado de Riego"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {modalMode === 'edit' && selectedUser?.id_usuario !== currentUser?.id_usuario && (
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">ESTADO DE LA CUENTA *</label>
                  <select
                    value={formData.activo ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="true" className="bg-white dark:bg-[#072433] text-emerald-600 dark:text-emerald-400">✅ ACTIVO (Permitir Acceso)</option>
                    <option value="false" className="bg-white dark:bg-[#072433] text-rose-600 dark:text-rose-400">⛔ INACTIVO (Deshabilitar Acceso)</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
