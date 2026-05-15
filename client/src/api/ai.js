import api from './client'

export const aiApi = {
  performancePredict: (components) => api.post('/ai/performance', { components }),
  generateDescription: (data) => api.post('/ai/generate-description', data),
}
