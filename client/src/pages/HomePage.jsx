import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bot, Headphones, Zap, Monitor, Cpu, Truck, Gamepad2, Radio, Box, ChevronRight } from 'lucide-react'
import { useFeaturedProducts, useHeroProducts } from '../hooks/useProducts'
import { formatPrice } from '../utils/formatters'
import ProductCard from '../components/products/ProductCard'
import Spinner from '../components/ui/Spinner'
import api from '../api/client'

const TEMPLATES = [
  {
    id: 'budget-gaming',
    templateKey: 'budget_gaming',
    name: 'Budget Gaming',
    price: 300000,
    icon: Gamepad2,
    gradient: 'from-blue-500 to-blue-700',
    specs: ['Intel Core i5 + GTX 1660 Ti', '16GB DDR4 RAM', '512GB NVMe SSD'],
    purpose: 'gaming',
    budget: { max: 350000 },
    components: [
      { slot: 'CPU', name: 'Intel Core i5-12400F' },
      { slot: 'MOTHERBOARD', name: 'ASRock H610M-H2/M.2' },
      { slot: 'GPU', name: 'ZOTAC GeForce GTX 1660 Ti AMP Edition' },
      { slot: 'RAM', name: 'ADATA XPG GAMMIX D35', count: 2 },
      { slot: 'STORAGE', name: 'DEXP R100' },
      { slot: 'PSU', name: 'ZALMAN MegaMax (TXll) 600W' },
      { slot: 'CASE', name: 'ARDOR GAMING Rare NX30 Lite' },
      { slot: 'COOLING', name: 'DEXP DPC-D2200H' },
      { slot: 'FAN', name: 'ARDOR GAMING Reflect YF120', count: 1 },
    ],
  },
  {
    id: 'stream-setup',
    templateKey: 'stream_setup',
    name: 'Stream Setup',
    price: 500000,
    icon: Radio,
    gradient: 'from-purple-500 to-purple-700',
    specs: ['Intel Core i7 + RTX 3060', '32GB DDR4 RAM', '1TB NVMe SSD'],
    purpose: 'streaming',
    budget: { max: 650000 },
    components: [
      { slot: 'CPU', name: 'Intel Core i7-13700K' },
      { slot: 'MOTHERBOARD', name: 'ASRock H610M-H2/M.2' },
      { slot: 'GPU', name: 'Gigabyte Windforce GeForce RTX 3060' },
      { slot: 'RAM', name: 'ADATA XPG GAMMIX D35', count: 2, capacity: '32GB' },
      { slot: 'STORAGE', name: 'ADATA XPG SPECTRIX S20G' },
      { slot: 'PSU', name: 'DEEPCOOL PF750' },
      { slot: 'CASE', name: 'ARDOR GAMING Rare NX30 Lite' },
      { slot: 'COOLING', name: 'DEEPCOOL AK620' },
      { slot: 'FAN', name: 'ARDOR GAMING Reflect YF120', count: 1 },
    ],
  },
  {
    id: '3d-rendering',
    templateKey: 'rendering_3d',
    name: '3D Rendering',
    price: 800000,
    icon: Box,
    gradient: 'from-orange-500 to-orange-700',
    specs: ['AMD Ryzen 9 + RTX 3060', '64GB DDR5 RAM', '2TB NVMe SSD'],
    purpose: '3d_rendering',
    budget: { max: 1200000 },
    components: [
      { slot: 'CPU', name: 'AMD Ryzen 9 7900X' },
      { slot: 'MOTHERBOARD', name: 'MSI MPG B850 EDGE TI WIFI' },
      { slot: 'GPU', name: 'ASUS Dual GeForce RTX 3060' },
      { slot: 'RAM', name: 'ADATA XPG Lancer Blade', count: 4 },
      { slot: 'STORAGE', name: 'ADATA LEGEND 860' },
      { slot: 'PSU', name: 'ADATA XPG CORE REACTOR II VE 850W' },
      { slot: 'CASE', name: 'ARDOR GAMING Rare M2' },
      { slot: 'COOLING', name: 'ARDOR GAMING Frostwave 360 SC V2' },
      { slot: 'FAN', name: 'ID-COOLING TF Series', count: 4 },
    ],
  },
  {
    id: 'no-limits',
    templateKey: 'no_limits',
    name: 'No Limits',
    price: 1500000,
    icon: Zap,
    gradient: 'from-gray-800 to-gray-900',
    specs: ['Intel Core i9 + RTX 4090', '128GB DDR5 RAM', '4TB NVMe SSD'],
    purpose: 'gaming',
    budget: { max: null },
    components: [
      { slot: 'CPU', name: 'Intel Core i9-14900KS' },
      { slot: 'MOTHERBOARD', name: 'ASUS TUF GAMING Z790-BTF WIFI' },
      { slot: 'GPU', name: 'ASUS ROG Strix GeForce RTX 4090' },
      { slot: 'RAM', name: 'Apacer NOX RGB', count: 4 },
      { slot: 'STORAGE', name: 'ADATA XPG MARS 980 STORM' },
      { slot: 'PSU', name: 'Cougar POLAR 1200' },
      { slot: 'CASE', name: 'LIAN LI O11 Dynamic EVO' },
      { slot: 'COOLING', name: 'ASUS ROG STRIX LC II 240 ARGB' },
      { slot: 'FAN', name: 'LIAN LI UNI FAN SL-INFINITY REVERSE BLADE', count: 4 },
    ],
  },
]

function BuildLikeAProSection() {
  const navigate = useNavigate()
  const [loadingId, setLoadingId] = useState(null)

  async function loadTemplate(template) {
    setLoadingId(template.id)
    try {
      const currentBuild = []
      for (const comp of template.components) {
        const res = await api.get(`/components?search=${encodeURIComponent(comp.name)}&limit=1`)
        const found = res.data.components?.[0]
        if (!found) continue
        if (comp.slot === 'RAM' && comp.count) {
          for (let i = 0; i < comp.count; i++) {
            currentBuild.push({ slot: 'RAM', component: found })
          }
        } else if (comp.slot === 'FAN') {
          currentBuild.push({ slot: 'FAN', component: found, packSize: comp.count || 1 })
        } else {
          currentBuild.push({ slot: comp.slot, component: found })
        }
      }
      localStorage.setItem('nexpc_build_template', JSON.stringify({
        build: currentBuild,
        templateName: template.name,
        templateType: template.templateKey,
        aiContext: {
          purpose: template.purpose,
          budget: template.budget,
          isTemplate: true,
          templateType: template.templateKey,
        },
      }))
      navigate('/build')
    } catch {
      setLoadingId(null)
    }
  }

  return (
    <section className="container-page py-16">
      <div className="text-center mb-10">
        <p className="text-primary-600 text-sm font-semibold uppercase tracking-widest mb-2">Expert Picks</p>
        <h2 className="text-3xl font-bold text-gray-900">Build Like a Pro</h2>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto">Start with an expert template, customize to your needs</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {TEMPLATES.map((tpl) => {
          const Icon = tpl.icon
          return (
            <div key={tpl.id} className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-shadow flex flex-col">
              <div className={`bg-gradient-to-br ${tpl.gradient} p-6 flex items-center gap-3`}>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">{tpl.name}</h3>
                  <p className="text-white/80 text-xs">Starting from {formatPrice(tpl.price)}</p>
                </div>
              </div>
              <div className="bg-white p-5 flex-1 flex flex-col">
                <ul className="space-y-1.5 flex-1 mb-4">
                  {tpl.specs.map((spec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-primary-500 mt-0.5 flex-shrink-0">✓</span>
                      {spec}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => loadTemplate(tpl)}
                  disabled={loadingId !== null}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-400 rounded-xl py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingId === tpl.id ? (
                    <><Spinner size="sm" /> Loading...</>
                  ) : (
                    <>Load Template <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}


function heroCpu(str) {
  return str ? str.replace(/^(AMD|Intel)\s+/i, '') : str
}
function heroGpu(str) {
  if (!str) return str
  const m = str.match(/\b((?:RTX|GTX)\s+\d+(?:\s+(?:Ti|Super|XT|XTX))?\s*(?:\d+\s*GB)?|RX\s+\d+(?:\s+(?:XT|XTX))?\s*(?:\d+\s*GB)?)\b/i)
  return m ? m[1].replace(/\s+/g, ' ').trim() : str
}
function heroRam(str) {
  if (!str) return str
  const sizeM = str.match(/(\d+)\s*GB/i)
  const typeM = str.match(/(DDR\d)[-\s]?(\d{3,5})/i)
  const clM = str.match(/CL\s*(\d+)/i)
  if (!sizeM) return str
  let out = sizeM[1] + 'GB'
  if (typeM) out += ' ' + typeM[1].toUpperCase() + '-' + typeM[2]
  if (clM) out += ' CL' + clM[1]
  return out
}
function heroStorage(str) {
  if (!str) return str
  const capM = str.match(/(\d+)\s*(TB|GB)/i)
  const typeM = str.match(/\b(NVMe|SATA|HDD|SSD)\b/i)
  if (!capM) return str
  const cap = capM[1] + capM[2].toUpperCase()
  return typeM ? cap + ' ' + typeM[1] : cap
}
function heroMotherboard(str) {
  if (!str) return str
  const words = str.trim().split(/\s+/)
  const chipM = str.match(/\b(B\d{3,4}|X\d{3,4}E?|Z\d{3}|H\d{3}|A\d{3})\b/i)
  if (!chipM) return words.slice(0, 2).join(' ')
  return words[0] + ' ' + chipM[1].toUpperCase()
}
function heroPsu(str) {
  if (!str) return str
  const wattM = str.match(/(\d+)\s*W\b/i)
  if (!wattM) return str
  const ratingM = str.match(/80\+\s*(Gold|Silver|Bronze|Platinum|Titanium)/i)
  return ratingM ? `${wattM[1]}W 80+ ${ratingM[1]}` : `${wattM[1]}W`
}
function trunc(str, max = 18) {
  if (!str) return str
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}


function HeroProductCard({ product }) {
  const specs = product?.specs || {}
  const specItems = [
    specs.CPU         && { label: 'CPU',     value: trunc(heroCpu(specs.CPU)) },
    specs.GPU         && { label: 'GPU',     value: trunc(heroGpu(specs.GPU)) },
    specs.RAM         && { label: 'RAM',     value: trunc(heroRam(specs.RAM)) },
    specs.Storage     && { label: 'STORAGE', value: trunc(heroStorage(specs.Storage)) },
    specs.Motherboard && { label: 'MOTHERBOARD', value: trunc(heroMotherboard(specs.Motherboard)) },
    specs.PSU         && { label: 'PSU',     value: trunc(heroPsu(specs.PSU)) },
  ].filter(Boolean)

  const fallback = [
    { label: 'CPU',     value: 'Core i9-14900K' },
    { label: 'GPU',     value: 'RTX 4090 24GB' },
    { label: 'RAM',     value: '64GB DDR5-6000' },
    { label: 'STORAGE', value: '2TB NVMe' },
    { label: 'MOTHERBOARD', value: 'Z790 ATX' },
    { label: 'PSU',     value: '1000W 80+ Platinum' },
  ]

  const rows = specItems.length > 0 ? specItems : fallback

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl w-72">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {product?.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Monitor className="w-5 h-5 text-primary-600" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-gray-900 font-semibold text-sm truncate">{product?.name ?? 'NEX Build'}</p>
          <p className="text-primary-600 text-xs font-medium">
            {product?.price ? formatPrice(product.price) : 'High Performance'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((spec) => (
          <div key={spec.label} className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 10 }} className="text-gray-400 uppercase tracking-wide flex-shrink-0 font-medium">{spec.label}</span>
            <span style={{ fontSize: 13, fontWeight: 500 }} className="text-gray-800 text-right truncate">{spec.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="mb-1.5">
          <span style={{ fontSize: 10 }} className="text-gray-400 uppercase tracking-wide font-medium">Performance</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${i < (product?.performanceScore ?? 5) ? 'bg-primary-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}


function RotatingHeroCards({ products }) {
  const [active, setActive] = useState(0)
  const count = Math.min(products.length, 3)

  useEffect(() => {
    if (count < 2) return
    const id = setInterval(() => setActive((p) => (p + 1) % count), 7000)
    return () => clearInterval(id)
  }, [count])

  // If no hero products, fall back to static decorative card
  if (count === 0) {
    return (
      <div className="relative">
        <HeroProductCard product={null} />
        <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
          <Cpu className="w-7 h-7 text-primary-600" />
        </div>
        <div className="absolute -bottom-4 -left-4 w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
          <Zap className="w-4 h-4 text-blue-500" />
        </div>
      </div>
    )
  }

  // With only 1 card, no rotation needed
  if (count === 1) {
    return (
      <div className="relative">
        <HeroProductCard product={products[0]} />
        <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center">
          <Cpu className="w-7 h-7 text-primary-600" />
        </div>
      </div>
    )
  }

  // 2–3 cards: stack with left/center/right positions
  const getPosition = (index) => {
    const diff = ((index - active) % count + count) % count
    if (diff === 0) return 'center'
    if (diff === 1) return 'right'
    return 'left'
  }

  return (
    <div className="relative" style={{ width: '288px', height: '380px' }}>
      {products.slice(0, 3).map((product, i) => {
        const pos = getPosition(i)
        const isCenter = pos === 'center'
        return (
          <div
            key={product.id}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: isCenter
                ? 'translateX(-50%) scale(1)'
                : pos === 'right'
                  ? 'translateX(calc(-50% + 110px)) scale(0.85)'
                  : 'translateX(calc(-50% - 110px)) scale(0.85)',
              filter: isCenter ? 'none' : 'blur(4px)',
              zIndex: isCenter ? 10 : 5,
              opacity: isCenter ? 1 : 0.65,
              transition: 'all 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: isCenter ? 'auto' : 'none',
            }}
          >
            <HeroProductCard product={product} />
          </div>
        )
      })}
    </div>
  )
}


function FeaturedSection() {
  const { data: products, isLoading } = useFeaturedProducts()

  return (
    <section className="container-page py-20">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-primary-600 text-sm font-semibold uppercase tracking-widest mb-2">Top Picks</p>
          <h2 className="text-3xl font-bold text-gray-900">Featured Builds</h2>
        </div>
        <Link
          to="/products"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 transition-colors"
        >
          View All →
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(products || []).slice(0, 4).map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}


export default function HomePage() {
  const { data: heroProducts = [], isLoading: heroLoading } = useHeroProducts()

  return (
    <div className="bg-white">
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50"
        style={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '80px' }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="container-page relative z-10 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-full px-4 py-1.5 mb-6">
                <Zap className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-primary-600 text-xs font-semibold uppercase tracking-wider">Innovative PC Building</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
                <span className="text-gray-900">Build Your</span>
                <br />
                <span className="text-gradient">Dream PC</span>
              </h1>
              <p className="text-gray-500 text-lg sm:text-xl max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                Discover high-performance ready builds or create your own with our AI-powered configurator.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/products"
                  className="btn-primary btn-glow-pulse text-base px-8 py-3"
                >
                  Ready Builds
                </Link>
                <Link to="/build" className="btn-secondary text-base px-8 py-3 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Configurator
                </Link>
              </div>
            </div>

            {/* Rotating hero cards */}
            <div className="flex-shrink-0 lg:flex hidden justify-center" style={{ minWidth: '340px', alignSelf: 'center' }}>
              {heroLoading ? (
                <div className="flex items-center justify-center w-72 h-72">
                  <Spinner size="lg" />
                </div>
              ) : (
                <RotatingHeroCards products={heroProducts} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <FeaturedSection />

      {/* Build Like a Pro Templates */}
      <BuildLikeAProSection />

      {/* Categories */}
      <section className="container-page py-16">
        <div className="text-center mb-10">
          <p className="text-primary-600 text-sm font-semibold uppercase tracking-widest mb-2">Browse By</p>
          <h2 className="text-3xl font-bold text-gray-900">Shop Categories</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/products"
            className="group card p-8 hover:border-primary-300 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                <Monitor className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <h3 className="text-gray-900 text-xl font-bold mb-2 group-hover:text-primary-600 transition-colors">
                  Ready-Made PCs
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  Pre-built, tested, and optimized systems ready to ship. Gaming rigs, workstations, and everything in between.
                </p>
                <span className="text-primary-600 text-sm font-medium">Browse all PCs →</span>
              </div>
            </div>
          </Link>

          <Link
            to="/components"
            className="group card p-8 hover:border-blue-300 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                <Cpu className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h3 className="text-gray-900 text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                  PC Components
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">
                  CPUs, GPUs, RAM, storage, motherboards, and more. All from top brands, all compatibility-checked.
                </p>
                <span className="text-blue-600 text-sm font-medium">Browse components →</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Why NEX PC */}
      <section className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="container-page">
          <div className="text-center mb-12">
            <p className="text-primary-600 text-sm font-semibold uppercase tracking-widest mb-2">Why NEX PC</p>
            <h2 className="text-3xl font-bold text-gray-900">Built for Builders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: 'Innovative Configurator',
                desc: 'Our intelligent configurator ensures every component is compatible. Get personalized recommendations based on your budget and use case.',
                color: 'primary',
              },
              {
                icon: Headphones,
                title: 'Expert Support',
                desc: 'Our team of PC enthusiasts is available around the clock to help you choose parts, troubleshoot builds, and answer any question.',
                color: 'green',
              },
              {
                icon: Truck,
                title: 'Free Delivery',
                desc: 'Free delivery across Kazakhstan on all orders. Most in-stock builds ship the same day. Track your order status in real time from our website.',
                color: 'yellow',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card p-7 text-center hover:shadow-md transition-shadow">
                <div
                  className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${
                    color === 'primary'
                      ? 'bg-primary-50 border border-primary-200'
                      : color === 'green'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <Icon
                    className={`w-8 h-8 ${
                      color === 'primary' ? 'text-primary-600' : color === 'green' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  />
                </div>
                <h3 className="text-gray-900 text-lg font-bold mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="container-page py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Ready to build your{' '}
          <span className="text-gradient">perfect PC?</span>
        </h2>
        <p className="text-gray-500 text-lg mb-8 max-w-lg mx-auto">
          Let our AI guide you to the perfect build for your budget and goals.
        </p>
        <Link to="/build" className="btn-primary text-base px-10 py-3 inline-flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Start Building Now
        </Link>
      </section>
    </div>
  )
}
