import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Droplets, 
  Layers, 
  Sprout, 
  CalendarRange, 
  RefreshCw, 
  Plus, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ShieldCheck,
  Compass,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { governanceApi } from '../services/api';
import { SystemSettingsManagement } from './SystemSettingsManagement';
import IrrigationShiftsManagement from './IrrigationShiftsManagement';

export default function WaterFrameworkManagement() {
  // Subsección activa: 'singleton' | 'resource_types' | 'water_uses' | 'crops' | 'shifts'
  const [activeSubTab, setActiveSubTab] = useState('singleton');

  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // ---------------------------------------------------------------------------
  // 1. ESTADO: TIPOS DE RECURSO HÍDRICO (tipos_recurso_hidrico)
  // ---------------------------------------------------------------------------
  const [resourceTypes, setResourceTypes] = useState([]);
  const [showResModal, setShowResModal] = useState(false);
  const [resModalMode, setResModalMode] = useState('create');
  const [selectedResType, setSelectedResType] = useState(null);
  const [resSubmitting, setResSubmitting] = useState(false);
  const [resFormData, setResFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    color_hex: '#06b6d4',
    icono_mapa: 'river',
    activo: true
  });

  // ---------------------------------------------------------------------------
  // 2. ESTADO: TIPOS DE USO DE AGUA (tipos_uso_agua)
  // ---------------------------------------------------------------------------
  const [waterUses, setWaterUses] = useState([]);
  const [showUseModal, setShowUseModal] = useState(false);
  const [useModalMode, setUseModalMode] = useState('create');
  const [selectedWaterUse, setSelectedWaterUse] = useState(null);
  const [useSubmitting, setUseSubmitting] = useState(false);
  const [useFormData, setUseFormData] = useState({
    codigo: '',
    nombre: '',
    prioridad_orden: 1,
    descripcion: '',
    activo: true
  });

  // ---------------------------------------------------------------------------
  // 3. ESTADO: CULTIVOS AGRÍCOLAS (cultivos_agricolas)
  // ---------------------------------------------------------------------------
  const [crops, setCrops] = useState([]);
  const [cropsSearch, setCropsSearch] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropModalMode, setCropModalMode] = useState('create');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [cropSubmitting, setCropSubmitting] = useState(false);
  const [cropFormData, setCropFormData] = useState({
    nombre_comun: '',
    nombre_cientifico: '',
    coeficiente_kc_medio: 0.85,
    requerimiento_hidrico_m3_ha: 8500,
    ciclo_vegetativo_dias: 180,
    sensibilidad_estres_hidrico: 'MEDIA',
    region_optima: 'COSTA_YUNGA',
    activo: true
  });

  // ---------------------------------------------------------------------------
  // CARGA DE DATOS
  // ---------------------------------------------------------------------------
  const fetchFrameworkData = async () => {
    setLoading(true);
    try {
      const [resRes, useRes, cropsRes] = await Promise.all([
        governanceApi.getResourceTypes().catch(() => ({ data: [] })),
        governanceApi.getWaterUses().catch(() => ({ data: [] })),
        governanceApi.getCrops().catch(() => ({ data: [] }))
      ]);
      setResourceTypes(resRes.data || []);
      setWaterUses(useRes.data || []);
      setCrops(cropsRes.data || []);
    } catch (err) {
      console.error('Error cargando marco hídrico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameworkData();
  }, []);

  // ---------------------------------------------------------------------------
  // HANDLERS: TIPOS DE RECURSO HÍDRICO
  // ---------------------------------------------------------------------------
  const openCreateResModal = () => {
    setResModalMode('create');
    setSelectedResType(null);
    setResFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      color_hex: '#06b6d4',
      icono_mapa: 'river',
      activo: true
    });
    setShowResModal(true);
  };

  const openEditResModal = (item) => {
    setResModalMode('edit');
    setSelectedResType(item);
    setResFormData({
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      color_hex: item.color_hex || '#06b6d4',
      icono_mapa: item.icono_mapa || 'river',
      activo: item.activo !== false
    });
    setShowResModal(true);
  };

  const handleResSubmit = async (e) => {
    e.preventDefault();
    if (!resFormData.codigo.trim() || !resFormData.nombre.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Código y Nombre son obligatorios.' });
      return;
    }
    setResSubmitting(true);
    try {
      if (resModalMode === 'create') {
        await governanceApi.createResourceType({
          ...resFormData,
          codigo: resFormData.codigo.toUpperCase().replace(/\s+/g, '_')
        });
        setFeedbackMsg({ type: 'success', text: `Tipo de recurso '${resFormData.nombre}' registrado.` });
      } else {
        await governanceApi.updateResourceType(selectedResType.id_tipo_recurso, resFormData);
        setFeedbackMsg({ type: 'success', text: `Tipo de recurso '${resFormData.nombre}' actualizado.` });
      }
      setShowResModal(false);
      fetchFrameworkData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setResSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: TIPOS DE USO DE AGUA
  // ---------------------------------------------------------------------------
  const openCreateUseModal = () => {
    setUseModalMode('create');
    setSelectedWaterUse(null);
    setUseFormData({
      codigo: '',
      nombre: '',
      prioridad_orden: waterUses.length + 1,
      descripcion: '',
      activo: true
    });
    setShowUseModal(true);
  };

  const openEditUseModal = (item) => {
    setUseModalMode('edit');
    setSelectedWaterUse(item);
    setUseFormData({
      codigo: item.codigo,
      nombre: item.nombre,
      prioridad_orden: item.prioridad_orden ?? 1,
      descripcion: item.descripcion || '',
      activo: item.activo !== false
    });
    setShowUseModal(true);
  };

  const handleUseSubmit = async (e) => {
    e.preventDefault();
    if (!useFormData.codigo.trim() || !useFormData.nombre.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Código y Nombre son requeridos.' });
      return;
    }
    setUseSubmitting(true);
    try {
      if (useModalMode === 'create') {
        await governanceApi.createWaterUse({
          ...useFormData,
          codigo: useFormData.codigo.toUpperCase().replace(/\s+/g, '_'),
          prioridad_orden: parseInt(useFormData.prioridad_orden) || 1
        });
        setFeedbackMsg({ type: 'success', text: `Uso de agua '${useFormData.nombre}' registrado.` });
      } else {
        await governanceApi.updateWaterUse(selectedWaterUse.id_tipo_uso, {
          ...useFormData,
          prioridad_orden: parseInt(useFormData.prioridad_orden) || 1
        });
        setFeedbackMsg({ type: 'success', text: `Uso de agua '${useFormData.nombre}' actualizado.` });
      }
      setShowUseModal(false);
      fetchFrameworkData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setUseSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: CULTIVOS AGRÍCOLAS
  // ---------------------------------------------------------------------------
  const openCreateCropModal = () => {
    setCropModalMode('create');
    setSelectedCrop(null);
    setCropFormData({
      nombre_comun: '',
      nombre_cientifico: '',
      coeficiente_kc_medio: 0.85,
      requerimiento_hidrico_m3_ha: 8500,
      ciclo_vegetativo_dias: 180,
      sensibilidad_estres_hidrico: 'MEDIA',
      region_optima: 'COSTA_YUNGA',
      activo: true
    });
    setShowCropModal(true);
  };

  const openEditCropModal = (crop) => {
    setCropModalMode('edit');
    setSelectedCrop(crop);
    setCropFormData({
      nombre_comun: crop.nombre_comun,
      nombre_cientifico: crop.nombre_cientifico || '',
      coeficiente_kc_medio: crop.coeficiente_kc_medio ?? 0.85,
      requerimiento_hidrico_m3_ha: crop.requerimiento_hidrico_m3_ha ?? 8500,
      ciclo_vegetativo_dias: crop.ciclo_vegetativo_dias ?? 180,
      sensibilidad_estres_hidrico: crop.sensibilidad_estres_hidrico || 'MEDIA',
      region_optima: crop.region_optima || 'COSTA_YUNGA',
      activo: crop.activo !== false
    });
    setShowCropModal(true);
  };

  const handleCropSubmit = async (e) => {
    e.preventDefault();
    if (!cropFormData.nombre_comun.trim()) {
      setFeedbackMsg({ type: 'error', text: 'El nombre común del cultivo es requerido.' });
      return;
    }
    setCropSubmitting(true);
    try {
      const payload = {
        ...cropFormData,
        coeficiente_kc_medio: parseFloat(cropFormData.coeficiente_kc_medio) || 0.85,
        requerimiento_hidrico_m3_ha: parseFloat(cropFormData.requerimiento_hidrico_m3_ha) || 8500,
        ciclo_vegetativo_dias: parseInt(cropFormData.ciclo_vegetativo_dias) || 180
      };

      if (cropModalMode === 'create') {
        await governanceApi.createCrop(payload);
        setFeedbackMsg({ type: 'success', text: `Cultivo '${cropFormData.nombre_comun}' agregado al catálogo.` });
      } else {
        await governanceApi.updateCrop(selectedCrop.id_cultivo, payload);
        setFeedbackMsg({ type: 'success', text: `Cultivo '${cropFormData.nombre_comun}' actualizado.` });
      }
      setShowCropModal(false);
      fetchFrameworkData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setCropSubmitting(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const filteredCrops = crops.filter(c => {
    const term = cropsSearch.toLowerCase();
    return (
      c.nombre_comun?.toLowerCase().includes(term) ||
      c.nombre_cientifico?.toLowerCase().includes(term) ||
      c.region_optima?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado Principal */}
      <div className="spatial-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Droplets className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Subsección 5: Cuenca & Marco Hídrico Integral</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Marco Regulatorio, Usos de Agua y Demanda Hídrica
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Configuración global singleton de cuenca, tipologías de recursos hídricos, orden de prioridad según Ley 29338, coeficientes Kc de cultivos y programación de la mita.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchFrameworkData}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-cyan-900/60 transition-all shadow-sm cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>

          {activeSubTab === 'resource_types' && (
            <button
              onClick={openCreateResModal}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Tipo de Recurso</span>
            </button>
          )}

          {activeSubTab === 'water_uses' && (
            <button
              onClick={openCreateUseModal}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Tipo de Uso</span>
            </button>
          )}

          {activeSubTab === 'crops' && (
            <button
              onClick={openCreateCropModal}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Cultivo</span>
            </button>
          )}
        </div>
      </div>

      {/* Subpestañas Internas */}
      <div className="flex border-b border-slate-200 dark:border-cyan-900/60 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('singleton')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'singleton'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Identidad de Cuenca (Singleton)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('resource_types')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'resource_types'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Tipos de Recurso Hídrico ({resourceTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('water_uses')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'water_uses'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>Tipos de Uso & Prioridad ({waterUses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('crops')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'crops'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>Cultivos & Demanda Kc ({crops.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('shifts')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'shifts'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>Turnos de Riego & Mita</span>
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
      {/* VISTA 1: IDENTIDAD CUENCA SINGLETON */}
      {/* ======================================================================= */}
      {activeSubTab === 'singleton' && (
        <SystemSettingsManagement />
      )}

      {/* ======================================================================= */}
      {/* VISTA 2: TIPOS DE RECURSO HÍDRICO (tipos_recurso_hidrico) */}
      {/* ======================================================================= */}
      {activeSubTab === 'resource_types' && (
        <div className="space-y-4">
          <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#061e2b]/90 border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Código Identificador</th>
                    <th className="py-3.5 px-4 font-bold">Nombre del Recurso</th>
                    <th className="py-3.5 px-4 font-bold">Color / Token 3D</th>
                    <th className="py-3.5 px-4 font-bold">Descripción Hidrológica</th>
                    <th className="py-3.5 px-4 font-bold">Estado</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
                  {resourceTypes.map((type) => (
                    <tr key={type.id_tipo_recurso} className="hover:bg-slate-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-300">
                        {type.codigo}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {type.nombre}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span 
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm" 
                            style={{ backgroundColor: type.color_hex || '#06b6d4' }} 
                          />
                          <span className="font-mono text-slate-600 dark:text-slate-300">{type.color_hex || '#06b6d4'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {type.descripcion || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {type.activo !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditResModal(type)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline mr-1" /> Editar
                        </button>
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
      {/* VISTA 3: TIPOS DE USO DE AGUA (tipos_uso_agua) */}
      {/* ======================================================================= */}
      {activeSubTab === 'water_uses' && (
        <div className="space-y-4">
          <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
            <div className="p-4 border-b border-slate-200 dark:border-cyan-900/60 bg-slate-50 dark:bg-[#061e2b]/90">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Jerarquía Legal de Usos de Agua (Ley de Recursos Hídricos Nº 29338)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                El orden de prioridad determina la asignación obligatoria en periodos de estiaje severo o contingencias de sequía.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#061821] border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold text-center">Prioridad</th>
                    <th className="py-3.5 px-4 font-bold">Código Identificador</th>
                    <th className="py-3.5 px-4 font-bold">Clase de Uso</th>
                    <th className="py-3.5 px-4 font-bold">Alcance Legal</th>
                    <th className="py-3.5 px-4 font-bold">Estado</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
                  {waterUses.sort((a, b) => a.prioridad_orden - b.prioridad_orden).map((use) => (
                    <tr key={use.id_tipo_uso} className="hover:bg-slate-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 inline-flex items-center justify-center font-mono font-black text-xs">
                          {use.prioridad_orden}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {use.codigo}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-cyan-600 dark:text-cyan-300">
                        {use.nombre}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {use.descripcion || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {use.activo !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditUseModal(use)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline mr-1" /> Editar
                        </button>
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
      {/* VISTA 4: CULTIVOS AGRÍCOLAS (cultivos_agricolas) */}
      {/* ======================================================================= */}
      {activeSubTab === 'crops' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda de Cultivos */}
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cultivo por nombre común, científico o región..."
              value={cropsSearch}
              onChange={(e) => setCropsSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#061e2b]/90 border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Cultivo Agrícola</th>
                    <th className="py-3.5 px-4 font-bold">Nombre Botánico</th>
                    <th className="py-3.5 px-4 font-bold text-center">Kc Medio</th>
                    <th className="py-3.5 px-4 font-bold text-center">Demanda (m³/ha/año)</th>
                    <th className="py-3.5 px-4 font-bold text-center">Ciclo (Días)</th>
                    <th className="py-3.5 px-4 font-bold">Sensibilidad</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
                  {filteredCrops.map((crop) => (
                    <tr key={crop.id_cultivo} className="hover:bg-slate-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {crop.nombre_comun}
                      </td>
                      <td className="py-3.5 px-4 italic text-slate-500 dark:text-slate-400">
                        {crop.nombre_cientifico || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-cyan-600 dark:text-cyan-300">
                        {crop.coeficiente_kc_medio?.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {crop.requerimiento_hidrico_m3_ha?.toLocaleString()} m³
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-300">
                        {crop.ciclo_vegetativo_dias} d
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          crop.sensibilidad_estres_hidrico === 'ALTA'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : crop.sensibilidad_estres_hidrico === 'BAJA'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {crop.sensibilidad_estres_hidrico}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditCropModal(crop)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline mr-1" /> Editar
                        </button>
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
      {/* VISTA 5: TURNOS DE RIEGO & MITA */}
      {/* ======================================================================= */}
      {activeSubTab === 'shifts' && (
        <IrrigationShiftsManagement />
      )}

      {/* ======================================================================= */}
      {/* MODAL 1: CREAR / EDITAR TIPO DE RECURSO HÍDRICO */}
      {/* ======================================================================= */}
      {showResModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {resModalMode === 'create' ? 'Nuevo Tipo de Recurso Hídrico' : 'Editar Tipo de Recurso'}
              </h3>
              <button onClick={() => setShowResModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Código Único (Mayúsculas) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: SUPERFICIAL_RIO, MANANTIAL..."
                  value={resFormData.codigo}
                  disabled={resModalMode === 'edit'}
                  onChange={(e) => setResFormData(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Nombre Descriptivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Superficial (Río / Quebrada)"
                  value={resFormData.nombre}
                  onChange={(e) => setResFormData(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Color Hexadecimal (Token 3D)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={resFormData.color_hex}
                    onChange={(e) => setResFormData(p => ({ ...p, color_hex: e.target.value }))}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={resFormData.color_hex}
                    onChange={(e) => setResFormData(p => ({ ...p, color_hex: e.target.value }))}
                    className="flex-1 bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-1.5 font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Descripción Hidrológica</label>
                <textarea
                  rows={2}
                  value={resFormData.descripcion}
                  onChange={(e) => setResFormData(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowResModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 rounded-xl font-extrabold shadow-md cursor-pointer"
                >
                  {resSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: CREAR / EDITAR TIPO DE USO DE AGUA */}
      {/* ======================================================================= */}
      {showUseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {useModalMode === 'create' ? 'Nuevo Tipo de Uso de Agua' : 'Editar Uso de Agua'}
              </h3>
              <button onClick={() => setShowUseModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUseSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Código Único (Mayúsculas) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: USO_AGRARIO, USO_POBLACIONAL..."
                  value={useFormData.codigo}
                  disabled={useModalMode === 'edit'}
                  onChange={(e) => setUseFormData(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Nombre de la Clase de Uso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Uso Productivo Agrario"
                  value={useFormData.nombre}
                  onChange={(e) => setUseFormData(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Prioridad Legal (1 = Máxima Prioridad Ley 29338)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={useFormData.prioridad_orden}
                  onChange={(e) => setUseFormData(p => ({ ...p, prioridad_orden: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Descripción / Justificación Legal</label>
                <textarea
                  rows={2}
                  value={useFormData.descripcion}
                  onChange={(e) => setUseFormData(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowUseModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={useSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 rounded-xl font-extrabold shadow-md cursor-pointer"
                >
                  {useSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 3: CREAR / EDITAR CULTIVO AGRÍCOLA */}
      {/* ======================================================================= */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#072433] border border-slate-300 dark:border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-900/60 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {cropModalMode === 'create' ? 'Registrar Nuevo Cultivo en Catálogo' : 'Editar Cultivo Agrícola'}
              </h3>
              <button onClick={() => setShowCropModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-rose-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCropSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nombre Común *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Palto Hass, Melocotón"
                    value={cropFormData.nombre_comun}
                    onChange={(e) => setCropFormData(p => ({ ...p, nombre_comun: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Nombre Científico</label>
                  <input
                    type="text"
                    placeholder="Ej: Persea americana"
                    value={cropFormData.nombre_cientifico}
                    onChange={(e) => setCropFormData(p => ({ ...p, nombre_cientifico: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 italic text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Kc Medio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cropFormData.coeficiente_kc_medio}
                    onChange={(e) => setCropFormData(p => ({ ...p, coeficiente_kc_medio: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Demanda (m³/ha)</label>
                  <input
                    type="number"
                    value={cropFormData.requerimiento_hidrico_m3_ha}
                    onChange={(e) => setCropFormData(p => ({ ...p, requerimiento_hidrico_m3_ha: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Ciclo (Días)</label>
                  <input
                    type="number"
                    value={cropFormData.ciclo_vegetativo_dias}
                    onChange={(e) => setCropFormData(p => ({ ...p, ciclo_vegetativo_dias: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sensibilidad a Estrés Hídrico</label>
                  <select
                    value={cropFormData.sensibilidad_estres_hidrico}
                    onChange={(e) => setCropFormData(p => ({ ...p, sensibilidad_estres_hidrico: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALTA">ALTA (Muy sensible a sequía)</option>
                    <option value="MEDIA">MEDIA (Tolerancia moderada)</option>
                    <option value="BAJA">BAJA (Resistente / Rústico)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Piso Altitudinal Óptimo</label>
                  <select
                    value={cropFormData.region_optima}
                    onChange={(e) => setCropFormData(p => ({ ...p, region_optima: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="COSTA_YUNGA">Costa / Yunga (0 - 2300 msnm)</option>
                    <option value="QUECHUA">Quechua (2300 - 3500 msnm)</option>
                    <option value="SUNI_PUNA">Suni / Puna (&gt; 3500 msnm)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-cyan-900/60">
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cropSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl font-extrabold shadow-md cursor-pointer"
                >
                  {cropSubmitting ? 'Guardando...' : 'Guardar Cultivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
