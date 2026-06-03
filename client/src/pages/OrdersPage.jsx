import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ChevronRight, CheckCircle } from 'lucide-react'
import { ordersApi } from '../api/orders'
import { formatPrice, formatDate } from '../utils/formatters'
import OrderStatusBadge from '../components/ui/OrderStatusBadge'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

export default function OrdersPage() {
  const [searchParams] = useSearchParams()
  const newOrderId = searchParams.get('newOrder')

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getAll().then((r) => r.data),
  })

  const orders = Array.isArray(data) ? data : (data?.orders || data?.data || [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-page py-12 text-center">
        <div className="card p-8 max-w-md mx-auto">
          <p className="text-red-500">Failed to load orders. Please try again.</p>
        </div>
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="You haven't placed any orders yet. Browse our products to get started."
          action={{ label: 'Shop Now', href: '/products' }}
        />
      </div>
    )
  }

  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
  )

  return (
    <div className="container-page py-8">
      {newOrderId && (
        <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-green-800 font-semibold text-sm">Order placed successfully!</p>
            <p className="text-green-600 text-xs mt-0.5">
              Order #{newOrderId.slice(-8).toUpperCase()} has been confirmed.
            </p>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
      <p className="text-gray-500 text-sm mb-8">
        {orders.length} order{orders.length !== 1 ? 's' : ''}
      </p>

      <div className="space-y-4">
        {sorted.map((order) => {
          const orderId = order._id || order.id
          const rawItems = order.items || order.orderItems || []
          const isCustomBuild = !Array.isArray(rawItems) && rawItems?.type === 'CUSTOM_BUILD'
          const itemsArr = Array.isArray(rawItems) ? rawItems : (rawItems?.components || [])
          const itemCount = itemsArr.reduce((sum, i) => sum + (i.quantity || i.qty || 1), 0)

          return (
            <div key={orderId} className="card p-5 hover:border-gray-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-gray-600 text-xs font-mono">
                      #{String(orderId).slice(-8).toUpperCase()}
                    </span>
                    <OrderStatusBadge status={order.status} />
                    {isCustomBuild && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Custom Build</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-gray-500">
                      {order.createdAt || order.date ? formatDate(order.createdAt || order.date) : 'N/A'}
                    </span>
                    <span className="text-gray-500">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-right">
                    <p className="text-gray-400 text-xs mb-0.5">Total</p>
                    <p className="text-primary-600 font-bold">{formatPrice(order.total || order.totalPrice || 0)}</p>
                  </div>
                  <Link
                    to={`/orders/${orderId}`}
                    className="btn-ghost flex items-center gap-1 text-sm px-3 py-2"
                  >
                    Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
