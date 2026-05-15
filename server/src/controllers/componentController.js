const prisma = require('../utils/prisma')

// specData fields to filter in JS (after Prisma fetch)
const SPEC_FILTER_KEYS = new Set([
  'socket', 'cores', 'tdp', 'integratedGraphics',
  'memorySize', 'memoryType', 'memoryClock', 'timings',
  'chipset', 'formFactor',
  'power', 'certificate', 'modularity',
  'waterCooling', 'dimensions', 'rgb',
  'gpuBrand',
])

// specData fields to extract per category for filter options
const CATEGORY_FILTER_FIELDS = {
  CPU: ['socket', 'cores', 'tdp', 'integratedGraphics'],
  GPU: ['memorySize', 'memoryType'],
  RAM: ['memoryType', 'memorySize', 'memoryClock', 'timings'],
  STORAGE: ['memoryType', 'memorySize'],
  MOTHERBOARD: ['socket', 'chipset', 'formFactor'],
  PSU: ['power', 'certificate', 'modularity'],
  CASE: ['formFactor'],
  COOLING: [],
  FAN: ['dimensions'],
}

function extractGpuModel(name) {
  if (!name) return null
  const m = name.match(/\b((?:RTX|GTX)\s+\d+(?:\s+(?:Ti|Super|XT|XTX))?\b|RX\s+\d+(?:\s+(?:XT|XTX))?\b)/i)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

function extractCpuModel(name) {
  if (!name) return null
  return name.replace(/^(AMD|Intel)\s+/i, '').trim()
}

function applySpecFilters(components, specFilters) {
  return components.filter((c) => {
    const sd = (c.specData && typeof c.specData === 'object' && !Array.isArray(c.specData)) ? c.specData : {}
    return Object.entries(specFilters).every(([key, val]) => {
      if (key === 'gpuBrand') {
        const n = c.name.toLowerCase()
        if (val === 'NVIDIA') return n.includes('geforce') || n.includes('rtx') || n.includes('gtx')
        if (val === 'AMD') return n.includes('radeon')
        return true
      }
      const sdVal = sd[key]
      if (sdVal === undefined || sdVal === null) return false
      if (key === 'integratedGraphics') {
        const converted = (sdVal === true || sdVal === 'true') ? 'Yes'
          : (sdVal === false || sdVal === 'false') ? 'No'
          : String(sdVal)
        return converted.toLowerCase() === val.toLowerCase()
      }
      if (typeof sdVal === 'boolean') return String(sdVal) === val
      if (key === 'socket') {
        return String(sdVal).split(/,\s*/).some((s) => s.toLowerCase() === val.toLowerCase())
      }
      return String(sdVal).toLowerCase().includes(val.toLowerCase())
    })
  })
}

const getComponents = async (req, res, next) => {
  try {
    const {
      category, brand, manufacturer, color, search,
      minPrice, maxPrice, gpuModel, cpuModel,
      sort, page = 1, limit = 12, exclude,
    } = req.query

    const where = {}

    if (exclude) where.id = { not: exclude }
    if (category) {
      const cats = category.split(',').map((c) => c.trim()).filter(Boolean)
      where.category = cats.length === 1 ? cats[0] : { in: cats }
    }
    if (brand) where.brand = { contains: brand, mode: 'insensitive' }
    if (manufacturer) where.manufacturer = { contains: manufacturer, mode: 'insensitive' }
    if (color) where.color = { contains: color, mode: 'insensitive' }

    // Name filter: model filters take priority over search
    const nameFilter = gpuModel || cpuModel || search
    if (nameFilter) where.name = { contains: nameFilter, mode: 'insensitive' }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    let orderBy = { name: 'asc' }
    if (sort === 'price_asc') orderBy = { price: 'asc' }
    else if (sort === 'price_desc') orderBy = { price: 'desc' }
    else if (sort === 'name_asc') orderBy = { name: 'asc' }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    const specFilters = {}
    for (const [key, value] of Object.entries(req.query)) {
      if (SPEC_FILTER_KEYS.has(key) && value) specFilters[key] = value
    }

    if (Object.keys(specFilters).length === 0) {
      // No spec filters: efficient DB-level pagination
      const skip = (pageNum - 1) * limitNum
      const [components, total] = await Promise.all([
        prisma.component.findMany({ where, orderBy, skip, take: limitNum }),
        prisma.component.count({ where }),
      ])
      return res.json({ components, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } })
    }

    // Spec filters: fetch all, filter in JS, paginate
    const all = await prisma.component.findMany({ where, orderBy })
    const filtered = applySpecFilters(all, specFilters)

    const total = filtered.length
    const skip = (pageNum - 1) * limitNum
    const components = filtered.slice(skip, skip + limitNum)

    res.json({ components, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } })
  } catch (err) {
    next(err)
  }
}

const getComponentFilterOptions = async (req, res, next) => {
  try {
    const allComponents = await prisma.component.findMany({
      select: { category: true, name: true, manufacturer: true, color: true, specData: true },
    })

    const categories = new Set()
    const filtersByCategory = {}

    for (const { category, name, manufacturer, color, specData } of allComponents) {
      if (!category) continue
      categories.add(category)

      if (!filtersByCategory[category]) filtersByCategory[category] = {
        manufacturer: new Set(),
        color: new Set(),
        cpuModel: new Set(),
        gpuModel: new Set(),
      }
      const catFilters = filtersByCategory[category]

      // Manufacturer: top-level field, fallback to specData.manufacturer
      const sd = (specData && typeof specData === 'object' && !Array.isArray(specData)) ? specData : {}
      const mfr = manufacturer || sd.manufacturer
      if (mfr) catFilters.manufacturer.add(String(mfr))

      // Color: top-level field
      if (color) catFilters.color.add(String(color))

      // CPU model: name without AMD/Intel prefix
      if (category === 'CPU') {
        const model = extractCpuModel(name)
        if (model) catFilters.cpuModel.add(model)
      }

      // GPU model: RTX/GTX/RX chip extraction
      if (category === 'GPU') {
        const model = extractGpuModel(name)
        if (model) catFilters.gpuModel.add(model)
      }

      // Category-specific specData fields
      const fields = CATEGORY_FILTER_FIELDS[category] || []
      for (const field of fields) {
        const val = sd[field]
        if (val === undefined || val === null) continue

        if (!catFilters[field]) catFilters[field] = new Set()

        if (field === 'integratedGraphics') {
          const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)
          catFilters[field].add(display)
        } else if (typeof val === 'boolean') {
          continue // skip other raw booleans (handled by hardcoded display values)
        } else if (field === 'socket') {
          String(val).split(/,\s*/).forEach((s) => { if (s.trim()) catFilters[field].add(s.trim()) })
        } else {
          catFilters[field].add(String(val))
        }
      }
    }

    const filters = {}
    for (const [cat, catFilters] of Object.entries(filtersByCategory)) {
      filters[cat] = {}
      for (const [key, vals] of Object.entries(catFilters)) {
        const arr = Array.from(vals).sort()
        if (arr.length > 0) filters[cat][key] = arr
      }
    }

    res.json({ categories: Array.from(categories).sort(), filters })
  } catch (err) {
    next(err)
  }
}

const getComponent = async (req, res, next) => {
  try {
    const { id } = req.params
    const component = await prisma.component.findUnique({ where: { id } })
    if (!component) {
      return res.status(404).json({ error: 'Component not found' })
    }

    const allProducts = await prisma.product.findMany({
      select: { id: true, name: true, price: true, images: true, category: true, specs: true },
    })
    const compWords = component.name.trim().split(/\s+/).filter((w) => w.length > 3)
    const usedInBuilds = allProducts
      .filter((p) => {
        if (!p.specs || typeof p.specs !== 'object' || Array.isArray(p.specs)) return false
        return Object.values(p.specs).some((v) => {
          if (!v) return false
          const specStr = String(v)
          return compWords.length > 0 && compWords.every(
            (w) => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(specStr)
          )
        })
      })
      .map(({ specs, ...rest }) => rest)

    res.json({ component, usedInBuilds })
  } catch (err) {
    next(err)
  }
}

const getComponentProducts = async (req, res, next) => {
  try {
    const { id } = req.params
    const links = await prisma.productComponent.findMany({
      where: { componentId: id },
      include: {
        product: {
          select: { id: true, name: true, price: true, images: true, category: true },
        },
      },
    })
    const products = links.map((l) => l.product)
    res.json({ products })
  } catch (err) {
    next(err)
  }
}

const createComponent = async (req, res, next) => {
  try {
    const { name, category, brand, manufacturer, model, color, imageUrl, price, specs, specData, stock, images, description } = req.body
    const component = await prisma.component.create({
      data: {
        name,
        category,
        brand: brand || null,
        manufacturer: manufacturer || null,
        model: model || null,
        color: color || null,
        imageUrl: imageUrl || null,
        price: parseFloat(price),
        specs: specs || {},
        specData: specData || null,
        stock: stock !== undefined ? parseInt(stock) : 0,
        images: images || [],
        description: description || null,
      },
    })
    res.status(201).json({ component })
  } catch (err) {
    next(err)
  }
}

const updateComponent = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, category, brand, manufacturer, model, color, imageUrl, price, specs, specData, stock, images, description } = req.body

    const data = {}
    if (name !== undefined) data.name = name
    if (category !== undefined) data.category = category
    if (brand !== undefined) data.brand = brand
    if (manufacturer !== undefined) data.manufacturer = manufacturer
    if (model !== undefined) data.model = model
    if (color !== undefined) data.color = color
    if (imageUrl !== undefined) data.imageUrl = imageUrl
    if (price !== undefined) data.price = parseFloat(price)
    if (specs !== undefined) data.specs = specs
    if (specData !== undefined) data.specData = specData
    if (stock !== undefined) data.stock = parseInt(stock)
    if (images !== undefined) data.images = images
    if (description !== undefined) data.description = description

    const component = await prisma.component.update({ where: { id }, data })
    res.json({ component })
  } catch (err) {
    next(err)
  }
}

const deleteComponent = async (req, res, next) => {
  try {
    const { id } = req.params
    await prisma.component.delete({ where: { id } })
    res.json({ message: 'Component deleted' })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getComponents,
  getComponentFilterOptions,
  getComponent,
  getComponentProducts,
  createComponent,
  updateComponent,
  deleteComponent,
}
