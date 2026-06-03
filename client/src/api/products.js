import api from './client'

export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  getFeatured: () => api.get('/products/featured'),
  getHero: () => api.get('/products/hero'),
  getFilterOptions: (params) => api.get('/products/filter-options', { params }),
  getComponents: (id) => api.get(`/products/${id}/components`),
  linkComponent: (id, componentId) => api.post(`/products/${id}/components`, { componentId }),
  unlinkComponent: (id, componentId) => api.delete(`/products/${id}/components/${componentId}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
}
