import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Package, Cpu, ShoppingBag, Users, TrendingUp, ChevronRight, AlertCircle, Bell,
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts'
import { adminApi } from '../../api/admin'
import { formatPrice, formatDate } from '../../utils/formatters'
import OrderStatusBadge from '../../components/ui/OrderStatusBadge'
import Spinner from '../../components/ui/Spinner'
import NotificationBell from '../../components/admin/NotificationBell'

const NAV_LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/components', label: 'Components' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/promo', label: 'Promo Codes' },
]

const STATUS_COLORS = {
  PENDING: '#6366f1',
  CONFIRMED: '#3b82f6',
  PROCESSING: '#8b5cf6',
  SHIPPED: '#f59e0b',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
}

function StatCard({ icon: Icon, label, value, sub, color = 'primary', to }) {
  const colorMap = {
    primary: 'bg-primary-600/15 border-primary-600/20 text-primary-400',
    green: 'bg-green-600/15 border-green-600/20 text-green-400',
    blue: 'bg-blue-600/15 border-blue-600/20 text-blue-400',
    yellow: 'bg-yellow-600/15 border-yellow-600/20 text-yellow-400',
  }
  const Wrapper = to ? Link : 'div'
  return (
    <Wrapper to={to} className="card p-5 hover:border-dark-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {to && <ChevronRight className="w-4 h-4 text-dark-500" />}
      </div>
      <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-dark-100 text-2xl font-bold">{value}</p>
      {sub && <p className="text-dark-400 text-xs mt-1">{sub}</p>}
    </Wrapper>
  )
}

function formatRevenue(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return String(v)
}

export default function AdminDashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
  })

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics().then((r) => r.data),
  })

  const totalRevenue = statsData?.totalRevenue ?? 0
  const totalOrders = statsData?.totalOrders ?? 0
  const productCount = statsData?.totalProducts ?? 0
  const recentOrders = statsData?.recentOrders ?? []

  const dailyRevenue = analyticsData?.dailyRevenue ?? []
  const ordersByStatus = analyticsData?.ordersByStatus ?? []
  const topProducts = analyticsData?.topProducts ?? []

  const totalPeriodRevenue = dailyRevenue.reduce((s, d) => s + d.revenue, 0)

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-100">Admin Dashboard</h1>
          <p className="text-dark-400 text-sm mt-1">Overview of your store</p>
        </div>
        <NotificationBell />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard icon={TrendingUp} label="Total Revenue" value={statsLoading ? '...' : formatPrice(totalRevenue)} sub={`${totalOrders} orders`} color="green" />
        <StatCard icon={ShoppingBag} label="Total Orders" value={statsLoading ? '...' : totalOrders} to="/admin/orders" color="primary" />
        <StatCard icon={Package} label="Products" value={statsLoading ? '...' : productCount} to="/admin/products" color="blue" />
        <StatCard icon={Cpu} label="Components" value={statsLoading ? '...' : (statsData?.totalComponents ?? '—')} to="/admin/components" color="yellow" />
      </div>

      {/* Analytics section */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-dark-100 mb-6">Sales Analytics</h2>

        {analyticsLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div className="card p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-dark-100">Revenue (Last 30 Days)</h3>
                <span className="text-sm font-bold text-green-400">{formatPrice(totalPeriodRevenue)}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickFormatter={(v) => v.slice(5)}
                    interval={6}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={formatRevenue} width={50} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb' }}
                    formatter={(v) => [formatPrice(v), 'Revenue']}
                    labelFormatter={(l) => l}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Orders by Status Pie */}
            <div className="card p-6">
              <h3 className="font-semibold text-dark-100 mb-4">Orders by Status</h3>
              {ordersByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-dark-500 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={false}>
                      {ordersByStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb' }}
                      formatter={(v, name) => [v, name]}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Products Bar */}
            <div className="card p-6 lg:col-span-3">
              <h3 className="font-semibold text-dark-100 mb-4">Top 5 Products by Orders</h3>
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-[160px] text-dark-500 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} width={120} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb' }}
                      formatter={(v) => [v, 'Orders']}
                    />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-dark-100 font-bold">Recent Orders</h2>
          <Link to="/admin/orders" className="text-primary-400 hover:text-primary-300 text-sm transition-colors">View all →</Link>
        </div>

        {statsLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle className="w-8 h-8 text-dark-600 mx-auto mb-2" />
            <p className="text-dark-400 text-sm">No orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left text-dark-400 font-medium pb-3 pr-4">Order ID</th>
                  <th className="text-left text-dark-400 font-medium pb-3 pr-4">Date</th>
                  <th className="text-left text-dark-400 font-medium pb-3 pr-4">Status</th>
                  <th className="text-right text-dark-400 font-medium pb-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {recentOrders.map((order) => {
                  const orderId = order._id || order.id
                  return (
                    <tr key={orderId} className="hover:bg-dark-800/30 transition-colors">
                      <td className="py-3 pr-4">
                        <Link to={`/orders/${orderId}`} className="font-mono text-dark-300 hover:text-primary-400 transition-colors text-xs">
                          #{String(orderId).slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-dark-400">{order.createdAt ? formatDate(order.createdAt) : 'N/A'}</td>
                      <td className="py-3 pr-4"><OrderStatusBadge status={order.status} /></td>
                      <td className="py-3 text-right text-dark-200 font-medium">{formatPrice(order.total || order.totalPrice || 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
