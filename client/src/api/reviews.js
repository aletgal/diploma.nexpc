import api from './client'

export const reviewsApi = {
  getProductReviews: (productId, params) => api.get(`/products/${productId}/reviews`, { params }),
  getProductRating: (productId) => api.get(`/products/${productId}/rating`),
  createReview: (productId, data) => api.post(`/products/${productId}/reviews`, data),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
}
