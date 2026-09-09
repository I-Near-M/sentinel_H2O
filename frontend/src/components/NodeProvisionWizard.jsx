import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Check, 
  Copy, 
  Code, 
  MapPin, 
  Sliders, 
  ShieldAlert, 
  Cpu, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Building2, 
  AlertTriangle 
} from 'lucide-react';
import { nodesApi } from '../services/api';
import { useSystemConfig } from '../context/SystemConfigContext';

export default function NodeProvisionWizard({ onNodeCreated, setActiveTab }) {
  const { nombre_cuenca, latitud_centro, longitud_centro } = useSystemConfig();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState([]);
  const [copied, setCopied] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Paso 1: Ubicación e Identificación
    id_nodo: '',
    nombre: '',
    id_entidad_responsable: '',
    sector_cuenca: 'CUENCA_MEDIA',
    subcuenca: nombre_cuenca || 'Cuenca Principal',
    latitud: latitud_centro || -11.4521,
    longitud: longitud_centro || -77.0145,
    cota_msnm: 320.0,
    tipo_fuente: 'CANAL_DERIVACION',
    intervalo_envio_min: 15,
    descripcion: '',

    // Paso 2: Estructura Hidráulica y Calibración
    estructura_tipo: 'PARSHALL_6_INCH',
    distancia_fondo_sensor_cm: 100.0,
    caudal_coef_k: 0.381,
    caudal_exp_n: 1.58,
    ph_offset_v: 2.5000,
    ph_slope: -0.1840,
    tds_factor_k: 0.5000,
    turb_v_clear: 4.2000,
    turb_v_turbid: 2.5000,

    // Paso 3: Cultivo y Umbrales Agronómicos
    cultivo_preset: 'FRUTALES_MELOCOTON',
    ph_min_alerta: 6.50,
    ph_max_alerta: 8.50,
    ec_max_advertencia_us_cm: 1200.0,
    ec_max_critico_us_cm: 1500.0,
    tds_max_alerta_ppm: 750.0,
    turb_max_alerta_ntu: 50.0,
    tirante_min_alerta_cm: 10.0,
    bateria_min_alerta_v: 11.50
  });

  // Cargar entidades disponibles
  useEffect(() => {
    nodesApi.getEntities()
      .then(res => {
        const data = res.data || [];
        setEntities(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, id_entidad_responsable: data[0].id_entidad }));
        }
      })
      .catch(err => console.error("Error cargando entidades:", err));
  }, []);

  const handleStructureChange = (e) => {
    const val = e.target.value;
    let k = 1.0, n = 1.55;
    
    if (val === 'PARSHALL_3_INCH') { k = 0.177; n = 1.55; }
    else if (val === 'PARSHALL_6_INCH') { k = 0.381; n = 1.58; }
    else if (val === 'PARSHALL_9_INCH') { k = 0.535; n = 1.53; }
    else if (val === 'PARSHALL_1_FOOT') { k = 0.690; n = 1.522; }
    else if (val === 'PARSHALL_2_FOOT') { k = 1.426; n = 1.550; }
    else if (val === 'VERTEDERO_TRIANG_90') { k = 1.380; n = 2.50; }
    else if (val === 'VERTEDERO_RECT_50CM') { k = 0.920; n = 1.50; }
    else if (val === 'CANAL_MANNING_TRAPECIO') { k = 1.250; n = 1.667; }

    setFormData(prev => ({
      ...prev,
      estructura_tipo: val,
      caudal_coef_k: k,
      caudal_exp_n: n
    }));
  };

  const handleCropPresetChange = (e) => {
    const val = e.target.value;
    let ecAdv = 1200.0, ecCrit = 1500.0, phMin = 6.5, phMax = 8.5;

    if (val === 'FRUTALES_MELOCOTON') {
      ecAdv = 1200.0; ecCrit = 1500.0; phMin = 6.5; phMax = 8.2;
    } else if (val === 'FRUTALES_PALTO') {
      ecAdv = 1000.0; ecCrit = 1300.0; phMin = 6.0; phMax = 7.8;
    } else if (val === 'CITRICOS_MANDARINA') {
      ecAdv = 1400.0; ecCrit = 1800.0; phMin = 6.5; phMax = 8.5;
    } else if (val === 'HORTALIZAS_MAIZ') {
      ecAdv = 1500.0; ecCrit = 2000.0; phMin = 6.0; phMax = 8.5;
    } else if (val === 'PASTOS_FORRAJES') {
      ecAdv = 2000.0; ecCrit = 3000.0; phMin = 5.5; phMax = 9.0;
    }

    setFormData(prev => ({
      ...prev,
      cultivo_preset: val,
      ec_max_advertencia_us_cm: ecAdv,
      ec_max_critico_us_cm: ecCrit,
      ph_min_alerta: phMin,
      ph_max_alerta: phMax
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (entities.length === 0) {
      alert("Error: Debes registrar al menos una Entidad Gestora antes de aprovisionar un nodo.");
      return;
    }

    setLoading(true);
    try {
      let finalId = formData.id_nodo.trim();
      if (!finalId) {
        finalId = `NODO-${Math.floor(Math.random() * 900 + 100)}-VALLE`;
      }

      const payload = {
        ...formData,
        id_nodo: finalId,
        id_entidad_responsable: parseInt(formData.id_entidad_responsable) || entities[0].id_entidad
      };

      const res = await nodesApi.provisionNode(payload);
      setProvisionResult(res.data);
      setStep(4);
      if (onNodeCreated) onNodeCreated();
    } catch (err) {
      console.error("Error aprovisionando nodo:", err);
      alert("Error al aprovisionar estación: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Asistente */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Paso 2: Aprovisionamiento de Hardware</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Asistente de Registro de Estación IoT
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Configura la ubicación, aforador hidráulico y cultivo para generar las credenciales C++ de tu ESP32.
          </p>
        </div>
      </div>

      {/* ALERTA CRÍTICA: SI NO HAY ENTIDADES REGISTRADAS */}
      {entities.length === 0 && (
        <div className="p-5 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-amber-800 dark:text-amber-300">
                Requisito Previo Obligatorio: Sin Entidades Gestoras
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-200/90 leading-relaxed">
                La base de datos está limpia. Toda estación telemétrica debe estar vinculada obligatoriamente a una Entidad Responsable (ej. Junta de Usuarios o Comisión de Regantes).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('entities')}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Registrar Entidad Ahora</span>
          </button>
        </div>
      )}

      {/* Indicador de Pasos Espacial */}
      <div className="flex items-center justify-between max-w-2xl mx-auto px-4">
        {[
          { num: 1, label: 'Ubicación', icon: MapPin },
          { num: 2, label: 'Hidráulica', icon: Sliders },
          { num: 3, label: 'Umbrales', icon: ShieldAlert },
          { num: 4, label: 'Credenciales', icon: Cpu },
        ].map((s) => {
          const Icon = s.icon;
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div key={s.num} className="flex flex-col items-center space-y-1.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all ${
                isDone 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
                  : isCurrent 
                  ? 'bg-slate-100 dark:bg-[#061821] text-cyan-500 border-2 border-cyan-500 shadow-lg' 
                  : 'bg-slate-100 dark:bg-[#061821]/60 text-slate-400 border border-slate-300 dark:border-cyan-900/60'
              }`}>
                {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-bold ${isCurrent ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Formulario Multipasos */}
      <div className="spatial-card p-6 sm:p-10">
        <form onSubmit={handleSubmit}>
          
          {/* PASO 1: Identificación y Ubicación */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-base font-black text-slate-900 dark:text-white border-b border-cyan-500/20 pb-3 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-cyan-500" />
                <span>Paso 1: Identificación y Ubicación Geográfica</span>
              </h3>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre de la Estación *</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    placeholder="ej: Bocatoma Canal San José - Huayopampa"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ID del Nodo (Opcional)</label>
                  <input
                    type="text"
                    name="id_nodo"
                    placeholder="ej: NODO-04-SANJOSE (Autogenerado si está vacío)"
                    value={formData.id_nodo}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Entidad Responsable *</label>
                  <select
                    name="id_entidad_responsable"
                    value={formData.id_entidad_responsable}
                    onChange={handleInputChange}
                    disabled={entities.length === 0}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    {entities.length === 0 ? (
                      <option value="">-- No hay entidades registradas (Crea una primero) --</option>
                    ) : (
                      entities.map(e => (
                        <option key={e.id_entidad} value={e.id_entidad} className="bg-[#072433] text-white">
                          {e.nombre_entidad || e.nombre} ({e.tipo_entidad})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Fuente Hídrica</label>
                  <select
                    name="tipo_fuente"
                    value={formData.tipo_fuente}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="CANAL_DERIVACION" className="bg-[#072433] text-white">Canal de Derivación / Riego</option>
                    <option value="BOCATOMA_PARCELA" className="bg-[#072433] text-white">Bocatoma de Parcela Agrícola</option>
                    <option value="RIO_PRINCIPAL" className="bg-[#072433] text-white">Río Principal / Conducción</option>
                    <option value="LAGUNA_REPRESADA" className="bg-[#072433] text-white">Laguna Represada / Cabecera</option>
                    <option value="MANANTIAL" className="bg-[#072433] text-white">Manantial / Ojo de Agua</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subcuenca o Quebrada</label>
                  <input
                    type="text"
                    name="subcuenca"
                    value={formData.subcuenca}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sector de Cuenca</label>
                  <select
                    name="sector_cuenca"
                    value={formData.sector_cuenca}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="CUENCA_ALTA" className="bg-[#072433] text-white">Cuenca Alta (Cabecera &gt; 3000 msnm)</option>
                    <option value="CUENCA_MEDIA" className="bg-[#072433] text-white">Cuenca Media (Conducción 1000 - 3000 msnm)</option>
                    <option value="CUENCA_BAJA" className="bg-[#072433] text-white">Cuenca Baja (Valle &lt; 1000 msnm)</option>
                    <option value="PARCELA_PILOTO" className="bg-[#072433] text-white">Parcela Piloto / Nivel Predial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Latitud (GPS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="latitud"
                    value={formData.latitud}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Longitud (GPS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="longitud"
                    value={formData.longitud}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Altitud (msnm)</label>
                  <input
                    type="number"
                    name="cota_msnm"
                    value={formData.cota_msnm}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={entities.length === 0}
                  onClick={() => setStep(2)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-extrabold text-xs shadow-md transition-all ${
                    entities.length > 0 
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:from-cyan-400 hover:to-teal-400 cursor-pointer' 
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Continuar a Hidráulica</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Estructura Hidráulica y Calibración */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-base font-black text-slate-900 dark:text-white border-b border-cyan-500/20 pb-3 flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-cyan-500" />
                <span>Paso 2: Estructura de Aforo y Calibración de Caudal (Q = K · hᴺ)</span>
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Estructura de Aforo Instalada</label>
                  <select
                    value={formData.estructura_tipo}
                    onChange={handleStructureChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="PARSHALL_3_INCH" className="bg-[#072433] text-white">Canal Parshall 3 pulgadas (W=0.076m) - K: 0.177, N: 1.55</option>
                    <option value="PARSHALL_6_INCH" className="bg-[#072433] text-white">Canal Parshall 6 pulgadas (W=0.152m) - K: 0.381, N: 1.58</option>
                    <option value="PARSHALL_9_INCH" className="bg-[#072433] text-white">Canal Parshall 9 pulgadas (W=0.229m) - K: 0.535, N: 1.53</option>
                    <option value="PARSHALL_1_FOOT" className="bg-[#072433] text-white">Canal Parshall 1 pie (W=0.305m) - K: 0.690, N: 1.522</option>
                    <option value="PARSHALL_2_FOOT" className="bg-[#072433] text-white">Canal Parshall 2 pies (W=0.610m) - K: 1.426, N: 1.550</option>
                    <option value="VERTEDERO_TRIANG_90" className="bg-[#072433] text-white">Vertedero Triangular 90° (Thompson) - K: 1.380, N: 2.50</option>
                    <option value="VERTEDERO_RECT_50CM" className="bg-[#072433] text-white">Vertedero Rectangular 0.50m - K: 0.920, N: 1.50</option>
                    <option value="CANAL_MANNING_TRAPECIO" className="bg-[#072433] text-white">Canal Abierto Trapezoidal (Manning) - K: 1.250, N: 1.667</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-100 dark:bg-[#061821] rounded-2xl border border-slate-300 dark:border-cyan-900/60 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-bold">Distancia Sensor-Fondo (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="distancia_fondo_sensor_cm"
                      value={formData.distancia_fondo_sensor_cm}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-bold">Coeficiente K</label>
                    <input
                      type="number"
                      step="0.001"
                      name="caudal_coef_k"
                      value={formData.caudal_coef_k}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600 dark:text-slate-400 font-bold">Exponente N</label>
                    <input
                      type="number"
                      step="0.001"
                      name="caudal_exp_n"
                      value={formData.caudal_exp_n}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-md"
                >
                  <span>Continuar a Umbrales</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Umbrales y Cultivo */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-base font-black text-slate-900 dark:text-white border-b border-cyan-500/20 pb-3 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>Paso 3: Cultivo Sensible y Umbrales de Alerta Agronómica</span>
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Preset por Tipo de Cultivo Dominante</label>
                  <select
                    value={formData.cultivo_preset}
                    onChange={handleCropPresetChange}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                  >
                    <option value="FRUTALES_MELOCOTON" className="bg-[#072433] text-white">Melocotón Blanquillo (Sensible a EC &gt; 1500 µS/cm)</option>
                    <option value="FRUTALES_PALTO" className="bg-[#072433] text-white">Palto Hass / Fuerte (Muy sensible a EC &gt; 1300 µS/cm)</option>
                    <option value="CITRICOS_MANDARINA" className="bg-[#072433] text-white">Mandarina Satsuma / Cítricos (Tolerancia media)</option>
                    <option value="HORTALIZAS_MAIZ" className="bg-[#072433] text-white">Hortalizas y Maíz Choclo</option>
                    <option value="PASTOS_FORRAJES" className="bg-[#072433] text-white">Pastos y Forrajes (Alta tolerancia)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">pH Mínimo</label>
                    <input
                      type="number"
                      step="0.1"
                      name="ph_min_alerta"
                      value={formData.ph_min_alerta}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">pH Máximo</label>
                    <input
                      type="number"
                      step="0.1"
                      name="ph_max_alerta"
                      value={formData.ph_max_alerta}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">EC Advertencia (µS/cm)</label>
                    <input
                      type="number"
                      name="ec_max_advertencia_us_cm"
                      value={formData.ec_max_advertencia_us_cm}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs text-amber-500 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">EC Crítico (µS/cm)</label>
                    <input
                      type="number"
                      name="ec_max_critico_us_cm"
                      value={formData.ec_max_critico_us_cm}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-2 text-xs text-rose-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || entities.length === 0}
                  className="flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold shadow-lg shadow-cyan-500/25 transition-all text-xs cursor-pointer"
                >
                  {loading ? (
                    <span>Aprovisionando...</span>
                  ) : (
                    <>
                      <span>Registrar y Generar API Key</span>
                      <Cpu className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: Éxito y Entrega de Credenciales C++ */}
          {step === 4 && provisionResult && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  ¡Estación {provisionResult.id_nodo} Aprovisionada con Éxito!
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs max-w-lg mx-auto">
                  La estación ha sido registrada. Copia el siguiente fragmento y pégalo en el archivo <code className="font-mono text-cyan-400 font-bold">firmware/include/config.h</code> de tu ESP32.
                </p>
              </div>

              {/* Bloque de Código C++ */}
              <div className="text-left bg-slate-950 text-white rounded-2xl border border-cyan-500/30 p-4 space-y-2 relative">
                <div className="flex items-center justify-between text-xs text-cyan-200 border-b border-slate-800 pb-2">
                  <span className="flex items-center space-x-1.5 font-mono text-cyan-400 font-bold">
                    <Code className="w-4 h-4" />
                    <span>firmware/include/config.h</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(provisionResult.cpp_config_snippet)}
                    className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar Snippet'}</span>
                  </button>
                </div>
                <pre className="font-mono text-xs text-cyan-100 overflow-x-auto p-2">
                  {provisionResult.cpp_config_snippet}
                </pre>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('nodes')}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Ir al Directorio de Nodos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, id_nodo: '', nombre: '' }));
                    setStep(1);
                  }}
                  className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Aprovisionar Otro Nodo
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
