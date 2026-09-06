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
  Info,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { nodesApi } from '../services/api';

export default function NodeProvisionWizard({ onNodeCreated, setActiveTab }) {
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
    subcuenca: 'Chancay-Huaral',
    latitud: -11.4521,
    longitud: -77.0145,
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
    setLoading(true);
    try {
      let finalId = formData.id_nodo.trim();
      if (!finalId) {
        finalId = `NODO-${Math.floor(Math.random() * 900 + 100)}-VALLE`;
      }

      const payload = {
        ...formData,
        id_nodo: finalId,
        id_entidad_responsable: parseInt(formData.id_entidad_responsable) || (entities[0]?.id_entidad || 1)
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
    <div className="space-y-8">
      {/* Encabezado del Asistente */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-onahau-100 border border-onahau-300 text-onahau-700 text-xs font-bold uppercase tracking-wider mb-2">
            <PlusCircle className="w-3.5 h-3.5 text-onahau-600" />
            <span>Paso 2: Aprovisionamiento de Hardware</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-onahau-950 tracking-tight">
            Asistente de Registro de Estación IoT
          </h2>
          <p className="text-sm text-onahau-800 mt-1 max-w-2xl">
            Configura la ubicación, aforador hidráulico y cultivo para generar las credenciales C++ de tu ESP32.
          </p>
        </div>
      </div>

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
                  ? 'bg-onahau-500 text-white shadow-md shadow-onahau-500/20' 
                  : isCurrent 
                  ? 'bg-white text-onahau-600 border-2 border-onahau-500 shadow-lg' 
                  : 'bg-onahau-100/70 text-onahau-700 border border-onahau-200'
              }`}>
                {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-bold ${isCurrent ? 'text-onahau-600' : 'text-onahau-800/80'}`}>
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
              <h3 className="text-base font-black text-onahau-950 border-b border-onahau-200 pb-3 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-onahau-500" />
                <span>Paso 1: Identificación y Ubicación Geográfica</span>
              </h3>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Nombre de la Estación *</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    placeholder="ej: Bocatoma Canal San José - Huayopampa"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">ID del Nodo (Opcional)</label>
                  <input
                    type="text"
                    name="id_nodo"
                    placeholder="ej: NODO-04-SANJOSE (Autogenerado si está vacío)"
                    value={formData.id_nodo}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Entidad Responsable *</label>
                  <select
                    name="id_entidad_responsable"
                    value={formData.id_entidad_responsable}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-medium"
                  >
                    {entities.map(e => (
                      <option key={e.id_entidad} value={e.id_entidad}>
                        {e.nombre_entidad || e.nombre} ({e.tipo_entidad})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Tipo de Fuente Hídrica</label>
                  <select
                    name="tipo_fuente"
                    value={formData.tipo_fuente}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-medium"
                  >
                    <option value="CANAL_DERIVACION">Canal de Derivación / Riego</option>
                    <option value="BOCATOMA_PARCELA">Bocatoma de Parcela Agrícola</option>
                    <option value="RIO_PRINCIPAL">Río Principal / Conducción</option>
                    <option value="LAGUNA_REPRESADA">Laguna Represada / Cabecera</option>
                    <option value="MANANTIAL">Manantial / Ojo de Agua</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Subcuenca o Quebrada</label>
                  <input
                    type="text"
                    name="subcuenca"
                    value={formData.subcuenca}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Sector de Cuenca</label>
                  <select
                    name="sector_cuenca"
                    value={formData.sector_cuenca}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-medium"
                  >
                    <option value="CUENCA_ALTA">Cuenca Alta (Cabecera &gt; 3000 msnm)</option>
                    <option value="CUENCA_MEDIA">Cuenca Media (Conducción 1000 - 3000 msnm)</option>
                    <option value="CUENCA_BAJA">Cuenca Baja (Valle &lt; 1000 msnm)</option>
                    <option value="PARCELA_PILOTO">Parcela Piloto / Nivel Predial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-onahau-800">Latitud (GPS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="latitud"
                    value={formData.latitud}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-lg px-3 py-2 text-xs font-mono text-onahau-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-onahau-800">Longitud (GPS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="longitud"
                    value={formData.longitud}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-lg px-3 py-2 text-xs font-mono text-onahau-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-onahau-800">Altitud (msnm)</label>
                  <input
                    type="number"
                    name="cota_msnm"
                    value={formData.cota_msnm}
                    onChange={handleInputChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-lg px-3 py-2 text-xs font-mono text-onahau-950"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white font-extrabold shadow-md"
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
              <h3 className="text-base font-black text-onahau-950 border-b border-onahau-200 pb-3 flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-onahau-500" />
                <span>Paso 2: Estructura de Aforo y Calibración de Caudal (Q = K · hᴺ)</span>
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Tipo de Estructura de Aforo Instalada</label>
                  <select
                    value={formData.estructura_tipo}
                    onChange={handleStructureChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-medium"
                  >
                    <option value="PARSHALL_3_INCH">Canal Parshall 3 pulgadas (W=0.076m) - K: 0.177, N: 1.55</option>
                    <option value="PARSHALL_6_INCH">Canal Parshall 6 pulgadas (W=0.152m) - K: 0.381, N: 1.58</option>
                    <option value="PARSHALL_9_INCH">Canal Parshall 9 pulgadas (W=0.229m) - K: 0.535, N: 1.53</option>
                    <option value="PARSHALL_1_FOOT">Canal Parshall 1 pie (W=0.305m) - K: 0.690, N: 1.522</option>
                    <option value="PARSHALL_2_FOOT">Canal Parshall 2 pies (W=0.610m) - K: 1.426, N: 1.550</option>
                    <option value="VERTEDERO_TRIANG_90">Vertedero Triangular 90° (Thompson) - K: 1.380, N: 2.50</option>
                    <option value="VERTEDERO_RECT_50CM">Vertedero Rectangular 0.50m - K: 0.920, N: 1.50</option>
                    <option value="CANAL_MANNING_TRAPECIO">Canal Abierto Trapezoidal (Manning) - K: 1.250, N: 1.667</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 bg-onahau-50/80 rounded-2xl border border-onahau-200 text-xs">
                  <div className="space-y-1">
                    <label className="text-onahau-800 font-bold">Distancia Sensor-Fondo (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="distancia_fondo_sensor_cm"
                      value={formData.distancia_fondo_sensor_cm}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-onahau-300 rounded-lg p-2 font-mono text-onahau-950 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-onahau-800 font-bold">Coeficiente K</label>
                    <input
                      type="number"
                      step="0.001"
                      name="caudal_coef_k"
                      value={formData.caudal_coef_k}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-onahau-300 rounded-lg p-2 font-mono text-onahau-950 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-onahau-800 font-bold">Exponente N</label>
                    <input
                      type="number"
                      step="0.001"
                      name="caudal_exp_n"
                      value={formData.caudal_exp_n}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-onahau-300 rounded-lg p-2 font-mono text-onahau-950 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-onahau-100 hover:bg-onahau-200 text-onahau-800 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white font-extrabold text-xs shadow-md"
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
              <h3 className="text-base font-black text-onahau-950 border-b border-onahau-200 pb-3 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>Paso 3: Cultivo Sensible y Umbrales de Alerta Agronómica</span>
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-onahau-900">Preset por Tipo de Cultivo Dominante</label>
                  <select
                    value={formData.cultivo_preset}
                    onChange={handleCropPresetChange}
                    className="w-full bg-onahau-50/60 border border-onahau-200 rounded-xl px-4 py-2.5 text-sm text-onahau-950 focus:outline-none focus:border-onahau-500 focus:bg-white font-medium"
                  >
                    <option value="FRUTALES_MELOCOTON">Melocotón Blanquillo (Sensible a EC &gt; 1500 µS/cm)</option>
                    <option value="FRUTALES_PALTO">Palto Hass / Fuerte (Muy sensible a EC &gt; 1300 µS/cm)</option>
                    <option value="CITRICOS_MANDARINA">Mandarina Satsuma / Cítricos (Tolerancia media)</option>
                    <option value="HORTALIZAS_MAIZ">Hortalizas y Maíz Choclo</option>
                    <option value="PASTOS_FORRAJES">Pastos y Forrajes (Alta tolerancia)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-onahau-800">pH Mínimo</label>
                    <input
                      type="number"
                      step="0.1"
                      name="ph_min_alerta"
                      value={formData.ph_min_alerta}
                      onChange={handleInputChange}
                      className="w-full bg-onahau-50/60 border border-onahau-200 rounded-lg px-3 py-2 text-xs text-onahau-950 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-onahau-800">pH Máximo</label>
                    <input
                      type="number"
                      step="0.1"
                      name="ph_max_alerta"
                      value={formData.ph_max_alerta}
                      onChange={handleInputChange}
                      className="w-full bg-onahau-50/60 border border-onahau-200 rounded-lg px-3 py-2 text-xs text-onahau-950 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-onahau-800">EC Advertencia (µS/cm)</label>
                    <input
                      type="number"
                      name="ec_max_advertencia_us_cm"
                      value={formData.ec_max_advertencia_us_cm}
                      onChange={handleInputChange}
                      className="w-full bg-onahau-50/60 border border-onahau-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-onahau-800">EC Crítico (µS/cm)</label>
                    <input
                      type="number"
                      name="ec_max_critico_us_cm"
                      value={formData.ec_max_critico_us_cm}
                      onChange={handleInputChange}
                      className="w-full bg-onahau-50/60 border border-onahau-200 rounded-lg px-3 py-2 text-xs text-red-700 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-onahau-100 hover:bg-onahau-200 text-onahau-800 font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white font-extrabold shadow-lg shadow-onahau-500/25 transition-all text-xs"
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
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-onahau-950">
                  ¡Estación {provisionResult.id_nodo} Aprovisionada con Éxito!
                </h3>
                <p className="text-onahau-800 text-xs max-w-lg mx-auto">
                  La estación ha sido registrada. Copia el siguiente fragmento y pégalo en el archivo <code className="font-mono text-onahau-600 font-bold">firmware/include/config.h</code> de tu ESP32.
                </p>
              </div>

              {/* Bloque de Código C++ */}
              <div className="text-left bg-onahau-950 text-white rounded-2xl border border-onahau-800 p-4 space-y-2 relative">
                <div className="flex items-center justify-between text-xs text-onahau-200 border-b border-onahau-900 pb-2">
                  <span className="flex items-center space-x-1.5 font-mono text-onahau-400 font-bold">
                    <Code className="w-4 h-4" />
                    <span>firmware/include/config.h</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(provisionResult.cpp_config_snippet)}
                    className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-onahau-500 text-white font-bold text-xs hover:bg-onahau-400 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar Snippet'}</span>
                  </button>
                </div>
                <pre className="font-mono text-xs text-onahau-100 overflow-x-auto p-2">
                  {provisionResult.cpp_config_snippet}
                </pre>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('nodes')}
                  className="px-6 py-3 rounded-2xl bg-onahau-500 hover:bg-onahau-600 text-white font-extrabold text-xs shadow-md"
                >
                  Ir al Directorio de Nodos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, id_nodo: '', nombre: '' }));
                    setStep(1);
                  }}
                  className="px-6 py-3 rounded-2xl bg-onahau-100 hover:bg-onahau-200 text-onahau-800 font-bold text-xs"
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
