import React, { useState, useEffect } from 'react';
import { 
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

export default function RecipientsManagement() {
  const [recipients, setRecipients] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [testModal, setTestModal] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [formErrors, setFormErrors] = useState({});

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, nodeRes, entRes] = await Promise.all([
        alertsApi.getRecipients(),
        nodesApi.getNodes(),
        nodesApi.getEntities()
      ]);
      setRecipients(recRes.data || []);
      setNodes(nodeRes.data || []);
      setEntities(entRes.data || []);
      if (nodeRes.data && nodeRes.data.length > 0 && !formData.id_nodo_suscrito) {
        setFormData(prev => ({ 
          ...prev, 
          id_nodo_suscrito: nodeRes.data[0].id_nodo,
          id_entidad: entRes.data[0]?.id_entidad || 1
        }));
      }
    } catch (err) {
      console.error("Error cargando regantes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;

    // Sanitización en tiempo real
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validar teléfono obligatorio
    const phoneCheck = validatePhone(formData.telefono_whatsapp, true);
    if (!phoneCheck.isValid) {
      setFormErrors(prev => ({ ...prev, telefono_whatsapp: phoneCheck.error }));
      setFeedbackMsg({ type: 'error', text: phoneCheck.error });
      return;
    }

    // Validar DNI / RUC si fue ingresado
    if (formData.dni_ruc) {
      const docCheck = validateRucDni(formData.dni_ruc, false);
      if (!docCheck.isValid) {
        setFormErrors(prev => ({ ...prev, dni_ruc: docCheck.error }));
        setFeedbackMsg({ type: 'error', text: docCheck.error });
        return;
      }
    }

    // Validar email si fue ingresado
    if (formData.email) {
      const emailCheck = validateEmail(formData.email, false);
      if (!emailCheck.isValid) {
        setFormErrors(prev => ({ ...prev, email: emailCheck.error }));
        setFeedbackMsg({ type: 'error', text: emailCheck.error });
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        telefono_whatsapp: phoneCheck.formatted
      };
      await alertsApi.registerRecipient(payload);
      setFeedbackMsg({ type: 'success', text: `¡Regante '${formData.nombre_completo}' inscrito con éxito!` });
      setShowModal(false);
      setFormData({
        nombre_completo: '',
        telefono_whatsapp: '+51',
        dni_ruc: '',
        email: '',
        id_nodo_suscrito: nodes[0]?.id_nodo || '',
        id_entidad: entities[0]?.id_entidad || 1,
        rol_usuario: 'AGRICULTOR',
        tipo_cultivo: 'Melocotón Blanquillo',
        sector_predio: 'Sector Huayopampa',
        recibe_alertas_calidad: true,
        recibe_alertas_caudal: true,
        recibe_reporte_diario: false
      });
      fetchData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: "Error registrando suscriptor: " + (err.response?.data?.detail || err.message) });
    } finally {
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Eliminar la suscripción de '${name}'? Ya no recibirá alertas automáticas.`)) {
      try {
        await alertsApi.deleteRecipient(id);
        fetchData();
      } catch (err) {
        alert("Error al eliminar: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleSendTestAlert = async (e) => {
    e.preventDefault();
    setSendingTest(true);
    try {
      await alertsApi.sendTestWhatsApp({
        phone_number: testModal.telefono_whatsapp,
        message_text: testMessage || undefined
      });
      alert("¡Alerta despachada con éxito! (En modo local se registró en la terminal/logs de Docker)");
      setTestModal(null);
      setTestMessage('');
    } catch (err) {
      alert("Error despachando mensaje: " + (err.response?.data?.detail || err.message));
    } finally {
      setSendingTest(false);
    }
  };

  const filteredRecipients = recipients.filter(r => 
    r.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    r.telefono_whatsapp.includes(search) ||
    (r.sector_predio && r.sector_predio.toLowerCase().includes(search.toLowerCase())) ||
    (r.id_nodo_suscrito && r.id_nodo_suscrito.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Smartphone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Paso 4: Notificaciones en Campo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Padrón de Regantes & Alertas WhatsApp
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Inscribe a tomeros, agricultores y directivos para que reciban avisos preventivos automáticos ante eventos de salinidad o variación de caudal.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-cyan-300 border border-slate-300 dark:border-cyan-900/60 transition-all shadow-sm cursor-pointer"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[3]" />
            <span>Inscribir Regante / Tomero</span>
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

      {/* Barra de Búsqueda */}
      <div className="relative">
        <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar regante por nombre, teléfono, sector o estación suscrita..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
        />
      </div>

      {/* Tabla de Suscriptores */}
      <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-[#061e2b]/90 text-xs uppercase tracking-wider text-slate-600 dark:text-cyan-200/80 border-b border-slate-200 dark:border-cyan-500/20 font-mono font-bold">
              <tr>
                <th className="px-6 py-4">Usuario / Contacto</th>
                <th className="px-6 py-4">Rol & Sector</th>
                <th className="px-6 py-4">Estación Suscrita</th>
                <th className="px-6 py-4">Cultivo</th>
                <th className="px-6 py-4">Canales Activos</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
              {loading && recipients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-600 dark:text-slate-400 font-bold font-mono">
                    <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto mb-2" />
                    <span>Cargando padrón de regantes...</span>
                  </td>
                </tr>
              ) : filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No hay regantes que coincidan con la búsqueda. Haz clic en "Inscribir Regante" para agregar el primero.
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((r) => (
                  <tr key={r.id_destinatario} className="hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">{r.nombre_completo}</div>
                      <div className="text-xs text-cyan-600 dark:text-cyan-400 font-mono font-bold flex items-center space-x-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{r.telefono_whatsapp}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                        {r.rol_usuario}
                      </span>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{r.sector_predio || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-700 dark:text-cyan-300 font-bold bg-slate-100 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-slate-200 dark:border-cyan-500/30">
                        {r.id_nodo_suscrito}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-800 dark:text-slate-300">
                      {r.tipo_cultivo || 'Frutales Varios'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold">
                        {r.recibe_alertas_calidad && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">Salinidad</span>
                        )}
                        {r.recibe_alertas_caudal && (
                          <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">Caudal</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setTestModal(r)}
                          className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                          title="Enviar Alerta de Prueba por WhatsApp"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id_destinatario, r.nombre_completo)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                          title="Eliminar Suscriptor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Inscripción de Regante */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-cyan-500" />
                <span>Inscribir Nuevo Regante a Alertas</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre_completo"
                  required
                  placeholder="ej: Juan Carlos Mendoza Quispe"
                  value={formData.nombre_completo}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between items-center">
                    <span>Teléfono WhatsApp (+51) *</span>
                    <span className="text-[10px] text-slate-500 font-normal">9 dígitos / E.164</span>
                  </label>
                  <input
                    type="text"
                    name="telefono_whatsapp"
                    required
                    placeholder="+51987654321"
                    value={formData.telefono_whatsapp}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-[#061821] border rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none font-mono font-bold transition-all ${
                      formErrors.telefono_whatsapp
                        ? 'border-rose-500 ring-1 ring-rose-500/50'
                        : 'border-slate-300 dark:border-cyan-900/60 focus:border-cyan-500'
                    }`}
                  />
                  {formErrors.telefono_whatsapp ? (
                    <p className="text-[11px] text-rose-500 font-medium">{formErrors.telefono_whatsapp}</p>
                  ) : (
                    <p className="text-[10px] text-slate-500">Ej: 987654321 o +51987654321</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between items-center">
                    <span>DNI / RUC</span>
                    <span className="text-[10px] text-slate-500 font-normal">8 u 11 dígitos</span>
                  </label>
                  <input
                    type="text"
                    name="dni_ruc"
                    placeholder="45892147"
                    value={formData.dni_ruc}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-[#061821] border rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none font-mono transition-all ${
                      formErrors.dni_ruc
                        ? 'border-rose-500 ring-1 ring-rose-500/50'
                        : 'border-slate-300 dark:border-cyan-900/60 focus:border-cyan-500'
                    }`}
                  />
                  {formErrors.dni_ruc ? (
                    <p className="text-[11px] text-rose-500 font-medium">{formErrors.dni_ruc}</p>
                  ) : (
                    <p className="text-[10px] text-slate-500">Opcional para ficha</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Estación a Monitorear *</label>
                  <select
                    name="id_nodo_suscrito"
                    value={formData.id_nodo_suscrito}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  >
                    {nodes.map(n => (
                      <option key={n.id_nodo} value={n.id_nodo} className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">
                        {n.id_nodo} - {n.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Rol del Usuario</label>
                  <select
                    name="rol_usuario"
                    value={formData.rol_usuario}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 text-xs font-medium"
                  >
                    <option value="AGRICULTOR" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Agricultor / Regante</option>
                    <option value="TOMERO" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Tomero / Operador de Compuerta</option>
                    <option value="DIRIGENTE_JUNTA" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Dirigente de Junta</option>
                    <option value="ESPECIALISTA_ANA" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Especialista ANA</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cultivo y Sector</label>
                <input
                  type="text"
                  name="sector_predio"
                  placeholder="ej: Sector Huayopampa - Parcela 14 (Melocotón Blanquillo)"
                  value={formData.sector_predio}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="recibe_alertas_calidad"
                    checked={formData.recibe_alertas_calidad}
                    onChange={handleInputChange}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span>Alertas de Salinidad y pH</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="recibe_alertas_caudal"
                    checked={formData.recibe_alertas_caudal}
                    onChange={handleInputChange}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span>Alertas de Caudal</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm shadow-md cursor-pointer transition-all"
                >
                  Guardar Suscripción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Envío de Prueba */}
      {testModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                <span>Enviar WhatsApp de Prueba</span>
              </h3>
              <button
                onClick={() => setTestModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Despachando mensaje directo a <strong className="text-slate-900 dark:text-white">{testModal.nombre_completo}</strong> ({testModal.telefono_whatsapp}).
            </p>
            <textarea
              rows="3"
              placeholder="Mensaje personalizado (dejar en blanco para usar mensaje estándar)..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            ></textarea>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setTestModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={sendingTest}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-extrabold shadow-md cursor-pointer transition-all"
              >
                {sendingTest ? 'Despachando...' : 'Despachar Alerta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
