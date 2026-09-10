import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Activity, 
  Clock, 
  Droplets, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

export default function CascadeRiverVisualizer3D({ cascadeResult, originSalinity, originPh, originFlow }) {
  if (!cascadeResult || !cascadeResult.secuencia_nodos || cascadeResult.secuencia_nodos.length === 0) {
    return null;
  }

  const nodes = cascadeResult.secuencia_nodos;
  const originNodeName = cascadeResult.nombre_origen || cascadeResult.id_nodo_origen || 'Origen Cabecera';
  const originCota = cascadeResult.cota_origen_msnm || 3500;
  
  // Total distance and total duration
  const totalDistanceKm = nodes[nodes.length - 1].distancia_acumulada_km || 65.0;
  const totalDurationHours = (nodes[nodes.length - 1].lead_time_despeje_horas || nodes[nodes.length - 1].lead_time_frente_horas * 1.4) + 0.5;
  const flowVelocityKmh = nodes[0]?.velocidad_media_kmh || 5.0;

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [simTimeHours, setSimTimeHours] = useState(0); // Current simulated time in hours
  const [speedMultiplier, setSpeedMultiplier] = useState(60); // 60x = 1 sec = 1 hour, 15x, 5x, 1x
  const [selectedNodeHover, setSelectedNodeHover] = useState(null);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const particlesRef = useRef([]);

  // Initialize water particles
  useEffect(() => {
    const particleCount = 45;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        progress: Math.random(), // 0.0 to 1.0 along the river
        speed: 0.0008 + Math.random() * 0.0006,
        offsetY: (Math.random() - 0.5) * 8,
        size: 1.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.6
      });
    }
    particlesRef.current = particles;
  }, []);

  // Animation Loop for Simulation Time and Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = (timestamp) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const dt = (timestamp - lastTimestampRef.current) / 1000; // seconds
      lastTimestampRef.current = timestamp;

      // Advance simulation time if playing
      if (isPlaying) {
        setSimTimeHours((prev) => {
          // SpeedMultiplier: 60 -> 1 real second = 1 sim hour (1 / 3600 * 3600 = 1 h/s)
          // SpeedMultiplier: 1 -> 1 real second = 1 sim min (1/60 h/s)
          const simTimeDelta = (dt * speedMultiplier) / 60; // in hours
          const next = prev + simTimeDelta;
          if (next >= totalDurationHours) {
            setIsPlaying(false);
            return totalDurationHours;
          }
          return next;
        });
      }

      // Draw canvas frame
      drawScene(ctx, canvas);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, simTimeHours, speedMultiplier, cascadeResult, selectedNodeHover]);

  // Main Canvas Rendering Function
  const drawScene = (ctx, canvas) => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Dynamic wave progress along the river (0 to 1)
    const currentFrontKm = Math.min(totalDistanceKm * 1.15, simTimeHours * flowVelocityKmh * 1.25);
    const frontProgressRatio = Math.min(1.2, currentFrontKm / (totalDistanceKm || 1));

    // Construct 3D Isometric Waypoints
    // Origin is top-left/mountain (high elevation), downstream is bottom-right/valley (low elevation)
    const padX = 60;
    const padY = 50;
    const drawWidth = width - padX * 2;
    const drawHeight = height - padY * 2;

    const waypoints = [
      {
        id: 'ORIGEN',
        name: originNodeName,
        cota: originCota,
        distKm: 0,
        x: padX,
        y: padY + 30,
        zRatio: 1.0,
        leadTimeH: 0,
        ec: originSalinity || 1800,
        ph: originPh || 7.6,
        gate: 'ORIGEN_DISPARO',
        alert: originSalinity > 1500 ? 'CRÍTICA' : 'ADVERTENCIA'
      }
    ];

    nodes.forEach((n, idx) => {
      const prog = (n.distancia_acumulada_km / totalDistanceKm);
      // S-curve meanders in isometric space
      const meander = Math.sin(prog * Math.PI * 2.2) * (drawHeight * 0.18);
      const wx = padX + prog * drawWidth;
      const wy = padY + 30 + prog * (drawHeight * 0.72) + meander;
      const zRatio = (n.cota_msnm - 100) / (originCota - 100 || 1);

      waypoints.push({
        id: n.id_nodo,
        name: n.nombre,
        cota: n.cota_msnm,
        distKm: n.distancia_acumulada_km,
        x: wx,
        y: wy,
        zRatio: Math.max(0.05, Math.min(1.0, zRatio)),
        leadTimeH: n.lead_time_frente_horas,
        leadTimePicoH: n.lead_time_pico_horas,
        leadTimeDespejeH: n.lead_time_despeje_horas,
        leadTimeStr: n.lead_time_frente_legible,
        ec: n.salinidad_estimada_llegada_ec,
        ph: n.ph_estimado_llegada || 7.4,
        wqi: n.wqi_estimado_llegada,
        gate: n.estado_compuerta_recomendado,
        alert: n.nivel_alerta,
        order: idx + 1
      });
    });

    // 1. Draw 3D Mountain / Valley Topography Background Gradients
    drawTopography(ctx, width, height, waypoints);

    // 2. Draw 3D River Channel Path
    drawRiverChannel(ctx, waypoints, frontProgressRatio);

    // 3. Draw Water Particles & Wave Propagation
    drawFlowParticles(ctx, waypoints, frontProgressRatio);

    // 4. Draw Station Beacons & Status Nodes in 3D
    drawStationBeacons(ctx, waypoints, simTimeHours);

    // 5. Draw Front Wave Indicator
    drawWavefrontHead(ctx, waypoints, frontProgressRatio);

    ctx.restore();
  };

  // 1. Topography Background Rendering
  const drawTopography = (ctx, w, h, waypoints) => {
    // Soft topographic contour lines
    ctx.lineWidth = 1;
    for (let c = 0; c < 5; c++) {
      const cy = 60 + c * (h / 6);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
      ctx.moveTo(0, cy);
      ctx.bezierCurveTo(w * 0.3, cy - 25, w * 0.7, cy + 25, w, cy - 10);
      ctx.stroke();
    }

    // Altitude descent guide arrow in 3D space
    ctx.save();
    ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
    ctx.font = '10px monospace';
    ctx.fillText(`▲ Cuenca Alta (${originCota.toFixed(0)} msnm)`, waypoints[0].x - 10, waypoints[0].y - 25);
    const last = waypoints[waypoints.length - 1];
    ctx.fillText(`▼ Valle de Riego (${last.cota.toFixed(0)} msnm)`, last.x - 70, last.y + 40);
    ctx.restore();
  };

  // 2. River Channel & Segments
  const drawRiverChannel = (ctx, waypoints, frontRatio) => {
    if (waypoints.length < 2) return;

    // Background River Bed (Shadow / Width)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const cx = (prev.x + curr.x) / 2;
      const cy = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
    }
    const last = waypoints[waypoints.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer River Bank
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.stroke();

    // Clean River Base (Cyan/Blue)
    ctx.lineWidth = 8;
    const riverGrad = ctx.createLinearGradient(waypoints[0].x, waypoints[0].y, last.x, last.y);
    riverGrad.addColorStop(0, '#0284c7');
    riverGrad.addColorStop(1, '#06b6d4');
    ctx.strokeStyle = riverGrad;
    ctx.stroke();

    // Contamination Wave Overlay
    if (frontRatio > 0.01) {
      // Calculate contaminant alert color based on EC and pH
      let plumeColorStart = '#ef4444'; // Red
      let plumeColorEnd = '#f59e0b';   // Amber
      if (originSalinity > 1600 || originPh < 6.5 || originPh > 8.5) {
        plumeColorStart = 'rgba(239, 68, 68, 0.9)';
        plumeColorEnd = 'rgba(249, 115, 22, 0.75)';
      } else if (originSalinity > 1150 || originPh < 6.8 || originPh > 8.2) {
        plumeColorStart = 'rgba(245, 158, 11, 0.85)';
        plumeColorEnd = 'rgba(234, 179, 8, 0.7)';
      } else {
        plumeColorStart = 'rgba(16, 185, 129, 0.85)';
        plumeColorEnd = 'rgba(5, 150, 105, 0.7)';
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(waypoints[0].x, waypoints[0].y);

      // Trace path up to frontRatio
      const totalSegs = waypoints.length - 1;
      const targetSegFloat = Math.min(totalSegs, frontRatio * totalSegs);
      const targetSegIdx = Math.floor(targetSegFloat);
      const segFraction = targetSegFloat - targetSegIdx;

      for (let i = 1; i <= targetSegIdx && i < waypoints.length; i++) {
        const prev = waypoints[i - 1];
        const curr = waypoints[i];
        const cx = (prev.x + curr.x) / 2;
        const cy = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
      }

      if (targetSegIdx < totalSegs) {
        const p1 = waypoints[targetSegIdx];
        const p2 = waypoints[targetSegIdx + 1];
        const curX = p1.x + (p2.x - p1.x) * segFraction;
        const curY = p1.y + (p2.y - p1.y) * segFraction;
        ctx.lineTo(curX, curY);
      }

      ctx.lineWidth = 8;
      const plumeGrad = ctx.createLinearGradient(waypoints[0].x, waypoints[0].y, last.x, last.y);
      plumeGrad.addColorStop(0, plumeColorStart);
      plumeGrad.addColorStop(Math.min(1.0, frontRatio), plumeColorEnd);
      ctx.strokeStyle = plumeGrad;
      ctx.shadowColor = plumeColorStart;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  // 3. Flow Particles along River
  const drawFlowParticles = (ctx, waypoints, frontRatio) => {
    if (waypoints.length < 2) return;

    ctx.save();
    particlesRef.current.forEach((p) => {
      // Advance particle position
      p.progress = (p.progress + p.speed) % 1.0;

      // Find position along waypoints
      const totalSegs = waypoints.length - 1;
      const segFloat = p.progress * totalSegs;
      const segIdx = Math.floor(segFloat);
      const segFrac = segFloat - segIdx;

      if (segIdx < waypoints.length - 1) {
        const p1 = waypoints[segIdx];
        const p2 = waypoints[segIdx + 1];
        const px = p1.x + (p2.x - p1.x) * segFrac;
        const py = p1.y + (p2.y - p1.y) * segFrac + p.offsetY;

        // Is particle inside contamination wave?
        const isContaminated = p.progress <= frontRatio;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        if (isContaminated) {
          ctx.fillStyle = originSalinity > 1500 ? `rgba(239, 68, 68, ${p.opacity})` : `rgba(245, 158, 11, ${p.opacity})`;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = `rgba(165, 243, 252, ${p.opacity})`;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 2;
        }
        ctx.fill();
      }
    });
    ctx.restore();
  };

  // 4. Station Beacons & Dynamic Node State
  const drawStationBeacons = (ctx, waypoints, currentTimeH) => {
    waypoints.forEach((wp, idx) => {
      const isOrigin = idx === 0;
      const hasArrived = isOrigin || (currentTimeH >= wp.leadTimeH);
      const isPeak = !isOrigin && (currentTimeH >= wp.leadTimePicoH && currentTimeH < wp.leadTimeDespejeH);
      const hasCleared = !isOrigin && (currentTimeH >= wp.leadTimeDespejeH);

      // Node Color Scheme
      let beaconColor = '#06b6d4'; // Clean cyan
      let beaconHalo = 'rgba(6, 182, 212, 0.2)';
      let statusText = 'Limpio / En Espera';

      if (isOrigin) {
        beaconColor = '#ec4899'; // Origin Magenta
        beaconHalo = 'rgba(236, 72, 153, 0.3)';
        statusText = 'Origen Perturbación';
      } else if (hasCleared) {
        beaconColor = '#10b981'; // Cleared Emerald
        beaconHalo = 'rgba(16, 185, 129, 0.25)';
        statusText = 'Pluma Despejada';
      } else if (isPeak) {
        beaconColor = '#ef4444'; // Peak Red
        beaconHalo = 'rgba(239, 68, 68, 0.45)';
        statusText = '⚠️ Pico de Salinidad';
      } else if (hasArrived) {
        beaconColor = wp.ec > 1500 ? '#f43f5e' : '#f59e0b';
        beaconHalo = 'rgba(245, 158, 11, 0.35)';
        statusText = '⚡ Frente de Onda Arribó';
      }

      ctx.save();

      // 3D Pillar Base (Height represents elevation)
      const pillarHeight = 16 + wp.zRatio * 20;
      ctx.beginPath();
      ctx.moveTo(wp.x, wp.y);
      ctx.lineTo(wp.x, wp.y - pillarHeight);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isOrigin ? 'rgba(236, 72, 153, 0.6)' : hasArrived ? 'rgba(239, 68, 68, 0.6)' : 'rgba(6, 182, 212, 0.5)';
      ctx.stroke();

      // Pulsing Radar Rings for Alert Nodes
      if (hasArrived && !hasCleared) {
        const pulseRadius = 14 + Math.sin(Date.now() * 0.006 + idx) * 5;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y - pillarHeight, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = beaconHalo;
        ctx.fill();
        ctx.strokeStyle = beaconColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Beacon Orb / Core
      ctx.beginPath();
      ctx.arc(wp.x, wp.y - pillarHeight, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = beaconColor;
      ctx.shadowColor = beaconColor;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Station Label Card
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      
      const labelY = wp.y - pillarHeight - 14;
      const tagText = isOrigin ? `🔴 ${wp.name}` : `#${wp.order} ${wp.name}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tagText, wp.x - 30, labelY);

      // Lead Time & Altitude Sub-tags
      ctx.font = '9px monospace';
      if (!isOrigin) {
        // Arrival indicator
        if (hasArrived) {
          ctx.fillStyle = isPeak ? '#f87171' : '#fbbf24';
          ctx.fillText(`CE: ${wp.ec} µS | pH: ${wp.ph}`, wp.x - 30, labelY + 12);
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`Arribo en: ${wp.leadTimeStr}`, wp.x - 30, labelY + 12);
        }
      } else {
        ctx.fillStyle = '#f472b6';
        ctx.fillText(`Q: ${originFlow} m³/s | CE: ${wp.ec} µS`, wp.x - 30, labelY + 12);
      }

      // Elevation Tag at Base
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '8px monospace';
      ctx.fillText(`${wp.cota.toFixed(0)} msnm`, wp.x - 18, wp.y + 12);

      ctx.restore();
    });
  };

  // 5. Front Wavehead Shockwave
  const drawWavefrontHead = (ctx, waypoints, frontRatio) => {
    if (frontRatio <= 0.02 || frontRatio >= 1.05 || waypoints.length < 2) return;

    const totalSegs = waypoints.length - 1;
    const targetSegFloat = Math.min(totalSegs, frontRatio * totalSegs);
    const targetSegIdx = Math.floor(targetSegFloat);
    const segFraction = targetSegFloat - targetSegIdx;

    const p1 = waypoints[targetSegIdx];
    const p2 = waypoints[Math.min(waypoints.length - 1, targetSegIdx + 1)];
    const curX = p1.x + (p2.x - p1.x) * segFraction;
    const curY = p1.y + (p2.y - p1.y) * segFraction;

    ctx.save();
    // Glowing wave front ring
    const ringRadius = 10 + Math.sin(Date.now() * 0.01) * 3;
    ctx.beginPath();
    ctx.arc(curX, curY, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 15;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(curX, curY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Wave speed tooltip
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`🌊 Frente: ${(frontRatio * totalDistanceKm).toFixed(1)} km`, curX - 35, curY - 16);

    ctx.restore();
  };

  // Helper formatting for time
  const formatTimeHours = (hoursFloat) => {
    const totalMin = Math.floor(hoursFloat * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const s = Math.floor((hoursFloat * 3600) % 60);
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  // Find currently impacted nodes
  const impactedNodesCount = nodes.filter(n => simTimeHours >= n.lead_time_frente_horas).length;
  const criticalNodesCount = nodes.filter(n => simTimeHours >= n.lead_time_frente_horas && n.salinidad_estimada_llegada_ec > 1500).length;

  return (
    <div className="bg-slate-950 border-2 border-cyan-500/30 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      {/* Header & Simulation HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Simulador 3D Dinámico de Propagación Hidráulica</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Cascada 3D del Río Chancay: Tránsito de Pluma & Lead Time</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Modelación advectiva 3D con elevación real (Z), velocidad de Leopold-Maddock (V = {flowVelocityKmh.toFixed(1)} km/h) y amortiguamiento de pH.
          </p>
        </div>

        {/* Digital Telemetry Clock & Status Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-inner font-mono">
            <Clock className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-[10px] text-slate-400 block font-sans font-bold">Tiempo Simulado</span>
              <span className="text-sm sm:text-base font-black text-cyan-300">
                {formatTimeHours(simTimeHours)}
              </span>
            </div>
          </div>

          <div className={`px-3 py-2 rounded-2xl border flex items-center gap-2 font-mono text-xs ${
            criticalNodesCount > 0 
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse' 
              : impactedNodesCount > 0 
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}>
            <ShieldAlert className="w-4 h-4" />
            <span className="font-sans font-bold">
              {criticalNodesCount > 0 
                ? `Alerta Roja (${criticalNodesCount} Bocatomas)` 
                : impactedNodesCount > 0 
                ? `Pluma en Tránsito (${impactedNodesCount}/${nodes.length})` 
                : 'Cauce Seguro'}
            </span>
          </div>
        </div>
      </div>

      {/* 3D Isometric Interactive Canvas */}
      <div className="relative w-full h-[360px] sm:h-[420px] bg-[#030914] rounded-2xl border border-slate-800/80 shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Legend Overlay */}
        <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-300 space-y-1 shadow-lg pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Agua Limpia Fluvial</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Frente de Alerta / Salinidad Moderada</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Pico Crítico (Cerrar Compuerta)</span>
          </div>
        </div>

        {/* Dynamic Velocity & Wavefront Stats HUD */}
        <div className="absolute bottom-3 right-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl text-[11px] font-mono text-slate-300 space-y-1 shadow-lg">
          <div className="text-slate-400 font-sans font-bold text-[10px]">Cálculo Hidrodinámico 3D:</div>
          <div>Distancia Cauce: <span className="text-cyan-400 font-bold">{totalDistanceKm.toFixed(1)} km</span></div>
          <div>Velocidad Flujo: <span className="text-emerald-400 font-bold">{flowVelocityKmh.toFixed(1)} km/h</span></div>
          <div>Frente Actual: <span className="text-rose-400 font-bold">{Math.min(totalDistanceKm, (simTimeHours * flowVelocityKmh * 1.25)).toFixed(1)} km</span></div>
        </div>
      </div>

      {/* Interactive Controls & Playback Dashboard */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-4">
        {/* Time Scrubber / Range Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Línea de Tiempo Interactiva (Arrastra para ver el avance):</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold">
              {simTimeHours.toFixed(2)}h / {totalDurationHours.toFixed(1)}h
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={totalDurationHours}
            step="0.02"
            value={simTimeHours}
            onChange={(e) => {
              setSimTimeHours(parseFloat(e.target.value));
              if (isPlaying) setIsPlaying(false);
            }}
            className="w-full accent-cyan-400 bg-slate-950 h-2.5 rounded-lg cursor-pointer transition-all"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>T=0:00 (Descarga Cabecera)</span>
            <span className="text-amber-400 font-bold">
              {nodes[0]?.nombre}: Arribo ~{nodes[0]?.lead_time_frente_legible}
            </span>
            <span>
              {nodes[nodes.length - 1]?.nombre}: ~{nodes[nodes.length - 1]?.lead_time_frente_legible}
            </span>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Play/Pause & Reset */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                if (simTimeHours >= totalDurationHours) setSimTimeHours(0);
                setIsPlaying(!isPlaying);
              }}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 shadow-cyan-500/25'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pausar Simulación' : 'Iniciar Propagación 3D'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setSimTimeHours(0);
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
              title="Reiniciar a T=0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Multipliers */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 px-2 font-bold text-[11px]">Velocidad:</span>
            {[
              { val: 1, label: '1s = 1m' },
              { val: 5, label: '5x' },
              { val: 15, label: '15x' },
              { val: 60, label: '1s = 1h (Rápido)' }
            ].map((spd) => (
              <button
                key={spd.val}
                type="button"
                onClick={() => setSpeedMultiplier(spd.val)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  speedMultiplier === spd.val
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Dynamic Node Cards */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Estado Dinámico de Estaciones según Tiempo Simulado ({formatTimeHours(simTimeHours)})</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {nodes.map((node, idx) => {
            const hasArrived = simTimeHours >= node.lead_time_frente_horas;
            const isPeak = simTimeHours >= node.lead_time_pico_horas && simTimeHours < node.lead_time_despeje_horas;
            const hasCleared = simTimeHours >= node.lead_time_despeje_horas;

            let cardBorder = 'border-slate-800 bg-slate-900/60';
            let statusBadge = 'bg-slate-800 text-slate-400';
            let gateAction = node.estado_compuerta_recomendado;

            if (hasCleared) {
              cardBorder = 'border-emerald-500/40 bg-emerald-950/20';
              statusBadge = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
              gateAction = 'REABRIR_COMPUERTA_SEGURO';
            } else if (isPeak) {
              cardBorder = 'border-rose-500 bg-rose-950/30 shadow-lg shadow-rose-500/10';
              statusBadge = 'bg-rose-500 text-white font-black animate-pulse';
            } else if (hasArrived) {
              cardBorder = 'border-amber-500/60 bg-amber-950/20';
              statusBadge = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
            }

            return (
              <div
                key={node.id_nodo}
                className={`p-4 rounded-2xl border transition-all duration-300 space-y-3 ${cardBorder}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                      Estación #{idx + 1}
                    </span>
                    <h5 className="text-xs font-black text-white truncate max-w-[170px]" title={node.nombre}>
                      {node.nombre}
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                    {node.cota_msnm}m
                  </span>
                </div>

                {/* State Tag */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge}`}>
                    {hasCleared ? '✅ Despejado' : isPeak ? '🛑 PICO CRÍTICO' : hasArrived ? '⚠️ Pluma Arribando' : '⏳ En Espera'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    +{node.distancia_acumulada_km} km
                  </span>
                </div>

                {/* Real-time Water Quality Gauges */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 font-sans block">Salinidad</span>
                    <span className={`text-xs font-black ${hasArrived && !hasCleared ? 'text-amber-400' : 'text-slate-300'}`}>
                      {hasArrived ? `${node.salinidad_estimada_llegada_ec.toFixed(0)}` : '—'}
                    </span>
                    <span className="text-[8px] text-slate-400 block">µS/cm</span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-sans block">pH Arribo</span>
                    <span className={`text-xs font-black ${hasArrived && !hasCleared ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {hasArrived ? `${(node.ph_estimado_llegada || 7.4).toFixed(2)}` : '—'}
                    </span>
                    <span className="text-[8px] text-slate-400 block">Buffer</span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 font-sans block">WQI</span>
                    <span className={`text-xs font-black ${hasArrived && !hasCleared ? (node.wqi_estimado_llegada < 50 ? 'text-rose-400' : 'text-amber-400') : 'text-emerald-400'}`}>
                      {hasArrived ? `${node.wqi_estimado_llegada.toFixed(0)}` : '85'}
                    </span>
                    <span className="text-[8px] text-slate-400 block">/100</span>
                  </div>
                </div>

                {/* Gate Prescriptive Action */}
                <div className="pt-1">
                  <div className={`text-center py-1.5 px-2 rounded-xl text-[10px] font-black tracking-wide border ${
                    hasCleared
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : hasArrived
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-slate-800/50 text-slate-300 border-slate-700'
                  }`}>
                    {hasCleared ? '🔓 ABRIR COMPUERTA' : hasArrived ? '🔒 CERRAR COMPUERTA' : '👀 MONITOREAR TRÁNSITO'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
