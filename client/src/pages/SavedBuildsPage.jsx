import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cpu, Monitor, HardDrive, CircuitBoard, Zap, Box, Wind, MemoryStick, Pencil, Check, Trash2, ShoppingCart, Wrench, Search } from 'lucide-react'
import { buildsApi } from '../api/builds'
import { formatPrice } from '../utils/formatters'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'

const SLOT_LABELS = {
  CPU: 'CPU', MOTHERBOARD: 'Motherboard', GPU: 'GPU', RAM: 'RAM',
  STORAGE: 'Storage', PSU: 'PSU', CASE: 'Case', COOLING: 'Cooling', FAN: 'Case Fans',
}
const SLOT_ICONS = {
  CPU: Cpu, GPU: Monitor, RAM: MemoryStick, STORAGE: HardDrive,
  MOTHERBOARD: CircuitBoard, PSU: Zap, CASE: Box, COOLING: Wind, FAN: Wind,
}

function BuildCard({ build, onDelete }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(build.name || 'Unnamed Build')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const components = build.components || {}
  const slots = Object.keys(SLOT_LABELS).filter((k) => components[k])
  const total = build.totalPrice || Object.values(components).reduce((s, c) => {
    if (!c) return s
    return s + ((c.price || 0) * (c.quantity || 1))
  }, 0)

  async function saveName() {
    if (!nameVal.trim() || nameVal === build.name) { setEditingName(false); return }
    setSaving(true)
    try {
      await buildsApi.update(build.id, { name: nameVal.trim() })
      await queryClient.invalidateQueries({ queryKey: ['builds'] })
    } catch {
      setNameVal(build.name)
    } finally {
      setSaving(false)
      setEditingName(false)
    }
  }

  function loadInConfigurator() {
    localStorage.setItem('savedBuildToLoad', JSON.stringify(components))
    localStorage.setItem('skipQuestionnaire', 'true')
    navigate('/build')
  }

  function buyNow() {
    const total = build.totalPrice || Object.values(components).reduce((s, c) => s + ((c?.price || 0) * (c?.quantity || 1)), 0)
    localStorage.setItem('checkoutBuild', JSON.stringify({ type: 'custom', name: nameVal, components, totalPrice: total }))
    navigate('/checkout')
  }

  const dateStr = build.createdAt
    ? new Date(build.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, transition: 'box-shadow 0.2s' }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {editingName ? (
          <>
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameVal(build.name) } }}
              style={{ flex: 1, fontSize: 15, fontWeight: 700, border: '1px solid #2563eb', borderRadius: 8, padding: '4px 10px', outline: 'none' }}
            />
            <button onClick={saveName} disabled={saving} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
              <Check style={{ width: 14, height: 14 }} />
            </button>
          </>
        ) : (
          <>
            <h3 style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nameVal}
            </h3>
            <button onClick={() => setEditingName(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af' }}>
              <Pencil style={{ width: 13, height: 13 }} />
            </button>
          </>
        )}
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => onDelete(build.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>Delete</button>
            <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#d1d5db' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
          >
            <Trash2 style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Component list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {slots.map((key) => {
          const comp = components[key]
          if (!comp) return null
          const Icon = SLOT_ICONS[key] || Cpu
          const qty = comp.quantity || 1
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon style={{ width: 12, height: 12, color: '#9ca3af', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {comp.name}{qty > 1 ? ` ×${qty}` : ''}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flexShrink: 0 }}>
                {formatPrice((comp.price || 0) * qty)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{formatPrice(total)}</span>
            {dateStr && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{dateStr}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={loadInConfigurator}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid #2563eb', background: '#fff', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            <Wrench style={{ width: 13, height: 13 }} /> Load
          </button>
          <button
            onClick={buyNow}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
          >
            <ShoppingCart style={{ width: 13, height: 13 }} /> Buy Now
          </button>
        </div>
      </div>
    </div>
  )
}

const LIMIT = 9

export default function SavedBuildsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const searchTimerRef = useRef(null)

  function handleSearchChange(e) {
    const val = e.target.value
    setSearch(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['builds', debouncedSearch, page],
    queryFn: () => buildsApi.getAll({ search: debouncedSearch || undefined, page, limit: LIMIT }).then((r) => r.data),
    keepPreviousData: true,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => buildsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['builds'] }),
  })

  const builds = (data?.builds ?? data ?? []).filter((b) => !b.isOrderRequest)
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1
  const total = pagination?.total ?? builds.length

  return (
    <div className="container-page py-8">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>My Saved Builds</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          {total} build{total !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 24 }}>
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search your builds..."
          style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
          onFocus={(e) => e.target.style.borderColor = '#2563eb'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner size="lg" /></div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#dc2626' }}>Failed to load builds.</div>
      ) : builds.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No builds found' : 'No saved builds yet'}
          description={debouncedSearch ? 'Try a different search term.' : 'Use the PC Configurator to build your perfect PC, then save it here.'}
          action={!debouncedSearch ? { label: 'Open Configurator', onClick: () => window.location.href = '/build' } : undefined}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, marginBottom: 32 }}>
            {builds.map((build) => (
              <BuildCard
                key={build.id}
                build={build}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination page={page} pages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
