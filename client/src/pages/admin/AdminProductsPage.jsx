import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package, Plus, Pencil, Trash2, Search, Check, Minus, X, Layers, Edit3, Zap,
} from 'lucide-react'
import { productsApi } from '../../api/products'
import { componentsApi } from '../../api/components'
import { adminApi } from '../../api/admin'
import { aiApi } from '../../api/ai'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ImageUpload from '../../components/ui/ImageUpload'
import AdminLayout from '../../components/admin/AdminLayout'
import { formatPrice, formatCategory } from '../../utils/formatters'

function BulkPriceModal({ open, onClose, selectedProducts, onSuccess }) {
  const queryClient = useQueryClient()
  const [type, setType] = useState('percent')
  const [value, setValue] = useState('')
  const [direction, setDirection] = useState('increase')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data) => adminApi.bulkPriceUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products'])
      onSuccess()
    },
    onError: (err) => setError(err?.response?.data?.error || 'Failed to update'),
  })

  function calcNewPrice(p) {
    const v = parseFloat(value)
    if (!v) return p.price
    if (type === 'fixed') return Math.max(0, Math.round(v))
    const pct = v / 100
    return direction === 'decrease' ? Math.round(p.price * (1 - pct)) : Math.round(p.price * (1 + pct))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!value) { setError('Value is required'); return }
    setError('')
    mutation.mutate({
      ids: selectedProducts.map((p) => p.id),
      priceChange: { type, value: parseFloat(value), direction },
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">Bulk Price Update</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-5">
          <div>
            <label className="label">Update Type</label>
            <div className="flex gap-2">
              {[['fixed', 'Set fixed price'], ['percent', 'Apply % change']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setType(v)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${type === v ? 'border-primary-600 bg-primary-600/10 text-primary-400' : 'border-dark-700 text-dark-400 hover:border-dark-600'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">{type === 'fixed' ? 'Fixed Price (₸)' : 'Percentage (%)'}</label>
              <input className="input" type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} required placeholder={type === 'fixed' ? '50000' : '10'} />
            </div>
            {type === 'percent' && (
              <div>
                <label className="label">Direction</label>
                <div className="flex gap-2">
                  {[['increase', '↑'], ['decrease', '↓']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setDirection(v)}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${direction === v ? 'border-primary-600 bg-primary-600/10 text-primary-400' : 'border-dark-700 text-dark-400'}`}>
                      {l} {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner size="sm" /> : `Update ${selectedProducts.length} products`}
            </button>
          </div>
        </form>

        {value && (
          <div>
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Preview</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm py-1 border-b border-dark-800">
                  <span className="text-dark-300 truncate flex-1 mr-4">{p.name}</span>
                  <span className="text-dark-500 flex-shrink-0">{formatPrice(p.price)}</span>
                  <span className="text-dark-500 mx-2">→</span>
                  <span className="text-primary-400 font-semibold flex-shrink-0">{formatPrice(calcNewPrice(p))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const CATEGORY_OPTIONS = ['READY_PC', 'COMPONENT']

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category: 'READY_PC',
  stock: '',
  featured: false,
  heroFeatured: false,
  performanceScore: 5,
  images: '',
  specs: '',
}

function productToForm(product) {
  return {
    name: product.name ?? '',
    description: product.description ?? '',
    price: product.price ?? '',
    category: product.category ?? 'READY_PC',
    stock: product.stock ?? '',
    featured: product.featured ?? false,
    heroFeatured: product.heroFeatured ?? false,
    performanceScore: product.performanceScore ?? 5,
    images: Array.isArray(product.images) ? product.images.join(', ') : (product.images ?? ''),
    specs: product.specs ? JSON.stringify(product.specs, null, 2) : '',
  }
}

function ProductModal({ open, onClose, editTarget, onSuccess }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [specsError, setSpecsError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setError('')
      setForm(editTarget ? productToForm(editTarget) : EMPTY_FORM)
    }
  }, [open, editTarget])

  const createMutation = useMutation({
    mutationFn: (data) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products'])
      onSuccess()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products'])
      onSuccess()
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : type === 'range' ? parseInt(value) : value }))
  }

  async function handleAiDescription() {
    if (!form.name) return
    setAiLoading(true)
    try {
      let specs
      if (form.specs.trim()) {
        try { specs = JSON.parse(form.specs) } catch {}
      }
      const res = await aiApi.generateDescription({ name: form.name, category: form.category, specs, isComponent: false })
      if (res.data?.description) setForm((prev) => ({ ...prev, description: res.data.description }))
    } catch {}
    setAiLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    let specs = undefined
    if (form.specs.trim()) {
      try {
        specs = JSON.parse(form.specs)
        setSpecsError('')
      } catch {
        setSpecsError('Invalid JSON format')
        setError('Specs must be valid JSON.')
        return
      }
    }
    if (specsError) return

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      category: form.category,
      stock: parseInt(form.stock, 10),
      featured: form.featured,
      heroFeatured: form.heroFeatured,
      performanceScore: form.performanceScore,
      images: form.images.split(',').map((s) => s.trim()).filter(Boolean),
      ...(specs !== undefined && { specs }),
    }

    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Something went wrong.')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {editTarget ? 'Edit Product' : 'Add Product'}
          </h2>
          <button className="btn-ghost p-2" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Product name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Description</label>
              <button
                type="button"
                onClick={handleAiDescription}
                disabled={aiLoading || !form.name}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {aiLoading ? <Spinner size="sm" /> : <Zap className="w-3 h-3" />}
                {aiLoading ? 'Generating…' : 'Generate with AI'}
              </button>
            </div>
            <textarea
              className="input min-h-[80px] resize-y"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Product description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price ($)</label>
              <input
                className="input"
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Stock</label>
              <input
                className="input"
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                required
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="input"
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="featured"
                name="featured"
                checked={form.featured}
                onChange={handleChange}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <label htmlFor="featured" className="text-sm cursor-pointer">
                Featured product <span className="text-gray-400">(shown in homepage Featured Builds)</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="heroFeatured"
                name="heroFeatured"
                checked={form.heroFeatured}
                onChange={handleChange}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <label htmlFor="heroFeatured" className="text-sm cursor-pointer">
                Hero featured <span className="text-gray-400">(shown in homepage rotating hero cards, max 3)</span>
              </label>
            </div>
            {form.heroFeatured && (
              <div className="mt-1 pl-7">
                <label className="text-sm text-dark-300 mb-2 block">
                  Performance Score: <span className="font-semibold text-dark-100">{form.performanceScore}</span>
                  <span className="text-dark-500 ml-1">/8</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    name="performanceScore"
                    min="1"
                    max="8"
                    value={form.performanceScore}
                    onChange={handleChange}
                    className="flex-1 accent-primary-500"
                  />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-sm ${i < form.performanceScore ? 'bg-primary-500' : 'bg-dark-700'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Images (comma-separated URLs)</label>
            <input
              className="input mb-2"
              name="images"
              value={form.images}
              onChange={handleChange}
              placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
            />
            <ImageUpload
              onUpload={(url) => setForm((prev) => ({
                ...prev,
                images: prev.images ? `${prev.images}, ${url}` : url,
              }))}
            />
          </div>

          <div>
            <label className="label">Specs (JSON)</label>
            <textarea
              className={`input font-mono text-xs min-h-[100px] resize-y ${specsError ? 'border-red-400' : ''}`}
              name="specs"
              value={form.specs}
              onChange={(e) => {
                handleChange(e)
                setSpecsError('')
              }}
              onBlur={() => {
                if (form.specs.trim()) {
                  try { JSON.parse(form.specs) } catch { setSpecsError('Invalid JSON format') }
                }
              }}
              placeholder={'{\n  "CPU": "Intel i9-14900K",\n  "RAM": "32GB DDR5"\n}'}
            />
            {specsError && <p className="text-red-500 text-xs mt-1">{specsError}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : editTarget ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ManageComponentsModal({ open, onClose, product }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: allData } = useQuery({
    queryKey: ['components', 'admin-all'],
    queryFn: () => componentsApi.getAll({ limit: 1000 }),
    enabled: open,
  })

  const { data: linkedData, refetch: refetchLinked } = useQuery({
    queryKey: ['product-components', product?.id],
    queryFn: () => productsApi.getComponents(product.id).then((r) => r.data),
    enabled: open && !!product?.id,
  })

  const allComponents = allData?.data?.components ?? []
  const linkedComponents = linkedData?.components ?? []
  const linkedIds = new Set(linkedComponents.map((c) => c.id))

  const filtered = allComponents.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  async function toggleLink(componentId) {
    try {
      if (linkedIds.has(componentId)) {
        await productsApi.unlinkComponent(product.id, componentId)
      } else {
        await productsApi.linkComponent(product.id, componentId)
      }
      refetchLinked()
      queryClient.invalidateQueries(['product-components', product.id])
    } catch (err) {
      console.error('Toggle link error', err)
    }
  }

  if (!open || !product) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Components</h2>
            <p className="text-sm text-gray-500 mt-0.5">{product.name}</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: all components */}
          <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">All Components</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  className="input pl-8 text-sm"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((comp) => {
                const isLinked = linkedIds.has(comp.id)
                return (
                  <div
                    key={comp.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${isLinked ? 'bg-primary-50' : ''}`}
                    onClick={() => toggleLink(comp.id)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isLinked ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                      {isLinked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{comp.name}</p>
                      <p className="text-xs text-gray-400">{comp.category} · {formatPrice(comp.price)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: linked components */}
          <div className="w-72 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Linked ({linkedComponents.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {linkedComponents.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">No components linked yet</div>
              ) : (
                linkedComponents.map((comp) => (
                  <div key={comp.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{comp.name}</p>
                      <p className="text-xs text-gray-400">{comp.category}</p>
                    </div>
                    <button
                      className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
                      onClick={() => toggleLink(comp.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button className="btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [componentsModalProduct, setComponentsModalProduct] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', 'admin-all'],
    queryFn: () => productsApi.getAll({ limit: 1000 }),
  })

  const products = data?.data?.products ?? data?.data ?? []

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products'])
      setDeleteTarget(null)
    },
  })

  async function handleDelete() {
    setDeleteError('')
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
    } catch (err) {
      setDeleteError(err?.response?.data?.message ?? 'Delete failed.')
    }
  }

  function openCreate() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(product) {
    setEditTarget(product)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-8">
        <Package className="w-7 h-7 text-primary-400" />
        <h1 className="text-2xl font-bold">Products</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            className="input pl-9"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()) }}
          >
            <Edit3 className="w-4 h-4" />
            {bulkMode ? 'Cancel Bulk Edit' : 'Bulk Edit'}
          </button>
          {bulkMode && selectedIds.size > 0 && (
            <button className="btn-primary" onClick={() => setBulkModalOpen(true)}>
              Update {selectedIds.size} Selected
            </button>
          )}
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-dark-400">
            Failed to load products. Please try again.
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={search ? 'Try a different search term.' : 'Add your first product.'}
            action={!search ? { label: 'Add Product', onClick: openCreate } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {bulkMode && <th className="py-4 px-4 bg-gray-50 border-b border-gray-200 w-10">
                    <input type="checkbox" className="w-4 h-4 accent-primary-600"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={(e) => setSelectedIds(e.target.checked ? new Set(filtered.map((p) => p.id)) : new Set())}
                    />
                  </th>}
                  {['Image', 'Name', 'Category', 'Price', 'Stock', 'Featured', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-gray-500 font-medium text-sm py-4 px-6 bg-gray-50 border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const thumb = Array.isArray(product.images)
                    ? product.images[0]
                    : product.images

                  return (
                    <tr key={product.id} className="hover:bg-dark-800/40 transition-colors">
                      {bulkMode && (
                        <td className="py-4 px-4 border-b border-gray-100">
                          <input type="checkbox" className="w-4 h-4 accent-primary-600"
                            checked={selectedIds.has(product.id)}
                            onChange={(e) => {
                              const s = new Set(selectedIds)
                              e.target.checked ? s.add(product.id) : s.delete(product.id)
                              setSelectedIds(s)
                            }}
                          />
                        </td>
                      )}
                      <td className="py-4 px-6 border-b border-gray-100">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg bg-dark-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                            <Package className="w-4 h-4 text-dark-500" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100 font-medium text-dark-100 max-w-[200px] truncate">
                        {product.name}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        <span className="badge badge-blue">{formatCategory(product.category)}</span>
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100 font-medium">
                        {formatPrice(product.price ?? 0)}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        <span className={product.stock === 0 ? 'text-red-400' : 'text-dark-300'}>
                          {product.stock ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        {product.featured ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-dark-600" />
                        )}
                      </td>
                      <td className="py-4 px-6 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-ghost p-2 text-gray-500 hover:text-gray-700"
                            onClick={() => setComponentsModalProduct(product)}
                            title="Manage Components"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-ghost p-2 text-primary-400 hover:text-primary-300"
                            onClick={() => openEdit(product)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-ghost p-2 text-red-400 hover:text-red-300"
                            onClick={() => setDeleteTarget(product)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductModal
        open={modalOpen}
        onClose={closeModal}
        editTarget={editTarget}
        onSuccess={closeModal}
      />

      <ManageComponentsModal
        open={!!componentsModalProduct}
        onClose={() => setComponentsModalProduct(null)}
        product={componentsModalProduct}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError('')
        }}
      />

      {deleteError && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-lg bg-red-900/80 border border-red-700 text-red-200 text-sm z-50">
          {deleteError}
        </div>
      )}

      <BulkPriceModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedProducts={filtered.filter((p) => selectedIds.has(p.id))}
        onSuccess={() => { setBulkModalOpen(false); setBulkMode(false); setSelectedIds(new Set()) }}
      />
    </AdminLayout>
  )
}
