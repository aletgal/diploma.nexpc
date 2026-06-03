import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, ChevronDown, Download } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { ordersApi } from '../../api/orders'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import OrderStatusBadge from '../../components/ui/OrderStatusBadge'
import Pagination from '../../components/ui/Pagination'
import AdminLayout from '../../components/admin/AdminLayout'
import { formatPrice, formatDate } from '../../utils/formatters'

const STATUS_TABS = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed (Building)',
  PROCESSING: 'Processing (Testing)',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const ALL_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

function StatusSelect({ orderId, currentStatus, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  async function handleSelect(newStatus) {
    if (newStatus === currentStatus) { setOpen(false); return }
    setUpdating(true)
    setOpen(false)
    try {
      await onUpdate(orderId, newStatus)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="relative">
      <button
        className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-50"
        onClick={() => setOpen((v) => !v)}
        disabled={updating}
      >
        {updating ? <Spinner size="sm" /> : <><span>Update</span><ChevronDown className="w-3 h-3" /></>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 card min-w-[180px] py-1 shadow-xl">
            {ALL_STATUSES.map((status) => (
              <button
                key={status}
                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-dark-800 ${
                  status === currentStatus ? 'text-primary-400 font-medium' : 'text-dark-300'
                }`}
                onClick={() => handleSelect(status)}
              >
                {STATUS_LABELS[status] || status}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function exportToCSV(orders) {
  const rows = [
    ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Items', 'Total', 'Payment Method', 'Status'],
    ...orders.map((order) => {
      const items = Array.isArray(order.items)
        ? order.items.map((i) => i.name || '').join('; ')
        : order.items?.type === 'CUSTOM_BUILD'
          ? (order.items.components || []).map((c) => c.name || '').join('; ')
          : ''
      return [
        String(order.id).slice(-8).toUpperCase(),
        order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
        order.user?.name || '',
        order.user?.email || '',
        `"${items}"`,
        order.totalPrice ?? 0,
        order.paymentMethod || '',
        order.status || '',
      ]
    }),
  ]
  const csv = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const LIMIT = 20

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'orders', statusFilter, page],
    queryFn: () =>
      adminApi.getOrders({
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        page,
        limit: LIMIT,
      }),
    keepPreviousData: true,
  })

  const ordersData = data?.data ?? {}
  const orders = ordersData.orders ?? ordersData ?? []
  const totalPages = ordersData.pages ?? ordersData.totalPages ?? 1

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => ordersApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries(['admin', 'orders']) },
  })

  async function handleStatusUpdate(orderId, newStatus) {
    try {
      await updateStatusMutation.mutateAsync({ id: orderId, status: newStatus })
    } catch (err) {
      console.error('Failed to update order status:', err)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await adminApi.exportOrders(statusFilter !== 'ALL' ? { status: statusFilter } : {})
      exportToCSV(res.data?.orders || [])
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setExporting(false)
    }
  }

  function handleTabChange(tab) {
    setStatusFilter(tab)
    setPage(1)
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-primary-400" />
          <h1 className="text-2xl font-bold">Orders</h1>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          {exporting ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-dark-800 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              statusFilter === tab
                ? 'text-primary-400 border-primary-400'
                : 'text-dark-400 border-transparent hover:text-dark-100'
            }`}
          >
            {tab === 'ALL' ? 'All' : STATUS_LABELS[tab] || tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden mb-6">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : isError ? (
          <div className="text-center py-16 text-dark-400">Failed to load orders. Please try again.</div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description={statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} orders at the moment.` : 'No orders have been placed yet.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Order Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-gray-500 font-medium text-sm py-4 px-6 bg-gray-50 border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const itemCount = order.items?.length ?? order.orderItems?.length ?? order._count?.items ?? 0
                  return (
                    <tr key={order.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-4 px-6 border-b border-gray-100">
                        <span className="font-mono text-xs text-dark-300">#{String(order.id).slice(-8).toUpperCase()}</span>
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-dark-100">{order.user?.name ?? '—'}</p>
                          <p className="text-xs text-dark-400">{order.user?.email ?? ''}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100 text-dark-300">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100 font-medium">{formatPrice(order.totalPrice ?? 0)}</td>
                      <td className="py-4 px-6 border-b border-gray-100 text-dark-400 text-sm">
                        {order.paymentMethod === 'STRIPE' ? 'Card' : order.paymentMethod === 'KASPI_DEMO' ? 'Kaspi' : '—'}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100"><OrderStatusBadge status={order.status} /></td>
                      <td className="py-4 px-6 border-b border-gray-100 text-dark-400">{order.createdAt ? formatDate(order.createdAt) : '—'}</td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        <StatusSelect orderId={order.id} currentStatus={order.status} onUpdate={handleStatusUpdate} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} pages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </AdminLayout>
  )
}
