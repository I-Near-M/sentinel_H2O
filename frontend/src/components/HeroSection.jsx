import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Droplets, 
  Zap, 
  ArrowRight, 
  BarChart3, 
  PlusCircle, 
  Globe2, 
  BellRing, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Sun,
  Activity,
  Sliders,
  Compass,
  Database,
  Layers,
  Smartphone,
  Check
} from 'lucide-react';

export default function HeroSection({ onStartImplementation }) {
  return (
    <div className="space-y-24 py-8 sm:py-12 relative overflow-hidden">
      
      {/* Luces ambientales flotantes en el fondo */}
      <div className="glow-orb-cyan -top-20 -left-20"></div>
      <div className="glow-orb-blue top-96 -right-20"></div>

      {/* ========================================================================= */}
      {/* 1. HERO PRINCIPAL: QUÉ OFRECEMOS & VISUAL 3D ESPACIAL                     */}
      {/* ========================================================================= */}
      <section id="que-ofrecemos" className="relative z-10 space-y-12">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full spatial-badge text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-onahau-500 animate-pulse" />
            <span>Innovación Hidroinformática & Seguridad Hídrica Abierta</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-onahau-950 leading-[1.15]">
            Protege tu Cuenca y Cultivos con <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-onahau-500 via-onahau-600 to-onahau-800 bg-clip-text text-transparent">
              Inteligencia Hídrica en Tiempo Real
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-onahau-800 max-w-3xl mx-auto font-normal leading-relaxed">
            Plataforma integral de código abierto y hardware solar de bajo costo (&lt; $120 USD) que monitorea salinidad, pH, turbidez y caudal, detecta anomalías con Machine Learning y <strong>envía alertas preventivas directas por WhatsApp</strong> antes de que el agua contaminada ingrese a tus parcelas.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onStartImplementation('entities')}
              className="flex items-center space-x-2.5 px-8 py-4 rounded-2xl text-sm font-black bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white shadow-xl shadow-onahau-500/30 transition-all transform hover:-translate-y-1"
            >
              <Sparkles className="w-4 h-4" />
              <span>Implementar Sentinel en mi Cuenca</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#metodologia"
              className="flex items-center space-x-2 px-7 py-4 rounded-2xl text-sm font-bold bg-white/90 hover:bg-white text-onahau-900 border border-onahau-200 hover:border-onahau-400 shadow-md transition-all"
            >
              <Compass className="w-4 h-4 text-onahau-600" />
              <span>Ver Cómo Funciona</span>
            </a>
          </div>
        </div>

        {/* MOCKUP VISUAL 3D ESPACIAL DE LA ESTACIÓN TELEMÉTRICA */}
        <div className="relative max-w-5xl mx-auto">
          <div className="spatial-card-hero p-3 sm:p-5 relative overflow-hidden group">
            <img 
              src="/assets/hero_sentinel_station.jpg" 
              alt="Estación Telemétrica IoT Sentinel-H2O con Energía Solar y Sensores en Campo" 
              className="w-full h-auto rounded-3xl object-cover shadow-2xl transition-transform duration-700 group-hover:scale-[1.01]"
            />
            
            {/* Etiquetas Holográficas Flotantes sobre la Imagen */}
            <div className="absolute top-8 left-8 hidden sm:flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-onahau-200 shadow-lg text-xs font-bold text-onahau-900 animate-float-slow">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Autonomía Solar 12V 24/7</span>
            </div>

            <div className="absolute bottom-8 right-8 hidden sm:flex items-center space-x-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-onahau-200 shadow-lg text-xs font-bold text-onahau-900">
              <Activity className="w-4 h-4 text-onahau-500 animate-pulse" />
              <span>Telemetría GPRS / GSM Segura</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CÓMO LE BENEFICIA: IMPACTO AGRÍCOLA & PROBLEMÁTICA                     */}
      {/* ========================================================================= */}
      <section id="beneficios" className="space-y-12 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-onahau-600">Impacto y Beneficios</span>
          <h2 className="text-3xl sm:text-4xl font-black text-onahau-950">
            ¿Por qué tu Junta de Usuarios necesita Sentinel-H2O?
          </h2>
          <p className="text-sm text-onahau-700">
            La salinidad repentina y la falta de avisos tempranos destruyen cosechas enteras. Diseñamos una solución real para el campo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Beneficio 1 */}
          <div className="spatial-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-100 to-amber-100 border border-red-200 text-red-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-onahau-950">
              Cero Estrés Osmótico en Frutales
            </h3>
            <p className="text-xs text-onahau-800 leading-relaxed">
              Detecta picos repentinos de salinidad (EC &gt; 1500 µS/cm) en cabecera y avisa 35 minutos antes para cerrar la compuerta antes de que el agua queme las raíces absorbentes de melocotón, palto o cítricos.
            </p>
          </div>

          {/* Beneficio 2 */}
          <div className="spatial-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-onahau-100 to-onahau-200 border border-onahau-300 text-onahau-700 flex items-center justify-center">
              <Sun className="w-6 h-6 text-onahau-600" />
            </div>
            <h3 className="text-base font-extrabold text-onahau-950">
              100% Off-Grid con Energía Solar
            </h3>
            <p className="text-xs text-onahau-800 leading-relaxed">
              Equipado con batería solar 12V 7Ah, panel de 10W y cargador inteligente. Funciona 24/7 en canales remotos y alta montaña sin cables ni red eléctrica.
            </p>
          </div>

          {/* Beneficio 3 */}
          <div className="spatial-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-onahau-950">
              Alertas por WhatsApp a Tomeros
            </h3>
            <p className="text-xs text-onahau-800 leading-relaxed">
              Sin aplicaciones difíciles de usar. El tomero y los agricultores reciben mensajes claros en lenguaje campesino directamente en su WhatsApp y SMS de contingencia.
            </p>
          </div>

          {/* Beneficio 4 */}
          <div className="spatial-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-onahau-100 to-cyan-100 border border-onahau-300 text-onahau-800 flex items-center justify-center">
              <Zap className="w-6 h-6 text-onahau-600" />
            </div>
            <h3 className="text-base font-extrabold text-onahau-950">
              Democratización (&lt; $120 USD)
            </h3>
            <p className="text-xs text-onahau-800 leading-relaxed">
              Sustituye estaciones comerciales privativas de más de $5,000 USD por componentes comerciales universales con soporte mundial y código abierto.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. METODOLOGÍA EN 3 PASOS: CÓMO REPLICARLO EN TU CUENCA                   */}
      {/* ========================================================================= */}
      <section id="metodologia" className="space-y-12 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-onahau-600">Guía de Replicabilidad</span>
          <h2 className="text-3xl sm:text-4xl font-black text-onahau-950">
            Implementa Sentinel-H2O en 3 Sencillos Pasos
          </h2>
          <p className="text-sm text-onahau-700">
            Diseñado para que cualquier técnico o agricultor del mundo pueda desplegar una red de monitoreo sin barreras de entrada.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PASO 1 */}
          <div className="spatial-card p-8 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-onahau-500 text-white font-black text-base flex items-center justify-center shadow-md">
                1
              </div>
              <h3 className="text-lg font-black text-onahau-950">
                Monta el Hardware Abierto
              </h3>
              <p className="text-xs text-onahau-800 leading-relaxed">
                Adquiere los 5 sensores de grado agrícola (pH, TDS/Salinidad compensada térmicamente a 25°C, Turbidez óptica, Ultrasonido y Temperatura digital DS18B20) y conéctalos al ESP32 y módem GSM.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-onahau-50 border border-onahau-200 text-[11px] font-bold text-onahau-900">
              🛠️ Componentes accesibles en cualquier país por menos de $120 USD.
            </div>
          </div>

          {/* PASO 2 */}
          <div className="spatial-card p-8 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-onahau-600 text-white font-black text-base flex items-center justify-center shadow-md">
                2
              </div>
              <h3 className="text-lg font-black text-onahau-950">
                Configura tu Aforador y Cultivo
              </h3>
              <p className="text-xs text-onahau-800 leading-relaxed">
                Ingresa al asistente web para seleccionar la geometría de tu canal (Parshall 1" a 2 pies, Vertederos, Manning) y fija los umbrales de salinidad según la sensibilidad de tu cultivo.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-onahau-50 border border-onahau-200 text-[11px] font-bold text-onahau-900">
              📊 Cálculo automático de caudales ($Q = K \cdot h^N$) e Índice WQI.
            </div>
          </div>

          {/* PASO 3 */}
          <div className="spatial-card p-8 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-onahau-700 text-white font-black text-base flex items-center justify-center shadow-md">
                3
              </div>
              <h3 className="text-lg font-black text-onahau-950">
                Graba el ESP32 y Recibe Alertas
              </h3>
              <p className="text-xs text-onahau-800 leading-relaxed">
                La web te entrega el archivo <code className="font-mono text-onahau-700 font-bold bg-white px-1 py-0.5 rounded">config.h</code> listo con la API Key generada. Cárgalo al ESP32 y la estación comenzará a transmitir y alertar por WhatsApp.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-onahau-50 border border-onahau-200 text-[11px] font-bold text-onahau-900">
              🔒 Seguridad criptográfica SHA-256 por cada nodo telemétrico.
            </div>
          </div>
        </div>

        {/* GALERÍA 3D: DIGITAL TWIN Y ALERTAS EN EL CAMPO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="spatial-card p-4 space-y-3">
            <img 
              src="/assets/digital_twin_spatial.jpg" 
              alt="Holograma 3D del Gemelo Digital de Cuenca" 
              className="w-full h-64 object-cover rounded-2xl shadow-md"
            />
            <div className="px-2">
              <h4 className="text-sm font-black text-onahau-950">Espejo Virtual 2D & Conectividad Hidrológica</h4>
              <p className="text-xs text-onahau-700 mt-0.5">Visualización integrada de toda la cuenca desde las lagunas de cabecera hasta las bocatomas de riego.</p>
            </div>
          </div>

          <div className="spatial-card p-4 space-y-3">
            <img 
              src="/assets/whatsapp_alert_mobile.jpg" 
              alt="Alerta WhatsApp en Tiempo Real para el Tomero" 
              className="w-full h-64 object-cover rounded-2xl shadow-md"
            />
            <div className="px-2">
              <h4 className="text-sm font-black text-onahau-950">Avisos Preventivos al Celular del Regante</h4>
              <p className="text-xs text-onahau-700 mt-0.5">Mensajería instantánea que avisa con anticipación el tiempo exacto de viaje del agua salina.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. REPLICABILIDAD GLOBAL & CALL TO ACTION FINAL                           */}
      {/* ========================================================================= */}
      <section id="replicabilidad" className="spatial-card-hero p-8 sm:p-12 lg:p-16 border border-onahau-300 relative overflow-hidden text-center space-y-8 scroll-mt-24">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-onahau-100 border border-onahau-300 text-onahau-800 text-xs font-extrabold uppercase tracking-wider">
            <Globe2 className="w-4 h-4 text-onahau-600" />
            <span>Listo para Desplegar en tu Valle o Distrito de Riego</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-onahau-950 tracking-tight leading-tight">
            ¿Listo para llevar la Inteligencia Hídrica a tu Cuenca?
          </h2>

          <p className="text-sm sm:text-base text-onahau-800 max-w-2xl mx-auto leading-relaxed">
            Inicia el proceso de implementación registrando la primera entidad gestora y aprovisionando tu estación en minutos.
          </p>

          <div className="pt-4">
            <button
              onClick={() => onStartImplementation('entities')}
              className="px-9 py-4 rounded-2xl text-base font-black bg-gradient-to-r from-onahau-500 to-onahau-400 hover:from-onahau-600 hover:to-onahau-500 text-white shadow-2xl shadow-onahau-500/35 transition-all transform hover:-translate-y-1 inline-flex items-center space-x-2"
            >
              <span>Comenzar Implementación de Sentinel-H2O</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
