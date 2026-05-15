import { NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/components', label: 'Components' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/promo', label: 'Promo Codes' },
]

export default function AdminLayout({ children }) {
  return (
    <div className="container-page py-8">
      <nav
        className="flex items-center gap-1 mb-8 border-b border-dark-800 overflow-x-auto"
        style={{ overflowY: 'hidden' }}
      >
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-primary-400 border-primary-400'
                  : 'text-dark-400 border-transparent hover:text-dark-100'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  )
}
