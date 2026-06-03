import { Link } from 'react-router-dom'
import { Monitor, Github, Twitter, Youtube } from 'lucide-react'

const footerLinks = [
  { to: '/products', label: 'Products' },
  { to: '/components', label: 'Components' },
  { to: '/build', label: 'Custom Builder' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container-page py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3">
              <Monitor className="w-5 h-5 text-primary-600" />
              <span className="text-base font-bold text-gradient">NEX PC</span>
            </Link>
            <p className="text-sm text-gray-500 max-w-xs">
              Your destination for premium pre-built PCs and custom computer components.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
              Shop
            </h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
              Follow Us
            </h3>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="GitHub"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="divider mt-8 mb-6" />

        <p className="text-center text-xs text-gray-400">
          &copy; 2026 NEX PC. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
