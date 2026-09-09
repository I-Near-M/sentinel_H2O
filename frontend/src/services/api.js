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
  getEntities: (includeInactive = true) => api.get(`/nodes/entities/all?include_inactive=${includeInactive}`),
  createEntity: (data) => api.post('/nodes/entities', data),
  updateEntity: (id, data) => api.put(`/nodes/entities/${id}`, data),
  deleteEntity: (id) => api.delete(`/nodes/entities/${id}`),
  toggleEntityActive: (id) => api.patch(`/nodes/entities/${id}/toggle-active`),
};

export const alertsApi = {
  getRecentAlerts: (limit = 20) => api.get(`/alerts/recent?limit=${limit}`),
  getNodeAlerts: (nodeId, limit = 20) => api.get(`/alerts/node/${nodeId}?limit=${limit}`),
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
};

export default api;

