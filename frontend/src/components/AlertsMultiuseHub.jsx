import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Users, 
  UserPlus, 
  Phone, 
  Trash2, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  ShieldAlert,
  Search,
  RefreshCw,
  X,
  Check,
  Building2,
  Radio,
  Sliders,
  AlertTriangle,
  FileText,
  Activity,
  Droplets,
  Fish,
  Home,
  Trees,
  Smartphone
} from 'lucide-react';
import { alertsApi, nodesApi } from '../services/api';
import { 
  validatePhone, 
  sanitizePhoneInput, 
  validateEmail, 
  validateRucDni, 
  sanitizeDocInput 
} from '../utils/validators';
import { formatDateTime } from '../utils/dateUtils';

export default function AlertsMultiuseHub() {
  // Subpestañas: 'padron' | 'umbrales' | 'bitacora'
  const [activeSubTab, setActiveSubTab] = useState('padron');

  // Estado general
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // ---------------------------------------------------------------------------
  // 1. ESTADO: PADRÓN MULTIUSO
  // ---------------------------------------------------------------------------
  const [recipients, setRecipients] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [entities, setEntities] = useState([]);
  const [search, setSearch] = useState('');
  const [waterUseFilter, setWaterUseFilter] = useState('ALL'); // ALL, AGRICULTOR, PISCICULTOR, ADMINISTRADOR_JASS, VEEDOR_ECOLOGICO

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [testModal, setTestModal] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono_whatsapp: '+51',
    dni_ruc: '',
    email: '',
    id_nodo_suscrito: '',
    id_entidad: '',
    rol_usuario: 'AGRICULTOR',
    tipo_cultivo: 'Melocotón Blanquillo',
    sector_predio: 'Sector Huayopampa',
    recibe_alertas_calidad: true,
    recibe_alertas_caudal: true,
    recibe_reporte_diario: false
  });

  // ---------------------------------------------------------------------------
  // 2. ESTADO: BITÁCORA DE ALERTAS
  // ---------------------------------------------------------------------------
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [ackSubmitting, setAckSubmitting] = useState({});

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------
  const fetchAllAlertsData = async () => {
    setLoading(true);
    try {
      const [recRes, nodeRes, entRes, alertsRes] = await Promise.all([
        alertsApi.getRecipients().catch(() => ({ data: [] })),
        nodesApi.getNodes().catch(() => ({ data: [] })),
        nodesApi.getEntities().catch(() => ({ data: [] })),
        alertsApi.getRecentAlerts(50).catch(() => ({ data: [] }))
      ]);

      setRecipients(recRes.data || []);
      setNodes(nodeRes.data || []);
      setEntities(entRes.data || []);
      setRecentAlerts(alertsRes.data || []);

      if (nodeRes.data && nodeRes.data.length > 0 && !formData.id_nodo_suscrito) {
        setFormData(prev => ({ 
          ...prev, 
          id_nodo_suscrito: nodeRes.data[0].id_nodo,
          id_entidad: entRes.data[0]?.id_entidad || ''
        }));
      }
    } catch (err) {
      console.error('Error cargando datos de alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAlertsData();
  }, []);

  // ---------------------------------------------------------------------------
  // HANDLERS: PADRÓN MULTIUSO
  // ---------------------------------------------------------------------------
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;

    if (name === 'telefono_whatsapp') {
      finalValue = sanitizePhoneInput(value);
      const valRes = validatePhone(finalValue, true);
      setFormErrors(prev => ({ ...prev, telefono_whatsapp: valRes.error }));
    } else if (name === 'dni_ruc') {
      finalValue = sanitizeDocInput(value);
      if (finalValue) {
        const valRes = validateRucDni(finalValue, false);
        setFormErrors(prev => ({ ...prev, dni_ruc: valRes.error }));
      } else {
        setFormErrors(prev => ({ ...prev, dni_ruc: null }));
      }
    } else if (name === 'email') {
      if (finalValue) {
        const valRes = validateEmail(finalValue, false);
        setFormErrors(prev => ({ ...prev, email: valRes.error }));
      } else {
        setFormErrors(prev => ({ ...prev, email: null }));
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedRecipient(null);
    setFormData({
      nombre_completo: '',
      telefono_whatsapp: '+51',
      dni_ruc: '',
      email: '',
      id_nodo_suscrito: nodes[0]?.id_nodo || '',
      id_entidad: entities[0]?.id_entidad || '',
      rol_usuario: 'AGRICULTOR',
      tipo_cultivo: 'Melocotón Blanquillo',
      sector_predio: 'Sector Huayopampa',
      recibe_alertas_calidad: true,
      recibe_alertas_caudal: true,
      recibe_reporte_diario: false
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (rec) => {
    setModalMode('edit');
    setSelectedRecipient(rec);
    setFormData({
      nombre_completo: rec.nombre_completo,
      telefono_whatsapp: rec.telefono_whatsapp,
      dni_ruc: rec.dni_ruc || '',
      email: rec.email || '',
      id_nodo_suscrito: rec.id_nodo_suscrito || (nodes[0]?.id_nodo || ''),
      id_entidad: rec.id_entidad || '',
      rol_usuario: rec.rol_usuario || 'AGRICULTOR',
      tipo_cultivo: rec.tipo_cultivo || '',
      sector_predio: rec.sector_predio || '',
      recibe_alertas_calidad: rec.recibe_alertas_calidad !== false,
      recibe_alertas_caudal: rec.recibe_alertas_caudal !== false,
      recibe_reporte_diario: rec.recibe_reporte_diario === true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const phoneCheck = validatePhone(formData.telefono_whatsapp, true);
    if (!phoneCheck.isValid) {
      setFormErrors(prev => ({ ...prev, telefono_whatsapp: phoneCheck.error }));
      setFeedbackMsg({ type: 'error', text: phoneCheck.error });
      return;
    }

    if (formData.dni_ruc) {
      const docCheck = validateRucDni(formData.dni_ruc, false);
      if (!docCheck.isValid) {
        setFormErrors(prev => ({ ...prev, dni_ruc: docCheck.error }));
        setFeedbackMsg({ type: 'error', text: docCheck.error });
        return;
      }
    }

    if (formData.email) {
      const emailCheck = validateEmail(formData.email, false);
      if (!emailCheck.isValid) {
        setFormErrors(prev => ({ ...prev, email: emailCheck.error }));
        setFeedbackMsg({ type: 'error', text: emailCheck.error });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        telefono_whatsapp: phoneCheck.formatted,
        id_entidad: formData.id_entidad ? parseInt(formData.id_entidad) : null
      };

      if (modalMode === 'create') {
        await alertsApi.registerRecipient(payload);
        setFeedbackMsg({ type: 'success', text: `¡Destinatario '${formData.nombre_completo}' registrado exitosamente!` });
      } else {
        await alertsApi.updateRecipient(selectedRecipient.id_destinatario, payload);
        setFeedbackMsg({ type: 'success', text: `¡Destinatario '${formData.nombre_completo}' actualizado!` });
      }
      setShowModal(false);
      fetchAllAlertsData();
    } catch (err) {
      console.error("Error guardando destinatario:", err);
      setFeedbackMsg({ type: 'error', text: "Error: " + (err.response?.data?.detail || err.message) });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Está seguro de eliminar a "${name}" del padrón multiuso?`)) return;
    try {
      await alertsApi.deleteRecipient(id);
      setFeedbackMsg({ type: 'success', text: `Destinatario '${name}' eliminado correctamente.` });
      fetchAllAlertsData();
    } catch (err) {
      console.error("Error eliminando destinatario:", err);
      setFeedbackMsg({ type: 'error', text: "Error al eliminar: " + (err.response?.data?.detail || err.message) });
    } finally {
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testMessage.trim()) return;
    setSendingTest(true);
    try {
      await alertsApi.sendTestWhatsApp({
        telefono: testModal.telefono_whatsapp,
        nombre: testModal.nombre_completo,
        mensaje: testMessage
      });
      setFeedbackMsg({ type: 'success', text: `¡Mensaje simulado enviado con éxito a ${testModal.nombre_completo}!` });
      setTestModal(null);
      setTestMessage('');
    } catch (err) {
      console.error("Error enviando WhatsApp de prueba:", err);
      setFeedbackMsg({ type: 'error', text: "Error al enviar mensaje: " + (err.response?.data?.detail || err.message) });
    } finally {
      setSendingTest(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: BITÁCORA DE ALERTAS
  // ---------------------------------------------------------------------------
  const handleAcknowledge = async (alertId) => {
    setAckSubmitting(prev => ({ ...prev, [alertId]: true }));
    try {
      await alertsApi.acknowledgeAlert(alertId);
      setRecentAlerts(prev => prev.map(a => a.id_alerta === alertId ? { ...a, estado: 'RECONOCIDO' } : a));
      setFeedbackMsg({ type: 'success', text: `Alerta #${alertId} reconocida por el operador.` });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error al reconocer alerta: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setAckSubmitting(prev => ({ ...prev, [alertId]: false }));
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTRADO
  // ---------------------------------------------------------------------------
  const filteredRecipients = recipients.filter(r => {
    const matchesSearch = 
      r.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
      r.telefono_whatsapp?.includes(search) ||
      r.sector_predio?.toLowerCase().includes(search.toLowerCase()) ||
      r.tipo_cultivo?.toLowerCase().includes(search.toLowerCase()) ||
      r.dni_ruc?.includes(search);

    if (!matchesSearch) return false;

    if (waterUseFilter === 'ALL') return true;
    return r.rol_usuario === waterUseFilter;
  });

  const filteredAlerts = recentAlerts.filter(a => {
    if (severityFilter === 'ALL') return true;
    return (a.nivel_severidad || a.severidad || '').toUpperCase() === severityFilter;
  });

  const getWaterUseBadge = (rol) => {
    switch (rol) {
      case 'PISCICULTOR':
        return { label: '🐟 Piscícola (Truchas)', color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300' };
      case 'ADMINISTRADOR_JASS':
        return { label: '🚰 Poblacional (JASS)', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300' };
      case 'VEEDOR_ECOLOGICO':
        return { label: '🌱 Ecológico / Veedor', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'DIRIGENTE_COMUNAL':
        return { label: '🏛️ Dirigente Comunal', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300' };
      case 'AGRICULTOR':
      default:
        return { label: '💧 Agrario (Regante)', color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado Principal */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Bell className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Subsección 4: Alertas Tempranas & Padrón Multiuso</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Gestión Multiuso y Despacho de Contingencias
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Padrón segmentado de destinatarios por uso de agua (Agrario, Truchas, JASS poblacional, Veedores), monitoreo de umbrales regulatorios y bitácora de contingencias.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAllAlertsData}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-cyan-900/60 transition-all shadow-sm cursor-pointer"
            title="Actualizar padrón y alertas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          {activeSubTab === 'padron' && (
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[3]" />
              <span>Registrar Destinatario</span>
            </button>
          )}
        </div>
      </div>

      {/* Subpestañas Internas */}
      <div className="flex border-b border-slate-200 dark:border-cyan-900/60 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('padron')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'padron'
              ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Padrón Multiuso ({recipients.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('umbrales')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'umbrales'
              ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Umbrales por Estación ({nodes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bitacora')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'bitacora'
              ? 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Bitácora de Alertas Despachadas ({recentAlerts.length})</span>
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
      {/* VISTA 1: PADRÓN MULTIUSO */}
      {/* ======================================================================= */}
      {activeSubTab === 'padron' && (
        <div className="space-y-6">
          {/* Chips de Segmentación Multiuso & Búsqueda */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-rose-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono WhatsApp, sector, cultivo o DNI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#061821] p-1 rounded-2xl border border-slate-300 dark:border-cyan-900/60 text-xs font-bold">
              <button
                onClick={() => setWaterUseFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  waterUseFilter === 'ALL'
                    ? 'bg-rose-500 text-white font-extrabold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({recipients.length})
              </button>
              <button
                onClick={() => setWaterUseFilter('AGRICULTOR')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  waterUseFilter === 'AGRICULTOR'
                    ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-cyan-400'
                }`}
              >
                💧 Agrario ({recipients.filter(r => r.rol_usuario === 'AGRICULTOR').length})
              </button>
              <button
                onClick={() => setWaterUseFilter('PISCICULTOR')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  waterUseFilter === 'PISCICULTOR'
                    ? 'bg-teal-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-teal-400'
                }`}
              >
                🐟 Truchas ({recipients.filter(r => r.rol_usuario === 'PISCICULTOR').length})
              </button>
              <button
                onClick={() => setWaterUseFilter('ADMINISTRADOR_JASS')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  waterUseFilter === 'ADMINISTRADOR_JASS'
                    ? 'bg-blue-500 text-white font-extrabold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-400'
                }`}
              >
                🚰 JASS ({recipients.filter(r => r.rol_usuario === 'ADMINISTRADOR_JASS').length})
              </button>
              <button
                onClick={() => setWaterUseFilter('VEEDOR_ECOLOGICO')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  waterUseFilter === 'VEEDOR_ECOLOGICO'
                    ? 'bg-emerald-500 text-white font-extrabold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-400'
                }`}
              >
                🌱 Ecológico ({recipients.filter(r => r.rol_usuario === 'VEEDOR_ECOLOGICO').length})
              </button>
            </div>
          </div>

          {/* Grilla de Destinatarios Multiuso */}
          {loading && recipients.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
              <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">Cargando padrón multiuso...</p>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="spatial-card p-12 text-center space-y-4">
              <Users className="w-12 h-12 text-rose-500/50 mx-auto" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">No se encontraron destinatarios</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                {search ? 'Sin coincidencias para la búsqueda.' : 'No hay destinatarios registrados para esta categoría de uso.'}
              </p>
              <button
                onClick={openCreateModal}
                className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Registrar Destinatario
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipients.map((rec) => {
                const waterBadge = getWaterUseBadge(rec.rol_usuario);
                const assignedNode = nodes.find(n => n.id_nodo === rec.id_nodo_suscrito);
                return (
                  <div key={rec.id_destinatario} className="spatial-card p-6 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full border font-bold ${waterBadge.color}`}>
                          {waterBadge.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {rec.dni_ruc ? `DNI: ${rec.dni_ruc}` : 'Sin DNI'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {rec.nombre_completo}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {rec.sector_predio || 'Sector sin especificar'} • <span className="font-semibold text-cyan-600 dark:text-cyan-400">{rec.tipo_cultivo || 'Uso no especificado'}</span>
                        </p>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-mono">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-bold">{rec.telefono_whatsapp}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                          <Radio className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Nodo: {assignedNode?.nombre_nodo || rec.id_nodo_suscrito || 'Todos'}</span>
                        </div>
                      </div>

                      {/* Canales de Notificación */}
                      <div className="flex flex-wrap gap-1 pt-2">
                        {rec.recibe_alertas_caudal && (
                          <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 rounded-md text-[10px] font-bold">
                            🌊 Caudal
                          </span>
                        )}
                        {rec.recibe_alertas_calidad && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md text-[10px] font-bold">
                            ⚠️ Calidad
                          </span>
                        )}
                        {rec.recibe_reporte_diario && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded-md text-[10px] font-bold">
                            📊 Reporte Diario
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-cyan-900/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setTestModal(rec);
                          setTestMessage(`[SENTINEL-H2O] Estimado(a) ${rec.nombre_completo}, confirmamos su suscripción al canal de alertas tempranas.`);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Enviar WhatsApp de prueba"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Test WhatsApp</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(rec)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id_destinatario, rec.nombre_completo)}
                          className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
      {/* VISTA 2: UMBRALES POR ESTACIÓN */}
      {/* ======================================================================= */}
      {activeSubTab === 'umbrales' && (
        <div className="space-y-4">
          <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
            <div className="p-4 border-b border-slate-200 dark:border-cyan-900/60 bg-slate-50 dark:bg-[#061e2b]/90">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Umbrales de Calidad & Caudal Regulatorio (ECA Agua Categoría 3 y 4)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Puntos de consigna automáticos configurados en la memoria flash de los micronodos ESP32 para disparo de alertas tempranas.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#061821] border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Estación / Nodo</th>
                    <th className="py-3.5 px-4 font-bold">Tipo de Fuente</th>
                    <th className="py-3.5 px-4 font-bold">Caudal Alerta (m³/s)</th>
                    <th className="py-3.5 px-4 font-bold">Turbidez Máx (NTU)</th>
                    <th className="py-3.5 px-4 font-bold">Conductividad Máx (µS/cm)</th>
                    <th className="py-3.5 px-4 font-bold">Rango pH Óptimo</th>
                    <th className="py-3.5 px-4 font-bold">Nivel Alarma (m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40 font-mono">
                  {nodes.map((node) => (
                    <tr key={node.id_nodo} className="hover:bg-slate-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-sans">
                        <div className="flex items-center space-x-2">
                          <Radio className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                          <span>{node.nombre_nodo}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono font-normal">
                          {node.id_nodo}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-300">
                        {node.tipo_recurso_hidrico || 'Superficial (Río)'}
                      </td>
                      <td className="py-3.5 px-4 text-cyan-600 dark:text-cyan-300 font-bold">
                        {node.caudal_minimo_alerta ?? '0.50'} m³/s
                      </td>
                      <td className="py-3.5 px-4 text-amber-600 dark:text-amber-300">
                        {node.turbidez_max_ntu ?? '50.0'} NTU
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-300">
                        {node.conductividad_max_us ?? '1500'} µS/cm
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-200">
                        6.5 - 8.5
                      </td>
                      <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-bold">
                        {node.nivel_alerta_m ?? '2.20'} m
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
      {/* VISTA 3: BITÁCORA DE ALERTAS DESPACHADAS */}
      {/* ======================================================================= */}
      {activeSubTab === 'bitacora' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Filtrar por Severidad:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-white dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
              >
                <option value="ALL">Todas las Severidades</option>
                <option value="CRITICAL">CRITICAL (Crítico)</option>
                <option value="WARNING">WARNING (Advertencia)</option>
                <option value="INFO">INFO (Informativo)</option>
              </select>
            </div>
          </div>

          <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#061e2b]/90 border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Fecha / Hora</th>
                    <th className="py-3.5 px-4 font-bold">Estación</th>
                    <th className="py-3.5 px-4 font-bold">Parámetro Disparador</th>
                    <th className="py-3.5 px-4 font-bold">Severidad</th>
                    <th className="py-3.5 px-4 font-bold">Mensaje Despachado</th>
                    <th className="py-3.5 px-4 font-bold">Estado</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-slate-500 font-mono">
                        No hay registros de contingencias recientes.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alerta) => {
                      const sev = (alerta.nivel_severidad || alerta.severidad || 'INFO').toUpperCase();
                      const isAck = alerta.estado === 'RECONOCIDO' || alerta.atendido;
                      return (
                        <tr key={alerta.id_alerta} className="hover:bg-slate-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatDateTime(alerta.fecha_hora || alerta.timestamp)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {alerta.id_nodo}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-cyan-600 dark:text-cyan-300">
                            {alerta.parametro || 'CAUDAL_DEFICIT'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              sev === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                : sev === 'WARNING'
                                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {sev}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                            {alerta.mensaje || alerta.descripcion || 'Sin descripción'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isAck ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Atendido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" /> Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {!isAck && (
                              <button
                                onClick={() => handleAcknowledge(alerta.id_alerta)}
                                disabled={ackSubmitting[alerta.id_alerta]}
                                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                {ackSubmitting[alerta.id_alerta] ? 'Procesando...' : 'Reconocer'}
                              </button>
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
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 1: REGISTRAR / EDITAR DESTINATARIO */}
      {/* ======================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#072433] border border-slate-300 dark:border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-rose-900/60 pb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-rose-500" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {modalMode === 'create' ? 'Registrar Destinatario en Padrón' : 'Editar Destinatario'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Carlos Pérez"
                  value={formData.nombre_completo}
                  onChange={handleInputChange}
                  name="nombre_completo"
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Teléfono WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+51987654321"
                    value={formData.telefono_whatsapp}
                    onChange={handleInputChange}
                    name="telefono_whatsapp"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                  {formErrors.telefono_whatsapp && (
                    <p className="text-[10px] text-rose-500">{formErrors.telefono_whatsapp}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">DNI / RUC (Opcional)</label>
                  <input
                    type="text"
                    placeholder="8 u 11 dígitos"
                    value={formData.dni_ruc}
                    onChange={handleInputChange}
                    name="dni_ruc"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                  {formErrors.dni_ruc && (
                    <p className="text-[10px] text-rose-500">{formErrors.dni_ruc}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tipo de Uso del Agua *</label>
                  <select
                    name="rol_usuario"
                    value={formData.rol_usuario}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
                  >
                    <option value="AGRICULTOR">💧 Agrario (Regante)</option>
                    <option value="PISCICULTOR">🐟 Piscícola (Truchas)</option>
                    <option value="ADMINISTRADOR_JASS">🚰 Poblacional (JASS)</option>
                    <option value="VEEDOR_ECOLOGICO">🌱 Ecológico / Veedor</option>
                    <option value="DIRIGENTE_COMUNAL">🏛️ Dirigente Comunal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Cultivo / Especie Productiva</label>
                  <input
                    type="text"
                    placeholder="Ej: Melocotón, Palto, Trucha"
                    value={formData.tipo_cultivo}
                    onChange={handleInputChange}
                    name="tipo_cultivo"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sector / Predio / Parcela</label>
                  <input
                    type="text"
                    placeholder="Ej: Huayopampa Alta"
                    value={formData.sector_predio}
                    onChange={handleInputChange}
                    name="sector_predio"
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Estación Telemétrica Suscrita</label>
                  <select
                    name="id_nodo_suscrito"
                    value={formData.id_nodo_suscrito}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
                  >
                    {nodes.map(n => (
                      <option key={n.id_nodo} value={n.id_nodo}>{n.nombre_nodo}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles de Suscripción */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-cyan-900/60">
                <span className="font-bold text-slate-700 dark:text-slate-300">Canales de Notificación Activos:</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      name="recibe_alertas_caudal"
                      checked={formData.recibe_alertas_caudal}
                      onChange={handleInputChange}
                      className="rounded text-rose-500 focus:ring-0"
                    />
                    <span>Alertas de Caudal</span>
                  </label>
                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      name="recibe_alertas_calidad"
                      checked={formData.recibe_alertas_calidad}
                      onChange={handleInputChange}
                      className="rounded text-amber-500 focus:ring-0"
                    />
                    <span>Alertas de Calidad</span>
                  </label>
                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      name="recibe_reporte_diario"
                      checked={formData.recibe_reporte_diario}
                      onChange={handleInputChange}
                      className="rounded text-purple-500 focus:ring-0"
                    />
                    <span>Reporte Matutino</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-extrabold shadow-md cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Guardar Destinatario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: PRUEBA DE MENSAJERÍA WHATSAPP */}
      {/* ======================================================================= */}
      {testModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#072433] border border-slate-300 dark:border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-900/60 pb-3">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Despacho de WhatsApp de Prueba
                </h3>
              </div>
              <button
                onClick={() => setTestModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p>Destinatario: <strong className="text-slate-900 dark:text-white">{testModal.nombre_completo}</strong></p>
              <p>Número: <strong className="font-mono text-emerald-500">{testModal.telefono_whatsapp}</strong></p>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Mensaje a Enviar:</label>
                <textarea
                  rows={4}
                  required
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setTestModal(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-extrabold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingTest ? 'Enviando...' : 'Enviar Prueba'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
