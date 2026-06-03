import { useState, useEffect, useRef } from 'react'
import { Gamepad2, Box, Briefcase, Monitor, MessageSquare, ChevronLeft, ArrowRight, Check } from 'lucide-react'
import { formatPrice } from '../../utils/formatters'

const USE_CASES = [
  { key: 'Gaming',       label: 'Gaming',                     icon: Gamepad2,      desc: 'High FPS, smooth gameplay' },
  { key: '3D Design',   label: '3D Design & Rendering',      icon: Box,           desc: 'Blender, Cinema 4D, Maya' },
  { key: 'Professional',label: 'Professional Workstation',    icon: Briefcase,     desc: 'Video editing, ML, CAD' },
  { key: 'Office',      label: 'Office & Productivity',      icon: Monitor,       desc: 'Documents, calls, browsing' },
  { key: 'Other',       label: 'Other',                      icon: MessageSquare, desc: 'Tell us what you need' },
]

const STEP2_OPTIONS = {
  Gaming:       { label: 'Which games do you play?',  items: ['CS2', 'Valorant', 'Dota 2', 'Call of Duty', 'Minecraft', 'Cyberpunk 2077'] },
  '3D Design':  { label: 'What software do you use?', items: ['Blender', 'Cinema 4D', 'Maya', '3ds Max', 'ZBrush'] },
  Professional: { label: 'What is your profession?',  items: ['Video Editor', 'Data Scientist / ML', 'Architect / CAD', 'Software Developer', 'Photographer'] },
  Office:       { label: 'What tasks do you do?',     items: ['Documents', 'Video calls', 'Web browsing', 'Excel / Accounting'] },
}

const RESOLUTION_OPTIONS = [
  { key: '1080p/High',  label: '1080p / High Settings',    desc: 'Best value for money' },
  { key: '1440p/Ultra', label: '1440p / Ultra Settings',   desc: 'Sweet spot for enthusiasts' },
  { key: '4K/Max',      label: '4K / Maximum Quality',     desc: 'No compromises' },
  { key: 'AI',          label: "Not Sure — Let AI Decide", desc: "We'll pick the best for you" },
]

const BUDGET_MIN = 50000
const BUDGET_MAX = 3000000
const BUDGET_STEP = 5000

const PRESETS = [
  { label: '150K', value: 150000 },
  { label: '300K', value: 300000 },
  { label: '500K', value: 500000 },
  { label: '1M',   value: 1000000 },
  { label: 'No limit', value: BUDGET_MAX },
]

function getBudgetColor(maxVal) {
  const pct = (maxVal - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)
  if (pct < 0.33) return '#22c55e'
  if (pct < 0.67) return '#f59e0b'
  return '#ef4444'
}

function DualSlider({ minVal, maxVal, onChange }) {
  const minPct = ((minVal - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100
  const maxPct = ((maxVal - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100
  const trackColor = getBudgetColor(maxVal)

  return (
    <div className="dual-slider-wrap">
      <style>{`
        .dual-slider-wrap{position:relative;height:36px;display:flex;align-items:center}
        .dual-slider-track{position:absolute;left:0;right:0;height:6px;background:#e5e7eb;border-radius:9999px}
        .dual-slider-fill{position:absolute;height:100%;border-radius:9999px;transition:background 0.3s}
        .dual-slider-wrap input[type=range]{position:absolute;width:100%;height:0;-webkit-appearance:none;appearance:none;background:transparent;pointer-events:none;outline:none}
        .dual-slider-wrap input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;pointer-events:all;cursor:grab;width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25)}
        .dual-slider-wrap input[type=range]::-moz-range-thumb{pointer-events:all;cursor:grab;width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25)}
      `}</style>
      <div className="dual-slider-track">
        <div className="dual-slider-fill" style={{ left: `${minPct}%`, right: `${100 - maxPct}%`, background: trackColor }} />
      </div>
      <input type="range" min={BUDGET_MIN} max={BUDGET_MAX} step={BUDGET_STEP} value={minVal}
        onChange={(e) => onChange([Math.min(Number(e.target.value), maxVal - BUDGET_STEP), maxVal])}
        style={{ zIndex: minVal > BUDGET_MAX * 0.9 ? 5 : 3 }} />
      <input type="range" min={BUDGET_MIN} max={BUDGET_MAX} step={BUDGET_STEP} value={maxVal}
        onChange={(e) => onChange([minVal, Math.max(Number(e.target.value), minVal + BUDGET_STEP)])}
        style={{ zIndex: 4 }} />
    </div>
  )
}

function AnswersSummary({ step, useCase, useCaseOther, selected, step2Other, resolution, preferences, budget }) {
  const rows = []

  if (useCase) {
    const label = useCase === 'Other' ? (useCaseOther || 'Other') : useCase
    rows.push({ label: 'Use case', value: label })
  }
  if (step > 2 && selected.length > 0) {
    const items = [...selected.filter((x) => x !== 'Other'), ...(step2Other ? [step2Other] : [])]
    if (items.length > 0) rows.push({ label: 'Focus', value: items.join(', ') })
  }
  if (step > 3 && resolution) {
    rows.push({ label: 'Quality', value: resolution.split('/')[0] })
  }
  if (step > 4 && preferences) {
    rows.push({ label: 'Preferences', value: preferences.length > 50 ? preferences.slice(0, 50) + '…' : preferences })
  }
  if (step === 5) {
    const budgetStr = budget[1] === BUDGET_MAX
      ? `${formatPrice(budget[0])}+`
      : `${formatPrice(budget[0])} – ${formatPrice(budget[1])}`
    rows.push({ label: 'Budget', value: budgetStr })
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '20px', position: 'sticky', top: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Your answers so far
      </h3>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: '#d1d5db', margin: 0 }}>Complete the steps on the left to see your answers here.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Check style={{ width: 11, height: 11, color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                <p style={{ fontSize: 13, color: '#111827', margin: '2px 0 0', fontWeight: 500 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <div style={{ marginTop: 20, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <p style={{ fontSize: 11, color: '#16a34a', margin: 0, fontWeight: 600 }}>
            {rows.length < 3 ? 'Keep going — almost there!' : rows.length < 5 ? 'Looking great!' : 'Ready to build your perfect PC!'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function ConfiguratorQuestionnaire({ onComplete }) {
  const [step, setStep] = useState(1)
  const [transitioning, setTransitioning] = useState(false)
  const [direction, setDirection] = useState(1)

  const [useCase, setUseCase] = useState('')
  const [useCaseOther, setUseCaseOther] = useState('')
  const [selected, setSelected] = useState([])
  const [step2Other, setStep2Other] = useState('')
  const [otherDesc, setOtherDesc] = useState('')
  const [resolution, setResolution] = useState('')
  const [preferences, setPreferences] = useState('')
  const [budget, setBudget] = useState([150000, 800000])
  const [localMin, setLocalMin] = useState('150000')
  const [localMax, setLocalMax] = useState('800000')
  const budgetRef = useRef(budget)
  budgetRef.current = budget

  useEffect(() => {
    setLocalMin(String(budget[0]))
    setLocalMax(String(budget[1]))
  }, [budget[0], budget[1]]) // eslint-disable-line

  const skipsResolution = useCase === 'Office' || useCase === 'Other'
  const totalSteps = skipsResolution ? 4 : 5

  function goTo(nextStep, dir = 1) {
    setDirection(dir)
    setTransitioning(true)
    setTimeout(() => {
      setStep(nextStep)
      setTransitioning(false)
    }, 180)
  }

  function goNext() {
    if (step === 1) goTo(2)
    else if (step === 2) goTo(skipsResolution ? 4 : 3)
    else if (step === 3) goTo(4)
    else if (step === 4) goTo(5)
    else if (step === 5) handleSubmit()
  }

  function goBack() {
    if (step === 2) goTo(1, -1)
    else if (step === 3) goTo(2, -1)
    else if (step === 4) goTo(skipsResolution ? 2 : 3, -1)
    else if (step === 5) goTo(4, -1)
  }

  function toggleItem(item) {
    setSelected((s) => s.includes(item) ? s.filter((x) => x !== item) : [...s, item])
  }

  function handleSubmit() {
    const ctx = {
      useCase: useCase === 'Other' ? useCaseOther || 'Other' : useCase,
      games: useCase === 'Gaming' ? selected : undefined,
      software: useCase === '3D Design' ? selected : undefined,
      profession: useCase === 'Professional' ? selected : undefined,
      tasks: useCase === 'Office' ? selected : undefined,
      otherDesc: useCase === 'Other' ? otherDesc : undefined,
      step2Other: step2Other || undefined,
      resolution: resolution || undefined,
      preferences: preferences || undefined,
      additionalPreferences: preferences || undefined,
      budget: { min: budget[0], max: budget[1] === BUDGET_MAX ? null : budget[1] },
    }
    onComplete(ctx)
  }

  function visualStep() {
    if (skipsResolution && step >= 4) return step - 1
    return step
  }
  const progressPct = (visualStep() / totalSteps) * 100

  const canNext =
    (step === 1 && (useCase !== '' && (useCase !== 'Other' || useCaseOther.trim()))) ||
    step === 2 ||
    (step === 3 && resolution !== '') ||
    step === 4 ||
    step === 5

  const animStyle = {
    opacity: transitioning ? 0 : 1,
    transform: transitioning ? `translateX(${direction * 28}px)` : 'translateX(0)',
    transition: 'opacity 0.18s ease, transform 0.18s ease',
  }

  const step2Config = STEP2_OPTIONS[useCase]

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px 32px' }}>
      <style>{`
        .q-grid{display:grid;grid-template-columns:1fr;gap:24px;width:100%;max-width:640px}
        .q-sidebar{display:none}
        @media(min-width:1000px){
          .q-grid{grid-template-columns:640px 260px;max-width:940px}
          .q-sidebar{display:block}
        }
      `}</style>

      <div className="q-grid">
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          <div style={{ height: 4, background: '#f1f5f9' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: '#2563eb', transition: 'width 0.35s ease', borderRadius: '0 9999px 9999px 0' }} />
          </div>

          <div style={{ padding: '36px 40px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              {Array.from({ length: totalSteps }).map((_, i) => {
                const vs = visualStep()
                const active = i + 1 === vs
                const done = i + 1 < vs
                return (
                  <div
                    key={i}
                    style={{
                      width: active ? 24 : 8, height: 8, borderRadius: 9999,
                      background: done ? '#2563eb' : active ? '#2563eb' : '#e5e7eb',
                      opacity: done ? 0.4 : 1,
                      transition: 'all 0.25s ease',
                    }}
                  />
                )
              })}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginLeft: 4 }}>
                {visualStep()} of {totalSteps}
              </span>
            </div>

            <div style={animStyle}>

              {step === 1 && (
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                    What will you use your PC for?
                  </h2>
                  <p style={{ color: '#6b7280', marginBottom: 28, fontSize: 15 }}>
                    This helps us tailor every recommendation to your needs.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {USE_CASES.map(({ key, label, icon: Icon, desc }) => (
                      <button
                        key={key}
                        onClick={() => { setUseCase(key); setSelected([]); setResolution('') }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 16, padding: '15px 18px',
                          borderRadius: 14, border: `2px solid ${useCase === key ? '#2563eb' : '#e5e7eb'}`,
                          background: useCase === key ? '#eff6ff' : '#fff',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { if (useCase !== key) { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.background = '#f8faff' } }}
                        onMouseLeave={(e) => { if (useCase !== key) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff' } }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: useCase === key ? '#dbeafe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon style={{ width: 22, height: 22, color: useCase === key ? '#2563eb' : '#6b7280' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, color: '#111827', fontSize: 15, margin: 0 }}>{label}</p>
                          <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0' }}>{desc}</p>
                        </div>
                        {useCase === key && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check style={{ width: 12, height: 12, color: '#fff' }} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {useCase === 'Other' && (
                    <input
                      autoFocus
                      value={useCaseOther}
                      onChange={(e) => setUseCaseOther(e.target.value)}
                      placeholder="Describe your use case..."
                      style={{ marginTop: 14, width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  )}
                  <div style={{ textAlign: 'center', marginTop: 22 }}>
                    <button
                      onClick={() => onComplete({ useCase: 'custom', skipQuestionnaire: true, budget: { min: 0, max: 9999999 } })}
                      style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      I know what I want → Skip to Configurator
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && useCase !== 'Other' && step2Config && (
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{step2Config.label}</h2>
                  <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 15 }}>
                    Select all that apply — the more you pick, the smarter the AI.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    {[...step2Config.items, 'Other'].map((item) => {
                      const isSelected = selected.includes(item)
                      return (
                        <button
                          key={item}
                          onClick={() => toggleItem(item)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '9px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500,
                            border: `2px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                            background: isSelected ? '#eff6ff' : '#fff',
                            color: isSelected ? '#2563eb' : '#374151',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {isSelected && <Check style={{ width: 13, height: 13 }} />}
                          {item}
                        </button>
                      )
                    })}
                  </div>
                  {selected.includes('Other') && (
                    <div style={{ overflow: 'hidden', maxHeight: selected.includes('Other') ? 80 : 0, transition: 'max-height 0.25s ease' }}>
                      <input
                        autoFocus
                        value={step2Other}
                        onChange={(e) => setStep2Other(e.target.value)}
                        placeholder="Please specify..."
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              )}
              {step === 2 && useCase === 'Other' && (
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Describe your main tasks</h2>
                  <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 15 }}>The more detail you give, the better our recommendations.</p>
                  <textarea
                    value={otherDesc}
                    onChange={(e) => setOtherDesc(e.target.value)}
                    placeholder="e.g. I run a small business and need a reliable PC for accounting software and video calls..."
                    rows={5}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>What quality level do you target?</h2>
                  <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 15 }}>This determines how powerful your GPU and CPU need to be.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {RESOLUTION_OPTIONS.map(({ key, label, desc }) => (
                      <button
                        key={key}
                        onClick={() => setResolution(key)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '15px 18px', borderRadius: 14,
                          border: `2px solid ${resolution === key ? '#2563eb' : '#e5e7eb'}`,
                          background: resolution === key ? '#eff6ff' : '#fff',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}
                      >
                        <div>
                          <p style={{ fontWeight: 600, color: '#111827', fontSize: 15, margin: 0 }}>{label}</p>
                          <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0' }}>{desc}</p>
                        </div>
                        {resolution === key && (
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check style={{ width: 12, height: 12, color: '#fff' }} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Any specific preferences?</h2>
                  <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 15 }}>Optional — skip if you have none.</p>
                  <textarea
                    autoFocus
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    placeholder="e.g. prefer AMD, need quiet cooling, RGB lighting, compact size, white build, must have WiFi..."
                    rows={5}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                    These preferences are sent directly to the AI — be specific for best results.
                  </p>
                </div>
              )}

              {step === 5 && (
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 8 }}>What is your budget?</h2>
                  <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 15 }}>Set your comfortable spending range in Kazakhstani Tenge (₸).</p>

                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 9999, marginBottom: 20,
                    background: getBudgetColor(budget[1]) === '#22c55e' ? '#f0fdf4' : getBudgetColor(budget[1]) === '#f59e0b' ? '#fffbeb' : '#fef2f2',
                    border: `1px solid ${getBudgetColor(budget[1])}40`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: getBudgetColor(budget[1]) }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: getBudgetColor(budget[1]) }}>
                      {getBudgetColor(budget[1]) === '#22c55e' ? 'Budget build' : getBudgetColor(budget[1]) === '#f59e0b' ? 'Mid-range build' : 'High-end / No limits'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setBudget([BUDGET_MIN, p.value])}
                        style={{
                          padding: '7px 14px', borderRadius: 9999, fontSize: 13, fontWeight: 600,
                          border: '1px solid #e5e7eb',
                          background: budget[1] === p.value ? '#2563eb' : '#f9fafb',
                          color: budget[1] === p.value ? '#fff' : '#374151',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >{p.label}</button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Min ₸</label>
                      <input
                        type="text" inputMode="numeric" value={localMin}
                        onChange={(e) => setLocalMin(e.target.value)}
                        onBlur={(e) => {
                          const v = Math.max(0, Math.min(BUDGET_MAX, parseInt(e.target.value) || 0))
                          setBudget((b) => [Math.min(v, b[1] - BUDGET_STEP), b[1]])
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Max ₸</label>
                      <input
                        type="text" inputMode="numeric" value={localMax}
                        onChange={(e) => setLocalMax(e.target.value)}
                        onBlur={(e) => {
                          const v = Math.max(0, Math.min(BUDGET_MAX, parseInt(e.target.value) || BUDGET_MAX))
                          setBudget((b) => [b[0], Math.max(v, b[0] + BUDGET_STEP)])
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <DualSlider minVal={budget[0]} maxVal={budget[1]} onChange={setBudget} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatPrice(BUDGET_MIN)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: getBudgetColor(budget[1]) }}>
                      {formatPrice(budget[0])} — {budget[1] === BUDGET_MAX ? 'No limit' : formatPrice(budget[1])}
                    </span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>No limit</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36 }}>
              {step > 1 ? (
                <button
                  onClick={goBack}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                >
                  <ChevronLeft style={{ width: 16, height: 16 }} /> Back
                </button>
              ) : <div />}

              <button
                onClick={goNext}
                disabled={!canNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 28px', borderRadius: 12, border: 'none',
                  background: canNext ? '#2563eb' : '#d1d5db',
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: canNext ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s, transform 0.1s',
                }}
                onMouseEnter={(e) => { if (canNext) e.currentTarget.style.background = '#1d4ed8' }}
                onMouseLeave={(e) => { if (canNext) e.currentTarget.style.background = '#2563eb' }}
              >
                {step === totalSteps ? 'Start Building' : 'Continue'}
                <ArrowRight style={{ width: 17, height: 17 }} />
              </button>
            </div>
          </div>
        </div>

        <div className="q-sidebar">
          <AnswersSummary
            step={step}
            useCase={useCase}
            useCaseOther={useCaseOther}
            selected={selected}
            step2Other={step2Other}
            resolution={resolution}
            preferences={preferences}
            budget={budget}
          />
        </div>
      </div>
    </div>
  )
}
