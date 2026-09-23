import { Country, State } from 'country-state-city';

// Coordenadas centroides y zoom optimizados para los 25 departamentos del Perú
export const PERU_DEPARTMENTS_GEO = {
  'Amazonas': { lat: -6.2300, lng: -77.8700, zoom: 8 },
  'Áncash': { lat: -9.5300, lng: -77.5300, zoom: 8 },
  'Ancash': { lat: -9.5300, lng: -77.5300, zoom: 8 },
  'Apurímac': { lat: -14.0500, lng: -73.0800, zoom: 8 },
  'Apurimac': { lat: -14.0500, lng: -73.0800, zoom: 8 },
  'Arequipa': { lat: -16.4000, lng: -71.5400, zoom: 8 },
  'Ayacucho': { lat: -13.1600, lng: -74.2200, zoom: 8 },
  'Cajamarca': { lat: -7.1600, lng: -78.5100, zoom: 8 },
  'Callao': { lat: -12.0600, lng: -77.1500, zoom: 11 },
  'Cusco': { lat: -13.5300, lng: -71.9700, zoom: 8 },
  'Huancavelica': { lat: -12.7800, lng: -74.9700, zoom: 8 },
  'Huánuco': { lat: -9.9300, lng: -76.2400, zoom: 8 },
  'Huanuco': { lat: -9.9300, lng: -76.2400, zoom: 8 },
  'Ica': { lat: -14.0700, lng: -75.7300, zoom: 8 },
  'Junín': { lat: -11.5300, lng: -75.2500, zoom: 9 },
  'Junin': { lat: -11.5300, lng: -75.2500, zoom: 9 },
  'La Libertad': { lat: -8.1100, lng: -79.0300, zoom: 8 },
  'Lambayeque': { lat: -6.7700, lng: -79.8400, zoom: 9 },
  'Lima': { lat: -11.4900, lng: -77.0500, zoom: 10 },
  'Loreto': { lat: -3.7500, lng: -73.2500, zoom: 6 },
  'Madre de Dios': { lat: -12.5900, lng: -69.1900, zoom: 7 },
  'Moquegua': { lat: -17.2000, lng: -70.9300, zoom: 8 },
  'Pasco': { lat: -10.6800, lng: -76.2600, zoom: 8 },
  'Piura': { lat: -5.1900, lng: -80.6300, zoom: 8 },
  'Puno': { lat: -15.8400, lng: -70.0200, zoom: 8 },
  'San Martín': { lat: -6.4900, lng: -76.3700, zoom: 8 },
  'San Martin': { lat: -6.4900, lng: -76.3700, zoom: 8 },
  'Tacna': { lat: -18.0100, lng: -70.2500, zoom: 8 },
  'Tumbes': { lat: -3.5700, lng: -80.4600, zoom: 9 },
  'Ucayali': { lat: -8.3800, lng: -74.5500, zoom: 7 },
};

/**
 * Obtiene la lista de países priorizando Perú y países latinoamericanos.
 */
export const getAvailableCountries = () => {
  const all = Country.getAllCountries();
  const peru = all.find(c => c.isoCode === 'PE');
  
  // Países prioritarios de la región
  const priorityCodes = ['PE', 'CL', 'CO', 'EC', 'BO', 'AR', 'BR', 'MX', 'UY', 'PY', 'ES', 'US'];
  const priorityList = [];
  const otherList = [];

  if (peru) {
    priorityList.push({
      isoCode: 'PE',
      name: 'Perú',
      flag: '🇵🇪'
    });
  }

  all.forEach(c => {
    if (c.isoCode === 'PE') return;
    if (priorityCodes.includes(c.isoCode)) {
      priorityList.push({
        isoCode: c.isoCode,
        name: c.name,
        flag: c.flag
      });
    } else {
      otherList.push({
        isoCode: c.isoCode,
        name: c.name,
        flag: c.flag
      });
    }
  });

  return [...priorityList, ...otherList];
};

/**
 * Obtiene las regiones o departamentos del país seleccionado.
 */
export const getRegionsForCountry = (countryIsoCode = 'PE') => {
  if (!countryIsoCode) return [];
  const states = State.getStatesOfCountry(countryIsoCode);
  return states.map(s => ({
    name: s.name,
    isoCode: s.isoCode,
    latitude: s.latitude ? parseFloat(s.latitude) : null,
    longitude: s.longitude ? parseFloat(s.longitude) : null
  }));
};

/**
 * Obtiene coordenadas de referencia por región para centrar el mapa.
 */
export const getCoordinatesForRegion = (countryIsoCode, regionName) => {
  if (countryIsoCode === 'PE' && regionName && PERU_DEPARTMENTS_GEO[regionName]) {
    return PERU_DEPARTMENTS_GEO[regionName];
  }

  // Búsqueda en State de country-state-city
  if (countryIsoCode && regionName) {
    const states = State.getStatesOfCountry(countryIsoCode);
    const found = states.find(s => s.name.toLowerCase() === regionName.toLowerCase() || s.isoCode === regionName);
    if (found && found.latitude && found.longitude) {
      return {
        lat: parseFloat(found.latitude),
        lng: parseFloat(found.longitude),
        zoom: 9
      };
    }
  }

  // Fallback a Perú centro
  return { lat: -11.4900, lng: -77.0500, zoom: 10 };
};
