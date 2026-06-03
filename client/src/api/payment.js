import api from './client'

export const paymentApi = {
  createIntent: (amount) => api.post('/payment/create-intent', { amount }),
  confirm: (paymentIntentId) => api.post('/payment/confirm', { paymentIntentId }),
}
