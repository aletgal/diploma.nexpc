import { useState, useEffect, useRef } from 'react'
import { Bell, ShoppingCart, AlertTriangle, CheckCheck } from 'lucide-react'
import { adminApi } from '../../api/admin'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [readAt, setReadAt] = useState(() => {
    try { return localStorage.getItem('adminNotifReadAt') || null } catch { return null }
  })
  const dropdownRef = useRef(null)

  async function fetchNotifications() {
    try {
      const res = await adminApi.getNotifications()
      setNotifications(res.data?.notifications || [])
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function markAllRead() {
    const ts = new Date().toISOString()
    localStorage.setItem('adminNotifReadAt', ts)
    setReadAt(ts)
    setOpen(false)
  }

  const unreadCount = readAt
    ? notifications.filter((n) => new Date(n.createdAt) > new Date(readAt)).length
    : notifications.length

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
            <h3 className="text-sm font-semibold text-dark-100">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300">
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-dark-400 text-sm">No notifications</div>
            ) : (
              notifications.slice(0, 10).map((n) => {
                const isUnread = !readAt || new Date(n.createdAt) > new Date(readAt)
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-dark-800 hover:bg-dark-800/50 transition-colors ${isUnread ? 'bg-primary-900/10' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      n.type === 'order' ? 'bg-primary-600/20 text-primary-400' : 'bg-yellow-600/20 text-yellow-400'
                    }`}>
                      {n.type === 'order'
                        ? <ShoppingCart className="w-3.5 h-3.5" />
                        : <AlertTriangle className="w-3.5 h-3.5" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-dark-200 leading-snug">{n.message}</p>
                      <p className="text-xs text-dark-500 mt-0.5">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {isUnread && <div className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
