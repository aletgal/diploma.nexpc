import api from './client'

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  getOrders: (params) => api.get('/admin/orders', { params }),
  exportOrders: (params) => api.get('/admin/orders/export', { params }),
  getAnalytics: () => api.get('/admin/analytics'),
  getNotifications: () => api.get('/admin/notifications'),
  bulkPriceUpdate: (data) => api.patch('/admin/products/bulk-price', data),
  getPromoCodes: () => api.get('/admin/promo'),
  createPromoCode: (data) => api.post('/admin/promo', data),
  deletePromoCode: (id) => api.delete(`/admin/promo/${id}`),
  togglePromoCode: (id) => api.patch(`/admin/promo/${id}/toggle`),
}
