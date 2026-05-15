import api from './client'

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: () => api.post('/auth/resend-verification'),
}
