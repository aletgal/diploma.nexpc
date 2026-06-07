export const formatPrice = (price) =>
  `${new Intl.NumberFormat('ru-KZ').format(Math.round(price))} ₸`

export const formatDate = (date) =>
  new Intl.DateTimeFormat('ru-KZ', { dateStyle: 'medium' }).format(new Date(date))

const CATEGORY_NAMES = {
  READY_PC:    'Ready PC',
  COMPONENT:   'Component',
  CPU:         'CPU',
  GPU:         'GPU',
  RAM:         'RAM',
  PSU:         'PSU',
  STORAGE:     'Storage',
  MOTHERBOARD: 'Motherboard',
  COOLING:     'Cooling',
  CASE:        'Case',
}

export const formatCategory = (cat) => {
  if (!cat) return ''
  return CATEGORY_NAMES[cat] ?? cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const formatStorageSize = (value) => {
  const num = parseFloat(value)
  if (isNaN(num)) return value
  if (num < 1) {
    const gb = parseFloat(('0.' + value.toString().split('.')[1])) * 1000
    return Math.round(gb) + ' GB'
  }
  return num + ' TB'
}

const addSuffix = (value, suffix) =>
  value && !value.toString().includes(suffix) ? value + suffix : value

export function addSpecSuffix(category, key, value) {
  if (value === null || value === undefined || value === '') return value
  if (category === 'CPU' || category === 'GPU') return value
  const str = value.toString()
  switch (key) {
    case 'memoryClock':
    case 'maxRamSpeed':
      return /mhz|ghz/i.test(str) ? value : addSuffix(value, ' MHz')
    case 'memorySize': {
      if (/gb|tb/i.test(str)) return value
      const num = parseFloat(str)
      if (Number.isNaN(num)) return value
      if (num >= 1000) return `${num / 1000} TB`
      return addSuffix(value, ' GB')
    }
    case 'readSpeed':
    case 'writeSpeed':
      return /mb\/s/i.test(str) ? value : addSuffix(value, ' MB/s')
    case 'power':
    case 'tdp':
      return /w/i.test(str) ? value : addSuffix(value, 'W')
    case 'dimensions':
      return /mm/i.test(str) ? value : addSuffix(value, 'mm')
    case 'timings':
      return /^\d/.test(str) && !/cl/i.test(str) ? `CL${value}` : value
    default:
      return value
  }
}
