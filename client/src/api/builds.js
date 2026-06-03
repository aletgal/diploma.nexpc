import api from './client'

export const buildsApi = {
  getAll: (params) => api.get('/builds', { params }),
  getOne: (id) => api.get(`/builds/${id}`),
  create: (data) => api.post('/builds', data),
  update: (id, data) => api.put(`/builds/${id}`, data),
  delete: (id) => api.delete(`/builds/${id}`),
}
