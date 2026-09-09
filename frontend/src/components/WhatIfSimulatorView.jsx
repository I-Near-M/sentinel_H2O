import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Droplets,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Sliders,
  DollarSign,
  Activity,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Info,
  RefreshCw,
  Layers,
  Thermometer,
  Zap,
  PieChart,
  BarChart3,
  Calendar,
  Sparkles,
  Award,
  BookOpen,
  Filter
} from 'lucide-react';
import { predictionsApi } from '../services/api';

const REGIONS_BY_ZONE = {
  Costa: [
    { id: 'LIMA', name: 'Lima (Chancay - Huaral / Chillón)' },
    { id: 'ICA', name: 'Ica (Ica / Pisco / Chincha)' },
    { id: 'LA LIBERTAD', name: 'La Libertad (Chicama / Moche / Virú)' },
    { id: 'PIURA', name: 'Piura (Chira / Piura)' },
    { id: 'LAMBAYEQUE', name: 'Lambayeque (Chancay-Lambayeque / La Leche)' },
    { id: 'AREQUIPA', name: 'Arequipa (Majes / Camaná / Tambo)' },
    { id: 'ANCASH', name: 'Áncash (Santa / Nepeña)' },
    { id: 'TACNA', name: 'Tacna (Caplina / Sama / Locumba)' },
    { id: 'MOQUEGUA', name: 'Moquegua (Osmore / Moquegua)' },
    { id: 'TUMBES', name: 'Tumbes (Tumbes / Zarumilla)' }
  ],
  Sierra: [
    { id: 'JUNIN', name: 'Junín (Valle del Mantaro / Tarma)' },
    { id: 'CUSCO', name: 'Cusco (Valle Sagrado / Vilcanota)' },
    { id: 'PUNO', name: 'Puno (Altiplano / Cuenca Titicaca)' },
    { id: 'AYACUCHO', name: 'Ayacucho (Cachi / Huamanga)' },
    { id: 'CAJAMARCA', name: 'Cajamarca (Crisnejas / Chota)' },
    { id: 'HUANUCO', name: 'Huánuco (Huallaga Alto)' },
    { id: 'APURIMAC', name: 'Apurímac (Pampas / Abancay)' },
    { id: 'HUANCAVELICA', name: 'Huancavelica (Ichu / Tayacaja)' },
    { id: 'PASCO', name: 'Pasco (Oxapampa / Pasco Alto)' }
  ],
  Selva: [
    { id: 'SAN MARTIN', name: 'San Martín (Huallaga Central / Mayo)' },
    { id: 'UCAYALI', name: 'Ucayali (Coronel Portillo / Padre Abad)' },
    { id: 'LORETO', name: 'Loreto (Amazonas / Nanay)' },
    { id: 'MADRE DE DIOS', name: 'Madre de Dios (Madre de Dios / Tambopata)' },
    { id: 'AMAZONAS', name: 'Amazonas (Utcubamba / Bagua)' }
  ],
  Nacional: [
    { id: 'NACIONAL', name: 'Promedio Nacional (Perú)' }
  ]
};

const WhatIfSimulatorView = () => {
  // Navigation & Region State
  const [activeTab, setActiveTab] = useState('cedula_whatif'); // 'cedula_whatif' | 'stress_whatif' | 'ena_intentions' | 'midagri_kpis'
  const [selectedRegion, setSelectedRegion] = useState('LIMA');
  const [naturalZoneFilter, setNaturalZoneFilter] = useState('TODAS'); // 'TODAS' | 'Costa' | 'Sierra' | 'Selva'

  // Catalog & Benchmarks
  const [cropsCatalog, setCropsCatalog] = useState([]);
  const [regionalBenchmark, setRegionalBenchmark] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Tab 1: Cédula What-If State
  const [cropDistribution, setCropDistribution] = useState({});
  const [availableFlow, setAvailableFlow] = useState(1.20);
  const [ecParam, setEcParam] = useState(1200);
  const [phParam, setPhParam] = useState(7.2);
  const [turbidityParam, setTurbidityParam] = useState(25);
  const [tempWaterParam, setTempWaterParam] = useState(19.0);
  const [irrigationType, setIrrigationType] = useState('gravity');
  const [waterTariff, setWaterTariff] = useState(0.045);
  const [simDuration, setSimDuration] = useState(365);
  const [simResult, setSimResult] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);

  // Tab 2: Monoculture Water Quality Stress What-If State
  const [stressCropId, setStressCropId] = useState('palto');
  const [stressEc, setStressEc] = useState(2200);
  const [stressPh, setStressPh] = useState(8.2);
  const [stressTurbidity, setStressTurbidity] = useState(85);
  const [stressTemp, setStressTemp] = useState(26.5);
  const [stressWaterRatio, setStressWaterRatio] = useState(0.85);
  const [stressResult, setStressResult] = useState(null);
  const [loadingStress, setLoadingStress] = useState(false);

  // Tab 3: ENA Intentions Feasibility State
  const [enaFlow, setEnaFlow] = useState(1.10);
  const [enaIrrigation, setEnaIrrigation] = useState('gravity');
  const [enaResult, setEnaResult] = useState(null);
  const [loadingEna, setLoadingEna] = useState(false);

  // Load Catalog & Initial Benchmarks
  useEffect(() => {
    loadInitialData();
  }, [selectedRegion]);

  const loadInitialData = async () => {
    try {
      setLoadingInitial(true);
      const [cropsRes, benchRes] = await Promise.all([
        predictionsApi.getAgroCrops(),
        predictionsApi.getAgroRegionalBenchmarks(selectedRegion)
      ]);

      const crops = cropsRes.data || [];
      setCropsCatalog(crops);
      setRegionalBenchmark(benchRes.data || null);

      // Initialize crop distribution based on selected region natural zone
      const defaultDist = {};
      const zoneCrops = crops.filter(c => {
        if (selectedRegion === 'LIMA' || selectedRegion === 'ICA') return c.region_natural === 'Costa';
        if (selectedRegion === 'JUNIN' || selectedRegion === 'CUSCO' || selectedRegion === 'PUNO') return c.region_natural === 'Sierra';
        if (selectedRegion === 'SAN MARTIN' || selectedRegion === 'UCAYALI') return c.region_natural === 'Selva';
        return true;
      });

      if (zoneCrops.length >= 3) {
        defaultDist[zoneCrops[0].crop_id] = 50;
        defaultDist[zoneCrops[1].crop_id] = 30;
        defaultDist[zoneCrops[2].crop_id] = 20;
        setStressCropId(zoneCrops[0].crop_id);
      } else if (crops.length >= 3) {
        defaultDist[crops[0].crop_id] = 50;
        defaultDist[crops[1].crop_id] = 30;
        defaultDist[crops[2].crop_id] = 20;
        setStressCropId(crops[0].crop_id);
      }
      setCropDistribution(defaultDist);

      // Auto-run simulations with defaults
      runCedulaSimulation(defaultDist, availableFlow, ecParam, phParam, turbidityParam, tempWaterParam, irrigationType, waterTariff, selectedRegion);
      runStressSimulation(zoneCrops[0]?.crop_id || 'palto', stressEc, stressPh, stressTurbidity, stressTemp, stressWaterRatio, selectedRegion);
      runEnaAudit(selectedRegion, enaFlow, enaIrrigation);

    } catch (err) {
      console.error('Error loading MIDAGRI data:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // 1. Run Cédula Simulation
  const runCedulaSimulation = async (
    dist = cropDistribution,
    flow = availableFlow,
    ec = ecParam,
    ph = phParam,
    turb = turbidityParam,
    temp = tempWaterParam,
    irrig = irrigationType,
    tariff = waterTariff,
    reg = selectedRegion
  ) => {
    try {
      setLoadingSim(true);
      const payload = {
        crop_distribution_ha: dist,
        available_flow_m3s: parseFloat(flow),
        ec_us_cm: parseFloat(ec),
        ph: parseFloat(ph),
        turbidity_ntu: parseFloat(turb),
        temp_water_c: parseFloat(temp),
        irrigation_type: irrig,
        water_tariff_s_m3: parseFloat(tariff),
        region: reg,
        simulated_duration_days: parseInt(simDuration)
      };
      const res = await predictionsApi.simulateAgroWhatIf(payload);
      setSimResult(res.data);
    } catch (err) {
      console.error('Error in Agro What-If simulation:', err);
    } finally {
      setLoadingSim(false);
    }
  };

  // 2. Run Stress Simulation
  const runStressSimulation = async (
    cropId = stressCropId,
    ec = stressEc,
    ph = stressPh,
    turb = stressTurbidity,
    temp = stressTemp,
    wRatio = stressWaterRatio,
    reg = selectedRegion
  ) => {
    try {
      setLoadingStress(true);
      const payload = {
        crop_id: cropId,
        ec_us_cm: parseFloat(ec),
        ph: parseFloat(ph),
        turbidity_ntu: parseFloat(turb),
        temp_water_c: parseFloat(temp),
        water_availability_ratio: parseFloat(wRatio),
        region: reg
      };
      const res = await predictionsApi.simulateWaterQualityStress(payload);
      setStressResult(res.data);
    } catch (err) {
      console.error('Error in Water Quality Stress simulation:', err);
    } finally {
      setLoadingStress(false);
    }
  };

  // 3. Run ENA Intentions Feasibility Audit
  const runEnaAudit = async (reg = selectedRegion, flow = enaFlow, irrig = enaIrrigation) => {
    try {
      setLoadingEna(true);
      const payload = {
        region: reg,
        available_flow_m3s: parseFloat(flow),
        irrigation_type: irrig,
        simulated_duration_days: 365
      };
      const res = await predictionsApi.checkPlantingIntentionsFeasibility(payload);
      setEnaResult(res.data);
    } catch (err) {
      console.error('Error in ENA Audit simulation:', err);
    } finally {
      setLoadingEna(false);
    }
  };

  // Handler for adding/updating crop hectares
  const handleHaChange = (cropId, ha) => {
    const val = Math.max(0, parseFloat(ha) || 0);
    const updated = { ...cropDistribution, [cropId]: val };
    if (val === 0) delete updated[cropId];
    setCropDistribution(updated);
  };

  // Filter crops catalog for display
  const displayedCrops = cropsCatalog.filter(c => {
    if (naturalZoneFilter === 'TODAS') return true;
    return c.region_natural === naturalZoneFilter;
  });

  const getZoneBadge = (zone) => {
    switch (zone) {
      case 'Costa':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">🌊 Costa</span>;
      case 'Sierra':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">🏔️ Sierra</span>;
      case 'Selva':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🌴 Selva</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">🌱 Perú</span>;
    }
  };

  const getStatusBadge = (color, status) => {
    const colorClasses = {
      green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      red: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClasses[color] || colorClasses.green}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* HEADER WITH REGION SELECTOR */}
      <header className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/20">
                <Sprout className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  What-If Agro-Hídrico & Decisión Agraria MIDAGRI
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    SIEA 2017-2023 & ENA 2024-2025
                  </span>
                </h1>
                <p className="text-xs md:text-sm text-slate-400">
                  Simulador biofísico y económico multivariable (Salinidad, pH, Turbidez, Temperatura, Dotación) para Costa, Sierra y Selva.
                </p>
              </div>
            </div>
          </div>

          {/* REGION SELECTOR */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-400">Región Agraria:</span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
              >
                <optgroup label="🌊 Región Costa (Valles de Riego)">
                  {REGIONS_BY_ZONE.Costa.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-white">{r.name}</option>
                  ))}
                </optgroup>
                <optgroup label="🏔️ Región Sierra (Valles Interandinos / Altiplano)">
                  {REGIONS_BY_ZONE.Sierra.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-white">{r.name}</option>
                  ))}
                </optgroup>
                <optgroup label="🌴 Región Selva (Cuenca Amazónica / Ceja de Selva)">
                  {REGIONS_BY_ZONE.Selva.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-white">{r.name}</option>
                  ))}
                </optgroup>
                <optgroup label="🌱 Promedio País">
                  {REGIONS_BY_ZONE.Nacional.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-white">{r.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              onClick={() => loadInitialData()}
              disabled={loadingInitial}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInitial ? 'animate-spin text-emerald-400' : ''}`} />
              Refrescar
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex overflow-x-auto scrollbar-none gap-2 mt-5 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('cedula_whatif')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'cedula_whatif'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                : 'bg-slate-950/60 hover:bg-slate-800/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            1. Balance Hídrico & Cédula de Cultivo
          </button>

          <button
            onClick={() => setActiveTab('stress_whatif')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'stress_whatif'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-950/60 hover:bg-slate-800/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            2. Estrés por Calidad de Agua (pH, CE, NTU, T°)
          </button>

          <button
            onClick={() => setActiveTab('ena_intentions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'ena_intentions'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'bg-slate-950/60 hover:bg-slate-800/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            3. Factibilidad de Intenciones ENA
          </button>

          <button
            onClick={() => setActiveTab('midagri_kpis')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'midagri_kpis'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-950/60 hover:bg-slate-800/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            4. Estadísticas & Benchmarks MIDAGRI
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* TAB 1: BALANCE HÍDRICO & CÉDULA DE CULTIVO (WHAT-IF MULTI-CULTIVO) */}
      {/* ========================================================================= */}
      {activeTab === 'cedula_whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT PANEL: SLIDERS & CROP DISTRIBUTION CONFIG */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Parámetros del Río / Canal & Cuenca
                </h2>
                <span className="text-xs text-slate-400 font-mono">Región: {selectedRegion}</span>
              </div>

              {/* SLIDERS */}
              <div className="space-y-4">
                {/* Available Flow */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Caudal Disponible Asignado (Q):</span>
                    <span className="font-mono font-bold text-emerald-400">{availableFlow.toFixed(2)} m³/s ({(availableFlow * 1000).toFixed(0)} l/s)</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="5.00"
                    step="0.05"
                    value={availableFlow}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAvailableFlow(val);
                      runCedulaSimulation(cropDistribution, val, ecParam, phParam, turbidityParam, tempWaterParam, irrigationType, waterTariff, selectedRegion);
                    }}
                    className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Estiaje Crítico (0.10 m³/s)</span>
                    <span>Avenida Normal (5.00 m³/s)</span>
                  </div>
                </div>

                {/* Salinity EC */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Conductividad Eléctrica (EC):</span>
                    <span className={`font-mono font-bold ${ecParam > 2000 ? 'text-rose-400' : ecParam > 1400 ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {ecParam} µS/cm ({(ecParam / 1000).toFixed(2)} dS/m)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="5000"
                    step="50"
                    value={ecParam}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEcParam(val);
                      runCedulaSimulation(cropDistribution, availableFlow, val, phParam, turbidityParam, tempWaterParam, irrigationType, waterTariff, selectedRegion);
                    }}
                    className="w-full accent-cyan-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* pH & Turbidity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">pH Agua:</span>
                      <span className="font-mono font-bold text-amber-400">{phParam.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="9.5"
                      step="0.1"
                      value={phParam}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setPhParam(val);
                        runCedulaSimulation(cropDistribution, availableFlow, ecParam, val, turbidityParam, tempWaterParam, irrigationType, waterTariff, selectedRegion);
                      }}
                      className="w-full accent-amber-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Turbidez:</span>
                      <span className="font-mono font-bold text-slate-300">{turbidityParam} NTU</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="300"
                      step="5"
                      value={turbidityParam}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTurbidityParam(val);
                        runCedulaSimulation(cropDistribution, availableFlow, ecParam, phParam, val, tempWaterParam, irrigationType, waterTariff, selectedRegion);
                      }}
                      className="w-full accent-slate-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Irrigation Technology & Water Tariff */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Tecnología de Riego:</label>
                    <select
                      value={irrigationType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIrrigationType(val);
                        runCedulaSimulation(cropDistribution, availableFlow, ecParam, phParam, turbidityParam, tempWaterParam, val, waterTariff, selectedRegion);
                      }}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                    >
                      <option value="gravity">Gravedad / Inundación (55% Ef.)</option>
                      <option value="sprinkler">Aspersión Convencional (75% Ef.)</option>
                      <option value="drip">Goteo Presurizado (88% Ef.)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Tarifa del Agua (S/./m³):</label>
                    <input
                      type="number"
                      step="0.005"
                      value={waterTariff}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setWaterTariff(val);
                        runCedulaSimulation(cropDistribution, availableFlow, ecParam, phParam, turbidityParam, tempWaterParam, irrigationType, val, selectedRegion);
                      }}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CROP HECTARES DISTRIBUTION CONFIG */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-400" />
                  Cédula de Siembra (Hectáreas)
                </h2>
                {/* Filter Natural Region */}
                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  {['TODAS', 'Costa', 'Sierra', 'Selva'].map(z => (
                    <button
                      key={z}
                      onClick={() => setNaturalZoneFilter(z)}
                      className={`px-2 py-0.5 rounded font-semibold transition-all ${
                        naturalZoneFilter === z ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crops list with ha inputs */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                {displayedCrops.map(crop => {
                  const ha = cropDistribution[crop.crop_id] || '';
                  return (
                    <div
                      key={crop.crop_id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        ha > 0 ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{crop.name}</span>
                          {getZoneBadge(crop.region_natural)}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                          <span>💧 {crop.water_demand_m3_ha} m³/ha</span>
                          <span>⚡ CE umbral: {crop.ec_threshold_us_cm} µS/cm</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          max="10000"
                          value={ha}
                          onChange={(e) => {
                            handleHaChange(crop.crop_id, e.target.value);
                            const updated = { ...cropDistribution, [crop.crop_id]: Math.max(0, parseFloat(e.target.value) || 0) };
                            if (!e.target.value || parseFloat(e.target.value) === 0) delete updated[crop.crop_id];
                            runCedulaSimulation(updated, availableFlow, ecParam, phParam, turbidityParam, tempWaterParam, irrigationType, waterTariff, selectedRegion);
                          }}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-right text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-xs font-medium text-slate-400">ha</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: SIMULATION RESULTS & KPIS */}
          <div className="lg:col-span-7 space-y-6">
            {loadingSim && (
              <div className="h-96 flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                <p className="text-sm text-slate-300 font-medium">Calculando balance hidrológico y proyecciones MIDAGRI...</p>
              </div>
            )}

            {!loadingSim && simResult && (
              <>
                {/* KPIS SUMMARY GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {/* Total Hectares */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Área Programada
                    </span>
                    <div className="text-xl font-black text-white font-mono">{simResult.total_planned_ha} ha</div>
                    <span className="text-[10px] text-slate-500 font-mono">{simResult.crops_summary?.length || 0} cultivos activos</span>
                  </div>

                  {/* Water Demand vs Availability */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                      Demanda vs Oferta
                    </span>
                    <div className="text-xl font-black text-cyan-400 font-mono">
                      {simResult.gross_water_demand_mmc} <span className="text-xs text-slate-400">/ {simResult.water_availability_mmc} MMC</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Cobertura: {simResult.water_coverage_pct}%</span>
                  </div>

                  {/* Economic Loss */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      Pérdida Económica
                    </span>
                    <div className="text-xl font-black text-rose-400 font-mono">
                      S/. {(simResult.total_economic_loss_s / 1000).toFixed(1)}k
                    </div>
                    <span className="text-[10px] text-rose-400 font-semibold font-mono">-{simResult.total_loss_pct}% del potencial</span>
                  </div>

                  {/* Net Margin */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      Margen Neto
                    </span>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      S/. {(simResult.net_agricultural_margin_s / 1000).toFixed(1)}k
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Deducido agua y filtración</span>
                  </div>
                </div>

                {/* WATER BALANCE BANNER & TECH UPGRADE */}
                <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${
                  simResult.water_deficit_mmc === 0
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {simResult.water_deficit_mmc === 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      )}
                      <h3 className="text-sm font-bold text-white">
                        {simResult.water_balance_status} ({simResult.water_coverage_pct}% cubierto)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      {simResult.water_deficit_mmc === 0
                        ? `La oferta hídrica de ${simResult.water_availability_mmc} MMC cubre holgadamente la demanda bruta de ${simResult.gross_water_demand_mmc} MMC.`
                        : `Déficit de ${simResult.water_deficit_mmc} MMC. Riesgo inminente de aborto floral o reducción de calibre por estrés hídrico.`}
                    </p>
                  </div>

                  {/* Tech upgrade potential card */}
                  {simResult.tech_upgrade_potential && simResult.irrigation_type !== 'drip' && (
                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-xs space-y-1 shrink-0">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                        <Zap className="w-3.5 h-3.5" />
                        Potencial de Tecnificación (Goteo)
                      </div>
                      <div className="text-slate-300">
                        Ahorro: <span className="font-mono font-bold text-white">{simResult.tech_upgrade_potential.water_saved_mmc} MMC</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold">
                        Elevaría viabilidad al {simResult.tech_upgrade_potential.feasibility_boost_pct}%
                      </div>
                    </div>
                  )}
                </div>

                {/* STRESS ATTRIBUTION BREAKDOWN */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-400" />
                    Atribución de Causas de Pérdida Agro-Hídrica
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 block font-medium">Estrés Salino (CE)</span>
                      <span className="text-base font-bold text-cyan-400 font-mono">
                        {simResult.loss_attribution?.salinity_share_pct || 0}%
                      </span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 block font-medium">Déficit de Caudal (Q)</span>
                      <span className="text-base font-bold text-rose-400 font-mono">
                        {simResult.loss_attribution?.drought_deficit_share_pct || 0}%
                      </span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 block font-medium">Bloqueo Químico (pH)</span>
                      <span className="text-base font-bold text-amber-400 font-mono">
                        {simResult.loss_attribution?.ph_lockout_share_pct || 0}%
                      </span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 block font-medium">Colmatación (Turbidez)</span>
                      <span className="text-base font-bold text-slate-300 font-mono">
                        {simResult.loss_attribution?.turbidity_clog_share_pct || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* CROPS SUMMARY EVALUATION TABLE */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl overflow-hidden">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    Evaluación por Cultivo en la Cédula Simulación
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold font-mono">
                          <th className="pb-3">Cultivo / Región</th>
                          <th className="pb-3">Área (ha)</th>
                          <th className="pb-3">Aptitud IA</th>
                          <th className="pb-3">Demanda MMC</th>
                          <th className="pb-3">Ingreso Estimado</th>
                          <th className="pb-3">Pérdida S/.</th>
                          <th className="pb-3">Sustituto Resiliente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {simResult.crops_summary?.map((c) => (
                          <tr key={c.crop_id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 pr-2">
                              <div className="font-sans font-bold text-white">{c.crop_name}</div>
                              <div className="text-[10px] text-slate-400 font-sans">{c.region_natural} • {c.category}</div>
                            </td>
                            <td className="py-3 text-slate-300 font-bold">{c.planned_ha} ha</td>
                            <td className="py-3">
                              <div className="space-y-1">
                                <div className="font-bold text-white">{c.suitability_score}%</div>
                                {getStatusBadge(c.status_color, c.status)}
                              </div>
                            </td>
                            <td className="py-3 text-cyan-400">{c.water_demand_mmc} MMC</td>
                            <td className="py-3 text-emerald-400 font-bold">S/. {(c.stressed_revenue_s / 1000).toFixed(1)}k</td>
                            <td className="py-3">
                              {c.economic_loss_s > 0 ? (
                                <span className="text-rose-400 font-bold">
                                  -S/. {(c.economic_loss_s / 1000).toFixed(1)}k ({c.loss_pct}%)
                                </span>
                              ) : (
                                <span className="text-slate-500">S/. 0</span>
                              )}
                            </td>
                            <td className="py-3">
                              {c.substitutes && c.substitutes.length > 0 ? (
                                <div className="space-y-1">
                                  <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1 font-sans">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    {c.substitutes[0].crop_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block font-sans">
                                    Ahorra {c.substitutes[0].water_saving_m3_ha} m³/ha
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[10px] font-sans">Cultivo Óptimo</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SIMULADOR DE ESTRÉS POR PARÁMETROS DE CALIDAD DE AGUA */}
      {/* ========================================================================= */}
      {activeTab === 'stress_whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: CROP SELECTOR & 5 STRESS SLIDERS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Cultivo & Variables Físico-Químicas
                </h2>
                <p className="text-xs text-slate-400">
                  Simula la respuesta agronómica individual según las leyes de Maas-Hoffman y factores bioquímicos.
                </p>
              </div>

              {/* Crop Select */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Cultivo a Someter a Prueba de Estrés:</label>
                <select
                  value={stressCropId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setStressCropId(id);
                    runStressSimulation(id, stressEc, stressPh, stressTurbidity, stressTemp, stressWaterRatio, selectedRegion);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none"
                >
                  <optgroup label="🌊 Costa">
                    {cropsCatalog.filter(c => c.region_natural === 'Costa').map(c => (
                      <option key={c.crop_id} value={c.crop_id} className="bg-slate-900 text-white">{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🏔️ Sierra">
                    {cropsCatalog.filter(c => c.region_natural === 'Sierra').map(c => (
                      <option key={c.crop_id} value={c.crop_id} className="bg-slate-900 text-white">{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🌴 Selva">
                    {cropsCatalog.filter(c => c.region_natural === 'Selva').map(c => (
                      <option key={c.crop_id} value={c.crop_id} className="bg-slate-900 text-white">{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🌱 Resilientes IA">
                    {cropsCatalog.filter(c => c.category?.startsWith('Resilientes')).map(c => (
                      <option key={c.crop_id} value={c.crop_id} className="bg-slate-900 text-white">{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* 5 STRESS SLIDERS */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                {/* 1. Salinity EC */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Conductividad Eléctrica (CE):</span>
                    <span className="font-mono font-bold text-cyan-400">{stressEc} µS/cm ({(stressEc / 1000).toFixed(2)} dS/m)</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="8000"
                    step="50"
                    value={stressEc}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStressEc(val);
                      runStressSimulation(stressCropId, val, stressPh, stressTurbidity, stressTemp, stressWaterRatio, selectedRegion);
                    }}
                    className="w-full accent-cyan-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Agua Dulce (100)</span>
                    <span>Salobre Moderada (3,000)</span>
                    <span>Hiper-Salina (8,000)</span>
                  </div>
                </div>

                {/* 2. pH */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Potencial de Hidrógeno (pH):</span>
                    <span className={`font-mono font-bold ${stressPh < 6.0 || stressPh > 8.0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {stressPh.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="10.0"
                    step="0.1"
                    value={stressPh}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStressPh(val);
                      runStressSimulation(stressCropId, stressEc, val, stressTurbidity, stressTemp, stressWaterRatio, selectedRegion);
                    }}
                    className="w-full accent-amber-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Ácido (4.0)</span>
                    <span>Neutro Óptimo (6.5-7.5)</span>
                    <span>Alcalino (10.0)</span>
                  </div>
                </div>

                {/* 3. Turbidity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Turbidez / Sedimentos (NTU):</span>
                    <span className="font-mono font-bold text-slate-300">{stressTurbidity} NTU</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={stressTurbidity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStressTurbidity(val);
                      runStressSimulation(stressCropId, stressEc, stressPh, val, stressTemp, stressWaterRatio, selectedRegion);
                    }}
                    className="w-full accent-slate-400 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 4. Temperature */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Temperatura del Agua de Riego:</span>
                    <span className="font-mono font-bold text-rose-400">{stressTemp.toFixed(1)} °C</span>
                  </div>
                  <input
                    type="range"
                    min="8.0"
                    max="38.0"
                    step="0.5"
                    value={stressTemp}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStressTemp(val);
                      runStressSimulation(stressCropId, stressEc, stressPh, stressTurbidity, val, stressWaterRatio, selectedRegion);
                    }}
                    className="w-full accent-rose-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 5. Water Availability Ratio */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Disponibilidad Hídrica (Oferta/Demanda):</span>
                    <span className="font-mono font-bold text-emerald-400">{(stressWaterRatio * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.30"
                    max="1.30"
                    step="0.05"
                    value={stressWaterRatio}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStressWaterRatio(val);
                      runStressSimulation(stressCropId, stressEc, stressPh, stressTurbidity, stressTemp, val, selectedRegion);
                    }}
                    className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: STRESS RESULTS, MULTI-FACTOR GAUGES & DIAGNOSTICS */}
          <div className="lg:col-span-7 space-y-6">
            {loadingStress && (
              <div className="h-96 flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                <p className="text-sm text-slate-300 font-medium">Evaluando cinética de estrés biofísico...</p>
              </div>
            )}

            {!loadingStress && stressResult && (
              <>
                {/* OVERALL SCORE & FINANCIAL IMPACT */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white">{stressResult.crop_name}</h3>
                        {getZoneBadge(stressResult.region_natural)}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Resiliencia: <span className="text-white font-bold">{stressResult.resilience_level}</span> • Rendimiento base: {stressResult.base_yield_kg_ha} kg/ha
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(stressResult.status_color, stressResult.status)}
                      <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono font-black text-lg text-white">
                        {stressResult.suitability_score}%
                      </div>
                    </div>
                  </div>

                  {/* 4 Financial Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-sans text-slate-400 block font-medium">Rendimiento Esperado</span>
                      <span className="text-sm font-bold text-white">{stressResult.expected_yield_kg_ha} kg/ha</span>
                      <span className="text-[10px] text-slate-500 block">Base: {stressResult.base_yield_kg_ha} kg</span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-sans text-slate-400 block font-medium">Precio en Chacra</span>
                      <span className="text-sm font-bold text-emerald-400">S/. {stressResult.farmgate_price_s_kg.toFixed(2)} /kg</span>
                      <span className="text-[10px] text-slate-500 block">Cotización SIEA</span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-sans text-slate-400 block font-medium">Ingreso / Hectárea</span>
                      <span className="text-sm font-bold text-cyan-400">S/. {stressResult.stressed_revenue_ha_s.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 block">Potencial: S/. {stressResult.potential_revenue_ha_s.toLocaleString()}</span>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-sans text-slate-400 block font-medium">Pérdida por Estrés</span>
                      <span className={`text-sm font-bold ${stressResult.economic_loss_ha_s > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        S/. {stressResult.economic_loss_ha_s.toLocaleString()} /ha
                      </span>
                      {stressResult.extra_filtration_cost_s_ha > 0 && (
                        <span className="text-[10px] text-amber-400 block">+S/. {stressResult.extra_filtration_cost_s_ha} filtro</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5 BIOCHEMICAL STRESS FACTOR GAUGES */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Cinética de Factores Biofísicos de Retención de Rendimiento
                  </h3>

                  <div className="space-y-3 font-mono">
                    {/* Salinity Factor */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-300 font-medium">1. Retención por Salinidad (k_sal Maas-Hoffman):</span>
                        <span className="font-bold text-cyan-400">{stressResult.salinity_retention_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            stressResult.salinity_retention_pct >= 90 ? 'bg-cyan-400' : stressResult.salinity_retention_pct >= 70 ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${stressResult.salinity_retention_pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-sans block">{stressResult.diagnostics?.salinity}</span>
                    </div>

                    {/* pH Factor */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-300 font-medium">2. Disponibilidad Nutricional por pH (k_ph Truog):</span>
                        <span className="font-bold text-amber-400">{stressResult.ph_factor_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-500"
                          style={{ width: `${stressResult.ph_factor_pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-sans block">{stressResult.diagnostics?.ph}</span>
                    </div>

                    {/* Turbidity Factor */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-300 font-medium">3. Factor de Turbidez & Emisores (k_turb):</span>
                        <span className="font-bold text-slate-300">{stressResult.turbidity_factor_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-400 transition-all duration-500"
                          style={{ width: `${stressResult.turbidity_factor_pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-sans block">{stressResult.diagnostics?.turbidity}</span>
                    </div>

                    {/* Thermal Factor */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-300 font-medium">4. Factor Térmico Radicular (k_temp):</span>
                        <span className="font-bold text-rose-400">{stressResult.temperature_factor_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-400 transition-all duration-500"
                          style={{ width: `${stressResult.temperature_factor_pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-sans block">{stressResult.diagnostics?.temperature}</span>
                    </div>
                  </div>
                </div>

                {/* RESILIENT REPLACEMENT CROPS RECOMMENDATION */}
                {stressResult.substitutes && stressResult.substitutes.length > 0 && (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Cultivos Sustitutos Resilientes Recomendados por el Motor IA
                    </h3>
                    <p className="text-xs text-slate-400">
                      Opciones agronómicas tolerantes a las condiciones químicas simuladas que minimizan la merma económica:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {stressResult.substitutes.map((sub) => (
                        <div
                          key={sub.crop_id}
                          className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-3.5 space-y-2 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{sub.crop_name}</span>
                            {getZoneBadge(sub.region_natural)}
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
                            <div>Score Aptitud: <span className="text-emerald-400 font-bold">{sub.suitability_score}%</span></div>
                            <div>Ahorro Hídrico: <span className="text-cyan-400 font-bold">{sub.water_saving_m3_ha} m³/ha</span></div>
                            <div>Ingreso Bruto: <span className="text-white font-bold">S/. {sub.expected_gross_income_s_ha.toLocaleString()} /ha</span></div>
                          </div>
                          <p className="text-[10px] text-slate-400 italic">"{sub.rationale}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUDITORÍA DE INTENCIONES DE SIEMBRA ENA */}
      {/* ========================================================================= */}
      {activeTab === 'ena_intentions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: ENA AUDIT CONTROLS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Auditoría de Siembra ENA vs Río
                </h2>
                <p className="text-xs text-slate-400">
                  Cruza las intenciones de siembra declaradas por productores en la Encuesta Nacional Agraria con el caudal asignado al valle.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Caudal Asignado a la Cuenca / Sector:</span>
                    <span className="font-mono font-bold text-emerald-400">{enaFlow.toFixed(2)} m³/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="5.00"
                    step="0.05"
                    value={enaFlow}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEnaFlow(val);
                      runEnaAudit(selectedRegion, val, enaIrrigation);
                    }}
                    className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Sistema de Riego Predominante:</label>
                  <select
                    value={enaIrrigation}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEnaIrrigation(val);
                      runEnaAudit(selectedRegion, enaFlow, val);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                  >
                    <option value="gravity">Gravedad Tradicional (55% Eficiencia)</option>
                    <option value="sprinkler">Aspersión Mixta (75% Eficiencia)</option>
                    <option value="drip">Goteo Tecnificado (88% Eficiencia)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: ENA VERDICT & BREAKDOWN */}
          <div className="lg:col-span-7 space-y-6">
            {loadingEna && (
              <div className="h-96 flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                <p className="text-sm text-slate-300 font-medium">Auditando base de datos ENA Módulo 1912...</p>
              </div>
            )}

            {!loadingEna && enaResult && (
              <>
                {/* VERDICT BANNER */}
                <div className={`p-5 rounded-2xl border space-y-2 shadow-xl ${
                  enaResult.verdict_color === 'green'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : enaResult.verdict_color === 'yellow'
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}>
                  <div className="flex items-center gap-2">
                    {enaResult.verdict_color === 'green' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 text-rose-400" />
                    )}
                    <h3 className="text-base font-black text-white">{enaResult.verdict}</h3>
                  </div>
                  <p className="text-xs text-slate-300 font-sans">{enaResult.recommendation}</p>
                </div>

                {/* 4 KPIS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-sans text-slate-400 block font-medium">Área Declarada ENA</span>
                    <span className="text-base font-bold text-white">{enaResult.total_declared_ha.toLocaleString()} ha</span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-sans text-slate-400 block font-medium">Demanda Total ENA</span>
                    <span className="text-base font-bold text-cyan-400">{enaResult.total_intentions_demand_mmc} MMC</span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-sans text-slate-400 block font-medium">Área Asegurada</span>
                    <span className="text-base font-bold text-emerald-400">{enaResult.hectares_secured_ha.toLocaleString()} ha</span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-sans text-slate-400 block font-medium">Área en Riesgo</span>
                    <span className={`text-base font-bold ${enaResult.hectares_at_risk_ha > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {enaResult.hectares_at_risk_ha.toLocaleString()} ha
                    </span>
                  </div>
                </div>

                {/* INTENTIONS BREAKDOWN TABLE */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Principales Cultivos Declarados en {selectedRegion} (Módulo 1912 ENA)
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold font-mono">
                          <th className="pb-2">Cultivo Declarado</th>
                          <th className="pb-2">Declaraciones</th>
                          <th className="pb-2">Superficie Intención (ha)</th>
                          <th className="pb-2">Demanda Hídrica Requerida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {enaResult.intentions_breakdown?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2.5 font-bold text-white font-sans">{item.crop_declared}</td>
                            <td className="py-2.5 text-slate-400">{item.declarations_count} productores</td>
                            <td className="py-2.5 text-emerald-400 font-bold">{item.planned_ha} ha</td>
                            <td className="py-2.5 text-cyan-400 font-bold">{item.water_demand_mmc} MMC</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ESTADÍSTICAS & BENCHMARKS REGIONALES MIDAGRI */}
      {/* ========================================================================= */}
      {activeTab === 'midagri_kpis' && regionalBenchmark && (
        <div className="space-y-6">
          {/* TOP BENCHMARK SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ENA LOSS PROFILE */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Causas de Pérdida Agrícola ({selectedRegion})
              </h3>
              <p className="text-xs text-slate-400">
                Distribución porcentual de siniestros agrarios reportados en ENA:
              </p>

              <div className="space-y-2.5 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1 font-sans">
                    <span className="text-slate-300">Déficit Hídrico / Sequía</span>
                    <span className="font-bold text-rose-400">{regionalBenchmark.loss_profile?.drought_deficit_pct || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${regionalBenchmark.loss_profile?.drought_deficit_pct || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-sans">
                    <span className="text-slate-300">Salinidad / Degradación de Suelo</span>
                    <span className="font-bold text-cyan-400">{regionalBenchmark.loss_profile?.salinity_soil_pct || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${regionalBenchmark.loss_profile?.salinity_soil_pct || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-sans">
                    <span className="text-slate-300">Plagas y Enfermedades</span>
                    <span className="font-bold text-amber-400">{regionalBenchmark.loss_profile?.pests_pct || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${regionalBenchmark.loss_profile?.pests_pct || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-sans">
                    <span className="text-slate-300">Heladas / Granizadas</span>
                    <span className="font-bold text-indigo-400">{regionalBenchmark.loss_profile?.frost_hail_pct || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400" style={{ width: `${regionalBenchmark.loss_profile?.frost_hail_pct || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* IRRIGATION TECHNOLOGY PROFILE */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                Tecnificación del Riego ({selectedRegion})
              </h3>
              <p className="text-xs text-slate-400">
                Adopción tecnológica en parcelas registradas (ENA Módulo 1894):
              </p>

              <div className="space-y-3 font-mono text-xs pt-1">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white block font-sans">Riego por Gravedad</span>
                    <span className="text-[10px] text-slate-400 font-sans">Eficiencia: 50-60%</span>
                  </div>
                  <span className="text-sm font-bold text-slate-300">{regionalBenchmark.irrigation_profile?.gravity_pct || 65}%</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white block font-sans">Riego por Aspersión</span>
                    <span className="text-[10px] text-slate-400 font-sans">Eficiencia: 70-80%</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400">{regionalBenchmark.irrigation_profile?.sprinkler_pct || 20}%</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white block font-sans">Riego por Goteo</span>
                    <span className="text-[10px] text-slate-400 font-sans">Eficiencia: 85-95%</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{regionalBenchmark.irrigation_profile?.drip_pct || 15}%</span>
                </div>
              </div>
            </div>

            {/* CROPS CATALOG COVERAGE */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Matriz de Calibración MIDAGRI
              </h3>
              <p className="text-xs text-slate-400">
                Parámetros biofísicos integrados en el motor analítico:
              </p>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Cultivos Calibrados:</span>
                  <span className="font-bold text-white">{cropsCatalog.length} variedades</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Departamentos con Microdatos:</span>
                  <span className="font-bold text-emerald-400">25 regiones (100% Perú)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Serie Histórica SIEA:</span>
                  <span className="font-bold text-cyan-400">2017 - 2023</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-sans">Encuesta Nacional Agraria:</span>
                  <span className="font-bold text-amber-400">ENA 2024 / ENA 2025</span>
                </div>
              </div>
            </div>
          </div>

          {/* HISTORICAL YIELDS & PRICES TABLE (SIEA) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Rendimientos Promedio y Precios en Chacra Registrados en SIEA ({selectedRegion})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold font-mono">
                    <th className="pb-3">Cultivo</th>
                    <th className="pb-3">Región Natural</th>
                    <th className="pb-3">Demanda Hídrica (m³/ha)</th>
                    <th className="pb-3">Rdto. Promedio Regional</th>
                    <th className="pb-3">Rdto. Base Catálogo</th>
                    <th className="pb-3">Precio Promedio Chacra</th>
                    <th className="pb-3">Tolerancia Salina CE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {cropsCatalog.map(crop => {
                    const stats = regionalBenchmark.crops_stats?.[crop.crop_id] || {};
                    const meanRdto = stats.mean_yield_kg_ha || crop.base_yield_kg_ha;
                    const meanPrice = stats.mean_price_s_kg || crop.base_price_s_kg;

                    return (
                      <tr key={crop.crop_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-sans font-bold text-white">{crop.name}</td>
                        <td className="py-3">{getZoneBadge(crop.region_natural)}</td>
                        <td className="py-3 text-cyan-400">{crop.water_demand_m3_ha.toLocaleString()} m³/ha</td>
                        <td className="py-3 text-emerald-400 font-bold">{meanRdto.toLocaleString()} kg/ha</td>
                        <td className="py-3 text-slate-400">{crop.base_yield_kg_ha.toLocaleString()} kg/ha</td>
                        <td className="py-3 text-amber-400 font-bold">S/. {meanPrice.toFixed(2)} /kg</td>
                        <td className="py-3 text-slate-300">{crop.ec_threshold_us_cm} µS/cm</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfSimulatorView;
