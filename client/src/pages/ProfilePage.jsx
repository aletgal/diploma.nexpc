import React, { useState, useEffect } from 'react'
import { User, Shield, Check, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils/formatters'
import { authApi } from '../api/auth'
import Spinner from '../components/ui/Spinner'

export default function ProfilePage() {
  const { user, updateProfile, loading } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwStatus, setPwStatus] = useState(null)
  const [pwError, setPwError] = useState('')

  // Email verification resend state
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    if (user) setName(user.name || '')
  }, [user])

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPwStatus(null)
    setPwError('')
    if (newPassword !== confirmPassword) {
      setPwStatus('error')
      setPwError('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPwStatus('error')
      setPwError('New password must be at least 8 characters.')
      return
    }
    setPwSaving(true)
    try {
      await updateProfile({ currentPassword, newPassword })
      setPwStatus('success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwStatus(null), 3000)
    } catch (err) {
      setPwStatus('error')
      setPwError(err?.response?.data?.error || err.message || 'Failed to change password.')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleResendVerification() {
    setResending(true)
    setResendMsg('')
    try {
      await authApi.resendVerification()
      setResendMsg('Verification email sent! Check your inbox.')
    } catch (err) {
      setResendMsg(err?.response?.data?.error || 'Failed to send email.')
    } finally {
      setResending(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setStatus('error')
      setErrorMsg('Name cannot be empty.')
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      await updateProfile({ name: name.trim() })
      setStatus('success')
      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  const initials = (user.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: user card */}
        <div className="space-y-6">
          {/* Avatar card */}
          <div className="card p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-primary-50 border-2 border-primary-200 flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold text-2xl">{initials}</span>
            </div>

            <h2 className="text-gray-900 font-bold text-lg">{user.name}</h2>
            <p className="text-gray-400 text-sm mb-3">{user.email}</p>

            <div className="flex items-center justify-center gap-2">
              {user.role === 'ADMIN' ? (
                <span className="badge badge-blue flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              ) : (
                <span className="badge flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Customer
                </span>
              )}
            </div>
          </div>

          {/* Account info */}
          <div className="card p-5">
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">Account Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Member Since</p>
                <p className="text-gray-700">{user.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Account Role</p>
                <p className="text-gray-700 capitalize">{user.role?.toLowerCase() || 'user'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Email Verified</p>
                {user.emailVerified ? (
                  <p className="text-green-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Verified
                  </p>
                ) : (
                  <div>
                    <p className="text-yellow-600 flex items-center gap-1 text-sm mb-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Unverified
                    </p>
                    <button
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="text-primary-600 text-xs hover:underline disabled:opacity-50"
                    >
                      {resending ? 'Sending...' : 'Resend verification email'}
                    </button>
                    {resendMsg && <p className="text-xs mt-1 text-gray-500">{resendMsg}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: edit form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-gray-900 font-bold text-lg mb-6">Edit Profile</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="profileName" className="label">Full Name</label>
                <input
                  id="profileName"
                  type="text"
                  className="input w-full"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setStatus(null) }}
                />
              </div>

              <div>
                <label htmlFor="profileEmail" className="label">Email Address</label>
                <input
                  id="profileEmail"
                  type="email"
                  className="input w-full opacity-60 cursor-not-allowed"
                  value={user.email}
                  disabled
                />
                <p className="text-gray-400 text-xs mt-1">Email cannot be changed.</p>
              </div>

              {status === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <p className="text-green-700 text-sm">Profile updated successfully.</p>
                </div>
              )}

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-red-600 text-sm">{errorMsg}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving && <Spinner size="sm" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn-ghost px-4 py-2.5"
                  onClick={() => { setName(user.name || ''); setStatus(null) }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-4 h-4 text-gray-400" />
              <h2 className="text-gray-900 font-bold text-lg">Change Password</h2>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  className="input w-full"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPwStatus(null) }}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input w-full"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPwStatus(null) }}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input w-full"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPwStatus(null) }}
                  autoComplete="new-password"
                />
              </div>

              {pwStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <p className="text-green-700 text-sm">Password changed successfully.</p>
                </div>
              )}
              {pwStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-red-600 text-sm">{pwError}</p>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-60"
                  disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
                >
                  {pwSaving && <Spinner size="sm" />}
                  {pwSaving ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
