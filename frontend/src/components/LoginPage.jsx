import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, governanceApi } from '../services/api';
import { 
  ShieldCheck, Lock, Mail, User, AlertTriangle, 
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Droplets, 
  MapPin, Globe2, Compass, Eye, EyeOff, Building2, Phone,
  Waves, Cpu, Activity, Database, Map, Layers, Check
} from 'lucide-react';
import ThreeLoginCanvas from './ThreeLoginCanvas';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import LocationPickerMap from './LocationPickerMap';
import { getAvailableCountries, getRegionsForCountry, getCoordinatesForRegion } from '../utils/geoData';
import { validateEmail, getPasswordStrength } from '../utils/validators';

export const LoginPage = () => {
  const { login, registerFirstAdmin, error: authError } = useAuth();
  
  // Normal Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Setup / First Deploy status
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false);

  // Form states for First Deploy Wizard (SIN datos hardcodeados pre-llenados, con placeholders)
  const [resourceData, setResourceData] = useState({
    nombre_recurso: '',
    tipo_recurso: 'RIO',
    pais: 'Perú',
    pais_code: 'PE',
    region: 'Junín',
    ubicacion_detallada: '',
    latitud_centro: -11.5300,
    longitud_centro: -75.2500,
    zoom_inicial: 9
  });

  const [entityData, setEntityData] = useState({
    nombre_entidad: '',
    tipo_entidad: 'JUNTA_USUARIOS',
    id_tipo_entidad: '',
    cargo_institucional: '',
    custom_cargo: ''
  });

  const [adminData, setAdminData] = useState({
    nombres: '',
    apellidos: '',
    telefono_contacto: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Catálogos dinámicos
  const [countriesList, setCountriesList] = useState([]);
  const [regionsList, setRegionsList] = useState([]);
  const [resourceTypesList, setResourceTypesList] = useState([]);
  const [entityTypesList, setEntityTypesList] = useState([]);
  const [existingEntitiesList, setExistingEntitiesList] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('__NUEVA__');
  const [rolesList, setRolesList] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [showMap, setShowMap] = useState(true);

  // Carga inicial de catálogos geográficos y gobernanza
  useEffect(() => {
    // 1. Catálogo de Países y Regiones
    const countries = getAvailableCountries();
    setCountriesList(countries);

    const initialRegions = getRegionsForCountry('PE');
    setRegionsList(initialRegions);

    // 2. Tipos de Entidad desde BD
    governanceApi.getEntityTypes()
      .then(res => {
        const list = res.data || [];
        setEntityTypesList(list);
        if (list.length > 0) {
          const defaultType = list.find(t => t.codigo === 'JUNTA_USUARIOS') || list[0];
          setEntityData(prev => ({
            ...prev,
            tipo_entidad: defaultType.codigo,
            id_tipo_entidad: defaultType.id_tipo_entidad
          }));
          loadRolesForEntityType(defaultType.id_tipo_entidad || defaultType.codigo);
        }
      })
      .catch(err => {
        console.warn('Aviso: No se pudo cargar tipos de entidad desde API:', err);
      });

    // 2.5 Entidades existentes registradas en el sistema (ej. Sentinel-H2O Core Platform)
    governanceApi.getEntities()
      .then(res => {
        const list = res.data || [];
        setExistingEntitiesList(list);
      })
      .catch(err => {
        console.warn('Aviso: No se pudo cargar lista de entidades existentes:', err);
      });

    // 3. Tipos de Recurso Hídrico desde BD
    governanceApi.getResourceTypes()
      .then(res => {
        if (res.data && res.data.length > 0) {
          setResourceTypesList(res.data);
        }
      })
      .catch(err => {
        console.warn('Aviso: No se pudo cargar tipos de recurso:', err);
      });

    // 4. Verificación de estado de inicialización
    const checkStatus = async () => {
      try {
        const res = await authApi.getSetupStatus();
        const firstSetup = res.data.is_first_setup;
        setIsFirstSetup(firstSetup);

        // Si existe configuración previa real parametrizada, cargarla
        if (res.data.config && res.data.config.configuracion_inicial_completada) {
          const cfg = res.data.config;
          setResourceData(prev => ({
            ...prev,
            nombre_recurso: cfg.nombre_recurso || '',
            tipo_recurso: cfg.tipo_recurso || prev.tipo_recurso,
            pais: cfg.pais || prev.pais,
            region: cfg.region || prev.region,
            latitud_centro: cfg.latitud_centro ?? prev.latitud_centro,
            longitud_centro: cfg.longitud_centro ?? prev.longitud_centro,
            zoom_inicial: cfg.zoom_inicial ?? prev.zoom_inicial,
            ubicacion_detallada: cfg.ubicacion_detallada || ''
          }));
        }
      } catch (err) {
        console.warn('No se pudo verificar estado de setup inicial:', err);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkStatus();
  }, []);

  // Carga reactiva de roles institucionales según el tipo de entidad
  const loadRolesForEntityType = async (typeIdOrCode) => {
    if (!typeIdOrCode) return;
    setLoadingRoles(true);
    try {
      const res = await governanceApi.getRoles(typeIdOrCode);
      const roles = res.data || [];
      setRolesList(roles);
      if (roles.length > 0) {
        setEntityData(prev => ({
          ...prev,
          cargo_institucional: roles[0].nombre_cargo
        }));
        setIsCustomRole(false);
      } else {
        setEntityData(prev => ({
          ...prev,
          cargo_institucional: ''
        }));
        setIsCustomRole(true);
      }
    } catch (err) {
      console.warn('Error al cargar cargos para tipo de entidad:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Manejador de cambio de País
  const handleCountryChange = (e) => {
    const countryCode = e.target.value;
    const countryObj = countriesList.find(c => c.isoCode === countryCode);
    const countryName = countryObj ? countryObj.name : countryCode;
    const newRegions = getRegionsForCountry(countryCode);
    setRegionsList(newRegions);

    const defaultRegion = newRegions.length > 0 ? newRegions[0].name : '';
    const coords = getCoordinatesForRegion(countryCode, defaultRegion);

    setResourceData(prev => ({
      ...prev,
      pais: countryName,
      pais_code: countryCode,
      region: defaultRegion,
      latitud_centro: coords.lat,
      longitud_centro: coords.lng,
      zoom_inicial: coords.zoom
    }));
  };

  // Manejador de cambio de Región / Departamento
  const handleRegionChange = (e) => {
    const regionName = e.target.value;
    const coords = getCoordinatesForRegion(resourceData.pais_code, regionName);
    setResourceData(prev => ({
      ...prev,
      region: regionName,
      latitud_centro: coords.lat,
      longitud_centro: coords.lng,
      zoom_inicial: coords.zoom
    }));
  };

  // Manejador de selección de entidad existente o crear nueva
  const handleEntitySelectionChange = (e) => {
    const val = e.target.value;
    setSelectedEntityId(val);

    if (val === '__NUEVA__') {
      const defaultType = entityTypesList.length > 0 ? entityTypesList[0] : null;
      const typeCode = defaultType ? defaultType.codigo : 'JUNTA_USUARIOS';
      const typeId = defaultType ? defaultType.id_tipo_entidad : '';
      setEntityData(prev => ({
        ...prev,
        nombre_entidad: '',
        tipo_entidad: typeCode,
        id_tipo_entidad: typeId
      }));
      loadRolesForEntityType(typeId || typeCode);
    } else {
      const selected = existingEntitiesList.find(ent => ent.id_entidad === val);
      if (selected) {
        const matchedType = entityTypesList.find(t => t.id_tipo_entidad === selected.id_tipo_entidad || t.codigo === selected.tipo_entidad_codigo);
        const typeCode = matchedType ? matchedType.codigo : (selected.tipo_entidad_codigo || 'AUTORIDAD_NACIONAL');
        setEntityData(prev => ({
          ...prev,
          nombre_entidad: selected.nombre_entidad,
          tipo_entidad: typeCode,
          id_tipo_entidad: selected.id_tipo_entidad
        }));
        loadRolesForEntityType(selected.id_tipo_entidad || typeCode);
      }
    }
  };

  // Manejador de cambio de Tipo de Entidad
  const handleEntityTypeChange = (e) => {
    const val = e.target.value;
    const found = entityTypesList.find(t => t.codigo === val || t.id_tipo_entidad === val);
    if (found) {
      setEntityData(prev => ({
        ...prev,
        tipo_entidad: found.codigo,
        id_tipo_entidad: found.id_tipo_entidad
      }));
      loadRolesForEntityType(found.id_tipo_entidad || found.codigo);
    }
  };

  // Manejador de cambio de Cargo Institucional
  const handleRoleChange = (e) => {
    const val = e.target.value;
    if (val === '__OTRO__') {
      setIsCustomRole(true);
      setEntityData(prev => ({ ...prev, cargo_institucional: '', custom_cargo: '' }));
    } else {
      setIsCustomRole(false);
      setEntityData(prev => ({ ...prev, cargo_institucional: val, custom_cargo: '' }));
    }
  };

  // Manejador de actualización desde el Mapa Leaflet
  const handleMapCoordinatesChange = ({ lat, lng, zoom }) => {
    setResourceData(prev => ({
      ...prev,
      latitud_centro: lat,
      longitud_centro: lng,
      zoom_inicial: zoom
    }));
  };

  const handleResourceChange = (e) => {
    const { name, value, type } = e.target;
    setResourceData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleEntityChange = (e) => {
    const { name, value } = e.target;
    setEntityData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdminData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Pre-fill demo accounts for fast verification
  const handleQuickFill = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Admin2026*Pass');
    setErrorMessage('');
  };

  const validateStep1 = () => {
    if (!resourceData.nombre_recurso.trim()) {
      setErrorMessage('Por favor ingrese el nombre del cuerpo hídrico o cuenca (ej: Río Shullca).');
      return false;
    }
    if (!resourceData.pais.trim() || !resourceData.region.trim()) {
      setErrorMessage('Por favor seleccione el país y la región o departamento.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const validateStep2 = () => {
    if (!entityData.nombre_entidad.trim()) {
      setErrorMessage('Por favor ingrese el nombre de la entidad u organización gestora.');
      return false;
    }
    const finalCargo = isCustomRole ? entityData.custom_cargo : entityData.cargo_institucional;
    if (!finalCargo || !finalCargo.trim()) {
      setErrorMessage('Por favor seleccione o especifique el cargo institucional del superadministrador.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const validateStep3 = () => {
    if (!adminData.nombres.trim() || !adminData.apellidos.trim()) {
      setErrorMessage('Por favor ingrese los nombres y apellidos del superadministrador.');
      return false;
    }
    const emailCheck = validateEmail(adminData.email, true);
    if (!emailCheck.isValid) {
      setErrorMessage(emailCheck.error);
      return false;
    }
    const pwdStrength = getPasswordStrength(adminData.password);
    if (!pwdStrength.isValid) {
      setErrorMessage(`Contraseña no cumple requisitos: ${pwdStrength.errors.join(' ')}`);
      return false;
    }
    if (adminData.password !== adminData.confirmPassword) {
      setErrorMessage('Las contraseñas ingresadas no coinciden.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    setErrorMessage('');

    const finalCargo = (isCustomRole ? entityData.custom_cargo : entityData.cargo_institucional).trim();

    try {
      const payload = {
        email: adminData.email.trim().toLowerCase(),
        password: adminData.password.trim(),
        nombres: adminData.nombres.trim(),
        apellidos: adminData.apellidos.trim(),
        nombre_completo: `${adminData.nombres.trim()} ${adminData.apellidos.trim()}`,
        telefono_contacto: adminData.telefono_contacto.trim(),
        cargo_institucional: finalCargo,
        nombre_entidad: entityData.nombre_entidad.trim(),
        tipo_entidad: entityData.tipo_entidad,
        nombre_recurso: resourceData.nombre_recurso.trim(),
        tipo_recurso: resourceData.tipo_recurso,
        pais: resourceData.pais.trim(),
        region: resourceData.region.trim(),
        ubicacion_detallada: resourceData.ubicacion_detallada.trim(),
        latitud_centro: resourceData.latitud_centro,
        longitud_centro: resourceData.longitud_centro,
        zoom_inicial: resourceData.zoom_inicial
      };

      const res = await registerFirstAdmin(payload);
      if (res.success) {
        setBootstrapSuccess(true);
        window.dispatchEvent(new CustomEvent('system:config_updated', { detail: payload }));
      } else {
        setErrorMessage(res.error || 'No se pudo inicializar la plataforma.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error inesperado durante la puesta en marcha.');
    } finally {
      setLoading(false);
    }
  };

  const handleNormalLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingrese su correo institucional y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim(), password.trim());
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales no autorizadas.');
      }
    } catch (err) {
      setErrorMessage('Error de enlace con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-[#020813] flex items-center justify-center relative">
        <div className="text-center space-y-4 relative z-10">
          <div className="inline-flex p-4 bg-cyan-950/80 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-500/20 animate-pulse">
            <Droplets className="w-10 h-10 text-cyan-400" />
          </div>
          <div className="text-xs font-mono text-cyan-300/80 tracking-widest uppercase">
            Iniciando Sentinel-H2O Digital Twin...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden select-none font-sans">
      {/* 1. Fondo 3D WebGL Three.js con Río Ondulante y Flujo de Partículas */}
      <ThreeLoginCanvas />

      {/* 2. Capa de Vignette y Gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020813] via-transparent to-[#020813]/80 pointer-events-none z-1" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#020813_85%)] pointer-events-none z-1" />

      {/* 3. Contenedor de la Tarjeta Central */}
      <div className={`w-full relative z-10 ${isFirstSetup ? 'max-w-2xl' : 'max-w-md'} transition-all duration-300`}>
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 backdrop-blur-md mb-3 shadow-lg shadow-cyan-950/60">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              {isFirstSetup ? 'PUESTA EN MARCHA · PRIMER DESPLIEGUE' : 'MONITOREO HÍDRICO · GEMELO DIGITAL 3D'}
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            SENTINEL<span className="text-cyan-400 font-extrabold">H2O</span>
          </h1>
          
          <p className="text-xs text-slate-300 mt-1 font-mono tracking-wider uppercase flex items-center justify-center gap-2">
            <span>{resourceData.nombre_recurso || 'SISTEMA DE SEGURIDAD HÍDRICA'}</span>
            <span className="text-cyan-500">•</span>
            <span className="text-cyan-400">{resourceData.region ? `${resourceData.region}, ${resourceData.pais}` : resourceData.pais}</span>
          </p>
        </div>

        {/* Card Glassmorphic */}
        <div className="bg-[#04131f]/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-cyan-950/80 relative overflow-hidden">
          
          {/* Barra de progreso de 3 Pasos (Solo en Primer Despliegue) */}
          {isFirstSetup && (
            <div className="mb-6 pb-4 border-b border-cyan-900/60">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Paso {currentStep} de 3: {
                    currentStep === 1 ? 'Recurso Hídrico y Georreferencia' :
                    currentStep === 2 ? 'Entidad Gestora y Cargo' : 'Superadministrador'
                  }
                </span>
                <span className="text-slate-400 text-[11px]">
                  {Math.round((currentStep / 3) * 100)}% Completado
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentStep >= step 
                        ? 'bg-gradient-to-r from-cyan-400 to-teal-400 shadow-sm shadow-cyan-400/50' 
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Mensajes de Alerta y Estado */}
          {(errorMessage || authError) && (
            <div className="mb-5 p-3.5 bg-rose-950/70 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage || authError}</span>
            </div>
          )}

          {bootstrapSuccess && (
            <div className="mb-5 p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-200 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold">¡Despliegue inicial culminado con éxito!</p>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">Sincronizando Gemelo Digital 3D y abriendo sesión...</p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CASO A: PRIMER DESPLIEGUE (ASISTENTE MULTI-PASO)                          */}
          {/* ========================================================================= */}
          {isFirstSetup ? (
            <form onSubmit={currentStep === 3 ? handleSetupSubmit : handleNextStep} className="space-y-4">
              
              {/* PASO 1: RECURSO HÍDRICO & SELECTOR EN MAPA */}
              {currentStep === 1 && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 pb-1 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                    <Waves className="w-4 h-4 text-cyan-400" />
                    <span>Identidad del Recurso Hídrico Digital</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                        NOMBRE DEL RECURSO *
                      </label>
                      <input
                        type="text"
                        name="nombre_recurso"
                        required
                        value={resourceData.nombre_recurso}
                        onChange={handleResourceChange}
                        placeholder="Ej: Río Shullca, Río Chancay-Huaral..."
                        className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                        TIPO DE RECURSO *
                      </label>
                      <select
                        name="tipo_recurso"
                        value={resourceData.tipo_recurso}
                        onChange={handleResourceChange}
                        className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      >
                        {resourceTypesList.length > 0 ? (
                          resourceTypesList.map(t => (
                            <option key={t.codigo} value={t.codigo}>
                              {t.nombre}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="RIO">Río / Cuenca Fluvial</option>
                            <option value="CANAL_RIEGO">Canal Principal de Riego / Derivación</option>
                            <option value="EMBALSE">Embalse / Presa Hidráulica</option>
                            <option value="CUENCA">Cuenca Hidrográfica Integral</option>
                            <option value="LAGUNA">Laguna / Lago Andino</option>
                            <option value="ACUIFERO">Acuífero / Sector Subterráneo</option>
                            <option value="SECTOR_HIDROLOGICO">Sector Hidrológico Delimitado</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* SELECTORES DE PAÍS Y REGIÓN (DEPARTAMENTO) */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                        PAÍS *
                      </label>
                      <select
                        name="pais_code"
                        value={resourceData.pais_code}
                        onChange={handleCountryChange}
                        className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      >
                        {countriesList.map(c => (
                          <option key={c.isoCode} value={c.isoCode}>
                            {c.flag ? `${c.flag} ` : ''}{c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                        REGIÓN / DEPARTAMENTO *
                      </label>
                      <select
                        name="region"
                        value={resourceData.region}
                        onChange={handleRegionChange}
                        className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      >
                        {regionsList.length > 0 ? (
                          regionsList.map(r => (
                            <option key={r.isoCode || r.name} value={r.name}>
                              {r.name}
                            </option>
                          ))
                        ) : (
                          <option value="General">Región General</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* SELECTOR INTERACTIVO EN MAPA LEAFLET */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono text-cyan-200/90 flex items-center gap-1.5">
                        <Map className="w-3.5 h-3.5 text-cyan-400" />
                        <span>CENTRO GEOGRÁFICO DE LA CUENCA</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        {showMap ? 'Ocultar Mapa' : 'Ver Mapa Interactivo'}
                      </button>
                    </div>

                    {showMap && (
                      <LocationPickerMap
                        lat={resourceData.latitud_centro}
                        lng={resourceData.longitud_centro}
                        zoom={resourceData.zoom_inicial}
                        onChange={handleMapCoordinatesChange}
                        height="200px"
                      />
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Latitud</label>
                        <input
                          type="number"
                          step="0.0001"
                          name="latitud_centro"
                          value={resourceData.latitud_centro}
                          onChange={handleResourceChange}
                          placeholder="-11.5300"
                          className="w-full bg-[#03141f] border border-cyan-500/30 rounded-lg px-2 py-1.5 text-xs text-cyan-300 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Longitud</label>
                        <input
                          type="number"
                          step="0.0001"
                          name="longitud_centro"
                          value={resourceData.longitud_centro}
                          onChange={handleResourceChange}
                          placeholder="-75.2500"
                          className="w-full bg-[#03141f] border border-cyan-500/30 rounded-lg px-2 py-1.5 text-xs text-cyan-300 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Zoom Map</label>
                        <input
                          type="number"
                          min="1"
                          max="18"
                          name="zoom_inicial"
                          value={resourceData.zoom_inicial}
                          onChange={handleResourceChange}
                          placeholder="9"
                          className="w-full bg-[#03141f] border border-cyan-500/30 rounded-lg px-2 py-1.5 text-xs text-cyan-300 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                      DESCRIPCIÓN / UBICACIÓN DETALLADA
                    </label>
                    <input
                      type="text"
                      name="ubicacion_detallada"
                      value={resourceData.ubicacion_detallada}
                      onChange={handleResourceChange}
                      placeholder="Ej: Valle del Mantaro · Cuenca Hidrográfica del Río Shullca"
                      className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* PASO 2: ENTIDAD DE GOBERNANZA & CARGO INSTITUCIONAL */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>Entidad Gestora & Marco Institucional</span>
                  </div>

                  {/* Selector: Elegir Entidad Existente o Registrar Nueva */}
                  {existingEntitiesList.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                        ORGANIZACIÓN / ENTIDAD GESTORA *
                      </label>
                      <select
                        value={selectedEntityId}
                        onChange={handleEntitySelectionChange}
                        className="w-full bg-[#03141f] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 font-mono shadow-inner"
                      >
                        <option value="__NUEVA__">➕ Registrar nueva entidad / organización gestora...</option>
                        <optgroup label="Entidades registradas en el sistema">
                          {existingEntitiesList.map(ent => (
                            <option key={ent.id_entidad} value={ent.id_entidad}>
                              {ent.nombre_entidad} {ent.tipo_entidad_nombre ? `(${ent.tipo_entidad_nombre})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  )}

                  {/* Vista Condicional: Ficha si es existente, o inputs si es nueva */}
                  {selectedEntityId !== '__NUEVA__' ? (
                    <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                      <div className="text-xs font-mono space-y-1">
                        <div className="text-cyan-200 font-bold">{entityData.nombre_entidad}</div>
                        <div className="text-slate-400 text-[11px]">
                          Tipo Institucional: <span className="text-cyan-300">
                            {existingEntitiesList.find(e => e.id_entidad === selectedEntityId)?.tipo_entidad_nombre || entityData.tipo_entidad}
                          </span>
                          {existingEntitiesList.find(e => e.id_entidad === selectedEntityId)?.ruc && (
                            <span className="ml-2">· RUC: {existingEntitiesList.find(e => e.id_entidad === selectedEntityId)?.ruc}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Entidad registrada en el sistema. Vinculación directa sin duplicidad.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                          NOMBRE DE LA NUEVA ENTIDAD ADMINISTRADORA *
                        </label>
                        <input
                          type="text"
                          name="nombre_entidad"
                          required
                          value={entityData.nombre_entidad}
                          onChange={handleEntityChange}
                          placeholder="Ej: Junta de Usuarios del Sector Hidráulico Chancay-Huaral"
                          className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                            TIPO DE ENTIDAD *
                          </label>
                          <select
                            name="tipo_entidad"
                            value={entityData.tipo_entidad}
                            onChange={handleEntityTypeChange}
                            className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                          >
                            {entityTypesList.length > 0 ? (
                              entityTypesList.map(t => (
                                <option key={t.id_tipo_entidad || t.codigo} value={t.codigo}>
                                  {t.nombre}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="JUNTA_USUARIOS">Junta de Usuarios de Sector Hidráulico</option>
                                <option value="AUTORIDAD_NACIONAL">Autoridad Nacional / Organismo Regulador</option>
                                <option value="COMISION_REGANTES">Comisión / Comité de Regantes</option>
                                <option value="ASOCIACION_PISCICOLA">Asociación / Empresa Piscícola o Acuícola</option>
                                <option value="ENTIDAD_MONITOREO">Organismo de Monitoreo Ambiental / Científico</option>
                                <option value="EMPRESA_OPERADORA">Empresa Operadora (Hidroeléctrica / Saneamiento)</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Cargo institucional del Superadmin */}
                  <div>
                    <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                      CARGO INSTITUCIONAL DEL SUPERADMIN *
                    </label>
                    {loadingRoles ? (
                      <div className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono animate-pulse">
                        Cargando cargos institucionales...
                      </div>
                    ) : (
                      <select
                        name="cargo_institucional"
                        value={isCustomRole ? '__OTRO__' : entityData.cargo_institucional}
                        onChange={handleRoleChange}
                        className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      >
                        {rolesList.map(r => (
                          <option key={r.id_cargo || r.codigo_cargo} value={r.nombre_cargo}>
                            {r.nombre_cargo}
                          </option>
                        ))}
                        <option value="__OTRO__">Otro cargo institucional (especificar)...</option>
                      </select>
                    )}
                  </div>

                  {/* Campo de texto adicional si se selecciona 'Otro' cargo */}
                  {isCustomRole && (
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">
                        ESPECIFIQUE SU CARGO INSTITUCIONAL *
                      </label>
                      <input
                        type="text"
                        name="custom_cargo"
                        required
                        value={entityData.custom_cargo}
                        onChange={handleEntityChange}
                        placeholder="Ej: Superintendente de Operaciones Hídricas"
                        className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  )}

                  <div className="p-3.5 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-[11px] font-mono text-slate-300 leading-relaxed">
                    <p className="text-cyan-300 font-bold mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      Entidad Administradora Principal
                    </p>
                    <p>Esta institución asumirá la gobernanza principal del recurso hídrico, permitiendo posteriormente registrar delegados de campo, operadores de compuertas y auditores autorizados. Podrá editarla, crear nuevas entidades y asignarlas a los nodos o estaciones en la sección de Gobernanza y Gestión.</p>
                  </div>
                </div>
              )}

              {/* PASO 3: CREDENCIALES DEL SUPERADMINISTRADOR */}
              {currentStep === 3 && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 pb-1 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Credenciales del Superadministrador Root</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">NOMBRES *</label>
                      <input
                        type="text"
                        name="nombres"
                        required
                        placeholder="Ej: Maycol o Carlos Alberto"
                        value={adminData.nombres}
                        onChange={handleAdminChange}
                        className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">APELLIDOS *</label>
                      <input
                        type="text"
                        name="apellidos"
                        required
                        placeholder="Ej: Guillermo Laura"
                        value={adminData.apellidos}
                        onChange={handleAdminChange}
                        className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">WHATSAPP / TELÉFONO</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-cyan-500/60 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          name="telefono_contacto"
                          value={adminData.telefono_contacto}
                          onChange={handleAdminChange}
                          placeholder="Ej: +51 987 654 321"
                          className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">CORREO INSTITUCIONAL *</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-cyan-500/60 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          name="email"
                          required
                          value={adminData.email}
                          onChange={handleAdminChange}
                          placeholder="Ej: mguillermolaura@proton.me"
                          className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">CONTRASEÑA MAESTRA *</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-cyan-500/60 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          required
                          value={adminData.password}
                          onChange={handleAdminChange}
                          placeholder="Mínimo 8 caracteres"
                          className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-cyan-200/90 mb-1">CONFIRMAR CONTRASEÑA *</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-cyan-500/60 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          required
                          value={adminData.confirmPassword}
                          onChange={handleAdminChange}
                          placeholder="Repita la contraseña"
                          className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {adminData.password && (
                    <PasswordStrengthMeter password={adminData.password} showCriteria={true} />
                  )}
                </div>
              )}

              {/* Controles de Navegación del Wizard */}
              <div className="flex items-center justify-between pt-3 border-t border-cyan-900/60">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                ) : <div />}

                {currentStep < 3 ? (
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-[#020813] rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    <span>Siguiente Paso</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-[#020813] rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-[#020813] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Desplegar Gemelo Digital y Activar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          ) : (
            
            /* ========================================================================= */
            /* CASO B: ACCESO REGULAR INSTITUCIONAL                                      */
            /* ========================================================================= */
            <form onSubmit={handleNormalLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-cyan-200/90 mb-1.5">
                  CORREO ELECTRÓNICO INSTITUCIONAL
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-cyan-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mguillermolaura@proton.me"
                    className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-bold text-cyan-200/90">
                    CONTRASEÑA DE ACCESO
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-cyan-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#03141f] border border-cyan-500/30 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-[#020813] font-bold font-mono rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#020813] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Acceder a la Consola SCADA</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Botones de Acceso Rápido para Pruebas / Demo */}
              <div className="pt-3 border-t border-cyan-900/40">
                <p className="text-[10px] font-mono text-slate-400 mb-2 text-center uppercase tracking-wider">
                  Acceso Rápido Demo (1-Click Fill)
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('mguillermolaura@proton.me')}
                    className="py-1 px-1.5 bg-slate-900/90 hover:bg-cyan-950 border border-cyan-900/60 rounded-lg text-[10px] font-mono text-cyan-300 text-center transition-all cursor-pointer"
                  >
                    Superadmin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('operador@chancay.gob.pe')}
                    className="py-1 px-1.5 bg-slate-900/90 hover:bg-cyan-950 border border-cyan-900/60 rounded-lg text-[10px] font-mono text-teal-300 text-center transition-all cursor-pointer"
                  >
                    Operador Junta
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('fiscalizador@ana.gob.pe')}
                    className="py-1 px-1.5 bg-slate-900/90 hover:bg-cyan-950 border border-cyan-900/60 rounded-lg text-[10px] font-mono text-blue-300 text-center transition-all cursor-pointer"
                  >
                    Auditor ANA
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Institucional Limpio */}
        <div className="flex items-center justify-between mt-4 px-2 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sentinel-H2O · Monitoreo Hídrico</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Servidor Operacional</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span>Gemelo Digital de Cuenca</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
