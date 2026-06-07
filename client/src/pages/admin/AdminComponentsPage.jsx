import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cpu, Plus, Pencil, Trash2, Search, X, ChevronRight, Zap } from 'lucide-react'
import { componentsApi } from '../../api/components'
import { aiApi } from '../../api/ai'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ImageUpload from '../../components/ui/ImageUpload'
import AdminLayout from '../../components/admin/AdminLayout'
import { formatPrice, formatCategory } from '../../utils/formatters'

const CATEGORY_OPTIONS = ['CPU', 'GPU', 'RAM', 'STORAGE', 'MOTHERBOARD', 'PSU', 'CASE', 'COOLING', 'FAN']

const CATEGORY_BADGE_STYLES = {
  CPU:         { bg: '#dbeafe', text: '#1d4ed8' },
  GPU:         { bg: '#f3e8ff', text: '#7e22ce' },
  RAM:         { bg: '#dcfce7', text: '#15803d' },
  STORAGE:     { bg: '#ffedd5', text: '#c2410c' },
  MOTHERBOARD: { bg: '#fee2e2', text: '#b91c1c' },
  PSU:         { bg: '#fef9c3', text: '#a16207' },
  CASE:        { bg: '#f1f5f9', text: '#475569' },
  COOLING:     { bg: '#cffafe', text: '#0e7490' },
  FAN:         { bg: '#e0f2fe', text: '#0369a1' },
}

function CategoryBadge({ category }) {
  const s = CATEGORY_BADGE_STYLES[category]
  if (!s) return <span className="badge">{formatCategory(category)}</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: s.bg, color: s.text,
      borderRadius: 9999, fontSize: 11, fontWeight: 600, padding: '3px 10px',
    }}>
      {formatCategory(category)}
    </span>
  )
}

// Category-specific specData fields config
const SPEC_FIELDS = {
  GPU: [
    { key: 'coreClock', label: 'Core Clock', type: 'text', placeholder: 'e.g. 2520 MHz' },
    { key: 'memoryClock', label: 'Memory Clock', type: 'text', placeholder: 'e.g. 21 Gbps' },
    { key: 'memoryType', label: 'Memory Type', type: 'text', placeholder: 'e.g. GDDR6X' },
    { key: 'memorySize', label: 'Memory Size', type: 'text', placeholder: 'e.g. 24GB' },
    { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g. 336 x 140 x 61mm' },
  ],
  CPU: [
    { key: 'socket', label: 'Socket', type: 'text', placeholder: 'e.g. LGA1700' },
    { key: 'baseClock', label: 'Base Clock', type: 'text', placeholder: 'e.g. 3.2 GHz' },
    { key: 'boostClock', label: 'Boost Clock', type: 'text', placeholder: 'e.g. 5.8 GHz' },
    { key: 'cores', label: 'Cores', type: 'number', placeholder: 'e.g. 24' },
    { key: 'l3Cache', label: 'L3 Cache', type: 'text', placeholder: 'e.g. 36MB' },
    { key: 'tdp', label: 'TDP', type: 'text', placeholder: 'e.g. 125W' },
    { key: 'integratedGraphics', label: 'Integrated Graphics', type: 'checkbox' },
  ],
  MOTHERBOARD: [
    { key: 'chipset', label: 'Chipset', type: 'text', placeholder: 'e.g. Z790' },
    { key: 'socket', label: 'Socket', type: 'text', placeholder: 'e.g. LGA1700' },
    { key: 'formFactor', label: 'Form Factor', type: 'select', options: ['ATX', 'mATX', 'Mini-ITX'] },
    { key: 'ramSlots', label: 'RAM Slots', type: 'kitSize', options: [2, 4, 8], default: 4 },
    { key: 'supportedRamType', label: 'Supported RAM Type', type: 'select', options: ['DDR4', 'DDR5'] },
    { key: 'maxRamSpeed', label: 'Max RAM Speed (MHz)', type: 'text', placeholder: 'e.g. 6000' },
    { key: 'm2Slots', label: 'M.2 Slots', type: 'number', placeholder: 'e.g. 2', default: 2 },
    { key: 'sataSlots', label: 'SATA Slots', type: 'number', placeholder: 'e.g. 4', default: 4 },
  ],
  RAM: [
    { key: 'memoryClock', label: 'Memory Clock', type: 'text', placeholder: 'e.g. 6000' },
    { key: 'memoryType', label: 'Memory Type', type: 'select', options: ['DDR4', 'DDR5'] },
    { key: 'memorySize', label: 'Memory Size', type: 'text', placeholder: 'e.g. 32' },
    { key: 'timings', label: 'Timings', type: 'text', placeholder: 'e.g. 30-36-36-96' },
    { key: 'sticksInKit', label: 'Sticks in Kit', type: 'kitSize', options: [1, 2, 4], default: 2 },
  ],
  CASE: [
    { key: 'formFactor', label: 'Form Factor', type: 'select', options: ['ATX', 'mATX', 'Mini-ITX', 'Full Tower'] },
    { key: 'gpuLength', label: 'Max GPU Length', type: 'text', placeholder: 'e.g. 420mm' },
  ],
  PSU: [
    { key: 'modularity', label: 'Modularity', type: 'select', options: ['Full Modular', 'Semi Modular', 'Non-Modular'] },
    { key: 'power', label: 'Power', type: 'text', placeholder: 'e.g. 750' },
    { key: 'certificate', label: 'Efficiency Rating', type: 'select', options: ['80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium'] },
  ],
  COOLING: [
    { key: 'socket', label: 'Compatible Sockets', type: 'text', placeholder: 'e.g. AM5, LGA1700' },
    { key: 'tdp', label: 'TDP Support', type: 'text', placeholder: 'e.g. 280' },
    { key: 'waterCooling', label: 'Water Cooling (AIO)', type: 'checkbox' },
  ],
  FAN: [
    { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g. 120' },
    { key: 'noise', label: 'Noise Level', type: 'text', placeholder: 'e.g. 25dB' },
    { key: 'rgb', label: 'RGB', type: 'checkbox' },
  ],
  STORAGE: [
    { key: 'memoryType', label: 'Type', type: 'select', options: ['NVMe', 'SATA SSD', 'HDD'] },
    { key: 'memorySize', label: 'Capacity', type: 'text', placeholder: 'e.g. 1000' },
    { key: 'readSpeed', label: 'Read Speed', type: 'text', placeholder: 'e.g. 7300' },
    { key: 'writeSpeed', label: 'Write Speed', type: 'text', placeholder: 'e.g. 6900' },
  ],
}

const EMPTY_COMMON = {
  name: '', manufacturer: '', model: '', color: '', price: '', stock: '', imageUrl: '', images: '', description: '',
}

function buildCommonFromComponent(c) {
  return {
    name: c.name ?? '',
    manufacturer: c.manufacturer ?? c.brand ?? '',
    model: c.model ?? '',
    color: c.color ?? '',
    price: c.price ?? '',
    stock: c.stock ?? '',
    imageUrl: c.imageUrl ?? '',
    images: Array.isArray(c.images) ? c.images.join(', ') : (c.images ?? ''),
    description: c.description ?? '',
  }
}

function buildSpecDataFromComponent(c) {
  if (c.specData && typeof c.specData === 'object') return { ...c.specData }
  if (c.specs && typeof c.specs === 'object') return { ...c.specs }
  return {}
}

function SpecField({ field, value, onChange }) {
  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id={field.key}
          checked={!!value}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="w-4 h-4 rounded accent-primary-600"
        />
        <label htmlFor={field.key} className="text-sm text-gray-700 cursor-pointer">{field.label}</label>
      </div>
    )
  }
  if (field.type === 'kitSize') {
    const current = value ?? field.default
    return (
      <div>
        <label className="label">{field.label}</label>
        <div className="flex gap-2">
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(field.key, opt)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                current === opt
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (field.type === 'select') {
    return (
      <div>
        <label className="label">{field.label}</label>
        <select
          className="input"
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="">Select...</option>
          {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }
  return (
    <div>
      <label className="label">{field.label}</label>
      <input
        className="input"
        type={field.type}
        value={value ?? ''}
        placeholder={field.placeholder}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    </div>
  )
}

function ComponentModal({ open, onClose, editTarget, onSuccess }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('CPU')
  const [common, setCommon] = useState(EMPTY_COMMON)
  const [specData, setSpecData] = useState({})
  const [error, setError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setError('')
      if (editTarget) {
        setStep(2)
        setCategory(editTarget.category ?? 'CPU')
        setCommon(buildCommonFromComponent(editTarget))
        setSpecData(buildSpecDataFromComponent(editTarget))
      } else {
        setStep(1)
        setCategory('CPU')
        setCommon(EMPTY_COMMON)
        setSpecData({})
      }
    }
  }, [open, editTarget])

  const createMutation = useMutation({
    mutationFn: (data) => componentsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['components']); onSuccess() },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => componentsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['components']); onSuccess() },
  })
  const isLoading = createMutation.isPending || updateMutation.isPending

  function handleCommonChange(e) {
    const { name, value } = e.target
    setCommon((prev) => ({ ...prev, [name]: value }))
  }

  function handleSpecChange(key, value) {
    setSpecData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleAiDescription() {
    if (!common.name) return
    setAiLoading(true)
    try {
      const res = await aiApi.generateDescription({ name: common.name, category, specData, isComponent: true })
      if (res.data?.description) setCommon((prev) => ({ ...prev, description: res.data.description }))
    } catch {}
    setAiLoading(false)
  }

  function handleCategorySelect(cat) {
    setCategory(cat)
    const defaults = {}
    for (const field of SPEC_FIELDS[cat] ?? []) {
      if (field.default !== undefined) defaults[field.key] = field.default
    }
    setSpecData(defaults)
    setStep(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const payload = {
      name: common.name.trim(),
      manufacturer: common.manufacturer.trim() || undefined,
      brand: common.manufacturer.trim() || undefined,
      model: common.model.trim() || undefined,
      color: common.color.trim() || undefined,
      imageUrl: common.imageUrl.trim() || undefined,
      category,
      price: parseFloat(common.price),
      stock: parseInt(common.stock, 10) || 0,
      images: common.images.split(',').map((s) => s.trim()).filter(Boolean),
      specData: Object.keys(specData).length > 0 ? specData : undefined,
      description: common.description.trim() || undefined,
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

  const specFields = SPEC_FIELDS[category] ?? []
  const checkboxFields = specFields.filter((f) => f.type === 'checkbox')
  const otherFields = specFields.filter((f) => f.type !== 'checkbox')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editTarget ? 'Edit Component' : 'Add Component'}
            </h2>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium ${step === 1 ? 'text-primary-600' : 'text-gray-400'}`}>
                1. Category
              </span>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className={`text-xs font-medium ${step === 2 ? 'text-primary-600' : 'text-gray-400'}`}>
                2. Details
              </span>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Category */}
        {step === 1 && (
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-5">Select the component category to continue</p>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    category === cat
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  {formatCategory(cat)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Selected category + back */}
            <div className="flex items-center gap-2">
              <CategoryBadge category={category} />
              {!editTarget && (
                <button type="button" onClick={() => setStep(1)} className="text-xs text-primary-600 hover:underline">
                  Change
                </button>
              )}
            </div>

            {/* Common fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Manufacturer</label>
                <input className="input" name="manufacturer" value={common.manufacturer} onChange={handleCommonChange} placeholder="e.g. Intel, NVIDIA" />
              </div>
              <div>
                <label className="label">Model</label>
                <input className="input" name="model" value={common.model} onChange={handleCommonChange} placeholder="e.g. RTX 4090" />
              </div>
            </div>

            <div>
              <label className="label">Display Name *</label>
              <input className="input" name="name" value={common.name} onChange={handleCommonChange} required placeholder="Full component name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Color</label>
                <input className="input" name="color" value={common.color} onChange={handleCommonChange} placeholder="e.g. Black" />
              </div>
              <div>
                <label className="label">Image URL</label>
                <input className="input mb-1" name="imageUrl" value={common.imageUrl} onChange={handleCommonChange} placeholder="https://..." />
                <ImageUpload onUpload={(url) => setCommon((prev) => ({ ...prev, imageUrl: url }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Price (₸) *</label>
                <input className="input" type="number" name="price" value={common.price} onChange={handleCommonChange} required min="0" step="1" placeholder="0" />
              </div>
              <div>
                <label className="label">Stock</label>
                <input className="input" type="number" name="stock" value={common.stock} onChange={handleCommonChange} min="0" placeholder="0" />
              </div>
            </div>

            <div>
              <label className="label">Additional Images (comma-separated URLs)</label>
              <input className="input" name="images" value={common.images} onChange={handleCommonChange} placeholder="https://..." />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Description</label>
                <button
                  type="button"
                  onClick={handleAiDescription}
                  disabled={aiLoading || !common.name}
                  className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {aiLoading ? <Spinner size="sm" /> : <Zap className="w-3 h-3" />}
                  {aiLoading ? 'Generating…' : 'Generate with AI'}
                </button>
              </div>
              <textarea
                className="input min-h-[72px] resize-y"
                name="description"
                value={common.description}
                onChange={handleCommonChange}
                placeholder="Component description (optional)"
              />
            </div>

            {/* Category-specific spec fields */}
            {specFields.length > 0 && (
              <div>
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
                    {formatCategory(category)} Specifications
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {otherFields.map((field) => (
                      <SpecField
                        key={field.key}
                        field={field}
                        value={specData[field.key]}
                        onChange={handleSpecChange}
                      />
                    ))}
                  </div>
                  {checkboxFields.length > 0 && (
                    <div className="flex flex-wrap gap-5 mt-4">
                      {checkboxFields.map((field) => (
                        <SpecField
                          key={field.key}
                          field={field}
                          value={specData[field.key]}
                          onChange={handleSpecChange}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : editTarget ? 'Save Changes' : 'Add Component'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AdminComponentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['components', 'admin-all'],
    queryFn: () => componentsApi.getAll({ limit: 1000 }),
  })

  const components = data?.data?.components ?? data?.data ?? []

  const filtered = components.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: (id) => componentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['components'])
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

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-8">
        <Cpu className="w-7 h-7 text-primary-400" />
        <h1 className="text-2xl font-bold">Components</h1>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input className="input pl-9" placeholder="Search components..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary ml-auto" onClick={() => { setEditTarget(null); setModalOpen(true) }}>
          <Plus className="w-4 h-4" />
          Add Component
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : isError ? (
          <div className="text-center py-16 text-dark-400">Failed to load components.</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Cpu} title="No components found" description={search ? 'Try a different search term.' : 'Add your first component.'} action={!search ? { label: 'Add Component', onClick: () => { setEditTarget(null); setModalOpen(true) } } : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Image', 'Name', 'Category', 'Brand', 'Price', 'Stock', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-dark-400 font-medium text-sm py-4 px-6 bg-dark-900/50 border-b border-dark-800">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((component) => {
                  const thumb = component.imageUrl || (Array.isArray(component.images) ? component.images[0] : null)
                  return (
                    <tr key={component.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-4 px-6 border-b border-dark-800/50">
                        {thumb ? (
                          <img src={thumb} alt={component.name} className="w-10 h-10 object-contain rounded-lg bg-gray-100 p-1" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Cpu className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 border-b border-dark-800/50 font-medium text-dark-100 max-w-[200px] truncate">{component.name}</td>
                      <td className="py-4 px-6 border-b border-dark-800/50">
                        <CategoryBadge category={component.category} />
                      </td>
                      <td className="py-4 px-6 border-b border-dark-800/50 text-dark-400">{component.manufacturer || component.brand || '—'}</td>
                      <td className="py-4 px-6 border-b border-dark-800/50 font-medium">{formatPrice(component.price ?? 0)}</td>
                      <td className="py-4 px-6 border-b border-dark-800/50">
                        <span className={component.stock === 0 ? 'text-red-400' : 'text-dark-400'}>{component.stock ?? 0}</span>
                      </td>
                      <td className="py-4 px-6 border-b border-dark-800/50">
                        <div className="flex items-center gap-2">
                          <button className="btn-ghost p-2 text-primary-600 hover:text-primary-700" onClick={() => { setEditTarget(component); setModalOpen(true) }} title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button className="btn-ghost p-2 text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(component)} title="Delete">
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

      <ComponentModal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} editTarget={editTarget} onSuccess={() => { setModalOpen(false); setEditTarget(null) }} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Component"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` : ''}
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />

      {deleteError && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm z-50">
          {deleteError}
        </div>
      )}
    </AdminLayout>
  )
}
