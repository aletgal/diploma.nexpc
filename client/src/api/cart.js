import api from './client'

export const cartApi = {
  get: () => api.get('/cart'),
  add: (productId, quantity = 1) => api.post('/cart', { productId, quantity }),
  update: (id, quantity) => api.put(`/cart/${id}`, { quantity }),
  remove: (id) => api.delete(`/cart/${id}`),
  clear: () => api.delete('/cart'),
}
