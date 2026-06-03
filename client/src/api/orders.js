import api from './client'

export const ordersApi = {
  getAll: () => api.get('/orders'),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (address, extra) => api.post('/orders', { address, ...extra }),
  createCustom: (address, customBuild, extra) => api.post('/orders', { address, customBuild, ...extra }),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  reorder: (id) => api.post(`/orders/${id}/reorder`),
}
