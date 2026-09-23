import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, ZoomIn, ZoomOut, Crosshair, Layers } from 'lucide-react';

export const LocationPickerMap = ({
  lat = -11.4900,
  lng = -77.0500,
  zoom = 10,
  onChange,
  className = '',
  height = '220px'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const activeTileLayerRef = useRef(null);
  const isInternalUpdateRef = useRef(false);

  const [mapLayerType, setMapLayerType] = useState('satellite'); // 'satellite' | 'streets' | 'hybrid'

  // Capas de mapas 100% libres de API Keys
  const TILE_LAYERS = {
    // 1. Esri World Imagery (Satelital de alta resolución, ideal para cuencas y ríos, 0 API keys)
    satellite: {
      name: '🛰️ Satélite Esri',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, IGN, IGP'
    },
    // 2. OpenStreetMap Estándar (Callejero libre y universal, 0 API keys)
    streets: {
      name: '🗺️ Callejero OSM',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    },
    // 3. Google Maps Híbrido (Satelital con etiquetas y carreteras de Google)
    hybrid: {
      name: '🛰️ Google Híbrido',
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      maxZoom: 20,
      attribution: 'Google Maps'
    }
  };

  // Inicializar Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = Number.isFinite(lat) ? lat : -11.4900;
      const initialLng = Number.isFinite(lng) ? lng : -77.0500;
      const initialZoom = Number.isFinite(zoom) ? zoom : 10;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Añadir capa base inicial (Esri Satelital)
      const initialTileConfig = TILE_LAYERS.satellite;
      const initialTile = L.tileLayer(initialTileConfig.url, {
        maxZoom: initialTileConfig.maxZoom,
      }).addTo(map);
      activeTileLayerRef.current = initialTile;

      // Icono de Pin Personalizado en Cian Brillante con pulso SCADA
      const pinIcon = L.divIcon({
        className: 'location-picker-pin',
        html: `
          <div style="position: relative; width: 32px; height: 32px; transform: translate(-50%, -100%);">
            <div style="position: absolute; width: 14px; height: 14px; background: rgba(6, 182, 212, 0.45); border-radius: 50%; bottom: -4px; left: 9px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.9));">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3" fill="#06b6d4"></circle>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      // Evento de arrastre del pin
      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        isInternalUpdateRef.current = true;
        if (onChange) {
          onChange({
            lat: parseFloat(position.lat.toFixed(5)),
            lng: parseFloat(position.lng.toFixed(5)),
            zoom: map.getZoom()
          });
        }
      });

      // Evento de clic sobre el mapa para reubicar el pin
      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        isInternalUpdateRef.current = true;
        if (onChange) {
          onChange({
            lat: parseFloat(clickLat.toFixed(5)),
            lng: parseFloat(clickLng.toFixed(5)),
            zoom: map.getZoom()
          });
        }
      });

      // Evento de cambio de zoom
      map.on('zoomend', () => {
        if (onChange) {
          const currentPos = marker.getLatLng();
          onChange({
            lat: parseFloat(currentPos.lat.toFixed(5)),
            lng: parseFloat(currentPos.lng.toFixed(5)),
            zoom: map.getZoom()
          });
        }
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;

      // Invalidate size tras renderizado en contenedor
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Cambiar capa de mosaicos (Satelital / Callejero / Híbrido)
  const switchMapLayer = (type) => {
    if (!mapInstanceRef.current) return;
    const config = TILE_LAYERS[type];
    if (!config) return;

    if (activeTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(activeTileLayerRef.current);
    }

    const newLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
    }).addTo(mapInstanceRef.current);

    activeTileLayerRef.current = newLayer;
    setMapLayerType(type);
  };

  // Actualizar posición del marcador y vista del mapa cuando cambian las props externas
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    const currentLat = Number.isFinite(lat) ? lat : -11.4900;
    const currentLng = Number.isFinite(lng) ? lng : -77.0500;
    const currentZoom = Number.isFinite(zoom) ? zoom : mapInstanceRef.current.getZoom();

    const markerPos = markerRef.current.getLatLng();
    if (Math.abs(markerPos.lat - currentLat) > 0.0001 || Math.abs(markerPos.lng - currentLng) > 0.0001) {
      markerRef.current.setLatLng([currentLat, currentLng]);
      mapInstanceRef.current.flyTo([currentLat, currentLng], currentZoom, {
        duration: 0.8
      });
    }
  }, [lat, lng, zoom]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat || -11.49, lng || -77.05], zoom || 10);
    }
  };

  return (
    <div className={`border border-cyan-500/30 rounded-xl overflow-hidden shadow-lg shadow-cyan-950/40 bg-[#020c15] ${className}`}>
      {/* 1. Barra superior dedicada: Coordenadas en vivo + Conmutador de Capas + Zoom */}
      <div className="bg-[#03141f] border-b border-cyan-500/30 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 relative z-10">
        {/* Coordenadas actuales */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-200">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Lat: <strong className="text-white">{Number(lat).toFixed(4)}</strong></span>
          <span className="text-cyan-700">|</span>
          <span>Lng: <strong className="text-white">{Number(lng).toFixed(4)}</strong></span>
          <span className="text-cyan-700">|</span>
          <span>Z: <strong className="text-white">{zoom}</strong></span>
        </div>

        {/* Controles: Selector de Capas + Zoom / Recenter */}
        <div className="flex items-center gap-1.5">
          {/* Alternador de Capa Satélite Esri / Callejero OSM / Google */}
          <div className="bg-[#020a13] border border-cyan-500/40 rounded-lg p-0.5 flex items-center gap-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => switchMapLayer('satellite')}
              title="Capa Satelital Esri (Alta Resolución)"
              className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all flex items-center gap-1 ${
                mapLayerType === 'satellite'
                  ? 'bg-cyan-500/30 text-cyan-100 font-bold border border-cyan-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40'
              }`}
            >
              <span>🛰️</span> Satélite
            </button>
            <button
              type="button"
              onClick={() => switchMapLayer('streets')}
              title="Capa Callejera OpenStreetMap"
              className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all flex items-center gap-1 ${
                mapLayerType === 'streets'
                  ? 'bg-cyan-500/30 text-cyan-100 font-bold border border-cyan-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40'
              }`}
            >
              <span>🗺️</span> Calles
            </button>
            <button
              type="button"
              onClick={() => switchMapLayer('hybrid')}
              title="Capa Google Maps Híbrido"
              className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all flex items-center gap-1 ${
                mapLayerType === 'hybrid'
                  ? 'bg-cyan-500/30 text-cyan-100 font-bold border border-cyan-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40'
              }`}
            >
              <span>🌐</span> Google
            </button>
          </div>

          {/* Botones de Zoom y Recenter */}
          <div className="bg-[#020a13] border border-cyan-500/40 rounded-lg p-0.5 flex items-center gap-0.5 shadow-sm">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Acercar mapa"
              className="p-1 hover:bg-cyan-500/20 text-cyan-300 rounded cursor-pointer transition-all"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Alejar mapa"
              className="p-1 hover:bg-cyan-500/20 text-cyan-300 rounded cursor-pointer transition-all"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              title="Centrar en el marcador de la cuenca"
              className="p-1 hover:bg-cyan-500/20 text-cyan-300 rounded cursor-pointer transition-all border-l border-cyan-500/30"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Contenedor del Mapa Leaflet */}
      <div 
        ref={mapContainerRef} 
        style={{ height }}
        className="w-full bg-[#020d18] cursor-crosshair relative z-0"
      />

      {/* 3. Guía en la base del mapa */}
      <div className="bg-[#020c15] border-t border-cyan-500/20 px-3 py-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>📍 Haz clic sobre el río o arrastra el marcador para fijar las coordenadas</span>
        <span className="text-emerald-400/90 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Tiles Libres de API Key
        </span>
      </div>
    </div>
  );
};

export default LocationPickerMap;
