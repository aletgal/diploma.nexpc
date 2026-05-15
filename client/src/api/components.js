import api from './client'

export const componentsApi = {
  getAll: (params) => api.get('/components', { params }),
  getOne: (id) => api.get(`/components/${id}`),
  getFilterOptions: () => api.get('/components/filter-options'),
  getProducts: (id) => api.get(`/components/${id}/products`),
  create: (data) => api.post('/components', data),
  update: (id, data) => api.put(`/components/${id}`, data),
  delete: (id) => api.delete(`/components/${id}`),
}
