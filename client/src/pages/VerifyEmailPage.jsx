import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, AlertCircle, Mail } from 'lucide-react'
import { authApi } from '../api/auth'
import Spinner from '../components/ui/Spinner'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('sent')
      setMessage('Verification email sent! Check your inbox.')
      return
    }

    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Your email has been verified successfully!')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.response?.data?.error || 'Invalid or expired verification link.')
      })
  }, [token])

  return (
    <div className="container-page py-20">
      <div className="card p-10 max-w-md mx-auto text-center">
        {status === 'sent' && (
          <>
            <Mail className="w-16 h-16 text-primary-500 mx-auto mb-4" />
            <h2 className="text-gray-900 text-xl font-bold mb-2">Check Your Inbox</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <Link to="/cart" className="text-primary-600 hover:text-primary-700 text-sm font-medium">← Back to Cart</Link>
          </>
        )}
        {status === 'loading' && (
          <>
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-500">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-gray-900 text-xl font-bold mb-2">Email Verified!</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <Link to="/login" className="btn-primary px-6 py-2.5">Continue to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-gray-900 text-xl font-bold mb-2">Verification Failed</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <Link to="/profile" className="btn-primary px-6 py-2.5">Go to Profile</Link>
          </>
        )}
      </div>
    </div>
  )
}
