import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      authApi
        .getMe()
        .then((res) => setUser(res.data.user ?? res.data))
        .catch(() => {
          localStorage.removeItem('token')
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password })
    const { token: newToken, user: newUser } = res.data
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(newUser)
    return newUser
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await authApi.register({ name, email, password })
    const { token: newToken, user: newUser } = res.data
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (data) => {
    const res = await authApi.updateProfile(data)
    const updated = res.data.user ?? res.data
    setUser(updated)
    return updated
  }, [])

  const value = {
    user,
    loading,
    token,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
