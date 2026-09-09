import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Layers, MapPin, Radio, Activity } from 'lucide-react';
import { useSystemConfig } from '../context/SystemConfigContext';

export const WatershedMap = ({ nodes = [], selectedNodeId = null, onSelectNode = null, className = '' }) => {
  const { nombre_cuenca, latitud_centro, longitud_centro, zoom_inicial } = useSystemConfig();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inicializar mapa si no existe
    if (!mapInstanceRef.current) {
      // Coordenadas centrales dinámicas de la cuenca
      const map = L.map(mapContainerRef.current, {
        center: [latitud_centro || -11.49, longitud_centro || -77.05],
        zoom: zoom_inicial || 10,
        zoomControl: true,
      });

      // Capas base: Satelital Esri y Mapa Abierto OSM
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      });

      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      });

      // Añadir capa satelital por defecto
      satelliteLayer.addTo(map);

      // Control de capas
      const baseMaps = {
        "🛰️ Satelital Esri": satelliteLayer,
        "🗺️ Callejero OpenStreetMap": osmLayer,
      };
      L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

      // Capa de marcadores
      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Limpieza en desmontaje
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualizar marcadores de nodos
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    const bounds = [];

    nodes.forEach((node) => {
      if (!node.latitud || !node.longitud) return;

      const lat = parseFloat(node.latitud);
      const lon = parseFloat(node.longitud);
      bounds.push([lat, lon]);

      // Determinar clase de pulso y color según WQI / estado
      let pulseClass = 'pulse-emerald bg-emerald-500 border-emerald-300';
      let statusColor = '#10b981';

      if (node.estado_operativo === 'OFFLINE' || node.estado === 'INACTIVO') {
        pulseClass = 'pulse-slate bg-slate-500 border-slate-300';
        statusColor = '#94a3b8';
      } else if (node.wqi_score !== undefined && node.wqi_score !== null) {
        if (node.wqi_score >= 70) {
          pulseClass = 'pulse-emerald bg-emerald-500 border-emerald-300';
          statusColor = '#10b981';
        } else if (node.wqi_score >= 50) {
          pulseClass = 'pulse-amber bg-amber-500 border-amber-300';
          statusColor = '#f59e0b';
        } else {
          pulseClass = 'pulse-rose bg-rose-500 border-rose-300';
          statusColor = '#f43f5e';
        }
      }

      const isSelected = selectedNodeId === node.id_nodo;

      // Icono HTML personalizado con pulso CSS
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer">
            <div class="w-5 h-5 rounded-full border-2 ${pulseClass} ${isSelected ? 'scale-125 ring-4 ring-cyan-400' : ''} shadow-lg transition-transform flex items-center justify-center text-[9px] font-black text-white">
              •
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lon], { icon: customIcon });

      // Popup HTML interactivo con telemetría de campo
      const popupHtml = `
        <div class="p-2 space-y-2 min-w-[200px] text-slate-100 font-sans">
          <div class="border-b border-cyan-500/30 pb-1.5 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-white block">${node.nombre || node.id_nodo}</span>
              <span class="text-[10px] text-cyan-300 font-mono">${node.id_nodo}</span>
            </div>
            <span class="text-[9px] px-1.5 py-0.5 rounded font-bold font-mono" style="background: ${statusColor}33; color: ${statusColor}; border: 1px solid ${statusColor}88">
              ${node.estado_operativo || 'ONLINE'}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1.5 text-[10px]">
            <div>
              <span class="text-slate-400 block">Sector:</span>
              <span class="font-semibold text-cyan-200">${node.sector_cuenca || 'Valle'}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Fuente:</span>
              <span class="font-semibold text-cyan-200">${node.tipo_fuente || 'Canal'}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Calidad WQI:</span>
              <span class="font-bold text-white font-mono">${node.wqi_score !== undefined ? `${node.wqi_score} pts` : '--'}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Caudal:</span>
              <span class="font-bold text-cyan-400 font-mono">${node.caudal_m3s !== undefined ? `${node.caudal_m3s} m³/s` : '--'}</span>
            </div>
          </div>

          <div class="pt-1 border-t border-cyan-500/20 flex justify-end">
            <button
              id="btn-select-node-${node.id_nodo}"
              class="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-[10px] font-bold transition-all w-full text-center cursor-pointer"
            >
              Ver Estación en Detalle
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-node-${node.id_nodo}`);
        if (btn && onSelectNode) {
          btn.onclick = () => onSelectNode(node.id_nodo);
        }
      });

      markersGroup.addLayer(marker);
    });

    // Ajustar vista a los nodos si existen
    if (bounds.length > 0 && mapInstanceRef.current) {
      if (bounds.length === 1) {
        mapInstanceRef.current.setView(bounds[0], 12);
      } else {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  }, [nodes, selectedNodeId, onSelectNode]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-cyan-500/30 shadow-lg ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-0" />
      
      {/* Leyenda flotante */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#072433]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl p-2.5 text-[10px] space-y-1.5 shadow-xl">
        <div className="font-bold text-cyan-300 text-[11px] flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Estado · {nombre_cuenca || 'Cuenca Hídrica'}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
          <span>Calidad Buena / Excelente (WQI &gt; 70)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
          <span>Calidad Regular (WQI 50-69)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
          <span>Alerta Crítica / Mala (WQI &lt; 50)</span>
        </div>
      </div>
    </div>
  );
};
