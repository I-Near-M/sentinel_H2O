import React, { useState } from 'react';
import { 
  Sprout, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  BarChart3, 
  Info,
  Scale,
  Award,
  ChevronRight
} from 'lucide-react';

export default function CropSuitabilityEconomicView() {
  // Telemetría Observada de Calidad de Agua en los Nodos de Cuenca (Río Chancay)
  const stationsWaterQuality = [
    {
      nodo: 'NODO-01',
      estacion: 'Vichaycocha',
      cuenca: 'Cabecera (4,050 msnm)',
      ecUsCm: 410,
      ph: 7.20,
      turbidezNtu: 6.5,
      estadoCalidad: 'EXCELENTE',
      salinidad: 'Muy Baja'
    },
    {
      nodo: 'NODO-02',
      estacion: 'Acos',
      cuenca: 'Cuenca Media Alta (1,580 msnm)',
      ecUsCm: 680,
      ph: 7.42,
      turbidezNtu: 14.2,
      estadoCalidad: 'BUENA',
      salinidad: 'Baja'
    },
    {
      nodo: 'NODO-03',
      estacion: 'Huayopampa',
      cuenca: 'Valle Medio (1,850 msnm)',
      ecUsCm: 920,
      ph: 7.55,
      turbidezNtu: 21.0,
      estadoCalidad: 'APTA',
      salinidad: 'Moderada'
    },
    {
      nodo: 'NODO-110',
      estacion: 'Saume (Aucallama)',
      cuenca: 'Valle Bajo - Agrícola (240 msnm)',
      ecUsCm: 1380,
      ph: 7.78,
      turbidezNtu: 34.5,
      estadoCalidad: 'ALERTA SALINA',
      salinidad: 'Media-Alta'
    },
    {
      nodo: 'NODO-511',
      estacion: 'EMAPA Huaral',
      cuenca: 'Desembocadura / Costa (180 msnm)',
      ecUsCm: 1650,
      ph: 7.85,
      turbidezNtu: 42.0,
      estadoCalidad: 'RESTRINGIDA',
      salinidad: 'Alta'
    }
  ];

  // Matriz Maas-Hoffman de Vulnerabilidad a Salinidad & Exposición Financiera (SIEA - MIDAGRI)
  const cropsSuitability = [
    {
      id: 'palto',
      nombre: 'Palto Hass',
      categoria: 'Frutales de Exportación',
      hectareasValle: 5800,
      ecUmbralUsCm: 1200,
      sensibilidad: 'ALTA',
      pendientePerdidaPct: 16.0, // 16% por dS/m sobre el umbral
      retencionRendimientoPct: 91.2,
      rendimientoPotencialKgHa: 14500,
      rendimientoProyectadoKgHa: 13224,
      perdidaKgHa: 1276,
      precioSieaSkg: 5.80,
      perdidaEconomicaHaS: 7400,
      exposicionTotalValleS: 42920000,
      zonaCritica: 'Valle Bajo (Saume / Aucallama)',
      portainjertoRecomendado: 'Portainjerto Dusa / Antillano (Mayor exclusión de cloruros y sales)'
    },
    {
      id: 'fresa',
      nombre: 'Fresa Camarosa / San Andreas',
      categoria: 'Frutales Menores',
      hectareasValle: 1250,
      ecUmbralUsCm: 1000,
      sensibilidad: 'MUY ALTA',
      pendientePerdidaPct: 33.0,
      retencionRendimientoPct: 83.5,
      rendimientoPotencialKgHa: 22000,
      rendimientoProyectadoKgHa: 18370,
      perdidaKgHa: 3630,
      precioSieaSkg: 3.20,
      perdidaEconomicaHaS: 11616,
      exposicionTotalValleS: 14520000,
      zonaCritica: 'Aucallama / Boza',
      portainjertoRecomendado: 'Lavado periódico de bulbos de riego por goteo y enmiendas con yeso agrícola'
    },
    {
      id: 'mandarina',
      nombre: 'Mandarina W. Murcott',
      categoria: 'Cítricos',
      hectareasValle: 4600,
      ecUmbralUsCm: 1700,
      sensibilidad: 'MODERADA',
      pendientePerdidaPct: 13.0,
      retencionRendimientoPct: 98.4,
      rendimientoPotencialKgHa: 28000,
      rendimientoProyectadoKgHa: 27552,
      perdidaKgHa: 448,
      precioSieaSkg: 2.40,
      perdidaEconomicaHaS: 1075,
      exposicionTotalValleS: 4945000,
      zonaCritica: 'Chancay Bajo',
      portainjertoRecomendado: 'Patrón Mandarino Cleopatra o Citrumelo Swingle'
    },
    {
      id: 'maiz',
      nombre: 'Maíz Amarillo Duro',
      categoria: 'Cereales',
      hectareasValle: 3900,
      ecUmbralUsCm: 2500,
      sensibilidad: 'BAJA',
      pendientePerdidaPct: 12.0,
      retencionRendimientoPct: 100.0,
      rendimientoPotencialKgHa: 8500,
      rendimientoProyectadoKgHa: 8500,
      perdidaKgHa: 0,
      precioSieaSkg: 1.35,
      perdidaEconomicaHaS: 0,
      exposicionTotalValleS: 0,
      zonaCritica: 'Sin riesgo actual',
      portainjertoRecomendado: 'Variedad Dekalb 7088 / Marginal 28 (Alta tolerancia a salinidad)'
    },
    {
      id: 'esparrago',
      nombre: 'Espárrago Verde',
      categoria: 'Hortalizas de Exportación',
      hectareasValle: 1850,
      ecUmbralUsCm: 4100,
      sensibilidad: 'MUY BAJA (Halófito)',
      pendientePerdidaPct: 8.0,
      retencionRendimientoPct: 100.0,
      rendimientoPotencialKgHa: 12000,
      rendimientoProyectadoKgHa: 12000,
      perdidaKgHa: 0,
      precioSieaSkg: 7.20,
      perdidaEconomicaHaS: 0,
      exposicionTotalValleS: 0,
      zonaCritica: 'Sin riesgo actual',
      portainjertoRecomendado: 'UC-157 F1 (Ideal para suelos salinos y agua de pozo con alta conductividad)'
    }
  ];

  const [selectedCrop, setSelectedCrop] = useState(cropsSuitability[0]);

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: TELEMETRÍA DE CALIDAD DE AGUA OBSERVADA EN RÍO CHANCAY */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Calidad de Agua Observada en Cuenca Chancay-Huaral (Red Telemétrica)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gradiente longitudinal de salinidad (Conductividad Eléctrica), pH y turbidez desde la cordillera hasta la desembocadura
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
            Telemetría en Vivo (GSM 2G)
          </span>
        </div>

        {/* Tarjetas de Nodos Físico-Químicos */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {stationsWaterQuality.map((st) => (
            <div 
              key={st.nodo}
              className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                st.ecUsCm > 1400 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : st.ecUsCm > 1000 
                  ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{st.estacion}</span>
                <span className="text-[10px] font-mono font-semibold text-slate-500">{st.nodo}</span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{st.cuenca}</p>
              
              <div className="space-y-1 font-mono text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">EC:</span>
                  <span className={`font-bold ${st.ecUsCm > 1200 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {st.ecUsCm} µS/cm
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">pH:</span>
                  <span className="text-slate-700 dark:text-slate-300">{st.ph.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Turbidez:</span>
                  <span className="text-slate-700 dark:text-slate-300">{st.turbidezNtu} NTU</span>
                </div>
              </div>

              <div className="pt-1">
                <span className={`inline-block w-full text-center py-0.5 rounded text-[10px] font-bold ${
                  st.estadoCalidad === 'EXCELENTE'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : st.estadoCalidad === 'BUENA' || st.estadoCalidad === 'APTA'
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}>
                  {st.estadoCalidad}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 2: MATRIZ DE APTITUD AGRONÓMICA & VULNERABILIDAD MAAS-HOFFMAN */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-500" />
              Matriz de Aptitud Agronómica & Pérdida Económica Maas-Hoffman
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluación del estrés salino por cultivo, porcentaje de retención de cosecha y exposición financiera basada en precios SIEA
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 w-fit">
            Modelo Maas & Hoffman (1977)
          </span>
        </div>

        {/* Tabla Maas-Hoffman */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Cultivo Dominante</th>
                <th className="py-2.5 px-3">Superficie Valle</th>
                <th className="py-2.5 px-3 text-right">Umbral EC</th>
                <th className="py-2.5 px-3 text-right">Retención Cosecha</th>
                <th className="py-2.5 px-3 text-right">Merma Estimada</th>
                <th className="py-2.5 px-3 text-right">Precio SIEA</th>
                <th className="py-2.5 px-3 text-right">Pérdida / ha</th>
                <th className="py-2.5 px-3 text-right">Exposición Valle</th>
                <th className="py-2.5 px-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {cropsSuitability.map((c) => {
                const isSelected = selectedCrop.id === c.id;
                return (
                  <tr 
                    key={c.id}
                    onClick={() => setSelectedCrop(c)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-cyan-500/10 dark:bg-cyan-500/15 font-semibold' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{c.nombre}</div>
                      <span className="text-[10px] text-slate-500">{c.categoria}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {c.hectareasValle.toLocaleString()} ha
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {c.ecUmbralUsCm} µS/cm
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={c.retencionRendimientoPct >= 95 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {c.retencionRendimientoPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {c.perdidaKgHa > 0 ? `-${c.perdidaKgHa.toLocaleString()} kg/ha` : '0 kg/ha'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      S/. {c.precioSieaSkg.toFixed(2)}/kg
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={c.perdidaEconomicaHaS > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {c.perdidaEconomicaHaS > 0 ? `S/. ${c.perdidaEconomicaHaS.toLocaleString()}` : 'S/. 0'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {c.exposicionTotalValleS > 0 ? `S/. ${(c.exposicionTotalValleS / 1000000).toFixed(2)} M` : 'S/. 0'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <ChevronRight className={`w-4 h-4 inline-block transition-transform ${isSelected ? 'text-cyan-500 translate-x-1' : 'text-slate-400'}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Ficha Agronómica Detallada del Cultivo Seleccionado */}
        {selectedCrop && (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-500" />
                Diagnóstico de Sensibilidad: {selectedCrop.nombre}
              </span>
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold w-fit ${
                selectedCrop.sensibilidad === 'ALTA' || selectedCrop.sensibilidad === 'MUY ALTA'
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              }`}>
                Sensibilidad Salina: {selectedCrop.sensibilidad}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[10px]">Rendimiento Potencial:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedCrop.rendimientoPotencialKgHa.toLocaleString()} kg/ha
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[10px]">Rendimiento Proyectado:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {selectedCrop.rendimientoProyectadoKgHa.toLocaleString()} kg/ha
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[10px]">Zona de Mayor Riesgo:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {selectedCrop.zonaCritica}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block text-[10px]">Pendiente de Pérdida (b):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedCrop.pendientePerdidaPct}% / dS·m⁻¹
                </span>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong>Recomendación Técnica de Resiliencia: </strong>
                {selectedCrop.portainjertoRecomendado}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: ESTRATEGIAS DE MANEJO & RECOMENDACIONES INIA DONOSO */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-500" />
          Directrices para la Junta de Usuarios & Comisiones de Regantes (INIA Donoso / MIDAGRI)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              1. Fracción de Lavado (Leaching Fraction)
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              En el Valle Bajo (Saume a EMAPA), cuando el EC supera 1,200 µS/cm, aplicar una fracción de lavado de <strong>LF = 10% a 15%</strong> adicional a la lámina de riego para desalojar sales acumuladas fuera de la rizósfera radicular.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              2. Programación de Riegos en Estiaje
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Durante julio-octubre, evitar turnos prolongados de mita con intervalos espaciados. Se recomienda riego pulsado de alta frecuencia para evitar la concentración osmótica de sales en los primeros 30 cm de suelo.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              3. Protección de Raíces en Palto y Cítricos
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Priorizar la reconversión gradual a patrones antillanos o portainjertos clonales tolerantes en áreas donde el agua de pozo complementario presente conductividades mayores a 2,000 µS/cm.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
