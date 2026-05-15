import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="container-page py-20 text-center">
      <div className="max-w-md mx-auto">
        <div className="text-8xl font-black text-primary-600 mb-4" aria-hidden="true">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary px-8 py-3 text-base">Go Home</Link>
      </div>
    </div>
  )
}
