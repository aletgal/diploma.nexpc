const STATUS_CLASS = {
  PENDING: 'badge-yellow',
  CONFIRMED: 'badge-blue',
  PROCESSING: 'badge-blue',
  SHIPPED: 'badge-blue',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-red',
}

const STATUS_LABEL = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export default function OrderStatusBadge({ status }) {
  const cls = STATUS_CLASS[status] ?? 'badge'
  const label = STATUS_LABEL[status] ?? status

  return <span className={`badge ${cls}`}>{label}</span>
}
