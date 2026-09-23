import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor para inyectar token JWT Bearer en todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentinel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor de respuesta para detectar expiración de sesión (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el token expiró, limpiar almacenamiento local
      if (localStorage.getItem('sentinel_token')) {
        localStorage.removeItem('sentinel_token');
        localStorage.removeItem('sentinel_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  getSetupStatus: () => api.get('/auth/setup-status'),
  bootstrapAdmin: (data) => api.post('/auth/bootstrap-admin', data),
  getUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deactivateUser: (id) => api.delete(`/auth/users/${id}`),
  getAuditLogs: (params) => api.get('/auth/audit', { params }),
};

export const systemApi = {
  getConfig: () => api.get('/system/config'),
  updateConfig: (data) => api.put('/system/config', data),
};

export const telemetryApi = {
  getLatest: (nodeId) => api.get(`/telemetry/${nodeId}/latest`),
  getHistory: (nodeId, limit = 50) => api.get(`/telemetry/${nodeId}/history?limit=${limit}`),
};

export const weatherApi = {
  getNodeWeather: (nodeId) => api.get(`/weather/${nodeId}/latest`),
  getHistory: (nodeId, limit = 24) => api.get(`/weather/${nodeId}/history?limit=${limit}`),
};

export const nodesApi = {
  getNodes: () => api.get('/nodes/'),
  getNodeDetail: (id) => api.get(`/nodes/${id}`),
  provisionNode: (data) => api.post('/nodes/provision', data),
  updateNode: (id, data) => api.put(`/nodes/${id}`, data),
  deleteNode: (id) => api.delete(`/nodes/${id}`),
  regenerateApiKey: (id) => api.post(`/nodes/${id}/regenerate-api-key`),
  getNodeCalibration: (id) => api.get(`/nodes/${id}/calibration`),
  updateNodeCalibration: (id, data) => api.post(`/nodes/${id}/calibration`, data),
  getEntities: (includeInactive = true) => api.get(`/nodes/entities/all?include_inactive=${includeInactive}`),
  createEntity: (data) => api.post('/nodes/entities', data),
  updateEntity: (id, data) => api.put(`/nodes/entities/${id}`, data),
  deleteEntity: (id) => api.delete(`/nodes/entities/${id}`),
  toggleEntityActive: (id) => api.patch(`/nodes/entities/${id}/toggle-active`),
  getAllMaintenances: (params) => api.get('/nodes/maintenances/all', { params }),
  getNodeMaintenances: (nodeId, params) => api.get(`/nodes/${nodeId}/maintenances`, { params }),
  createMaintenance: (nodeId, data) => api.post(`/nodes/${nodeId}/maintenances`, data),
  updateMaintenance: (id, data) => api.put(`/nodes/maintenances/${id}`, data),
  deleteMaintenance: (id) => api.delete(`/nodes/maintenances/${id}`),
};

export const governanceApi = {
  getEntityTypes: () => api.get('/governance/entity-types'),
  createEntityType: (data) => api.post('/governance/entity-types', data),
  updateEntityType: (id, data) => api.put(`/governance/entity-types/${id}`, data),
  getRoles: (entityTypeId) => api.get(`/governance/roles${entityTypeId ? `?entity_type_id=${entityTypeId}` : ''}`),
  createRole: (data) => api.post('/governance/roles', data),
  updateRole: (id, data) => api.put(`/governance/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/governance/roles/${id}`),
  getWaterUses: () => api.get('/governance/water-uses'),
  createWaterUse: (data) => api.post('/governance/water-uses', data),
  updateWaterUse: (id, data) => api.put(`/governance/water-uses/${id}`, data),
  getResourceTypes: () => api.get('/governance/water-resource-types'),
  createResourceType: (data) => api.post('/governance/water-resource-types', data),
  updateResourceType: (id, data) => api.put(`/governance/water-resource-types/${id}`, data),
  getCrops: (params) => api.get('/governance/crops', { params }),
  createCrop: (data) => api.post('/governance/crops', data),
  updateCrop: (id, data) => api.put(`/governance/crops/${id}`, data),
  getSystemRoles: () => api.get('/governance/system-roles'),
  getEntities: (params) => api.get('/governance/entities', { params }),
  createEntity: (data) => api.post('/governance/entities', data),
  updateEntity: (id, data) => api.put(`/governance/entities/${id}`, data),
  deleteEntity: (id) => api.delete(`/governance/entities/${id}`),
  getAuditLogs: (params) => api.get('/governance/audit-logs', { params }),
};

export const alertsApi = {
  getRecentAlerts: (limit = 20) => api.get(`/alerts/recent?limit=${limit}`),
  getNodeAlerts: (nodeId, limit = 20) => api.get(`/alerts/node/${nodeId}?limit=${limit}`),
  acknowledgeAlert: (alertId) => api.post(`/alerts/${alertId}/ack`),
  getRecipients: () => api.get('/alerts/recipients'),
  registerRecipient: (data) => api.post('/alerts/recipients', data),
  updateRecipient: (id, data) => api.put(`/alerts/recipients/${id}`, data),
  deleteRecipient: (id) => api.delete(`/alerts/recipients/${id}`),
  sendTestWhatsApp: (data) => api.post('/alerts/test-whatsapp', data),
};

export const predictionsApi = {
  getForecast24h: (nodeId) => api.get(`/predictions/${nodeId}/forecast-24h`),
  getLeadTime: (origen, destino, caudal) =>
    api.post('/predictions/lead-time', { origen_nodo_id: origen, destino_nodo_id: destino, caudal_origen_m3s: caudal }),
  getCascadeLeadTime: (data) => api.post('/predictions/lead-time/cascade', data),
  simulateWhatIf: (data) => api.post('/predictions/simulate-whatif', data),
  simulateMultiVariable: (data) => api.post('/predictions/simulate-multivariable', data),
  prescribeDilution: (data) => api.post('/predictions/prescribe-dilution', data),
  auditMitaDeficit: (data) => api.post('/predictions/audit-mita-deficit', data),
  getSimulationsHistory: (limit = 20) => api.get(`/predictions/simulations-history?limit=${limit}`),
  syncAllForecasts: () => api.post('/predictions/sync-all-forecasts'),
  getAgroCrops: (naturalRegion = null) => api.get(`/predictions/agro/crops${naturalRegion ? `?natural_region=${naturalRegion}` : ''}`),
  getAgroRegionalBenchmarks: (region = 'LIMA') => api.get(`/predictions/agro/regional-benchmarks?region=${region}`),
  evaluateAgroSuitability: (data) => api.post('/predictions/agro/suitability', data),
  simulateAgroWhatIf: (data) => api.post('/predictions/agro/what-if', data),
  simulateWaterQualityStress: (data) => api.post('/predictions/agro/stress-simulation', data),
  checkPlantingIntentionsFeasibility: (data) => api.post('/predictions/agro/intentions-feasibility', data),
  getAIModels: () => api.get('/predictions/models'),
  getAnomaliesHistory: (params) => api.get('/predictions/anomalies/history', { params }),
  getBenchmarksSql: (departamento = 'LIMA') => api.get(`/predictions/agro/benchmarks/${departamento}`),
  getRiskProfilesSql: (departamento = 'LIMA') => api.get(`/predictions/agro/risk-profiles/${departamento}`),
  getPlantingIntentionsSql: (departamento = 'LIMA') => api.get(`/predictions/agro/planting-intentions/${departamento}`),
};

export const irrigationApi = {
  getShifts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/irrigation/shifts${query ? `?${query}` : ''}`);
  },
  createShift: (data) => api.post('/irrigation/shifts', data),
  updateShiftStatus: (id, estado, volumenReal = null) => {
    let url = `/irrigation/shifts/${id}/status?estado_turno=${encodeURIComponent(estado)}`;
    if (volumenReal !== null && volumenReal !== undefined) {
      url += `&volumen_real_entregado_m3=${volumenReal}`;
    }
    return api.put(url);
  },
  deleteShift: (id) => api.delete(`/irrigation/shifts/${id}`),
  simulateReachImpact: (data) => api.post('/irrigation/simulate-reach-impact', data),
};

export default api;

