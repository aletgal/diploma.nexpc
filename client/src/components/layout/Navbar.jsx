import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Monitor,
  ShoppingCart,
  Heart,
  Menu,
  X,
  ChevronDown,
  User,
  Package,
  LayoutDashboard,
  LogOut,
  Cpu,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../hooks/useWishlist'

const navLinks = [
  { to: '/products', label: 'Products' },
  { to: '/components', label: 'Components' },
  { to: '/build', label: 'Build' },
]

function NavBadge({ count }) {
  if (!count) return null
  return (
    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ActiveLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors px-1 py-0.5 ${
          isActive
            ? 'text-primary-600 border-b-2 border-primary-600'
            : 'text-gray-600 hover:text-gray-900'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { itemCount } = useCart()
  const { items: wishlistItems } = useWishlist()
  const navigate = useNavigate()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    navigate('/')
  }

  const wishlistCount = wishlistItems.length

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container-page">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Monitor className="w-6 h-6 text-primary-600" />
            <span className="text-lg font-bold text-gradient">NEX PC</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <ActiveLink key={link.to} to={link.to}>
                {link.label}
              </ActiveLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/wishlist"
                  className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors"
                  aria-label="Wishlist"
                >
                  <Heart className="w-5 h-5" />
                  <NavBadge count={wishlistCount} />
                </Link>

                <Link
                  to="/cart"
                  className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors"
                  aria-label="Cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <NavBadge count={itemCount} />
                </Link>

                {/* User dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 pl-2 py-1 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold">
                      {user?.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="hidden sm:inline max-w-[120px] truncate">
                      {user?.name}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 card py-1 shadow-xl">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <Package className="w-4 h-4" />
                        Orders
                      </Link>
                      <Link
                        to="/profile/builds"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <Cpu className="w-4 h-4" />
                        My Builds
                      </Link>
                      {isAdmin && (
                        <>
                          <div className="divider my-1" />
                          <Link
                            to="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Admin Dashboard
                          </Link>
                        </>
                      )}
                      <div className="divider my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm px-4 py-2">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">
                  Register
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            {!isAuthenticated && (
              <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn-secondary text-sm text-center"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary text-sm text-center"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
