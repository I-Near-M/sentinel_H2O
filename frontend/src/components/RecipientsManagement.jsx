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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await alertsApi.registerRecipient(formData);
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
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-onahau-100 border border-onahau-300 text-onahau-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Smartphone className="w-3.5 h-3.5 text-onahau-600" />
            <span>Paso 4: Notificaciones en Campo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-onahau-950 tracking-tight">
            Padrón de Regantes & Alertas WhatsApp
          </h2>
          <p className="text-sm text-onahau-800 mt-1 max-w-2xl">
            Inscribe a tomeros, agricultores y directivos para que reciban avisos preventivos automáticos ante eventos de salinidad o variación de caudal.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-3 rounded-2xl bg-white hover:bg-onahau-50 text-onahau-800 border border-onahau-200 transition-all shadow-sm"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-onahau-500' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
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
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
            : 'bg-red-50 border-red-300 text-red-800 font-bold'
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs opacity-70 hover:opacity-100">
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="relative">
        <Search className="w-5 h-5 text-onahau-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar regante por nombre, teléfono, sector o estación suscrita..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/90 border border-onahau-200 text-sm text-onahau-950 placeholder-onahau-600/70 focus:outline-none focus:border-onahau-500 focus:ring-2 focus:ring-onahau-200 transition-all shadow-sm"
        />
      </div>

      {/* Tabla de Suscriptores */}
      <div className="spatial-card overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-onahau-950">
            <thead className="bg-onahau-100/70 text-xs uppercase tracking-wider text-onahau-800 border-b border-onahau-200 font-black">
              <tr>
                <th className="px-6 py-4">Usuario / Contacto</th>
                <th className="px-6 py-4">Rol & Sector</th>
                <th className="px-6 py-4">Estación Suscrita</th>
                <th className="px-6 py-4">Cultivo</th>
                <th className="px-6 py-4">Canales Activos</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-onahau-100">
              {loading && recipients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-onahau-700 font-bold">
                    <RefreshCw className="w-6 h-6 text-onahau-500 animate-spin mx-auto mb-2" />
                    <span>Cargando padrón de regantes...</span>
                  </td>
                </tr>
              ) : filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-onahau-700">
                    No hay regantes que coincidan con la búsqueda. Haz clic en "Inscribir Regante" para agregar el primero.
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((r) => (
                  <tr key={r.id_destinatario} className="hover:bg-onahau-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-onahau-950">{r.nombre_completo}</div>
                      <div className="text-xs text-onahau-600 font-mono font-bold flex items-center space-x-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{r.telefono_whatsapp}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-onahau-100 text-onahau-800 border border-onahau-200">
                        {r.rol_usuario}
                      </span>
                      <div className="text-xs text-onahau-700 mt-0.5">{r.sector_predio || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-onahau-700 font-bold bg-onahau-50 px-2 py-0.5 rounded border border-onahau-200">
                        {r.id_nodo_suscrito}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-onahau-800">
                      {r.tipo_cultivo || 'Frutales Varios'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold">
                        {r.recibe_alertas_calidad && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Salinidad</span>
                        )}
                        {r.recibe_alertas_caudal && (
                          <span className="px-2 py-0.5 rounded bg-onahau-100 text-onahau-800 border border-onahau-200">Caudal</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setTestModal(r)}
                          className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                          title="Enviar Alerta de Prueba por WhatsApp"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id_destinatario, r.nombre_completo)}
                          className="p-2 rounded-xl bg-white hover:bg-red-50 text-onahau-700 hover:text-red-600 border border-onahau-200 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-onahau-950/40 backdrop-blur-md p-4">
          <div className="bg-white border border-onahau-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-onahau-100 pb-3">
              <h3 className="text-lg font-black text-onahau-950 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-onahau-600" />
                <span>Inscribir Nuevo Regante a Alertas</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-onahau-600 hover:text-onahau-950 hover:bg-onahau-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-onahau-900">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre_completo"
                  required
                  placeholder="ej: Juan Carlos Mendoza Quispe"
                  value={formData.nombre_completo}
                  onChange={handleInputChange}
                  className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-onahau-900">Teléfono WhatsApp (+51) *</label>
                  <input
                    type="text"
                    name="telefono_whatsapp"
                    required
                    placeholder="+51987654321"
                    value={formData.telefono_whatsapp}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-onahau-900">DNI / RUC</label>
                  <input
                    type="text"
                    name="dni_ruc"
                    placeholder="45892147"
                    value={formData.dni_ruc}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-onahau-900">Estación a Monitorear *</label>
                  <select
                    name="id_nodo_suscrito"
                    value={formData.id_nodo_suscrito}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-3 py-2 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-mono text-xs"
                  >
                    {nodes.map(n => (
                      <option key={n.id_nodo} value={n.id_nodo}>{n.id_nodo} - {n.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-onahau-900">Rol del Usuario</label>
                  <select
                    name="rol_usuario"
                    value={formData.rol_usuario}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-3 py-2 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white text-xs font-medium"
                  >
                    <option value="AGRICULTOR">Agricultor / Regante</option>
                    <option value="TOMERO">Tomero / Operador de Compuerta</option>
                    <option value="DIRIGENTE_JUNTA">Dirigente de Junta</option>
                    <option value="ESPECIALISTA_ANA">Especialista ANA</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-onahau-900">Cultivo y Sector</label>
                <input
                  type="text"
                  name="sector_predio"
                  placeholder="ej: Sector Huayopampa - Parcela 14 (Melocotón Blanquillo)"
                  value={formData.sector_predio}
                  onChange={handleInputChange}
                  className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-onahau-800 cursor-pointer">
                  <input
                    type="checkbox"
                    name="recibe_alertas_calidad"
                    checked={formData.recibe_alertas_calidad}
                    onChange={handleInputChange}
                    className="rounded text-onahau-500 focus:ring-0"
                  />
                  <span>Alertas de Salinidad y pH</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-bold text-onahau-800 cursor-pointer">
                  <input
                    type="checkbox"
                    name="recibe_alertas_caudal"
                    checked={formData.recibe_alertas_caudal}
                    onChange={handleInputChange}
                    className="rounded text-onahau-500 focus:ring-0"
                  />
                  <span>Alertas de Caudal</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-onahau-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-onahau-100 text-onahau-800 text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-onahau-950/40 backdrop-blur-md p-4">
          <div className="bg-white border border-onahau-200 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-onahau-100 pb-3">
              <h3 className="text-lg font-black text-onahau-950 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>Enviar WhatsApp de Prueba</span>
              </h3>
              <button
                onClick={() => setTestModal(null)}
                className="p-1.5 rounded-xl text-onahau-600 hover:text-onahau-950 hover:bg-onahau-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-onahau-800">
              Despachando mensaje directo a <strong>{testModal.nombre_completo}</strong> ({testModal.telefono_whatsapp}).
            </p>
            <textarea
              rows="3"
              placeholder="Mensaje personalizado (dejar en blanco para usar mensaje estándar)..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl p-3 text-xs text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white"
            ></textarea>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setTestModal(null)}
                className="px-4 py-2 rounded-xl bg-onahau-100 text-onahau-800 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={sendingTest}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-extrabold shadow-md"
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
