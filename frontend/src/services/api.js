import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const nodesApi = {
  getNodes: () => api.get('/nodes/'),
  getNodeDetail: (id) => api.get(`/nodes/${id}`),
  provisionNode: (data) => api.post('/nodes/provision', data),
  updateNode: (id, data) => api.put(`/nodes/${id}`, data),
  deleteNode: (id) => api.delete(`/nodes/${id}`),
  regenerateApiKey: (id) => api.post(`/nodes/${id}/regenerate-api-key`),
  getEntities: () => api.get('/nodes/entities/all'),
  createEntity: (data) => api.post('/nodes/entities', data),
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
    api.get(`/predictions/lead-time?origen_nodo_id=${origen}&destino_nodo_id=${destino}&caudal_m3s=${caudal}`),
  simulateWhatIf: (data) => api.post('/predictions/simulate-whatif', data),
  syncAllForecasts: () => api.post('/predictions/sync-all-forecasts'),
};

export default api;
