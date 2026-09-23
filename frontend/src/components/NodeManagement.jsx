import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Battery, 
  Signal, 
  Trash2, 
  KeyRound, 
  RefreshCw, 
  PlusCircle, 
  Clock, 
  Activity, 
  Droplets,
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Check, 
  Zap, 
  Sliders, 
  Sparkles, 
  X,
  Wrench,
  Calendar,
  ClipboardList,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Edit
} from 'lucide-react';
import { nodesApi } from '../services/api';

export default function NodeManagement({ setActiveTab }) {
  // Tab principal: 'stations' | 'maintenance'
  const [activeView, setActiveView] = useState('stations');

  // Estado de Nodos / Estaciones
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyModal, setApiKeyModal] = useState(null);
  const [copied, setCopied] = useState(false);

  // Estado de Mantenimientos & Bitácora
  const [maintenances, setMaintenances] = useState([]);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintFilterNode, setMaintFilterNode] = useState('ALL');
  const [maintFilterStatus, setMaintFilterStatus] = useState('ALL');
  const [maintFilterType, setMaintFilterType] = useState('ALL');
  const [maintSearch, setMaintSearch] = useState('');

  // Modal de Mantenimiento
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [maintModalMode, setMaintModalMode] = useState('create');
  const [selectedMaint, setSelectedMaint] = useState(null);
  const [maintSaving, setMaintSaving] = useState(false);
  const [maintForm, setMaintForm] = useState({
    id_nodo: '',
    tipo_mantenimiento: 'PREVENTIVO',
    categoria: 'FISICO',
    fecha_programada: '',
    fecha_ejecucion: '',
    tecnico_responsable: '',
    descripcion_trabajo: '',
    diagnostico_inicial: '',
    acciones_realizadas: '',
    repuestos_utilizados: '',
    firmware_version_anterior: '',
    firmware_version_instalada: '',
    costo_estimado: 0,
    estado_mantenimiento: 'PROGRAMADO',
    observaciones: ''
  });

  // Estado de Calibración
  const [calibModalNode, setCalibModalNode] = useState(null);
  const [calibLoading, setCalibLoading] = useState(false);
  const [calibSaving, setCalibSaving] = useState(false);
  const [calibSuccess, setCalibSuccess] = useState(false);
  const [calibForm, setCalibForm] = useState({
    ph_offset_v: 2.5000,
    ph_slope: -0.1800,
    tds_factor_k: 0.5000,
    tds_offset_v: 0.0000,
    turb_v_clear: 4.2000,
    turb_v_turbid: 2.5000,
    distancia_fondo_sensor_cm: 120.0,
    caudal_coef_k: 0.3810,
    caudal_exp_n: 1.5800,
    calibrado_por: 'Operador Técnico'
  });

  const fetchNodes = () => {
    setLoading(true);
    nodesApi.getNodes()
      .then(res => setNodes(res.data || []))
      .catch(err => console.error("Error obteniendo nodos:", err))
      .finally(() => setLoading(false));
  };

  const fetchMaintenances = () => {
    setMaintLoading(true);
    nodesApi.getAllMaintenances()
      .then(res => setMaintenances(res.data || []))
      .catch(err => console.error("Error obteniendo mantenimientos:", err))
      .finally(() => setMaintLoading(false));
  };

  // Carga inicial al montar el componente
  useEffect(() => {
    fetchNodes();
    fetchMaintenances();
  }, []);

  const openCreateMaintenance = (preselectedNodeId = '') => {
    setMaintModalMode('create');
    setSelectedMaint(null);
    const nowIso = new Date().toISOString().slice(0, 16);
    setMaintForm({
      id_nodo: preselectedNodeId || (nodes[0]?.id_nodo || ''),
      tipo_mantenimiento: 'PREVENTIVO',
      categoria: 'FISICO',
      fecha_programada: nowIso,
      fecha_ejecucion: '',
      tecnico_responsable: 'Técnico Especialista Hidráulico',
      descripcion_trabajo: '',
      diagnostico_inicial: '',
      acciones_realizadas: '',
      repuestos_utilizados: '',
      firmware_version_anterior: '',
      firmware_version_instalada: '',
      costo_estimado: 0,
      estado_mantenimiento: 'PROGRAMADO',
      observaciones: ''
    });
    setMaintModalOpen(true);
  };

  const openEditMaintenance = (maint) => {
    setMaintModalMode('edit');
    setSelectedMaint(maint);
    setMaintForm({
      id_nodo: maint.id_nodo,
      tipo_mantenimiento: maint.tipo_mantenimiento,
      categoria: maint.categoria,
      fecha_programada: maint.fecha_programada ? new Date(maint.fecha_programada).toISOString().slice(0, 16) : '',
      fecha_ejecucion: maint.fecha_ejecucion ? new Date(maint.fecha_ejecucion).toISOString().slice(0, 16) : '',
      tecnico_responsable: maint.tecnico_responsable || '',
      descripcion_trabajo: maint.descripcion_trabajo || '',
      diagnostico_inicial: maint.diagnostico_inicial || '',
      acciones_realizadas: maint.acciones_realizadas || '',
      repuestos_utilizados: maint.repuestos_utilizados || '',
      firmware_version_anterior: maint.firmware_version_anterior || '',
      firmware_version_instalada: maint.firmware_version_instalada || '',
      costo_estimado: maint.costo_estimado ?? 0,
      estado_mantenimiento: maint.estado_mantenimiento || 'PROGRAMADO',
      observaciones: maint.observaciones || ''
    });
    setMaintModalOpen(true);
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!maintForm.id_nodo) {
      alert("Selecciona una estación.");
      return;
    }
    if (!maintForm.descripcion_trabajo.trim()) {
      alert("La descripción del trabajo es requerida.");
      return;
    }

    setMaintSaving(true);
    try {
      const payload = {
        ...maintForm,
        fecha_programada: maintForm.fecha_programada ? new Date(maintForm.fecha_programada).toISOString() : new Date().toISOString(),
        fecha_ejecucion: maintForm.fecha_ejecucion ? new Date(maintForm.fecha_ejecucion).toISOString() : null,
        costo_estimado: parseFloat(maintForm.costo_estimado) || 0
      };

      if (maintModalMode === 'create') {
        await nodesApi.createMaintenance(payload.id_nodo, payload);
      } else {
        await nodesApi.updateMaintenance(selectedMaint.id_mantenimiento, payload);
      }
      setMaintModalOpen(false);
      fetchMaintenances();
    } catch (err) {
      alert("Error al guardar mantenimiento: " + (err.response?.data?.detail || err.message));
    } finally {
      setMaintSaving(false);
    }
  };

  const handleDeleteMaintenance = async (maintId, desc) => {
    if (window.confirm(`¿Deseas archivar la orden de mantenimiento "${desc}"?`)) {
      try {
        await nodesApi.deleteMaintenance(maintId);
        fetchMaintenances();
      } catch (err) {
        alert("Error al archivar mantenimiento: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const filteredMaintenances = useMemo(() => {
    return maintenances.filter(m => {
      if (maintFilterNode !== 'ALL' && m.id_nodo !== maintFilterNode) return false;
      if (maintFilterStatus !== 'ALL' && m.estado_mantenimiento !== maintFilterStatus) return false;
      if (maintFilterType !== 'ALL' && m.tipo_mantenimiento !== maintFilterType) return false;
      if (maintSearch.trim()) {
        const q = maintSearch.toLowerCase();
        const matchDesc = m.descripcion_trabajo?.toLowerCase().includes(q);
        const matchTec = m.tecnico_responsable?.toLowerCase().includes(q);
        const matchNode = (m.nodo_nombre || m.id_nodo)?.toLowerCase().includes(q);
        if (!matchDesc && !matchTec && !matchNode) return false;
      }
      return true;
    });
  }, [maintenances, maintFilterNode, maintFilterStatus, maintFilterType, maintSearch]);

  const maintKPIs = useMemo(() => {
    const total = maintenances.length;
    const programados = maintenances.filter(m => m.estado_mantenimiento === 'PROGRAMADO').length;
    const enEjecucion = maintenances.filter(m => m.estado_mantenimiento === 'EN_EJECUCION').length;
    const completados = maintenances.filter(m => m.estado_mantenimiento === 'COMPLETADO').length;
    return { total, programados, enEjecucion, completados };
  }, [maintenances]);

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'PROGRAMADO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/40">
            <Clock className="w-3 h-3" />
            <span>Programado</span>
          </span>
        );
      case 'EN_EJECUCION':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-500/40 animate-pulse">
            <Activity className="w-3 h-3 text-cyan-500" />
            <span>En Ejecución</span>
          </span>
        );
      case 'COMPLETADO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Completado</span>
          </span>
        );
      case 'CANCELADO':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            <X className="w-3 h-3 text-slate-400" />
            <span>Cancelado</span>
          </span>
        );
    }
  };

  const getTipoBadge = (tipo) => {
    const tiposMeta = {
      PREVENTIVO: { label: 'Preventivo', color: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-800' },
      CORRECTIVO: { label: 'Correctivo', color: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800' },
      CALIBRACION_SENSORES: { label: 'Calibración Sondas', color: 'text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-950/50 dark:border-purple-800' },
      ACTUALIZACION_FIRMWARE: { label: 'Firmware ESP32', color: 'text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/50 dark:border-cyan-800' },
      LIMPIEZA_SONDAS: { label: 'Limpieza Óptica/pH', color: 'text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-300 dark:bg-teal-950/50 dark:border-teal-800' },
      CAMBIO_BATERIA_SOLAR: { label: 'Batería Solar 12V', color: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800' },
      AFORO_REGLETAS: { label: 'Aforo Molinete/Regleta', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800' },
    };
    const meta = tiposMeta[tipo] || { label: tipo, color: 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700' };
    return (
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border ${meta.color}`}>
        {meta.label}
      </span>
    );
  };

  const openCalibration = async (node) => {
    setCalibModalNode(node);
    setCalibLoading(true);
    setCalibSuccess(false);
    try {
      const res = await nodesApi.getNodeCalibration(node.id_nodo);
      if (res.data) {
        setCalibForm({
          ph_offset_v: res.data.ph_offset_v ?? 2.5000,
          ph_slope: res.data.ph_slope ?? -0.1800,
          tds_factor_k: res.data.tds_factor_k ?? 0.5000,
          tds_offset_v: res.data.tds_offset_v ?? 0.0000,
          turb_v_clear: res.data.turb_v_clear ?? 4.2000,
          turb_v_turbid: res.data.turb_v_turbid ?? 2.5000,
          distancia_fondo_sensor_cm: res.data.distancia_fondo_sensor_cm ?? 120.0,
          caudal_coef_k: res.data.caudal_coef_k ?? 0.3810,
          caudal_exp_n: res.data.caudal_exp_n ?? 1.5800,
          calibrado_por: res.data.calibrado_por || 'Operador Técnico'
        });
      }
    } catch (err) {
      console.warn("Sin calibración previa, usando valores por defecto:", err);
    } finally {
      setCalibLoading(false);
    }
  };

  const handleSaveCalibration = async (e) => {
    e.preventDefault();
    if (!calibModalNode) return;
    setCalibSaving(true);
    try {
      await nodesApi.updateNodeCalibration(calibModalNode.id_nodo, calibForm);
      setCalibSuccess(true);
      setTimeout(() => {
        setCalibSuccess(false);
        setCalibModalNode(null);
      }, 1500);
    } catch (err) {
      alert("Error al guardar calibración: " + (err.response?.data?.detail || err.message));
    } finally {
      setCalibSaving(false);
    }
  };

  const handleRegenerateKey = async (nodeId) => {
    if (window.confirm(`¿Seguro que deseas regenerar la API Key del nodo ${nodeId}? La clave anterior dejará de funcionar inmediatamente.`)) {
      try {
        const res = await nodesApi.regenerateApiKey(nodeId);
        setApiKeyModal(res.data);
      } catch (err) {
        alert("Error regenerando API Key: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleDelete = async (nodeId, name) => {
    if (window.confirm(`¿Eliminar la estación ${name} (${nodeId})? Esta acción eliminará el nodo y sus calibraciones asociadas.`)) {
      try {
        await nodesApi.deleteNode(nodeId);
        fetchNodes();
      } catch (err) {
        alert("Error al eliminar estación: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado Principal y Pestañas Segmentadas */}
      <div className="spatial-card p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <span>Subsección 3: Infraestructura & Aforo Fluvial</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Red de Estaciones & Mantenimiento
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Supervisión continua de nodos telemétricos, calibración de constantes a/b de molinete y bitácora técnica de campo.
          </p>
        </div>

        {/* Selector Segmentado de Vista */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-cyan-900/60 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveView('stations')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'stations'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Directorio IoT ({nodes.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveView('maintenance');
                fetchMaintenances();
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'maintenance'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Bitácora & Mantenimientos ({maintenances.length})</span>
            </button>
          </div>

          <button
            onClick={() => setActiveTab('wizard')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Aprovisionar Estación</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* VISTA 1: DIRECTORIO Y MONITOREO DE ESTACIONES IOT */}
      {/* ======================================================================= */}
      {activeView === 'stations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Mostrando <strong className="text-slate-900 dark:text-cyan-300">{nodes.length}</strong> estaciones operativas en cuenca
            </div>
            <button
              onClick={fetchNodes}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-cyan-300 border border-slate-300 dark:border-cyan-900/60 transition-all shadow-sm cursor-pointer"
              title="Actualizar estado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>
          </div>
      {loading && nodes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">Cargando estaciones telemétricas...</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="spatial-card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-600 dark:text-cyan-400">
            <Radio className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">No hay estaciones registradas aún</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            La base de datos arranca limpia. Utiliza el Asistente de Provisión para registrar tu primera estación física y obtener su clave de comunicación.
          </p>
          <button
            onClick={() => setActiveTab('wizard')}
            className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm shadow-md cursor-pointer"
          >
            Registrar Primera Estación
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nodes.map((node) => {
            const isOnline = node.estado_operativo === 'ONLINE';
            const isDelayed = node.estado_operativo === 'DELAYED';
            const isCritical = node.estado_salinidad === 'PELIGRO_ESTRES_OSMOTICO';

            return (
              <div
                key={node.id_nodo}
                className={`spatial-card p-6 space-y-5 flex flex-col justify-between border transition-all ${
                  isCritical 
                    ? 'border-rose-400/80 bg-rose-500/5 shadow-rose-500/10' 
                    : isOnline 
                    ? 'border-cyan-500/30 shadow-cyan-500/5' 
                    : 'border-slate-200 dark:border-slate-800 opacity-90'
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-cyan-950/80 text-slate-800 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30">
                      {node.id_nodo}
                    </span>
                    
                    {/* Badge de Estado */}
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isOnline
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-500/40'
                        : isDelayed
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-500/40'
                        : 'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : isDelayed ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                      <span>{node.estado_operativo}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                    {node.nombre}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {node.subcuenca || 'Cuenca General'} • {node.sector_cuenca || 'Sector'} ({node.cota_msnm ? `${node.cota_msnm} msnm` : '0 msnm'})
                  </p>
                </div>

                {/* Métricas de Calidad de Agua */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#061821]/80 p-4 rounded-2xl border border-slate-200 dark:border-cyan-900/40">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Índice WQI</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {node.ultimo_wqi_score !== null ? `${node.ultimo_wqi_score.toFixed(1)} / 100` : '—'}
                    </span>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block font-bold">
                      {node.ultimo_wqi_categoria || 'Sin datos'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">Salinidad / EC</span>
                    <span className={`text-base font-black ${isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      {node.ultimo_ec_us_cm !== null ? `${node.ultimo_ec_us_cm.toFixed(0)} µS/cm` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      pH: {node.ultimo_ph !== null ? node.ultimo_ph.toFixed(2) : '—'}
                    </span>
                  </div>
                </div>

                {/* Estado de Hardware (Batería y Señal) */}
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-cyan-900/40">
                  <div className="flex items-center space-x-1.5" title="Tensión de Batería Solar 12V">
                    <Battery className={`w-4 h-4 ${node.bateria_v && node.bateria_v < 11.5 ? 'text-amber-500' : 'text-cyan-500'}`} />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{node.bateria_v !== null ? `${node.bateria_v.toFixed(2)} V` : '—'}</span>
                  </div>

                  <div className="flex items-center space-x-1.5" title="Intensidad de Señal Celular GSM">
                    <Signal className="w-4 h-4 text-cyan-500" />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{node.signal_rssi !== null ? `${node.signal_rssi}/31 CSQ` : '—'}</span>
                  </div>

                  <div className="flex items-center space-x-1" title="Última transmisión recibida">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {node.ultima_conexion ? new Date(node.ultima_conexion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-cyan-950/60">
                  <button
                    onClick={() => {
                      setMaintFilterNode(node.id_nodo);
                      setActiveView('maintenance');
                      fetchMaintenances();
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold transition-colors cursor-pointer"
                    title="Ver bitácora de intervenciones para esta estación"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Mantenimientos</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openCalibration(node)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 transition-colors cursor-pointer"
                      title="Calibrar Sensores y Aforo"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRegenerateKey(node.id_nodo)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 transition-colors cursor-pointer"
                      title="Regenerar API Key"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(node.id_nodo, node.nombre)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-cyan-950/60 dark:hover:bg-rose-950/50 border border-slate-300 dark:border-cyan-500/30 text-slate-700 hover:text-rose-600 dark:text-cyan-300 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar Estación"
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
  {/* VISTA 2: MANTENIMIENTOS & BITÁCORA DE CAMPO */}
  {/* ======================================================================= */}
  {activeView === 'maintenance' && (
    <div className="space-y-6">
      {/* Tarjetas KPI de Estado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="spatial-card p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Registros
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {maintKPIs.total}
            </span>
          </div>
        </div>

        <div className="spatial-card p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Programados
            </span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">
              {maintKPIs.programados}
            </span>
          </div>
        </div>

        <div className="spatial-card p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              En Ejecución
            </span>
            <span className="text-xl font-black text-teal-600 dark:text-teal-400">
              {maintKPIs.enEjecucion}
            </span>
          </div>
        </div>

        <div className="spatial-card p-4 flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Completados
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {maintKPIs.completados}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="spatial-card p-4 sm:p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={maintSearch}
              onChange={(e) => setMaintSearch(e.target.value)}
              placeholder="Buscar por técnico, descripción de trabajo, estación..."
              className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Botón de Nueva Orden */}
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchMaintenances}
              disabled={maintLoading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Recargar bitácora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${maintLoading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>

            <button
              onClick={() => openCreateMaintenance(maintFilterNode !== 'ALL' ? maintFilterNode : '')}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nueva Orden de Mantenimiento</span>
            </button>
          </div>
        </div>

        {/* Selectores de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 dark:border-cyan-900/40 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Filtrar por Estación:</label>
            <select
              value={maintFilterNode}
              onChange={(e) => setMaintFilterNode(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="ALL">Todas las Estaciones de la Red</option>
              {nodes.map(n => (
                <option key={n.id_nodo} value={n.id_nodo}>
                  {n.nombre} ({n.codigo_estacion || n.id_nodo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Filtrar por Estado:</label>
            <select
              value={maintFilterStatus}
              onChange={(e) => setMaintFilterStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PROGRAMADO">Programado (Pendiente)</option>
              <option value="EN_EJECUCION">En Ejecución</option>
              <option value="COMPLETADO">Completado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Filtrar por Tipo de Intervención:</label>
            <select
              value={maintFilterType}
              onChange={(e) => setMaintFilterType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
            >
              <option value="ALL">Todos los Tipos</option>
              <option value="PREVENTIVO">Mantenimiento Preventivo</option>
              <option value="CORRECTIVO">Mantenimiento Correctivo</option>
              <option value="CALIBRACION_SENSORES">Calibración de Sondas (pH/EC/Turb)</option>
              <option value="ACTUALIZACION_FIRMWARE">Actualización Firmware ESP32</option>
              <option value="LIMPIEZA_SONDAS">Limpieza y Desinfección</option>
              <option value="CAMBIO_BATERIA_SOLAR">Cambio Batería / Panel Solar</option>
              <option value="AFORO_REGLETAS">Aforo Molinete / Batimetría Regletas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Bitácora */}
      <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
        {maintLoading && maintenances.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">Cargando registros de mantenimiento...</p>
          </div>
        ) : filteredMaintenances.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              No se encontraron órdenes de mantenimiento
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No hay registros que coincidan con los filtros aplicados. Puedes registrar una nueva orden técnica.
            </p>
            <button
              onClick={() => openCreateMaintenance(maintFilterNode !== 'ALL' ? maintFilterNode : '')}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer inline-flex items-center space-x-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Programar Primera Tarea</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-[#061821] border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Estación / Nodo</th>
                  <th className="py-3 px-4 font-bold">Tipo & Categoría</th>
                  <th className="py-3 px-4 font-bold">Fecha Programada</th>
                  <th className="py-3 px-4 font-bold">Técnico Responsable</th>
                  <th className="py-3 px-4 font-bold">Descripción del Trabajo</th>
                  <th className="py-3 px-4 font-bold text-center">Estado</th>
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
                {filteredMaintenances.map((m) => (
                  <tr key={m.id_mantenimiento} className="hover:bg-slate-50/60 dark:hover:bg-cyan-950/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {m.nodo_nombre || 'Estación'}
                      </div>
                      <div className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400">
                        {m.codigo_estacion || m.id_nodo}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      <div>{getTipoBadge(m.tipo_mantenimiento)}</div>
                      <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 block">
                        Cat: {m.categoria}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      <div>
                        {m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : '—'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {m.fecha_programada ? new Date(m.fecha_programada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{m.tecnico_responsable}</span>
                      </div>
                      {m.costo_estimado > 0 && (
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                          S/. {m.costo_estimado.toFixed(2)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed font-medium">
                        {m.descripcion_trabajo}
                      </div>
                      {m.acciones_realizadas && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold line-clamp-1 mt-0.5">
                          ✓ {m.acciones_realizadas}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(m.estado_mantenimiento)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditMaintenance(m)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-cyan-300 transition-colors cursor-pointer"
                          title="Editar o Actualizar Estado"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaintenance(m.id_mantenimiento, m.descripcion_trabajo)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Archivar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

  {/* Modal de Mantenimiento (Crear / Editar) */}
  {maintModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-cyan-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {maintModalMode === 'create' ? 'Programar Orden de Mantenimiento' : 'Editar / Concluir Intervención Técnica'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setMaintModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveMaintenance} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
                Estación Asignada *
              </label>
              <select
                required
                value={maintForm.id_nodo}
                onChange={(e) => setMaintForm({ ...maintForm, id_nodo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
              >
                <option value="">Seleccione estación...</option>
                {nodes.map(n => (
                  <option key={n.id_nodo} value={n.id_nodo}>
                    {n.nombre} ({n.codigo_estacion || n.id_nodo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
                Tipo de Mantenimiento *
              </label>
              <select
                value={maintForm.tipo_mantenimiento}
                onChange={(e) => setMaintForm({ ...maintForm, tipo_mantenimiento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
              >
                <option value="PREVENTIVO">Mantenimiento Preventivo Periódico</option>
                <option value="CORRECTIVO">Mantenimiento Correctivo por Falla</option>
                <option value="CALIBRACION_SENSORES">Calibración de Sondas (pH/EC/Turb)</option>
                <option value="ACTUALIZACION_FIRMWARE">Actualización de Firmware ESP32</option>
                <option value="LIMPIEZA_SONDAS">Limpieza y Desincrustación Óptica</option>
                <option value="CAMBIO_BATERIA_SOLAR">Reemplazo Batería / Panel Solar 12V</option>
                <option value="AFORO_REGLETAS">Aforo con Molinete & Nivel de Regleta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
                Categoría *
              </label>
              <select
                value={maintForm.categoria}
                onChange={(e) => setMaintForm({ ...maintForm, categoria: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-cyan-500"
              >
                <option value="FISICO">Físico (Estructura / Batería / Sensores)</option>
                <option value="LOGICO">Lógico (Firmware / Conectividad GSM)</option>
                <option value="HIDRAULICO">Hidráulico (Aforo / Sección Cauce)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
                Estado de la Orden *
              </label>
              <select
                value={maintForm.estado_mantenimiento}
                onChange={(e) => setMaintForm({ ...maintForm, estado_mantenimiento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-cyan-500"
              >
                <option value="PROGRAMADO">📅 PROGRAMADO</option>
                <option value="EN_EJECUCION">⚡ EN EJECUCIÓN</option>
                <option value="COMPLETADO">✅ COMPLETADO</option>
                <option value="CANCELADO">⛔ CANCELADO</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
                Costo Estimado (S/.)
              </label>
              <input
                type="number"
                step="0.1"
                value={maintForm.costo_estimado}
                onChange={(e) => setMaintForm({ ...maintForm, costo_estimado: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
                Fecha y Hora Programada *
              </label>
              <input
                type="datetime-local"
                required
                value={maintForm.fecha_programada}
                onChange={(e) => setMaintForm({ ...maintForm, fecha_programada: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
                Fecha y Hora de Ejecución Real (Opcional)
              </label>
              <input
                type="datetime-local"
                value={maintForm.fecha_ejecucion}
                onChange={(e) => setMaintForm({ ...maintForm, fecha_ejecucion: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
              Técnico Responsable *
            </label>
            <input
              type="text"
              required
              value={maintForm.tecnico_responsable}
              onChange={(e) => setMaintForm({ ...maintForm, tecnico_responsable: e.target.value })}
              placeholder="Ej: Ing. Jorge Rivas (Especialista en Hardware)"
              className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-cyan-200/80 font-bold mb-1">
              Descripción del Trabajo Requerido *
            </label>
            <textarea
              required
              rows={2}
              value={maintForm.descripcion_trabajo}
              onChange={(e) => setMaintForm({ ...maintForm, descripcion_trabajo: e.target.value })}
              placeholder="Detallar la razón de la intervención, síntomas reportados o rutina de calibración programada..."
              className="w-full bg-slate-50 dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Campos extendidos de ejecución */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-3">
            <div className="text-[11px] font-bold text-slate-700 dark:text-cyan-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-500" />
              <span>Detalles de Ejecución de Campo & Repuestos (Opcional / Cierre)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 text-[10px]">
                  Diagnóstico Inicial en Sitio
                </label>
                <textarea
                  rows={2}
                  value={maintForm.diagnostico_inicial}
                  onChange={(e) => setMaintForm({ ...maintForm, diagnostico_inicial: e.target.value })}
                  placeholder="Ej: Sonda de pH con sarro biológico acumulado..."
                  className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 text-[10px]">
                  Acciones y Soluciones Realizadas
                </label>
                <textarea
                  rows={2}
                  value={maintForm.acciones_realizadas}
                  onChange={(e) => setMaintForm({ ...maintForm, acciones_realizadas: e.target.value })}
                  placeholder="Ej: Limpieza con solución HCl 0.1M y recalibración con buffer 7.0/4.0..."
                  className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 text-[10px]">
                  Repuestos / Insumos Utilizados
                </label>
                <input
                  type="text"
                  value={maintForm.repuestos_utilizados}
                  onChange={(e) => setMaintForm({ ...maintForm, repuestos_utilizados: e.target.value })}
                  placeholder="ej: Buffer pH 7.0, Batería 12V"
                  className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 text-[10px]">
                  Firmware Instalado (Nuevo)
                </label>
                <input
                  type="text"
                  value={maintForm.firmware_version_instalada}
                  onChange={(e) => setMaintForm({ ...maintForm, firmware_version_instalada: e.target.value })}
                  placeholder="ej: v2.4.1-ota"
                  className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-bold mb-1 text-[10px]">
                  Observaciones de Seguridad
                </label>
                <input
                  type="text"
                  value={maintForm.observaciones}
                  onChange={(e) => setMaintForm({ ...maintForm, observaciones: e.target.value })}
                  placeholder="ej: Gabinete hermético sellado"
                  className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-2 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Botones del Modal */}
          <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-200 dark:border-cyan-900/60">
            <button
              type="button"
              onClick={() => setMaintModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={maintSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black shadow-md cursor-pointer flex items-center space-x-1.5"
            >
              {maintSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{maintSaving ? 'Guardando...' : (maintModalMode === 'create' ? 'Crear Orden' : 'Actualizar Intervención')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

      {/* Modal de Calibración de Sensores y Aforo */}
      {calibModalNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-cyan-500" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Calibración de Sondas & Aforador
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Estación: <strong className="text-slate-900 dark:text-cyan-300 font-mono">{calibModalNode.id_nodo}</strong> — {calibModalNode.nombre}
                </p>
              </div>

              {/* Presets Rápidos */}
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCalibForm(prev => ({
                      ...prev,
                      ph_offset_v: 2.5000,
                      ph_slope: -0.1800,
                      tds_factor_k: 0.5000,
                      tds_offset_v: 0.0000,
                      turb_v_clear: 4.2000,
                      turb_v_turbid: 2.5000
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-cyan-950 text-slate-700 dark:text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Estándar Lab
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalibForm(prev => ({
                      ...prev,
                      ph_offset_v: 2.4800,
                      ph_slope: -0.1840,
                      tds_factor_k: 0.5000,
                      tds_offset_v: 0.0000,
                      turb_v_clear: 4.2000,
                      turb_v_turbid: 2.4000
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-cyan-950 text-slate-700 dark:text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Valle Chancay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalibForm(prev => ({
                      ...prev,
                      ph_offset_v: 2.5000,
                      ph_slope: -0.1800,
                      tds_factor_k: 0.5000,
                      tds_offset_v: 0.0000,
                      turb_v_clear: 4.2500,
                      turb_v_turbid: 2.5000
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-cyan-950 text-slate-700 dark:text-cyan-300 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Alta Cabecera
                </button>
              </div>
            </div>

            {calibLoading ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">Consultando calibración activa...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveCalibration} className="space-y-4">
                {calibSuccess && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-pulse">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>¡Calibración guardada y aplicada exitosamente para la estación!</span>
                  </div>
                )}

                {/* Sondas Analógicas */}
                <div className="grid sm:grid-cols-3 gap-3">
                  {/* pH */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Sonda pH (PH-4502C)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold">ADC1_CH4</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Offset pH 7.0 (V)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.ph_offset_v}
                        onChange={e => setCalibForm({ ...calibForm, ph_offset_v: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Slope (V/pH)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.ph_slope}
                        onChange={e => setCalibForm({ ...calibForm, ph_slope: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                  </div>

                  {/* Salinidad */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Salinidad (Keyestudio)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold">ADC1_CH6</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Factor Conversión K</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.tds_factor_k}
                        onChange={e => setCalibForm({ ...calibForm, tds_factor_k: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Offset en Seco (V)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.tds_offset_v}
                        onChange={e => setCalibForm({ ...calibForm, tds_offset_v: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                  </div>

                  {/* Turbidez */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Turbidez (TS-300B)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-mono font-bold">ADC1_CH7</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">V Clara (0 NTU)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.turb_v_clear}
                        onChange={e => setCalibForm({ ...calibForm, turb_v_clear: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">V Turbia (100 NTU)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.turb_v_turbid}
                        onChange={e => setCalibForm({ ...calibForm, turb_v_turbid: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Aforo Hidráulico y Ultrasonido */}
                <div className="p-4 bg-slate-50 dark:bg-[#061821] rounded-2xl border border-slate-200 dark:border-cyan-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">Aforador Hidráulico & Sensor Ultrasónico JSN-SR04T (Q = K · hᴺ)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 font-mono font-bold">GPIO32/33</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Distancia Sensor-Fondo (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={calibForm.distancia_fondo_sensor_cm}
                        onChange={e => setCalibForm({ ...calibForm, distancia_fondo_sensor_cm: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Coeficiente Caudal K</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.caudal_coef_k}
                        onChange={e => setCalibForm({ ...calibForm, caudal_coef_k: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Exponente Caudal N</label>
                      <input
                        type="number"
                        step="0.001"
                        value={calibForm.caudal_exp_n}
                        onChange={e => setCalibForm({ ...calibForm, caudal_exp_n: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg p-1.5 font-mono text-xs font-bold text-slate-900 dark:text-cyan-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Calibrador & Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Técnico / Responsable:</label>
                    <input
                      type="text"
                      value={calibForm.calibrado_por}
                      onChange={e => setCalibForm({ ...calibForm, calibrado_por: e.target.value })}
                      placeholder="ej: Juan Pérez (Ing. Hidráulico)"
                      className="bg-white dark:bg-[#03131c] border border-slate-300 dark:border-cyan-900/60 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="flex items-center space-x-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setCalibModalNode(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={calibSaving}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      {calibSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{calibSaving ? 'Guardando...' : 'Aplicar Calibración'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de API Key Regenerada */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#072433] border border-slate-300 dark:border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-cyan-900/60 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-cyan-500" />
                <span>Nueva API Key Generada</span>
              </h3>
              <button
                onClick={() => copyToClipboard(apiKeyModal.cpp_config_snippet)}
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Snippet'}</span>
              </button>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 text-xs">
              Se ha emitido una nueva credencial para la estación <strong className="text-slate-900 dark:text-cyan-300 font-mono">{apiKeyModal.id_nodo}</strong>. Reemplázala en <code className="text-cyan-600 dark:text-cyan-400 font-mono font-bold bg-slate-100 dark:bg-[#03131c] px-1.5 py-0.5 rounded">firmware/include/config.h</code> del ESP32.
            </p>
            
            <pre className="font-mono text-xs text-cyan-300 bg-[#03131c] p-4 rounded-xl border border-cyan-900/60 overflow-x-auto">
              {apiKeyModal.cpp_config_snippet}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setApiKeyModal(null)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-md cursor-pointer"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
