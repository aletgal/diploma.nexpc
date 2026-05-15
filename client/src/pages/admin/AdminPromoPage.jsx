import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Plus, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { adminApi } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import AdminLayout from '../../components/admin/AdminLayout'

const EMPTY_FORM = { code: '', discount: '', maxUses: '100', expiresAt: '' }

function CreatePromoModal({ open, onClose, onSuccess }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data) => adminApi.createPromoCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-promo'])
      onSuccess()
    },
    onError: (err) => setError(err?.response?.data?.error || 'Failed to create'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    mutation.mutate({
      code: form.code.toUpperCase(),
      discount: parseFloat(form.discount),
      maxUses: parseInt(form.maxUses) || 100,
      expiresAt: form.expiresAt || undefined,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">Create Promo Code</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Code</label>
            <input className="input uppercase" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} required placeholder="SUMMER25" />
          </div>
          <div>
            <label className="label">Discount %</label>
            <input className="input" type="number" min="1" max="100" value={form.discount} onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))} required placeholder="10" />
          </div>
          <div>
            <label className="label">Max Uses</label>
            <input className="input" type="number" min="1" value={form.maxUses} onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))} />
          </div>
          <div>
            <label className="label">Expires At (optional)</label>
            <input className="input" type="date" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner size="sm" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminPromoPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-promo'],
    queryFn: () => adminApi.getPromoCodes().then((r) => r.data),
  })

  const codes = data?.codes || []

  const toggleMutation = useMutation({
    mutationFn: (id) => adminApi.togglePromoCode(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-promo']),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deletePromoCode(id),
    onSuccess: () => { queryClient.invalidateQueries(['admin-promo']); setDeleteTarget(null) },
  })

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Tag className="w-7 h-7 text-primary-400" />
          <h1 className="text-2xl font-bold">Promo Codes</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Promo Code
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16 text-dark-400">No promo codes yet. Create your first one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Code', 'Discount', 'Uses', 'Expires', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-gray-500 font-medium py-4 px-6 bg-gray-50 border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="hover:bg-dark-800/40 transition-colors">
                    <td className="py-4 px-6 border-b border-gray-100">
                      <span className="font-mono font-semibold text-primary-400">{code.code}</span>
                    </td>
                    <td className="py-4 px-6 border-b border-gray-100 text-dark-200">{code.discount}%</td>
                    <td className="py-4 px-6 border-b border-gray-100 text-dark-300">
                      {code.usedCount} / {code.maxUses}
                    </td>
                    <td className="py-4 px-6 border-b border-gray-100 text-dark-400">
                      {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 px-6 border-b border-gray-100">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        code.isActive ? 'bg-green-900/30 text-green-400' : 'bg-gray-700/40 text-gray-500'
                      }`}>
                        {code.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleMutation.mutate(code.id)}
                          disabled={toggleMutation.isPending}
                          className="p-1.5 text-dark-400 hover:text-primary-400 transition-colors"
                          title={code.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {code.isActive
                            ? <ToggleRight className="w-5 h-5 text-green-400" />
                            : <ToggleLeft className="w-5 h-5" />
                          }
                        </button>
                        <button
                          onClick={() => setDeleteTarget(code)}
                          className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreatePromoModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => setShowCreate(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Promo Code"
        message={deleteTarget ? `Delete code "${deleteTarget.code}"? This cannot be undone.` : ''}
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  )
}
