import { useState, useEffect, useRef } from 'react'
import { X, Search, Info, AlertTriangle, Zap, ChevronLeft } from 'lucide-react'
import api from '../../api/client'
import { componentsApi } from '../../api/components'
import { formatPrice } from '../../utils/formatters'
import { CATEGORY_BADGE_STYLES } from '../products/ComponentCard'

const SLOT_BUDGET_WEIGHTS = {
  GPU: 0.35, CPU: 0.20, MOTHERBOARD: 0.10, RAM: 0.10,
  STORAGE: 0.08, PSU: 0.07, CASE: 0.06, COOLING: 0.04, FAN: 0.03,
}

// ─── Compatibility helpers ────────────────────────────────────────────────────
function parseFirstNumber(str) {
  if (!str) return null
  const m = String(str).match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

function formFitsCase(caseForm, mbForm) {
  if (!caseForm || !mbForm) return true
  const cf = caseForm.replace(/[^a-z]/gi, '').toLowerCase()
  const mb = mbForm.replace(/[^a-z]/gi, '').toLowerCase()
  if (cf.includes('full') || cf.includes('eatx')) return true
  if (cf === 'atx') return mb === 'atx' || mb.includes('matx') || mb.includes('itx')
  if (cf.includes('matx') || cf.includes('microatx')) return mb.includes('matx') || mb.includes('itx')
  if (cf.includes('itx')) return mb.includes('itx')
  return true
}

const DDR5_CHIPSETS = ['X670', 'B650', 'Z790', 'B760', 'Z690', 'B760M', 'H770']

function inferDDRType(chipset) {
  if (!chipset) return null
  return DDR5_CHIPSETS.some((c) => chipset.toUpperCase().includes(c)) ? 'DDR5' : 'DDR4'
}

function getCompatibilityIssue(component, build) {
  const { CPU, MOTHERBOARD, CASE, GPU } = build
  const cat = component.category
  const sd = component.specData || {}

  if (cat === 'MOTHERBOARD' && CPU) {
    const cpuSocket = CPU.specData?.socket
    if (cpuSocket && sd.socket && cpuSocket !== sd.socket)
      return `Needs ${cpuSocket} socket (this has ${sd.socket})`
  }
  if (cat === 'CPU' && MOTHERBOARD) {
    const mbSocket = MOTHERBOARD.specData?.socket
    if (mbSocket && sd.socket && sd.socket !== mbSocket)
      return `Needs ${mbSocket} socket (this has ${sd.socket})`
  }
  if (cat === 'RAM' && MOTHERBOARD) {
    const expected = inferDDRType(MOTHERBOARD.specData?.chipset)
    if (expected && sd.memoryType && sd.memoryType !== expected)
      return `Motherboard supports ${expected}, this is ${sd.memoryType}`
  }
  if (cat === 'CASE' && MOTHERBOARD) {
    if (!formFitsCase(sd.formFactor, MOTHERBOARD.specData?.formFactor))
      return `${MOTHERBOARD.specData?.formFactor} board doesn't fit in ${sd.formFactor} case`
  }
  if (cat === 'CASE' && GPU) {
    const gpuLen = parseFirstNumber(GPU.specData?.dimensions)
    const clearance = parseFirstNumber(sd.gpuLength)
    if (gpuLen && clearance && gpuLen > clearance)
      return `GPU (${gpuLen}mm) exceeds case clearance (${clearance}mm)`
  }
  if (cat === 'GPU' && CASE) {
    const gpuLen = parseFirstNumber(sd.dimensions)
    const clearance = parseFirstNumber(CASE.specData?.gpuLength)
    if (gpuLen && clearance && gpuLen > clearance)
      return `Doesn't fit in selected case (max ${clearance}mm, this is ${gpuLen}mm)`
  }
  if (cat === 'COOLING' && CPU) {
    const cpuSocket = CPU.specData?.socket
    const supported = sd.socket || ''
    if (cpuSocket && !supported.toLowerCase().includes(cpuSocket.toLowerCase()))
      return `Doesn't support ${cpuSocket} socket`
  }
  return null
}

function getKeySpecs(component) {
  const sd = component.specData || {}
  switch (component.category) {
    case 'CPU':         return [sd.cores && `${sd.cores} Cores`, sd.boostClock && `Boost ${sd.boostClock}`, sd.tdp && `TDP ${sd.tdp}`].filter(Boolean)
    case 'GPU':         return [sd.memorySize && sd.memoryType && `${sd.memorySize} ${sd.memoryType}`, sd.coreClock && `Core ${sd.coreClock}`].filter(Boolean)
    case 'RAM': {
      const kitStr = sd.kitSize && sd.stickSize ? `${sd.kitSize}×${sd.stickSize}GB` : sd.memorySize
      return [kitStr && sd.memoryType && `${kitStr} ${sd.memoryType}`, sd.memoryClock].filter(Boolean)
    }
    case 'STORAGE':     return [sd.memorySize, sd.memoryType, sd.readSpeed && `Read ${sd.readSpeed}`].filter(Boolean)
    case 'MOTHERBOARD': return [sd.chipset, sd.socket, sd.formFactor].filter(Boolean)
    case 'PSU':         return [sd.power, sd.certificate, sd.modularity].filter(Boolean)
    case 'CASE':        return [sd.formFactor, sd.gpuLength && `GPU up to ${sd.gpuLength}`].filter(Boolean)
    case 'COOLING':     return [sd.waterCooling ? 'AIO Liquid' : 'Air Cooling', sd.tdp && `${sd.tdp} TDP support`].filter(Boolean)
    case 'FAN':         return [sd.dimensions, sd.noise && `${sd.noise}`, sd.rgb && 'RGB'].filter(Boolean)
    default:            return []
  }
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }} className="animate-pulse">
      <div style={{ aspectRatio: '1/1', background: '#f3f4f6' }} />
      <div style={{ padding: 14 }}>
        <div style={{ height: 10, background: '#f3f4f6', borderRadius: 9999, width: '40%', marginBottom: 10 }} />
        <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, marginBottom: 6 }} />
        <div style={{ height: 14, background: '#f3f4f6', borderRadius: 6, width: '75%', marginBottom: 12 }} />
        <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, width: '60%', marginBottom: 14 }} />
        <div style={{ height: 36, background: '#f3f4f6', borderRadius: 8 }} />
      </div>
    </div>
  )
}

// ─── Component card ───────────────────────────────────────────────────────────
function ComponentCard({ component, aiRec, aiIncomp, onSelect, incompatibleReason, isHighlighted }) {
  const [showTip, setShowTip] = useState(false)
  const badgeStyle = CATEGORY_BADGE_STYLES?.[component.category]
  const imageUrl = component.imageUrl || component.images?.[0]
  const keySpecs = getKeySpecs(component)
  const isIncompat = !!incompatibleReason
  const isAiIncompat = !!aiIncomp
  const isOverBudget = aiRec?.reason?.toLowerCase().includes('exceed') || aiRec?.reason?.toLowerCase().includes('over budget')

  let borderColor = '#e5e7eb'
  let boxShadow = 'none'
  let glowColor = 'none'
  if (isHighlighted && !aiRec) {
    borderColor = '#7c3aed'; boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
  } else if (aiRec) {
    borderColor = isOverBudget ? '#eab308' : '#22c55e'
    boxShadow = isOverBudget ? '0 0 0 3px rgba(234,179,8,0.1)' : '0 0 0 3px rgba(34,197,94,0.12), 0 0 16px rgba(34,197,94,0.08)'
  } else if (isAiIncompat) {
    borderColor = '#ef4444'; boxShadow = '0 0 0 2px rgba(239,68,68,0.1)'
  }

  return (
    <div
      style={{
        background: (isIncompat || isAiIncompat) ? '#fafafa' : '#fff',
        border: `2px solid ${borderColor}`,
        boxShadow,
        borderRadius: 14,
        overflow: 'visible',
        opacity: (isIncompat || isAiIncompat) ? 0.7 : 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.15s',
      }}
      data-component-id={component.id}
      onMouseEnter={(e) => { if (!isIncompat && !isAiIncompat) e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
    >
      {/* Top badge */}
      {isHighlighted && !aiRec && !isAiIncompat && (
        <div style={{ position: 'absolute', top: 0, left: 0, background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: '0 0 8px 0', zIndex: 2, letterSpacing: '0.04em' }}>
          ★ VIEWING
        </div>
      )}
      {aiRec && (
        <div style={{ position: 'absolute', top: 0, left: 0, background: isOverBudget ? '#eab308' : '#22c55e', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: '0 0 8px 0', zIndex: 2, letterSpacing: '0.04em' }}>
          {isOverBudget ? '⚠ AI PICK (over budget)' : '✦ AI PICK'}
        </div>
      )}
      {isAiIncompat && (
        <div style={{ position: 'absolute', top: 0, left: 0, background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: '0 0 8px 0', zIndex: 2, letterSpacing: '0.04em' }}>
          ✗ INCOMPATIBLE
        </div>
      )}

      {/* Info tooltip */}
      {(aiRec || isAiIncompat) && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
          <div style={{ position: 'relative' }}>
            <button
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            >
              <Info style={{ width: 13, height: 13, color: '#6b7280' }} />
            </button>
            {showTip && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 200, maxWidth: 250, background: '#1f2937', color: '#f9fafb', fontSize: 13, padding: '8px 12px', borderRadius: 8, zIndex: 9999, lineHeight: 1.5, pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                <div style={{ position: 'absolute', top: -5, right: 8, width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid #1f2937' }} />
                {(aiRec ? aiRec.reason : aiIncomp?.reason) || 'AI recommended for your build configuration'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image — square aspect ratio */}
      <div style={{ aspectRatio: '1/1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, flexShrink: 0, borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={component.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: 48, height: 48, background: '#e5e7eb', borderRadius: 10 }} />
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {badgeStyle && (
          <span style={{ display: 'inline-flex', alignItems: 'center', background: badgeStyle.bg, color: badgeStyle.text, borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: '2px 9px', marginBottom: 8, width: 'fit-content', letterSpacing: '0.04em' }}>
            {component.category}
          </span>
        )}

        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 6, minHeight: 36 }}>
          {component.name}
        </p>

        {keySpecs.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {keySpecs.slice(0, 3).map((spec, i) => (
              <p key={i} style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>{spec}</p>
            ))}
          </div>
        )}

        <p style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginBottom: 10, marginTop: 'auto' }}>
          {formatPrice(component.price)}
        </p>

        {incompatibleReason ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 10px', background: '#fef2f2', borderRadius: 8 }}>
            <AlertTriangle style={{ width: 12, height: 12, color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 11, color: '#b91c1c', lineHeight: 1.4 }}>{incompatibleReason}</span>
          </div>
        ) : isAiIncompat ? (
          <button
            disabled
            style={{ width: '100%', padding: '10px', borderRadius: 9, border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 600, cursor: 'not-allowed' }}
          >
            Incompatible
          </button>
        ) : (
          <button
            onClick={() => onSelect(component)}
            style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none', background: aiRec ? (isOverBudget ? '#eab308' : '#22c55e') : '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Add to Build
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionDivider({ label, color = '#9ca3af', lineColor = '#e5e7eb' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0 18px' }}>
      <div style={{ flex: 1, height: 1, background: lineColor }} />
      <span style={{ fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: lineColor }} />
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function ComponentSelectModal({ category, build, aiContext, buildMeta = {}, highlightId, onSelect, onClose }) {
  const [all, setAll] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiRecs, setAiRecs] = useState([])
  const [aiIncomps, setAiIncomps] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const scrollRef = useRef(null)

  // Computed budget context for footer
  const remainingBudget = buildMeta.remainingBudget ?? buildMeta.budgetRemaining ?? null
  const totalBudget = buildMeta.totalBudget || aiContext?.budget?.max || 0
  const weight = SLOT_BUDGET_WEIGHTS[category] || 0.10
  const suggestedForSlot = totalBudget > 0 ? Math.round(totalBudget * weight) : null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setAiRecs([])
    setAiIncomps([])

    componentsApi.getAll({ category, limit: 100 }).then((r) => {
      if (cancelled) return
      const list = r.data?.components ?? []
      setAll(list)
      setLoading(false)

      // Fetch AI recommendations
      setAiLoading(true)
      const currentBuild = {}
      for (const [k, v] of Object.entries(build)) {
        if (v) currentBuild[k] = { name: v.name, price: v.price, specData: v.specData, category: v.category }
      }
      const available = list.map((c) => ({
        id: c.id, name: c.name, manufacturer: c.manufacturer, price: c.price, specData: c.specData,
      }))

      const spentBudget = Object.values(build).reduce((s, c) => s + (c?.price || 0), 0)
      const emptySlots = Math.max(1, 9 - Object.values(build).filter(Boolean).length)

      api.post('/ai/recommend', {
        aiContext: {
          ...aiContext,
          additionalPreferences: aiContext?.preferences || aiContext?.additionalPreferences,
        },
        currentBuild,
        selectingCategory: category,
        availableComponents: available,
        budget: {
          min: aiContext?.budget?.min || 0,
          max: aiContext?.budget?.max || 999999,
        },
        buildMeta: {
          ...buildMeta,
          spentBudget,
          remainingBudget,
          emptySlots,
          suggestedForThisSlot: suggestedForSlot,
          totalBudget,
        },
      })
        .then((res) => res.data)
        .then((data) => {
          if (!cancelled) {
            setAiRecs(data.recommendations || [])
            setAiIncomps(data.incompatible || [])
          }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setAiLoading(false) })
    }).catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [category])

  // Scroll to highlighted component
  useEffect(() => {
    if (!loading && highlightId && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-component-id="${highlightId}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading, highlightId])

  // PSU wattage filter
  const minPsuWattage = category === 'PSU' ? (buildMeta.minPsuWattage || 0) : 0

  const filtered = all.filter((c) => {
    if (category === 'PSU' && minPsuWattage > 0) {
      const watts = parseFirstNumber(c.specData?.power)
      if (watts && watts < minPsuWattage) return false
    }
    if (!search) return true
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.manufacturer?.toLowerCase().includes(q)
  })

  const recMap = {}
  aiRecs.forEach((r) => { recMap[r.componentId] = r })
  const incompMap = {}
  aiIncomps.forEach((r) => { incompMap[r.componentId] = r })

  const recommended = filtered.filter((c) => recMap[c.id]).sort((a, b) => (recMap[a.id]?.priority ?? 99) - (recMap[b.id]?.priority ?? 99))
  const aiIncompatList = filtered.filter((c) => !recMap[c.id] && incompMap[c.id])
  const rest = filtered.filter((c) => !recMap[c.id] && !incompMap[c.id])
  const hasAI = recommended.length > 0

  // Close on backdrop click
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdropClick}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', backdropFilter: 'blur(2px)' }}
    >
      <div
        style={{ width: '100%', maxWidth: 920, maxHeight: '90vh', background: '#fff', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                  Select {category === 'MOTHERBOARD' ? 'Motherboard' : category.charAt(0) + category.slice(1).toLowerCase()}
                </h2>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0' }}>
                  {filtered.length} compatible {filtered.length === 1 ? 'option' : 'options'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f9fafb' }}
            >
              <X style={{ width: 18, height: 18, color: '#6b7280' }} />
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${category.toLowerCase()} components...`}
              style={{ width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 11, paddingBottom: 11, borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#fff' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb' }}
            />
          </div>

          {/* PSU warning */}
          {category === 'PSU' && minPsuWattage > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 16 }}>
              <Zap style={{ width: 14, height: 14, color: '#d97706', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#92400e', fontWeight: 500 }}>
                Min for your build: <strong>{minPsuWattage}W</strong>
                <span style={{ fontWeight: 400, color: '#b45309', marginLeft: 4 }}>
                  (CPU {buildMeta.cpuTdp}W + GPU ~{buildMeta.gpuWatts}W + 150W)
                </span>
              </span>
            </div>
          )}

          {/* AI loading banner */}
          {aiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 500 }}>AI is analyzing your build...</span>
            </div>
          )}

          <div style={{ height: 1, background: '#f1f5f9', margin: '0 -24px' }} />
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 16px' }}>
          {loading ? (
            <div style={{ paddingTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
              </div>
            </div>
          ) : (
            <>
              {/* AI Recommended */}
              {(hasAI || aiLoading) && (
                <div>
                  <SectionDivider label="✦ Recommended for your build" color="#2563eb" lineColor="#bfdbfe" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 8 }}>
                    {aiLoading && !hasAI
                      ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
                      : recommended.map((c) => (
                          <ComponentCard
                            key={c.id}
                            component={c}
                            aiRec={recMap[c.id]}
                            aiIncomp={null}
                            onSelect={onSelect}
                            incompatibleReason={getCompatibilityIssue(c, build)}
                            isHighlighted={highlightId === c.id}
                          />
                        ))}
                  </div>
                </div>
              )}

              {/* All compatible */}
              {rest.length > 0 && (
                <div>
                  {hasAI && <SectionDivider label="All compatible options" />}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {rest.map((c) => (
                      <ComponentCard
                        key={c.id}
                        component={c}
                        aiRec={null}
                        aiIncomp={null}
                        onSelect={onSelect}
                        incompatibleReason={getCompatibilityIssue(c, build)}
                        isHighlighted={highlightId === c.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* AI incompatible */}
              {aiIncompatList.length > 0 && (
                <div>
                  <SectionDivider label="✗ Not compatible with your build" color="#ef4444" lineColor="#fecaca" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {aiIncompatList.map((c) => (
                      <ComponentCard
                        key={c.id}
                        component={c}
                        aiRec={null}
                        aiIncomp={incompMap[c.id]}
                        onSelect={onSelect}
                        incompatibleReason={getCompatibilityIssue(c, build)}
                        isHighlighted={highlightId === c.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                  <p style={{ fontSize: 16, fontWeight: 500 }}>No {category.toLowerCase()} components found</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Try a different search term</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky footer with budget context */}
        {(remainingBudget != null || suggestedForSlot != null) && (
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 24px', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, flexWrap: 'wrap' }}>
            {remainingBudget != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Budget remaining:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: remainingBudget < 50000 ? '#dc2626' : '#111827' }}>
                  {formatPrice(remainingBudget)}
                </span>
              </div>
            )}
            {suggestedForSlot != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Suggested for {category}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>{formatPrice(suggestedForSlot)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
