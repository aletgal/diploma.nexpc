import { useState, useEffect } from 'react'
import { Cpu, Monitor, HardDrive, CircuitBoard, Zap, Box, Wind, MemoryStick, Plus, Minus, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react'
import ComponentSelectModal from './ComponentSelectModal'
import BuildSummary from './BuildSummary'
import { formatPrice } from '../../utils/formatters'

// ─── Slot definitions ─────────────────────────────────────────────────────────
const SLOTS = [
  { key: 'CPU',         label: 'CPU',          icon: Cpu,          required: true  },
  { key: 'MOTHERBOARD', label: 'Motherboard',  icon: CircuitBoard, required: true  },
  { key: 'GPU',         label: 'GPU',          icon: Monitor,      required: false },
  { key: 'RAM',         label: 'RAM',          icon: MemoryStick,  required: true,  requires: 'MOTHERBOARD' },
  { key: 'STORAGE',     label: 'Storage',      icon: HardDrive,    required: true  },
  { key: 'PSU',         label: 'PSU',          icon: Zap,          required: true  },
  { key: 'CASE',        label: 'Case',         icon: Box,          required: true  },
  { key: 'COOLING',     label: 'CPU Cooling',  icon: Wind,         required: true,  requires: 'CASE' },
  { key: 'FAN',         label: 'Case Fans',    icon: Wind,         required: false, requires: 'CASE' },
]

// ─── Category colors ──────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  CPU:         { bg: '#dbeafe', icon: '#2563eb', border: '#3b82f6' },
  GPU:         { bg: '#ede9fe', icon: '#7c3aed', border: '#8b5cf6' },
  RAM:         { bg: '#dcfce7', icon: '#16a34a', border: '#22c55e' },
  STORAGE:     { bg: '#ffedd5', icon: '#ea580c', border: '#f97316' },
  PSU:         { bg: '#fef3c7', icon: '#d97706', border: '#f59e0b' },
  CASE:        { bg: '#f1f5f9', icon: '#64748b', border: '#94a3b8' },
  COOLING:     { bg: '#cffafe', icon: '#0891b2', border: '#06b6d4' },
  FAN:         { bg: '#fce7f3', icon: '#db2777', border: '#ec4899' },
  MOTHERBOARD: { bg: '#e0e7ff', icon: '#4f46e5', border: '#6366f1' },
}

const SLOT_BUDGET_WEIGHTS = {
  GPU: 0.35, CPU: 0.20, MOTHERBOARD: 0.10, RAM: 0.10,
  STORAGE: 0.08, PSU: 0.07, CASE: 0.06, COOLING: 0.04, FAN: 0.03,
}

// ─── Compatibility helpers ────────────────────────────────────────────────────
const DDR5_CHIPSETS = ['X670', 'B650', 'Z790', 'B760', 'Z690', 'B760M', 'H770']
function inferDDR(chipset) {
  if (!chipset) return null
  return DDR5_CHIPSETS.some((c) => chipset.toUpperCase().includes(c)) ? 'DDR5' : 'DDR4'
}
function parseNum(str) {
  const m = String(str || '').match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}
function formFits(caseForm, mbForm) {
  if (!caseForm || !mbForm) return true
  const cf = caseForm.replace(/[^a-z]/gi, '').toLowerCase()
  const mb = mbForm.replace(/[^a-z]/gi, '').toLowerCase()
  if (cf.includes('full') || cf.includes('eatx')) return true
  if (cf === 'atx') return mb === 'atx' || mb.includes('matx') || mb.includes('itx')
  if (cf.includes('matx')) return mb.includes('matx') || mb.includes('itx')
  if (cf.includes('itx')) return mb.includes('itx')
  return true
}

function getBuildConflicts(build) {
  const conflicts = []
  const { CPU, MOTHERBOARD, RAM, CASE, GPU, COOLING } = build
  if (CPU && MOTHERBOARD) {
    if (CPU.specData?.socket && MOTHERBOARD.specData?.socket && CPU.specData.socket !== MOTHERBOARD.specData.socket)
      conflicts.push(`CPU (${CPU.specData.socket}) incompatible with motherboard (${MOTHERBOARD.specData.socket})`)
  }
  if (RAM && MOTHERBOARD) {
    const exp = inferDDR(MOTHERBOARD.specData?.chipset)
    if (exp && RAM.specData?.memoryType && RAM.specData.memoryType !== exp)
      conflicts.push(`RAM is ${RAM.specData.memoryType} but motherboard supports ${exp}`)
  }
  if (CASE && MOTHERBOARD) {
    if (!formFits(CASE.specData?.formFactor, MOTHERBOARD.specData?.formFactor))
      conflicts.push(`Motherboard (${MOTHERBOARD.specData?.formFactor}) doesn't fit in Case (${CASE.specData?.formFactor})`)
  }
  if (CASE && GPU) {
    const gpuLen = parseNum(GPU.specData?.dimensions)
    const clearance = parseNum(CASE.specData?.gpuLength)
    if (gpuLen && clearance && gpuLen > clearance)
      conflicts.push(`GPU (${gpuLen}mm) exceeds case GPU clearance (${clearance}mm)`)
  }
  if (COOLING && CPU) {
    const socket = CPU.specData?.socket
    const supported = COOLING.specData?.socket || ''
    if (socket && !supported.toLowerCase().includes(socket.toLowerCase()))
      conflicts.push(`Cooler doesn't support ${socket} socket`)
  }
  return conflicts
}

// ─── Key spec per category ────────────────────────────────────────────────────
function getShortSpec(component) {
  const sd = component.specData || {}
  switch (component.category) {
    case 'CPU':         return sd.cores ? `${sd.cores} cores · ${sd.boostClock || sd.baseClock || ''}`.trim().replace(/ ·\s*$/, '') : ''
    case 'GPU':         return sd.memorySize ? `${sd.memorySize} ${sd.memoryType || ''}`.trim() : ''
    case 'RAM': {
      const kitStr = sd.kitSize && sd.stickSize ? `${sd.kitSize}×${sd.stickSize}GB` : sd.memorySize
      return kitStr ? `${kitStr} ${sd.memoryType || ''} ${sd.memoryClock || ''}`.trim() : ''
    }
    case 'STORAGE':     return sd.memorySize ? `${sd.memorySize} ${sd.memoryType || 'NVMe'}`.trim() : ''
    case 'MOTHERBOARD': return [sd.socket, sd.chipset, sd.formFactor].filter(Boolean).join(' · ')
    case 'PSU':         return [sd.power, sd.certificate].filter(Boolean).join(' · ')
    case 'CASE':        return sd.formFactor || ''
    case 'COOLING':     return sd.waterCooling ? 'AIO Liquid Cooler' : 'Air Cooling'
    case 'FAN':         return [sd.dimensions, sd.rgb && 'RGB'].filter(Boolean).join(' · ')
    default:            return ''
  }
}

// ─── Max fans from case form factor ──────────────────────────────────────────
function getMaxFans(caseComp) {
  if (!caseComp) return 4
  const ff = (caseComp.specData?.formFactor || '').toLowerCase()
  if (ff.includes('full') || ff.includes('eatx') || ff.includes('e-atx')) return 6
  if (ff.includes('matx') || ff.includes('micro')) return 3
  if (ff.includes('itx') || ff.includes('mini')) return 2
  return 4
}

// ─── Fan AI recommendation ────────────────────────────────────────────────────
const FAN_PRESETS = [
  { count: 0, label: 'Skip',     desc: 'No extra fans' },
  { count: 2, label: 'Basic',    desc: 'Basic airflow'  },
  { count: 3, label: 'Balanced', desc: 'Best balance'   },
  { count: 4, label: 'Optimal',  desc: 'Great cooling'  },
  { count: 6, label: 'Maximum',  desc: 'Max airflow'    },
]

function getFanAiRec(build, aiContext, maxFans) {
  const cpuTdp = parseNum(build.CPU?.specData?.tdp) || 65
  const budgetMax = aiContext?.budget?.max || null
  const totalSpent = Object.values(build).reduce((sum, c) => sum + (c?.price || 0), 0)
  const remaining = budgetMax ? budgetMax - totalSpent : null
  if (remaining !== null && remaining < 15000) return { count: 0, reason: 'Budget is tight — skip fans for now' }
  if (cpuTdp >= 170) return { count: Math.min(4, maxFans), reason: `High-TDP CPU (${cpuTdp}W) — strong airflow needed` }
  if (cpuTdp >= 125) return { count: Math.min(3, maxFans), reason: `${cpuTdp}W CPU benefits from 3-fan balanced airflow` }
  if (cpuTdp >= 65)  return { count: Math.min(2, maxFans), reason: 'Standard build — 2 fans provide adequate cooling' }
  return { count: 2, reason: 'Basic 2-fan setup for low-power build' }
}

// ─── Fan slot row ─────────────────────────────────────────────────────────────
function FanSlotCard({ slot, component, fanQty, maxFans, aiContext, build, onAdd, onRemove, onQuantityChange }) {
  const colors = CATEGORY_COLORS.FAN
  const aiRec = getFanAiRec(build, aiContext, maxFans)
  const fanPrice = component?.price || 0
  const imageUrl = component?.imageUrl || component?.images?.[0]
  const dependencyMet = !slot.requires || !!build[slot.requires]

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', borderLeft: component ? `4px solid ${colors.border}` : '1px solid #e5e7eb', marginBottom: 10, padding: '14px 16px' }}>
      {/* Dependency warning */}
      {!dependencyMet && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 12 }}>
          <AlertTriangle style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#92400e' }}>Select a Case first to configure fans</span>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wind style={{ width: 19, height: 19, color: colors.icon }} />
        </div>
        {component && imageUrl && (
          <img src={imageUrl} alt={component.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {component ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{component.name}</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{formatPrice(component.price)} per fan</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Case Fans</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Optional — improve airflow</p>
            </>
          )}
        </div>
        {component ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => onQuantityChange(Math.max(1, fanQty - 1))} style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Minus style={{ width: 12, height: 12, color: '#6b7280' }} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', minWidth: 20, textAlign: 'center' }}>{fanQty}</span>
              <button onClick={() => onQuantityChange(Math.min(maxFans, fanQty + 1))} style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus style={{ width: 12, height: 12, color: '#6b7280' }} />
              </button>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>{formatPrice(component.price * fanQty)}</span>
            <button onClick={onAdd} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Change
            </button>
            <button onClick={onRemove} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #fecaca', background: '#fff7f7', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
          </div>
        ) : (
          <button
            onClick={dependencyMet ? onAdd : undefined}
            disabled={!dependencyMet}
            style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #ec4899', background: '#fff', color: '#db2777', fontSize: 13, fontWeight: 600, cursor: dependencyMet ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, opacity: dependencyMet ? 1 : 0.4, flexShrink: 0 }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add
          </button>
        )}
      </div>

      {/* AI recommendation + presets */}
      {dependencyMet && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#eff6ff', borderRadius: 8, marginTop: 12, marginBottom: 10 }}>
            <Zap style={{ width: 13, height: 13, color: '#2563eb', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 500 }}>
              AI recommends <strong>{aiRec.count} fan{aiRec.count !== 1 ? 's' : ''}</strong> — {aiRec.reason}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FAN_PRESETS.filter((p) => p.count === 0 || p.count <= maxFans).map(({ count, label: pLabel, desc }) => {
              const isSelected = component ? fanQty === count : count === 0
              const isRecommended = count === aiRec.count
              const noFan = !component && count > 0
              return (
                <button
                  key={count}
                  onClick={() => {
                    if (noFan) { onAdd(); return }
                    if (count === 0) { onRemove(); return }
                    onQuantityChange(count)
                  }}
                  style={{
                    flex: '1 0 64px', padding: '10px 6px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                    border: isSelected ? '2px solid #2563eb' : isRecommended ? '1.5px dashed #93c5fd' : '1.5px solid #e5e7eb',
                    background: isSelected ? '#eff6ff' : '#fff',
                    color: noFan ? '#9ca3af' : isSelected ? '#1d4ed8' : '#374151',
                    opacity: noFan ? 0.6 : 1,
                  }}
                >
                  <p style={{ fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1 }}>{count}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, margin: '3px 0 1px' }}>{pLabel}</p>
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{desc}</p>
                  {component && count > 0 && <p style={{ fontSize: 10, fontWeight: 600, color: '#059669', margin: '4px 0 0' }}>{formatPrice(count * fanPrice)}</p>}
                  {isRecommended && <p style={{ fontSize: 9, fontWeight: 700, color: '#2563eb', margin: '3px 0 0', letterSpacing: '0.04em' }}>AI PICK</p>}
                </button>
              )
            })}
          </div>
          {component && (
            <button onClick={onAdd} style={{ marginTop: 8, fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Change fan model
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Single slot card ──────────────────────────────────────────────────────────
function SlotCard({ slot, component, dependencyMet, confirmingRemove, onAdd, onRemoveRequest, onConfirmRemove, onCancelRemove }) {
  const { key, label, icon: Icon, required, requires } = slot
  const colors = CATEGORY_COLORS[key] || { bg: '#f1f5f9', icon: '#6b7280', border: '#94a3b8' }
  const filled = !!component
  const imageUrl = component ? (component.imageUrl || component.images?.[0]) : null
  const shortSpec = component ? getShortSpec(component) : null

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e5e7eb',
        borderLeft: filled ? `4px solid ${colors.border}` : '1px solid #e5e7eb',
        marginBottom: 10,
        padding: '14px 16px',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { if (filled) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Dependency warning banner */}
      {requires && !dependencyMet && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 12 }}>
          <AlertTriangle style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#92400e' }}>
            Select {requires === 'MOTHERBOARD' ? 'a Motherboard' : 'a Case'} first
          </span>
        </div>
      )}

      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Category icon in colored box */}
        <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 19, height: 19, color: colors.icon }} />
        </div>

        {/* Component image */}
        {filled && imageUrl && (
          <img src={imageUrl} alt={component.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', flexShrink: 0 }} />
        )}

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filled ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {component.name}
              </p>
              {shortSpec && <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{shortSpec}</p>}
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 12, color: dependencyMet ? '#9ca3af' : '#b45309', margin: '2px 0 0' }}>
                {!dependencyMet ? `Requires ${requires} first` : 'Click to select'}
              </p>
              {required && dependencyMet && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Required</span>
              )}
            </>
          )}
        </div>

        {/* Right side actions */}
        {filled ? (
          confirmingRemove ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Remove?</span>
              <button
                onClick={onConfirmRemove}
                style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >Yes</button>
              <button
                onClick={onCancelRemove}
                style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 12, cursor: 'pointer' }}
              >No</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#2563eb' }}>
                {formatPrice(component.price)}
              </span>
              <button
                onClick={onAdd}
                style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#374151' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#6b7280' }}
              >
                <RefreshCw style={{ width: 12, height: 12 }} /> Change
              </button>
              <button
                onClick={onRemoveRequest}
                title={`Remove ${component.name}`}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fecaca', background: '#fff7f7', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff7f7' }}
              >
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            </div>
          )
        ) : (
          <button
            onClick={dependencyMet ? onAdd : undefined}
            disabled={!dependencyMet}
            style={{
              padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${dependencyMet ? colors.border : '#e5e7eb'}`,
              background: '#fff', color: dependencyMet ? colors.icon : '#9ca3af',
              fontSize: 13, fontWeight: 600, cursor: dependencyMet ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: dependencyMet ? 1 : 0.5,
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { if (dependencyMet) e.currentTarget.style.background = colors.bg }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main builder ─────────────────────────────────────────────────────────────
export default function ConfiguratorBuilder({ aiContext, initialBuild, preSelectSlot, onRestart }) {
  const [build, setBuild] = useState(() => {
    const empty = { CPU: null, MOTHERBOARD: null, GPU: null, RAM: null, STORAGE: null, PSU: null, CASE: null, COOLING: null, FAN: null }
    if (!initialBuild) return empty
    const loaded = {}
    for (const key of Object.keys(empty)) {
      loaded[key] = initialBuild[key] || null
    }
    return loaded
  })
  const [fanQty, setFanQty] = useState(() => initialBuild?.FAN?.quantity || 1)
  const [activeModal, setActiveModal] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null) // slot key

  useEffect(() => {
    if (preSelectSlot?.category) {
      setActiveModal(preSelectSlot.category)
      setHighlightId(preSelectSlot.componentId || null)
    }
  }, []) // eslint-disable-line

  function selectComponent(category, component) {
    setBuild((b) => ({ ...b, [category]: component }))
    setActiveModal(null)
    setHighlightId(null)
  }

  function removeComponent(key) {
    setBuild((b) => ({ ...b, [key]: null }))
    if (key === 'FAN') setFanQty(0)
    setConfirmRemove(null)
  }

  function openSlot(slot) {
    if (slot.requires && !build[slot.requires]) return
    setActiveModal(slot.key)
  }

  const conflicts = getBuildConflicts(build)

  const cpuTdp = parseNum(build.CPU?.specData?.tdp) || 0
  const gpuWatts = build.GPU ? 300 : 0
  const minPsuWattage = cpuTdp + gpuWatts + 150
  const buildTotal = Object.entries(build).reduce((s, [k, c]) => s + (k === 'FAN' ? (c?.price || 0) * fanQty : (c?.price || 0)), 0)
  const budgetMax = aiContext?.budget?.max || 0
  const budgetRemaining = budgetMax > 0 ? budgetMax - buildTotal : null
  const filledCount = Object.values(build).filter(Boolean).length
  const emptySlots = Math.max(1, 9 - filledCount)
  const maxFans = getMaxFans(build.CASE)

  const buildMeta = {
    minPsuWattage,
    cpuTdp,
    gpuWatts,
    cpuSocket: build.CPU?.specData?.socket || null,
    caseFormFactor: build.CASE?.specData?.formFactor || null,
    caseName: build.CASE?.name || null,
    ddrType: build.MOTHERBOARD?.specData?.chipset
      ? (DDR5_CHIPSETS.some((c) => build.MOTHERBOARD.specData.chipset.toUpperCase().includes(c)) ? 'DDR5' : 'DDR4')
      : null,
    budgetRemaining,
    maxFans,
    spentBudget: buildTotal,
    remainingBudget: budgetRemaining,
    emptySlots,
    totalBudget: budgetMax,
    slotBudgetWeights: SLOT_BUDGET_WEIGHTS,
  }

  const nonFanSlots = SLOTS.filter((s) => s.key !== 'FAN')
  const fanSlot = SLOTS.find((s) => s.key === 'FAN')

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7' }}>
      {/* Sticky page header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 32px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>PC Configurator</h1>
            {aiContext?.useCase && (
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                {aiContext.useCase}
                {aiContext?.budget?.max ? ` · Budget up to ${formatPrice(aiContext.budget.max)}` : ' · Flexible budget'}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, background: '#f1f5f9', padding: '5px 14px', borderRadius: 9999 }}>
              {filledCount} / {SLOTS.length} slots
            </span>
            {buildTotal > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>{formatPrice(buildTotal)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* LEFT: component slots */}
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 14, marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Select Components
          </h2>

          {/* 9-segment progress bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {SLOTS.map((slot) => (
              <div
                key={slot.key}
                title={`${slot.label}${build[slot.key] ? ': ' + build[slot.key].name : ''}`}
                style={{
                  flex: 1, height: 6, borderRadius: 9999,
                  background: build[slot.key]
                    ? (CATEGORY_COLORS[slot.key]?.border || '#2563eb')
                    : '#e5e7eb',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          {nonFanSlots.map((slot) => (
            <SlotCard
              key={slot.key}
              slot={slot}
              component={build[slot.key]}
              dependencyMet={!slot.requires || !!build[slot.requires]}
              confirmingRemove={confirmRemove === slot.key}
              onAdd={() => openSlot(slot)}
              onRemoveRequest={() => setConfirmRemove(slot.key)}
              onConfirmRemove={() => removeComponent(slot.key)}
              onCancelRemove={() => setConfirmRemove(null)}
            />
          ))}

          <FanSlotCard
            slot={fanSlot}
            component={build.FAN}
            fanQty={fanQty}
            maxFans={maxFans}
            aiContext={aiContext}
            build={build}
            onAdd={() => openSlot(fanSlot)}
            onRemove={() => { setBuild((b) => ({ ...b, FAN: null })); setFanQty(0) }}
            onQuantityChange={(n) => setFanQty(n)}
          />
        </div>

        {/* RIGHT: build summary */}
        <BuildSummary
          build={build}
          fanQty={fanQty}
          slots={SLOTS}
          conflicts={conflicts}
          aiContext={aiContext}
          onRestart={onRestart}
        />
      </div>

      {/* Component select modal */}
      {activeModal && (
        <ComponentSelectModal
          category={activeModal}
          build={build}
          aiContext={aiContext}
          buildMeta={buildMeta}
          highlightId={highlightId}
          onSelect={(comp) => selectComponent(activeModal, comp)}
          onClose={() => { setActiveModal(null); setHighlightId(null) }}
        />
      )}
    </div>
  )
}
