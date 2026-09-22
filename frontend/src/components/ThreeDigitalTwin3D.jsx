import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useTheme } from '../context/ThemeContext';
import { nodesApi } from '../services/api';
import { 
  Layers, Eye, RotateCcw, Compass, Waves, Gauge, Zap, Activity, 
  Info, Sliders, Calendar, ChevronRight, ChevronLeft, ChevronDown, 
  ChevronUp, Maximize2, Settings, Radio, ShieldAlert, Cpu, Droplets, 
  ArrowUpRight, CheckCircle2, Mountain, Anchor, X, MapPin, Check, 
  ExternalLink, RefreshCw, BarChart3, Database
} from 'lucide-react';

export default function ThreeDigitalTwin3D({ onNavigateWhatIf, onNavigateMaintenance }) {
  const { isDark } = useTheme();
  const containerRef = useRef(null);
  const [scale, setScale] = useState('macro'); // 'macro' | 'laguna' | 'micro'
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedLagunaNode, setSelectedLagunaNode] = useState('ALL');
  const [macroPreset, setMacroPreset] = useState('general'); // 'general' | 'cabecera' | 'saume' | 'desembocadura'
  const [lagunaPreset, setLagunaPreset] = useState('general'); // 'general' | 'boya' | 'presa' | 'afluente'
  const [microPreset, setMicroPreset] = useState('general'); // 'general' | 'nodo' | 'ultrasonico' | 'molinete' | 'tinas'
  const [showWireframe, setShowWireframe] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [dataLayer, setDataLayer] = useState('wqi'); // 'wqi' | 'velocity' | 'bathymetry'

  // DB Nodes sync state & Inspector Drawer state
  const [dbNodes, setDbNodes] = useState([]);
  const [selectedDbNode, setSelectedDbNode] = useState(null);
  const [loadingDbNodes, setLoadingDbNodes] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('telemetry'); // 'telemetry' | 'quality' | 'operations'
  const dbNodesGroupRef = useRef(new THREE.Group());
  const nodePositionsRef = useRef({});

  // Dynamic Hydraulic Calibration State for Active Station
  const [activeCalibration, setActiveCalibration] = useState(null);
  const activeCalibrationRef = useRef(null);
  const calibrationsCacheRef = useRef({});

  // Carga reactiva de calibración física y batimétrica desde el backend
  const loadCalibrationForNode = async (nodeId) => {
    if (!nodeId) return null;
    if (calibrationsCacheRef.current[nodeId]) {
      const cached = calibrationsCacheRef.current[nodeId];
      setActiveCalibration(cached);
      activeCalibrationRef.current = cached;
      return cached;
    }
    try {
      const res = await nodesApi.getNodeCalibration(nodeId);
      if (res.data) {
        calibrationsCacheRef.current[nodeId] = res.data;
        setActiveCalibration(res.data);
        activeCalibrationRef.current = res.data;
        return res.data;
      }
    } catch (err) {
      console.warn(`No se pudo cargar calibración para nodo ${nodeId}:`, err);
    }
    return null;
  };


  // Helper de identificación hidrológica según cota y nombre
  const isLagunaNode = (node) => {
    if (!node) return false;
    const cota = Number(node.cota_msnm) || 0;
    const name = (node.nombre || '').toLowerCase();
    const sector = (node.tramo_sector || node.sector_cuenca || '').toLowerCase();
    return cota >= 3800 || name.includes('laguna') || name.includes('embalse') || sector.includes('laguna');
  };

  const isSeaNode = (node) => {
    if (!node) return false;
    const cota = Number(node.cota_msnm) || 0;
    const name = (node.nombre || '').toLowerCase();
    const sector = (node.tramo_sector || node.sector_cuenca || '').toLowerCase();
    return cota <= 100 || name.includes('mar') || name.includes('desembocadura') || name.includes('pacifico') || sector.includes('desembocadura');
  };

  const hasLagunaNode = dbNodes.some(isLagunaNode);
  const hasSeaNode = dbNodes.some(isSeaNode);

  // Cálculo geodésico Haversine en kilómetros
  const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
    const R = 6371.0088; // Radio medio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180.0) *
        Math.cos((lat2 * Math.PI) / 180.0) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Cálculo de distancias y perfiles topográficos reales a partir de la DB
  const topographyData = React.useMemo(() => {
    if (!dbNodes || dbNodes.length === 0) {
      return {
        sortedNodes: [],
        segments: [],
        cumulativeDistances: [],
        totalDistanceKm: 0,
        avgDistanceKm: 0,
        totalElevationDrop: 0,
        avgSlopePct: 0
      };
    }

    // Ordenar de cabecera a valle bajo (cota descendente)
    const sorted = [...dbNodes].sort((a, b) => (Number(b.cota_msnm) || 0) - (Number(a.cota_msnm) || 0));

    const segments = [];
    let cumDist = 0;
    const cumulativeDistances = [0];

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      const dKm = haversineDistanceKm(from.latitud, from.longitud, to.latitud, to.longitud);
      const deltaH = Math.max(0, (Number(from.cota_msnm) || 0) - (Number(to.cota_msnm) || 0));
      const slope = dKm > 0 ? (deltaH / (dKm * 1000.0)) * 100.0 : 0;
      cumDist += dKm;
      cumulativeDistances.push(cumDist);

      segments.push({
        from,
        to,
        distanceKm: dKm,
        deltaH,
        slopePct: slope,
        cumDistKm: cumDist
      });
    }

    const totalDist = cumDist;
    const avgDist = sorted.length > 1 ? totalDist / (sorted.length - 1) : 0;
    const totalDrop = sorted.length > 1 
      ? Math.max(0, (Number(sorted[0].cota_msnm) || 0) - (Number(sorted[sorted.length - 1].cota_msnm) || 0)) 
      : 0;
    const avgSlope = totalDist > 0 ? (totalDrop / (totalDist * 1000.0)) * 100.0 : 0;

    return {
      sortedNodes: sorted,
      segments,
      cumulativeDistances,
      totalDistanceKm: totalDist,
      avgDistanceKm: avgDist,
      totalElevationDrop: totalDrop,
      avgSlopePct: avgSlope
    };
  }, [dbNodes]);

  // Live telemetry state for River / Station (simulated 1.2s dynamic tick)
  const [telemetry, setTelemetry] = useState({
    tirante_cm: 138.4,
    caudal_m3s: 16.85,
    velocidad_ms: 1.36,
    froude: 0.38,
    area_m2: 12.4,
    ancho_m: 14.8,
    rpm_hall: 182,
    ph: 7.38,
    tds_us: 615,
    turbidez_ntu: 14.2,
    temp_c: 16.8,
    bateria_v: 4.18,
    bateria_pct: 98,
    manning_n: 0.035,
    last_sync: '1s'
  });

  // Live telemetry state for High-Andean Lagoon (simulated 1.5s dynamic tick)
  const [lagunaTelemetry, setLagunaTelemetry] = useState({
    cota_msnm: 4248.5,
    volumen_mmc: 18.42,
    capacidad_pct: 84.6,
    espejo_ha: 320,
    oxigeno_disuelto: 7.82,
    oxigeno_sat_pct: 92.4,
    clorofila_ugl: 1.85,
    temperatura_c: 8.4,
    ph: 7.28,
    conductividad_us: 112,
    turbidez_ntu: 2.1,
    descarga_ecologica_m3s: 1.45,
    estado_trofico: 'Oligotrófico (Agua Cristalina)',
    last_sync: '1s'
  });

  // Three.js instances ref
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const reqAnimRef = useRef(null);
  const objectsRef = useRef({
    waterMesh: null,
    molineteGroup: null,
    shaftMesh: null,
    microFlowParticles: null,
    microFlowVel: null,
    badgeUltrasonic: null,
    badgeMolinete: null,
    badgeTinas: null,
    badgeCabinet: null,
    waterTina1: null,
    waterTina2: null,
    weir: null,
    intakeCurve: null,
    outCurve: null,
    intakeParticles: null,
    outParticles: null,
    weirParticles: null,
    particles: null,
    targetCamPos: null,
    targetLookAt: null,
    macroGroup: null,
    lagunaGroup: null,
    microGroup: null,
    macroRiverMesh: null,
    lagunaWaterMesh: null,
    lagunaBuoyMesh: null
  });

  const lightsRef = useRef({
    ambientLight: null,
    sunLight: null,
    cyanPointLight: null,
  });

  const materialsRef = useRef({
    macroTerrainMat: null,
    macroRiverMat: null,
    macroSkirtMat: null,
    oceanMat: null,
    flowParticlesMat: null,
    riverBedMat: null,
    waterMat: null,
    lagunaTerrainMat: null,
    lagunaWaterMat: null,
    lagunaSkirtMat: null
  });

  const scaleRef = useRef(scale);
  const telemetryRef = useRef(telemetry);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  // Micro-fluctuation telemetry ticker for River
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry(prev => {
        const deltaRpm = (Math.random() - 0.5) * 4;
        const newRpm = Math.max(140, Math.min(220, Math.round(prev.rpm_hall + deltaRpm)));
        const deltaTirante = (Math.random() - 0.5) * 0.4;
        const newTirante = Number((prev.tirante_cm + deltaTirante).toFixed(1));
        const newVel = Number((newRpm * 0.00748).toFixed(2));
        const newCaudal = Number((newVel * prev.area_m2).toFixed(2));

        return {
          ...prev,
          rpm_hall: newRpm,
          tirante_cm: newTirante,
          velocidad_ms: newVel,
          caudal_m3s: newCaudal,
          ph: Number((7.36 + (Math.random() - 0.5) * 0.06).toFixed(2)),
          turbidez_ntu: Number((14.0 + (Math.random() - 0.5) * 0.6).toFixed(1)),
          last_sync: 'hace 1s'
        };
      });
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  // Micro-fluctuation telemetry ticker for High-Andean Lagoon
  useEffect(() => {
    const timer = setInterval(() => {
      setLagunaTelemetry(prev => {
        const deltaVol = (Math.random() - 0.5) * 0.02;
        const newVol = Number(Math.max(12, Math.min(22, prev.volumen_mmc + deltaVol)).toFixed(2));
        const newPct = Number(((newVol / 21.8) * 100).toFixed(1));
        const deltaOd = (Math.random() - 0.5) * 0.04;

        return {
          ...prev,
          volumen_mmc: newVol,
          capacidad_pct: newPct,
          cota_msnm: Number((4248.5 + (newVol - 18.42) * 0.15).toFixed(2)),
          oxigeno_disuelto: Number((prev.oxigeno_disuelto + deltaOd).toFixed(2)),
          turbidez_ntu: Number((2.1 + (Math.random() - 0.5) * 0.15).toFixed(1)),
          descarga_ecologica_m3s: Number((1.45 + (Math.random() - 0.5) * 0.03).toFixed(2)),
          temperatura_c: Number((8.4 + (Math.random() - 0.5) * 0.1).toFixed(1)),
          last_sync: 'hace 1s'
        };
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Fetch database nodes on mount
  const fetchDbNodes = () => {
    setLoadingDbNodes(true);
    nodesApi.getNodes()
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          setDbNodes(res.data);
          if (res.data.length > 0) {
            const firstNode = res.data[0];
            setSelectedDbNode(prev => prev || firstNode);
            setSelectedNodeId(prev => prev || firstNode.id_nodo);
            loadCalibrationForNode(firstNode.id_nodo);
          }
        }
      })
      .catch(err => {
        console.warn('No se pudieron obtener nodos desde API:', err);
      })
      .finally(() => setLoadingDbNodes(false));
  };

  useEffect(() => {
    fetchDbNodes();
  }, []);

  // ===================================================================
  // BADGES ESPACIALES 3D (HUD FLOTANTE SOBRE SENSORES EN TIEMPO REAL)
  // ===================================================================
  const updateSensorBadgeCanvas = (sprite, title, items, accentColor, dark) => {
    if (!sprite || !sprite.material || !sprite.material.map) return;
    const canvas = sprite.material.map.image;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 500;
    const h = 240;
    const x = 6;
    const y = 6;
    const r = 24;

    ctx.clearRect(0, 0, 512, 256);

    // Fondo del recuadro
    ctx.fillStyle = dark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fill();

    // Borde exterior
    ctx.lineWidth = 4;
    ctx.strokeStyle = accentColor;
    ctx.stroke();

    // Pastilla indicadora de color
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x + 18, y + 18, 10, 26, 5);
    } else {
      ctx.rect(x + 18, y + 18, 10, 26);
    }
    ctx.fill();

    // Título del sensor
    ctx.font = 'bold 24px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = dark ? '#f8fafc' : '#0f172a';
    ctx.fillText(title, x + 38, y + 39);

    // Separador horizontal
    ctx.strokeStyle = dark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 56);
    ctx.lineTo(x + w - 18, y + 56);
    ctx.stroke();

    // Filas de variables
    let curY = y + 96;
    items.forEach(item => {
      ctx.font = '600 20px "Inter", monospace';
      ctx.fillStyle = dark ? '#94a3b8' : '#64748b';
      ctx.fillText(item.label + ':', x + 24, curY);

      ctx.font = 'bold 23px "Inter", monospace';
      ctx.fillStyle = item.color || (dark ? '#38bdf8' : '#0284c7');
      ctx.fillText(String(item.value), x + 180, curY);
      curY += 40;
    });

    sprite.material.map.needsUpdate = true;
  };

  const createSensorBadgeSprite = (title, items, accentColor, dark, position, scale = [1.7, 0.85, 1]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(...position);
    sprite.scale.set(scale[0], scale[1], scale[2]);
    sprite.renderOrder = 999;
    sprite.userData = { title, accentColor };

    updateSensorBadgeCanvas(sprite, title, items, accentColor, dark);
    return sprite;
  };

  // ===================================================================
  // BUILDER PARAMÉTRICO DE ESTACIÓN MICRO-NODO (FÍSICA EXACTA & CERO DESBORDE)
  // ===================================================================
  const buildMicroStationScene = (microGroup, calibration, curTelemetry, darkTheme, objectsRef, materialsRef) => {
    if (!microGroup) return;

    // 1. Limpiar geometría anterior y liberar memoria GPU
    while (microGroup.children.length > 0) {
      const obj = microGroup.children[0];
      microGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
        else {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      }
    }

    // 2. Extraer parámetros geométricos reales de la base de datos
    const rawW = Number(calibration?.ancho_total_rio_m) || Number(calibration?.seccion_hidraulica?.ancho_total_rio_m) || 7.0;
    const W = Math.max(3.0, Math.min(35.0, rawW));
    const halfW = W / 2.0;

    // Dovelas batimétricas
    let points = calibration?.puntos_seccion || calibration?.seccion_hidraulica?.puntos_seccion || [];
    let sortedPts = [];
    if (Array.isArray(points) && points.length >= 2) {
      sortedPts = [...points].sort((a, b) => (Number(a.distancia_orilla_m) || 0) - (Number(b.distancia_orilla_m) || 0));
    }

    if (sortedPts.length < 2) {
      sortedPts = [
        { distancia_orilla_m: 0.0, profundidad_lecho_m: 0.0 },
        { distancia_orilla_m: W * 0.25, profundidad_lecho_m: 0.8 },
        { distancia_orilla_m: W * 0.50, profundidad_lecho_m: 1.4 },
        { distancia_orilla_m: W * 0.75, profundidad_lecho_m: 0.9 },
        { distancia_orilla_m: W, profundidad_lecho_m: 0.0 }
      ];
    }

    if (sortedPts[0].distancia_orilla_m > 0) {
      sortedPts.unshift({ distancia_orilla_m: 0.0, profundidad_lecho_m: 0.0 });
    }
    if (sortedPts[sortedPts.length - 1].distancia_orilla_m < W) {
      sortedPts.push({ distancia_orilla_m: W, profundidad_lecho_m: 0.0 });
    }

    // Mapeo a coordenadas locales centradas: X_k in [-halfW, +halfW], Y_k = -profundidad_lecho_m <= 0
    const mappedVerts = sortedPts.map(p => ({
      x: Number(p.distancia_orilla_m) - halfW,
      y: -Math.max(0, Number(p.profundidad_lecho_m) || 0),
      rawD: Number(p.distancia_orilla_m),
      rawY: Math.max(0, Number(p.profundidad_lecho_m) || 0)
    }));

    // Profundidad máxima del canal H_max
    let maxDepth = 0;
    mappedVerts.forEach(v => {
      if (v.rawY > maxDepth) maxDepth = v.rawY;
    });
    if (maxDepth <= 0.1) maxDepth = 1.4;

    // Función analítica continua del lecho transversal Y_bed(x)
    const getRiverbedY = (xVal) => {
      // Terraza izquierda natural (X < -halfW)
      if (xVal < -halfW) {
        const distL = -halfW - xVal;
        return 0.0 + Math.min(0.8, distL * 0.25) + Math.max(0, (distL - 3.2) * 0.12);
      }
      // Terraza derecha de operación (X > halfW)
      if (xVal > halfW) {
        const distR = xVal - halfW;
        if (distR <= 1.2) {
          return (distR / 1.2) * 0.8;
        } else {
          return 0.8 + Math.min(0.2, (distR - 1.2) * 0.02);
        }
      }
      // Interpolación continua entre dovelas del cauce [-halfW, +halfW]
      for (let i = 0; i < mappedVerts.length - 1; i++) {
        const pA = mappedVerts[i];
        const pB = mappedVerts[i + 1];
        if (xVal >= pA.x && xVal <= pB.x) {
          const segW = pB.x - pA.x;
          if (segW <= 0.0001) return pA.y;
          const u = (xVal - pA.x) / segW;
          return pA.y + u * (pB.y - pA.y);
        }
      }
      return -maxDepth;
    };

    // 3. CÁLCULO DE LÁMINA DE AGUA CON AJUSTE EXACTO (CERO DESBORDE)
    const tiranteM = Math.max(0.2, Math.min(maxDepth * 1.5, (curTelemetry?.tirante_cm || 138.4) / 100.0));
    let waterY = -maxDepth + tiranteM;
    // Borde libre de seguridad: no sobrepasar la cota 0 de las orillas
    waterY = Math.min(-0.04, Math.max(-maxDepth + 0.15, waterY));

    // Intersección exacta de cota de agua con orilla izquierda
    let xWaterLeft = -halfW;
    for (let i = 0; i < mappedVerts.length - 1; i++) {
      const pA = mappedVerts[i];
      const pB = mappedVerts[i + 1];
      if (pA.y >= waterY && pB.y <= waterY && Math.abs(pB.y - pA.y) > 0.0001) {
        const u = (waterY - pA.y) / (pB.y - pA.y);
        xWaterLeft = pA.x + u * (pB.x - pA.x);
        break;
      }
    }

    // Intersección exacta de cota de agua con orilla derecha
    let xWaterRight = halfW;
    for (let i = mappedVerts.length - 1; i > 0; i--) {
      const pB = mappedVerts[i];
      const pA = mappedVerts[i - 1];
      if (pB.y >= waterY && pA.y <= waterY && Math.abs(pB.y - pA.y) > 0.0001) {
        const u = (waterY - pA.y) / (pB.y - pA.y);
        xWaterRight = pA.x + u * (pB.x - pA.x);
        break;
      }
    }

    xWaterLeft = Math.max(-halfW, xWaterLeft);
    xWaterRight = Math.min(halfW, xWaterRight);
    const activeWaterWidth = Math.max(1.0, xWaterRight - xWaterLeft);
    const centerWaterX = (xWaterLeft + xWaterRight) / 2.0;

    // Almacenar parámetros en ref para presets de cámara, anti-clipping y animación
    if (objectsRef && objectsRef.current) {
      objectsRef.current.microParams = {
        W,
        H_max: maxDepth,
        waterY,
        B_water: activeWaterWidth,
        X_water: centerWaterX,
        xWaterLeft,
        xWaterRight,
        mappedVerts
      };
      objectsRef.current.baseWaterY = waterY;
    }

    // 4. LECHO FLUVIAL Y TALUDES NATURALES 3D
    const riverBedWidth = W + 24.0;
    const riverBedLength = 28.0;
    const bedGeo = new THREE.PlaneGeometry(riverBedWidth, riverBedLength, 96, 24);
    bedGeo.rotateX(-Math.PI / 2);
    const bPos = bedGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const vx = bPos.getX(i);
      const vy = getRiverbedY(vx);
      bPos.setY(i, vy);
    }
    bedGeo.computeVertexNormals();

    const riverBedMat = new THREE.MeshStandardMaterial({
      color: darkTheme ? 0x1e293b : 0x64748b,
      roughness: 0.85,
      metalness: 0.1
    });
    if (materialsRef && materialsRef.current) materialsRef.current.riverBedMat = riverBedMat;

    const riverBedMesh = new THREE.Mesh(bedGeo, riverBedMat);
    riverBedMesh.position.set(0, 0, 0);
    riverBedMesh.receiveShadow = true;
    microGroup.add(riverBedMesh);

    // 5. ESPEJO DE AGUA MILIMÉTRICO (CERO SOBREPASO DE ORILLA A ORILLA & ANIMACIÓN DINÁMICA)
    const waterGeo = new THREE.PlaneGeometry(activeWaterWidth, riverBedLength, 48, 36);
    waterGeo.rotateX(-Math.PI / 2);
    // Guardar posiciones base de vértices para deformación de oleaje dinámico
    waterGeo.userData.basePositions = new Float32Array(waterGeo.attributes.position.array);

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: darkTheme ? 0x06b6d4 : 0x0284c7,
      transparent: true,
      opacity: darkTheme ? 0.78 : 0.86,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.65,
      ior: 1.333
    });
    if (materialsRef && materialsRef.current) materialsRef.current.waterMat = waterMat;

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(centerWaterX, waterY, 0);
    waterMesh.receiveShadow = true;
    microGroup.add(waterMesh);
    if (objectsRef && objectsRef.current) objectsRef.current.waterMesh = waterMesh;

    // Partículas de flujo superficial / espuma desplazándose en +Z río abajo
    const microFlowCount = 150;
    const microFlowGeo = new THREE.BufferGeometry();
    const microFlowPos = new Float32Array(microFlowCount * 3);
    const microFlowVel = new Float32Array(microFlowCount);
    for (let i = 0; i < microFlowCount; i++) {
      microFlowPos[i * 3] = (Math.random() - 0.5) * (activeWaterWidth * 0.90);
      microFlowPos[i * 3 + 1] = 0.02; // 2cm sobre la lámina
      microFlowPos[i * 3 + 2] = (Math.random() - 0.5) * riverBedLength;
      microFlowVel[i] = 0.85 + Math.random() * 0.35;
    }
    microFlowGeo.setAttribute('position', new THREE.BufferAttribute(microFlowPos, 3));
    const microFlowMat = new THREE.PointsMaterial({
      color: darkTheme ? 0xbae6fd : 0xffffff,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const microFlowParticles = new THREE.Points(microFlowGeo, microFlowMat);
    microFlowParticles.position.set(centerWaterX, waterY, 0);
    microGroup.add(microFlowParticles);
    if (objectsRef && objectsRef.current) {
      objectsRef.current.microFlowParticles = microFlowParticles;
      objectsRef.current.microFlowVel = microFlowVel;
    }

    // 6. MÁSTIL, BRAZO VOLADIZO Y SENSOR ULTRASÓNICO CON HUD ESPACIAL
    const armGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });

    const mastX = halfW + 0.4;
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.0);
    const mast = new THREE.Mesh(mastGeo, metalMat);
    mast.position.set(mastX, 2.5, 0);
    mast.castShadow = true;
    armGroup.add(mast);

    const beamLength = (mastX - centerWaterX) + 0.6;
    const beamGeo = new THREE.BoxGeometry(beamLength, 0.12, 0.12);
    const beam = new THREE.Mesh(beamGeo, metalMat);
    const beamCenterX = mastX - (beamLength / 2.0) + 0.3;
    beam.position.set(beamCenterX, 4.4, 0);
    beam.castShadow = true;
    armGroup.add(beam);

    const ultraSensorGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.3);
    const sensorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const ultraSensor = new THREE.Mesh(ultraSensorGeo, sensorMat);
    ultraSensor.position.set(centerWaterX, 4.25, 0);
    armGroup.add(ultraSensor);

    // Cono acústico que desciende exactamente hasta la lámina de agua
    const coneHeight = Math.max(1.0, 4.1 - waterY);
    const coneGeo = new THREE.ConeGeometry(0.85, coneHeight, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const acousticCone = new THREE.Mesh(coneGeo, coneMat);
    acousticCone.rotation.x = Math.PI;
    acousticCone.position.set(centerWaterX, 4.1 - (coneHeight / 2.0), 0);
    armGroup.add(acousticCone);
    if (objectsRef && objectsRef.current) objectsRef.current.acousticCone = acousticCone;

    microGroup.add(armGroup);

    // Badge espacial del sensor ultrasónico (más pequeño y nítido al zoom)
    const badgeUltrasonic = createSensorBadgeSprite('Sensor Ultrasónico', [
      { label: 'Tirante', value: `${curTelemetry?.tirante_cm || 138.4} cm`, color: '#38bdf8' },
      { label: 'Cota Agua', value: `${waterY.toFixed(2)} m`, color: '#22d3ee' },
      { label: 'Eco Acústico', value: '40 kHz (OK)', color: '#4ade80' }
    ], '#06b6d4', darkTheme, [centerWaterX, 4.85, 0], [1.15, 0.58, 1]);
    microGroup.add(badgeUltrasonic);
    if (objectsRef && objectsRef.current) objectsRef.current.badgeUltrasonic = badgeUltrasonic;

    // 7. MOLINETE HALL DE SUPERFICIE CON EJE ELEVADO Y DESPLAZAMIENTO A 1/4 DEL ANCHO DEL RÍO
    // Posicionado en el cuarto transversal para eliminar cualquier superposición o interferencia con el sensor ultrasónico central
    const xMolinete = halfW - (W * 0.25); // Vertical a 1/4 del ancho del río desde la orilla derecha
    const molineteY = 1.35; // Eje elevado sobre cota de desborde y alineado con sensor Hall ribereño
    const shaftToWaterDist = molineteY - waterY;
    const bladeSubmersion = 0.18; // Álabes inferiores sumergidos exactamente 18 cm
    const molineteRadius = Math.max(1.3, shaftToWaterDist + bladeSubmersion);
    const armRadius = molineteRadius * 0.72;
    const paddleDist = molineteRadius * 0.88;
    const paddleHeight = molineteRadius * 0.22;

    const molineteGroup = new THREE.Group();
    molineteGroup.position.set(xMolinete, molineteY, 0);

    const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.42, 16);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    molineteGroup.add(hub);

    for (let b = 0; b < 8; b++) {
      const angle = (b / 8) * Math.PI * 2;
      const bladeArmGeo = new THREE.BoxGeometry(0.04, armRadius, 0.04);
      const bladeArm = new THREE.Mesh(bladeArmGeo, metalMat);
      bladeArm.position.set(0, Math.cos(angle) * (armRadius / 2.0), Math.sin(angle) * (armRadius / 2.0));
      bladeArm.rotation.x = angle;
      molineteGroup.add(bladeArm);

      const paddleGeo = new THREE.BoxGeometry(0.42, paddleHeight, 0.025);
      const paddleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.35, roughness: 0.2 });
      const paddle = new THREE.Mesh(paddleGeo, paddleMat);
      paddle.position.set(0, Math.cos(angle) * paddleDist, Math.sin(angle) * paddleDist);
      paddle.rotation.x = angle;
      molineteGroup.add(paddle);
    }
    microGroup.add(molineteGroup);
    if (objectsRef && objectsRef.current) objectsRef.current.molineteGroup = molineteGroup;

    // Badge espacial del Molinete centrado sobre su vertical en xMolinete (más pequeño al zoom)
    const badgeMolinete = createSensorBadgeSprite('Molinete Hidrométrico', [
      { label: 'Sensor Hall', value: `${curTelemetry?.rpm_hall || 182} RPM`, color: '#38bdf8' },
      { label: 'Velocidad', value: `${curTelemetry?.velocidad_ms || 1.36} m/s`, color: '#22d3ee' },
      { label: 'Caudal Q', value: `${curTelemetry?.caudal_m3s || 16.85} m³/s`, color: '#4ade80' }
    ], '#3b82f6', darkTheme, [xMolinete, molineteY + molineteRadius + 0.35, 0], [1.15, 0.58, 1]);
    microGroup.add(badgeMolinete);
    if (objectsRef && objectsRef.current) objectsRef.current.badgeMolinete = badgeMolinete;

    // Eje de transmisión horizontal en seco (cota Y = 1.35) extendido desde xMolinete hasta la orilla derecha
    const hallSensorX = halfW + 0.45;
    const shaftLength = Math.max(1.2, hallSensorX - xMolinete);
    const shaftGeo = new THREE.CylinderGeometry(0.045, 0.045, shaftLength, 16);
    shaftGeo.rotateZ(Math.PI / 2);
    const shaftMesh = new THREE.Mesh(shaftGeo, metalMat);
    shaftMesh.position.set(xMolinete + (shaftLength / 2.0), molineteY, 0);
    shaftMesh.castShadow = true;
    microGroup.add(shaftMesh);
    if (objectsRef && objectsRef.current) objectsRef.current.shaftMesh = shaftMesh;

    // Chumaceras / pedestales de apoyo del eje sobre el lecho y talud
    const pierPositions = [
      xMolinete + shaftLength * 0.40,
      xMolinete + shaftLength * 0.80
    ];
    pierPositions.forEach(sx => {
      const pierBaseY = getRiverbedY(sx);
      const pierH = Math.max(0.3, molineteY - pierBaseY);
      const pierGeo = new THREE.CylinderGeometry(0.05, 0.07, pierH);
      const pier = new THREE.Mesh(pierGeo, metalMat);
      pier.position.set(sx, pierBaseY + (pierH / 2.0), 0);
      microGroup.add(pier);

      const blockGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
      const block = new THREE.Mesh(blockGeo, hubMat);
      block.position.set(sx, molineteY, 0);
      microGroup.add(block);
    });

    // Pedestal y caja del sensor de efecto Hall sobre la ribera en seco
    const hallPedestalH = Math.max(0.4, molineteY - getRiverbedY(hallSensorX));
    const hallPedestalGeo = new THREE.CylinderGeometry(0.06, 0.08, hallPedestalH);
    const hallPedestal = new THREE.Mesh(hallPedestalGeo, metalMat);
    hallPedestal.position.set(hallSensorX, getRiverbedY(hallSensorX) + hallPedestalH / 2.0, 0);
    microGroup.add(hallPedestal);

    const hallBoxGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const hallMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const hallBox = new THREE.Mesh(hallBoxGeo, hallMat);
    hallBox.position.set(hallSensorX, molineteY, 0);
    microGroup.add(hallBox);

    const hallLedGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const hallLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const hallLed = new THREE.Mesh(hallLedGeo, hallLedMat);
    hallLed.position.set(hallSensorX, molineteY + 0.18, 0);
    microGroup.add(hallLed);

    // 8. DOBLE TINA ROMPEOLAS A RAS DEL SUELO RIBEREÑO (PARALELA AL CAUCE DEL RÍO)
    const tinasGroundX = halfW + 1.35;
    const soilY = getRiverbedY(tinasGroundX); // Cota natural del terreno ribereño (~0.15m a 0.25m)
    const zTinasCenter = 0.85;

    // Losa de cimentación de hormigón sobre tierra orientada a lo largo del eje Z (paralela al cauce)
    const slabGeo = new THREE.BoxGeometry(1.3, 0.12, 2.5);
    const slabMat = new THREE.MeshStandardMaterial({ color: darkTheme ? 0x334155 : 0x94a3b8, roughness: 0.85 });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.set(tinasGroundX, soilY + 0.06, zTinasCenter);
    slabMesh.receiveShadow = true;
    microGroup.add(slabMesh);

    const tinaBaseY = soilY + 0.12;
    const tinaH = 0.55;

    const tinaMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      transmission: 0.85,
      thickness: 0.2
    });

    // Tina 1: Desarenador / Tranquilizadora rompeolas (Ubicada aguas arriba, -Z)
    const zTina1 = zTinasCenter - 0.55;
    const tina1Geo = new THREE.BoxGeometry(0.74, tinaH, 0.74);
    const tina1 = new THREE.Mesh(tina1Geo, tinaMat);
    tina1.position.set(tinasGroundX, tinaBaseY + (tinaH / 2.0), zTina1);
    microGroup.add(tina1);

    const waterTina1Geo = new THREE.BoxGeometry(0.70, tinaH * 0.75, 0.70);
    const waterTina1 = new THREE.Mesh(waterTina1Geo, new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.65
    }));
    waterTina1.position.set(tinasGroundX, tinaBaseY + (tinaH * 0.38), zTina1);
    microGroup.add(waterTina1);

    // Tina 2: Cámara de medición multiparamétrica con sondas (Ubicada aguas abajo, +Z)
    const zTina2 = zTinasCenter + 0.55;
    const tina2Geo = new THREE.BoxGeometry(0.74, tinaH, 0.74);
    const tina2 = new THREE.Mesh(tina2Geo, tinaMat);
    tina2.position.set(tinasGroundX, tinaBaseY + (tinaH / 2.0), zTina2);
    microGroup.add(tina2);

    const waterTina2Geo = new THREE.BoxGeometry(0.70, tinaH * 0.75, 0.70);
    const waterTina2 = new THREE.Mesh(waterTina2Geo, new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7
    }));
    waterTina2.position.set(tinasGroundX, tinaBaseY + (tinaH * 0.38), zTina2);
    microGroup.add(waterTina2);

    // Vertedero intermedio / canaleta que une Tina 1 y Tina 2 a lo largo del eje Z
    const weirGeo = new THREE.BoxGeometry(0.22, 0.06, 0.36);
    const weir = new THREE.Mesh(weirGeo, waterTina2.material);
    weir.position.set(tinasGroundX, tinaBaseY + tinaH * 0.65, zTinasCenter);
    microGroup.add(weir);

    // 4 Sondas multiparamétricas sumergidas en Tina 2 (pH, TDS, Turbidez, Temp)
    const probeConfigs = [
      { color: 0x3b82f6, offset: [-0.14, -0.14] }, // pH
      { color: 0x64748b, offset: [0.14, -0.14] },  // TDS / Conductividad
      { color: 0xf59e0b, offset: [-0.14, 0.14] },  // Turbidez
      { color: 0x10b981, offset: [0.14, 0.14] }   // Temperatura
    ];
    probeConfigs.forEach(cfg => {
      const probeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.34);
      const probeMat = new THREE.MeshStandardMaterial({ color: cfg.color, metalness: 0.5, roughness: 0.3 });
      const probe = new THREE.Mesh(probeGeo, probeMat);
      probe.position.set(tinasGroundX + cfg.offset[0], tinaBaseY + 0.28, zTina2 + cfg.offset[1]);
      microGroup.add(probe);
    });

    // TUBERÍAS DE DERIVACIÓN QUE RECORREN EL CAUCE:
    // - Toma de aducción: Desde el inicio del cauce aguas arriba (-12.5m) en la orilla hacia la primera tina
    // - Desfogue por gravedad: Desde la segunda tina hacia el fin del cauce aguas abajo (+12.5m) en la orilla
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.45,
      transparent: true,
      opacity: 0.72
    });
    const saddleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });

    // 1. TOMA DE ADUCCIÓN (Inicio del cauce Z = -12.5m -> Tina 1)
    const intakeStartPt = new THREE.Vector3(xWaterRight, waterY - 0.05, -12.5);
    const intakePoints = [
      intakeStartPt,
      new THREE.Vector3(xWaterRight + 0.30, getRiverbedY(xWaterRight + 0.30) + 0.12, -12.0),
      new THREE.Vector3(tinasGroundX - 0.20, getRiverbedY(tinasGroundX - 0.20) + 0.12, -7.0),
      new THREE.Vector3(tinasGroundX - 0.20, getRiverbedY(tinasGroundX - 0.20) + 0.12, -2.5),
      new THREE.Vector3(tinasGroundX - 0.08, tinaBaseY + 0.15, zTina1 - 0.70),
      new THREE.Vector3(tinasGroundX, tinaBaseY + 0.15, zTina1 - 0.37)
    ];
    const intakeCurve = new THREE.CatmullRomCurve3(intakePoints);
    const intakeGeo = new THREE.TubeGeometry(intakeCurve, 72, 0.045, 12, false);
    const intakePipe = new THREE.Mesh(intakeGeo, pipeMat);
    intakePipe.castShadow = true;
    microGroup.add(intakePipe);

    // Partículas luminiscentes de flujo activo en la tubería de aducción (Río -> Tina 1)
    const intakePartCount = 36;
    const intakePartGeo = new THREE.BufferGeometry();
    const intakePartPos = new Float32Array(intakePartCount * 3);
    for (let i = 0; i < intakePartCount; i++) {
      const pt = intakeCurve.getPoint(i / intakePartCount);
      intakePartPos[i * 3] = pt.x;
      intakePartPos[i * 3 + 1] = pt.y;
      intakePartPos[i * 3 + 2] = pt.z;
    }
    intakePartGeo.setAttribute('position', new THREE.BufferAttribute(intakePartPos, 3));
    const intakePartMat = new THREE.PointsMaterial({
      color: darkTheme ? 0x38bdf8 : 0x0284c7,
      size: 0.12,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const intakeParticles = new THREE.Points(intakePartGeo, intakePartMat);
    microGroup.add(intakeParticles);

    // Canastilla / filtro de succión sumergido al inicio del cauce
    const strainerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.40, 12);
    strainerGeo.rotateX(Math.PI / 2);
    const strainerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2, wireframe: true });
    const strainer = new THREE.Mesh(strainerGeo, strainerMat);
    strainer.position.copy(intakeStartPt);
    microGroup.add(strainer);

    // Dados de anclaje de la tubería de aducción a lo largo de la orilla
    [-10.5, -7.5, -4.5, -2.0].forEach(sz => {
      const sx = tinasGroundX - 0.20;
      const sy = getRiverbedY(sx);
      const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.20);
      const post = new THREE.Mesh(postGeo, saddleMat);
      post.position.set(sx, sy + 0.08, sz);
      microGroup.add(post);
    });

    // 2. TUBERÍA DE DESFOGUE (Tina 2 -> Fin del cauce Z = +12.5m)
    const outEndPt = new THREE.Vector3(xWaterRight, waterY - 0.08, 12.5);
    const outPoints = [
      new THREE.Vector3(tinasGroundX, tinaBaseY + 0.10, zTina2 + 0.37),
      new THREE.Vector3(tinasGroundX - 0.08, tinaBaseY + 0.10, zTina2 + 0.70),
      new THREE.Vector3(tinasGroundX - 0.20, getRiverbedY(tinasGroundX - 0.20) + 0.10, 3.5),
      new THREE.Vector3(tinasGroundX - 0.20, getRiverbedY(tinasGroundX - 0.20) + 0.10, 8.0),
      new THREE.Vector3(xWaterRight + 0.30, getRiverbedY(xWaterRight + 0.30) + 0.10, 12.0),
      outEndPt
    ];
    const outCurve = new THREE.CatmullRomCurve3(outPoints);
    const outGeo = new THREE.TubeGeometry(outCurve, 72, 0.045, 12, false);
    const outPipe = new THREE.Mesh(outGeo, pipeMat);
    outPipe.castShadow = true;
    microGroup.add(outPipe);

    // Partículas luminiscentes de flujo activo en la tubería de desfogue (Tina 2 -> Río abajo)
    const outPartCount = 36;
    const outPartGeo = new THREE.BufferGeometry();
    const outPartPos = new Float32Array(outPartCount * 3);
    for (let i = 0; i < outPartCount; i++) {
      const pt = outCurve.getPoint(i / outPartCount);
      outPartPos[i * 3] = pt.x;
      outPartPos[i * 3 + 1] = pt.y;
      outPartPos[i * 3 + 2] = pt.z;
    }
    outPartGeo.setAttribute('position', new THREE.BufferAttribute(outPartPos, 3));
    const outPartMat = new THREE.PointsMaterial({
      color: darkTheme ? 0x38bdf8 : 0x0284c7,
      size: 0.12,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const outParticles = new THREE.Points(outPartGeo, outPartMat);
    microGroup.add(outParticles);

    // Partículas de cascada hidráulica en el vertedero intermedio entre Tina 1 y Tina 2
    const weirPartCount = 20;
    const weirPartGeo = new THREE.BufferGeometry();
    const weirPartPos = new Float32Array(weirPartCount * 3);
    weirPartGeo.setAttribute('position', new THREE.BufferAttribute(weirPartPos, 3));
    const weirPartMat = new THREE.PointsMaterial({
      color: darkTheme ? 0x7dd3fc : 0x0284c7,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const weirParticles = new THREE.Points(weirPartGeo, weirPartMat);
    microGroup.add(weirParticles);

    // Boquilla difusora de desfogue sumergida al final del cauce
    const nozzleGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.30, 12);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, saddleMat);
    nozzle.position.copy(outEndPt);
    microGroup.add(nozzle);

    // Dados de anclaje de la tubería de desfogue a lo largo de la orilla
    [3.5, 6.5, 9.5, 11.5].forEach(sz => {
      const sx = tinasGroundX - 0.20;
      const sy = getRiverbedY(sx);
      const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.20);
      const post = new THREE.Mesh(postGeo, saddleMat);
      post.position.set(sx, sy + 0.08, sz);
      microGroup.add(post);
    });

    // Badge espacial de Tinas / Calidad posicionado sobre la segunda tina (Tina 2) con escala reducida
    const badgeTinas = createSensorBadgeSprite('Tinas / Calidad Agua', [
      { label: 'pH Fluvial', value: `${curTelemetry?.ph || 7.38} pH`, color: '#4ade80' },
      { label: 'TDS / Turb', value: `${curTelemetry?.tds_us || 615} µS | ${curTelemetry?.turbidez_ntu || 14.2} NTU`, color: '#38bdf8' },
      { label: 'Temperatura', value: `${curTelemetry?.temp_c || 16.8} °C`, color: '#f59e0b' }
    ], '#10b981', darkTheme, [tinasGroundX, tinaBaseY + tinaH + 0.48, zTina2], [1.05, 0.525, 1]);
    microGroup.add(badgeTinas);
    if (objectsRef && objectsRef.current) {
      objectsRef.current.badgeTinas = badgeTinas;
      objectsRef.current.waterTina1 = waterTina1;
      objectsRef.current.waterTina2 = waterTina2;
      objectsRef.current.weir = weir;
      objectsRef.current.intakeCurve = intakeCurve;
      objectsRef.current.outCurve = outCurve;
      objectsRef.current.intakeParticles = intakeParticles;
      objectsRef.current.outParticles = outParticles;
      objectsRef.current.weirParticles = weirParticles;
      objectsRef.current.tinasWaterBaseY = tinaBaseY + (tinaH * 0.38);
      objectsRef.current.weirWaterBaseY = tinaBaseY + tinaH * 0.65;
      objectsRef.current.tinasParams = {
        tinasGroundX,
        tinaBaseY,
        tinaH,
        zTina1,
        zTina2
      };
    }

    // 9. PLATAFORMA DE TELEMETRÍA ELEVADA DIRECTAMENTE SOBRE LAS TINAS Y ALINEADA EN PARALELO AL FLUJO (+Z)
    const platformY = tinaBaseY + tinaH + 0.75; // Elevada 75 cm sobre el borde de las tinas
    const stationGroup = new THREE.Group();
    stationGroup.position.set(tinasGroundX, platformY, zTinasCenter);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const stationSoilY = soilY;
    const legH = platformY - stationSoilY;

    // 4 Columnas estructurales que libran las tinas y anclan la plataforma en el suelo
    [[-0.60, -1.15], [0.60, -1.15], [-0.60, 1.15], [0.60, 1.15]].forEach(([lx, lz]) => {
      const legGeo = new THREE.CylinderGeometry(0.05, 0.05, legH);
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, -(legH / 2.0), lz);
      leg.castShadow = true;
      stationGroup.add(leg);

      // Placa base de anclaje
      const basePlateGeo = new THREE.BoxGeometry(0.18, 0.04, 0.18);
      const basePlate = new THREE.Mesh(basePlateGeo, legMat);
      basePlate.position.set(lx, -legH + 0.02, lz);
      stationGroup.add(basePlate);
    });

    // Piso técnico perforado / tramex orientado en paralelo al río (longitud 2.5m a lo largo de Z)
    const platformGeo = new THREE.BoxGeometry(1.35, 0.08, 2.50);
    const platform = new THREE.Mesh(platformGeo, legMat);
    platform.position.set(0, 0, 0);
    platform.castShadow = true;
    stationGroup.add(platform);

    // Barandilla perimétrica industrial de seguridad (paralela al flujo de agua)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const railingH = 0.65;
    [[-0.62, -1.18], [0.62, -1.18], [-0.62, 1.18], [0.62, 1.18]].forEach(([rx, rz]) => {
      const postGeo = new THREE.CylinderGeometry(0.02, 0.02, railingH);
      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(rx, railingH / 2.0, rz);
      stationGroup.add(post);
    });
    // Pasamanos longitudinales (a lo largo del eje Z)
    [-0.62, 0.62].forEach(rx => {
      const topRailGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.36);
      topRailGeo.rotateX(Math.PI / 2);
      const topRail = new THREE.Mesh(topRailGeo, railMat);
      topRail.position.set(rx, railingH, 0);
      stationGroup.add(topRail);
    });
    // Pasamanos transversal posterior
    const backRailGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.24);
    backRailGeo.rotateZ(Math.PI / 2);
    const backRail = new THREE.Mesh(backRailGeo, railMat);
    backRail.position.set(0, railingH, -1.18);
    stationGroup.add(backRail);

    // Escalera técnica de acceso en la cara exterior
    const ladderGroup = new THREE.Group();
    ladderGroup.position.set(0.68, -(legH / 2.0), 0.40);
    const ladderSideGeo = new THREE.CylinderGeometry(0.02, 0.02, legH);
    [-0.20, 0.20].forEach(lz => {
      const lSide = new THREE.Mesh(ladderSideGeo, railMat);
      lSide.position.set(0, 0, lz);
      ladderGroup.add(lSide);
    });
    const stepCount = 5;
    for (let s = 0; s < stepCount; s++) {
      const stepY = -legH / 2.0 + (s + 1) * (legH / (stepCount + 1));
      const stepGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.40);
      stepGeo.rotateX(Math.PI / 2);
      const step = new THREE.Mesh(stepGeo, railMat);
      step.position.set(0, stepY, 0);
      ladderGroup.add(step);
    }
    stationGroup.add(ladderGroup);

    // Gabinete estanco IP67 para Datalogger / RTU ORIENTADO EN PARALELO AL FLUJO (+Z)
    // (Ancho en X = 0.48m, Alto en Y = 0.85m, Longitud paralela en Z = 0.78m)
    const cabGeo = new THREE.BoxGeometry(0.48, 0.85, 0.78);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
    const cabinet = new THREE.Mesh(cabGeo, cabMat);
    cabinet.position.set(0.08, 0.48, -0.20);
    cabinet.castShadow = true;
    stationGroup.add(cabinet);

    // Mástil y panel solar sobre la estación elevada
    const solarMastGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.6);
    const solarMast = new THREE.Mesh(solarMastGeo, metalMat);
    solarMast.position.set(0.08, 1.5, -0.20);
    stationGroup.add(solarMast);

    const solarPanelGeo = new THREE.BoxGeometry(0.75, 0.03, 1.05);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.2 });
    const solarPanel = new THREE.Mesh(solarPanelGeo, panelMat);
    solarPanel.position.set(0.08, 2.2, -0.20);
    solarPanel.rotation.x = -0.35;
    stationGroup.add(solarPanel);

    // Canaleta/harnés de cableado que desciende desde la estación elevada hacia las sondas en Tina 2
    const wireConduitGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.85);
    const wireConduit = new THREE.Mesh(wireConduitGeo, saddleMat);
    wireConduit.position.set(0, -0.42, 0.55);
    stationGroup.add(wireConduit);

    microGroup.add(stationGroup);

    // Badge espacial de Nodo Central (más pequeño al zoom)
    const badgeCabinet = createSensorBadgeSprite('Nodo Central Sentinel', [
      { label: 'Batería', value: `${curTelemetry?.bateria_v || 4.18}V (${curTelemetry?.bateria_pct || 98}%)`, color: '#4ade80' },
      { label: 'Froude / Manning', value: `${curTelemetry?.froude || 0.38} | ${curTelemetry?.manning_n || 0.035}`, color: '#38bdf8' },
      { label: 'Enlace', value: 'LoRa / 4G (En línea)', color: '#22c55e' }
    ], '#8b5cf6', darkTheme, [tinasGroundX + 0.10, platformY + 1.65, zTinasCenter - 0.20], [1.15, 0.58, 1]);
    microGroup.add(badgeCabinet);
    if (objectsRef && objectsRef.current) objectsRef.current.badgeCabinet = badgeCabinet;
  };


  // Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 700;

    // 1. Scene
    const scene = new THREE.Scene();
    const initBgColor = isDark ? 0x020813 : 0xe0f2fe;
    scene.background = new THREE.Color(initBgColor);
    scene.fog = new THREE.FogExp2(initBgColor, isDark ? 0.010 : 0.006);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1200);
    camera.position.set(12, 54, 62);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.15 : 1.3;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls with free horizontal panning & anti-dip polar angle
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.screenSpacePanning = false; // Smooth horizontal panning along ground plane!
    controls.panSpeed = 1.25;
    controls.maxPolarAngle = Math.PI / 2.15; // Allows viewing horizon without clipping
    controls.minDistance = 0.35;
    controls.maxDistance = 160.0;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    controls.target.set(0, 7, 0);
    controlsRef.current = controls;

    // CANCEL ANY PROGRAMMATIC CAMERA FLIGHT THE INSTANT THE USER INTERACTS (PREVENTS AUTOCENTER & RUBBER-BANDING)
    const onUserInteract = () => {
      if (objectsRef.current) {
        objectsRef.current.targetCamPos = null;
        objectsRef.current.targetLookAt = null;
        objectsRef.current.flightFrames = 0;
      }
    };
    controls.addEventListener('start', onUserInteract);
    renderer.domElement.addEventListener('pointerdown', onUserInteract, { passive: true });
    renderer.domElement.addEventListener('wheel', onUserInteract, { passive: true });
    renderer.domElement.addEventListener('touchstart', onUserInteract, { passive: true });

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(isDark ? 0x1e3a5f : 0xffffff, isDark ? 1.3 : 1.8);
    scene.add(ambientLight);
    lightsRef.current.ambientLight = ambientLight;

    const sunLight = new THREE.DirectionalLight(isDark ? 0xa5f3fc : 0xfffaed, isDark ? 2.2 : 2.8);
    sunLight.position.set(35, 65, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -75;
    sunLight.shadow.camera.right = 75;
    sunLight.shadow.camera.top = 75;
    sunLight.shadow.camera.bottom = -75;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    lightsRef.current.sunLight = sunLight;

    const cyanPointLight = new THREE.PointLight(0x06b6d4, isDark ? 1.8 : 0.8, 30);
    cyanPointLight.position.set(-2, 4, 2);
    scene.add(cyanPointLight);
    lightsRef.current.cyanPointLight = cyanPointLight;

    // ===================================================================
    // BUILD THREE COMPONENT GROUPS: MICRO-NODE, MACRO-WATERSHED, LAGUNA
    // ===================================================================

    const microGroup = new THREE.Group();
    const macroGroup = new THREE.Group();
    const lagunaGroup = new THREE.Group();
    scene.add(microGroup);
    scene.add(macroGroup);
    scene.add(lagunaGroup);
    objectsRef.current.microGroup = microGroup;
    objectsRef.current.macroGroup = macroGroup;
    objectsRef.current.lagunaGroup = lagunaGroup;

    // ----------------------------------------------------
    // A. MICRO-NODE BUILDER (Estación Ribereña Paramétrica & Río Real)
    // ----------------------------------------------------
    buildMicroStationScene(microGroup, activeCalibrationRef.current, telemetry, isDark, objectsRef, materialsRef);



    // ----------------------------------------------------
    // B. MACRO-WATERSHED BUILDER (Cuenca 65 km, Cañón & Pedestal Sólido)
    // ----------------------------------------------------
    const riverPoints = [
      new THREE.Vector3(-55, 23.0, -32), // Hito 1: Garganta de Cabecera (Cota alta 850m)
      new THREE.Vector3(-38, 17.5, -20), // Hito 2: Cañón Alto (Cota 680m)
      new THREE.Vector3(-22, 12.8, -8),  // Hito 3: Valle Medio Alto (Cota 420m)
      new THREE.Vector3(-6, 8.8, 4),     // Hito 4: Valle Medio (Cota 310m)
      new THREE.Vector3(8, 5.6, 16),     // Hito 5: Cono de Deyección (Cota 195m)
      new THREE.Vector3(22, 3.2, 26),    // Hito 6: Valle Costero Bajo (Cota 110m)
      new THREE.Vector3(38, 1.4, 36),    // Hito 7: Delta Agrícola (Cota 45m)
      new THREE.Vector3(56, 0.05, 46)    // Hito 8: Nivel del Mar / Litoral (Cota 0m)
    ];
    const riverCurve = new THREE.CatmullRomCurve3(riverPoints, false, 'centripetal', 0.5);
    objectsRef.current.riverCurve = riverCurve;
    const curveSampleSteps = 160;
    const curveSamplePts = riverCurve.getPoints(curveSampleSteps);

    // Fast analytical terrain height for Macrocuenca (used for mesh & camera anti-clipping)
    const getMacroTerrainHeight = (vx, vz) => {
      if (Math.abs(vx) > 80 || Math.abs(vz) > 65) return 0;

      let minDistSq = 999999;
      let closestPt = curveSamplePts[0];
      let closestIdx = 0;
      for (let k = 0; k < curveSamplePts.length; k += 2) {
        const dx = vx - curveSamplePts[k].x;
        const dz = vz - curveSamplePts[k].z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closestPt = curveSamplePts[k];
          closestIdx = k;
        }
      }
      const distToRiver = Math.sqrt(minDistSq);
      const tValley = closestIdx / (curveSampleSteps - 1);
      const riverLevelY = closestPt.y;

      const riverHalfW = (2.2 + Math.pow(tValley, 1.2) * 5.8) * 0.5;
      const bankWidth = riverHalfW + 3.8; // Talud width

      let elevation = 0;

      // 1. Riverbed (depressed channel)
      if (distToRiver <= riverHalfW) {
        elevation = riverLevelY - 1.6;
      } 
      // 2. Taludes / Canyon slopes (steep slope transition)
      else if (distToRiver <= bankWidth) {
        const uBank = (distToRiver - riverHalfW) / (bankWidth - riverHalfW);
        elevation = (riverLevelY - 1.6) + Math.pow(uBank, 0.75) * 2.8;
      } 
      // 3. Agricultural valley & mountain ridges
      else {
        const distBeyond = distToRiver - bankWidth;
        if (distBeyond < 18 && vx > -46 && vx < 48) {
          const valleyRise = Math.pow(distBeyond / 18, 1.25) * 2.4;
          elevation = riverLevelY + 1.2 + valleyRise;
        } else {
          const mountainDist = Math.max(0, distBeyond - 18);
          const noise1 = Math.sin(vx * 0.10) * Math.cos(vz * 0.08) * 4.2;
          const noise2 = Math.sin(vx * 0.22 + vz * 0.16) * 1.8;
          const mountainClimb = Math.min(32, Math.pow(mountainDist / 7.0, 1.35) * 3.0);
          elevation = riverLevelY + 2.4 + mountainClimb + noise1 + noise2;
        }
      }

      // Coastal blend to Pacific Ocean
      if (vx > 45) {
        const seaFade = Math.min(1.0, (vx - 45) / 11);
        elevation = elevation * (1.0 - seaFade) - seaFade * 0.35;
      }
      return elevation;
    };

    // Fast analytical terrain height for High-Andean Lagoon
    const getLagunaTerrainHeight = (vx, vz) => {
      if (Math.abs(vx) > 55 || Math.abs(vz) > 55) return 0;
      const r = Math.sqrt(vx * vx + vz * vz);

      if (r <= 18) {
        const depthFactor = 1.0 - Math.pow(r / 18, 1.8);
        return 5.0 - depthFactor * 4.4; // Center at Y = 0.6
      } else if (r <= 22) {
        const u = (r - 18) / 4.0;
        return 4.8 + u * 1.4;
      } else {
        if (vz > 18 && Math.abs(vx) < 8) {
          return 5.2 + Math.pow(Math.abs(vx) / 8, 2.0) * 1.8;
        }
        const distRim = r - 22;
        const climb = Math.min(26, Math.pow(distRim / 6.5, 1.35) * 3.2);
        const noise = Math.sin(vx * 0.16) * Math.cos(vz * 0.16) * 3.8 + Math.sin(vx * 0.35 + vz * 0.28) * 1.5;
        return 6.2 + climb + noise;
      }
    };

    // Helper to build a solid pedestal skirt and bottom plate around a terrain plane geometry
    const createSolidPedestal = (tWidth, tDepth, gX, gZ, getElevationFn, yBase) => {
      const skirtVerts = [];
      const skirtNorms = [];
      const skirtColors = [];
      const skirtIndices = [];

      const dx = tWidth / gX;
      const dz = tDepth / gZ;
      const minX = -tWidth / 2;
      const minZ = -tDepth / 2;

      let vOffset = 0;
      const baseColor = isDark ? { r: 0.08, g: 0.12, b: 0.18 } : { r: 0.28, g: 0.32, b: 0.38 };
      const strataTopColor = isDark ? { r: 0.24, g: 0.26, b: 0.30 } : { r: 0.44, g: 0.46, b: 0.48 };

      const addQuad = (p0, p1, p2, p3, nxVal, nyVal, nzVal) => {
        skirtVerts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
        skirtNorms.push(nxVal, nyVal, nzVal, nxVal, nyVal, nzVal, nxVal, nyVal, nzVal, nxVal, nyVal, nzVal);
        skirtColors.push(
          strataTopColor.r, strataTopColor.g, strataTopColor.b,
          baseColor.r, baseColor.g, baseColor.b,
          baseColor.r, baseColor.g, baseColor.b,
          strataTopColor.r, strataTopColor.g, strataTopColor.b
        );
        skirtIndices.push(vOffset, vOffset + 1, vOffset + 2, vOffset, vOffset + 2, vOffset + 3);
        vOffset += 4;
      };

      // 1. North Edge (Z = minZ)
      for (let i = 0; i < gX; i++) {
        const x0 = minX + i * dx;
        const x1 = minX + (i + 1) * dx;
        const y0 = getElevationFn(x0, minZ);
        const y1 = getElevationFn(x1, minZ);
        addQuad(
          new THREE.Vector3(x0, y0, minZ),
          new THREE.Vector3(x0, yBase, minZ),
          new THREE.Vector3(x1, yBase, minZ),
          new THREE.Vector3(x1, y1, minZ),
          0, 0, -1
        );
      }

      // 2. South Edge (Z = maxZ)
      const maxZ = minZ + tDepth;
      for (let i = 0; i < gX; i++) {
        const x0 = minX + i * dx;
        const x1 = minX + (i + 1) * dx;
        const y0 = getElevationFn(x0, maxZ);
        const y1 = getElevationFn(x1, maxZ);
        addQuad(
          new THREE.Vector3(x1, y1, maxZ),
          new THREE.Vector3(x1, yBase, maxZ),
          new THREE.Vector3(x0, yBase, maxZ),
          new THREE.Vector3(x0, y0, maxZ),
          0, 0, 1
        );
      }

      // 3. West Edge (X = minX)
      for (let j = 0; j < gZ; j++) {
        const z0 = minZ + j * dz;
        const z1 = minZ + (j + 1) * dz;
        const y0 = getElevationFn(minX, z0);
        const y1 = getElevationFn(minX, z1);
        addQuad(
          new THREE.Vector3(minX, y1, z1),
          new THREE.Vector3(minX, yBase, z1),
          new THREE.Vector3(minX, yBase, z0),
          new THREE.Vector3(minX, y0, z0),
          -1, 0, 0
        );
      }

      // 4. East Edge (X = maxX)
      const maxX = minX + tWidth;
      for (let j = 0; j < gZ; j++) {
        const z0 = minZ + j * dz;
        const z1 = minZ + (j + 1) * dz;
        const y0 = getElevationFn(maxX, z0);
        const y1 = getElevationFn(maxX, z1);
        addQuad(
          new THREE.Vector3(maxX, y0, z0),
          new THREE.Vector3(maxX, yBase, z0),
          new THREE.Vector3(maxX, yBase, z1),
          new THREE.Vector3(maxX, y1, z1),
          1, 0, 0
        );
      }

      // 5. Bottom Base Plate at yBase
      addQuad(
        new THREE.Vector3(minX, yBase, maxZ),
        new THREE.Vector3(minX, yBase, minZ),
        new THREE.Vector3(maxX, yBase, minZ),
        new THREE.Vector3(maxX, yBase, maxZ),
        0, -1, 0
      );

      const skirtGeo = new THREE.BufferGeometry();
      skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtVerts, 3));
      skirtGeo.setAttribute('normal', new THREE.Float32BufferAttribute(skirtNorms, 3));
      skirtGeo.setAttribute('color', new THREE.Float32BufferAttribute(skirtColors, 3));
      skirtGeo.setIndex(skirtIndices);

      const skirtMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.08,
        side: THREE.DoubleSide
      });

      const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
      skirtMesh.receiveShadow = true;
      return { skirtMesh, skirtMat };
    };

    // ===================================================================
    // 1. RELIEVE TOPOGRÁFICO DE LA MACROCUENCA (Cordillera, Valle y Costa)
    // ===================================================================
    const terrainWidth = 150;
    const terrainDepth = 120;
    const gridX = 140;
    const gridZ = 110;
    const macroTerrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, gridX, gridZ);
    macroTerrainGeo.rotateX(-Math.PI / 2);

    const tPosAttr = macroTerrainGeo.attributes.position;
    const tColors = new Float32Array(tPosAttr.count * 3);

    for (let i = 0; i < tPosAttr.count; i++) {
      const vx = tPosAttr.getX(i);
      const vz = tPosAttr.getZ(i);
      const elevation = getMacroTerrainHeight(vx, vz);
      tPosAttr.setY(i, elevation);

      let r = 0.55, g = 0.50, b = 0.44;

      let minDistSq = 999999;
      for (let k = 0; k < curveSamplePts.length; k += 4) {
        const dx = vx - curveSamplePts[k].x;
        const dz = vz - curveSamplePts[k].z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq) {
          minDistSq = dSq;
        }
      }
      const distToRiver = Math.sqrt(minDistSq);

      if (vx > 54 && vz > 32) {
        r = 0.03; g = 0.38; b = 0.58; // Océano Pacífico
      } else if (distToRiver <= 4.5) {
        // Taludes y lecho fluvial con estratos rocosos
        const taludBanding = Math.sin(elevation * 3.5);
        r = 0.62 + taludBanding * 0.06;
        g = 0.54 + taludBanding * 0.05;
        b = 0.42 + taludBanding * 0.04;
      } else if (distToRiver > 4.5 && distToRiver < 22 && vx > -44 && vx < 46) {
        // Mosaico agrícola del Valle Chancay
        const cellX = Math.floor((vx + 120) / 4.5);
        const cellZ = Math.floor((vz + 120) / 4.5);
        const cropType = Math.abs((cellX * 7 + cellZ * 11) % 6);
        switch (cropType) {
          case 0: r = 0.08; g = 0.48; b = 0.20; break;
          case 1: r = 0.12; g = 0.56; b = 0.25; break;
          case 2: r = 0.32; g = 0.64; b = 0.14; break;
          case 3: r = 0.74; g = 0.62; b = 0.20; break;
          case 4: r = 0.54; g = 0.42; b = 0.30; break;
          default: r = 0.16; g = 0.52; b = 0.18; break;
        }
      } else {
        const altNorm = Math.min(1.0, Math.max(0, elevation / 26));
        r = 0.44 + altNorm * 0.25;
        g = 0.40 + altNorm * 0.22;
        b = 0.35 + altNorm * 0.20;
        if (elevation > 24) {
          r = 0.88; g = 0.92; b = 0.98; // Nieve altoandina
        }
      }

      tColors[i * 3] = r;
      tColors[i * 3 + 1] = g;
      tColors[i * 3 + 2] = b;
    }

    macroTerrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
    macroTerrainGeo.computeVertexNormals();

    const macroTerrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.08,
      flatShading: true
    });
    const macroTerrainMesh = new THREE.Mesh(macroTerrainGeo, macroTerrainMat);
    macroTerrainMesh.receiveShadow = true;
    macroGroup.add(macroTerrainMesh);
    materialsRef.current.macroTerrainMat = macroTerrainMat;

    // Solid Pedestal Skirt for Macrocuenca (closes completely to Y = -10.0)
    const { skirtMesh: macroSkirtMesh, skirtMat: macroSkirtMat } = createSolidPedestal(
      terrainWidth, terrainDepth, gridX, gridZ, getMacroTerrainHeight, -10.0
    );
    macroGroup.add(macroSkirtMesh);
    materialsRef.current.macroSkirtMat = macroSkirtMat;

    // ===================================================================
    // 2. CINTA FLUVIAL LAMINAR REALISTA (Superficie Plana con Ancho Variable)
    // ===================================================================
    const ribbonSteps = 160;
    const ribbonPts = riverCurve.getPoints(ribbonSteps);
    const ribbonGeo = new THREE.BufferGeometry();
    const ribbonVerts = [];
    const ribbonUvs = [];
    const ribbonIndices = [];

    for (let i = 0; i <= ribbonSteps; i++) {
      const t = i / ribbonSteps;
      const pt = ribbonPts[i];
      const tangent = riverCurve.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const w = 2.2 + Math.pow(t, 1.2) * 5.8;

      const left = pt.clone().addScaledVector(normal, -w * 0.5);
      const right = pt.clone().addScaledVector(normal, w * 0.5);

      left.y = pt.y;
      right.y = pt.y;

      ribbonVerts.push(left.x, left.y, left.z);
      ribbonVerts.push(right.x, right.y, right.z);

      ribbonUvs.push(0, t * 16);
      ribbonUvs.push(1, t * 16);

      if (i < ribbonSteps) {
        const b = i * 2;
        ribbonIndices.push(b, b + 1, b + 2);
        ribbonIndices.push(b + 1, b + 3, b + 2);
      }
    }

    ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVerts, 3));
    ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUvs, 2));
    ribbonGeo.setIndex(ribbonIndices);
    ribbonGeo.computeVertexNormals();

    const macroRiverMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x06b6d4 : 0x0284c7,
      roughness: 0.08,
      metalness: 0.15,
      transmission: 0.65,
      ior: 1.333,
      transparent: true,
      opacity: isDark ? 0.88 : 0.92,
      emissive: isDark ? 0x083344 : 0x0369a1,
      emissiveIntensity: isDark ? 0.45 : 0.15
    });
    const macroRiverMesh = new THREE.Mesh(ribbonGeo, macroRiverMat);
    macroRiverMesh.receiveShadow = true;
    macroGroup.add(macroRiverMesh);
    objectsRef.current.macroRiverMesh = macroRiverMesh;
    materialsRef.current.macroRiverMat = macroRiverMat;

    // ===================================================================
    // 3. OCÉANO PACÍFICO EN DESEMBOCADURA (Cota 0m)
    // ===================================================================
    const oceanGeo = new THREE.PlaneGeometry(60, 70, 32, 32);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x042f2e : 0x0369a1,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: isDark ? 0.82 : 0.88,
      emissive: isDark ? 0x022c22 : 0x075985,
      emissiveIntensity: isDark ? 0.3 : 0.1
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.set(74, 0.02, 50);
    oceanMesh.receiveShadow = true;
    macroGroup.add(oceanMesh);
    objectsRef.current.oceanMesh = oceanMesh;
    oceanMesh.visible = hasSeaNode;
    materialsRef.current.oceanMat = oceanMat;



    // ===================================================================
    // 5. ESTACIONES HIDROMÉTRICAS EXCLUSIVAMENTE DINÁMICAS (100% BASE DE DATOS)
    // ===================================================================
    // Se han eliminado todas las balizas estáticas artificiales (ST-01..ST-08).
    // El gemelo solo renderiza los nodos reales registrados en la base de datos.
    macroGroup.add(dbNodesGroupRef.current);

    // ===================================================================
    // 6. TRAZADORES DE FLUJO HIDROLÓGICO (Partículas sobre la lámina de agua)
    // ===================================================================
    const particleCount = 260;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount; p++) {
      const t = p / particleCount;
      const pt = riverCurve.getPoint(t);
      const tangent = riverCurve.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const w = 2.2 + Math.pow(t, 1.2) * 5.8;
      const offset = (Math.random() - 0.5) * (w * 0.7);

      particlePositions[p * 3] = pt.x + normal.x * offset;
      particlePositions[p * 3 + 1] = pt.y + 0.12;
      particlePositions[p * 3 + 2] = pt.z + normal.z * offset;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const flowParticlesMat = new THREE.PointsMaterial({
      color: isDark ? 0xa5f3fc : 0x0284c7,
      size: isDark ? 0.45 : 0.38,
      transparent: true,
      opacity: 0.85
    });
    const flowParticles = new THREE.Points(particleGeo, flowParticlesMat);
    macroGroup.add(flowParticles);
    objectsRef.current.particles = flowParticles;
    materialsRef.current.flowParticlesMat = flowParticlesMat;

    // -------------------------------------------------------------------
    // C. LAGUNA ALTOANDINA BUILDER (Recurso Léntico & Multi-Nodo 4,250 msnm)
    // -------------------------------------------------------------------
    const lagWidth = 100;
    const lagDepth = 100;
    const lagGrid = 80;
    const lagunaTerrainGeo = new THREE.PlaneGeometry(lagWidth, lagDepth, lagGrid, lagGrid);
    lagunaTerrainGeo.rotateX(-Math.PI / 2);

    const lPosAttr = lagunaTerrainGeo.attributes.position;
    const lColors = new Float32Array(lPosAttr.count * 3);

    for (let i = 0; i < lPosAttr.count; i++) {
      const vx = lPosAttr.getX(i);
      const vz = lPosAttr.getZ(i);
      const elevation = getLagunaTerrainHeight(vx, vz);
      lPosAttr.setY(i, elevation);

      const r = Math.sqrt(vx * vx + vz * vz);
      let red = 0.50, green = 0.46, blue = 0.42;

      if (r <= 18) {
        red = 0.16; green = 0.22; blue = 0.28; // Fondo lacustre
      } else if (r <= 22) {
        red = 0.45; green = 0.52; blue = 0.32; // Bofedales y ribera
      } else {
        if (elevation > 16) {
          red = 0.90; green = 0.94; blue = 0.98; // Nieve glaciar
        } else {
          red = 0.42; green = 0.38; blue = 0.36; // Roca volcánica
        }
      }

      lColors[i * 3] = red;
      lColors[i * 3 + 1] = green;
      lColors[i * 3 + 2] = blue;
    }

    lagunaTerrainGeo.setAttribute('color', new THREE.BufferAttribute(lColors, 3));
    lagunaTerrainGeo.computeVertexNormals();

    const lagunaTerrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.06,
      flatShading: true
    });
    const lagunaTerrainMesh = new THREE.Mesh(lagunaTerrainGeo, lagunaTerrainMat);
    lagunaTerrainMesh.receiveShadow = true;
    lagunaGroup.add(lagunaTerrainMesh);
    materialsRef.current.lagunaTerrainMat = lagunaTerrainMat;

    // Solid Pedestal Skirt for Laguna (closes completely to Y = -8.0)
    const { skirtMesh: lagunaSkirtMesh, skirtMat: lagunaSkirtMat } = createSolidPedestal(
      lagWidth, lagDepth, lagGrid, lagGrid, getLagunaTerrainHeight, -8.0
    );
    lagunaGroup.add(lagunaSkirtMesh);
    materialsRef.current.lagunaSkirtMat = lagunaSkirtMat;

    // Laguna Water Mirror (Espejo de Agua a Cota 4,248.5 msnm, Y = 5.0)
    const lagWaterGeo = new THREE.CircleGeometry(21.5, 64);
    lagWaterGeo.rotateX(-Math.PI / 2);
    const lagunaWaterMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x0284c7 : 0x0ea5e9,
      roughness: 0.05,
      metalness: 0.12,
      transmission: 0.72,
      ior: 1.333,
      transparent: true,
      opacity: 0.90,
      emissive: isDark ? 0x034968 : 0x0284c7,
      emissiveIntensity: isDark ? 0.35 : 0.15
    });
    const lagunaWaterMesh = new THREE.Mesh(lagWaterGeo, lagunaWaterMat);
    lagunaWaterMesh.position.set(0, 5.0, 0);
    lagunaWaterMesh.receiveShadow = true;
    lagunaGroup.add(lagunaWaterMesh);
    objectsRef.current.lagunaWaterMesh = lagunaWaterMesh;
    materialsRef.current.lagunaWaterMat = lagunaWaterMat;

    // Vaso Lacustre: Boya Limnimétrica Flotante Central
    const buoyGroup = new THREE.Group();
    buoyGroup.position.set(0, 5.0, 0);

    const buoyHullGeo = new THREE.CylinderGeometry(0.85, 0.75, 0.5, 24);
    const buoyHullMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.4 });
    const buoyHull = new THREE.Mesh(buoyHullGeo, buoyHullMat);
    buoyHull.position.y = 0.25;
    buoyHull.castShadow = true;
    buoyGroup.add(buoyHull);

    const buoyMastGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8);
    const buoyMastMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 });
    const buoyMast = new THREE.Mesh(buoyMastGeo, buoyMastMat);
    buoyMast.position.y = 1.35;
    buoyGroup.add(buoyMast);

    const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.1 });
    const buoySolarGeo = new THREE.BoxGeometry(0.7, 0.04, 0.5);
    const buoySolar = new THREE.Mesh(buoySolarGeo, solarMat);
    buoySolar.position.set(0, 2.0, 0);
    buoySolar.rotation.x = -0.3;
    buoyGroup.add(buoySolar);

    const buoyLightGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const buoyLightMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const buoyLight = new THREE.Mesh(buoyLightGeo, buoyLightMat);
    buoyLight.position.set(0, 2.5, 0);
    buoyGroup.add(buoyLight);

    const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, 4.0);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(0, -2.0, 0);
    buoyGroup.add(cable);

    const buoyRingGeo = new THREE.RingGeometry(1.2, 1.8, 32);
    buoyRingGeo.rotateX(-Math.PI / 2);
    const buoyRingMat = new THREE.MeshBasicMaterial({ 
      color: 0x06b6d4, 
      transparent: true, 
      opacity: 0.65, 
      side: THREE.DoubleSide 
    });
    const buoyRing = new THREE.Mesh(buoyRingGeo, buoyRingMat);
    buoyRing.position.y = 0.05;
    buoyGroup.add(buoyRing);

    lagunaGroup.add(buoyGroup);
    objectsRef.current.lagunaBuoyMesh = buoyGroup;

    // Infraestructura Hidráulica: Presa y Vertedero de Regulación
    const damGroup = new THREE.Group();
    damGroup.position.set(0, 5.2, 22);

    const damWallGeo = new THREE.BoxGeometry(16, 3.8, 4.2);
    const damWallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const damWall = new THREE.Mesh(damWallGeo, damWallMat);
    damWall.position.y = 0.5;
    damWall.castShadow = true;
    damWall.receiveShadow = true;
    damGroup.add(damWall);

    const chuteGeo = new THREE.BoxGeometry(5.0, 3.2, 6.0);
    const chuteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const chute = new THREE.Mesh(chuteGeo, chuteMat);
    chute.position.set(0, 0.1, 4.0);
    damGroup.add(chute);

    const damTowerGeo = new THREE.BoxGeometry(2.4, 2.8, 2.4);
    const damTowerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
    const damTower = new THREE.Mesh(damTowerGeo, damTowerMat);
    damTower.position.set(6.0, 3.2, 0);
    damTower.castShadow = true;
    damGroup.add(damTower);

    const damMast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 }));
    damMast.position.set(6.0, 5.0, 0);
    damGroup.add(damMast);

    lagunaGroup.add(damGroup);

    // Hidrología de Cabecera: Afluente Glacial Cordillera
    const tributaryGroup = new THREE.Group();
    tributaryGroup.position.set(-16, 7.2, -18);

    const tribWeirGeo = new THREE.BoxGeometry(3.6, 0.8, 0.6);
    const tribWeirMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const tribWeir = new THREE.Mesh(tribWeirGeo, tribWeirMat);
    tribWeir.position.y = 0.4;
    tributaryGroup.add(tribWeir);

    const tribMast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.0, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 }));
    tribMast.position.set(2.2, 1.8, 0);
    tributaryGroup.add(tribMast);

    const tribRingGeo = new THREE.RingGeometry(0.9, 1.4, 24);
    tribRingGeo.rotateX(-Math.PI / 2);
    const tribRing = new THREE.Mesh(tribRingGeo, buoyRingMat);
    tribRing.position.y = 0.2;
    tributaryGroup.add(tribRing);

    lagunaGroup.add(tributaryGroup);

    // Default visibility: start with Macrocuenca 65 km
    microGroup.visible = false;
    macroGroup.visible = true;
    lagunaGroup.visible = false;

    // ----------------------------------------------------
    // ANIMATION & RENDER LOOP WITH ANTI-CLIPPING COLLISION
    // ----------------------------------------------------
    const clock = new THREE.Clock();

    const animate = () => {
      reqAnimRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const curScale = scaleRef.current || 'macro';
      const curTelem = telemetryRef.current || telemetry;

      // Rotation of Molinete & Shaft in Micro station
      if (curScale === 'micro' && objectsRef.current.molineteGroup && objectsRef.current.shaftMesh) {
        const radPerSec = (((curTelem.rpm_hall !== undefined ? curTelem.rpm_hall : 180)) / 60) * Math.PI * 2;
        objectsRef.current.molineteGroup.rotation.x += radPerSec * delta;
        objectsRef.current.shaftMesh.rotation.x += radPerSec * delta;
      }

      // Dinámica de flujo fluvial en Micro-estación: olas viajeras y corriente aguas abajo (+Z)
      if (curScale === 'micro' && objectsRef.current.waterMesh) {
        const base = objectsRef.current.baseWaterY !== undefined ? objectsRef.current.baseWaterY : -0.4;
        objectsRef.current.waterMesh.position.y = base + Math.sin(elapsed * 2.2) * 0.006;

        if (objectsRef.current.waterMesh.geometry?.userData?.basePositions) {
          const vPos = objectsRef.current.waterMesh.geometry.attributes.position;
          const basePos = objectsRef.current.waterMesh.geometry.userData.basePositions;
          const flowSpeed = Math.max(0.4, Number(curTelem.velocidad_ms) || 1.36);
          for (let i = 0; i < vPos.count; i++) {
            const x0 = basePos[i * 3];
            const z0 = basePos[i * 3 + 2];
            // Olas progresivas viajando río abajo a lo largo del eje +Z
            const wave1 = Math.sin(z0 * 1.6 - elapsed * flowSpeed * 3.2) * 0.022;
            const wave2 = Math.cos(x0 * 2.4 + z0 * 0.8 - elapsed * flowSpeed * 1.8) * 0.012;
            vPos.setY(i, basePos[i * 3 + 1] + wave1 + wave2);
          }
          vPos.needsUpdate = true;
        }
      }

      // Espuma y partículas de corriente fluvial desplazándose río abajo (+Z)
      if (curScale === 'micro' && objectsRef.current.microFlowParticles && objectsRef.current.microFlowVel) {
        const pArr = objectsRef.current.microFlowParticles.geometry.attributes.position.array;
        const vels = objectsRef.current.microFlowVel;
        const flowSpeed = Math.max(0.4, Number(curTelem.velocidad_ms) || 1.36);
        const halfL = 14.0;
        for (let i = 0; i < vels.length; i++) {
          pArr[i * 3 + 2] += flowSpeed * 2.8 * vels[i] * delta;
          if (pArr[i * 3 + 2] > halfL) {
            pArr[i * 3 + 2] = -halfL;
          }
        }
        objectsRef.current.microFlowParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Gentle wave in Laguna mirror & Buoy bobbing
      if (curScale === 'laguna' && objectsRef.current.lagunaWaterMesh) {
        objectsRef.current.lagunaWaterMesh.position.y = 5.0 + Math.sin(elapsed * 1.8) * 0.02;
      }
      if (curScale === 'laguna' && objectsRef.current.lagunaBuoyMesh) {
        objectsRef.current.lagunaBuoyMesh.position.y = 5.0 + Math.sin(elapsed * 1.8) * 0.03;
        objectsRef.current.lagunaBuoyMesh.rotation.z = Math.sin(elapsed * 1.2) * 0.03;
        objectsRef.current.lagunaBuoyMesh.rotation.x = Math.cos(elapsed * 1.4) * 0.03;
      }

      // Acoustic cone pulsation in Micro station
      if (curScale === 'micro' && objectsRef.current.acousticCone) {
        objectsRef.current.acousticCone.material.opacity = 0.14 + Math.sin(elapsed * 6.0) * 0.08;
      }

      // Dinámica de flujo de agua en Tinas Rompeolas y Tuberías de Derivación
      if (curScale === 'micro') {
        const wbY = objectsRef.current.tinasWaterBaseY;
        if (wbY !== undefined) {
          if (objectsRef.current.waterTina1) {
            objectsRef.current.waterTina1.position.y = wbY + Math.sin(elapsed * 3.8) * 0.005 + Math.cos(elapsed * 2.5) * 0.003;
          }
          if (objectsRef.current.waterTina2) {
            objectsRef.current.waterTina2.position.y = wbY + Math.sin(elapsed * 2.6 + 1.2) * 0.003;
          }
        }
        if (objectsRef.current.weir && objectsRef.current.weirWaterBaseY !== undefined) {
          objectsRef.current.weir.position.y = objectsRef.current.weirWaterBaseY + Math.sin(elapsed * 4.8) * 0.002;
        }

        // Flujo animado por tubería de aducción (río -> Tina 1)
        if (objectsRef.current.intakeParticles && objectsRef.current.intakeCurve) {
          const curve = objectsRef.current.intakeCurve;
          const pArr = objectsRef.current.intakeParticles.geometry.attributes.position.array;
          const count = pArr.length / 3;
          for (let i = 0; i < count; i++) {
            const u = (i / count + elapsed * 0.18) % 1.0;
            const pt = curve.getPoint(u);
            pArr[i * 3] = pt.x;
            pArr[i * 3 + 1] = pt.y;
            pArr[i * 3 + 2] = pt.z;
          }
          objectsRef.current.intakeParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Flujo animado por tubería de desfogue (Tina 2 -> río abajo)
        if (objectsRef.current.outParticles && objectsRef.current.outCurve) {
          const curve = objectsRef.current.outCurve;
          const pArr = objectsRef.current.outParticles.geometry.attributes.position.array;
          const count = pArr.length / 3;
          for (let i = 0; i < count; i++) {
            const u = (i / count + elapsed * 0.18) % 1.0;
            const pt = curve.getPoint(u);
            pArr[i * 3] = pt.x;
            pArr[i * 3 + 1] = pt.y;
            pArr[i * 3 + 2] = pt.z;
          }
          objectsRef.current.outParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Cascada hidráulica en vertedero de interconexión entre Tina 1 y Tina 2
        if (objectsRef.current.weirParticles && objectsRef.current.tinasParams) {
          const tp = objectsRef.current.tinasParams;
          const pArr = objectsRef.current.weirParticles.geometry.attributes.position.array;
          const count = pArr.length / 3;
          for (let i = 0; i < count; i++) {
            const u = (i / count + elapsed * 0.45) % 1.0;
            pArr[i * 3] = tp.tinasGroundX + Math.sin(i * 7 + elapsed * 3) * 0.04;
            pArr[i * 3 + 1] = tp.tinaBaseY + tp.tinaH * 0.65 - u * 0.08;
            pArr[i * 3 + 2] = (tp.zTina1 + 0.35) + u * (tp.zTina2 - 0.35 - (tp.zTina1 + 0.35));
          }
          objectsRef.current.weirParticles.geometry.attributes.position.needsUpdate = true;
        }
      }

      // Macro particles motion along river surface
      if (curScale === 'macro' && flowParticles && flowParticles.geometry) {
        const pPos = flowParticles.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          let u = (i / particleCount + elapsed * 0.045) % 1.0;
          const curvePt = riverCurve.getPoint(u);
          const tangent = riverCurve.getTangent(u).normalize();
          const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
          const w = 2.2 + Math.pow(u, 1.2) * 5.8;
          const latOffset = Math.sin(i * 73 + elapsed * 1.5) * (w * 0.32);

          pPos[i * 3] = curvePt.x + normal.x * latOffset;
          pPos[i * 3 + 1] = curvePt.y + 0.12;
          pPos[i * 3 + 2] = curvePt.z + normal.z * latOffset;
        }
        flowParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Smooth camera transition with fail-safe expiration and clean completion
      if (objectsRef.current.targetCamPos && objectsRef.current.targetLookAt) {
        const dCam = camera.position.distanceTo(objectsRef.current.targetCamPos);
        const dTarget = controls.target.distanceTo(objectsRef.current.targetLookAt);
        if (dCam < 0.10 && dTarget < 0.10) {
          camera.position.copy(objectsRef.current.targetCamPos);
          controls.target.copy(objectsRef.current.targetLookAt);
          objectsRef.current.targetCamPos = null;
          objectsRef.current.targetLookAt = null;
          objectsRef.current.flightFrames = 0;
        } else {
          camera.position.lerp(objectsRef.current.targetCamPos, 0.12);
          controls.target.lerp(objectsRef.current.targetLookAt, 0.12);
          if (objectsRef.current.flightFrames !== undefined && objectsRef.current.flightFrames > 0) {
            objectsRef.current.flightFrames--;
            if (objectsRef.current.flightFrames <= 0) {
              camera.position.copy(objectsRef.current.targetCamPos);
              controls.target.copy(objectsRef.current.targetLookAt);
              objectsRef.current.targetCamPos = null;
              objectsRef.current.targetLookAt = null;
            }
          }
        }
      }

      // =================================================================
      // CAMERA ANTI-CLIPPING & TARGET BOUNDING BOX (100% ISOLATED PER MODEL)
      // =================================================================
      if (curScale === 'macro') {
        controls.target.x = Math.max(-55, Math.min(55, controls.target.x));
        controls.target.z = Math.max(-40, Math.min(40, controls.target.z));
      } else if (curScale === 'laguna') {
        controls.target.x = Math.max(-30, Math.min(30, controls.target.x));
        controls.target.z = Math.max(-30, Math.min(30, controls.target.z));
      } else if (curScale === 'micro') {
        const p = objectsRef.current.microParams;
        const W = p?.W || 8.0;
        const halfW = W / 2.0;
        controls.target.x = Math.max(-halfW - 5.0, Math.min(halfW + 8.0, controls.target.x));
        controls.target.z = Math.max(-18.0, Math.min(18.0, controls.target.z));
      }

      controls.update();

      // Elevation clamping strictly isolated by active model (ZERO INTERFERENCE)
      if (curScale === 'macro') {
        const minCamY = getMacroTerrainHeight(camera.position.x, camera.position.z) + 1.8;
        if (camera.position.y < minCamY) camera.position.y = minCamY;
      } else if (curScale === 'laguna') {
        const minCamY = getLagunaTerrainHeight(camera.position.x, camera.position.z) + 1.8;
        if (camera.position.y < minCamY) camera.position.y = minCamY;
      } else if (curScale === 'micro') {
        // En micronodo, el lecho fluvial desciende hasta -H_max (ej. -1.4m a -1.8m).
        // NINGÚN CÁLCULO DE MACROCUENCA NI LAGUNA DEBE TOCAR LA CÁMARA AQUÍ.
        const p = objectsRef.current.microParams;
        const maxD = p?.H_max || 1.6;
        const minCamY = -maxD + 0.12;
        if (camera.position.y < minCamY) camera.position.y = minCamY;
        if (controls.target.y < -maxD - 0.5) controls.target.y = -maxD - 0.5;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Window resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqAnimRef.current);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onUserInteract);
      renderer.domElement.removeEventListener('pointerdown', onUserInteract);
      renderer.domElement.removeEventListener('wheel', onUserInteract);
      renderer.domElement.removeEventListener('touchstart', onUserInteract);
      renderer.dispose();
    };
  }, []);

  // Sincronización reactiva al cambio de tema (Claro / Oscuro) en WebGL
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // 1. Cielo de fondo y niebla atmosférica
    const bgColor = isDark ? 0x020813 : 0xe0f2fe;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, isDark ? 0.009 : 0.005);

    // 2. Luces ambientales y solares
    if (lightsRef.current.ambientLight) {
      lightsRef.current.ambientLight.color.setHex(isDark ? 0x1e3a5f : 0xffffff);
      lightsRef.current.ambientLight.intensity = isDark ? 1.3 : 1.8;
    }
    if (lightsRef.current.sunLight) {
      lightsRef.current.sunLight.color.setHex(isDark ? 0xa5f3fc : 0xfffaed);
      lightsRef.current.sunLight.intensity = isDark ? 2.2 : 2.8;
    }
    if (lightsRef.current.cyanPointLight) {
      lightsRef.current.cyanPointLight.intensity = isDark ? 1.8 : 0.8;
    }

    // 3. Materiales 3D
    const mats = materialsRef.current;
    if (mats.macroTerrainMat) mats.macroTerrainMat.roughness = isDark ? 0.85 : 0.75;
    if (mats.macroRiverMat) {
      mats.macroRiverMat.color.setHex(isDark ? 0x06b6d4 : 0x0284c7);
      mats.macroRiverMat.emissive.setHex(isDark ? 0x083344 : 0x0369a1);
      mats.macroRiverMat.emissiveIntensity = isDark ? 0.45 : 0.15;
    }
    if (mats.oceanMat) {
      mats.oceanMat.color.setHex(isDark ? 0x042f2e : 0x0369a1);
      mats.oceanMat.emissive.setHex(isDark ? 0x022c22 : 0x075985);
    }
    if (mats.flowParticlesMat) {
      mats.flowParticlesMat.color.setHex(isDark ? 0xa5f3fc : 0x0284c7);
    }
    if (mats.riverBedMat) mats.riverBedMat.color.setHex(isDark ? 0x1e293b : 0x64748b);
    if (mats.waterMat) mats.waterMat.color.setHex(isDark ? 0x06b6d4 : 0x0284c7);
    if (mats.lagunaWaterMat) {
      mats.lagunaWaterMat.color.setHex(isDark ? 0x0284c7 : 0x0ea5e9);
      mats.lagunaWaterMat.emissive.setHex(isDark ? 0x034968 : 0x0284c7);
    }
  }, [isDark]);

  // Sincronización de Nodos Reales de la BD en el Escenario 3D (Cotas reales y distancias proporcionales)
  useEffect(() => {
    const group = dbNodesGroupRef.current;
    if (!group) return;

    // 1. Limpiar balizas anteriores y liberar recursos de Three.js
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    // 2. Control de visibilidad del Océano Pacífico según existencia de nodo en cota 0/desembocadura
    if (objectsRef.current.oceanMesh) {
      objectsRef.current.oceanMesh.visible = hasSeaNode;
    }

    // 3. Si no hay nodos de laguna registrados y el usuario está en laguna, retornar a macrocuenca
    if (!hasLagunaNode && scale === 'laguna') {
      setScale('macro');
    }

    const riverCurve = objectsRef.current.riverCurve;
    if (!riverCurve || !dbNodes || dbNodes.length === 0) return;

    const { sortedNodes, cumulativeDistances, totalDistanceKm } = topographyData;
    const stationPositions = [];

    // 4. Construcción de balizas telemétricas para cada nodo real registrado
    sortedNodes.forEach((node, idx) => {
      const cumDist = cumulativeDistances[idx] || 0;
      let t;
      if (totalDistanceKm > 0) {
        t = 0.08 + (cumDist / totalDistanceKm) * 0.82;
      } else if (sortedNodes.length === 1) {
        t = 0.5;
      } else {
        t = 0.08 + (idx / Math.max(1, sortedNodes.length - 1)) * 0.82;
      }
      t = Math.max(0.04, Math.min(0.96, t));

      // Posición sobre la orilla del río calculada desde la curva matemática del cauce
      const pt = riverCurve.getPoint(t);
      const tangent = riverCurve.getTangent(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const riverHalfW = (2.2 + Math.pow(t, 1.2) * 5.8) * 0.5;
      const side = idx % 2 === 0 ? 1 : -1;

      const stationPos = pt.clone().addScaledVector(normal, (riverHalfW + 2.4) * side);
      stationPos.y = pt.y + 0.35;
      nodePositionsRef.current[node.id_nodo] = stationPos;
      stationPositions.push(stationPos);

      const marker = new THREE.Group();
      marker.position.copy(stationPos);

      // A. Pedestal hexagonal de hormigón
      const baseGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.45, 6);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x334155 : 0x94a3b8,
        roughness: 0.85
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.receiveShadow = true;
      marker.add(baseMesh);

      // B. Mástil estructural de aluminio anodizado
      const mastGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.8, 8);
      const mastMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.85,
        roughness: 0.15
      });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.y = 1.9;
      mast.castShadow = true;
      marker.add(mast);

      // C. Panel solar fotovoltaico monocristalino
      const solarGeo = new THREE.BoxGeometry(0.85, 0.04, 0.6);
      const solarMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        metalness: 0.9,
        roughness: 0.1
      });
      const solar = new THREE.Mesh(solarGeo, solarMat);
      solar.position.set(0, 3.1, 0.2);
      solar.rotation.x = -0.45;
      marker.add(solar);

      // D. Gabinete estanco IP67 para Datalogger / RTU
      const boxGeo = new THREE.BoxGeometry(0.5, 0.7, 0.35);
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.6,
        roughness: 0.3
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(0, 1.8, 0.18);
      marker.add(box);

      // E. Luz de estado / Baliza superior
      const bulbGeo = new THREE.SphereGeometry(0.28, 16, 16);
      const isSelected = selectedNodeId === node.id_nodo;
      const bulbMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x22d3ee : (node.activo ? 0x10b981 : 0xf59e0b)
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.y = 3.9;
      marker.add(bulb);

      // F. Anillo de radioenlace pulsante sobre el terreno
      const ringGeo = new THREE.RingGeometry(1.2, 1.85, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x22d3ee : (node.activo ? 0x10b981 : 0xf59e0b),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.6
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.28;
      marker.add(ring);

      // G. Etiqueta flotante con nombre y cota real sobre la estación (Canvas Sprite)
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = isSelected 
          ? 'rgba(6, 182, 212, 0.95)' 
          : (isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)');
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(10, 10, 364, 108, 18);
        } else {
          ctx.rect(10, 10, 364, 108);
        }
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = isSelected ? '#ffffff' : (isDark ? '#38bdf8' : '#0284c7');
        ctx.stroke();

        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = isSelected ? '#020617' : (isDark ? '#f8fafc' : '#0f172a');
        ctx.textAlign = 'center';
        ctx.fillText(node.nombre || node.id_nodo, 192, 54);

        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = isSelected ? '#082f49' : (isDark ? '#38bdf8' : '#0284c7');
        ctx.fillText(`Cota: ${node.cota_msnm} msnm`, 192, 92);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, 5.3, 0);
        sprite.scale.set(6.2, 2.1, 1.0);
        marker.add(sprite);
      }

      group.add(marker);
    });

    // 5. Línea 3D de enlace de red entre estaciones monitoreadas
    if (stationPositions.length >= 2) {
      const linkCurve = new THREE.CatmullRomCurve3(
        stationPositions.map(p => p.clone().add(new THREE.Vector3(0, 0.5, 0))),
        false,
        'centripetal',
        0.5
      );
      const linkGeo = new THREE.TubeGeometry(linkCurve, 64, 0.12, 8, false);
      const linkMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0x06b6d4 : 0x0284c7,
        transparent: true,
        opacity: isDark ? 0.6 : 0.45
      });
      const linkMesh = new THREE.Mesh(linkGeo, linkMat);
      group.add(linkMesh);
    }
  }, [dbNodes, selectedNodeId, isDark, topographyData, hasSeaNode, hasLagunaNode, scale]);

  // Sincronización reactiva del sub-escenario micro cuando cambie la calibración
  useEffect(() => {
    if (!objectsRef.current.microGroup || !activeCalibration) return;
    buildMicroStationScene(objectsRef.current.microGroup, activeCalibration, telemetry, isDark, objectsRef, materialsRef);
  }, [activeCalibration]);

  // Preset handlers strictly separated and isolated per scale/model
  const applyMicroPreset = (preset) => {
    setMicroPreset(preset);
    if (!cameraRef.current || !controlsRef.current || !objectsRef.current) return;
    const p = objectsRef.current.microParams || { W: 7.0, X_water: 0, H_max: 1.4 };
    const W = p.W || 7.0;
    const xW = p.X_water || 0;
    const maxH = p.H_max || 1.4;

    objectsRef.current.flightFrames = 40;
    if (preset === 'general') {
      objectsRef.current.targetCamPos = new THREE.Vector3(W * 0.5 + 4.2, 3.2, 7.2 + W * 0.22);
      objectsRef.current.targetLookAt = new THREE.Vector3(xW * 0.5, 0.4, 0);
    } else if (preset === 'nodo') {
      // Enfoque a cota humana a la estación técnica y gabinete elevado Nodo Central Sentinel
      const tinasX = W * 0.5 + 1.35;
      const zCenter = 0.85;
      objectsRef.current.targetCamPos = new THREE.Vector3(tinasX + 2.5, 2.5, zCenter + 2.0);
      objectsRef.current.targetLookAt = new THREE.Vector3(tinasX, 2.0, zCenter);
    } else if (preset === 'ultrasonico') {
      // Enfoque cenital y lateral al sensor ultrasónico voladizo y su cono acústico
      objectsRef.current.targetCamPos = new THREE.Vector3(xW + 2.4, 4.3, 3.2);
      objectsRef.current.targetLookAt = new THREE.Vector3(xW, 3.8, 0);
    } else if (preset === 'molinete') {
      // Enfoque a cota humana al molinete y sensor Hall ubicado en el cuarto transversal del río
      const xM = W * 0.5 - W * 0.25;
      objectsRef.current.targetCamPos = new THREE.Vector3(xM + 2.0, 1.9, 2.8);
      objectsRef.current.targetLookAt = new THREE.Vector3(xM, 1.35, 0);
    } else if (preset === 'tinas') {
      // Enfoque a las tinas en el suelo y a la estación de control de nodo elevada sobre ellas
      const tinasX = W * 0.5 + 1.35;
      objectsRef.current.targetCamPos = new THREE.Vector3(tinasX + 2.6, 2.1, 0.85 + 2.2);
      objectsRef.current.targetLookAt = new THREE.Vector3(tinasX, 1.1, 0.85);
    }
  };

  const applyLagunaPreset = (preset) => {
    setLagunaPreset(preset);
    if (!cameraRef.current || !controlsRef.current || !objectsRef.current) return;
    objectsRef.current.flightFrames = 40;
    if (preset === 'general') {
      objectsRef.current.targetCamPos = new THREE.Vector3(0, 36, 46);
      objectsRef.current.targetLookAt = new THREE.Vector3(0, 5.5, 0);
    } else if (preset === 'boya') {
      objectsRef.current.targetCamPos = new THREE.Vector3(4, 9, 8);
      objectsRef.current.targetLookAt = new THREE.Vector3(0, 5.1, 0);
    } else if (preset === 'presa') {
      objectsRef.current.targetCamPos = new THREE.Vector3(0, 14, 34);
      objectsRef.current.targetLookAt = new THREE.Vector3(0, 5.2, 22);
    } else if (preset === 'afluente') {
      objectsRef.current.targetCamPos = new THREE.Vector3(-10, 14, -10);
      objectsRef.current.targetLookAt = new THREE.Vector3(-16, 7.2, -18);
    }
  };

  const applyMacroPreset = (preset) => {
    setMacroPreset(preset);
    if (!cameraRef.current || !controlsRef.current || !objectsRef.current) return;
    objectsRef.current.flightFrames = 40;
    if (preset === 'general') {
      objectsRef.current.targetCamPos = new THREE.Vector3(12, 54, 62);
      objectsRef.current.targetLookAt = new THREE.Vector3(0, 7, 0);
    } else if (preset === 'cabecera') {
      objectsRef.current.targetCamPos = new THREE.Vector3(-46, 36, -14);
      objectsRef.current.targetLookAt = new THREE.Vector3(-55, 23, -32);
    } else if (preset === 'saume') {
      objectsRef.current.targetCamPos = new THREE.Vector3(-14, 22, 6);
      objectsRef.current.targetLookAt = new THREE.Vector3(-22, 12.8, -8);
    } else if (preset === 'desembocadura') {
      objectsRef.current.targetCamPos = new THREE.Vector3(48, 14, 52);
      objectsRef.current.targetLookAt = new THREE.Vector3(56, 0.05, 46);
    }
  };

  const setCameraPreset = (preset) => {
    const cur = scaleRef.current || scale;
    if (cur === 'micro') {
      applyMicroPreset(preset);
    } else if (cur === 'laguna') {
      applyLagunaPreset(preset);
    } else {
      applyMacroPreset(preset);
    }
  };

  const handleScaleChange = (newScale) => {
    setScale(newScale);
    scaleRef.current = newScale;
    if (objectsRef.current) {
      objectsRef.current.targetCamPos = null;
      objectsRef.current.targetLookAt = null;
      objectsRef.current.flightFrames = 0;
    }
  };

  // Handle Scale Switch (Macrocuenca 65km vs Laguna Altoandina vs Micro-Nodo)
  useEffect(() => {
    const { microGroup, macroGroup, lagunaGroup } = objectsRef.current;
    if (!microGroup || !macroGroup || !lagunaGroup || !cameraRef.current || !controlsRef.current) return;
    const controls = controlsRef.current;
    scaleRef.current = scale;

    if (scale === 'micro') {
      microGroup.visible = true;
      macroGroup.visible = false;
      lagunaGroup.visible = false;

      controls.minDistance = 0.35;
      controls.maxDistance = 55.0;
      controls.maxPolarAngle = Math.PI / 2.15;
      applyMicroPreset(microPreset);

      // Asegurar carga de calibración para el nodo activo
      if (selectedNodeId && (!activeCalibrationRef.current || activeCalibrationRef.current.id_nodo !== selectedNodeId)) {
        loadCalibrationForNode(selectedNodeId).then(calib => {
          if (objectsRef.current.microGroup) {
            buildMicroStationScene(objectsRef.current.microGroup, calib, telemetry, isDark, objectsRef, materialsRef);
          }
        });
      }
    } else if (scale === 'laguna') {
      microGroup.visible = false;
      macroGroup.visible = false;
      lagunaGroup.visible = true;
      controls.minDistance = 1.5;
      controls.maxDistance = 120.0;
      controls.maxPolarAngle = Math.PI / 2.15;
      applyLagunaPreset(lagunaPreset);
    } else { // macro
      microGroup.visible = false;
      macroGroup.visible = true;
      lagunaGroup.visible = false;
      controls.minDistance = 3.5;
      controls.maxDistance = 160.0;
      controls.maxPolarAngle = Math.PI / 2.15;
      applyMacroPreset(macroPreset);
    }
  }, [scale]);

  // Sincronización en tiempo real de los badges 3D sobre sensores al recibir telemetría
  useEffect(() => {
    if (scale !== 'micro' || !objectsRef.current) return;
    const { badgeUltrasonic, badgeMolinete, badgeTinas, badgeCabinet, baseWaterY } = objectsRef.current;
    if (badgeUltrasonic) {
      updateSensorBadgeCanvas(badgeUltrasonic, 'Sensor Ultrasónico', [
        { label: 'Tirante', value: `${telemetry.tirante_cm} cm`, color: '#38bdf8' },
        { label: 'Cota Agua', value: `${(baseWaterY !== undefined ? baseWaterY : -0.4).toFixed(2)} m`, color: '#22d3ee' },
        { label: 'Eco Acústico', value: '40 kHz (OK)', color: '#4ade80' }
      ], '#06b6d4', isDark);
    }
    if (badgeMolinete) {
      updateSensorBadgeCanvas(badgeMolinete, 'Molinete Hidrométrico', [
        { label: 'Sensor Hall', value: `${telemetry.rpm_hall} RPM`, color: '#38bdf8' },
        { label: 'Velocidad', value: `${telemetry.velocidad_ms} m/s`, color: '#22d3ee' },
        { label: 'Caudal Q', value: `${telemetry.caudal_m3s} m³/s`, color: '#4ade80' }
      ], '#3b82f6', isDark);
    }
    if (badgeTinas) {
      updateSensorBadgeCanvas(badgeTinas, 'Tinas / Calidad Agua', [
        { label: 'pH Fluvial', value: `${telemetry.ph} pH`, color: '#4ade80' },
        { label: 'TDS / Turb', value: `${telemetry.tds_us} µS | ${telemetry.turbidez_ntu} NTU`, color: '#38bdf8' },
        { label: 'Temperatura', value: `${telemetry.temp_c} °C`, color: '#f59e0b' }
      ], '#10b981', isDark);
    }
    if (badgeCabinet) {
      updateSensorBadgeCanvas(badgeCabinet, 'Nodo Central Sentinel', [
        { label: 'Batería', value: `${telemetry.bateria_v}V (${telemetry.bateria_pct}%)`, color: '#4ade80' },
        { label: 'Froude / Manning', value: `${telemetry.froude} | ${telemetry.manning_n}`, color: '#38bdf8' },
        { label: 'Enlace', value: 'LoRa / 4G (En línea)', color: '#22c55e' }
      ], '#8b5cf6', isDark);
    }
  }, [telemetry, isDark, scale]);

  // Selección dinámica de estación real y vuelo suave de cámara
  const handleNodeSelect = async (nodeId) => {
    setSelectedNodeId(nodeId);
    if (!nodeId) return;

    const foundNode = dbNodes.find(n => n.id_nodo === nodeId);
    if (foundNode) {
      setSelectedDbNode(foundNode);
      const calib = await loadCalibrationForNode(nodeId);

      // Si estamos en escala micro, actualizar estación directamente
      if (scale === 'micro') {
        if (objectsRef.current.microGroup) {
          buildMicroStationScene(objectsRef.current.microGroup, calib, telemetry, isDark, objectsRef, materialsRef);
        }
        return;
      }

      // Si es nodo de alta montaña o laguna (cota >= 3800 o nombre contiene laguna)
      if (isLagunaNode(foundNode)) {
        if (scale !== 'laguna') handleScaleChange('laguna');
        if (objectsRef.current) {
          objectsRef.current.targetCamPos = new THREE.Vector3(4, 12, 14);
          objectsRef.current.targetLookAt = new THREE.Vector3(0, 5.2, 0);
          objectsRef.current.flightFrames = 40;
        }
        return;
      }

      // Si es nodo del valle fluvial en macrocuenca
      if (scale !== 'macro') handleScaleChange('macro');
      const pos = nodePositionsRef.current[nodeId];
      if (pos && objectsRef.current) {
        objectsRef.current.targetCamPos = new THREE.Vector3(pos.x + 10, pos.y + 14, pos.z + 14);
        objectsRef.current.targetLookAt = new THREE.Vector3(pos.x, pos.y, pos.z);
        objectsRef.current.flightFrames = 40;
      }
    }
  };

  // Selector específico e interactivo para escala micro
  const handleMicroNodeSelect = async (nodeId) => {
    setSelectedNodeId(nodeId);
    const foundNode = dbNodes.find(n => n.id_nodo === nodeId);
    if (foundNode) setSelectedDbNode(foundNode);
    const calib = await loadCalibrationForNode(nodeId);
    if (objectsRef.current.microGroup) {
      buildMicroStationScene(objectsRef.current.microGroup, calib, telemetry, isDark, objectsRef, materialsRef);
    }
  };


  const handleLagunaNodeSelect = (nodeId) => {
    setSelectedLagunaNode(nodeId);
    if (nodeId === 'ALL') {
      if (objectsRef.current) {
        objectsRef.current.targetCamPos = new THREE.Vector3(0, 36, 46);
        objectsRef.current.targetLookAt = new THREE.Vector3(0, 5.5, 0);
        objectsRef.current.flightFrames = 40;
      }
    } else {
      const found = dbNodes.find(n => n.id_nodo === nodeId);
      if (found) {
        setSelectedDbNode(found);
        setSelectedNodeId(found.id_nodo);
        if (objectsRef.current) {
          objectsRef.current.targetCamPos = new THREE.Vector3(2, 10, 12);
          objectsRef.current.targetLookAt = new THREE.Vector3(0, 5.2, 0);
          objectsRef.current.flightFrames = 40;
        }
      }
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] lg:h-[calc(100vh-5rem)] overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans select-none touch-none">
      
      {/* THREE.JS CANVAS CONTAINER (Con soporte táctil directo para móviles) */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none" 
        style={{ touchAction: 'none' }}
      />

      {/* ========================================================= */}
      {/* TOP FLOATING BAR (Compacta, Responsiva & Móvil-Amigable)   */}
      {/* ========================================================= */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20">
        
        {/* Left: Water Resource Typology Switcher & Node Selector */}
        <div className="flex items-center space-x-2 pointer-events-auto bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl shadow-xl overflow-x-auto no-scrollbar max-w-full">
          <div className="hidden sm:flex items-center space-x-1.5 border-r border-slate-200 dark:border-slate-800 pr-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-700 dark:text-cyan-300">GEMELO 3D</span>
          </div>

          {/* 3-Way Segmented Control */}
          <div className="flex bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => handleScaleChange('macro')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                scale === 'macro' 
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Macrocuenca 65 km</span>
              <span className="md:hidden">Cuenca</span>
            </button>

            {hasLagunaNode && (
              <button 
                onClick={() => handleScaleChange('laguna')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  scale === 'laguna' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Mountain className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Laguna Altoandina</span>
                <span className="md:hidden">Laguna</span>
              </button>
            )}

            <button 
              onClick={() => handleScaleChange('micro')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                scale === 'micro' 
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Micro-Nodo Aforo</span>
              <span className="md:hidden">Aforo</span>
            </button>
          </div>

          {/* Sincronización de Nodos Creados / Selector Dinámico */}
          {scale === 'macro' && (
            <select 
              value={selectedNodeId} 
              onChange={(e) => handleNodeSelect(e.target.value)}
              className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[150px] sm:max-w-[220px] truncate"
            >
              {dbNodes.length === 0 ? (
                <option value="">Sin estaciones en BD</option>
              ) : (
                dbNodes.map(n => (
                  <option key={n.id_nodo} value={n.id_nodo}>
                    🟢 {n.nombre || n.id_nodo} ({n.cota_msnm} msnm)
                  </option>
                ))
              )}
            </select>
          )}

          {scale === 'laguna' && hasLagunaNode && (
            <select 
              value={selectedLagunaNode} 
              onChange={(e) => handleLagunaNodeSelect(e.target.value)}
              className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[150px] sm:max-w-[220px] truncate"
            >
              <option value="ALL">Panorámica Lacustre</option>
              {dbNodes.filter(isLagunaNode).map(n => (
                <option key={n.id_nodo} value={n.id_nodo}>
                  🟢 {n.nombre || n.id_nodo} ({n.cota_msnm}m)
                </option>
              ))}
            </select>
          )}

          {scale === 'micro' && (
            <select 
              value={selectedNodeId} 
              onChange={(e) => handleMicroNodeSelect(e.target.value)}
              className="bg-cyan-50 dark:bg-slate-950 text-cyan-900 dark:text-cyan-300 font-mono text-xs px-2.5 py-1 rounded-lg border border-cyan-300 dark:border-cyan-800 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[160px] sm:max-w-[240px] truncate font-semibold"
            >
              {dbNodes.length === 0 ? (
                <option value="">Sin estaciones en BD</option>
              ) : (
                dbNodes.map(n => {
                  const calib = calibrationsCacheRef.current[n.id_nodo];
                  const wStr = calib?.ancho_total_rio_m ? ` • W: ${calib.ancho_total_rio_m}m` : '';
                  return (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      🟢 {n.nombre || n.id_nodo}{wStr} ({n.cota_msnm}m)
                    </option>
                  );
                })
              )}
            </select>
          )}

        </div>

        {/* Right: Reset Camera, Flow particles, & DRAWER TOGGLE BUTTON */}
        <div className="flex items-center space-x-1.5 pointer-events-auto bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-2xl shadow-xl">
          <button 
            onClick={() => setCameraPreset('general')}
            title="Resetear perspectiva de cámara"
            className="p-1.5 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setShowParticles(!showParticles)}
            title="Activar/Desactivar partículas de corriente"
            className={`px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
              showParticles 
                ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 font-semibold' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Partículas
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* MAIN INSPECTOR DRAWER TOGGLE BUTTON */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm ${
              isDrawerOpen
                ? 'bg-cyan-600 text-white shadow-cyan-600/30'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110 shadow-blue-600/30'
            }`}
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>{isDrawerOpen ? 'Cerrar Panel' : 'Telemetría & Datos'}</span>
          </button>
        </div>

      </div>

      {/* ========================================================= */}
      {/* BOTTOM HUD: CAMERA PRESETS & COMPACT CONTEXT STRIP       */}
      {/* ========================================================= */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20">
        
        {/* Dynamic Camera Presets Selector according to Scale */}
        <div className="flex items-center space-x-1 pointer-events-auto bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-2xl shadow-xl overflow-x-auto no-scrollbar max-w-full">
          <span className="hidden sm:inline text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1.5">Vistas:</span>
          
          {scale === 'macro' && (
            <>
              <button 
                onClick={() => setCameraPreset('general')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  macroPreset === 'general' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Panorámica
              </button>
              <button 
                onClick={() => setCameraPreset('cabecera')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  macroPreset === 'cabecera' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Cabecera
              </button>
              <button 
                onClick={() => setCameraPreset('saume')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  macroPreset === 'saume' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Valle Medio
              </button>
              {hasSeaNode && (
                <button 
                  onClick={() => setCameraPreset('desembocadura')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    macroPreset === 'desembocadura' 
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Desembocadura
                </button>
              )}
              {dbNodes.map(n => (
                <button
                  key={n.id_nodo}
                  onClick={() => handleNodeSelect(n.id_nodo)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedNodeId === n.id_nodo
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {n.nombre || n.id_nodo} ({n.cota_msnm}m)
                </button>
              ))}
            </>
          )}

          {scale === 'laguna' && (
            <>
              <button 
                onClick={() => setCameraPreset('general')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  lagunaPreset === 'general' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Panorámica
              </button>
              <button 
                onClick={() => setCameraPreset('boya')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  lagunaPreset === 'boya' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Boya Limnimétrica
              </button>
              <button 
                onClick={() => setCameraPreset('presa')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  lagunaPreset === 'presa' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Presa & Vertedero
              </button>
              <button 
                onClick={() => setCameraPreset('afluente')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  lagunaPreset === 'afluente' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Afluente
              </button>
              {dbNodes.filter(isLagunaNode).map(n => (
                <button
                  key={n.id_nodo}
                  onClick={() => handleLagunaNodeSelect(n.id_nodo)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedNodeId === n.id_nodo
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {n.nombre || n.id_nodo} ({n.cota_msnm}m)
                </button>
              ))}
            </>
          )}

          {scale === 'micro' && (
            <>
              <button 
                onClick={() => setCameraPreset('general')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  microPreset === 'general' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                General
              </button>
              <button 
                onClick={() => setCameraPreset('nodo')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  microPreset === 'nodo' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Nodo Central
              </button>
              <button 
                onClick={() => setCameraPreset('ultrasonico')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  microPreset === 'ultrasonico' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Ultrasónico
              </button>
              <button 
                onClick={() => setCameraPreset('molinete')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  microPreset === 'molinete' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Molinete
              </button>
              <button 
                onClick={() => setCameraPreset('tinas')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  microPreset === 'tinas' 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Tinas
              </button>
            </>
          )}
        </div>

        {/* Live Context Metric Strip */}
        <div className="hidden sm:flex items-center space-x-3 pointer-events-auto bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl shadow-xl text-xs font-mono">
          {scale === 'laguna' ? (
            <>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Espejo: </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{lagunaTelemetry.cota_msnm} msnm</span>
              </div>
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">OD: </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{lagunaTelemetry.oxigeno_disuelto} mg/L</span>
              </div>
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">Volumen: </span>
                <span className="text-cyan-600 dark:text-cyan-300 font-bold">{lagunaTelemetry.volumen_mmc} MMC</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Froude: </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{telemetry.froude}</span>
              </div>
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">Manning: </span>
                <span className="text-cyan-600 dark:text-cyan-300 font-bold">{telemetry.manning_n}</span>
              </div>
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-500 dark:text-slate-400">Batería: </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{telemetry.bateria_v}V ({telemetry.bateria_pct}%)</span>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* UNIFIED INSPECTOR DRAWER (Non-Intrusive, Side / Bottom)   */}
      {/* ========================================================= */}
      {/* Backdrop on mobile when drawer is open */}
      {isDrawerOpen && (
        <div 
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      <div className={`fixed lg:absolute top-0 right-0 h-full w-full sm:w-96 max-w-full z-40 bg-white/98 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col pointer-events-auto ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}>
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>Telemetría & Inspección</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold">1 Hz</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {scale === 'macro' ? 'Macrocuenca Fluvial (65 km)' : scale === 'laguna' ? 'Laguna Altoandina Glacial' : 'Micro-Nodo Estación Ribereña'}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Segmented Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 p-2 gap-1 bg-slate-50/50 dark:bg-slate-950/30">
          <button
            onClick={() => setActiveDrawerTab('telemetry')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeDrawerTab === 'telemetry'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Hidráulica</span>
          </button>

          <button
            onClick={() => setActiveDrawerTab('quality')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeDrawerTab === 'quality'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Calidad</span>
          </button>

          <button
            onClick={() => setActiveDrawerTab('operations')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeDrawerTab === 'operations'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Operación</span>
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ======================================================= */}
          {/* TAB 1: HIDRÁULICA Y NODOS EN VIVO                       */}
          {/* ======================================================= */}
          {activeDrawerTab === 'telemetry' && (
            <div className="space-y-4">
              
              {/* Resumen Hidráulico Principal */}
              {scale === 'macro' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Caudal en Tránsito</div>
                      <div className="text-xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                        {telemetry.caudal_m3s} <span className="text-xs font-normal text-slate-400">m³/s</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Régimen normal</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Tirante Hidráulico</div>
                      <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        {telemetry.tirante_cm} <span className="text-xs font-normal text-slate-400">cm</span>
                      </div>
                      <div className="text-[10px] text-cyan-600 dark:text-cyan-400">Sensor ultrasónico</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Velocidad Media:</span>
                      <span className="font-mono font-semibold">{telemetry.velocidad_ms} m/s</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">N° de Froude:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{telemetry.froude} (Subcrítico)</span>
                    </div>
                  </div>

                  {/* Tarjeta de Perfil Topográfico & Distancias Reales Calculadas */}
                  <div className="p-3 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-950/80 border border-cyan-800/50 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-cyan-400 font-bold">
                      <div className="flex items-center space-x-1.5">
                        <Mountain className="w-4 h-4" />
                        <span>Perfil Topográfico & Distancias Reales</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">Haversine</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Longitud Monitoreada</div>
                        <div className="text-sm font-bold text-cyan-300">{topographyData.totalDistanceKm.toFixed(2)} km</div>
                      </div>
                      <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Distancia Promedio</div>
                        <div className="text-sm font-bold text-slate-200">{topographyData.avgDistanceKm.toFixed(2)} km</div>
                      </div>
                      <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Desnivel Total (ΔH)</div>
                        <div className="text-sm font-bold text-emerald-400">{topographyData.totalElevationDrop} m</div>
                      </div>
                      <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Pendiente Media (S₀)</div>
                        <div className="text-sm font-bold text-amber-400">{topographyData.avgSlopePct.toFixed(2)} %</div>
                      </div>
                    </div>

                    {topographyData.segments.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Tramos Inter-Estaciones Calculados:
                        </div>
                        {topographyData.segments.map((seg, sIdx) => (
                          <div key={sIdx} className="p-2 bg-slate-900/50 rounded-lg border border-slate-800/60 flex items-center justify-between text-[11px]">
                            <div>
                              <div className="font-semibold text-slate-200 flex items-center space-x-1">
                                <span>{seg.from.nombre || seg.from.id_nodo}</span>
                                <span className="text-cyan-400">➔</span>
                                <span>{seg.to.nombre || seg.to.id_nodo}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ΔH: {seg.deltaH}m • S₀: {seg.slopePct.toFixed(2)}%
                              </div>
                            </div>
                            <div className="font-mono font-bold text-cyan-400 text-right">
                              {seg.distanceKm.toFixed(2)} km
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {scale === 'laguna' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Volumen Embalsado</div>
                      <div className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                        {lagunaTelemetry.volumen_mmc} <span className="text-xs font-normal text-slate-400">MMC</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">{lagunaTelemetry.capacidad_pct}% Capacidad</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Espejo de Agua</div>
                      <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        {lagunaTelemetry.espejo_ha} <span className="text-xs font-normal text-slate-400">ha</span>
                      </div>
                      <div className="text-[10px] text-cyan-600 dark:text-cyan-400">Cota {lagunaTelemetry.cota_msnm}m</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Descarga Ecológica / Salida:</span>
                      <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">{lagunaTelemetry.descarga_ecologica_m3s} m³/s</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Profundidad Máxima:</span>
                      <span className="font-mono font-semibold">28.4 m (Vaso Central)</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Estado Trófico:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{lagunaTelemetry.estado_trofico}</span>
                    </div>
                  </div>
                </>
              )}

              {scale === 'micro' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Aforo Continuo</div>
                      <div className="text-xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                        {telemetry.caudal_m3s} <span className="text-xs font-normal text-slate-400">m³/s</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">ISO 748 Dovelas</div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Molinete Hall</div>
                      <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        {telemetry.rpm_hall} <span className="text-xs font-normal text-slate-400">RPM</span>
                      </div>
                      <div className="text-[10px] text-cyan-600 dark:text-cyan-400">Eje seco continuo</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Área Hidráulica Mojada:</span>
                      <span className="font-mono font-semibold">{telemetry.area_m2} m²</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Ancho Superficial:</span>
                      <span className="font-mono font-semibold">{telemetry.ancho_m} m</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Arquitectura de Estación:</span>
                      <span className="font-mono font-semibold">Doble Tina Rompeolas</span>
                    </div>
                  </div>

                  {/* Tarjeta de Sección Hidráulica & Dovelas Batimétricas Calibradas */}
                  <div className="p-3 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-950/80 border border-cyan-800/50 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-cyan-400 font-bold">
                      <div className="flex items-center space-x-1.5">
                        <Gauge className="w-4 h-4" />
                        <span>Sección Hidráulica & Dovelas ISO 748</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                        {activeCalibration?.tipo_seccion || 'REGLETA_PUNTOS'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Ancho Registrado (W)</div>
                        <div className="text-sm font-bold text-cyan-300">
                          {(activeCalibration?.ancho_total_rio_m || objectsRef.current.microParams?.W || 7.0).toFixed(1)} m
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Espejo Agua Activo</div>
                        <div className="text-sm font-bold text-emerald-400">
                          {(objectsRef.current.microParams?.B_water || 6.8).toFixed(2)} m
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Profundidad Máx. Lecho</div>
                        <div className="text-sm font-bold text-slate-200">
                          {(objectsRef.current.microParams?.H_max || 1.4).toFixed(2)} m
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900/70 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400 font-sans">Cota Espejo de Agua</div>
                        <div className="text-sm font-bold text-cyan-300">
                          {(objectsRef.current.microParams?.waterY || -0.15).toFixed(2)} m
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Verticales de Aforo */}
                    {objectsRef.current.microParams?.mappedVerts && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          <span>Dovelas Batimétricas del Nodo:</span>
                          <span className="text-cyan-400 font-mono">{objectsRef.current.microParams.mappedVerts.length} puntos</span>
                        </div>
                        <div className="space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto no-scrollbar pr-1">
                          {objectsRef.current.microParams.mappedVerts.map((v, vIdx) => (
                            <div key={vIdx} className="p-1.5 bg-slate-900/60 rounded-lg border border-slate-800/70 flex items-center justify-between">
                              <span className="text-slate-300 font-sans">
                                {vIdx === 0 ? 'Orilla Izq' : vIdx === objectsRef.current.microParams.mappedVerts.length - 1 ? 'Orilla Der' : `Dovela V${vIdx}`}
                              </span>
                              <span className="text-slate-400">x = {v.rawD.toFixed(1)}m</span>
                              <span className="text-cyan-400 font-bold">prof = {v.rawY.toFixed(2)}m</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}


              {/* Nodos Sincronizados de la Base de Datos */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Nodos en Base de Datos ({dbNodes.length})</span>
                  </div>
                  <button 
                    onClick={fetchDbNodes}
                    className="p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded transition-colors cursor-pointer"
                    title="Actualizar nodos desde BD"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDbNodes ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {dbNodes.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400 text-center">
                    Cargando o sin nodos registrados aún.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {dbNodes.map((node) => {
                      const isSelected = selectedNodeId === node.id_nodo;
                      return (
                        <div 
                          key={node.id_nodo}
                          onClick={() => handleNodeSelect(node.id_nodo)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                            isSelected 
                              ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-700' 
                              : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
                              <span className={`w-2 h-2 rounded-full ${node.activo ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span>{node.nombre || node.id_nodo}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {node.tramo_sector || node.subcuenca || 'Sector General'} • Cota {node.cota_msnm}m
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-cyan-600 dark:text-cyan-400 text-[11px] font-medium">
                            <span>Ver 3D</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 2: CALIDAD DE AGUA & SENSORES                       */}
          {/* ======================================================= */}
          {activeDrawerTab === 'quality' && (
            <div className="space-y-2.5 text-xs">
              
              {/* Sonda pH */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200">Sonda pH (E-201C)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Cámara sumergida • Flujo continuo</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">{telemetry.ph} pH</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Apta Riego</div>
                </div>
              </div>

              {/* Turbidez TS-300 */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200">Turbidez (TS-300)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Cámara óptica reflectométrica</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-300">{telemetry.turbidez_ntu} NTU</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Transparente</div>
                </div>
              </div>

              {/* Conductividad & TDS */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200">Conductividad & TDS</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Salinidad agronómica</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-300">{telemetry.tds_us} µS/cm</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Baja salinidad</div>
                </div>
              </div>

              {/* Temperatura */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200">Temperatura de Agua</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Termistor blindado</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-200">{telemetry.temp_c} °C</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Estable</div>
                </div>
              </div>

              {/* Parámetros Lacustres Especiales si es Laguna */}
              {scale === 'laguna' && (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-200">Oxígeno Disuelto (OD)</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Boya limnimétrica a 2m</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">{lagunaTelemetry.oxigeno_disuelto} mg/L</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{lagunaTelemetry.oxigeno_sat_pct}% Sat</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-200">Clorofila-a</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Fluorímetro in-situ</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{lagunaTelemetry.clorofila_ugl} µg/L</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Sin floración</div>
                    </div>
                  </div>
                </>
              )}

              {/* Batería y Radioenlace */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200">Alimentación Solar / Batería</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">LiFePO4 + Panel 50W</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">{telemetry.bateria_v} V</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{telemetry.bateria_pct}% Carga</div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================= */}
          {/* TAB 3: OPERACIÓN & ACCIONES                             */}
          {/* ======================================================= */}
          {activeDrawerTab === 'operations' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-200">
                <div className="font-bold flex items-center space-x-1.5 text-blue-700 dark:text-blue-300 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Acciones Rápidas del Gemelo Digital</span>
                </div>
                Ejecuta análisis predictivos de descarga, revisa el historial de mantenimiento o sincroniza con la instrumentación física.
              </div>

              <button 
                onClick={() => onNavigateWhatIf && onNavigateWhatIf(selectedNodeId)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-900/20 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Simular Descarga en What-If</span>
              </button>

              <button 
                onClick={() => onNavigateMaintenance && onNavigateMaintenance(selectedNodeId)}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-300 dark:border-slate-700 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Bitácora de Mantenimiento</span>
              </button>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div>• Nodo seleccionado: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedNodeId}</span></div>
                <div>• Frecuencia de muestreo: <span className="font-mono text-cyan-600 dark:text-cyan-400">1.0 Hz en tiempo real</span></div>
                <div>• Protocolo de enlace: <span className="font-mono text-emerald-600 dark:text-emerald-400">ESP32 / LoRaWAN / 4G LTE</span></div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
