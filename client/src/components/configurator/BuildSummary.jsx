import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Save, Check, AlertCircle, X, Cpu, Monitor, HardDrive, CircuitBoard, Zap, Box, Wind, MemoryStick } from 'lucide-react'
import { formatPrice } from '../../utils/formatters'
import { buildsApi } from '../../api/builds'
import { aiApi } from '../../api/ai'
import { useAuth } from '../../context/AuthContext'
import { useState, useEffect, useRef } from 'react'

const REQUIRED_SLOTS = ['CPU', 'MOTHERBOARD', 'RAM', 'STORAGE', 'PSU', 'CASE', 'COOLING']

const SLOT_ICONS = {
  CPU: Cpu, GPU: Monitor, RAM: MemoryStick, STORAGE: HardDrive,
  MOTHERBOARD: CircuitBoard, PSU: Zap, CASE: Box, COOLING: Wind, FAN: Wind,
}

export default function BuildSummary({ build, fanQty = 1, slots, conflicts, aiContext, onRestart }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [buildName, setBuildName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)
  const [orderName, setOrderName] = useState('')
  const [perfData, setPerfData] = useState(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [perfError, setPerfError] = useState(false)
  const buildHashRef = useRef('')

  useEffect(() => {
    if (!build.CPU || !build.GPU) {
      setPerfData(null)
      buildHashRef.current = ''
      return
    }
    const hash = Object.entries(build)
      .filter(([, v]) => v)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v.id}`)
      .join('|')
    if (hash === buildHashRef.current) return

    const timer = setTimeout(async () => {
      buildHashRef.current = hash
      setPerfLoading(true)
      setPerfError(false)
      const components = {}
      for (const [key, comp] of Object.entries(build)) {
        if (comp) components[key] = { name: comp.name, specData: comp.specData }
      }
      try {
        const res = await aiApi.performancePredict(components)
        setPerfData(res.data)
      } catch {
        setPerfError(true)
      } finally {
        setPerfLoading(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [build])

  const filled = Object.values(build).filter(Boolean).length
  const fanComponent = build.FAN
  const total = Object.entries(build).reduce((s, [k, c]) => {
    if (!c) return s
    return s + (k === 'FAN' ? c.price * fanQty : c.price)
  }, 0)
  const allRequired = REQUIRED_SLOTS.every((k) => build[k])

  async function handleSave() {
    if (!isAuthenticated) { navigate('/login'); return }
    if (!showNameInput) { setShowNameInput(true); return }
    setSaving(true)
    setSaveError('')
    try {
      const components = {}
      for (const [key, comp] of Object.entries(build)) {
        if (comp) components[key] = { id: comp.id, name: comp.name, price: comp.price, ...(key === 'FAN' && { quantity: fanQty }) }
      }
      const name = buildName.trim() || `Custom Build ${new Date().toLocaleDateString()}`
      await buildsApi.create({ name, components, totalPrice: total, aiContext })
      setSaved(true)
      setShowNameInput(false)
    } catch {
      setSaveError('Failed to save build.')
    } finally {
      setSaving(false)
    }
  }

  function submitOrder() {
    const components = {}
    for (const [key, comp] of Object.entries(build)) {
      if (comp) components[key] = {
        id: comp.id, name: comp.name, price: comp.price,
        imageUrl: comp.imageUrl || comp.images?.[0] || null,
        ...(key === 'FAN' && { quantity: fanQty }),
      }
    }
    const name = orderName.trim() || `Custom Build ${new Date().toLocaleDateString()}`
    localStorage.setItem('checkoutBuild', JSON.stringify({ type: 'custom', name, components, totalPrice: total }))
    setShowCartModal(false)
    navigate('/checkout')
  }

  return (
    <>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, position: 'sticky', top: 20, zIndex: 10 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Your Build</h2>
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{filled} / {slots.length}</span>
        </div>

        {/* Progress segments */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
          {slots.map((slot) => (
            <div
              key={slot.key}
              title={slot.label}
              style={{
                flex: 1, height: 5, borderRadius: 9999,
                background: build[slot.key] ? '#2563eb' : '#e5e7eb',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Component list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {slots.map((slot) => {
            const comp = build[slot.key]
            const Icon = SLOT_ICONS[slot.key] || slot.icon
            const isFan = slot.key === 'FAN'
            return (
              <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}>
                <Icon style={{ width: 14, height: 14, color: comp ? '#6b7280' : '#d1d5db', flexShrink: 0 }} />
                {comp ? (
                  <>
                    {(comp.imageUrl || comp.images?.[0]) && (
                      <img
                        src={comp.imageUrl || comp.images[0]}
                        alt={comp.name}
                        style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6, background: '#f8fafc', flexShrink: 0 }}
                      />
                    )}
                    <span style={{ flex: 1, fontSize: 12, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {comp.name}{isFan && fanQty > 1 ? ` ×${fanQty}` : ''}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                      {formatPrice(isFan ? comp.price * fanQty : comp.price)}
                    </span>
                  </>
                ) : (
                  <span style={{ flex: 1, fontSize: 12, color: '#d1d5db' }}>— {slot.label}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#2563eb' }}>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Budget gauge */}
        {(() => {
          const budgetMax = aiContext?.budget?.max
          if (!budgetMax) return null
          const pct = Math.min(100, (total / budgetMax) * 100)
          const over = total > budgetMax
          const barColor = over ? '#9333ea' : pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'
          const remaining = budgetMax - total
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Budget Usage</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>
                  {over ? `${formatPrice(Math.abs(remaining))} over budget` : `${formatPrice(remaining)} remaining`}
                </span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 9999, transition: 'width 0.4s ease, background 0.3s' }} />
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                {formatPrice(total)} of {formatPrice(budgetMax)} budget
              </p>
            </div>
          )
        })()}

        {/* Performance Prediction */}
        {(build.CPU && build.GPU) && (
          <div style={{ marginBottom: 14, borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <style>{`@keyframes perfPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Performance Estimate</span>
              <span style={{ fontSize: 10, color: '#9ca3af', background: '#e5e7eb', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>1080p</span>
            </div>
            {perfLoading ? (
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} style={{ height: 14, borderRadius: 4, background: '#e5e7eb', animation: 'perfPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : perfError ? (
              <div style={{ padding: '10px 12px', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>Prediction unavailable</div>
            ) : perfData ? (
              <div style={{ padding: '6px 12px 10px' }}>
                {perfData.games?.map((game, i) => {
                  const fpsColor = game.fps > 144 ? '#16a34a' : game.fps >= 60 ? '#ca8a04' : '#dc2626'
                  return (
                    <div
                      key={game.name}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '5px 0',
                        borderBottom: i < perfData.games.length - 1 ? '1px solid #f1f5f9' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 11, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                        {game.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: fpsColor }}>{game.fps}</span>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>fps</span>
                        <span style={{ fontSize: 10, color: '#6b7280', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>{game.quality}</span>
                      </div>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {perfData.overallRating && (() => {
                    const rating = perfData.overallRating
                    const styles = {
                      'Budget':     { background: '#f1f5f9', color: '#64748b' },
                      'Mid-range':  { background: '#eff6ff', color: '#2563eb' },
                      'High-end':   { background: '#f0fdf4', color: '#16a34a' },
                      'Enthusiast': { background: '#faf5ff', color: '#9333ea' },
                    }
                    const s = styles[rating] || { background: '#f1f5f9', color: '#374151' }
                    return (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, ...s }}>
                        {rating}
                      </span>
                    )
                  })()}
                  {perfData.bottleneck && perfData.bottleneck !== 'None' && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: '#fff7ed', color: '#c2410c' }}>
                      {perfData.bottleneck === 'CPU-bound' ? 'CPU Bottleneck' : 'GPU Bottleneck'}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Compatibility status */}
        {conflicts.length === 0 && filled > 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, marginBottom: 14 }}>
            <Check style={{ width: 14, height: 14, color: '#16a34a' }} />
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>All components compatible</span>
          </div>
        ) : conflicts.length > 0 ? (
          <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <AlertCircle style={{ width: 14, height: 14, color: '#dc2626' }} />
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Compatibility issues</span>
            </div>
            {conflicts.map((c, i) => (
              <p key={i} style={{ fontSize: 11, color: '#b91c1c', margin: '2px 0 0' }}>{c}</p>
            ))}
          </div>
        ) : null}

        {/* Error */}
        {saveError && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{saveError}</p>}

        {/* Save name input */}
        {showNameInput && (
          <div style={{ marginBottom: 10 }}>
            <input
              autoFocus
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Build name (optional)"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        )}

        {/* Save success */}
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, marginBottom: 10 }}>
            <Check style={{ width: 14, height: 14, color: '#16a34a' }} />
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
              Build saved!{' '}
              <button
                onClick={() => navigate('/profile/builds')}
                style={{ background: 'none', border: 'none', color: '#15803d', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                View in Profile →
              </button>
            </span>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving || filled === 0}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px', borderRadius: 10, border: '1px solid #e5e7eb',
              background: saved ? '#f0fdf4' : '#fff', color: saved ? '#16a34a' : '#374151',
              fontSize: 14, fontWeight: 500, cursor: filled === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {saved ? <Check style={{ width: 16, height: 16 }} /> : <Save style={{ width: 16, height: 16 }} />}
            {saved ? 'Saved!' : showNameInput ? 'Confirm Save' : 'Save Build'}
          </button>

          <button
            onClick={() => { if (!allRequired) return; setOrderName(''); setShowCartModal(true) }}
            disabled={!allRequired || saving}
            title={!allRequired ? 'Fill all required slots first' : ''}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 10, border: 'none',
              background: allRequired ? '#2563eb' : '#d1d5db',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: allRequired ? 'pointer' : 'not-allowed',
            }}
          >
            <ShoppingCart style={{ width: 16, height: 16 }} />
            Checkout Build
          </button>
        </div>

        {/* Restart link */}
        <button onClick={onRestart} style={{ width: '100%', marginTop: 14, fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Start over with new answers
        </button>
      </div>

      {/* Cart confirmation modal */}
      {showCartModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Your Custom Build</h2>
              <button onClick={() => setShowCartModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 20, height: 20, color: '#6b7280' }} />
              </button>
            </div>

            {/* Component list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {slots.map((slot) => {
                const comp = build[slot.key]
                if (!comp) return null
                const Icon = SLOT_ICONS[slot.key] || slot.icon
                const isFan = slot.key === 'FAN'
                return (
                  <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
                    {(comp.imageUrl || comp.images?.[0]) && (
                      <img src={comp.imageUrl || comp.images[0]} alt={comp.name} style={{ width: 44, height: 44, objectFit: 'contain', background: '#fff', borderRadius: 8, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontWeight: 500 }}>{slot.label}</p>
                      <p style={{ fontSize: 13, color: '#111827', fontWeight: 600, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {comp.name}{isFan && fanQty > 1 ? ` ×${fanQty}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                      {formatPrice(isFan ? comp.price * fanQty : comp.price)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #e5e7eb', marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>{formatPrice(total)}</span>
            </div>

            {/* Order name */}
            <input
              autoFocus
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder="Build name (optional)"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box', marginBottom: 12, outline: 'none' }}
            />

            <button
              onClick={submitOrder}
              disabled={saving}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              {saving ? 'Placing Order...' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
