import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import {
  Cpu, ChevronLeft, Wrench, Info, Trophy, CheckCircle, AlertTriangle,
  Zap, Gamepad2, Monitor, Film, Server, Briefcase, Activity, ArrowRight,
  HardDrive, Wind, Layers,
} from 'lucide-react'
import { componentsApi } from '../api/components'
import { formatPrice, formatCategory } from '../utils/formatters'
import Spinner from '../components/ui/Spinner'

const CATEGORY_BADGE_CLS = {
  CPU: 'badge-blue', GPU: 'badge-red', RAM: 'badge-green', STORAGE: 'badge-yellow',
  MOTHERBOARD: 'badge-blue', PSU: 'badge-yellow', CASE: 'badge-blue', COOLING: 'badge-green', FAN: 'badge-blue',
}

const SPEC_LABELS = {
  coreClock: 'Core Clock', memoryClock: 'Memory Clock', memoryType: 'Memory Type',
  memorySize: 'Memory Size', dimensions: 'Dimensions',
  socket: 'Socket', baseClock: 'Base Clock', boostClock: 'Boost Clock',
  cores: 'Cores', l3Cache: 'L3 Cache', tdp: 'TDP', integratedGraphics: 'Integrated Graphics',
  chipset: 'Chipset', formFactor: 'Form Factor',
  timings: 'Timings', gpuLength: 'Max GPU Length',
  modularity: 'Modularity', power: 'Power', certificate: 'Efficiency Rating',
  waterCooling: 'Water Cooling', noise: 'Noise Level', rgb: 'RGB',
  readSpeed: 'Read Speed', writeSpeed: 'Write Speed',
}

function formatSpecValue(key, value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

// ─── Quick spec tags for right column ────────────────────────────────────────
function getQuickTagData(component) {
  const sd = component.specData || {}
  const { category } = component
  const tags = []

  if (category === 'CPU') {
    if (sd.cores) tags.push(`${sd.cores} Cores`)
    if (sd.boostClock) tags.push(`${sd.boostClock} Boost`)
    if (sd.socket) tags.push(sd.socket)
  } else if (category === 'GPU') {
    if (sd.memorySize && sd.memoryType) tags.push(`${sd.memorySize} ${sd.memoryType}`)
    else if (sd.memorySize) tags.push(`${sd.memorySize} VRAM`)
    if (sd.coreClock) tags.push(`${sd.coreClock} Core`)
  } else if (category === 'RAM') {
    if (sd.memoryType) tags.push(sd.memoryType)
    if (sd.memoryClock) tags.push(String(sd.memoryClock))
    if (sd.timings) tags.push(sd.timings)
  } else if (category === 'STORAGE') {
    if (sd.memoryType) tags.push(sd.memoryType)
    if (sd.readSpeed) tags.push(`R: ${sd.readSpeed}`)
    if (sd.writeSpeed) tags.push(`W: ${sd.writeSpeed}`)
  } else if (category === 'MOTHERBOARD') {
    if (sd.socket) tags.push(sd.socket)
    if (sd.chipset) tags.push(sd.chipset)
    if (sd.formFactor) tags.push(sd.formFactor)
  } else if (category === 'PSU') {
    if (sd.power) tags.push(String(sd.power))
    if (sd.certificate) tags.push(sd.certificate)
    if (sd.modularity) tags.push(sd.modularity)
  } else if (category === 'CASE') {
    if (sd.formFactor) tags.push(sd.formFactor)
    if (sd.gpuLength) tags.push(`Up to ${sd.gpuLength} GPU`)
  } else if (category === 'COOLING') {
    tags.push(sd.waterCooling ? 'Liquid AIO' : 'Air Cooling')
    if (sd.noise) tags.push(String(sd.noise))
  }
  return tags
}

function QuickTags({ component }) {
  const tags = getQuickTagData(component)
  if (tags.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {tags.map((tag) => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 9999, fontSize: 12, fontWeight: 500, padding: '3px 10px' }}>
          {tag}
        </span>
      ))}
    </div>
  )
}

// ─── Use cases helper ─────────────────────────────────────────────────────────
function getUseCases(component) {
  const sd = component.specData || {}
  const { category } = component
  const cases = []

  if (category === 'CPU') {
    const cores = parseInt(sd.cores) || 0
    if (cores >= 16) {
      cases.push({ label: '3D Rendering', icon: Layers, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' })
      cases.push({ label: 'Heavy Multitasking', icon: Server, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
      cases.push({ label: 'Streaming + Gaming', icon: Film, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' })
    } else if (cores >= 8) {
      cases.push({ label: 'Gaming', icon: Gamepad2, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
      cases.push({ label: 'Content Creation', icon: Film, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' })
      cases.push({ label: 'Streaming', icon: Monitor, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' })
    } else if (cores >= 4) {
      cases.push({ label: 'Gaming', icon: Gamepad2, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
      cases.push({ label: 'Office Work', icon: Briefcase, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
    } else {
      cases.push({ label: 'Everyday Computing', icon: Briefcase, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' })
    }
  } else if (category === 'GPU') {
    const vram = parseInt(sd.memorySize) || 0
    if (vram >= 16) {
      cases.push({ label: 'AI/ML Workloads', icon: Activity, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' })
      cases.push({ label: '4K Gaming', icon: Monitor, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
      cases.push({ label: 'Professional Rendering', icon: Layers, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' })
    } else if (vram >= 8) {
      cases.push({ label: '1440p Gaming', icon: Gamepad2, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
      cases.push({ label: 'Video Editing', icon: Film, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
      cases.push({ label: 'Streaming', icon: Monitor, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' })
    } else {
      cases.push({ label: '1080p Gaming', icon: Gamepad2, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
      cases.push({ label: 'Casual Use', icon: Briefcase, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' })
    }
  } else if (category === 'RAM') {
    const sizeMatch = component.name.match(/(\d+)\s*[Gg][Bb]/)
    const gb = sizeMatch ? parseInt(sizeMatch[1]) : 0
    if (gb >= 64) {
      cases.push({ label: 'Workstation', icon: Server, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' })
      cases.push({ label: 'Virtual Machines', icon: Layers, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
    } else if (gb >= 32) {
      cases.push({ label: 'Content Creation', icon: Film, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
      cases.push({ label: 'Gaming', icon: Gamepad2, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
    } else {
      cases.push({ label: 'Everyday Use', icon: Briefcase, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' })
      cases.push({ label: 'Gaming', icon: Gamepad2, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
    }
  } else if (category === 'STORAGE') {
    const type = String(sd.memoryType || '').toLowerCase()
    if (type.includes('nvme') || type.includes('m.2')) {
      cases.push({ label: 'Fast Boot Drive', icon: Zap, color: '#d97706', bg: '#fffbeb', border: '#fcd34d' })
      cases.push({ label: 'Game Storage', icon: Gamepad2, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
    } else {
      cases.push({ label: 'Mass Storage', icon: HardDrive, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' })
      cases.push({ label: 'File Backup', icon: Server, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
    }
  } else if (category === 'MOTHERBOARD') {
    cases.push({ label: 'System Building', icon: Layers, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
    cases.push({ label: 'Upgradeability', icon: ArrowRight, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' })
  } else if (category === 'PSU') {
    const watts = parseInt(sd.power) || 0
    if (watts >= 1000) {
      cases.push({ label: 'Extreme Builds', icon: Zap, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' })
      cases.push({ label: 'Dual GPU', icon: Layers, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
    } else if (watts >= 750) {
      cases.push({ label: 'High-end Gaming', icon: Gamepad2, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
      cases.push({ label: 'Overclocked Builds', icon: Zap, color: '#d97706', bg: '#fffbeb', border: '#fcd34d' })
    } else {
      cases.push({ label: 'Budget Builds', icon: Briefcase, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' })
      cases.push({ label: 'Mid-range PCs', icon: Monitor, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
    }
  } else if (category === 'CASE') {
    cases.push({ label: 'Custom Builds', icon: Wrench, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
    if (sd.waterCooling) cases.push({ label: 'Liquid Cooling', icon: Wind, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' })
    cases.push({ label: 'Showpiece PC', icon: Monitor, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' })
  } else if (category === 'COOLING') {
    if (sd.waterCooling) {
      cases.push({ label: 'Overclocking', icon: Zap, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' })
      cases.push({ label: 'Quiet Operation', icon: Wind, color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' })
    } else {
      cases.push({ label: 'Budget Cooling', icon: Wind, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' })
      cases.push({ label: 'Stock Replacement', icon: Cpu, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' })
    }
  }
  return cases
}

// ─── Compatibility notes helper ────────────────────────────────────────────────
function getCompatibilityNotes(component) {
  const sd = component.specData || {}
  const { category } = component
  const notes = []

  if (category === 'CPU') {
    if (sd.socket) notes.push({ text: `Requires a ${sd.socket} socket motherboard`, ok: true })
    const tdp = parseInt(sd.tdp)
    if (tdp >= 125) notes.push({ text: `High TDP (${sd.tdp}) — use a capable aftermarket CPU cooler`, ok: false })
    else if (sd.tdp) notes.push({ text: `TDP ${sd.tdp} — compatible with most air and AIO coolers`, ok: true })
  } else if (category === 'GPU') {
    const vram = parseInt(sd.memorySize) || 0
    notes.push(vram >= 12
      ? { text: 'High power draw — 750W+ PSU recommended', ok: false }
      : { text: '650W PSU is sufficient for most mid-range builds', ok: true })
    notes.push({ text: 'Verify your case supports the card length before purchasing', ok: false })
    if (sd.memoryType) notes.push({ text: `Uses ${sd.memoryType} video memory — no compatibility concerns`, ok: true })
  } else if (category === 'RAM') {
    if (sd.memoryType) notes.push({ text: `${sd.memoryType} standard — verify motherboard support`, ok: false })
    if (sd.memoryClock) notes.push({ text: `Running at ${sd.memoryClock} requires XMP/EXPO profile in BIOS`, ok: true })
  } else if (category === 'MOTHERBOARD') {
    if (sd.socket) notes.push({ text: `Only compatible with ${sd.socket} processors`, ok: true })
    if (sd.formFactor) notes.push({ text: `${sd.formFactor} form factor — verify case compatibility`, ok: false })
    if (sd.chipset) notes.push({ text: `${sd.chipset} chipset — check supported CPU list before buying`, ok: true })
  } else if (category === 'STORAGE') {
    const type = String(sd.memoryType || '').toUpperCase()
    if (type.includes('NVME') || type.includes('M.2')) {
      notes.push({ text: 'M.2 slot required on motherboard', ok: false })
    } else {
      notes.push({ text: 'SATA interface — compatible with most modern motherboards', ok: true })
    }
  } else if (category === 'PSU') {
    const watts = parseInt(sd.power) || 0
    notes.push({ text: `${watts}W output — calculate system TDP before purchasing`, ok: true })
    if (sd.certificate) notes.push({ text: `${sd.certificate} certified for energy efficiency`, ok: true })
  } else if (category === 'CASE') {
    if (sd.formFactor) notes.push({ text: `Supports ${sd.formFactor} motherboards`, ok: true })
    if (sd.gpuLength) notes.push({ text: `Maximum GPU length: ${sd.gpuLength}`, ok: true })
    if (!sd.waterCooling) notes.push({ text: 'May not support all AIO radiators — verify clearance', ok: false })
  } else if (category === 'COOLING') {
    if (sd.socket) {
      notes.push({ text: `Compatible sockets: ${String(sd.socket).split(',').slice(0, 4).join(', ')}`, ok: true })
    }
    if (sd.waterCooling) notes.push({ text: 'AIO — requires radiator mounting space in case', ok: false })
    else notes.push({ text: 'Air cooler — verify CPU socket compatibility', ok: true })
  }
  return notes
}

// ─── Comparison specs helper ──────────────────────────────────────────────────
function getComparisonSpecs(category) {
  const map = {
    CPU:         [{ label: 'Cores', key: 'cores' }, { label: 'Boost Clock', key: 'boostClock' }, { label: 'TDP', key: 'tdp' }],
    GPU:         [{ label: 'VRAM', key: 'memorySize' }, { label: 'Memory Type', key: 'memoryType' }, { label: 'Core Clock', key: 'coreClock' }],
    RAM:         [{ label: 'Memory Type', key: 'memoryType' }, { label: 'Speed', key: 'memoryClock' }, { label: 'Timings', key: 'timings' }],
    STORAGE:     [{ label: 'Type', key: 'memoryType' }, { label: 'Read Speed', key: 'readSpeed' }, { label: 'Write Speed', key: 'writeSpeed' }],
    MOTHERBOARD: [{ label: 'Socket', key: 'socket' }, { label: 'Chipset', key: 'chipset' }, { label: 'Form Factor', key: 'formFactor' }],
    PSU:         [{ label: 'Wattage', key: 'power' }, { label: 'Rating', key: 'certificate' }, { label: 'Modularity', key: 'modularity' }],
    CASE:        [{ label: 'Form Factor', key: 'formFactor' }, { label: 'Max GPU', key: 'gpuLength' }, { label: 'Liquid Cooling', key: 'waterCooling' }],
    COOLING:     [{ label: 'Type', key: 'waterCooling' }, { label: 'Noise', key: 'noise' }, { label: 'RGB', key: 'rgb' }],
  }
  return map[category] || []
}

// ─── Component performance rating ─────────────────────────────────────────────
function ComponentPerformanceRating({ component }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)
  const cacheKey = `tier-${component.id}`

  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setData(JSON.parse(cached)); setLoading(false); return } catch {}
    }
    api.post('/ai/rate-component', { name: component.name, category: component.category, specData: component.specData, price: component.price })
      .then((r) => r.data)
      .then((d) => {
        if (d.tier) { sessionStorage.setItem(cacheKey, JSON.stringify(d)); setData(d) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [component.id])

  if (loading || !data) return null

  const tierColors = {
    Enthusiast:  { bg: '#f3e8ff', text: '#7c3aed', border: '#d8b4fe' },
    'High-end':  { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
    'Mid-range': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    Budget:      { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
  }
  const colors = tierColors[data.tier] || { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 9999, padding: '5px 14px', fontSize: 13, fontWeight: 700, cursor: 'default' }}
      >
        <Trophy style={{ width: 14, height: 14 }} />
        {data.tier}
        {data.score !== undefined && <span style={{ opacity: 0.7, fontSize: 11 }}>· {data.score}/100</span>}
      </div>
      {showTooltip && data.reasoning && (
        <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 6, width: 240, background: '#1f2937', color: '#f9fafb', fontSize: 12, padding: '10px 12px', borderRadius: 10, zIndex: 50, lineHeight: 1.55, pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          {data.reasoning}
        </div>
      )}
    </div>
  )
}

// ─── AI Description section ───────────────────────────────────────────────────
function AIDescriptionSection({ component }) {
  const [desc, setDesc] = useState(null)
  const [loading, setLoading] = useState(true)
  const cacheKey = `ai-desc-comp-${component.id}`

  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { setDesc(cached); setLoading(false); return }

    api.post('/ai/generate-description', { name: component.name, category: component.category, specData: component.specData, isComponent: true })
      .then((r) => r.data)
      .then((d) => {
        if (d.description) { sessionStorage.setItem(cacheKey, d.description); setDesc(d.description) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [component.id])

  if (!loading && !desc) return null

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Zap style={{ width: 18, height: 18, color: '#2563eb' }} />
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>AI Overview</h2>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[82, 96, 64].map((w) => (
            <div key={w} style={{ height: 15, borderRadius: 6, background: '#f3f4f6', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.75, margin: 0 }}>{desc}</p>
      )}
    </div>
  )
}

// ─── Compatibility notes section ──────────────────────────────────────────────
function CompatibilityNotesSection({ component }) {
  const notes = getCompatibilityNotes(component)
  if (notes.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Compatibility Notes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map((note, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: note.ok ? '#f0fdf4' : '#fffbeb', border: `1px solid ${note.ok ? '#bbf7d0' : '#fcd34d'}`, borderRadius: 10 }}>
            {note.ok
              ? <CheckCircle style={{ width: 16, height: 16, color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
              : <AlertTriangle style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0, marginTop: 1 }} />
            }
            <p style={{ fontSize: 14, color: note.ok ? '#166534' : '#92400e', lineHeight: 1.5, margin: 0 }}>{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Best for section ─────────────────────────────────────────────────────────
function WhoIsThisForSection({ component }) {
  const cases = getUseCases(component)
  if (cases.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Best For</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {cases.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12 }}>
              <Icon style={{ width: 16, height: 16, color: c.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: c.color }}>{c.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── How it compares section ──────────────────────────────────────────────────
function AlternativesSection({ component }) {
  const { data } = useQuery({
    queryKey: ['component-alts', component.id],
    queryFn: () => componentsApi.getAll({ category: component.category, limit: 8 }).then((r) => r.data),
    enabled: !!component.id,
  })

  const alternatives = React.useMemo(() => {
    if (!data?.components) return []
    return data.components
      .filter((c) => c.id !== component.id)
      .sort((a, b) => Math.abs(a.price - component.price) - Math.abs(b.price - component.price))
      .slice(0, 3)
  }, [data, component.id, component.price])

  if (alternatives.length === 0) return null

  const specs = getComparisonSpecs(component.category)
  const allItems = [component, ...alternatives]

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 16 }}>How It Compares</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Specification</th>
              {allItems.map((item, idx) => (
                <th key={item.id} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: idx === 0 ? '#2563eb' : '#111827', borderBottom: '1px solid #e5e7eb', background: idx === 0 ? '#eff6ff' : '#f9fafb' }}>
                  {idx === 0
                    ? <>{item.name} <span style={{ fontSize: 11, fontWeight: 400, color: '#93c5fd' }}>(this)</span></>
                    : item.name}
                </th>
              ))}
            </tr>
            <tr>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #f3f4f6' }}>Price</td>
              {allItems.map((item, idx) => (
                <td key={item.id} style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: idx === 0 ? '#2563eb' : '#374151', borderBottom: '1px solid #f3f4f6', background: idx === 0 ? '#f8fbff' : 'transparent' }}>
                  {formatPrice(item.price)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {specs.map(({ label, key }, i) => (
              <tr key={key} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #f3f4f6' }}>{label}</td>
                {allItems.map((item, idx) => {
                  const val = (item.specData || {})[key]
                  const display = val !== undefined && val !== null && val !== '' ? formatSpecValue(key, val) : '—'
                  return (
                    <td key={item.id} style={{ padding: '10px 16px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6', background: idx === 0 ? '#f8fbff' : 'transparent' }}>
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr>
              <td style={{ padding: '10px 16px' }} />
              {allItems.map((item, idx) => (
                <td key={item.id} style={{ padding: '10px 16px', background: idx === 0 ? '#f8fbff' : 'transparent' }}>
                  {idx !== 0 && (
                    <Link to={`/components/${item.id}`} style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                      View details →
                    </Link>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Similar components section ───────────────────────────────────────────────
function SimilarComponentsSection({ component }) {
  const { data } = useQuery({
    queryKey: ['similar-components', component.id],
    queryFn: () => componentsApi.getAll({ category: component.category, limit: 8 }).then((r) => r.data),
    enabled: !!component.id,
  })

  const components = React.useMemo(() => {
    if (!data?.components) return []
    return data.components
      .filter((c) => c.id !== component.id)
      .sort((a, b) => Math.abs(a.price - component.price) - Math.abs(b.price - component.price))
      .slice(0, 4)
  }, [data, component.id, component.price])

  if (components.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 40, marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>Similar Components</h2>
        <Link
          to={`/components?category=${component.category}`}
          style={{ fontSize: 14, color: '#2563eb', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          View All {formatCategory(component.category)} <ArrowRight style={{ width: 14, height: 14 }} />
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
        {components.map((comp) => {
          const imageUrl = comp.imageUrl || comp.images?.[0]
          return (
            <Link
              key={comp.id}
              to={`/components/${comp.id}`}
              style={{ display: 'block', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16, textDecoration: 'none', transition: 'box-shadow 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, height: 80 }}>
                {imageUrl
                  ? <img src={imageUrl} alt={comp.name} style={{ height: '100%', objectFit: 'contain' }} />
                  : <Cpu style={{ width: 40, height: 40, color: '#e5e7eb', marginTop: 20 }} />}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 6 }}>{comp.name}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', margin: 0 }}>{formatPrice(comp.price)}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ComponentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedImage, setSelectedImage] = useState(0)

  const { data: componentData, isLoading, error } = useQuery({
    queryKey: ['component', id],
    queryFn: () => componentsApi.getOne(id).then((r) => r.data),
    enabled: !!id,
  })

  const component = componentData?.component ?? null
  const usedInProducts = componentData?.usedInBuilds ?? []

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Spinner size="lg" /></div>
  }

  if (error || !component) {
    return (
      <div className="container-page py-20 text-center">
        <div className="card p-10 max-w-md mx-auto">
          <Cpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-gray-900 text-xl font-bold mb-2">Component Not Found</h2>
          <p className="text-gray-500 mb-6">This component doesn't exist or has been removed.</p>
          <Link to="/components" className="btn-primary">Browse Components</Link>
        </div>
      </div>
    )
  }

  const images = [
    ...(component.imageUrl ? [component.imageUrl] : []),
    ...(Array.isArray(component.images) ? component.images : []),
  ]
  const inStock = component.stock > 0
  const brandName = component.manufacturer || component.brand
  const badgeCls = CATEGORY_BADGE_CLS[component.category] ?? 'badge-blue'

  const specSource = component.specData && typeof component.specData === 'object' && !Array.isArray(component.specData)
    ? component.specData
    : component.specs && typeof component.specs === 'object' && !Array.isArray(component.specs)
      ? component.specs
      : {}

  const specEntries = Object.entries(specSource).filter(([, v]) => v !== null && v !== undefined && v !== '')

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-10" style={{ maxWidth: 1200 }}>
      <Link to="/components" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm mb-8 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Back to Components
      </Link>

      {/* Hero grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Left: image */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            {images.length > 0
              ? <img src={images[selectedImage]} alt={component.name} className="max-h-[500px] w-full object-contain" />
              : <div className="flex items-center justify-center w-full h-64"><Cpu className="w-24 h-24 text-gray-200" /></div>}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pt-5 mt-2 border-t border-gray-100">
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-primary-500' : 'border-gray-200 hover:border-gray-400'}`}>
                  <img src={img} alt={`${component.name} ${i + 1}`} className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div className="flex flex-col gap-5">
          {/* Category badge + performance tier */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span className={`badge ${badgeCls} w-fit`}>{formatCategory(component.category)}</span>
            <ComponentPerformanceRating component={component} />
          </div>

          {/* Name */}
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111827', lineHeight: 1.2, margin: 0 }}>
            {component.name}
          </h1>

          {/* Brand · model subtitle */}
          {(brandName || component.model) && (
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0, marginTop: -8 }}>
              {[brandName, component.model].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Quick spec tags */}
          <QuickTags component={component} />

          {/* Price / stock / action block */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#2563eb', lineHeight: 1, marginBottom: 12 }}>
              {formatPrice(component.price)}
            </div>

            <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inStock ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                {inStock ? `In Stock (${component.stock} available)` : 'Out of Stock'}
              </span>
            </div>

            <button
              className="btn-primary w-full justify-center text-base gap-2"
              style={{ height: 52, marginBottom: 12 }}
              onClick={() => {
                localStorage.setItem('preSelectComponent', JSON.stringify({ category: component.category, componentId: component.id }))
                navigate('/build')
              }}
              disabled={!inStock}
            >
              <Wrench className="w-5 h-5" />
              {inStock ? 'Add to Builder' : 'Out of Stock'}
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 10 }}>
              <Info style={{ width: 14, height: 14, color: '#9ca3af', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                This component is available as part of custom PC builds only
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Specs table */}
      {specEntries.length > 0 && (
        <div style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Specifications</h2>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <tbody>
                {specEntries.map(([key, value], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ width: 200, padding: '12px 20px', color: '#6b7280', fontWeight: 500, fontSize: 14, borderRight: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                      {SPEC_LABELS[key] || key.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '12px 20px', color: '#111827', fontSize: 14 }}>
                      {formatSpecValue(key, value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <AIDescriptionSection component={component} />
        <CompatibilityNotesSection component={component} />
        <WhoIsThisForSection component={component} />
        <AlternativesSection component={component} />

        {usedInProducts.length > 0 && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 20 }}>Used in These Builds</h2>
            <div className="flex flex-wrap gap-4">
              {usedInProducts.map((prod) => (
                <Link
                  key={prod.id}
                  to={`/products/${prod.id}`}
                  className="group block bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all"
                  style={{ padding: 16, minWidth: 220, maxWidth: 280, flex: '1 1 220px' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      {prod.images?.[0]
                        ? <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                        : <Cpu className="w-8 h-8 text-gray-200" />}
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontWeight: 500, fontSize: 14, color: '#111827' }} className="truncate">{prod.name}</p>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#2563eb', marginTop: 4 }}>{formatPrice(prod.price)}</p>
                      <p style={{ fontSize: 13, color: '#2563eb', marginTop: 4 }}>View Build →</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <SimilarComponentsSection component={component} />
    </div>
  )
}
