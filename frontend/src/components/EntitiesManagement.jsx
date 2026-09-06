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
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { nodesApi } from '../services/api';

export default function EntitiesManagement({ onEntityCreated }) {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const [formData, setFormData] = useState({
    nombre_entidad: '',
    tipo_entidad: 'JUNTA_USUARIOS',
    ruc: '',
    telefono_contacto: '',
    email_contacto: '',
    direccion: ''
  });

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const res = await nodesApi.getEntities();
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre_entidad.trim()) return;

    setSubmitting(true);
    try {
      await nodesApi.createEntity(formData);
      setFeedbackMsg({ type: 'success', text: `¡Entidad '${formData.nombre_entidad}' registrada con éxito!` });
      setFormData({
        nombre_entidad: '',
        tipo_entidad: 'JUNTA_USUARIOS',
        ruc: '',
        telefono_contacto: '',
        email_contacto: '',
        direccion: ''
      });
      setShowModal(false);
      fetchEntities();
      if (onEntityCreated) onEntityCreated();
    } catch (err) {
      console.error('Error registrando entidad:', err);
      setFeedbackMsg({ type: 'error', text: 'Error al registrar entidad: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const filteredEntities = entities.filter(ent => {
    const name = ent.nombre_entidad || ent.nombre || '';
    const type = ent.tipo_entidad || '';
    const dir = ent.direccion || '';
    return name.toLowerCase().includes(search.toLowerCase()) ||
           type.toLowerCase().includes(search.toLowerCase()) ||
           dir.toLowerCase().includes(search.toLowerCase());
  });

  const getBadgeStyle = (tipo) => {
    switch (tipo) {
      case 'AUTORIDAD_NACIONAL':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'JUNTA_USUARIOS':
        return 'bg-onahau-100 text-onahau-800 border-onahau-300 font-extrabold';
      case 'COMISION_REGANTES':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'GOBIERNO_REGIONAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-onahau-50 text-onahau-700 border-onahau-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado y Acciones */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-onahau-100 border border-onahau-300 text-onahau-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5 text-onahau-600" />
            <span>Paso 1: Gobernanza & Organizaciones</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-onahau-950 tracking-tight">
            Entidades Gestoras de la Cuenca
          </h2>
          <p className="text-sm text-onahau-800 mt-1 max-w-2xl">
            Registra tu Junta de Usuarios, Comisión de Regantes o Autoridad de Agua para comenzar a aprovisionar estaciones telemétricas asociadas.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchEntities}
            disabled={loading}
            className="p-3 rounded-2xl bg-white hover:bg-onahau-50 text-onahau-800 border border-onahau-200 transition-all shadow-sm"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-onahau-500' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white font-extrabold shadow-lg shadow-onahau-500/25 transition-all transform hover:-translate-y-0.5"
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
          placeholder="Buscar entidad por nombre, ámbito o tipo (ej: Junta, ANA, Chancay, Ebro)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/90 border border-onahau-200 text-sm text-onahau-950 placeholder-onahau-600/70 focus:outline-none focus:border-onahau-500 focus:ring-2 focus:ring-onahau-200 transition-all shadow-sm"
        />
      </div>

      {/* Grilla de Entidades */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-onahau-500 animate-spin mx-auto" />
          <p className="text-sm text-onahau-700 font-bold">Cargando entidades gestoras...</p>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="spatial-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-onahau-100 border border-onahau-200 flex items-center justify-center mx-auto text-onahau-600">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-onahau-950">No se encontraron entidades</h3>
          <p className="text-sm text-onahau-700 max-w-md mx-auto">
            {search ? 'No hay resultados para tu búsqueda.' : 'Aún no hay entidades registradas. Crea la primera entidad gestora para vincular estaciones.'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-2xl bg-onahau-500 hover:bg-onahau-600 text-white font-extrabold text-sm shadow-md"
          >
            Registrar Primera Entidad
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntities.map((entity) => (
            <div
              key={entity.id_entidad || entity.id}
              className="spatial-card p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] uppercase px-2.5 py-1 rounded-full border ${getBadgeStyle(entity.tipo_entidad)}`}>
                    {entity.tipo_entidad ? entity.tipo_entidad.replace('_', ' ') : 'ENTIDAD'}
                  </span>
                  <span className="text-xs text-onahau-700 font-bold flex items-center space-x-1">
                    <Globe2 className="w-3.5 h-3.5 text-onahau-500" />
                    <span>ID #{entity.id_entidad}</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-onahau-950 leading-snug">
                  {entity.nombre_entidad || entity.nombre}
                </h3>

                {entity.direccion && (
                  <p className="text-xs text-onahau-800 line-clamp-2 leading-relaxed">
                    {entity.direccion}
                  </p>
                )}
              </div>

              {/* Información de Contacto */}
              <div className="pt-4 border-t border-onahau-200/80 space-y-2 text-xs text-onahau-800">
                {entity.ruc && (
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-onahau-600 flex-shrink-0" />
                    <span>RUC: {entity.ruc}</span>
                  </div>
                )}

                {entity.email_contacto && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-onahau-500 flex-shrink-0" />
                    <span className="truncate">{entity.email_contacto}</span>
                  </div>
                )}

                {entity.telefono_contacto && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{entity.telefono_contacto}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear Nueva Entidad */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-onahau-950/40 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white border border-onahau-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-onahau-100 pb-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-onahau-600" />
                <h3 className="text-lg font-black text-onahau-950">Registrar Entidad Gestora</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-onahau-600 hover:text-onahau-950 hover:bg-onahau-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-onahau-900">Nombre Oficial de la Entidad *</label>
                <input
                  type="text"
                  name="nombre_entidad"
                  required
                  placeholder="Ej: Junta de Usuarios Chancay-Huaral"
                  value={formData.nombre_entidad}
                  onChange={handleInputChange}
                  className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Tipo de Entidad</label>
                  <select
                    name="tipo_entidad"
                    value={formData.tipo_entidad}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-3 py-2.5 text-xs text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-medium"
                  >
                    <option value="JUNTA_USUARIOS">Junta de Usuarios</option>
                    <option value="COMISION_REGANTES">Comisión de Regantes</option>
                    <option value="AUTORIDAD_NACIONAL">Autoridad de Agua (ANA)</option>
                    <option value="GOBIERNO_REGIONAL">Gobierno Regional / Local</option>
                    <option value="ORGANISMO_INTERNACIONAL">Organismo Internacional</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">RUC / Registro Fiscal</label>
                  <input
                    type="text"
                    name="ruc"
                    placeholder="Ej: 20123456789"
                    value={formData.ruc}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-xs text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Correo Electrónico</label>
                  <input
                    type="email"
                    name="email_contacto"
                    placeholder="contacto@junta.org"
                    value={formData.email_contacto}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-3 py-2 text-xs text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    name="telefono_contacto"
                    placeholder="+51 987 654 321"
                    value={formData.telefono_contacto}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-3 py-2 text-xs text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-onahau-900">Dirección o Sede Institucional</label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Ej: Av. Solar 123, Huaral, Perú"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2 text-xs text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-onahau-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-onahau-100 hover:bg-onahau-200 text-onahau-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white text-xs font-extrabold shadow-md"
                >
                  {submitting ? 'Guardando...' : 'Crear Entidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
