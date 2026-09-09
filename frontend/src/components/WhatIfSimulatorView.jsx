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
  Filter,
  Play,
  Waves,
  Scale,
  FlaskConical,
  Clock,
  ArrowDown,
  Lock,
  Radio,
  CheckSquare,
  Square
} from 'lucide-react';
import { predictionsApi, nodesApi } from '../services/api';

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
  // Navigation: 7 prioritized simulation modules
  const [activeTab, setActiveTab] = useState('cascade_leadtime'); 
  // 'cascade_leadtime' | 'mita_audit' | 'dilution_prescribe' | 'cedula_whatif' | 'stress_whatif' | 'ena_intentions' | 'midagri_kpis'

  const [selectedRegion, setSelectedRegion] = useState('LIMA');
  const [naturalZoneFilter, setNaturalZoneFilter] = useState('TODAS');
  const [nodes, setNodes] = useState([]);
  const [cropsCatalog, setCropsCatalog] = useState([]);
  const [regionalBenchmark, setRegionalBenchmark] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // -------------------------------------------------------------------------
  // 1. CASCADA HIDRÁULICA 3D & LEAD TIME STATE
  // -------------------------------------------------------------------------
  const [cascadeOriginNode, setCascadeOriginNode] = useState('NODO-01-CABECERA');
  const [cascadeFlow, setCascadeFlow] = useState(1.40);
  const [cascadeSalinity, setCascadeSalinity] = useState(1800);
  const [cascadePh, setCascadePh] = useState(7.6);
  const [cascadeResult, setCascadeResult] = useState(null);
  const [loadingCascade, setLoadingCascade] = useState(false);
  const [isSimulatingCascadeAnim, setIsSimulatingCascadeAnim] = useState(false);

  // -------------------------------------------------------------------------
  // 2. AUDITORÍA DE DESVÍOS DE LA MITA STATE
  // -------------------------------------------------------------------------
  const [mitaInfractorNode, setMitaInfractorNode] = useState('NODO-03-VALLE-MEDIO');
  const [mitaExcessLs, setMitaExcessLs] = useState(450);
  const [mitaDurationHours, setMitaDurationHours] = useState(12.0);
  const [mitaNominalFlowM3s, setMitaNominalFlowM3s] = useState(1.50);
  const [mitaResult, setMitaResult] = useState(null);
  const [loadingMita, setLoadingMita] = useState(false);

  // -------------------------------------------------------------------------
  // 3. PRESCRIPTOR DE DILUCIÓN HIDRÁULICA STATE
  // -------------------------------------------------------------------------
  const [dilutionHeadNode, setDilutionHeadNode] = useState('NODO-01-CABECERA');
  const [dilutionCurrentEc, setDilutionCurrentEc] = useState(2400);
  const [dilutionCurrentFlow, setDilutionCurrentFlow] = useState(1.20);
  const [dilutionTargetEc, setDilutionTargetEc] = useState(1000);
  const [dilutionDamEc, setDilutionDamEc] = useState(150);
  const [dilutionHours, setDilutionHours] = useState(8);
  const [dilutionResult, setDilutionResult] = useState(null);
  const [loadingDilution, setLoadingDilution] = useState(false);

  // -------------------------------------------------------------------------
  // 4. BALANCE HÍDRICO & CÉDULA DE CULTIVO STATE
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // 5. ESTRÉS POR CALIDAD DE AGUA STATE
  // -------------------------------------------------------------------------
  const [stressCropId, setStressCropId] = useState('palto');
  const [stressEc, setStressEc] = useState(2200);
  const [stressPh, setStressPh] = useState(8.2);
  const [stressTurbidity, setStressTurbidity] = useState(85);
  const [stressTemp, setStressTemp] = useState(26.5);
  const [stressWaterRatio, setStressWaterRatio] = useState(0.85);
  const [stressResult, setStressResult] = useState(null);
  const [loadingStress, setLoadingStress] = useState(false);

  // -------------------------------------------------------------------------
  // 6. ENA INTENTIONS FEASIBILITY STATE
  // -------------------------------------------------------------------------
  const [enaFlow, setEnaFlow] = useState(1.10);
  const [enaIrrigation, setEnaIrrigation] = useState('gravity');
  const [enaResult, setEnaResult] = useState(null);
  const [loadingEna, setLoadingEna] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [selectedRegion]);

  const loadInitialData = async () => {
    try {
      setLoadingInitial(true);
      const [nodesRes, cropsRes, benchRes] = await Promise.all([
        nodesApi.getNodes().catch(() => ({ data: [] })),
        predictionsApi.getAgroCrops(),
        predictionsApi.getAgroRegionalBenchmarks(selectedRegion)
      ]);

      const nList = nodesRes.data || [];
      setNodes(nList);
      if (nList.length > 0) {
        setCascadeOriginNode(nList[0].id_nodo);
        setMitaInfractorNode(nList[Math.min(2, nList.length - 1)].id_nodo);
      }

      const crops = cropsRes.data || [];
      setCropsCatalog(crops);
      setRegionalBenchmark(benchRes.data || null);

      // Default distribution for the selected region
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

      // Trigger initial executions
      executeCascadeSimulation(nList[0]?.id_nodo || 'NODO-01-CABECERA', cascadeFlow, cascadeSalinity, cascadePh);
      executeMitaAudit(nList[Math.min(2, nList.length - 1)]?.id_nodo || 'NODO-03-VALLE-MEDIO', mitaExcessLs, mitaDurationHours, mitaNominalFlowM3s);
      executeDilutionPrescription(dilutionCurrentEc, dilutionCurrentFlow, dilutionTargetEc, dilutionDamEc, dilutionHours);
      executeCedulaSimulation(defaultDist, availableFlow, ecParam, phParam, turbidityParam, tempWaterParam, irrigationType, waterTariff, selectedRegion);
      executeStressSimulation(zoneCrops[0]?.crop_id || 'palto', stressEc, stressPh, stressTurbidity, stressTemp, stressWaterRatio, selectedRegion);
      executeEnaAudit(selectedRegion, enaFlow, enaIrrigation);

    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // -------------------------------------------------------------------------
  // EXECUTION HANDLERS (CALCULATE BUTTONS)
  // -------------------------------------------------------------------------

  // 1. Cascade Simulation
  const executeCascadeSimulation = async (
    origin = cascadeOriginNode,
    flow = cascadeFlow,
    sal = cascadeSalinity,
    ph = cascadePh
  ) => {
    try {
      setLoadingCascade(true);
      setIsSimulatingCascadeAnim(true);
      const res = await predictionsApi.getCascadeLeadTime({
        id_nodo_origen: origin,
        caudal_transporte_m3s: parseFloat(flow),
        salinidad_origen_ec: parseFloat(sal),
        ph_origen: parseFloat(ph)
      });
      setCascadeResult(res.data);
    } catch (err) {
      console.error('Error en simulación cascada:', err);
    } finally {
      setLoadingCascade(false);
      setTimeout(() => setIsSimulatingCascadeAnim(false), 2000);
    }
  };

  // 2. Mita Audit
  const executeMitaAudit = async (
    node = mitaInfractorNode,
    excess = mitaExcessLs,
    dur = mitaDurationHours,
    nominal = mitaNominalFlowM3s
  ) => {
    try {
      setLoadingMita(true);
      const res = await predictionsApi.auditMitaDeficit({
        id_nodo_infractor: node,
        caudal_exceso_ls: parseFloat(excess),
        duracion_sobre_extraccion_horas: parseFloat(dur),
        caudal_nominal_valle_m3s: parseFloat(nominal)
      });
      setMitaResult(res.data);
    } catch (err) {
      console.error('Error en auditoría de la Mita:', err);
    } finally {
      setLoadingMita(false);
    }
  };

  // 3. Dilution Prescription
  const executeDilutionPrescription = async (
    curEc = dilutionCurrentEc,
    curFlow = dilutionCurrentFlow,
    targetEc = dilutionTargetEc,
    damEc = dilutionDamEc,
    durHours = dilutionHours
  ) => {
    try {
      setLoadingDilution(true);
      const res = await predictionsApi.prescribeDilution({
        salinidad_actual_rio_ec: parseFloat(curEc),
        caudal_actual_rio_m3s: parseFloat(curFlow),
        salinidad_objetivo_ec: parseFloat(targetEc),
        salinidad_agua_represa_ec: parseFloat(damEc),
        duracion_lavado_horas: parseInt(durHours)
      });
      setDilutionResult(res.data);
    } catch (err) {
      console.error('Error en prescripción de dilución:', err);
    } finally {
      setLoadingDilution(false);
    }
  };

  // 4. Cédula Simulation
  const executeCedulaSimulation = async (
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
      console.error('Error en simulación de Cédula:', err);
    } finally {
      setLoadingSim(false);
    }
  };

  // 5. Stress Simulation
  const executeStressSimulation = async (
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
      console.error('Error en simulación de estrés:', err);
    } finally {
      setLoadingStress(false);
    }
  };

  // 6. ENA Audit
  const executeEnaAudit = async (reg = selectedRegion, flow = enaFlow, irrig = enaIrrigation) => {
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
      console.error('Error en auditoría ENA:', err);
    } finally {
      setLoadingEna(false);
    }
  };

  // Toggle crop checkbox in Cédula
  const toggleCropInCedula = (cropId) => {
    const updated = { ...cropDistribution };
    if (updated[cropId] !== undefined) {
      delete updated[cropId];
    } else {
      updated[cropId] = 25.0; // Default hectares when checking
    }
    setCropDistribution(updated);
  };

  const handleHaChange = (cropId, valStr) => {
    const val = Math.max(0, parseFloat(valStr) || 0);
    const updated = { ...cropDistribution, [cropId]: val };
    if (val === 0) delete updated[cropId];
    setCropDistribution(updated);
  };

  const displayedCrops = cropsCatalog.filter(c => {
    if (naturalZoneFilter === 'TODAS') return true;
    return c.region_natural === naturalZoneFilter;
  });

  const getZoneBadge = (zone) => {
    switch (zone) {
      case 'Costa':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">🌊 Costa</span>;
      case 'Sierra':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">🏔️ Sierra</span>;
      case 'Selva':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">🌴 Selva</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">🌱 Perú</span>;
    }
  };

  const getStatusBadge = (color, status) => {
    const colorClasses = {
      green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
      yellow: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
      red: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClasses[color] || colorClasses.green}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-6 space-y-6 transition-colors duration-200">
      
      {/* HEADER WITH REGION SELECTOR */}
      <header className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 text-white shadow-md shadow-cyan-500/20">
                <Waves className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Gemelo Virtual & Simuladores What-If Hidro-Agrarios
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                    Sentinel-H2O Engine
                  </span>
                </h1>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                  Modelación hidrodinámica en cascada 3D, auditoría de La Mita, dilución de cuenca y decisiones biofísicas MIDAGRI (SIEA / ENA).
                </p>
              </div>
            </div>
          </div>

          {/* REGION SELECTOR */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Región Agraria:</span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <optgroup label="🌊 Región Costa (Valles de Riego)">
                  {REGIONS_BY_ZONE.Costa.map(r => (
                    <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{r.name}</option>
                  ))}
                </optgroup>
                <optgroup label="🏔️ Región Sierra (Valles Interandinos / Altiplano)">
                  {REGIONS_BY_ZONE.Sierra.map(r => (
                    <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{r.name}</option>
                  ))}
                </optgroup>
                <optgroup label="🌴 Región Selva (Cuenca Amazónica / Ceja de Selva)">
                  {REGIONS_BY_ZONE.Selva.map(r => (
                    <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{r.name}</option>
                  ))}
                </optgroup>
                <optgroup label="🌱 Promedio País">
                  {REGIONS_BY_ZONE.Nacional.map(r => (
                    <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{r.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              onClick={() => loadInitialData()}
              disabled={loadingInitial}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInitial ? 'animate-spin text-cyan-500' : ''}`} />
              Refrescar
            </button>
          </div>
        </div>

        {/* 7 PRIORITIZED TABS (ORDERED BY OPERATIONAL & AGRONOMIC IMPACT) */}
        <div className="flex overflow-x-auto scrollbar-none gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('cascade_leadtime')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'cascade_leadtime'
                ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Waves className="w-4 h-4" />
            1. Cascada 3D & Lead Time Fluvial
          </button>

          <button
            onClick={() => setActiveTab('mita_audit')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'mita_audit'
                ? 'bg-rose-600 dark:bg-rose-500 text-white dark:text-slate-950 shadow-md shadow-rose-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            2. Auditoría de Desvíos de La Mita
          </button>

          <button
            onClick={() => setActiveTab('dilution_prescribe')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dilution_prescribe'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-slate-950 shadow-md shadow-indigo-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            3. Prescriptor de Dilución de Cuenca
          </button>

          <button
            onClick={() => setActiveTab('cedula_whatif')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'cedula_whatif'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            4. Balance Hídrico & Cédula MIDAGRI
          </button>

          <button
            onClick={() => setActiveTab('stress_whatif')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'stress_whatif'
                ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            5. Estrés por Calidad (pH, CE, NTU, T°)
          </button>

          <button
            onClick={() => setActiveTab('ena_intentions')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ena_intentions'
                ? 'bg-amber-600 dark:bg-amber-500 text-white dark:text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            6. Factibilidad de Intenciones ENA
          </button>

          <button
            onClick={() => setActiveTab('midagri_kpis')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'midagri_kpis'
                ? 'bg-purple-600 dark:bg-purple-500 text-white dark:text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            7. Estadísticas SIEA & Benchmarks
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. CASCADA HIDRÁULICA 3D & LEAD TIME MULTITRAMO */}
      {/* ========================================================================= */}
      {activeTab === 'cascade_leadtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CONTROLS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm dark:shadow-xl">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Waves className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Origen de la Perturbación Fluvial
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Simula la velocidad de transporte y propagación de una onda salina o caudal hacia las estaciones y compuertas aguas abajo.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Estación de Origen:</label>
                  <select
                    value={cascadeOriginNode}
                    onChange={(e) => setCascadeOriginNode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    {nodes.map(n => (
                      <option key={n.id_nodo} value={n.id_nodo}>
                        {n.id_nodo} - {n.nombre} ({n.sector_cuenca || 'Cuenca'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Caudal de Transporte (Q):</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{cascadeFlow.toFixed(2)} m³/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="8.00"
                    step="0.05"
                    value={cascadeFlow}
                    onChange={(e) => setCascadeFlow(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Salinidad en Origen (EC):</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{cascadeSalinity} µS/cm</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="6000"
                    step="50"
                    value={cascadeSalinity}
                    onChange={(e) => setCascadeSalinity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">pH en Origen:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{cascadePh.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="9.5"
                    step="0.1"
                    value={cascadePh}
                    onChange={(e) => setCascadePh(parseFloat(e.target.value))}
                    className="w-full accent-slate-400 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => executeCascadeSimulation(cascadeOriginNode, cascadeFlow, cascadeSalinity, cascadePh)}
                  disabled={loadingCascade}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${loadingCascade ? 'animate-spin' : ''}`} />
                  <span>{loadingCascade ? 'Calculando Propagación...' : '⚡ Procesar Propagación en Cascada'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3D STEPPED TOPOLOGY & CASCADE TIMELINE */}
          <div className="lg:col-span-8 space-y-6">
            {loadingCascade && (
              <div className="h-96 flex flex-col items-center justify-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Modelando gradiente hidráulico de Manning y propagación de onda...</p>
              </div>
            )}

            {!loadingCascade && cascadeResult && (
              <>
                {/* STEPPED 3D TOPOLOGY VISUALIZATION WITH HYDRAULIC PULSE */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-500" />
                        Topología Escalonada 3D del Río Chancay & Trayectoria de Onda
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {cascadeResult.resumen_cascada}
                      </p>
                    </div>
                    {isSimulatingCascadeAnim && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 animate-pulse border border-cyan-500/30">
                        🌊 Onda en Movimiento
                      </span>
                    )}
                  </div>

                  {/* Stepped elevation cards (Cabecera -> Media -> Valle) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                    {cascadeResult.secuencia_nodos?.map((hop, idx) => (
                      <div
                        key={hop.id_nodo}
                        className={`p-4 rounded-xl border relative transition-all duration-300 ${
                          hop.orden_secuencia === 0
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-900 dark:text-cyan-200 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                        style={{
                          transform: `translateY(${idx * 4}px)`
                        }}
                      >
                        {/* Elevation Tag */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                          <span>Paso #{hop.orden_secuencia + 1}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">▲ {hop.cota_msnm} msnm</span>
                        </div>

                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate" title={hop.nombre}>
                          {hop.nombre}
                        </h4>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 font-mono">
                          +{hop.distancia_acumulada_km} km • {hop.sector_cuenca}
                        </div>

                        {/* Lead Time Badge */}
                        <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-center font-mono">
                          <span className="text-[10px] text-slate-500 block">Lead Time de Frente:</span>
                          <span className="text-sm font-black text-cyan-600 dark:text-cyan-400 block">
                            {hop.lead_time_frente_legible}
                          </span>
                        </div>

                        {/* Gate Status */}
                        <div className="mt-2 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full block truncate ${
                            hop.estado_compuerta_recomendado.includes('Cerrar')
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : hop.estado_compuerta_recomendado.includes('Monitoreo')
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {hop.estado_compuerta_recomendado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HOP-BY-HOP DETAILED TABLE */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl overflow-hidden">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-500" />
                    Cronograma de Llegada y Prescripción de Compuertas por Estación
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold font-sans">
                          <th className="pb-3">Estación / Nodo</th>
                          <th className="pb-3">Cota (msnm)</th>
                          <th className="pb-3">Distancia (km)</th>
                          <th className="pb-3">Velocidad Flujo</th>
                          <th className="pb-3">Lead Time Frente</th>
                          <th className="pb-3">Salinidad Llegada</th>
                          <th className="pb-3">Acción Compuerta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {cascadeResult.secuencia_nodos?.map((hop) => (
                          <tr key={hop.id_nodo} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-3 font-sans font-bold text-slate-900 dark:text-white pr-2">
                              {hop.nombre}
                              <span className="text-[10px] text-slate-500 block font-mono">{hop.id_nodo}</span>
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">{hop.cota_msnm} m</td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">+{hop.distancia_acumulada_km} km</td>
                            <td className="py-3 text-cyan-600 dark:text-cyan-400 font-bold">{hop.velocidad_media_kmh} km/h</td>
                            <td className="py-3 text-emerald-600 dark:text-emerald-400 font-black">{hop.lead_time_frente_legible}</td>
                            <td className="py-3 text-amber-600 dark:text-amber-400 font-bold">{hop.salinidad_estimada_llegada_ec} µS/cm</td>
                            <td className="py-3 font-sans">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                hop.estado_compuerta_recomendado.includes('Cerrar')
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                  : hop.estado_compuerta_recomendado.includes('Monitoreo')
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                              }`}>
                                {hop.estado_compuerta_recomendado}
                              </span>
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
      {/* 2. AUDITORÍA DE DESVÍOS DE LA MITA (TURNOS & BOCATOMAS) */}
      {/* ========================================================================= */}
      {activeTab === 'mita_audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm dark:shadow-xl">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Auditoría de Sobre-Extracción en Bocatoma
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cuantifica el impacto de extracciones no autorizadas sobre los turnos de riego de los regantes aguas abajo y el caudal ecológico.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bocatoma / Nodo Infractor:</label>
                  <select
                    value={mitaInfractorNode}
                    onChange={(e) => setMitaInfractorNode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    {nodes.map(n => (
                      <option key={n.id_nodo} value={n.id_nodo}>
                        {n.id_nodo} - {n.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Caudal Extraído en Exceso:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{mitaExcessLs} l/s ({(mitaExcessLs / 1000).toFixed(3)} m³/s)</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="2000"
                    step="10"
                    value={mitaExcessLs}
                    onChange={(e) => setMitaExcessLs(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Duración de Sobre-Extracción:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{mitaDurationHours} Horas</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="48.0"
                    step="0.5"
                    value={mitaDurationHours}
                    onChange={(e) => setMitaDurationHours(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Caudal Nominal del Canal Troncal:</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{mitaNominalFlowM3s.toFixed(2)} m³/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="5.00"
                    step="0.1"
                    value={mitaNominalFlowM3s}
                    onChange={(e) => setMitaNominalFlowM3s(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => executeMitaAudit(mitaInfractorNode, mitaExcessLs, mitaDurationHours, mitaNominalFlowM3s)}
                  disabled={loadingMita}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${loadingMita ? 'animate-spin' : ''}`} />
                  <span>{loadingMita ? 'Auditando...' : '⚡ Procesar Auditoría de La Mita'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {!loadingMita && mitaResult && (
              <>
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Dictamen Forense de Gobernanza de La Mita
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Nodo Infractor: <span className="font-bold text-rose-600 dark:text-rose-400">{mitaResult.id_nodo_infractor}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                    {mitaResult.dictamen_auditoria}
                  </p>

                  {/* KPIS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono pt-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-sans text-slate-500 block">Volumen Sustraído</span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">{mitaResult.volumen_total_sustraido_m3.toLocaleString()} m³</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-sans text-slate-500 block">Retraso Turno Valle</span>
                      <span className="text-sm font-black text-amber-600 dark:text-amber-400">+{mitaResult.retraso_turno_valle_horas} Horas</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-sans text-slate-500 block">Déficit Hectáreas</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{mitaResult.deficit_hectareas_afectadas} ha</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-sans text-slate-500 block">Caudal Ecológico</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 truncate block font-sans">
                        {mitaResult.impacto_caudal_ecologico}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRESCRIPTOR DE DILUCIÓN HIDRÁULICA */}
      {/* ========================================================================= */}
      {activeTab === 'dilution_prescribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm dark:shadow-xl">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Prescriptor de Desembalse para Lavado Salino
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calcula el volumen y caudal de descarga de reserva pura requeridos para neutralizar la salinidad antes de las bocatomas de riego.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Salinidad Actual en Río (EC):</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{dilutionCurrentEc} µS/cm</span>
                  </div>
                  <input
                    type="range"
                    min="600"
                    max="6000"
                    step="50"
                    value={dilutionCurrentEc}
                    onChange={(e) => setDilutionCurrentEc(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Caudal Base en Río:</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{dilutionCurrentFlow.toFixed(2)} m³/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="5.00"
                    step="0.05"
                    value={dilutionCurrentFlow}
                    onChange={(e) => setDilutionCurrentFlow(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Salinidad Objetivo Máxima (EC):</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{dilutionTargetEc} µS/cm</span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="2000"
                    step="50"
                    value={dilutionTargetEc}
                    onChange={(e) => setDilutionTargetEc(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">CE Represa Pura:</label>
                    <input
                      type="number"
                      value={dilutionDamEc}
                      onChange={(e) => setDilutionDamEc(parseFloat(e.target.value) || 150)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ventana Lavado (h):</label>
                    <input
                      type="number"
                      value={dilutionHours}
                      onChange={(e) => setDilutionHours(parseInt(e.target.value) || 8)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={() => executeDilutionPrescription(dilutionCurrentEc, dilutionCurrentFlow, dilutionTargetEc, dilutionDamEc, dilutionHours)}
                  disabled={loadingDilution}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${loadingDilution ? 'animate-spin' : ''}`} />
                  <span>{loadingDilution ? 'Calculando Prescripción...' : '⚡ Calcular Prescripción de Lavado'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {!loadingDilution && dilutionResult && (
              <>
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-500" />
                      Prescripción Operativa de Compuerta de Represa
                    </h3>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {dilutionResult.factibilidad_operativa}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                    {dilutionResult.prescripcion_tecnica}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono pt-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-sans text-slate-500 block">Descarga Requerida</span>
                      <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                        {dilutionResult.caudal_descarga_requerido_m3s} m³/s
                      </span>
                      <span className="text-[10px] text-slate-400 block">{dilutionResult.caudal_descarga_requerido_ls} l/s</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-sans text-slate-500 block">Volumen Desembalse</span>
                      <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                        {dilutionResult.volumen_total_desembalse_mmc} MMC
                      </span>
                      <span className="text-[10px] text-slate-400 block">{dilutionResult.volumen_total_desembalse_m3.toLocaleString()} m³</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-sans text-slate-500 block">Caudal Resultante Río</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {dilutionResult.caudal_total_resultante_m3s} m³/s
                      </span>
                      <span className="text-[10px] text-slate-400 block">CE meta: {dilutionResult.salinidad_objetivo_ec} µS/cm</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BALANCE HÍDRICO & CÉDULA DE CULTIVO (MIDAGRI) */}
      {/* ========================================================================= */}
      {activeTab === 'cedula_whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SLIDERS & CONFIG */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Parámetros Hidrológicos del Valle
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Región: {selectedRegion}</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Caudal Asignado (Q):</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{availableFlow.toFixed(2)} m³/s ({(availableFlow * 1000).toFixed(0)} l/s)</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="5.00"
                    step="0.05"
                    value={availableFlow}
                    onChange={(e) => setAvailableFlow(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Conductividad Eléctrica (EC):</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{ecParam} µS/cm</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="5000"
                    step="50"
                    value={ecParam}
                    onChange={(e) => setEcParam(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300">pH Agua:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{phParam.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="9.5"
                      step="0.1"
                      value={phParam}
                      onChange={(e) => setPhParam(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300">Turbidez:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{turbidityParam} NTU</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="300"
                      step="5"
                      value={turbidityParam}
                      onChange={(e) => setTurbidityParam(parseFloat(e.target.value))}
                      className="w-full accent-slate-400 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Tecnología de Riego:</label>
                    <select
                      value={irrigationType}
                      onChange={(e) => setIrrigationType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="gravity">Gravedad (55% Ef.)</option>
                      <option value="sprinkler">Aspersión (75% Ef.)</option>
                      <option value="drip">Goteo (88% Ef.)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Tarifa Agua (S/./m³):</label>
                    <input
                      type="number"
                      step="0.005"
                      value={waterTariff}
                      onChange={(e) => setWaterTariff(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* PROCESS BUTTON */}
                <button
                  onClick={() => executeCedulaSimulation(cropDistribution, availableFlow, ecParam, phParam, turbidityParam, tempWaterParam, irrigationType, waterTariff, selectedRegion)}
                  disabled={loadingSim}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${loadingSim ? 'animate-spin' : ''}`} />
                  <span>{loadingSim ? 'Calculando Balance...' : '⚡ Procesar Simulación de Cédula'}</span>
                </button>
              </div>
            </div>

            {/* CROP HECTARES DISTRIBUTION WITH CHECKBOXES */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Cédula de Siembra
                </h2>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                  {['TODAS', 'Costa', 'Sierra', 'Selva'].map(z => (
                    <button
                      key={z}
                      onClick={() => setNaturalZoneFilter(z)}
                      className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                        naturalZoneFilter === z ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crops list with checkbox */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-700">
                {displayedCrops.map(crop => {
                  const isChecked = cropDistribution[crop.crop_id] !== undefined;
                  const ha = cropDistribution[crop.crop_id] || '';

                  return (
                    <div
                      key={crop.crop_id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isChecked
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-500/40 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 pr-2">
                        {/* CHECKBOX */}
                        <button
                          type="button"
                          onClick={() => toggleCropInCedula(crop.crop_id)}
                          className="text-emerald-600 dark:text-emerald-400 cursor-pointer focus:outline-none"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                          )}
                        </button>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{crop.name}</span>
                            {getZoneBadge(crop.region_natural)}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <span>💧 {crop.water_demand_m3_ha} m³/ha</span>
                            <span>⚡ CE: {crop.ec_threshold_us_cm} µS/cm</span>
                          </div>
                        </div>
                      </div>

                      {/* HECTARES INPUT */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="0"
                          min="1"
                          max="10000"
                          disabled={!isChecked}
                          value={ha}
                          onChange={(e) => handleHaChange(crop.crop_id, e.target.value)}
                          className={`w-20 rounded-lg px-2.5 py-1.5 text-right text-xs font-mono font-bold focus:outline-none transition-all ${
                            isChecked
                              ? 'bg-white dark:bg-slate-900 border border-emerald-500 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-200/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ha</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RESULTS */}
          <div className="lg:col-span-7 space-y-6">
            {!loadingSim && simResult && (
              <>
                {/* KPIS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm dark:shadow-lg">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-500" />
                      Área Total
                    </span>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{simResult.total_planned_ha} ha</div>
                    <span className="text-[10px] text-slate-400 font-mono">{simResult.crops_summary?.length || 0} cultivos activos</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm dark:shadow-lg">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                      Demanda vs Oferta
                    </span>
                    <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                      {simResult.gross_water_demand_mmc} <span className="text-xs text-slate-400">/ {simResult.water_availability_mmc} MMC</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Cobertura: {simResult.water_coverage_pct}%</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm dark:shadow-lg">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                      Pérdida Económica
                    </span>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                      S/. {(simResult.total_economic_loss_s / 1000).toFixed(1)}k
                    </div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold font-mono">-{simResult.total_loss_pct}% del potencial</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1 shadow-sm dark:shadow-lg">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      Margen Neto
                    </span>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      S/. {(simResult.net_agricultural_margin_s / 1000).toFixed(1)}k
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Deducido agua y filtración</span>
                  </div>
                </div>

                {/* WATER BALANCE BANNER */}
                <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-lg ${
                  simResult.water_deficit_mmc === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {simResult.water_deficit_mmc === 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      )}
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {simResult.water_balance_status} ({simResult.water_coverage_pct}% cubierto)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {simResult.water_deficit_mmc === 0
                        ? `Oferta hídrica de ${simResult.water_availability_mmc} MMC cubre satisfactoriamente la demanda de ${simResult.gross_water_demand_mmc} MMC.`
                        : `Déficit de ${simResult.water_deficit_mmc} MMC. Requiere ajuste de turnos o tecnificación del riego.`}
                    </p>
                  </div>
                </div>

                {/* CROPS SUMMARY TABLE */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl overflow-hidden">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Evaluación por Cultivo en la Cédula Simulada
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold font-mono">
                          <th className="pb-3">Cultivo / Región</th>
                          <th className="pb-3">Área</th>
                          <th className="pb-3">Aptitud IA</th>
                          <th className="pb-3">Demanda MMC</th>
                          <th className="pb-3">Ingreso Estimado</th>
                          <th className="pb-3">Pérdida S/.</th>
                          <th className="pb-3">Sustituto Resiliente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        {simResult.crops_summary?.map((c) => (
                          <tr key={c.crop_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-3 pr-2">
                              <div className="font-sans font-bold text-slate-900 dark:text-white">{c.crop_name}</div>
                              <div className="text-[10px] text-slate-500 font-sans">{c.region_natural} • {c.category}</div>
                            </td>
                            <td className="py-3 text-slate-700 dark:text-slate-300 font-bold">{c.planned_ha} ha</td>
                            <td className="py-3">
                              <div className="space-y-1">
                                <div className="font-bold text-slate-900 dark:text-white">{c.suitability_score}%</div>
                                {getStatusBadge(c.status_color, c.status)}
                              </div>
                            </td>
                            <td className="py-3 text-cyan-600 dark:text-cyan-400">{c.water_demand_mmc} MMC</td>
                            <td className="py-3 text-emerald-600 dark:text-emerald-400 font-bold">S/. {(c.stressed_revenue_s / 1000).toFixed(1)}k</td>
                            <td className="py-3">
                              {c.economic_loss_s > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">
                                  -S/. {(c.economic_loss_s / 1000).toFixed(1)}k ({c.loss_pct}%)
                                </span>
                              ) : (
                                <span className="text-slate-400">S/. 0</span>
                              )}
                            </td>
                            <td className="py-3 font-sans">
                              {c.substitutes && c.substitutes.length > 0 ? (
                                <div className="space-y-0.5">
                                  <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {c.substitutes[0].crop_name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">
                                    Ahorro: {c.substitutes[0].water_saving_m3_ha} m³/ha
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Cultivo Óptimo</span>
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
      {/* 5. ESTRÉS POR CALIDAD DE AGUA (MONOCULTIVO) */}
      {/* ========================================================================= */}
      {activeTab === 'stress_whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm dark:shadow-xl">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Cultivo & Variables Físico-Químicas
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Simula la respuesta agronómica y financiera ante alteraciones del agua de riego.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cultivo a Evaluar:</label>
                  <select
                    value={stressCropId}
                    onChange={(e) => setStressCropId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                  >
                    <optgroup label="🌊 Costa">
                      {cropsCatalog.filter(c => c.region_natural === 'Costa').map(c => (
                        <option key={c.crop_id} value={c.crop_id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🏔️ Sierra">
                      {cropsCatalog.filter(c => c.region_natural === 'Sierra').map(c => (
                        <option key={c.crop_id} value={c.crop_id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🌴 Selva">
                      {cropsCatalog.filter(c => c.region_natural === 'Selva').map(c => (
                        <option key={c.crop_id} value={c.crop_id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🌱 Resilientes IA">
                      {cropsCatalog.filter(c => c.category?.startsWith('Resilientes')).map(c => (
                        <option key={c.crop_id} value={c.crop_id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Conductividad Eléctrica (CE):</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{stressEc} µS/cm</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="8000"
                    step="50"
                    value={stressEc}
                    onChange={(e) => setStressEc(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">pH del Agua:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{stressPh.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="10.0"
                    step="0.1"
                    value={stressPh}
                    onChange={(e) => setStressPh(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300">Turbidez:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{stressTurbidity} NTU</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      value={stressTurbidity}
                      onChange={(e) => setStressTurbidity(parseFloat(e.target.value))}
                      className="w-full accent-slate-400 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300">Temperatura:</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{stressTemp.toFixed(1)} °C</span>
                    </div>
                    <input
                      type="range"
                      min="8.0"
                      max="38.0"
                      step="0.5"
                      value={stressTemp}
                      onChange={(e) => setStressTemp(parseFloat(e.target.value))}
                      className="w-full accent-rose-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={() => executeStressSimulation(stressCropId, stressEc, stressPh, stressTurbidity, stressTemp, stressWaterRatio, selectedRegion)}
                  disabled={loadingStress}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${loadingStress ? 'animate-spin' : ''}`} />
                  <span>{loadingStress ? 'Evaluando...' : '⚡ Evaluar Estrés Biofísico'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {!loadingStress && stressResult && (
              <>
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{stressResult.crop_name}</h3>
                        {getZoneBadge(stressResult.region_natural)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Resiliencia: <span className="font-bold text-slate-900 dark:text-white">{stressResult.resilience_level}</span> • Rendimiento base: {stressResult.base_yield_kg_ha} kg/ha
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(stressResult.status_color, stressResult.status)}
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-black text-lg text-slate-900 dark:text-white">
                        {stressResult.suitability_score}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-sans text-slate-500 block">Rendimiento Esperado</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{stressResult.expected_yield_kg_ha} kg/ha</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-sans text-slate-500 block">Precio en Chacra</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">S/. {stressResult.farmgate_price_s_kg.toFixed(2)} /kg</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-sans text-slate-500 block">Ingreso / Hectárea</span>
                      <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">S/. {stressResult.stressed_revenue_ha_s.toLocaleString()}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-sans text-slate-500 block">Pérdida por Estrés</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        S/. {stressResult.economic_loss_ha_s.toLocaleString()} /ha
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 GAUGES */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Cinética de Factores Biofísicos
                  </h3>

                  <div className="space-y-3 font-mono">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-600 dark:text-slate-300">1. Retención Salina (k_sal):</span>
                        <span className="font-bold text-cyan-600 dark:text-cyan-400">{stressResult.salinity_retention_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${stressResult.salinity_retention_pct}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans block">{stressResult.diagnostics?.salinity}</span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-slate-600 dark:text-slate-300">2. Nutrición por pH (k_ph):</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{stressResult.ph_factor_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${stressResult.ph_factor_pct}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans block">{stressResult.diagnostics?.ph}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. FACTIBILIDAD DE INTENCIONES ENA */}
      {/* ========================================================================= */}
      {activeTab === 'ena_intentions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm dark:shadow-xl">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Auditoría de Siembra ENA vs Río
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cruza las intenciones de siembra declaradas en la Encuesta Nacional Agraria con el caudal asignado al valle.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Caudal Asignado a la Cuenca:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{enaFlow.toFixed(2)} m³/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="5.00"
                    step="0.05"
                    value={enaFlow}
                    onChange={(e) => setEnaFlow(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Sistema de Riego Predominante:</label>
                  <select
                    value={enaIrrigation}
                    onChange={(e) => setEnaIrrigation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="gravity">Gravedad Tradicional (55% Eficiencia)</option>
                    <option value="sprinkler">Aspersión Mixta (75% Eficiencia)</option>
                    <option value="drip">Goteo Tecnificado (88% Eficiencia)</option>
                  </select>
                </div>

                <button
                  onClick={() => executeEnaAudit(selectedRegion, enaFlow, enaIrrigation)}
                  disabled={loadingEna}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${loadingEna ? 'animate-spin' : ''}`} />
                  <span>{loadingEna ? 'Auditando...' : '⚡ Auditar Factibilidad ENA'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {!loadingEna && enaResult && (
              <>
                <div className={`p-5 rounded-2xl border space-y-2 shadow-sm dark:shadow-xl ${
                  enaResult.verdict_color === 'green'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                    : enaResult.verdict_color === 'yellow'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{enaResult.verdict}</h3>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-sans">{enaResult.recommendation}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-sans text-slate-500 block">Área Declarada</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">{enaResult.total_declared_ha.toLocaleString()} ha</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-sans text-slate-500 block">Demanda Total</span>
                    <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">{enaResult.total_intentions_demand_mmc} MMC</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-sans text-slate-500 block">Área Asegurada</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{enaResult.hectares_secured_ha.toLocaleString()} ha</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                    <span className="text-[10px] font-sans text-slate-500 block">Área en Riesgo</span>
                    <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                      {enaResult.hectares_at_risk_ha.toLocaleString()} ha
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ESTADÍSTICAS & BENCHMARKS SIEA / ENA */}
      {/* ========================================================================= */}
      {activeTab === 'midagri_kpis' && regionalBenchmark && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Siniestros */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Causas de Pérdida Agrícola ({selectedRegion})
              </h3>
              <div className="space-y-2.5 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1 font-sans">
                    <span className="text-slate-600 dark:text-slate-300">Déficit Hídrico / Sequía</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{regionalBenchmark.loss_profile?.drought_deficit_pct || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${regionalBenchmark.loss_profile?.drought_deficit_pct || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-sans">
                    <span className="text-slate-600 dark:text-slate-300">Salinidad de Suelo</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{regionalBenchmark.loss_profile?.salinity_soil_pct || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${regionalBenchmark.loss_profile?.salinity_soil_pct || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Riego */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-500" />
                Tecnificación del Riego ({selectedRegion})
              </h3>
              <div className="space-y-3 font-mono text-xs pt-1">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-sans">Gravedad</span>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{regionalBenchmark.irrigation_profile?.gravity_pct || 65}%</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-sans">Aspersión</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{regionalBenchmark.irrigation_profile?.sprinkler_pct || 20}%</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-sans">Goteo</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{regionalBenchmark.irrigation_profile?.drip_pct || 15}%</span>
                </div>
              </div>
            </div>

            {/* Catalog Info */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Calibración de Microdatos
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-sans">Cultivos:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{cropsCatalog.length} variedades</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-sans">Departamentos:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">25 regiones (Perú)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 font-sans">SIEA / ENA:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">2017 - 2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfSimulatorView;
