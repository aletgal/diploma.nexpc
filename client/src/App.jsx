import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Spinner from './components/ui/Spinner'

import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ComponentsPage from './pages/ComponentsPage'
import ComponentDetailPage from './pages/ComponentDetailPage'
import ConfiguratorPage from './pages/ConfiguratorPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import WishlistPage from './pages/WishlistPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import SavedBuildsPage from './pages/SavedBuildsPage'
import NotFoundPage from './pages/NotFoundPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ComparePage from './pages/ComparePage'

const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'))
const AdminComponentsPage = lazy(() => import('./pages/admin/AdminComponentsPage'))
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminPromoPage = lazy(() => import('./pages/admin/AdminPromoPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function AdminFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  )
}

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f4f5f7]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/components" element={<ComponentsPage />} />
                <Route path="/components/:id" element={<ComponentDetailPage />} />

                <Route path="/build" element={<ConfiguratorPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/builder" element={<Navigate to="/build" replace />} />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute>
                      <OrderDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wishlist"
                  element={
                    <ProtectedRoute>
                      <WishlistPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/builds"
                  element={
                    <ProtectedRoute>
                      <SavedBuildsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />

                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Suspense fallback={<AdminFallback />}>
                        <AdminDashboardPage />
                      </Suspense>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/products"
                  element={
                    <AdminRoute>
                      <Suspense fallback={<AdminFallback />}>
                        <AdminProductsPage />
                      </Suspense>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/components"
                  element={
                    <AdminRoute>
                      <Suspense fallback={<AdminFallback />}>
                        <AdminComponentsPage />
                      </Suspense>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/orders"
                  element={
                    <AdminRoute>
                      <Suspense fallback={<AdminFallback />}>
                        <AdminOrdersPage />
                      </Suspense>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminRoute>
                      <Suspense fallback={<AdminFallback />}>
                        <AdminUsersPage />
                      </Suspense>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/promo"
                  element={
                    <AdminRoute>
                      <Suspense fallback={<AdminFallback />}>
                        <AdminPromoPage />
                      </Suspense>
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
