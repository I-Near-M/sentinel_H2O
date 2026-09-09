import React, { useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';
import { 
  ShieldAlert, RefreshCw, Filter, Calendar, 
  FileText, Database, User, Code2, ChevronDown, ChevronRight
} from 'lucide-react';

export const AuditManagement = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filterAction, setFilterAction] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterAction) params.accion = filterAction;
      const res = await authApi.getAuditLogs(params);
      setLogs(res.data);
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filterAction]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado y Filtros */}
      <div className="spatial-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Trazabilidad Inmutable & Logs Forenses</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Auditoría Forense de Cuenca
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Registro cronológico inmutable de transacciones, recalibraciones, provisiones de estaciones y cambios de usuarios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-white dark:bg-[#061821] border border-slate-300 dark:border-cyan-900/60 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-cyan-200 focus:outline-none focus:border-cyan-500 shadow-sm cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">Todas las Acciones</option>
            <option value="LOGIN_SUCCESS" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">LOGIN_SUCCESS</option>
            <option value="CREATE_USER" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">CREATE_USER</option>
            <option value="UPDATE_USER" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">UPDATE_USER</option>
            <option value="PROVISION_NODE" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">PROVISION_NODE</option>
            <option value="UPDATE_CALIBRATION" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">UPDATE_CALIBRATION</option>
            <option value="CREATE_ENTITY" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">CREATE_ENTITY</option>
            <option value="UPDATE_ENTITY" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">UPDATE_ENTITY</option>
            <option value="BOOTSTRAP_ADMIN_CREATED" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">BOOTSTRAP_ADMIN_CREATED</option>
            <option value="UPDATE_SYSTEM_CONFIG" className="bg-white dark:bg-[#072433] text-slate-900 dark:text-white">UPDATE_SYSTEM_CONFIG</option>
          </select>
          <button
            onClick={fetchAuditLogs}
            disabled={loading}
            className="p-2.5 bg-slate-100 dark:bg-[#061821] hover:bg-slate-200 dark:hover:bg-cyan-950/60 border border-slate-300 dark:border-cyan-900/60 text-slate-700 dark:text-cyan-300 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Refrescar auditoría"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="spatial-card overflow-hidden border border-slate-200 dark:border-cyan-500/20 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#061e2b]/90 border-b border-slate-200 dark:border-cyan-500/20 text-slate-600 dark:text-cyan-200/80 uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-bold">Fecha / Hora</th>
                <th className="py-3.5 px-4 font-bold">Usuario Responsable</th>
                <th className="py-3.5 px-4 font-bold">Acción</th>
                <th className="py-3.5 px-4 font-bold">Tabla Afectada</th>
                <th className="py-3.5 px-4 font-bold">ID Registro</th>
                <th className="py-3.5 px-4 font-bold">IP Origen</th>
                <th className="py-3.5 px-4 font-bold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-cyan-900/40">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-500 dark:text-slate-400 font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-500" />
                    Consultando registros de auditoría forense...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No hay registros de auditoría que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id_audit}>
                    <tr className="hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {log.email_usuario || 'SISTEMA'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-500/30">
                          {log.accion}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {log.tabla_afectada}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {log.id_registro_afectado || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 dark:text-slate-500">
                        {log.ip_origen || '127.0.0.1'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {(log.valores_previos_json || log.valores_nuevos_json) ? (
                          <button
                            onClick={() => setSelectedLog(selectedLog === log.id_audit ? null : log.id_audit)}
                            className="p-1.5 bg-slate-100 dark:bg-cyan-950/60 hover:bg-slate-200 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Ver snapshot JSON"
                          >
                            {selectedLog === log.id_audit ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600 text-[10px] italic">Sin payload</span>
                        )}
                      </td>
                    </tr>
                    {selectedLog === log.id_audit && (
                      <tr className="bg-slate-50 dark:bg-[#061821]/90 border-t border-slate-200 dark:border-cyan-900/40">
                        <td colSpan="7" className="p-4 sm:p-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            {log.valores_previos_json && (
                              <div className="p-3.5 bg-white dark:bg-slate-950/80 border border-rose-200 dark:border-rose-500/30 rounded-xl shadow-sm">
                                <div className="text-rose-600 dark:text-rose-400 font-bold mb-1 flex items-center gap-1">
                                  <span>VALORES PREVIOS:</span>
                                </div>
                                <pre className="text-slate-700 dark:text-slate-300 text-[11px] overflow-x-auto">
                                  {JSON.stringify(log.valores_previos_json, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.valores_nuevos_json && (
                              <div className="p-3.5 bg-white dark:bg-slate-950/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl shadow-sm">
                                <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1 flex items-center gap-1">
                                  <span>VALORES NUEVOS:</span>
                                </div>
                                <pre className="text-slate-700 dark:text-slate-300 text-[11px] overflow-x-auto">
                                  {JSON.stringify(log.valores_nuevos_json, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
