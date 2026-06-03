import api from './client'

export const wishlistApi = {
  get: () => api.get('/wishlist'),
  toggle: (productId) => api.post('/wishlist/toggle', { productId }),
  remove: (id) => api.delete(`/wishlist/${id}`),
}
