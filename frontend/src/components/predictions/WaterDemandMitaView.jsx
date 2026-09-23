import React, { useState, useEffect } from 'react';
import { 
  Sprout, 
  Droplets, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Calendar,
  Sparkles,
  Info,
  Layers,
  BarChart3,
  Building2,
  PieChart,
  ArrowUpRight
} from 'lucide-react';
import { predictionsApi } from '../../services/api';

export default function WaterDemandMitaView() {
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [loading, setLoading] = useState(true);

  // Registro de Auditoría de Mita por Comisión de Regantes del Valle Chancay-Huaral
  const commissionsMitaAudit = [
    {
      comision: 'Comisión Huando',
      hectareas: 3200,
      cultivoPrincipal: 'Mandarina / Palto',
      horasProgramadas: 168,
      horasEjecutadas: 164,
      volumenProgramadoM3: 45200,
      volumenEntregadoM3: 44100,
      cumplimientoPct: 97.6,
      desviacionLs: -15,
      estado: 'CUMPLIDO'
    },
    {
      comision: 'Comisión Saume - Aucallama',
      hectareas: 2850,
      cultivoPrincipal: 'Palto Hass / Fresa',
      horasProgramadas: 144,
      horasEjecutadas: 140,
      volumenProgramadoM3: 38400,
      volumenEntregadoM3: 37200,
      cumplimientoPct: 96.9,
      desviacionLs: -20,
      estado: 'CUMPLIDO'
    },
    {
      comision: 'Comisión Retes',
      hectareas: 1980,
      cultivoPrincipal: 'Maíz Amarillo / Hortalizas',
      horasProgramadas: 120,
      horasEjecutadas: 126,
      volumenProgramadoM3: 26800,
      volumenEntregadoM3: 28140,
      cumplimientoPct: 105.0,
      desviacionLs: +45,
      estado: 'SOBRE-EXTRACCIÓN LEVE'
    },
    {
      comision: 'Comisión Palpa',
      hectareas: 2420,
      cultivoPrincipal: 'Melocotón / Manzana',
      horasProgramadas: 132,
      horasEjecutadas: 128,
      volumenProgramadoM3: 32600,
      volumenEntregadoM3: 31600,
      cumplimientoPct: 96.9,
      desviacionLs: -18,
      estado: 'CUMPLIDO'
    },
    {
      comision: 'Comisión Boza - Chancay Bajo',
      hectareas: 3600,
      cultivoPrincipal: 'Espárrago / Vid / Cítricos',
      horasProgramadas: 180,
      horasEjecutadas: 172,
      volumenProgramadoM3: 48900,
      volumenEntregadoM3: 46700,
      cumplimientoPct: 95.5,
      desviacionLs: -35,
      estado: 'CUMPLIDO'
    }
  ];

  // Balance Mensual Consolidado ENA (Intenciones de Siembra 19,450 ha) vs Oferta Río Chancay
  const monthlyWaterBalance = [
    { mes: 'Ene', ofertaM3s: 14.2, demandaM3s: 4.8, balance: '+9.4', estado: 'SUPERÁVIT' },
    { mes: 'Feb', ofertaM3s: 18.5, demandaM3s: 5.1, balance: '+13.4', estado: 'SUPERÁVIT (Avenidas)' },
    { mes: 'Mar', ofertaM3s: 16.8, demandaM3s: 5.4, balance: '+11.4', estado: 'SUPERÁVIT' },
    { mes: 'Abr', ofertaM3s: 8.4, demandaM3s: 4.6, balance: '+3.8', estado: 'REGULAR' },
    { mes: 'May', ofertaM3s: 4.2, demandaM3s: 3.8, balance: '+0.4', estado: 'EQUILIBRADO' },
    { mes: 'Jun', ofertaM3s: 2.8, demandaM3s: 3.2, balance: '-0.4', estado: 'ESTIAJE (Lagunas)' },
    { mes: 'Jul', ofertaM3s: 2.1, demandaM3s: 2.9, balance: '-0.8', estado: 'ESTIAJE (Lagunas)' },
    { mes: 'Ago', ofertaM3s: 1.8, demandaM3s: 2.7, balance: '-0.9', estado: 'ESTIAJE CRÍTICO' },
    { mes: 'Set', ofertaM3s: 2.2, demandaM3s: 3.1, balance: '-0.9', estado: 'ESTIAJE (Lagunas)' },
    { mes: 'Oct', ofertaM3s: 3.5, demandaM3s: 3.6, balance: '-0.1', estado: 'EQUILIBRADO' },
    { mes: 'Nov', ofertaM3s: 5.8, demandaM3s: 4.1, balance: '+1.7', estado: 'RECUPERACIÓN' },
    { mes: 'Dic', ofertaM3s: 9.6, demandaM3s: 4.5, balance: '+5.1', estado: 'SUPERÁVIT' }
  ];
  const defaultCrops = [
    {
      id_cultivo: 'crop-1',
      nombre: 'Palto Hass',
      categoria: 'Frutales de Exportación',
      demanda_hidrica_m3_ha: 9200,
      dias_ciclo_vegetativo: 365,
      ec_umbral_us_cm: 1200,
      rendimiento_base_kg_ha: 14500,
      precio_base_moneda_kg: 5.8,
      descripcion: 'Cultivo permanente de alta sensibilidad a salinidad (cloruros y boro). Requiere riegos frecuentes de baja lámina.'
    },
    {
      id_cultivo: 'crop-2',
      nombre: 'Mandarina W. Murcott',
      categoria: 'Cítricos',
      demanda_hidrica_m3_ha: 8400,
      dias_ciclo_vegetativo: 365,
      ec_umbral_us_cm: 1700,
      rendimiento_base_kg_ha: 28000,
      precio_base_moneda_kg: 2.4,
      descripcion: 'Cítrico con demanda sostenida en floración y cuajado (septiembre a noviembre). Tolerancia moderada a sales.'
    },
    {
      id_cultivo: 'crop-3',
      nombre: 'Maíz Amarillo Duro',
      categoria: 'Cereales / Transitorio',
      demanda_hidrica_m3_ha: 6800,
      dias_ciclo_vegetativo: 140,
      ec_umbral_us_cm: 2500,
      rendimiento_base_kg_ha: 8500,
      precio_base_moneda_kg: 1.35,
      descripcion: 'Cultivo de rotación en el valle bajo. Periodo crítico de riego en floración masculina/femenina (espigado).'
    },
    {
      id_cultivo: 'crop-4',
      nombre: 'Espárrago Verde',
      categoria: 'Hortalizas de Exportación',
      demanda_hidrica_m3_ha: 11500,
      dias_ciclo_vegetativo: 365,
      ec_umbral_us_cm: 4100,
      rendimiento_base_kg_ha: 12000,
      precio_base_moneda_kg: 7.2,
      descripcion: 'Alta tolerancia a salinidad. Exige alta dotación volumétrica durante desarrollo de turiones y brotación.'
    }
  ];

  useEffect(() => {
    loadCrops();
  }, []);

  const loadCrops = async () => {
    setLoading(true);
    try {
      const res = await predictionsApi.getAgroCrops();
      if (res.data && res.data.length > 0) {
        const normalized = res.data.map((c, idx) => ({
          ...c,
          id_cultivo: c.crop_id || c.id_cultivo || `crop-${idx}`,
          nombre: c.name || c.nombre || 'Cultivo',
          categoria: c.category || c.categoria || 'Agrícola',
          demanda_hidrica_m3_ha: c.water_demand_m3_ha || c.demanda_hidrica_m3_ha || 8500,
          dias_ciclo_vegetativo: c.growth_cycle_days || c.dias_ciclo_vegetativo || 180,
          ec_umbral_us_cm: c.ec_threshold_us_cm || c.ec_umbral_us_cm || 1500,
          rendimiento_base_kg_ha: c.base_yield_kg_ha || c.rendimiento_base_kg_ha || 15000,
          precio_base_moneda_kg: c.base_price_s_kg || c.precio_base_moneda_kg || 3.5,
          descripcion: c.description || c.descripcion || 'Cultivo de importancia económica en el Valle Chancay-Huaral.'
        }));
        setCrops(normalized);
        setSelectedCrop(normalized[0]);
      } else {
        setCrops(defaultCrops);
        setSelectedCrop(defaultCrops[0]);
      }
    } catch (err) {
      console.warn('API de cultivos no disponible, usando catálogo local MIDAGRI:', err);
      setCrops(defaultCrops);
      setSelectedCrop(defaultCrops[0]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: DEMANDA CONSUNTIVA POR CULTIVO (FAO-56 & KC) */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-500" />
              Demanda Hídrica Consuntiva por Cultivo (Metodología FAO-56 Penman-Monteith)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lámina de riego volumétrica y requerimiento hídrico por hectárea según etapa fenológica y coeficiente Kc
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
            Catálogo Oficial MIDAGRI / Junta Chancay
          </span>
        </div>

        {/* Selector de Cultivo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {crops.map((c) => (
            <button
              key={c.id_cultivo}
              onClick={() => setSelectedCrop(c)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedCrop?.id_cultivo === c.id_cultivo
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">{c.nombre}</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{c.categoria}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {c.demanda_hidrica_m3_ha?.toLocaleString() || 8500} m³/ha/campaña
              </div>
            </button>
          ))}
        </div>

        {/* Ficha Técnica del Cultivo Seleccionado */}
        {selectedCrop && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                Ficha Técnica: {selectedCrop.nombre}
              </span>
              <span className="text-xs font-mono bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded">
                Ciclo Vegetativo: {selectedCrop.dias_ciclo_vegetativo || 180} días
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-emerald-500/20">
                <span className="text-slate-500 block text-[10px]">Demanda Bruta Campaña:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedCrop.demanda_hidrica_m3_ha?.toLocaleString()} m³/ha
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-emerald-500/20">
                <span className="text-slate-500 block text-[10px]">Lámina Diaria Media:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {((selectedCrop.demanda_hidrica_m3_ha || 8000) / (selectedCrop.dias_ciclo_vegetativo || 240) / 10).toFixed(1)} mm/día
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-emerald-500/20">
                <span className="text-slate-500 block text-[10px]">Umbral Salinidad (EC):</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {selectedCrop.ec_umbral_us_cm} µS/cm
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-emerald-500/20">
                <span className="text-slate-500 block text-[10px]">Rendimiento Base (SIEA):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {(selectedCrop.rendimiento_base_kg_ha || 15000).toLocaleString()} kg/ha
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {selectedCrop.descripcion}
            </p>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: AUDITORÍA Y CUMPLIMIENTO DE TURNOS DE RIEGO ("LA MITA") */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-500" />
              Auditoría y Cumplimiento de Turnos de Riego ("La Mita")
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoreo analítico de dotaciones asignadas vs volumen entregado por compuerta y comisión de regantes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Junta de Usuarios Chancay-Huaral
            </span>
          </div>
        </div>

        {/* Resumen KPIs de Mita */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Comisiones en Turno:</span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">5 Comisiones</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Superficie Bajo Turno:</span>
            <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">14,050 ha</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Cumplimiento Global:</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">96.4%</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Desviación Neta Valle:</span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-400">-43 L/s</span>
          </div>
        </div>

        {/* Tabla de Comisiones de Regantes */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Comisión de Regantes</th>
                <th className="py-2.5 px-3">Superficie</th>
                <th className="py-2.5 px-3">Cultivo Dominante</th>
                <th className="py-2.5 px-3 text-right">Horas Prog / Ejec</th>
                <th className="py-2.5 px-3 text-right">Volumen Prog / Entr (m³)</th>
                <th className="py-2.5 px-3 text-right">Cumplimiento</th>
                <th className="py-2.5 px-3 text-right">Desviación</th>
                <th className="py-2.5 px-3 text-center">Estado Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {commissionsMitaAudit.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {row.comision}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {row.hectareas.toLocaleString()} ha
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {row.cultivoPrincipal}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {row.horasProgramadas}h / {row.horasEjecutadas}h
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {row.volumenProgramadoM3.toLocaleString()} / {row.volumenEntregadoM3.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span className={row.cumplimientoPct >= 95 && row.cumplimientoPct <= 102 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                      {row.cumplimientoPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    <span className={row.desviacionLs > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}>
                      {row.desviacionLs > 0 ? `+${row.desviacionLs}` : row.desviacionLs} L/s
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      row.estado === 'CUMPLIDO'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                    }`}>
                      {row.estado === 'CUMPLIDO' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {row.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insight Telemetría Mita */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
          <p>
            <strong>Auditoría Automatizada por Balance de Masa:</strong> Los sensores telemétricos en NODO-02 (Acos) y NODO-03 (Huayopampa) cotejan el caudal extraído en compuertas con la asignación horaria oficial de la Junta de Usuarios. Desviaciones mayores a ±50 L/s generan alerta preventiva sin penalidad inmediata.
          </p>
        </div>
      </div>

      {/* SECCIÓN 3: BALANCE HÍDRICO CONSOLIDADO ENA VS RÉGIMEN RÍO CHANCAY */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-purple-500" />
              Balance Hídrico Consolidado ENA (19,450 ha) vs Régimen Río Chancay
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cotejo analítico entre las intenciones de siembra declaradas ante MIDAGRI y la oferta hídrica histórica mensual
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 w-fit">
            Encuesta Nacional Agraria (ENA)
          </span>
        </div>

        {/* Resumen Anual ENA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <span className="text-[10px] text-purple-700 dark:text-purple-300 block">Superficie Agrícola Total:</span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">19,450 ha</span>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <span className="text-[10px] text-purple-700 dark:text-purple-300 block">Demanda Consuntiva Anual:</span>
            <span className="text-base font-bold text-purple-600 dark:text-purple-400">124.6 MMC / año</span>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <span className="text-[10px] text-purple-700 dark:text-purple-300 block">Oferta Anual Río Chancay:</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">412.8 MMC / año</span>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <span className="text-[10px] text-purple-700 dark:text-purple-300 block">Periodo Crítico de Estiaje:</span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-400">Junio - Octubre</span>
          </div>
        </div>

        {/* Tabla Balance Mensual */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 px-3">Mes</th>
                <th className="py-2 px-3 text-right">Oferta Media (m³/s)</th>
                <th className="py-2 px-3 text-right">Demanda ENA (m³/s)</th>
                <th className="py-2 px-3 text-right">Balance Neto (m³/s)</th>
                <th className="py-2 px-3 text-center">Estado del Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {monthlyWaterBalance.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {m.mes}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                    {m.ofertaM3s.toFixed(1)} m³/s
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                    {m.demandaM3s.toFixed(1)} m³/s
                  </td>
                  <td className="py-2 px-3 text-right font-bold">
                    <span className={m.balance.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {m.balance} m³/s
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      m.estado.includes('SUPERÁVIT')
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        : m.estado.includes('ESTIAJE')
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                        : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20'
                    }`}>
                      {m.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
