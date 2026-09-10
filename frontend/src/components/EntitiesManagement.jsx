import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  RefreshCw, 
  MapPin, 
  Mail, 
  Phone, 
  Globe2, 
  ShieldCheck, 
  Check, 
  X, 
  Edit3,
  Power,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { nodesApi } from '../services/api';
import { 
  validatePhone, 
  sanitizePhoneInput, 
  validateEmail, 
  validateRucDni, 
  sanitizeDocInput 
} from '../utils/validators';

export default function EntitiesManagement({ onEntityCreated }) {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    nombre_entidad: '',
    tipo_entidad: 'JUNTA_USUARIOS',
    ruc: '',
    telefono_contacto: '',
    email_contacto: '',
    direccion: '',
    activo: true
  });

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const res = await nodesApi.getEntities(true);
      setEntities(res.data || []);
    } catch (err) {
      console.error('Error al cargar entidades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedEntity(null);
    setFormData({
      nombre_entidad: '',
      tipo_entidad: 'JUNTA_USUARIOS',
      ruc: '',
      telefono_contacto: '',
      email_contacto: '',
      direccion: '',
      activo: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (entity) => {
    setModalMode('edit');
    setSelectedEntity(entity);
    setFormData({
      nombre_entidad: entity.nombre_entidad || entity.nombre || '',
      tipo_entidad: entity.tipo_entidad || 'JUNTA_USUARIOS',
      ruc: entity.ruc || '',
      telefono_contacto: entity.telefono_contacto || '',
      email_contacto: entity.email_contacto || '',
      direccion: entity.direccion || '',
      activo: entity.activo !== false
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === 'checkbox' ? checked : value;

    if (name === 'ruc') {
      finalVal = sanitizeDocInput(value);
      if (finalVal) {
        const check = validateRucDni(finalVal, false);
        setFormErrors(prev => ({ ...prev, ruc: check.error }));
      } else {
        setFormErrors(prev => ({ ...prev, ruc: null }));
      }
    } else if (name === 'telefono_contacto') {
      finalVal = sanitizePhoneInput(value);
      if (finalVal) {
        const check = validatePhone(finalVal, false);
        setFormErrors(prev => ({ ...prev, telefono_contacto: check.error }));
      } else {
        setFormErrors(prev => ({ ...prev, telefono_contacto: null }));
      }
    } else if (name === 'email_contacto') {
      if (finalVal) {
        const check = validateEmail(finalVal, false);
        setFormErrors(prev => ({ ...prev, email_contacto: check.error }));
      } else {
        setFormErrors(prev => ({ ...prev, email_contacto: null }));
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalVal
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.nombre_entidad.trim()) {
      setFeedbackMsg({ type: 'error', text: 'El nombre de la entidad es obligatorio.' });
      return;
    }

    // Validar RUC si fue ingresado
    if (formData.ruc && formData.ruc.trim()) {
      const rucCheck = validateRucDni(formData.ruc, false);
      if (!rucCheck.isValid || (rucCheck.type && rucCheck.type !== 'RUC')) {
        const msg = rucCheck.error || 'El RUC debe tener 11 dígitos y comenzar con 10, 15, 17 o 20.';
        setFormErrors(prev => ({ ...prev, ruc: msg }));
        setFeedbackMsg({ type: 'error', text: msg });
        return;
      }
    }

    // Validar email si fue ingresado
    let cleanedEmail = null;
    if (formData.email_contacto && formData.email_contacto.trim()) {
      const emailCheck = validateEmail(formData.email_contacto, false);
      if (!emailCheck.isValid) {
        setFormErrors(prev => ({ ...prev, email_contacto: emailCheck.error }));
        setFeedbackMsg({ type: 'error', text: emailCheck.error });
        return;
      }
      cleanedEmail = emailCheck.formatted;
    }

    // Validar teléfono si fue ingresado
    let cleanedPhone = null;
    if (formData.telefono_contacto && formData.telefono_contacto.trim()) {
      const phoneCheck = validatePhone(formData.telefono_contacto, false);
      if (!phoneCheck.isValid) {
        setFormErrors(prev => ({ ...prev, telefono_contacto: phoneCheck.error }));
        setFeedbackMsg({ type: 'error', text: phoneCheck.error });
        return;
      }
      cleanedPhone = phoneCheck.formatted;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        email_contacto: cleanedEmail,
        telefono_contacto: cleanedPhone,
        ruc: formData.ruc ? formData.ruc.trim() : null
      };

      if (modalMode === 'create') {
        await nodesApi.createEntity(payload);
        setFeedbackMsg({ type: 'success', text: `¡Entidad '${formData.nombre_entidad}' registrada con éxito!` });
      } else {
        await nodesApi.updateEntity(selectedEntity.id_entidad, payload);
        setFeedbackMsg({ type: 'success', text: `¡Entidad '${formData.nombre_entidad}' actualizada con éxito!` });
      }
      setShowModal(false);
      fetchEntities();
      if (onEntityCreated) onEntityCreated();
    } catch (err) {
      console.error('Error al procesar entidad:', err);
      setFeedbackMsg({ type: 'error', text: 'Error al procesar entidad: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleToggleActive = async (entity) => {
    const isDeactivating = entity.activo !== false;
    const confirmText = isDeactivating
      ? `¿Desactivar la entidad '${entity.nombre_entidad}'?\n\nLos nodos y regantes históricos mantendrán su relación, pero la entidad quedará oculta para nuevas asignaciones.`
      : `¿Reactivar la entidad '${entity.nombre_entidad}'?`;

    if (!window.confirm(confirmText)) return;

    try {
      await nodesApi.toggleEntityActive(entity.id_entidad);
      setFeedbackMsg({
        type: 'success',
        text: `Entidad '${entity.nombre_entidad}' ${isDeactivating ? 'desactivada' : 'activada'} correctamente.`
      });
      fetchEntities();
      if (onEntityCreated) onEntityCreated();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      setFeedbackMsg({
        type: 'error',
        text: 'Error al cambiar estado: ' + (err.response?.data?.detail || err.message)
      });
    } finally {
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const filteredEntities = entities.filter(ent => {
    const name = ent.nombre_entidad || ent.nombre || '';
    const type = ent.tipo_entidad || '';
    const dir = ent.direccion || '';
    const ruc = ent.ruc || '';

    const matchesSearch = 
      name.toLowerCase().includes(search.toLowerCase()) ||
      type.toLowerCase().includes(search.toLowerCase()) ||
      dir.toLowerCase().includes(search.toLowerCase()) ||
      ruc.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return ent.activo !== false;
    if (statusFilter === 'INACTIVE') return ent.activo === false;
    return true;
  });

  const getBadgeStyle = (tipo) => {
    switch (tipo) {
      case 'AUTORIDAD_NACIONAL':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-500/30';
      case 'JUNTA_USUARIOS':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/40 font-extrabold';
      case 'COMISION_REGANTES':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/30';
      case 'GOBIERNO_REGIONAL':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-500/30';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado y Acciones */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Paso 1: Gobernanza & Organizaciones</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Entidades Gestoras de la Cuenca
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Registra tu Junta de Usuarios, Comisión de Regantes o Autoridad de Agua para comenzar a aprovisionar estaciones telemétricas asociadas.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchEntities}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-cyan-900/60 transition-all shadow-sm cursor-pointer"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nueva Entidad Gestora</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-300 font-bold'
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar entidad por nombre, ámbito, RUC o tipo (ej: Junta, ANA, Comisión)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-2xl bg-white dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 p-1 shadow-sm text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas ({entities.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Activas ({entities.filter(e => e.activo !== false).length})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-rose-500 text-white font-extrabold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Inactivas ({entities.filter(e => e.activo === false).length})
            </button>
          </div>
        </div>
      </div>

      {/* Grilla de Entidades */}
      {loading && entities.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">Cargando entidades gestoras...</p>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="spatial-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-600 dark:text-cyan-400">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">No se encontraron entidades</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            {search ? 'No hay resultados para tu búsqueda con el filtro seleccionado.' : 'Aún no hay entidades registradas. Crea la primera entidad gestora para vincular estaciones.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm shadow-md cursor-pointer"
          >
            Registrar Primera Entidad
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntities.map((entity) => {
            const isActive = entity.activo !== false;
            return (
              <div
                key={entity.id_entidad || entity.id}
                className={`spatial-card p-6 space-y-4 flex flex-col justify-between transition-all ${
                  !isActive ? 'opacity-70 bg-slate-100/60 dark:bg-[#061821]/40 border-slate-300 dark:border-slate-800' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full border font-bold ${getBadgeStyle(entity.tipo_entidad)}`}>
                        {entity.tipo_entidad ? entity.tipo_entidad.replace(/_/g, ' ') : 'ENTIDAD'}
                      </span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500/30">
                          <XCircle className="w-3 h-3" /> INACTIVA
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1 font-mono">
                      <Globe2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>#{entity.id_entidad}</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {entity.nombre_entidad || entity.nombre}
                  </h3>

                  {entity.direccion && (
                    <div className="flex items-start space-x-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{entity.direccion}</span>
                    </div>
                  )}
                </div>

                {/* Información de Contacto y Acciones CRUD */}
                <div className="pt-4 border-t border-slate-200 dark:border-cyan-900/60 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="space-y-1.5">
                    {entity.ruc && (
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span className="font-mono">RUC: {entity.ruc}</span>
                      </div>
                    )}

                    {entity.email_contacto && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{entity.email_contacto}</span>
                      </div>
                    )}

                    {entity.telefono_contacto && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="truncate font-mono">{entity.telefono_contacto}</span>
                      </div>
                    )}
                  </div>

                  {/* Botones de Acción (Editar y Soft Delete / Reactivar) */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-cyan-950/60">
                    <button
                      onClick={() => openEditModal(entity)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(entity)}
                      className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      }`}
                      title={isActive ? "Desactivar entidad (mantiene histórico)" : "Reactivar entidad"}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Desactivar' : 'Activar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear / Editar Entidad */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {modalMode === 'create' ? 'Registrar Entidad Gestora' : 'Editar Entidad Gestora'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre Oficial de la Entidad *</label>
                <input
                  type="text"
                  name="nombre_entidad"
                  required
                  placeholder="Ej: Junta de Usuarios del Sector Hidráulico"
                  value={formData.nombre_entidad}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Entidad</label>
                  <select
                    name="tipo_entidad"
                    value={formData.tipo_entidad}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="JUNTA_USUARIOS" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Junta de Usuarios</option>
                    <option value="COMISION_REGANTES" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Comisión de Regantes</option>
                    <option value="AUTORIDAD_NACIONAL" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Autoridad de Agua (ANA)</option>
                    <option value="GOBIERNO_REGIONAL" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Gobierno Regional / Local</option>
                    <option value="ORGANISMO_INTERNACIONAL" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Organismo Internacional</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between items-center">
                    <span>RUC (11 dígitos)</span>
                    <span className="text-[10px] text-slate-500 font-normal">Opcional</span>
                  </label>
                  <input
                    type="text"
                    name="ruc"
                    placeholder="Ej: 20123456789"
                    value={formData.ruc}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-[#061821] border rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none font-mono transition-all ${
                      formErrors.ruc
                        ? 'border-rose-500 ring-1 ring-rose-500/50'
                        : 'border-slate-300 dark:border-cyan-900/60 focus:border-cyan-500'
                    }`}
                  />
                  {formErrors.ruc && (
                    <p className="text-[10px] text-rose-500 font-medium">{formErrors.ruc}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Correo Electrónico</label>
                  <input
                    type="email"
                    name="email_contacto"
                    placeholder="contacto@junta.org"
                    value={formData.email_contacto}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-[#061821] border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none transition-all ${
                      formErrors.email_contacto
                        ? 'border-rose-500 ring-1 ring-rose-500/50'
                        : 'border-slate-300 dark:border-cyan-900/60 focus:border-cyan-500'
                    }`}
                  />
                  {formErrors.email_contacto && (
                    <p className="text-[10px] text-rose-500 font-medium">{formErrors.email_contacto}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    name="telefono_contacto"
                    placeholder="+51987654321"
                    value={formData.telefono_contacto}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-[#061821] border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-mono transition-all ${
                      formErrors.telefono_contacto
                        ? 'border-rose-500 ring-1 ring-rose-500/50'
                        : 'border-slate-300 dark:border-cyan-900/60 focus:border-cyan-500'
                    }`}
                  />
                  {formErrors.telefono_contacto && (
                    <p className="text-[10px] text-rose-500 font-medium">{formErrors.telefono_contacto}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Dirección o Sede Institucional</label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Ej: Av. Solar 123, Perú"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-extrabold shadow-md cursor-pointer transition-all"
                >
                  {submitting ? 'Guardando...' : modalMode === 'create' ? 'Crear Entidad' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
