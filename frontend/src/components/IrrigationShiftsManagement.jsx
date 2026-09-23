import React, { useState, useEffect } from 'react';
import { 
  CalendarRange, Droplets, Clock, CheckCircle2, AlertTriangle, 
  XCircle, Plus, Search, Filter, RefreshCw, ArrowRight, ShieldCheck,
  Building2, UserCheck, Activity, ChevronRight, Gauge
} from 'lucide-react';
import { irrigationApi, alertsApi, governanceApi, nodesApi } from '../services/api';

export default function IrrigationShiftsManagement() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [entities, setEntities] = useState([]);
  const [nodes, setNodes] = useState([]);

  const [formData, setFormData] = useState({
    id_entidad: '',
    id_destinatario: '',
    id_nodo_aguas_arriba: '',
    id_nodo_aguas_abajo: '',
    id_nodo_bocatoma: '',
    fecha_inicio_programada: new Date().toISOString().slice(0, 16),
    horas_programadas: 4.0,
    caudal_acordado_ls: 150.0,
    observaciones: ''
  });

  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cargar datos principales
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [shiftsRes, recRes, entRes, topoRes] = await Promise.all([
        irrigationApi.getShifts(),
        alertsApi.getRecipients().catch(() => ({ data: [] })),
        governanceApi.getEntities().catch(() => ({ data: [] })),
        nodesApi.getTopology().catch(() => ({ data: { nodos: [] } }))
      ]);

      setShifts(shiftsRes.data || []);
      setRecipients(recRes.data || []);
      setEntities(entRes.data || []);
      
      const nodeList = topoRes.data?.nodos || topoRes.data || [];
      setNodes(nodeList);

      if (nodeList.length >= 2 && !formData.id_nodo_aguas_arriba) {
        setFormData(prev => ({
          ...prev,
          id_nodo_aguas_arriba: nodeList[0]?.id_nodo || '',
          id_nodo_bocatoma: nodeList[1]?.id_nodo || '',
          id_nodo_aguas_abajo: nodeList[Math.min(2, nodeList.length - 1)]?.id_nodo || ''
        }));
      }
      if (entRes.data?.length > 0 && !formData.id_entidad) {
        setFormData(prev => ({ ...prev, id_entidad: entRes.data[0]?.id_entidad || '' }));
      }
      if (recRes.data?.length > 0 && !formData.id_destinatario) {
        setFormData(prev => ({ ...prev, id_destinatario: recRes.data[0]?.id_destinatario || '' }));
      }
    } catch (err) {
      setError('Error al consultar el servicio de turnos de riego y mita hidráulica.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Simular impacto hidráulico del tramo cuando cambian los nodos o el caudal
  const handleSimulateImpact = async () => {
    if (!formData.id_nodo_aguas_arriba || !formData.id_nodo_aguas_abajo || !formData.caudal_acordado_ls) return;
    setSimulating(true);
    try {
      const res = await irrigationApi.simulateReachImpact({
        id_nodo_aguas_arriba: formData.id_nodo_aguas_arriba,
        id_nodo_aguas_abajo: formData.id_nodo_aguas_abajo,
        caudal_captacion_ls: parseFloat(formData.caudal_acordado_ls),
        duracion_horas: parseFloat(formData.horas_programadas)
      });
      setSimulationResult(res.data);
    } catch (err) {
      console.warn('No se pudo simular impacto hidráulico:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!formData.id_entidad || !formData.id_destinatario) {
      alert('Seleccione la entidad gestora y el regante destinatario.');
      return;
    }
    setSubmitting(true);
    try {
      const startDt = new Date(formData.fecha_inicio_programada);
      const endDt = new Date(startDt.getTime() + formData.horas_programadas * 3600 * 1000);

      const payload = {
        id_entidad: formData.id_entidad,
        id_destinatario: formData.id_destinatario,
        id_nodo_aguas_arriba: formData.id_nodo_aguas_arriba,
        id_nodo_aguas_abajo: formData.id_nodo_aguas_abajo,
        id_nodo_bocatoma: formData.id_nodo_bocatoma,
        fecha_inicio_programada: startDt.toISOString(),
        fecha_fin_programada: endDt.toISOString(),
        horas_programadas: parseFloat(formData.horas_programadas),
        caudal_acordado_ls: parseFloat(formData.caudal_acordado_ls),
        observaciones: formData.observaciones
      };

      await irrigationApi.createShift(payload);
      setShowModal(false);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al programar el turno de riego.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (idTurno, newStatus) => {
    let volReal = null;
    if (newStatus === 'COMPLETADO_EXITOSO') {
      const shift = shifts.find(s => s.id_turno === idTurno);
      const promptVal = window.prompt(
        'Ingrese el volumen real entregado en m³:', 
        shift?.volumen_programado_m3?.toFixed(1) || '2160'
      );
      if (promptVal === null) return;
      volReal = parseFloat(promptVal) || shift?.volumen_programado_m3 || 0;
    }

    try {
      await irrigationApi.updateShiftStatus(idTurno, newStatus, volReal);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo actualizar el estado del turno.');
    }
  };

  const filteredShifts = shifts.filter(s => {
    const matchesStatus = filterStatus === 'ALL' || s.estado_turno === filterStatus;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (s.nombre_regante && s.nombre_regante.toLowerCase().includes(term)) ||
      (s.nombre_entidad && s.nombre_entidad.toLowerCase().includes(term)) ||
      (s.nombre_nodo_bocatoma && s.nombre_nodo_bocatoma.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (st) => {
    switch (st) {
      case 'PROGRAMADO':
        return <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold">PROGRAMADO</span>;
      case 'EN_EJECUCION':
        return <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold animate-pulse">EN EJECUCIÓN</span>;
      case 'COMPLETADO_EXITOSO':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">COMPLETADO</span>;
      case 'DEFICIT_VOLUMEN':
        return <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">DÉFICIT VOLUMEN</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">{st}</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200">
      
      {/* Header y Acciones Rápidas */}
      <div className="spatial-card p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 font-mono text-xs uppercase tracking-wider">
            <CalendarRange className="w-4 h-4" />
            <span>Módulo de Asignación & Mita Hidráulica</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Turnos de Riego y Control de Bocatomas</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Supervisión hidrométrica de derivaciones agrícolas con cálculo en tiempo real de afectación al caudal ecológico tramo a tramo.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
          
          <button
            onClick={() => {
              setShowModal(true);
              handleSimulateImpact();
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Programar Turno de Riego</span>
          </button>
        </div>
      </div>

      {/* Filtros de Búsqueda y Estado */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por regante, entidad o bocatoma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#051520] border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono shadow-xs"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {['ALL', 'PROGRAMADO', 'EN_EJECUCION', 'COMPLETADO_EXITOSO'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterStatus === st
                  ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-bold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'Todos' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla SCADA de Turnos */}
      <div className="spatial-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-[#030d14] text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Regante / Entidad</th>
                <th className="py-3 px-4">Bocatoma & Tramo Fluvial</th>
                <th className="py-3 px-4">Horas / Caudal</th>
                <th className="py-3 px-4">Volumen Prog vs Real</th>
                <th className="py-3 px-4">Impacto Tramo</th>
                <th className="py-3 px-4 text-right">Acciones SCADA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && shifts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-500 mb-2" />
                    <span>Cargando turnos de riego y mita hidráulica...</span>
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <Droplets className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No hay turnos registrados en este estado</p>
                    <p className="text-[11px] text-slate-500 mt-1">Utilice el botón "+ Programar Turno de Riego" para dar de alta una entrega.</p>
                  </td>
                </tr>
              ) : (
                filteredShifts.map((s) => (
                  <tr key={s.id_turno} className="hover:bg-slate-50/70 dark:hover:bg-cyan-950/20 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(s.estado_turno)}
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        {new Date(s.fecha_inicio_programada).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{s.nombre_regante || 'Regante Registrado'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{s.nombre_entidad || 'Junta de Usuarios'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-cyan-700 dark:text-cyan-300">
                        {s.nombre_nodo_bocatoma || 'Compuerta Mecánica'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                        <span>{s.nombre_nodo_arriba || 'Cabecera'}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                        <span>{s.nombre_nodo_abajo || 'Valle'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{s.horas_programadas} hrs</span>
                      </div>
                      <div className="text-[11px] text-cyan-700 dark:text-cyan-400 font-mono mt-0.5">
                        {s.caudal_acordado_ls} L/s ({(s.caudal_acordado_ls / 1000).toFixed(2)} m³/s)
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-900 dark:text-white font-bold">
                        {s.volumen_programado_m3?.toLocaleString() || '0'} m³
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Real: <span className={s.volumen_real_entregado_m3 > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-slate-500'}>
                          {s.volumen_real_entregado_m3 > 0 ? `${s.volumen_real_entregado_m3.toLocaleString()} m³` : 'En espera'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-bold ${
                          s.balance_impacto_tramo_pct > 30 ? 'text-rose-600 dark:text-rose-400' :
                          s.balance_impacto_tramo_pct > 15 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          -{s.balance_impacto_tramo_pct?.toFixed(1) || 0}%
                        </span>
                        <span className="text-[10px] text-slate-500">del caudal fluvial</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      {s.estado_turno === 'PROGRAMADO' && (
                        <button
                          onClick={() => handleUpdateStatus(s.id_turno, 'EN_EJECUCION')}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-lg transition-all cursor-pointer shadow-xs"
                        >
                          Iniciar Mita
                        </button>
                      )}
                      {s.estado_turno === 'EN_EJECUCION' && (
                        <button
                          onClick={() => handleUpdateStatus(s.id_turno, 'COMPLETADO_EXITOSO')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer shadow-xs"
                        >
                          Confirmar Entrega
                        </button>
                      )}
                      {s.estado_turno !== 'COMPLETADO_EXITOSO' && s.estado_turno !== 'CANCELADO_ADMIN' && (
                        <button
                          onClick={() => handleUpdateStatus(s.id_turno, 'CANCELADO_ADMIN')}
                          className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950 dark:text-slate-400 dark:hover:text-rose-300 text-[10px] rounded-lg transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Programación de Turno de Riego */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#051520] border border-slate-300 dark:border-cyan-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <CalendarRange className="w-5 h-5 text-cyan-500" />
                  <span>Programar Nuevo Turno de Riego</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Asignación formal de mita con validación hidráulica previa.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShift} className="space-y-4 text-xs font-mono">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">ENTIDAD EMISORA *</label>
                  <select
                    value={formData.id_entidad}
                    onChange={(e) => setFormData({ ...formData, id_entidad: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Seleccione Entidad</option>
                    {entities.map(e => (
                      <option key={e.id_entidad} value={e.id_entidad} className="bg-white dark:bg-[#051520] text-slate-900 dark:text-white">{e.nombre_entidad}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">REGANTE DESTINATARIO *</label>
                  <select
                    value={formData.id_destinatario}
                    onChange={(e) => setFormData({ ...formData, id_destinatario: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Seleccione Regante</option>
                    {recipients.map(r => (
                      <option key={r.id_destinatario} value={r.id_destinatario} className="bg-white dark:bg-[#051520] text-slate-900 dark:text-white">{r.nombres} {r.apellidos}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">NODO ARRIBA</label>
                  <select
                    value={formData.id_nodo_aguas_arriba}
                    onChange={(e) => {
                      setFormData({ ...formData, id_nodo_aguas_arriba: e.target.value });
                    }}
                    className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-900 dark:text-white text-[11px]"
                  >
                    {nodes.map(n => <option key={n.id_nodo} value={n.id_nodo} className="bg-white dark:bg-[#051520] text-slate-900 dark:text-white">{n.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">BOCATOMA</label>
                  <select
                    value={formData.id_nodo_bocatoma}
                    onChange={(e) => setFormData({ ...formData, id_nodo_bocatoma: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-900 dark:text-white text-[11px]"
                  >
                    {nodes.map(n => <option key={n.id_nodo} value={n.id_nodo} className="bg-white dark:bg-[#051520] text-slate-900 dark:text-white">{n.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">NODO ABAJO</label>
                  <select
                    value={formData.id_nodo_aguas_abajo}
                    onChange={(e) => setFormData({ ...formData, id_nodo_aguas_abajo: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-900 dark:text-white text-[11px]"
                  >
                    {nodes.map(n => <option key={n.id_nodo} value={n.id_nodo} className="bg-white dark:bg-[#051520] text-slate-900 dark:text-white">{n.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">FECHA & HORA</label>
                  <input
                    type="datetime-local"
                    value={formData.fecha_inicio_programada}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio_programada: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-900 dark:text-white text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">DURACIÓN (HRS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="48"
                    value={formData.horas_programadas}
                    onChange={(e) => setFormData({ ...formData, horas_programadas: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">CAUDAL (L/S)</label>
                  <input
                    type="number"
                    step="10"
                    min="10"
                    max="5000"
                    value={formData.caudal_acordado_ls}
                    onChange={(e) => setFormData({ ...formData, caudal_acordado_ls: parseFloat(e.target.value) || 10 })}
                    className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Botón de Pre-evaluación Hidráulica */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSimulateImpact}
                  disabled={simulating}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-cyan-700 dark:text-cyan-300 rounded-xl border border-cyan-500/30 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{simulating ? 'Simulando régimen hidráulico...' : 'Pre-evaluar Impacto en Caudal Ecológico'}</span>
                </button>
              </div>

              {/* Resultado de la Simulación */}
              {simulationResult && (
                <div className={`p-3.5 rounded-xl border ${
                  simulationResult.es_viable 
                    ? 'bg-cyan-500/10 dark:bg-cyan-950/40 border-cyan-500/40 text-cyan-900 dark:text-cyan-200' 
                    : 'bg-rose-500/10 dark:bg-rose-950/60 border-rose-500/50 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center justify-between mb-1 text-[11px] font-bold">
                    <span>{simulationResult.impacto_caudal_ecologico}</span>
                    <span>Reducción: {simulationResult.reduccion_caudal_tramo_pct}%</span>
                  </div>
                  <p className="text-[10px] opacity-90">{simulationResult.observacion_hidraulica}</p>
                  <div className="mt-2 pt-2 border-t border-cyan-500/20 dark:border-cyan-900/40 flex justify-between text-[10px] font-mono">
                    <span>Caudal Arriba: {simulationResult.caudal_arriba_actual_m3s} m³/s</span>
                    <span>Q Residual Abajo: {simulationResult.caudal_abajo_proyectado_m3s} m³/s</span>
                    <span>Volumen: {simulationResult.volumen_turno_m3} m³</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-bold">OBSERVACIONES / RESOLUCIÓN</label>
                <textarea
                  rows="2"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Ej: Turno nocturno aprobado por Comité de Regantes Sector Lateral 3"
                  className="w-full bg-slate-50 dark:bg-[#030d14] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 cursor-pointer shadow-md"
                >
                  {submitting ? 'Programando...' : 'Confirmar & Programar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
