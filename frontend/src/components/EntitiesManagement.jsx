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
  XCircle,
  Tag,
  Briefcase,
  Layers,
  Award,
  Trash2,
  Filter
} from 'lucide-react';
import { nodesApi, governanceApi } from '../services/api';
import { 
  validatePhone, 
  sanitizePhoneInput, 
  validateEmail, 
  validateRucDni, 
  sanitizeDocInput 
} from '../utils/validators';

export default function EntitiesManagement({ onEntityCreated }) {
  // Subsección activa: 'entities' | 'types' | 'roles'
  const [activeSubTab, setActiveSubTab] = useState('entities');

  // Estado general y feedback
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // ---------------------------------------------------------------------------
  // 1. ESTADO: ENTIDADES GESTORAS
  // ---------------------------------------------------------------------------
  const [entities, setEntities] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [entityModalMode, setEntityModalMode] = useState('create');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entitySubmitting, setEntitySubmitting] = useState(false);
  const [entityFormErrors, setEntityFormErrors] = useState({});

  const [entityFormData, setEntityFormData] = useState({
    nombre_entidad: '',
    tipo_entidad: 'JUNTA_USUARIOS',
    ruc: '',
    telefono_contacto: '',
    email_contacto: '',
    direccion: '',
    activo: true
  });

  // ---------------------------------------------------------------------------
  // 2. ESTADO: TIPOS DE ORGANIZACIÓN (tipos_entidad)
  // ---------------------------------------------------------------------------
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeModalMode, setTypeModalMode] = useState('create');
  const [selectedType, setSelectedType] = useState(null);
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  const [typeFormData, setTypeFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    nivel_jerarquico: 1,
    permite_riego: true,
    permite_piscicultura: false,
    activo: true
  });

  // ---------------------------------------------------------------------------
  // 3. ESTADO: CARGOS INSTITUCIONALES (cargos_institucionales)
  // ---------------------------------------------------------------------------
  const [roles, setRoles] = useState([]);
  const [roleFilterType, setRoleFilterType] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('create');
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleFormData, setRoleFormData] = useState({
    nombre_cargo: '',
    descripcion: '',
    id_tipo_entidad: '',
    es_directivo: false,
    activo: true
  });

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [entRes, typesRes, rolesRes] = await Promise.all([
        nodesApi.getEntities(true).catch(() => ({ data: [] })),
        governanceApi.getEntityTypes().catch(() => ({ data: [] })),
        governanceApi.getRoles().catch(() => ({ data: [] }))
      ]);
      setEntities(entRes.data || []);
      setEntityTypes(typesRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err) {
      console.error('Error cargando estructura institucional:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ---------------------------------------------------------------------------
  // HANDLERS: ENTIDADES GESTORAS
  // ---------------------------------------------------------------------------
  const openCreateEntityModal = () => {
    setEntityModalMode('create');
    setSelectedEntity(null);
    setEntityFormData({
      nombre_entidad: '',
      tipo_entidad: entityTypes[0]?.codigo || 'JUNTA_USUARIOS',
      ruc: '',
      telefono_contacto: '',
      email_contacto: '',
      direccion: '',
      activo: true
    });
    setEntityFormErrors({});
    setShowEntityModal(true);
  };

  const openEditEntityModal = (entity) => {
    setEntityModalMode('edit');
    setSelectedEntity(entity);
    setEntityFormData({
      nombre_entidad: entity.nombre_entidad || entity.nombre || '',
      tipo_entidad: entity.tipo_entidad || entityTypes[0]?.codigo || 'JUNTA_USUARIOS',
      ruc: entity.ruc || '',
      telefono_contacto: entity.telefono_contacto || '',
      email_contacto: entity.email_contacto || '',
      direccion: entity.direccion || '',
      activo: entity.activo !== false
    });
    setEntityFormErrors({});
    setShowEntityModal(true);
  };

  const handleEntityInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === 'checkbox' ? checked : value;

    if (name === 'ruc') {
      finalVal = sanitizeDocInput(value);
      if (finalVal) {
        const check = validateRucDni(finalVal, false);
        setEntityFormErrors(prev => ({ ...prev, ruc: check.error }));
      } else {
        setEntityFormErrors(prev => ({ ...prev, ruc: null }));
      }
    } else if (name === 'telefono_contacto') {
      finalVal = sanitizePhoneInput(value);
      if (finalVal) {
        const check = validatePhone(finalVal, false);
        setEntityFormErrors(prev => ({ ...prev, telefono_contacto: check.error }));
      } else {
        setEntityFormErrors(prev => ({ ...prev, telefono_contacto: null }));
      }
    } else if (name === 'email_contacto') {
      if (finalVal) {
        const check = validateEmail(finalVal, false);
        setEntityFormErrors(prev => ({ ...prev, email_contacto: check.error }));
      } else {
        setEntityFormErrors(prev => ({ ...prev, email_contacto: null }));
      }
    }

    setEntityFormData(prev => ({
      ...prev,
      [name]: finalVal
    }));
  };

  const handleEntitySubmit = async (e) => {
    e.preventDefault();
    setEntityFormErrors({});

    if (!entityFormData.nombre_entidad.trim()) {
      setFeedbackMsg({ type: 'error', text: 'El nombre de la entidad es obligatorio.' });
      return;
    }

    if (entityFormData.ruc && entityFormData.ruc.trim()) {
      const rucCheck = validateRucDni(entityFormData.ruc, false);
      if (!rucCheck.isValid || (rucCheck.type && rucCheck.type !== 'RUC')) {
        const msg = rucCheck.error || 'El RUC debe tener 11 dígitos y comenzar con 10, 15, 17 o 20.';
        setEntityFormErrors(prev => ({ ...prev, ruc: msg }));
        setFeedbackMsg({ type: 'error', text: msg });
        return;
      }
    }

    let cleanedEmail = null;
    if (entityFormData.email_contacto && entityFormData.email_contacto.trim()) {
      const emailCheck = validateEmail(entityFormData.email_contacto, false);
      if (!emailCheck.isValid) {
        setEntityFormErrors(prev => ({ ...prev, email_contacto: emailCheck.error }));
        setFeedbackMsg({ type: 'error', text: emailCheck.error });
        return;
      }
      cleanedEmail = emailCheck.formatted;
    }

    let cleanedPhone = null;
    if (entityFormData.telefono_contacto && entityFormData.telefono_contacto.trim()) {
      const phoneCheck = validatePhone(entityFormData.telefono_contacto, false);
      if (!phoneCheck.isValid) {
        setEntityFormErrors(prev => ({ ...prev, telefono_contacto: phoneCheck.error }));
        setFeedbackMsg({ type: 'error', text: phoneCheck.error });
        return;
      }
      cleanedPhone = phoneCheck.formatted;
    }

    setEntitySubmitting(true);
    try {
      const payload = {
        ...entityFormData,
        email_contacto: cleanedEmail,
        telefono_contacto: cleanedPhone,
        ruc: entityFormData.ruc ? entityFormData.ruc.trim() : null
      };

      if (entityModalMode === 'create') {
        await nodesApi.createEntity(payload);
        setFeedbackMsg({ type: 'success', text: `¡Entidad '${entityFormData.nombre_entidad}' registrada con éxito!` });
      } else {
        await nodesApi.updateEntity(selectedEntity.id_entidad, payload);
        setFeedbackMsg({ type: 'success', text: `¡Entidad '${entityFormData.nombre_entidad}' actualizada con éxito!` });
      }
      setShowEntityModal(false);
      fetchAllData();
      if (onEntityCreated) onEntityCreated();
    } catch (err) {
      console.error('Error al procesar entidad:', err);
      setFeedbackMsg({ type: 'error', text: 'Error al procesar entidad: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setEntitySubmitting(false);
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
      fetchAllData();
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

  // ---------------------------------------------------------------------------
  // HANDLERS: TIPOS DE ORGANIZACIÓN
  // ---------------------------------------------------------------------------
  const openCreateTypeModal = () => {
    setTypeModalMode('create');
    setSelectedType(null);
    setTypeFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      nivel_jerarquico: 2,
      permite_riego: true,
      permite_piscicultura: false,
      activo: true
    });
    setShowTypeModal(true);
  };

  const openEditTypeModal = (type) => {
    setTypeModalMode('edit');
    setSelectedType(type);
    setTypeFormData({
      codigo: type.codigo,
      nombre: type.nombre,
      descripcion: type.descripcion || '',
      nivel_jerarquico: type.nivel_jerarquico ?? 2,
      permite_riego: type.permite_riego !== false,
      permite_piscicultura: type.permite_piscicultura === true,
      activo: type.activo !== false
    });
    setShowTypeModal(true);
  };

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    if (!typeFormData.codigo.trim() || !typeFormData.nombre.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Código y Nombre son obligatorios.' });
      return;
    }

    setTypeSubmitting(true);
    try {
      if (typeModalMode === 'create') {
        await governanceApi.createEntityType({
          ...typeFormData,
          codigo: typeFormData.codigo.toUpperCase().replace(/\s+/g, '_')
        });
        setFeedbackMsg({ type: 'success', text: `Tipo '${typeFormData.nombre}' creado exitosamente.` });
      } else {
        await governanceApi.updateEntityType(selectedType.id_tipo_entidad, typeFormData);
        setFeedbackMsg({ type: 'success', text: `Tipo '${typeFormData.nombre}' actualizado.` });
      }
      setShowTypeModal(false);
      fetchAllData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error al guardar tipo de organización: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setTypeSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: CARGOS INSTITUCIONALES
  // ---------------------------------------------------------------------------
  const openCreateRoleModal = () => {
    setRoleModalMode('create');
    setSelectedRole(null);
    setRoleFormData({
      nombre_cargo: '',
      descripcion: '',
      id_tipo_entidad: entityTypes[0]?.id_tipo_entidad || '',
      es_directivo: false,
      activo: true
    });
    setShowRoleModal(true);
  };

  const openEditRoleModal = (role) => {
    setRoleModalMode('edit');
    setSelectedRole(role);
    setRoleFormData({
      nombre_cargo: role.nombre_cargo,
      descripcion: role.descripcion || '',
      id_tipo_entidad: role.id_tipo_entidad || '',
      es_directivo: role.es_directivo === true,
      activo: role.activo !== false
    });
    setShowRoleModal(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!roleFormData.nombre_cargo.trim() || !roleFormData.id_tipo_entidad) {
      setFeedbackMsg({ type: 'error', text: 'Nombre de cargo y tipo de entidad son obligatorios.' });
      return;
    }

    setRoleSubmitting(true);
    try {
      const payload = {
        ...roleFormData,
        id_tipo_entidad: parseInt(roleFormData.id_tipo_entidad)
      };

      if (roleModalMode === 'create') {
        await governanceApi.createRole(payload);
        setFeedbackMsg({ type: 'success', text: `Cargo '${roleFormData.nombre_cargo}' creado exitosamente.` });
      } else {
        await governanceApi.updateRole(selectedRole.id_cargo, payload);
        setFeedbackMsg({ type: 'success', text: `Cargo '${roleFormData.nombre_cargo}' actualizado.` });
      }
      setShowRoleModal(false);
      fetchAllData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error al guardar cargo: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setRoleSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`¿Eliminar o desactivar el cargo institucional '${role.nombre_cargo}'?`)) return;
    try {
      await governanceApi.deleteRole(role.id_cargo);
      setFeedbackMsg({ type: 'success', text: `Cargo '${role.nombre_cargo}' eliminado.` });
      fetchAllData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error al eliminar cargo: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTRADO
  // ---------------------------------------------------------------------------
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

  const filteredRoles = roles.filter(r => {
    if (!roleFilterType) return true;
    return String(r.id_tipo_entidad) === String(roleFilterType);
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
      {/* Encabezado Principal y Selector de Subpestañas */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Subsección 1: Estructura Institucional & Gobernanza</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Estructura Institucional de la Cuenca
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Gestión normalizada de Entidades Gestoras (Juntas, ANA, Comisiones), Tipos de Organización y Cargos Institucionales para asignación de roles.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-cyan-900/60 transition-all shadow-sm cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          {activeSubTab === 'entities' && (
            <button
              onClick={openCreateEntityModal}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nueva Entidad</span>
            </button>
          )}

          {activeSubTab === 'types' && (
            <button
              onClick={openCreateTypeModal}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Tipo de Entidad</span>
            </button>
          )}

          {activeSubTab === 'roles' && (
            <button
              onClick={openCreateRoleModal}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Cargo</span>
            </button>
          )}
        </div>
      </div>

      {/* Subpestañas Internas */}
      <div className="flex border-b border-slate-200 dark:border-cyan-900/60 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('entities')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'entities'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Entidades Gestoras ({entities.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('types')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'types'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Tipos de Organización ({entityTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'roles'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Cargos Institucionales ({roles.length})</span>
        </button>
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

      {/* ======================================================================= */}
      {/* VISTA 1: ENTIDADES GESTORAS */}
      {/* ======================================================================= */}
      {activeSubTab === 'entities' && (
        <div className="space-y-6">
          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar entidad por nombre, ámbito, RUC o tipo..."
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
                {search ? 'No hay resultados para tu búsqueda.' : 'Aún no hay entidades registradas. Crea la primera entidad gestora para vincular estaciones.'}
              </p>
              <button
                onClick={openCreateEntityModal}
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

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-cyan-950/60">
                        <button
                          onClick={() => openEditEntityModal(entity)}
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
        </div>
      )}

      {/* ======================================================================= */}
      {/* VISTA 2: TIPOS DE ORGANIZACIÓN (tipos_entidad) */}
      {/* ======================================================================= */}
      {activeSubTab === 'types' && (
        <div className="space-y-4">
          <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#061e2b]/90 border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Código Identificador</th>
                    <th className="py-3.5 px-4 font-bold">Nombre del Tipo</th>
                    <th className="py-3.5 px-4 font-bold">Nivel Jerárquico</th>
                    <th className="py-3.5 px-4 font-bold">Permisos de Cuenca</th>
                    <th className="py-3.5 px-4 font-bold">Estado</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
                  {entityTypes.map((type) => {
                    const isTypeActive = type.activo !== false;
                    return (
                      <tr key={type.id_tipo_entidad} className="hover:bg-slate-50/50 dark:hover:bg-cyan-950/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-300">
                          {type.codigo}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          <div>{type.nombre}</div>
                          {type.descripcion && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                              {type.descripcion}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            Nivel {type.nivel_jerarquico}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 space-x-1">
                          {type.permite_riego && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700">
                              💧 Riego Agrario
                            </span>
                          )}
                          {type.permite_piscicultura && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
                              🐟 Piscicultura
                            </span>
                          )}
                          {!type.permite_riego && !type.permite_piscicultura && (
                            <span className="text-[11px] text-slate-400">Gobernanza General</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isTypeActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                              <XCircle className="w-3 h-3" /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openEditTypeModal(type)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-cyan-950/60 hover:bg-slate-200 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 rounded-xl font-semibold transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 inline mr-1" /> Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* VISTA 3: CARGOS INSTITUCIONALES (cargos_institucionales) */}
      {/* ======================================================================= */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          {/* Filtro por Tipo de Entidad */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filtrar por Tipo de Entidad:</span>
              <select
                value={roleFilterType}
                onChange={(e) => setRoleFilterType(e.target.value)}
                className="bg-white dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
              >
                <option value="">Todos los Tipos de Entidad</option>
                {entityTypes.map(t => (
                  <option key={t.id_tipo_entidad} value={t.id_tipo_entidad}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#061e2b]/90 border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Cargo Institucional</th>
                    <th className="py-3.5 px-4 font-bold">Tipo de Entidad Asociada</th>
                    <th className="py-3.5 px-4 font-bold">Jerarquía / Directivo</th>
                    <th className="py-3.5 px-4 font-bold">Descripción</th>
                    <th className="py-3.5 px-4 font-bold">Estado</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
                  {filteredRoles.map((role) => {
                    const matchedType = entityTypes.find(t => t.id_tipo_entidad === role.id_tipo_entidad);
                    return (
                      <tr key={role.id_cargo} className="hover:bg-slate-50/50 dark:hover:bg-cyan-950/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {role.nombre_cargo}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-cyan-600 dark:text-cyan-300">
                          {matchedType ? matchedType.nombre : `Tipo #${role.id_tipo_entidad}`}
                        </td>
                        <td className="py-3.5 px-4">
                          {role.es_directivo ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              ⭐ Miembro Directivo
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Operativo / Técnico</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {role.descripcion || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          {role.activo !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                              <XCircle className="w-3 h-3" /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditRoleModal(role)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-cyan-950/60 hover:bg-slate-200 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 rounded-xl font-semibold transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 inline mr-1" /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role)}
                            className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-xl font-semibold transition-colors cursor-pointer"
                            title="Eliminar cargo"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 1: CREAR / EDITAR ENTIDAD GESTORA */}
      {/* ======================================================================= */}
      {showEntityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {entityModalMode === 'create' ? 'Registrar Entidad Gestora' : 'Editar Entidad Gestora'}
                </h3>
              </div>
              <button
                onClick={() => setShowEntityModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEntitySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre Oficial de la Entidad *</label>
                <input
                  type="text"
                  name="nombre_entidad"
                  required
                  placeholder="Ej: Junta de Usuarios del Sector Hidráulico Chancay-Huaral"
                  value={entityFormData.nombre_entidad}
                  onChange={handleEntityInputChange}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Entidad (Dinámico)</label>
                  <select
                    name="tipo_entidad"
                    value={entityFormData.tipo_entidad}
                    onChange={handleEntityInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    {entityTypes.length > 0 ? (
                      entityTypes.map(t => (
                        <option key={t.id_tipo_entidad} value={t.codigo} className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                          {t.nombre}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="JUNTA_USUARIOS">Junta de Usuarios</option>
                        <option value="COMISION_REGANTES">Comisión de Regantes</option>
                        <option value="AUTORIDAD_NACIONAL">Autoridad de Agua (ANA)</option>
                        <option value="GOBIERNO_REGIONAL">Gobierno Regional / Local</option>
                      </>
                    )}
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
                    value={entityFormData.ruc}
                    onChange={handleEntityInputChange}
                    className={`w-full bg-slate-50 dark:bg-[#061821] border rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none font-mono transition-all ${
                      entityFormErrors.ruc
                        ? 'border-rose-500 ring-1 ring-rose-500/50'
                        : 'border-slate-300 dark:border-cyan-900/60 focus:border-cyan-500'
                    }`}
                  />
                  {entityFormErrors.ruc && (
                    <p className="text-[10px] text-rose-500 font-medium">{entityFormErrors.ruc}</p>
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
                    value={entityFormData.email_contacto}
                    onChange={handleEntityInputChange}
                    className={`w-full bg-slate-50 dark:bg-[#061821] border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none transition-all ${
                      entityFormErrors.email_contacto
                        ? 'border-rose-500 ring-1 ring-rose-500/50'
                        : 'border-slate-300 dark:border-cyan-900/60 focus:border-cyan-500'
                    }`}
                  />
                  {entityFormErrors.email_contacto && (
                    <p className="text-[10px] text-rose-500 font-medium">{entityFormErrors.email_contacto}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    name="telefono_contacto"
                    placeholder="+51987654321"
                    value={entityFormData.telefono_contacto}
                    onChange={handleEntityInputChange}
                    className={`w-full bg-slate-50 dark:bg-[#061821] border rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none font-mono transition-all ${
                      entityFormErrors.telefono_contacto
                        ? 'border-rose-500 ring-1 ring-rose-500/50'
                        : 'border-slate-300 dark:border-cyan-900/60 focus:border-cyan-500'
                    }`}
                  />
                  {entityFormErrors.telefono_contacto && (
                    <p className="text-[10px] text-rose-500 font-medium">{entityFormErrors.telefono_contacto}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Dirección o Sede Institucional</label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Ej: Av. Solar 123, Huaral, Perú"
                  value={entityFormData.direccion}
                  onChange={handleEntityInputChange}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowEntityModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={entitySubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-extrabold shadow-md cursor-pointer transition-all"
                >
                  {entitySubmitting ? 'Guardando...' : entityModalMode === 'create' ? 'Crear Entidad' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: CREAR / EDITAR TIPO DE ENTIDAD */}
      {/* ======================================================================= */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-cyan-500" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {typeModalMode === 'create' ? 'Nuevo Tipo de Organización' : 'Editar Tipo de Organización'}
                </h3>
              </div>
              <button
                onClick={() => setShowTypeModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTypeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Código Único (Mayúsculas) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ASOCIACION_PRODUCTORES"
                  value={typeFormData.codigo}
                  disabled={typeModalMode === 'edit'}
                  onChange={(e) => setTypeFormData(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre Descriptivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Asociación de Productores Frutícolas"
                  value={typeFormData.nombre}
                  onChange={(e) => setTypeFormData(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Descripción Funcional</label>
                <textarea
                  rows={2}
                  placeholder="Propósito u objeto de esta organización..."
                  value={typeFormData.descripcion}
                  onChange={(e) => setTypeFormData(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nivel Jerárquico (1 = Superior)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={typeFormData.nivel_jerarquico}
                    onChange={(e) => setTypeFormData(p => ({ ...p, nivel_jerarquico: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col justify-center space-y-2 pt-2">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={typeFormData.permite_riego}
                      onChange={(e) => setTypeFormData(p => ({ ...p, permite_riego: e.target.checked }))}
                      className="rounded text-cyan-500 focus:ring-0"
                    />
                    <span>💧 Permite Riego</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={typeFormData.permite_piscicultura}
                      onChange={(e) => setTypeFormData(p => ({ ...p, permite_piscicultura: e.target.checked }))}
                      className="rounded text-teal-500 focus:ring-0"
                    />
                    <span>🐟 Piscicultura</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={typeSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-xs font-extrabold shadow-md cursor-pointer"
                >
                  {typeSubmitting ? 'Guardando...' : 'Guardar Tipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 3: CREAR / EDITAR CARGO INSTITUCIONAL */}
      {/* ======================================================================= */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-4">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-cyan-500" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {roleModalMode === 'create' ? 'Registrar Cargo Institucional' : 'Editar Cargo Institucional'}
                </h3>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Organización Vinculada *</label>
                <select
                  required
                  value={roleFormData.id_tipo_entidad}
                  onChange={(e) => setRoleFormData(p => ({ ...p, id_tipo_entidad: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="">Seleccione el tipo de organización...</option>
                  {entityTypes.map(t => (
                    <option key={t.id_tipo_entidad} value={t.id_tipo_entidad}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre del Cargo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Presidente del Consejo Directivo, Tomero de Sector..."
                  value={roleFormData.nombre_cargo}
                  onChange={(e) => setRoleFormData(p => ({ ...p, nombre_cargo: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Descripción / Responsabilidades</label>
                <textarea
                  rows={2}
                  placeholder="Atribuciones formales del cargo..."
                  value={roleFormData.descripcion}
                  onChange={(e) => setRoleFormData(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roleFormData.es_directivo}
                    onChange={(e) => setRoleFormData(p => ({ ...p, es_directivo: e.target.checked }))}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>⭐ Es Miembro del Consejo Directivo (Firma y Veeduría)</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={roleSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 text-xs font-extrabold shadow-md cursor-pointer"
                >
                  {roleSubmitting ? 'Guardando...' : 'Guardar Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
