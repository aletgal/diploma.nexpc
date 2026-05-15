import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, MapPin, Package, ShoppingBag, Cpu, Monitor, HardDrive,
  CircuitBoard, Zap, Box, Wind, MemoryStick, XCircle, CreditCard, Smartphone,
  CheckCircle2, Wrench, FlaskConical, Truck, PackageCheck, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { ordersApi } from '../api/orders'
import { formatPrice, formatDate } from '../utils/formatters'
import OrderStatusBadge from '../components/ui/OrderStatusBadge'
import Spinner from '../components/ui/Spinner'
import { useCart } from '../context/CartContext'

const SLOT_ICONS = {
  CPU: Cpu, GPU: Monitor, RAM: MemoryStick, STORAGE: HardDrive,
  MOTHERBOARD: CircuitBoard, PSU: Zap, CASE: Box, COOLING: Wind, FAN: Wind,
}

const STEPS = [
  { key: 'PAID',      label: 'Paid',      icon: CheckCircle2,  estimate: null },
  { key: 'BUILDING',  label: 'Building',  icon: Wrench,        estimate: '~1 day' },
  { key: 'TESTING',   label: 'Testing',   icon: FlaskConical,  estimate: '~1 day' },
  { key: 'SHIPPED',   label: 'Shipped',   icon: Truck,         estimate: '2-3 days' },
  { key: 'DELIVERED', label: 'Delivered', icon: PackageCheck,  estimate: null },
]

const STATUS_TO_STEP = {
  PENDING:   0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED:   3,
  DELIVERED: 4,
}

function OrderProgressBar({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 font-semibold">This order was cancelled</p>
        </div>
      </div>
    )
  }

  const currentStep = STATUS_TO_STEP[status] ?? 0

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-gray-900 font-semibold mb-6">Order Progress</h2>

      {/* Desktop horizontal stepper */}
      <div className="hidden sm:flex items-start justify-between relative">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative">
              {/* Connecting line (before) */}
              {i > 0 && (
                <div
                  className="absolute left-0 right-1/2 top-5 h-0.5 -translate-y-1/2 z-0"
                  style={{ background: done || active ? '#2563eb' : '#e5e7eb' }}
                />
              )}
              {/* Connecting line (after) */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute left-1/2 right-0 top-5 h-0.5 -translate-y-1/2 z-0"
                  style={{ background: done ? '#2563eb' : '#e5e7eb' }}
                />
              )}
              {/* Circle */}
              <div className="relative z-10 mb-2">
                {active && (
                  <div className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping" style={{ width: 40, height: 40, margin: -2 }} />
                )}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border-2 relative z-10"
                  style={{
                    background: done || active ? '#2563eb' : '#fff',
                    borderColor: done || active ? '#2563eb' : '#d1d5db',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: done || active ? '#fff' : '#9ca3af' }} />
                </div>
              </div>
              {/* Label */}
              <p className={`text-xs font-semibold text-center ${active ? 'text-blue-600' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                {step.label}
              </p>
              {step.estimate && (
                <p className="text-xs text-gray-400 text-center mt-0.5">{step.estimate}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile vertical stepper */}
      <div className="flex flex-col gap-3 sm:hidden">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div key={step.key} className="flex items-center gap-3">
              {/* Line + circle column */}
              <div className="flex flex-col items-center w-9 flex-shrink-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border-2"
                  style={{
                    background: done || active ? '#2563eb' : '#fff',
                    borderColor: done || active ? '#2563eb' : '#d1d5db',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: done || active ? '#fff' : '#9ca3af' }} />
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-0.5 h-6 mt-1" style={{ background: done ? '#2563eb' : '#e5e7eb' }} />
                )}
              </div>
              {/* Label */}
              <div>
                <p className={`text-sm font-semibold ${active ? 'text-blue-600' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {step.estimate && <p className="text-xs text-gray-400">{step.estimate}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { fetchCart } = useCart()
  const [expandedSpecs, setExpandedSpecs] = useState({})
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [reorderLoading, setReorderLoading] = useState(false)
  const [reorderMsg, setReorderMsg] = useState('')

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOne(id).then((r) => r.data?.order ?? r.data),
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCancelConfirm(false)
    },
    onError: (err) => {
      setCancelError(err?.response?.data?.error || 'Failed to cancel order.')
    },
  })

  async function handleReorder() {
    setReorderLoading(true)
    setReorderMsg('')
    try {
      const res = await ordersApi.reorder(id)
      const { added, skipped } = res.data
      await fetchCart()
      if (skipped.length > 0) {
        setReorderMsg(`Some items were out of stock and skipped: ${skipped.join(', ')}`)
      }
      if (added.length > 0) {
        setTimeout(() => navigate('/cart'), 1000)
        setReorderMsg('Items added to cart!')
      }
    } catch (err) {
      setReorderMsg(err?.response?.data?.error || 'Failed to reorder.')
    } finally {
      setReorderLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container-page py-20 text-center">
        <div className="card p-10 max-w-md mx-auto">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-gray-900 text-xl font-bold mb-2">Order Not Found</h2>
          <p className="text-gray-500 mb-6">This order doesn't exist or you don't have access to it.</p>
          <Link to="/orders" className="btn-primary">Back to Orders</Link>
        </div>
      </div>
    )
  }

  const orderId = order._id || order.id
  const rawItems = order.items || order.orderItems || []
  const isCustomBuild = rawItems?.type === 'CUSTOM_BUILD'
  const buildName = isCustomBuild ? rawItems.buildName : null
  const items = isCustomBuild ? (rawItems.components || []) : (Array.isArray(rawItems) ? rawItems : [])
  const address = order.address || order.shippingAddress || {}
  const total = order.total || order.totalPrice || 0

  return (
    <div className="container-page py-8">
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Orders
        </Link>
        {order.status === 'DELIVERED' && !isCustomBuild && (
          <button
            onClick={handleReorder}
            disabled={reorderLoading}
            className="inline-flex items-center gap-2 text-sm font-medium border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-60"
          >
            {reorderLoading ? <Spinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Reorder
          </button>
        )}
      </div>

      {reorderMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${reorderMsg.includes('added') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
          {reorderMsg}
        </div>
      )}

      {/* Order header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-gray-900 font-bold text-lg">
                Order #{String(orderId).slice(-8).toUpperCase()}
              </h1>
              <OrderStatusBadge status={order.status} />
              {isCustomBuild && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Custom Build</span>
              )}
            </div>
            {buildName && <p className="text-gray-600 text-sm font-medium">{buildName}</p>}
            <p className="text-gray-500 text-sm">
              Placed {order.createdAt ? formatDate(order.createdAt) : 'N/A'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-gray-400 text-xs mb-1">Order Total</p>
              <p className="text-primary-600 font-bold text-xl">{formatPrice(total)}</p>
            </div>
            {order.status === 'PENDING' && (
              <div>
                {showCancelConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Cancel this order?</span>
                    <button
                      onClick={() => { setCancelError(''); cancelMutation.mutate() }}
                      disabled={cancelMutation.isPending}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                    <button
                      onClick={() => { setShowCancelConfirm(false); setCancelError('') }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel Order
                  </button>
                )}
                {cancelError && <p className="text-red-500 text-xs mt-1">{cancelError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <OrderProgressBar status={order.status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              <h2 className="text-gray-900 font-semibold">
                {isCustomBuild ? 'Components' : 'Items'} ({items.length})
              </h2>
            </div>

            <div className="space-y-4">
              {items.map((item, i) => {
                const isComp = isCustomBuild
                const name = item.name || (item.product?.name) || ''
                const qty = item.quantity || item.qty || 1
                const price = item.price || item.product?.price || 0
                const image = item.imageUrl || item.images?.[0] || item.image || item.product?.images?.[0]
                const Icon = isComp ? (SLOT_ICONS[item.slot] || Package) : null
                const specs = !isComp ? (item.specs || item.product?.specs || null) : null
                const specsEntries = specs && typeof specs === 'object' ? Object.entries(specs).filter(([,v]) => v) : []

                return (
                  <div key={i} className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {image ? (
                        <img src={image} alt={name} className="w-full h-full object-contain p-1.5" />
                      ) : Icon ? (
                        <Icon className="w-7 h-7 text-gray-400" />
                      ) : (
                        <Package className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isComp && item.slot && (
                        <p className="text-gray-400 text-xs mb-0.5 font-medium">{item.slot}</p>
                      )}
                      <p className="text-gray-900 text-sm font-medium leading-tight mb-1">{name}</p>
                      <p className="text-gray-500 text-xs">Qty: {qty}</p>
                      <p className="text-gray-500 text-xs">{formatPrice(price)} each</p>
                      {specsEntries.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedSpecs((p) => ({ ...p, [i]: !p[i] }))}
                            className="text-primary-500 text-xs mt-0.5 hover:underline"
                          >
                            {expandedSpecs[i] ? 'Hide specs' : 'View specs'}
                          </button>
                          {expandedSpecs[i] && (
                            <div className="mt-1 space-y-0.5">
                              {specsEntries.map(([k, v]) => (
                                <p key={k} className="text-gray-400 text-xs leading-tight">
                                  <span className="text-gray-500 font-medium">{k}:</span> {v}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-gray-900 font-semibold text-sm">{formatPrice(price * qty)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shipping address */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-gray-400" />
              <h2 className="text-gray-900 font-semibold">Shipping Address</h2>
            </div>
            <div className="text-gray-600 text-sm space-y-1">
              {address.fullName && <p className="font-medium text-gray-800">{address.fullName}</p>}
              {address.street && <p>{address.street}</p>}
              {(address.city || address.zip) && (
                <p>{[address.city, address.zip].filter(Boolean).join(', ')}</p>
              )}
              {address.country && <p>{address.country}</p>}
              {address.email && <p className="text-gray-400 text-xs mt-2">{address.email}</p>}
            </div>
          </div>

          {/* Payment info */}
          {order.paymentMethod && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <h2 className="text-gray-900 font-semibold">Payment</h2>
              </div>
              <div className="flex items-center gap-3">
                {order.paymentMethod === 'STRIPE' ? (
                  <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <Smartphone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-gray-800 text-sm font-medium">
                    {order.paymentMethod === 'STRIPE' ? 'Paid by Card' : 'Paid via Kaspi'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {order.paymentMethod === 'STRIPE' ? 'Secured by Stripe' : 'Mobile payment'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order totals */}
          <div className="card p-5">
            <h2 className="text-gray-900 font-semibold mb-4">Order Total</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-primary-600 text-base">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
