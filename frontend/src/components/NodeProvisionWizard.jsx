import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Sparkles,
  Ruler,
  Gauge,
  Waves,
  Trash2,
  Plus
} from 'lucide-react';
import { nodesApi } from '../services/api';
import { useSystemConfig } from '../context/SystemConfigContext';
import { validateCoordinates } from '../utils/validators';

export default function NodeProvisionWizard({ onNodeCreated, setActiveTab }) {
  const { nombre_cuenca, latitud_centro, longitud_centro } = useSystemConfig();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState([]);
  const [copied, setCopied] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);
  const [step1Error, setStep1Error] = useState('');

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

    // Paso 2: Calibración Físico-Química y Aforo Hidráulico
    ph_offset_v: 2.5000,
    ph_slope: -0.1800,
    tds_factor_k: 0.5000,
    tds_offset_v: 0.0000,
    turb_v_clear: 4.2000,
    turb_v_turbid: 2.5000,
    distancia_fondo_sensor_cm: 150.0,

    // Molinete Hidrométrico (Efecto Hall en Superficie)
    molinete_constante_a: 0.2500,
    molinete_constante_b: 0.0500,
    coeficiente_friccion: 0.0350,
    tipo_seccion: 'REGLETA_PUNTOS',

    // Sección Hidráulica y Batimetría con Regleta
    ancho_total_rio_m: 4.00,
    observaciones_aforo: 'Aforo batimétrico con regleta graduada y molinete Hall de superficie',
    puntos_seccion: [
      { orden_punto: 1, distancia_orilla_m: 0.0, profundidad_lecho_m: 0.0, ancho_subseccion_m: 0.5 },
      { orden_punto: 2, distancia_orilla_m: 1.0, profundidad_lecho_m: 0.8, ancho_subseccion_m: 1.0 },
      { orden_punto: 3, distancia_orilla_m: 2.0, profundidad_lecho_m: 1.4, ancho_subseccion_m: 1.0 },
      { orden_punto: 4, distancia_orilla_m: 3.0, profundidad_lecho_m: 0.9, ancho_subseccion_m: 1.0 },
      { orden_punto: 5, distancia_orilla_m: 4.0, profundidad_lecho_m: 0.0, ancho_subseccion_m: 0.5 }
    ],

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

  // Handlers para la tabla de Regletas
  const addPuntoSeccion = () => {
    const pts = formData.puntos_seccion || [];
    const lastX = pts.length > 0 ? pts[pts.length - 1].distancia_orilla_m : 0;
    const nextX = Math.min(formData.ancho_total_rio_m, parseFloat((lastX + 0.5).toFixed(2)));
    const newPt = {
      orden_punto: pts.length + 1,
      distancia_orilla_m: nextX,
      profundidad_lecho_m: 0.5,
      ancho_subseccion_m: 0.5
    };
    setFormData(prev => ({
      ...prev,
      puntos_seccion: [...pts, newPt]
    }));
  };

  const updatePuntoSeccion = (index, field, value) => {
    const updated = [...formData.puntos_seccion];
    updated[index] = {
      ...updated[index],
      [field]: parseFloat(value) || 0
    };
    setFormData(prev => ({ ...prev, puntos_seccion: updated }));
  };

  const removePuntoSeccion = (index) => {
    if (formData.puntos_seccion.length <= 2) {
      alert("Se requieren al menos 2 puntos para delimitar los márgenes de la sección.");
      return;
    }
    const updated = formData.puntos_seccion.filter((_, i) => i !== index).map((p, idx) => ({
      ...p,
      orden_punto: idx + 1
    }));
    setFormData(prev => ({ ...prev, puntos_seccion: updated }));
  };

  const applyRiverPreset = (presetKey) => {
    if (presetKey === 'CHANCAY_NATURAL') {
      setFormData(prev => ({
        ...prev,
        ancho_total_rio_m: 4.0,
        tipo_seccion: 'REGLETA_PUNTOS',
        molinete_constante_a: 0.2500,
        molinete_constante_b: 0.0500,
        coeficiente_friccion: 0.0350,
        distancia_fondo_sensor_cm: 180.0,
        observaciones_aforo: 'Río Chancay curso natural con lecho pedregoso irregular',
        puntos_seccion: [
          { orden_punto: 1, distancia_orilla_m: 0.0, profundidad_lecho_m: 0.0, ancho_subseccion_m: 0.5 },
          { orden_punto: 2, distancia_orilla_m: 1.0, profundidad_lecho_m: 0.8, ancho_subseccion_m: 1.0 },
          { orden_punto: 3, distancia_orilla_m: 2.0, profundidad_lecho_m: 1.4, ancho_subseccion_m: 1.0 },
          { orden_punto: 4, distancia_orilla_m: 3.0, profundidad_lecho_m: 0.9, ancho_subseccion_m: 1.0 },
          { orden_punto: 5, distancia_orilla_m: 4.0, profundidad_lecho_m: 0.0, ancho_subseccion_m: 0.5 }
        ]
      }));
    } else if (presetKey === 'CANAL_RECTANGULAR') {
      setFormData(prev => ({
        ...prev,
        ancho_total_rio_m: 2.0,
        tipo_seccion: 'RECTANGULAR',
        molinete_constante_a: 0.2500,
        molinete_constante_b: 0.0500,
        coeficiente_friccion: 0.0250,
        distancia_fondo_sensor_cm: 160.0,
        observaciones_aforo: 'Canal matriz rectangular de concreto alisado',
        puntos_seccion: [
          { orden_punto: 1, distancia_orilla_m: 0.0, profundidad_lecho_m: 1.2, ancho_subseccion_m: 0.5 },
          { orden_punto: 2, distancia_orilla_m: 1.0, profundidad_lecho_m: 1.2, ancho_subseccion_m: 1.0 },
          { orden_punto: 3, distancia_orilla_m: 2.0, profundidad_lecho_m: 1.2, ancho_subseccion_m: 0.5 }
        ]
      }));
    } else if (presetKey === 'QUEBRADA_ESTRECHA') {
      setFormData(prev => ({
        ...prev,
        ancho_total_rio_m: 2.5,
        tipo_seccion: 'REGLETA_PUNTOS',
        molinete_constante_a: 0.2500,
        molinete_constante_b: 0.0500,
        coeficiente_friccion: 0.0400,
        distancia_fondo_sensor_cm: 140.0,
        observaciones_aforo: 'Quebrada de cabecera con pendiente pronunciada',
        puntos_seccion: [
          { orden_punto: 1, distancia_orilla_m: 0.0, profundidad_lecho_m: 0.0, ancho_subseccion_m: 0.5 },
          { orden_punto: 2, distancia_orilla_m: 1.25, profundidad_lecho_m: 1.1, ancho_subseccion_m: 1.25 },
          { orden_punto: 3, distancia_orilla_m: 2.5, profundidad_lecho_m: 0.0, ancho_subseccion_m: 0.5 }
        ]
      }));
    }
  };

  // Cálculo en tiempo real del área mojada y profundidad máxima
  const { calculatedArea, maxRiverDepth } = useMemo(() => {
    const pts = formData.puntos_seccion || [];
    if (pts.length < 2) return { calculatedArea: 0, maxRiverDepth: 0 };
    const sorted = [...pts].sort((a, b) => a.distancia_orilla_m - b.distancia_orilla_m);
    let area = 0;
    let maxD = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      const dx = Math.abs(p2.distancia_orilla_m - p1.distancia_orilla_m);
      const avgD = ((Number(p1.profundidad_lecho_m) || 0) + (Number(p2.profundidad_lecho_m) || 0)) / 2;
      area += avgD * dx;
      if ((Number(p1.profundidad_lecho_m) || 0) > maxD) maxD = Number(p1.profundidad_lecho_m);
      if ((Number(p2.profundidad_lecho_m) || 0) > maxD) maxD = Number(p2.profundidad_lecho_m);
    }
    return { calculatedArea: parseFloat(area.toFixed(3)), maxRiverDepth: parseFloat(maxD.toFixed(2)) };
  }, [formData.puntos_seccion]);

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
        id_entidad_responsable: formData.id_entidad_responsable || (entities[0]?.id_entidad || "ENT-01-ANA"),
        ancho_total_rio_m: Number(formData.ancho_total_rio_m) || 4.0,
        molinete_constante_a: Number(formData.molinete_constante_a) || 0.25,
        molinete_constante_b: Number(formData.molinete_constante_b) || 0.05,
        coeficiente_friccion: Number(formData.coeficiente_friccion) || 0.035,
        puntos_seccion: formData.puntos_seccion.map((p, idx) => ({
          orden_punto: idx + 1,
          distancia_orilla_m: Number(p.distancia_orilla_m) || 0,
          profundidad_lecho_m: Number(p.profundidad_lecho_m) || 0,
          ancho_subseccion_m: Number(p.ancho_subseccion_m) || 1.0
        }))
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

              {step1Error && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs rounded-xl font-medium">
                  {step1Error}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={entities.length === 0}
                  onClick={() => {
                    setStep1Error('');
                    if (!formData.nombre || !formData.nombre.trim()) {
                      setStep1Error('El nombre de la estación es obligatorio.');
                      return;
                    }
                    const coordCheck = validateCoordinates(formData.latitud, formData.longitud, formData.cota_msnm);
                    if (!coordCheck.isValid) {
                      setStep1Error(coordCheck.errors.join(' '));
                      return;
                    }
                    setStep(2);
                  }}
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

          {/* PASO 2: Estructura Hidráulica y Calibración de Sensores */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-cyan-500" />
                  <span>Paso 2: Calibración Físico-Química de Sensores y Aforo Hidráulico</span>
                </h3>
                
                {/* Presets Rápidos */}
                <div className="flex items-center space-x-1 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-bold mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        ph_offset_v: 2.5000,
                        ph_slope: -0.1800,
                        tds_factor_k: 0.5000,
                        tds_offset_v: 0.0000,
                        turb_v_clear: 4.2000,
                        turb_v_turbid: 2.5000
                      }));
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-cyan-500/20 text-slate-700 dark:text-cyan-300 font-bold transition-colors cursor-pointer"
                  >
                    Estándar Lab
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        ph_offset_v: 2.4800,
                        ph_slope: -0.1840,
                        tds_factor_k: 0.5000,
                        tds_offset_v: 0.0000,
                        turb_v_clear: 4.2000,
                        turb_v_turbid: 2.4000
                      }));
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-cyan-500/20 text-slate-700 dark:text-cyan-300 font-bold transition-colors cursor-pointer"
                  >
                    Valle Chancay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        ph_offset_v: 2.5000,
                        ph_slope: -0.1800,
                        tds_factor_k: 0.5000,
                        tds_offset_v: 0.0000,
                        turb_v_clear: 4.2500,
                        turb_v_turbid: 2.5000
                      }));
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-cyan-500/20 text-slate-700 dark:text-cyan-300 font-bold transition-colors cursor-pointer"
                  >
                    Alta Cabecera
                  </button>
                </div>
              </div>

              {/* SECCIÓN A: CALIBRACIÓN ELECTROQUÍMICA & ÓPTICA */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>A. Calibración de Sondas Analógicas (Voltajes Crudos ADC1)</span>
                </h4>

                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Calibración pH */}
                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-300 dark:border-cyan-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Sonda pH (PH-4502C)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold font-mono">ADC1_CH4</span>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Offset pH 7.0 (V)</label>
                      <input
                        type="number"
                        step="0.001"
                        name="ph_offset_v"
                        value={formData.ph_offset_v}
                        onChange={handleInputChange}
                        className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-white font-bold focus:border-cyan-500"
                        title="Voltaje medido en solución buffer neutra pH 7.00"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Típico: 2.500 V en Buffer 7.0</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Pendiente Slope (V/pH)</label>
                      <input
                        type="number"
                        step="0.001"
                        name="ph_slope"
                        value={formData.ph_slope}
                        onChange={handleInputChange}
                        className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-white font-bold focus:border-cyan-500"
                        title="Sensibilidad del electrodo en Voltios por unidad de pH"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Típico: -0.180 a -0.184 V/pH</span>
                    </div>
                  </div>

                  {/* Calibración Salinidad / TDS */}
                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-300 dark:border-cyan-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Salinidad (Keyestudio TDS)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold font-mono">ADC1_CH6</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Factor Conversión K</label>
                      <input
                        type="number"
                        step="0.001"
                        name="tds_factor_k"
                        value={formData.tds_factor_k}
                        onChange={handleInputChange}
                        className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-white font-bold focus:border-cyan-500"
                        title="Factor de correlación TDS (ppm) vs Conductividad (µS/cm)"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Típico: 0.500 (NaCl estándar)</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Offset en Seco (V)</label>
                      <input
                        type="number"
                        step="0.001"
                        name="tds_offset_v"
                        value={formData.tds_offset_v || 0.0}
                        onChange={handleInputChange}
                        className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-white font-bold focus:border-cyan-500"
                        title="Voltaje residual medido con electrodo en el aire"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Típico: 0.000 V en aire</span>
                    </div>
                  </div>

                  {/* Calibración Turbidez */}
                  <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-300 dark:border-cyan-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Turbidez (TS-300B)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-500 font-bold font-mono">ADC1_CH7</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Voltaje Agua Clara (V)</label>
                      <input
                        type="number"
                        step="0.001"
                        name="turb_v_clear"
                        value={formData.turb_v_clear}
                        onChange={handleInputChange}
                        className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-white font-bold focus:border-cyan-500"
                        title="Voltaje medido en agua 100% clara / 0 NTU"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Típico: 4.200 V a 0 NTU</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Voltaje Agua Turbia (V)</label>
                      <input
                        type="number"
                        step="0.001"
                        name="turb_v_turbid"
                        value={formData.turb_v_turbid}
                        onChange={handleInputChange}
                        className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-white font-bold focus:border-cyan-500"
                        title="Voltaje medido en suspensión turbia patrón / 100 NTU"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Típico: 2.400 - 2.500 V a 100 NTU</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN B: AFORO POR MOLINETE HALL Y BATIMETRÍA CON REGLETA */}
              <div className="space-y-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-cyan-500" />
                    <span>B. Aforo por Molinete Hidrométrico (Hall) & Modelado Batimétrico con Regleta</span>
                  </h4>

                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-bold mr-1">Presets de Cauce:</span>
                    <button
                      type="button"
                      onClick={() => applyRiverPreset('CHANCAY_NATURAL')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Río Natural (5 Vert.)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRiverPreset('CANAL_RECTANGULAR')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Canal Rectangular
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRiverPreset('QUEBRADA_ESTRECHA')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Quebrada Estrecha
                    </button>
                  </div>
                </div>

                {/* 1. Constantes del Molinete Hidrométrico y Sensor Ultrasónico */}
                <div className="grid sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-300 dark:border-cyan-900/60 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Constante a (Paso Hélice)</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="molinete_constante_a"
                      value={formData.molinete_constante_a}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-slate-900 dark:text-white font-bold"
                      title="Pendiente de la recta de calibración V = a*(RPM/60) + b"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Ecuación: V = a·n + b</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Constante b (Fricción m/s)</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="molinete_constante_b"
                      value={formData.molinete_constante_b}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-slate-900 dark:text-white font-bold"
                      title="Velocidad mínima de inicio de giro del molinete (m/s)"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Vel. umbral inicial</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                      <Waves className="w-3.5 h-3.5 text-teal-500" />
                      <span>Rugosidad Manning n</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="coeficiente_friccion"
                      value={formData.coeficiente_friccion}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-slate-900 dark:text-white font-bold"
                      title="Coeficiente de rugosidad de Manning del cauce"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Típico: 0.030 - 0.040</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-amber-500" />
                      <span>Distancia Sensor-Lecho (cm)</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      name="distancia_fondo_sensor_cm"
                      value={formData.distancia_fondo_sensor_cm}
                      onChange={handleInputChange}
                      className="w-full bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 font-mono text-slate-900 dark:text-white font-bold"
                      title="Distancia fija desde la cara del sensor ultrasónico al punto más bajo del lecho"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Cota fija de montaje</span>
                  </div>
                </div>

                {/* 2. Ancho del Río y Puntos de Batimetría con Regleta */}
                <div className="grid lg:grid-cols-12 gap-6 items-start">
                  {/* Formulario de Puntos de Regleta */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Ancho Total del Río / Espejo (m)</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          name="ancho_total_rio_m"
                          value={formData.ancho_total_rio_m}
                          onChange={handleInputChange}
                          className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3.5 py-2 font-mono text-sm text-slate-900 dark:text-white font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Sección</label>
                        <select
                          name="tipo_seccion"
                          value={formData.tipo_seccion}
                          onChange={handleInputChange}
                          className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          <option value="REGLETA_PUNTOS" className="bg-[#072433]">Batimetría Regleta (Puntos Variables)</option>
                          <option value="RECTANGULAR" className="bg-[#072433]">Canal Rectangular</option>
                          <option value="TRAPEZOIDAL" className="bg-[#072433]">Canal Trapezoidal</option>
                        </select>
                      </div>
                    </div>

                    {/* Tabla Interactiva de Verticales con Regleta */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          Mediciones Batimétricas con Regleta ({formData.puntos_seccion.length} Verticales)
                        </span>
                        <button
                          type="button"
                          onClick={addPuntoSeccion}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar Vertical</span>
                        </button>
                      </div>

                      <div className="border border-slate-300 dark:border-cyan-900/60 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 dark:bg-[#061821] border-b border-slate-300 dark:border-cyan-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="px-3 py-2"># Vert.</th>
                              <th className="px-3 py-2">Dist. Orilla (m)</th>
                              <th className="px-3 py-2">Prof. Regleta (m)</th>
                              <th className="px-2 py-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-cyan-900/40 font-mono">
                            {formData.puntos_seccion.map((pt, idx) => (
                              <tr key={idx} className="hover:bg-cyan-950/20">
                                <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-bold">
                                  P{pt.orden_punto || idx + 1}
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    value={pt.distancia_orilla_m}
                                    onChange={(e) => updatePuntoSeccion(idx, 'distancia_orilla_m', e.target.value)}
                                    className="w-20 bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded px-2 py-1 text-slate-900 dark:text-white font-bold"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    value={pt.profundidad_lecho_m}
                                    onChange={(e) => updatePuntoSeccion(idx, 'profundidad_lecho_m', e.target.value)}
                                    className="w-20 bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-900/60 rounded px-2 py-1 text-teal-600 dark:text-cyan-300 font-bold"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removePuntoSeccion(idx)}
                                    className="p-1 rounded text-rose-500 hover:bg-rose-500/20 transition-colors"
                                    title="Eliminar vertical"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Previsualización Dinámica 2D (SVG) del Perfil del Río */}
                  <div className="lg:col-span-6 p-4 bg-slate-900/90 rounded-2xl border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-extrabold text-xs">
                        <Waves className="w-4 h-4" />
                        <span>Perfil Transversal en Tiempo Real (Aforo Batimétrico)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        Q = A(h) · V
                      </span>
                    </div>

                    {/* Contenedor SVG Interactivo */}
                    <div className="w-full bg-[#041119] rounded-xl border border-cyan-900/60 p-2 overflow-hidden">
                      <svg viewBox="0 0 500 210" className="w-full h-44 select-none">
                        <defs>
                          <linearGradient id="waterFlowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.25" />
                          </linearGradient>
                          <pattern id="pebbles" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="5" cy="5" r="1.5" fill="#334155" opacity="0.6" />
                            <circle cx="15" cy="12" r="2" fill="#1e293b" opacity="0.8" />
                          </pattern>
                        </defs>

                        {/* Superficie y Margen Terrestre */}
                        <line x1="40" y1="65" x2="460" y2="65" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 2" />
                        <text x="40" y="58" fill="#64748b" fontSize="9" fontWeight="bold">Orilla Izq. (0m)</text>
                        <text x="460" y="58" fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="end">Orilla Der. ({formData.ancho_total_rio_m}m)</text>

                        {/* Construcción del Polígono Mojado del Río */}
                        {(() => {
                          const totalW = formData.ancho_total_rio_m > 0 ? formData.ancho_total_rio_m : 4.0;
                          const maxD = maxRiverDepth > 0 ? maxRiverDepth : 1.0;
                          const pts = [...formData.puntos_seccion].sort((a, b) => a.distancia_orilla_m - b.distancia_orilla_m);
                          
                          const svgCoords = pts.map(p => {
                            const x = 40 + (p.distancia_orilla_m / totalW) * 420;
                            const y = 65 + (p.profundidad_lecho_m / (maxD * 1.3)) * 115;
                            return { x, y, pt: p };
                          });

                          const pathData = svgCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ') + 
                            ` L ${svgCoords[svgCoords.length - 1]?.x || 460} 65 L 40 65 Z`;

                          return (
                            <>
                              {/* Relleno de Agua */}
                              <path d={pathData} fill="url(#waterFlowGrad)" />
                              
                              {/* Línea del Lecho del Río */}
                              <path 
                                d={svgCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')} 
                                fill="none" 
                                stroke="#475569" 
                                strokeWidth="4" 
                                strokeLinecap="round" 
                              />

                              {/* Verticales de Regletas Graduadas */}
                              {svgCoords.map((c, idx) => (
                                <g key={idx}>
                                  <line x1={c.x} y1={65} x2={c.x} y2={c.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                                  <circle cx={c.x} cy={c.y} r="4" fill="#f59e0b" stroke="#041119" strokeWidth="1.5" />
                                  <rect x={c.x - 18} y={c.y + 6} width="36" height="14" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="0.8" />
                                  <text x={c.x} y={c.y + 16} fill="#fbbf24" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                                    {c.pt.profundidad_lecho_m}m
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}

                        {/* Sensor Ultrasonido Superior */}
                        <g transform="translate(230, 8)">
                          <rect x="0" y="0" width="40" height="18" rx="4" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.5" />
                          <text x="20" y="12" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">JSN-SR04T</text>
                          {/* Ondas ultrasónicas */}
                          <path d="M 12 24 Q 20 32 28 24" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8" />
                          <path d="M 6 32 Q 20 44 34 32" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.5" />
                        </g>

                        {/* Molinete Hidrométrico de Superficie */}
                        <g transform="translate(250, 65)">
                          {/* Mástil seco */}
                          <line x1="0" y1="-39" x2="0" y2="0" stroke="#94a3b8" strokeWidth="2.5" />
                          {/* Núcleo Molinete */}
                          <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
                          {/* Aspas en rotación */}
                          <line x1="-7" y1="-7" x2="7" y2="7" stroke="#06b6d4" strokeWidth="2" />
                          <line x1="7" y1="-7" x2="-7" y2="7" stroke="#06b6d4" strokeWidth="2" />
                          <circle cx="0" cy="0" r="3" fill="#38bdf8" />
                          <text x="14" y="4" fill="#06b6d4" fontSize="8" fontWeight="bold">Molinete Hall</text>
                        </g>
                      </svg>
                    </div>

                    {/* Resumen Hidrométrico en Vivo */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-cyan-900/40 text-center">
                        <span className="text-slate-400 block text-[9px]">ÁREA MOJADA (A)</span>
                        <span className="text-cyan-300 font-extrabold text-sm">{calculatedArea} m²</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-cyan-900/40 text-center">
                        <span className="text-slate-400 block text-[9px]">PROF. MÁXIMA</span>
                        <span className="text-teal-300 font-extrabold text-sm">{maxRiverDepth} m</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-cyan-900/40 text-center">
                        <span className="text-slate-400 block text-[9px]">ANCHO ESPEJO (B)</span>
                        <span className="text-amber-300 font-extrabold text-sm">{formData.ancho_total_rio_m} m</span>
                      </div>
                    </div>
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
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-md cursor-pointer"
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
