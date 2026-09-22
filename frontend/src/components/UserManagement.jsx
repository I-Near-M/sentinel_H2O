import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, nodesApi, governanceApi } from '../services/api';
import { 
  Users, UserPlus, Shield, CheckCircle2, 
  XCircle, Mail, Phone, Lock, Building, RefreshCw, Key,
  ShieldCheck, Check, Layers, Eye, Cpu, Radio, Bell, FileText
} from 'lucide-react';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { 
  validatePhone, 
  sanitizePhoneInput, 
  validateEmail, 
  getPasswordStrength 
} from '../utils/validators';

export const UserManagement = () => {
  const { user: currentUser, hasRole } = useAuth();

  // Subsección activa: 'users' | 'rbac'
  const [activeSubTab, setActiveSubTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [institutionalRoles, setInstitutionalRoles] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
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
      const [usersRes, entitiesRes, instRolesRes, sysRolesRes] = await Promise.all([
        authApi.getUsers().catch(() => ({ data: [] })),
        nodesApi.getEntities().catch(() => ({ data: [] })),
        governanceApi.getRoles().catch(() => ({ data: [] })),
        governanceApi.getSystemRoles().catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data || []);
      setEntities(entitiesRes.data || []);
      setInstitutionalRoles(instRolesRes.data || []);
      setSystemRoles(sysRolesRes.data || []);
    } catch (err) {
      console.error('Error cargando usuarios y roles:', err);
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
      cargo_institucional: institutionalRoles[0]?.nombre_cargo || '',
      rol: ['OPERADOR_JUNTA', 'OPERADOR_AGRARIO'].includes(currentUser?.rol) ? 'FISCALIZADOR_VEEDOR' : 'OPERADOR_AGRARIO',
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

    const emailCheck = validateEmail(formData.email, true);
    if (!emailCheck.isValid) {
      setFormError(emailCheck.error);
      return;
    }

    let cleanedPhone = null;
    if (formData.telefono_contacto && formData.telefono_contacto.trim()) {
      const phoneCheck = validatePhone(formData.telefono_contacto, false);
      if (!phoneCheck.isValid) {
        setFormError(phoneCheck.error);
        return;
      }
      cleanedPhone = phoneCheck.formatted;
    }

    if (modalMode === 'create') {
      const pwdStrength = getPasswordStrength(formData.password);
      if (!pwdStrength.isValid) {
        setFormError(`Contraseña no cumple con la política: ${pwdStrength.errors.join(' ')}`);
        return;
      }
    } else if (formData.password && formData.password.trim().length > 0) {
      const pwdStrength = getPasswordStrength(formData.password);
      if (!pwdStrength.isValid) {
        setFormError(`Nueva contraseña insegura: ${pwdStrength.errors.join(' ')}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        await authApi.createUser({
          ...formData,
          email: emailCheck.formatted,
          telefono_contacto: cleanedPhone,
          id_entidad: formData.id_entidad ? parseInt(formData.id_entidad) : null,
        });
      } else {
        const updatePayload = {
          nombre_completo: formData.nombre_completo,
          email: emailCheck.formatted,
          telefono_contacto: cleanedPhone,
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
          name: 'Superadmin Sistema', 
          color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-500/40' 
        };
      case 'OPERADOR_CENTRAL': 
        return { 
          name: 'Operador Central Cuenca', 
          color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-500/40' 
        };
      case 'TECNICO_MANTENIMIENTO': 
        return { 
          name: 'Técnico Mantenimiento & IoT', 
          color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-500/40' 
        };
      case 'OPERADOR_AGRARIO': 
      case 'OPERADOR_JUNTA': 
        return { 
          name: 'Operador Agrario / Riego', 
          color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/40' 
        };
      case 'OPERADOR_SANEAMIENTO': 
        return { 
          name: 'Operador Saneamiento / JASS', 
          color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-500/40' 
        };
      case 'OPERADOR_ACUICOLA': 
        return { 
          name: 'Operador Acuícola / Truchas', 
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40' 
        };
      case 'TOMERO_COMISION': 
        return { 
          name: 'Tomero Comisión', 
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40' 
        };
      case 'FISCALIZADOR_VEEDOR': 
      case 'AUDITOR_VISOR': 
      default: 
        return { 
          name: 'Fiscalizador / Veedor ANA', 
          color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600/40' 
        };
    }
  };

  // Matriz de permisos RBAC para visualización técnica de gobernanza multiuso
  const permissionsMatrix = [
    {
      feature: 'Aprovisionar Estaciones & Red IoT',
      admin: true,
      central: false,
      maint: true,
      agrario: false,
      saneamiento: false,
      acuicola: false,
      veedor: false,
      desc: 'Alta de nodos telemétricos, emisión de API Keys y configuración de enlace celular GSM.'
    },
    {
      feature: 'Mantenimiento Técnico, Hardware & Firmware',
      admin: true,
      central: false,
      maint: true,
      agrario: false,
      saneamiento: false,
      acuicola: false,
      veedor: false,
      desc: 'Intervención física en campo, batería solar 12V, calibración de sondas ópticas y actualización firmware.'
    },
    {
      feature: 'Aforo Fluvial & Batimetría con Regletas',
      admin: true,
      central: true,
      maint: true,
      agrario: true,
      saneamiento: false,
      acuicola: false,
      veedor: false,
      desc: 'Muestreo transversal del lecho del río, constantes a/b de molinete Hall y curva de gasto.'
    },
    {
      feature: 'Turnos de Riego, Mita & Despacho Agrario',
      admin: true,
      central: true,
      maint: false,
      agrario: true,
      saneamiento: false,
      acuicola: false,
      veedor: false,
      desc: 'Programación de mita hídrica, despacho de dotación en bocatomas y balance de comisiones.'
    },
    {
      feature: 'Control de Captación Potable & JASS',
      admin: true,
      central: true,
      maint: false,
      agrario: false,
      saneamiento: true,
      acuicola: false,
      veedor: false,
      desc: 'Supervisión de calidad en bocatomas de agua potable, turbidez NTU y pH para plantas potabilizadoras.'
    },
    {
      feature: 'Pozas de Piscicultura & Truchas',
      admin: true,
      central: true,
      maint: false,
      agrario: false,
      saneamiento: false,
      acuicola: true,
      veedor: false,
      desc: 'Vigilancia de oxígeno disuelto, estrés térmico en estanques acuícolas y control de recirculación.'
    },
    {
      feature: 'Padrón Multiuso & Alertas WhatsApp',
      admin: true,
      central: true,
      maint: false,
      agrario: true,
      saneamiento: true,
      acuicola: true,
      veedor: false,
      desc: 'Notificación de contingencias hídricas y umbrales críticos a usuarios agrícolas, JASS y acuícolas.'
    },
    {
      feature: 'Simulación Hidrológica What-If & Dilución',
      admin: true,
      central: true,
      maint: false,
      agrario: false,
      saneamiento: false,
      acuicola: false,
      veedor: false,
      desc: 'Modelo de tránsito hidráulico en cascada, predicción de onda y prescripción de caudales de dilución.'
    },
    {
      feature: 'Gestión Institucional & Credenciales',
      admin: true,
      central: false,
      maint: false,
      agrario: false,
      saneamiento: false,
      acuicola: false,
      veedor: false,
      desc: 'Alta de usuarios, asignación de roles RBAC institucional y auditoría de accesos.'
    },
    {
      feature: 'Auditoría Forense & Veeduría Inmutable',
      admin: true,
      central: true,
      maint: false,
      agrario: false,
      saneamiento: false,
      acuicola: false,
      veedor: true,
      desc: 'Verificación inmutable SHA-256 de transacciones, cumplimiento de caudal ecológico y exportación forense.'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado Principal */}
      <div className="spatial-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Subsección 2: Seguridad & Control de Acceso (RBAC)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Usuarios, Roles y Matriz de Privilegios
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Control jerárquico de 4 niveles institucionales (Admin, Operador Junta, Tomero Comisión, Auditor Veedor) con segregación estricta de funciones.
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
          {activeSubTab === 'users' && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Subpestañas Internas */}
      <div className="flex border-b border-slate-200 dark:border-cyan-900/60 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'users'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Directorio de Usuarios ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rbac')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'rbac'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Matriz de Roles RBAC & Permisos</span>
        </button>
      </div>

      {/* ======================================================================= */}
      {/* VISTA 1: DIRECTORIO DE USUARIOS */}
      {/* ======================================================================= */}
      {activeSubTab === 'users' && (
        <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#061e2b]/90 border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Usuario</th>
                  <th className="py-3.5 px-4 font-bold">Rol Institucional</th>
                  <th className="py-3.5 px-4 font-bold">Cargo & Entidad Asignada</th>
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
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {u.cargo_institucional || <span className="text-slate-400 italic">Sin cargo</span>}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {u.nombre_entidad || 'Global / Cuenca'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
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
                                title={u.activo ? 'Desactivar acceso' : 'Reactivar acceso'}
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
      )}

      {/* ======================================================================= */}
      {/* VISTA 2: MATRIZ DE ROLES RBAC */}
      {/* ======================================================================= */}
      {activeSubTab === 'rbac' && (
        <div className="space-y-6">
          {/* Tarjetas de los Roles del Sistema */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {systemRoles.map((role) => {
              const activeCount = users.filter(u => u.rol === role.rol && u.activo).length;
              return (
                <div key={role.rol} className="spatial-card p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Nivel {role.nivel_jerarquico}
                      </span>
                      {role.grupo_multiuso && (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40 uppercase">
                          {role.grupo_multiuso.replace('_', ' ')}
                        </span>
                      )}
                      <span className="text-xs font-bold font-mono text-cyan-500">
                        {activeCount} activo(s)
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {role.nombre_amigable}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {role.descripcion}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-cyan-900/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Identificador:</span>
                    <span className="font-bold text-slate-700 dark:text-cyan-300">{role.rol}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla de Matriz de Permisos */}
          <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
            <div className="p-4 border-b border-slate-200 dark:border-cyan-900/60 bg-slate-50 dark:bg-[#061e2b]/90">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Matriz de Privilegios por Función Operativa Multiuso
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Segregación de funciones estricta conforme a los lineamientos de la Autoridad Nacional del Agua (ANA) y distribución sectorial de la cuenca.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#061821] border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold min-w-[200px]">Módulo / Función del Sistema</th>
                    <th className="py-3 px-2 font-bold text-center text-purple-600 dark:text-purple-400">ADMIN SISTEMA</th>
                    <th className="py-3 px-2 font-bold text-center text-blue-600 dark:text-blue-400">OPERADOR CENTRAL</th>
                    <th className="py-3 px-2 font-bold text-center text-amber-600 dark:text-amber-400">TECNICO MANT</th>
                    <th className="py-3 px-2 font-bold text-center text-cyan-600 dark:text-cyan-400">OPERADOR AGRARIO</th>
                    <th className="py-3 px-2 font-bold text-center text-teal-600 dark:text-teal-400">OPERADOR SANEAM.</th>
                    <th className="py-3 px-2 font-bold text-center text-emerald-600 dark:text-emerald-400">OPERADOR ACUICOLA</th>
                    <th className="py-3 px-2 font-bold text-center text-slate-600 dark:text-slate-300">FISCALIZADOR VEEDOR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
                  {permissionsMatrix.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{item.feature}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.admin ? (
                          <span className="inline-block p-1 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.central ? (
                          <span className="inline-block p-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.maint ? (
                          <span className="inline-block p-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.agrario ? (
                          <span className="inline-block p-1 bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.saneamiento ? (
                          <span className="inline-block p-1 bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.acuicola ? (
                          <span className="inline-block p-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.veedor ? (
                          <span className="inline-block p-1 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL PARA CREAR / EDITAR USUARIO */}
      {/* ======================================================================= */}
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
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@junta.pe"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">
                    {modalMode === 'create' ? 'CONTRASEÑA ROBUSTA *' : 'NUEVA CONTRASEÑA (Opcional)'}
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={modalMode === 'create' ? 'Mínimo 8 caracteres' : 'Dejar vacío para mantener actual'}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  {(modalMode === 'create' || (formData.password && formData.password.length > 0)) && (
                    <PasswordStrengthMeter password={formData.password} showCriteria={true} />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">ROL DEL SISTEMA *</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    {(hasRole('ADMIN_SISTEMA') || hasRole('OPERADOR_CENTRAL')) && (
                      <optgroup label="Administración & Centro de Control">
                        {hasRole('ADMIN_SISTEMA') && (
                          <option value="ADMIN_SISTEMA" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                            👑 ADMIN_SISTEMA (Superadmin General)
                          </option>
                        )}
                        <option value="OPERADOR_CENTRAL" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                          🌐 OPERADOR_CENTRAL (Operador Central de Cuenca)
                        </option>
                      </optgroup>
                    )}
                    <optgroup label="Infraestructura & Telemática">
                      <option value="TECNICO_MANTENIMIENTO" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                        🔧 TECNICO_MANTENIMIENTO (Técnico Mantenimiento & IoT)
                      </option>
                    </optgroup>
                    <optgroup label="Operadores de Sector Multiuso">
                      <option value="OPERADOR_AGRARIO" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                        🌾 OPERADOR_AGRARIO (Riego, Juntas & Comisiones)
                      </option>
                      <option value="OPERADOR_SANEAMIENTO" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                        🚰 OPERADOR_SANEAMIENTO (Agua Potable & JASS)
                      </option>
                      <option value="OPERADOR_ACUICOLA" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                        🐟 OPERADOR_ACUICOLA (Piscicultura & Estanques)
                      </option>
                    </optgroup>
                    <optgroup label="Auditoría, Fiscalización & Veeduría">
                      <option value="FISCALIZADOR_VEEDOR" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                        🔍 FISCALIZADOR_VEEDOR (Fiscalizador / Veedor ANA)
                      </option>
                    </optgroup>
                    {/* Preservar compatibilidad si el usuario editado posee un rol legado */}
                    {['OPERADOR_JUNTA', 'TOMERO_COMISION', 'AUDITOR_VISOR'].includes(formData.rol) && (
                      <optgroup label="Roles de Compatibilidad (Legados)">
                        {formData.rol === 'OPERADOR_JUNTA' && (
                          <option value="OPERADOR_JUNTA" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                            🏢 OPERADOR_JUNTA (Legado)
                          </option>
                        )}
                        {formData.rol === 'TOMERO_COMISION' && (
                          <option value="TOMERO_COMISION" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                            🚜 TOMERO_COMISION (Legado)
                          </option>
                        )}
                        {formData.rol === 'AUDITOR_VISOR' && (
                          <option value="AUDITOR_VISOR" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                            👁️ AUDITOR_VISOR (Legado)
                          </option>
                        )}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">ENTIDAD ASIGNADA</label>
                  <select
                    value={formData.id_entidad}
                    onChange={(e) => setFormData({ ...formData, id_entidad: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
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
                    onChange={(e) => setFormData({ ...formData, telefono_contacto: sanitizePhoneInput(e.target.value) })}
                    placeholder="+51987654321"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-cyan-200/80 font-mono mb-1 text-[11px] font-bold">CARGO INSTITUCIONAL</label>
                  <select
                    value={formData.cargo_institucional}
                    onChange={(e) => setFormData({ ...formData, cargo_institucional: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-500/30 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="">Seleccione o escriba cargo...</option>
                    {institutionalRoles.map((r) => (
                      <option key={r.id_cargo} value={r.nombre_cargo}>
                        {r.nombre_cargo}
                      </option>
                    ))}
                    <option value="Administrador General">Administrador General</option>
                    <option value="Gerente Técnico">Gerente Técnico</option>
                    <option value="Especialista Hidrométrico">Especialista Hidrométrico</option>
                    <option value="Tomero Principal">Tomero Principal</option>
                  </select>
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
