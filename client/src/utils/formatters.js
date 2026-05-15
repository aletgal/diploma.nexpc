export const formatPrice = (price) =>
  `${new Intl.NumberFormat('ru-KZ').format(Math.round(price))} ₸`

export const formatDate = (date) =>
  new Intl.DateTimeFormat('ru-KZ', { dateStyle: 'medium' }).format(new Date(date))

// Known category display names (underscores → readable, preserve acronyms)
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
