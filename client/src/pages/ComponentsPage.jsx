import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { componentsApi } from '../api/components'
import ComponentCard from '../components/products/ComponentCard'
import Spinner from '../components/ui/Spinner'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import { formatStorageSize } from '../utils/formatters'

const PRICE_MAX = 20_000_000
const PRICE_STEP = 1_000

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name_asc', label: 'Name A–Z' },
]

// URL params that are base navigation, not spec filters
const KNOWN_PARAMS = new Set(['search', 'sort', 'page', 'minPrice', 'maxPrice', 'category', 'brand'])

// Category-specific specData filter sections (shown after Manufacturer/Color/Model)
const SPEC_FILTERS = {
  CPU: [
    { key: 'socket', label: 'Socket' },
    { key: 'cores', label: 'Cores' },
    { key: 'tdp', label: 'TDP (W)' },
    { key: 'integratedGraphics', label: 'Integrated GPU' },
  ],
  GPU: [
    { key: 'memorySize', label: 'VRAM' },
    { key: 'memoryType', label: 'Memory Type' },
  ],
  RAM: [
    { key: 'memoryType', label: 'Type' },
    { key: 'memorySize', label: 'Capacity' },
    { key: 'memoryClock', label: 'Speed' },
    { key: 'timings', label: 'Timings' },
  ],
  STORAGE: [
    { key: 'memoryType', label: 'Type' },
    { key: 'memorySize', label: 'Capacity' },
  ],
  MOTHERBOARD: [
    { key: 'socket', label: 'Socket' },
    { key: 'chipset', label: 'Chipset' },
    { key: 'formFactor', label: 'Form Factor' },
  ],
  PSU: [
    { key: 'power', label: 'Wattage' },
    { key: 'certificate', label: 'Efficiency Rating' },
    { key: 'modularity', label: 'Modularity' },
  ],
  CASE: [
    { key: 'formFactor', label: 'Form Factor' },
  ],
  COOLING: [
    { key: 'waterCooling', label: 'Cooling Type', values: ['Air', 'Liquid AIO'] },
  ],
  FAN: [
    { key: 'dimensions', label: 'Size' },
    { key: 'rgb', label: 'RGB', values: ['RGB', 'Non-RGB'] },
  ],
}

// Maps display label → URL value for boolean-backed filters
const DISPLAY_TO_URL = {
  waterCooling: { 'Air': 'false', 'Liquid AIO': 'true' },
  rgb: { 'RGB': 'true', 'Non-RGB': 'false' },
}
const URL_TO_DISPLAY = {
  waterCooling: { 'false': 'Air', 'true': 'Liquid AIO' },
  rgb: { 'true': 'RGB', 'false': 'Non-RGB' },
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function DualRangeSlider({ valueMin, valueMax, onChangeMin, onChangeMax, onCommit }) {
  const pMin = (valueMin / PRICE_MAX) * 100
  const pMax = (valueMax / PRICE_MAX) * 100
  return (
    <div className="relative h-5 my-1">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200" />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-primary-600"
        style={{ left: `${pMin}%`, right: `${100 - pMax}%` }}
      />
      <input
        type="range" min={0} max={PRICE_MAX} step={PRICE_STEP}
        value={valueMin}
        onChange={(e) => onChangeMin(Math.min(+e.target.value, valueMax - PRICE_STEP))}
        onMouseUp={onCommit} onTouchEnd={onCommit}
        className="range-thumb"
        style={{ zIndex: valueMin >= valueMax - PRICE_STEP ? 5 : 3 }}
      />
      <input
        type="range" min={0} max={PRICE_MAX} step={PRICE_STEP}
        value={valueMax}
        onChange={(e) => onChangeMax(Math.max(+e.target.value, valueMin + PRICE_STEP))}
        onMouseUp={onCommit} onTouchEnd={onCommit}
        className="range-thumb"
        style={{ zIndex: 4 }}
      />
    </div>
  )
}

function FilterSection({ title, values = [], activeValue, onToggle, formatLabel }) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const VISIBLE = 8
  const displayed = showAll ? values : values.slice(0, VISIBLE)

  return (
    <div className="border-b border-gray-100 py-3">
      <button
        className="flex items-center justify-between w-full text-left py-0.5"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {displayed.map((val) => (
              <button
                key={val}
                onClick={() => onToggle(val)}
                className={`rounded-full border text-xs px-3 py-1 cursor-pointer transition-colors whitespace-nowrap ${
                  activeValue === val
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-300'
                }`}
              >
                {formatLabel ? formatLabel(val) : val}
              </button>
            ))}
          </div>
          {values.length > VISIBLE && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="text-xs text-primary-600 hover:text-primary-700 mt-2 font-medium"
            >
              {showAll ? 'Show less' : `+${values.length - VISIBLE} more`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ComponentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')

  const [sliderMin, setSliderMin] = useState(parseInt(searchParams.get('minPrice') || '0'))
  const [sliderMax, setSliderMax] = useState(parseInt(searchParams.get('maxPrice') || String(PRICE_MAX)))
  const minInputRef = useRef(null)
  const maxInputRef = useRef(null)
  const minFocused = useRef(false)
  const maxFocused = useRef(false)

  const debouncedSearch = useDebounce(searchInput, 400)

  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1')
  const urlMinPrice = parseInt(searchParams.get('minPrice') || '0')
  const urlMaxPrice = parseInt(searchParams.get('maxPrice') || String(PRICE_MAX))

  const categoryParam = searchParams.get('category') || ''
  const selectedCategories = categoryParam ? categoryParam.split(',').filter(Boolean) : []

  // Spec filters = all URL params not in KNOWN_PARAMS (sent to backend as-is)
  const activeSpecs = {}
  for (const [k, v] of searchParams.entries()) {
    if (!KNOWN_PARAMS.has(k)) activeSpecs[k] = v
  }

  // Sync slider from URL when changed externally
  const prevUrl = useRef({ min: urlMinPrice, max: urlMaxPrice })
  useEffect(() => {
    if (prevUrl.current.min !== urlMinPrice || prevUrl.current.max !== urlMaxPrice) {
      setSliderMin(urlMinPrice)
      setSliderMax(urlMaxPrice)
      prevUrl.current = { min: urlMinPrice, max: urlMaxPrice }
    }
  }, [urlMinPrice, urlMaxPrice])

  // Sync input display from slider when input not focused
  useEffect(() => {
    if (minInputRef.current && !minFocused.current) minInputRef.current.value = String(sliderMin)
  }, [sliderMin])
  useEffect(() => {
    if (maxInputRef.current && !maxFocused.current) maxInputRef.current.value = String(sliderMax)
  }, [sliderMax])

  // Debounced search → URL
  const searchMounted = useRef(false)
  useEffect(() => {
    if (!searchMounted.current) { searchMounted.current = true; return }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch) next.set('search', debouncedSearch)
      else next.delete('search')
      next.set('page', '1')
      return next
    })
  }, [debouncedSearch]) // eslint-disable-line

  const { data: filterOptions = {} } = useQuery({
    queryKey: ['components', 'filter-options'],
    queryFn: () => componentsApi.getFilterOptions().then((r) => r.data),
    staleTime: Infinity,
  })

  const { categories: categoryOptions = [], filters: categoryFilters = {} } = filterOptions

  const queryParams = {
    search: searchParams.get('search') || undefined,
    sort,
    page,
    limit: 12,
    ...(selectedCategories.length && { category: selectedCategories.join(',') }),
    ...(urlMinPrice > 0 && { minPrice: urlMinPrice }),
    ...(urlMaxPrice < PRICE_MAX && { maxPrice: urlMaxPrice }),
    ...activeSpecs,
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['components', queryParams],
    queryFn: () => componentsApi.getAll(queryParams).then((r) => r.data),
  })

  const components = data?.components ?? []
  const totalPages = data?.pagination?.totalPages ?? 1
  const total = data?.pagination?.total ?? components.length

  function updateParam(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.set('page', '1')
      return next
    })
  }

  function toggleCategory(cat) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const current = next.get('category') || ''
      const cats = current ? current.split(',') : []
      // Clear all spec filters on category change
      for (const key of [...next.keys()]) {
        if (!KNOWN_PARAMS.has(key)) next.delete(key)
      }
      if (cats.includes(cat)) {
        const filtered = cats.filter((c) => c !== cat)
        if (filtered.length) next.set('category', filtered.join(','))
        else next.delete('category')
      } else {
        next.set('category', [...cats, cat].join(','))
      }
      next.set('page', '1')
      return next
    })
  }

  function toggleFilter(key, displayVal) {
    const urlVal = DISPLAY_TO_URL[key]?.[displayVal] ?? displayVal
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (next.get(key) === urlVal) next.delete(key)
      else next.set(key, urlVal)
      next.set('page', '1')
      return next
    })
  }

  function getActiveValue(key) {
    const urlVal = searchParams.get(key)
    if (!urlVal) return null
    return URL_TO_DISPLAY[key]?.[urlVal] ?? urlVal
  }

  function commitPriceRange(newMin, newMax) {
    setSliderMin(newMin)
    setSliderMax(newMax)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newMin > 0) next.set('minPrice', String(newMin))
      else next.delete('minPrice')
      if (newMax < PRICE_MAX) next.set('maxPrice', String(newMax))
      else next.delete('maxPrice')
      next.set('page', '1')
      prevUrl.current = { min: newMin, max: newMax }
      return next
    })
  }

  function applyMinInput(raw) {
    const parsed = raw.trim() === '' ? 0 : Math.max(0, parseInt(raw) || 0)
    const newMin = Math.min(parsed, sliderMax - PRICE_STEP)
    commitPriceRange(newMin, sliderMax)
    if (minInputRef.current) minInputRef.current.value = String(newMin)
  }

  function applyMaxInput(raw) {
    const parsed = raw.trim() === '' ? PRICE_MAX : Math.min(PRICE_MAX, parseInt(raw) || PRICE_MAX)
    const newMax = Math.max(parsed, sliderMin + PRICE_STEP)
    commitPriceRange(sliderMin, newMax)
    if (maxInputRef.current) maxInputRef.current.value = String(newMax)
  }

  const hasFilters =
    searchParams.get('search') ||
    urlMinPrice > 0 ||
    urlMaxPrice < PRICE_MAX ||
    Object.keys(activeSpecs).length > 0

  function clearFilters() {
    setSearchInput('')
    setSliderMin(0)
    setSliderMax(PRICE_MAX)
    prevUrl.current = { min: 0, max: PRICE_MAX }
    if (minInputRef.current) minInputRef.current.value = '0'
    if (maxInputRef.current) maxInputRef.current.value = String(PRICE_MAX)
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      if (prev.get('category')) next.set('category', prev.get('category'))
      if (prev.get('sort')) next.set('sort', prev.get('sort'))
      return next
    })
  }

  // Render spec filter sections for a single selected category
  function renderCategoryFilters(cat) {
    const catData = categoryFilters[cat] || {}

    return (
      <>
        {catData.manufacturer?.length > 0 && (
          <FilterSection
            title="Manufacturer"
            values={catData.manufacturer}
            activeValue={getActiveValue('manufacturer')}
            onToggle={(val) => toggleFilter('manufacturer', val)}
          />
        )}
        {catData.color?.length > 0 && (
          <FilterSection
            title="Color"
            values={catData.color}
            activeValue={getActiveValue('color')}
            onToggle={(val) => toggleFilter('color', val)}
          />
        )}
        {cat === 'CPU' && catData.cpuModel?.length > 0 && (
          <FilterSection
            title="Model"
            values={catData.cpuModel}
            activeValue={getActiveValue('cpuModel')}
            onToggle={(val) => toggleFilter('cpuModel', val)}
          />
        )}
        {cat === 'GPU' && catData.gpuModel?.length > 0 && (
          <FilterSection
            title="Model"
            values={catData.gpuModel}
            activeValue={getActiveValue('gpuModel')}
            onToggle={(val) => toggleFilter('gpuModel', val)}
          />
        )}
        {(SPEC_FILTERS[cat] || []).map((filterDef) => {
          const values = filterDef.values || catData[filterDef.key] || []
          if (values.length === 0) return null
          return (
            <FilterSection
              key={filterDef.key}
              title={filterDef.label}
              values={values}
              activeValue={getActiveValue(filterDef.key)}
              onToggle={(val) => toggleFilter(filterDef.key, val)}
              formatLabel={cat === 'STORAGE' && filterDef.key === 'memorySize' ? formatStorageSize : undefined}
            />
          )
        })}
      </>
    )
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Filters</h2>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Category chips */}
      {categoryOptions.length > 0 && (
        <div className="border-b border-gray-100 pb-4 mb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {categoryOptions.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`rounded-full border text-xs px-3 py-1 cursor-pointer transition-colors whitespace-nowrap ${
                  selectedCategories.includes(cat)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div className="border-b border-gray-100 pb-4 mb-1 mt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Price Range</p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <input
              ref={minInputRef}
              type="text"
              inputMode="numeric"
              defaultValue={sliderMin}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-primary-400"
              placeholder="Min ₸"
              onFocus={() => { minFocused.current = true }}
              onBlur={(e) => { minFocused.current = false; applyMinInput(e.target.value) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { applyMinInput(e.target.value); e.target.blur() } }}
            />
          </div>
          <span className="text-gray-400 text-xs flex-shrink-0">—</span>
          <div className="flex-1">
            <input
              ref={maxInputRef}
              type="text"
              inputMode="numeric"
              defaultValue={sliderMax}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-primary-400"
              placeholder="Max ₸"
              onFocus={() => { maxFocused.current = true }}
              onBlur={(e) => { maxFocused.current = false; applyMaxInput(e.target.value) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { applyMaxInput(e.target.value); e.target.blur() } }}
            />
          </div>
        </div>
        <DualRangeSlider
          valueMin={sliderMin}
          valueMax={sliderMax}
          onChangeMin={setSliderMin}
          onChangeMax={setSliderMax}
          onCommit={() => commitPriceRange(sliderMin, sliderMax)}
        />
        <div className="flex justify-between mt-2 mb-3">
          <span className="text-xs text-gray-400">0 ₸</span>
          <span className="text-xs text-gray-400">2 000 000 ₸</span>
        </div>
        <button onClick={() => commitPriceRange(sliderMin, sliderMax)} className="w-full btn-primary text-xs py-1.5">
          Apply
        </button>
      </div>

      {/* Category-specific filters (only for single selected category) */}
      {selectedCategories.length === 1 && renderCategoryFilters(selectedCategories[0])}
    </>
  )

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PC Components</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLoading ? 'Loading...' : `${total} result${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          className="btn-ghost flex items-center gap-2 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      <div className="flex gap-8">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 p-6 overflow-y-auto transition-transform duration-300
            lg:static lg:z-auto lg:w-60 lg:bg-transparent lg:border-0 lg:p-0 lg:translate-x-0 lg:flex-shrink-0 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)]
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h2 className="text-gray-900 font-semibold">Filters</h2>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          {sidebarContent}
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input w-full pl-9"
                placeholder="Search components..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="relative sm:w-52">
              <select
                className="input w-full appearance-none pr-9"
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : error ? (
            <div className="card p-8 text-center">
              <p className="text-red-500">Failed to load components. Please try again.</p>
            </div>
          ) : components.length === 0 ? (
            <EmptyState
              title="No components found"
              description={hasFilters || selectedCategories.length > 0 ? 'Try adjusting your filters or search terms.' : 'Check back soon for new components.'}
              action={hasFilters ? { label: 'Clear Filters', onClick: clearFilters } : undefined}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {components.map((component) => (
                  <ComponentCard key={component.id} component={component} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    page={page}
                    pages={totalPages}
                    onPageChange={(p) => updateParam('page', String(p))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
