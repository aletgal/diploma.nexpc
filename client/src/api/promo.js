import api from './client'

export const promoApi = {
  validate: (code, cartTotal) => api.post('/promo/validate', { code, cartTotal }),
}
