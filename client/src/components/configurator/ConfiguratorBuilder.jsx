import { useState, useEffect, Fragment } from 'react'
import { Cpu, Monitor, HardDrive, CircuitBoard, Zap, Box, Wind, MemoryStick, Plus, Trash2, RefreshCw, AlertTriangle, Check } from 'lucide-react'
import ComponentSelectModal from './ComponentSelectModal'
import BuildSummary from './BuildSummary'
import { formatPrice, addSpecSuffix, formatStorageSize } from '../../utils/formatters'
import api from '../../api/client'

const SLOTS = [
  { key: 'CPU',         label: 'CPU',          icon: Cpu,          required: true  },
  { key: 'MOTHERBOARD', label: 'Motherboard',  icon: CircuitBoard, required: true  },
  { key: 'GPU',         label: 'GPU (Optional)', icon: Monitor },
  { key: 'RAM',         label: 'RAM',          icon: MemoryStick,  required: true,  requires: 'MOTHERBOARD' },
  { key: 'STORAGE',     label: 'Storage',      icon: HardDrive,    required: true  },
  { key: 'PSU',         label: 'PSU',          icon: Zap,          required: true  },
  { key: 'CASE',        label: 'Case',         icon: Box,          required: true  },
  { key: 'COOLING',     label: 'CPU Cooling',  icon: Wind,         required: true,  requires: 'CASE' },
  { key: 'FAN',         label: 'Case Fans',    icon: Wind,         required: false, requires: 'CASE' },
]

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

const FILL_BUTTON_STYLE = {
  marginTop: 10, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #2563eb',
  background: '#fff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 0.12s',
}

const DDR5_CHIPSETS = ['X670', 'X870', 'B650', 'B850', 'Z790', 'B760', 'Z690', 'B760M', 'H770']
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

function parseFanPackCount(name) {
  const m = String(name || '').match(/(\d+)-Pack/i)
  return m ? parseInt(m[1], 10) : 1
}

function getBuildConflicts(build) {
  const conflicts = []
  const { CPU, MOTHERBOARD, RAM, CASE, GPU, COOLING } = build
  if (CPU && MOTHERBOARD) {
    if (CPU.specData?.socket && MOTHERBOARD.specData?.socket && CPU.specData.socket !== MOTHERBOARD.specData.socket)
      conflicts.push(`CPU (${CPU.specData.socket}) incompatible with motherboard (${MOTHERBOARD.specData.socket})`)
  }
  if (RAM && MOTHERBOARD) {
    const exp = MOTHERBOARD.specData?.supportedRamType
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

function getShortSpec(component) {
  const sd = component.specData || {}
  switch (component.category) {
    case 'CPU':         return sd.cores ? `${sd.cores} cores · ${sd.boostClock || sd.baseClock || ''}`.trim().replace(/ ·\s*$/, '') : ''
    case 'GPU':         return sd.memorySize ? `${sd.memorySize} ${sd.memoryType || ''}`.trim() : ''
    case 'RAM': {
      const kitStr = sd.kitSize && sd.stickSize ? `${sd.kitSize}×${sd.stickSize}GB` : addSpecSuffix('RAM', 'memorySize', sd.memorySize)
      return kitStr ? `${kitStr} ${sd.memoryType || ''} ${sd.memoryClock ? addSpecSuffix('RAM', 'memoryClock', sd.memoryClock) : ''}`.trim() : ''
    }
    case 'STORAGE':     return sd.memorySize ? `${formatStorageSize(sd.memorySize)} ${sd.memoryType || 'NVMe'}`.trim() : ''
    case 'MOTHERBOARD': return [sd.socket, sd.chipset, sd.formFactor].filter(Boolean).join(' · ')
    case 'PSU':         return [sd.power && addSpecSuffix('PSU', 'power', sd.power), sd.certificate].filter(Boolean).join(' · ')
    case 'CASE':        return sd.formFactor || ''
    case 'COOLING':     return sd.waterCooling ? 'AIO Liquid Cooler' : 'Air Cooling'
    case 'FAN':         return [sd.dimensions && addSpecSuffix('FAN', 'dimensions', sd.dimensions), sd.rgb && 'RGB'].filter(Boolean).join(' · ')
    default:            return ''
  }
}

function getMaxStorageSlots(motherboard) {
  const m2 = Number(motherboard?.specData?.m2Slots)
  const sata = Number(motherboard?.specData?.sataSlots)
  return (Number.isFinite(m2) ? m2 : 2) + (Number.isFinite(sata) ? sata : 4)
}

function getMaxFans(caseComp) {
  if (!caseComp) return 4
  const ff = (caseComp.specData?.formFactor || '').toLowerCase()
  if (ff.includes('full') || ff.includes('eatx') || ff.includes('e-atx')) return 6
  if (ff.includes('matx') || ff.includes('micro')) return 3
  if (ff.includes('itx') || ff.includes('mini')) return 2
  return 4
}

function getFanAiRec(cpuTdp, budgetMax, buildTotal, maxFans, purpose) {
  const remaining = budgetMax ? budgetMax - buildTotal : null
  if (remaining !== null && remaining < 15000) return { count: 1, reason: 'Budget is tight — 1 fan minimum for basic airflow' }
  const purposeLower = (purpose || '').toLowerCase()
  const isIntensive = purposeLower.includes('gaming') || purposeLower.includes('rendering') || purposeLower.includes('work')
  if (cpuTdp >= 170 || (isIntensive && cpuTdp >= 125)) return { count: maxFans, reason: `Recommend ${maxFans} fans for optimal airflow with your ${cpuTdp}W CPU` }
  if (isIntensive && cpuTdp >= 65) return { count: Math.max(2, maxFans - 1), reason: `Recommend ${Math.max(2, maxFans - 1)} fans for good airflow with your ${cpuTdp}W CPU` }
  if (cpuTdp >= 125) return { count: Math.min(3, maxFans), reason: `Recommend ${Math.min(3, maxFans)} fans — ${cpuTdp}W CPU benefits from balanced airflow` }
  if (cpuTdp >= 65)  return { count: Math.min(2, maxFans), reason: 'Recommend 2 fans for adequate cooling on this build' }
  return { count: 2, reason: 'Recommend 2 fans for basic low-power build airflow' }
}

function RamSlotsCard({ motherboard, ramKits, onAddKit, onRemoveKit, onFillSlots, aiContext, budgetRemaining }) {
  const colors = CATEGORY_COLORS.RAM
  const ramSlots = motherboard?.specData?.ramSlots || 4
  const maxRamSpeed = motherboard?.specData?.maxRamSpeed || ''
  const supportedRamType = motherboard?.specData?.supportedRamType || ''
  const filledSlots = Math.min(ramSlots, ramKits.reduce((s, k) => s + k.sticksUsed, 0))
  const totalGB = ramKits.reduce((s, k) => s + (parseNum(k.component.specData?.memorySize) || 0), 0)
  const dependencyMet = !!motherboard
  const canAddMore = dependencyMet && filledSlots < ramSlots
  const hasKits = ramKits.length > 0

  const lastKit = ramKits[ramKits.length - 1]
  const fillSticks = lastKit ? (lastKit.component.specData?.sticksInKit || lastKit.sticksUsed || 2) : 0
  const kitsNeeded = fillSticks > 0 ? Math.floor((ramSlots - filledSlots) / fillSticks) : 0
  const fillCost = lastKit ? kitsNeeded * lastKit.component.price : 0

  const [ramRec, setRamRec] = useState(null)
  const [ramRecLoading, setRamRecLoading] = useState(false)

  useEffect(() => {
    if (!motherboard?.specData?.ramSlots) { setRamRec(null); return }
    let cancelled = false
    setRamRecLoading(true)
    api.post('/ai/ram-recommendation', {
      aiContext,
      motherboard: { specData: motherboard.specData },
      budget: budgetRemaining,
    })
      .then((res) => { if (!cancelled) setRamRec(res.data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRamRecLoading(false) })
    return () => { cancelled = true }
  }, [motherboard?.id]) // eslint-disable-line

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', borderLeft: hasKits ? `4px solid ${colors.border}` : '1px solid #e5e7eb', marginBottom: 10, padding: '14px 16px' }}>
      {/* Dependency warning */}
      {!dependencyMet && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 12 }}>
          <AlertTriangle style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#92400e' }}>Select a Motherboard first to configure RAM</span>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MemoryStick style={{ width: 19, height: 19, color: colors.icon }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>RAM</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
            {dependencyMet && (supportedRamType || maxRamSpeed)
              ? [supportedRamType, maxRamSpeed && `up to ${maxRamSpeed}`].filter(Boolean).join(' · ')
              : 'Select Motherboard first'}
          </p>
          {!hasKits && dependencyMet && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Required</span>
          )}
        </div>
        {canAddMore && (
          <button
            onClick={onAddKit}
            style={{ padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${colors.border}`, background: '#fff', color: colors.icon, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, transition: 'background 0.12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add RAM
          </button>
        )}
        {!canAddMore && !dependencyMet && (
          <button
            disabled
            style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: 0.5 }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add RAM
          </button>
        )}
      </div>

      {/* Slot dots + status */}
      {dependencyMet && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {Array.from({ length: ramSlots }).map((_, i) => (
              <div
                key={i}
                style={{ width: 18, height: 18, borderRadius: '50%', background: i < filledSlots ? colors.border : '#e5e7eb', transition: 'background 0.2s', flexShrink: 0 }}
              />
            ))}
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
              {filledSlots}/{ramSlots} slots filled{totalGB > 0 ? ` · ${totalGB}GB total` : ''}
            </span>
          </div>

          {/* AI RAM recommendation */}
          {(ramRecLoading || ramRec) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', background: '#eff6ff', borderRadius: 8, marginBottom: 10 }}>
              <Zap style={{ width: 13, height: 13, color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
              {ramRecLoading ? (
                <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 500 }}>AI is calculating RAM recommendation...</span>
              ) : (
                <div>
                  <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>
                    AI recommends: {ramRec.recommendedSlots} sticks × {ramRec.capacityPerStick} {ramRec.speed} = {ramRec.totalCapacity} total
                  </span>
                  {ramRec.reason && (
                    <p style={{ fontSize: 11, color: '#3b82f6', margin: '2px 0 0', lineHeight: 1.4 }}>{ramRec.reason}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {hasKits ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ramKits.map((kit, idx) => {
                const imageUrl = kit.component.imageUrl || kit.component.images?.[0]
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                    {imageUrl && (
                      <img src={imageUrl} alt={kit.component.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, background: '#fff', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kit.component.name}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
                        {kit.sticksUsed} slot{kit.sticksUsed !== 1 ? 's' : ''} · {formatPrice(kit.component.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveKit(idx)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #fecaca', background: '#fff7f7', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff7f7' }}
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>No RAM added yet — click "Add RAM" to get started</p>
          )}

          {hasKits && canAddMore && kitsNeeded >= 1 && (
            <button
              onClick={() => onFillSlots(lastKit.component, kitsNeeded)}
              style={FILL_BUTTON_STYLE}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Fill all slots with same kit (+{kitsNeeded} kit{kitsNeeded !== 1 ? 's' : ''} • +{formatPrice(fillCost)})
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FanPacksCard({ caseComp, fanPacks, maxFans, aiContext, cpuTdp, buildTotal, onAddPack, onRemovePack, onFillSlots }) {
  const colors = CATEGORY_COLORS.FAN
  const installedFans = fanPacks.reduce((s, p) => s + p.count, 0)
  const dependencyMet = !!caseComp
  const canAddMore = dependencyMet && installedFans < maxFans
  const hasPacks = fanPacks.length > 0
  const budgetMax = aiContext?.budget?.max || null
  const aiRec = getFanAiRec(cpuTdp, budgetMax, buildTotal, maxFans, aiContext?.purpose || aiContext?.useCase)
  const allFull = dependencyMet && installedFans >= maxFans && maxFans > 0

  const lastPack = fanPacks[fanPacks.length - 1]
  const packSize = lastPack ? (lastPack.count || parseFanPackCount(lastPack.component.name)) : 0
  const packsNeeded = packSize > 0 ? Math.ceil((maxFans - installedFans) / packSize) : 0
  const fillCost = lastPack ? packsNeeded * lastPack.component.price : 0

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', borderLeft: hasPacks ? `4px solid ${colors.border}` : '1px solid #e5e7eb', marginBottom: 10, padding: '14px 16px' }}>
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Case Fans</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Optional — improve airflow</p>
        </div>
        {canAddMore && (
          <button
            onClick={onAddPack}
            style={{ padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${colors.border}`, background: '#fff', color: colors.icon, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, transition: 'background 0.12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add Case Fan
          </button>
        )}
        {!canAddMore && !dependencyMet && (
          <button
            disabled
            style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: 0.5 }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add Case Fan
          </button>
        )}
      </div>

      {/* Slot dots + status + packs */}
      {dependencyMet && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {Array.from({ length: maxFans }).map((_, i) => (
              <div
                key={i}
                style={{ width: 18, height: 18, borderRadius: '50%', background: i < installedFans ? colors.border : '#e5e7eb', transition: 'background 0.2s', flexShrink: 0 }}
              />
            ))}
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
              {installedFans}/{maxFans} fans installed
            </span>
          </div>

          {/* AI recommendation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#eff6ff', borderRadius: 8, marginBottom: hasPacks ? 10 : 0 }}>
            <Zap style={{ width: 13, height: 13, color: '#2563eb', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 500 }}>
              AI recommends <strong>{aiRec.count} fan{aiRec.count !== 1 ? 's' : ''}</strong> — {aiRec.reason}
            </span>
          </div>

          {/* Fan pack list */}
          {hasPacks && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {fanPacks.map((pack, idx) => {
                const imageUrl = pack.component.imageUrl || pack.component.images?.[0]
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: 8 }}>
                    {imageUrl && (
                      <img src={imageUrl} alt={pack.component.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, background: '#fff', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pack.component.name}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
                        {pack.count} fan{pack.count !== 1 ? 's' : ''} · {formatPrice(pack.component.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemovePack(idx)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #fecaca', background: '#fff7f7', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff7f7' }}
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {hasPacks && canAddMore && packsNeeded >= 1 && (
            <button
              onClick={() => onFillSlots(lastPack.component, packsNeeded)}
              style={FILL_BUTTON_STYLE}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Fill remaining slots with same fan (+{packsNeeded} pack{packsNeeded !== 1 ? 's' : ''} • +{formatPrice(fillCost)})
            </button>
          )}

          {allFull && (
            <p style={{ fontSize: 12, color: '#059669', fontWeight: 500, marginTop: 8, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check style={{ width: 12, height: 12 }} /> All fan slots filled
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function StorageSlotsCard({ storageItems, maxStorageSlots, onAdd, onRemove }) {
  const colors = CATEGORY_COLORS.STORAGE
  const installed = storageItems.length
  const canAddMore = installed < maxStorageSlots
  const hasItems = installed > 0

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', borderLeft: hasItems ? `4px solid ${colors.border}` : '1px solid #e5e7eb', marginBottom: 10, padding: '14px 16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <HardDrive style={{ width: 19, height: 19, color: colors.icon }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Storage</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Up to {maxStorageSlots} drives</p>
          {!hasItems && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Required</span>
          )}
        </div>
        {canAddMore ? (
          <button
            onClick={onAdd}
            style={{ padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${colors.border}`, background: '#fff', color: colors.icon, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, transition: 'background 0.12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add Storage
          </button>
        ) : (
          <button
            disabled
            style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#9ca3af', fontSize: 13, fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: 0.5 }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add Storage
          </button>
        )}
      </div>

      {/* Slot dots + status */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          {Array.from({ length: maxStorageSlots }).map((_, i) => (
            <div
              key={i}
              style={{ width: 18, height: 18, borderRadius: '50%', background: i < installed ? colors.border : '#e5e7eb', transition: 'background 0.2s', flexShrink: 0 }}
            />
          ))}
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
            {installed}/{maxStorageSlots} slots used
          </span>
        </div>

        {hasItems ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {storageItems.map((item, idx) => {
              const imageUrl = item.component.imageUrl || item.component.images?.[0]
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
                  {imageUrl && (
                    <img src={imageUrl} alt={item.component.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, background: '#fff', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.component.name}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>{formatPrice(item.component.price)}</p>
                  </div>
                  <button
                    onClick={() => onRemove(idx)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #fecaca', background: '#fff7f7', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff7f7' }}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>No storage added yet — click "Add Storage" to get started</p>
        )}
      </div>
    </div>
  )
}

function CoolingHint({ cpuTdp, cooler }) {
  if (!cpuTdp) return null
  if (!cooler) {
    return (
      <div style={{ margin: '-4px 0 10px', padding: '7px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1d4ed8', fontWeight: 500 }}>
        Your CPU TDP is {cpuTdp}W — minimum cooler rating: {cpuTdp}W recommended
      </div>
    )
  }
  const coolerTdp = parseNum(cooler.specData?.tdp) || 0
  if (!coolerTdp) return null
  let style = null
  let text = null
  if (coolerTdp >= cpuTdp * 2) {
    style = { background: '#f0fdf4', color: '#059669' }
    text = '✓ Excellent cooling headroom'
  } else if (coolerTdp >= cpuTdp * 1.5) {
    style = { background: '#f0fdf4', color: '#059669' }
    text = '✓ Adequate cooling'
  } else if (coolerTdp < cpuTdp) {
    style = { background: '#fffbeb', color: '#b45309' }
    text = `⚠ Cooler TDP (${coolerTdp}W) is below CPU TDP (${cpuTdp}W)`
  }
  if (!text) return null
  return (
    <div style={{ margin: '-4px 0 10px', padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, ...style }}>
      {text}
    </div>
  )
}

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
        <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 19, height: 19, color: colors.icon }} />
        </div>

        {filled && imageUrl && (
          <img src={imageUrl} alt={component.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', flexShrink: 0 }} />
        )}

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

export default function ConfiguratorBuilder({ aiContext, initialBuild, preSelectSlot, onRestart }) {
  const [build, setBuild] = useState(() => {
    const empty = { CPU: null, MOTHERBOARD: null, GPU: null, PSU: null, CASE: null, COOLING: null }
    if (!initialBuild) return empty
    const loaded = {}
    for (const key of Object.keys(empty)) {
      loaded[key] = initialBuild[key] || null
    }
    return loaded
  })

  const [storageItems, setStorageItems] = useState(() => {
    if (!initialBuild?.STORAGE) return []
    const st = initialBuild.STORAGE
    if (Array.isArray(st)) return st
    return [{ component: st }]
  })

  const [ramKits, setRamKits] = useState(() => {
    if (!initialBuild?.RAM) return []
    const ram = initialBuild.RAM
    if (Array.isArray(ram)) return ram
    return [{ component: ram, sticksUsed: ram.specData?.sticksInKit || 2 }]
  })

  const [fanPacks, setFanPacks] = useState(() => {
    if (!initialBuild?.FAN) return []
    const fan = initialBuild.FAN
    if (Array.isArray(fan)) return fan
    return [{ component: fan, count: fan.quantity || 1 }]
  })

  const [activeModal, setActiveModal] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [gpuSkipped, setGpuSkipped] = useState(false)

  useEffect(() => {
    if (preSelectSlot?.category) {
      setActiveModal(preSelectSlot.category)
      setHighlightId(preSelectSlot.componentId || null)
    }
  }, []) // eslint-disable-line

  const maxFans = getMaxFans(build.CASE)
  const maxStorageSlots = getMaxStorageSlots(build.MOTHERBOARD)
  const ramSlotsDefined = build.MOTHERBOARD?.specData?.ramSlots || 4
  const filledRamSlots = Math.min(ramSlotsDefined, ramKits.reduce((s, k) => s + k.sticksUsed, 0))
  const totalRamGB = ramKits.reduce((s, k) => s + (parseNum(k.component.specData?.memorySize) || 0), 0)
  const installedFans = fanPacks.reduce((s, p) => s + p.count, 0)
  const cpuTdp = parseNum(build.CPU?.specData?.tdp) || 0
  const gpuWatts = build.GPU ? 300 : 0
  const minPsuWattage = cpuTdp + gpuWatts + 150

  const cpuIgpu = build.CPU?.specData?.integratedGraphics
  const cpuHasIgpu = !!cpuIgpu && cpuIgpu !== 'No'

  const buildTotal =
    Object.values(build).reduce((s, c) => s + (c?.price || 0), 0) +
    ramKits.reduce((s, k) => s + k.component.price, 0) +
    fanPacks.reduce((s, p) => s + p.component.price, 0) +
    storageItems.reduce((s, it) => s + it.component.price, 0)

  const budgetMax = aiContext?.budget?.max || 0
  const budgetRemaining = budgetMax > 0 ? budgetMax - buildTotal : null

  const filledCount =
    Object.values(build).filter(Boolean).length +
    (ramKits.length > 0 ? 1 : 0) +
    (fanPacks.length > 0 ? 1 : 0) +
    (storageItems.length > 0 ? 1 : 0)
  const emptySlots = Math.max(1, 9 - filledCount)

  const buildForChecks = {
    ...build,
    RAM: ramKits[0]?.component || null,
    FAN: fanPacks[0]?.component || null,
    STORAGE: storageItems[0]?.component || null,
  }

  const conflicts = getBuildConflicts(buildForChecks)

  function slotFilled(key) {
    if (key === 'RAM') return ramKits.length > 0
    if (key === 'FAN') return fanPacks.length > 0
    if (key === 'STORAGE') return storageItems.length > 0
    return !!build[key]
  }

  const buildMeta = {
    minPsuWattage,
    cpuTdp,
    gpuWatts,
    cpuSocket: build.CPU?.specData?.socket || null,
    caseFormFactor: build.CASE?.specData?.formFactor || null,
    caseName: build.CASE?.name || null,
    formFactor: build.CASE?.specData?.formFactor || null,
    ddrType: build.MOTHERBOARD?.specData?.supportedRamType
      || (build.MOTHERBOARD?.specData?.chipset
        ? (DDR5_CHIPSETS.some((c) => build.MOTHERBOARD.specData.chipset.toUpperCase().includes(c)) ? 'DDR5' : 'DDR4')
        : null),
    budgetRemaining,
    maxFans,
    maxStorageSlots,
    installedStorage: storageItems.length,
    installedFans,
    spentBudget: buildTotal,
    remainingBudget: budgetRemaining,
    emptySlots,
    totalBudget: budgetMax,
    slotBudgetWeights: SLOT_BUDGET_WEIGHTS,
    ramSlots: ramSlotsDefined,
    maxRamSpeed: build.MOTHERBOARD?.specData?.maxRamSpeed || '',
    supportedRamType: build.MOTHERBOARD?.specData?.supportedRamType || '',
    filledRamSlots,
    totalRamGB,
  }

  function selectComponent(category, component) {
    if (category === 'RAM') {
      const sticksUsed = component.specData?.sticksInKit || 2
      setRamKits((kits) => [...kits, { component, sticksUsed }])
    } else if (category === 'FAN') {
      const count = parseFanPackCount(component.name)
      setFanPacks((packs) => [...packs, { component, count }])
    } else if (category === 'STORAGE') {
      setStorageItems((items) => [...items, { component }])
    } else {
      if (category === 'MOTHERBOARD') {
        setRamKits([])
        const newMax = getMaxStorageSlots(component)
        setStorageItems((items) => items.slice(0, newMax))
      }
      if (category === 'CPU') {
        const ig = component.specData?.integratedGraphics
        if (!ig || ig === 'No') setGpuSkipped(false)
      }
      if (category === 'GPU') setGpuSkipped(false)
      setBuild((b) => ({ ...b, [category]: component }))
    }
    setActiveModal(null)
    setHighlightId(null)
  }

  function fillRamSlots(component, count) {
    const sticksUsed = component.specData?.sticksInKit || 2
    setRamKits((kits) => [...kits, ...Array.from({ length: count }, () => ({ component, sticksUsed }))])
  }

  function fillFanSlots(component, count) {
    const packCount = parseFanPackCount(component.name)
    setFanPacks((packs) => [...packs, ...Array.from({ length: count }, () => ({ component, count: packCount }))])
  }

  function removeComponent(key) {
    setBuild((b) => ({ ...b, [key]: null }))
    if (key === 'MOTHERBOARD') setRamKits([])
    if (key === 'CASE') setFanPacks([])
    if (key === 'CPU') setGpuSkipped(false)
    setConfirmRemove(null)
  }

  function openSlot(slot) {
    if (slot.key === 'RAM' && !build.MOTHERBOARD) return
    if (slot.requires && !build[slot.requires]) return
    setActiveModal(slot.key)
  }

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
                title={`${slot.label}${slotFilled(slot.key) ? ': filled' : ''}`}
                style={{
                  flex: 1, height: 6, borderRadius: 9999,
                  background: slotFilled(slot.key)
                    ? (CATEGORY_COLORS[slot.key]?.border || '#2563eb')
                    : '#e5e7eb',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          {/* Slots — RAM, STORAGE and FAN rendered with custom cards */}
          {SLOTS.filter((s) => s.key !== 'FAN').map((slot) => {
            if (slot.key === 'RAM') {
              return (
                <RamSlotsCard
                  key="RAM"
                  motherboard={build.MOTHERBOARD}
                  ramKits={ramKits}
                  onAddKit={() => openSlot(slot)}
                  onRemoveKit={(idx) => setRamKits((k) => k.filter((_, i) => i !== idx))}
                  onFillSlots={fillRamSlots}
                  aiContext={aiContext}
                  budgetRemaining={budgetRemaining}
                />
              )
            }
            if (slot.key === 'STORAGE') {
              return (
                <StorageSlotsCard
                  key="STORAGE"
                  storageItems={storageItems}
                  maxStorageSlots={maxStorageSlots}
                  onAdd={() => setActiveModal('STORAGE')}
                  onRemove={(idx) => setStorageItems((s) => s.filter((_, i) => i !== idx))}
                />
              )
            }
            if (slot.key === 'GPU') {
              if (gpuSkipped && !build.GPU) {
                return (
                  <div key="GPU" style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', marginBottom: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Monitor style={{ width: 19, height: 19, color: '#9ca3af' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', margin: 0 }}>GPU (Optional)</p>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', background: '#e5e7eb', padding: '2px 8px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Skipped</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Using integrated graphics</p>
                      </div>
                      <button
                        onClick={() => setGpuSkipped(false)}
                        style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, transition: 'background 0.12s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                      >
                        <Plus style={{ width: 14, height: 14 }} /> Add GPU
                      </button>
                    </div>
                  </div>
                )
              }
              return (
                <Fragment key="GPU">
                  <SlotCard
                    slot={slot}
                    component={build.GPU}
                    dependencyMet={true}
                    confirmingRemove={confirmRemove === 'GPU'}
                    onAdd={() => openSlot(slot)}
                    onRemoveRequest={() => setConfirmRemove('GPU')}
                    onConfirmRemove={() => removeComponent('GPU')}
                    onCancelRemove={() => setConfirmRemove(null)}
                  />
                  {cpuHasIgpu && !build.GPU && (
                    <div style={{ margin: '-4px 0 10px', padding: '8px 12px', background: '#eff6ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 500 }}>Your CPU has integrated graphics — GPU is optional</span>
                      <button
                        onClick={() => setGpuSkipped(true)}
                        style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        Skip GPU →
                      </button>
                    </div>
                  )}
                </Fragment>
              )
            }
            return (
              <Fragment key={slot.key}>
                <SlotCard
                  slot={slot}
                  component={build[slot.key]}
                  dependencyMet={!slot.requires || !!build[slot.requires]}
                  confirmingRemove={confirmRemove === slot.key}
                  onAdd={() => openSlot(slot)}
                  onRemoveRequest={() => setConfirmRemove(slot.key)}
                  onConfirmRemove={() => removeComponent(slot.key)}
                  onCancelRemove={() => setConfirmRemove(null)}
                />
                {slot.key === 'COOLING' && <CoolingHint cpuTdp={cpuTdp} cooler={build.COOLING} />}
              </Fragment>
            )
          })}

          <FanPacksCard
            caseComp={build.CASE}
            fanPacks={fanPacks}
            maxFans={maxFans}
            aiContext={aiContext}
            cpuTdp={cpuTdp}
            buildTotal={buildTotal}
            onAddPack={() => setActiveModal('FAN')}
            onRemovePack={(idx) => setFanPacks((p) => p.filter((_, i) => i !== idx))}
            onFillSlots={fillFanSlots}
          />
        </div>

        {/* RIGHT: build summary */}
        <BuildSummary
          build={build}
          ramKits={ramKits}
          fanPacks={fanPacks}
          storageItems={storageItems}
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
          build={buildForChecks}
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
