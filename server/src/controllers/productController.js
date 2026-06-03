const prisma = require('../utils/prisma')

const KNOWN_PRODUCT_PARAMS = new Set([
  'search', 'category', 'featured', 'minPrice', 'maxPrice',
  'sort', 'page', 'limit', 'exclude',
  'CPU_BRAND', 'CPU_MODEL',
  'GPU_BRAND', 'GPU_MODEL', 'GPU_VRAM',
  'RAM_CAPACITY', 'RAM_TYPE', 'RAM_SPEED',
  'STORAGE_TYPE', 'STORAGE_CAPACITY',
  'PSU_WATTAGE', 'PSU_RATING',
])

function cpuBrand(s) {
  if (!s) return null
  if (/intel/i.test(s)) return 'Intel'
  if (/amd/i.test(s)) return 'AMD'
  return null
}

function cpuModel(s) {
  if (!s) return null
  const m = s.replace(/^(intel|amd)\s*/i, '').trim()
  return m || null
}

function gpuBrand(s) {
  if (!s) return null
  if (/nvidia/i.test(s)) return 'NVIDIA'
  if (/amd|radeon/i.test(s)) return 'AMD'
  if (/intel/i.test(s)) return 'Intel'
  return null
}

function gpuModel(s) {
  if (!s) return null
  const m = s
    .replace(/^(nvidia|amd|radeon|intel)\s*/i, '')
    .replace(/\s*\d+\s*GB.*/i, '')
    .trim()
  return m || null
}

function gpuVram(s) {
  if (!s) return null
  const m = s.match(/(\d+)\s*GB/i)
  return m ? `${m[1]}GB` : null
}

function ramCapacity(s) {
  if (!s) return null
  const m = s.match(/^(\d+)\s*GB/i)
  return m ? `${m[1]}GB` : null
}

function ramType(s) {
  if (!s) return null
  const m = s.match(/DDR[45X]/i)
  return m ? m[0].toUpperCase() : null
}

function ramSpeed(s) {
  if (!s) return null
  const m = s.match(/[-\s](\d{3,5})\s*(?:MHz)?/i)
  return m ? `${m[1]}MHz` : null
}

function storageType(s) {
  if (!s) return null
  if (/nvme/i.test(s)) return 'NVMe SSD'
  if (/sata.*ssd|ssd.*sata/i.test(s)) return 'SATA SSD'
  if (/ssd/i.test(s)) return 'SSD'
  if (/hdd/i.test(s)) return 'HDD'
  return null
}

function storageCapacity(s) {
  if (!s) return null
  const m = s.match(/(\d+(?:\.\d+)?)\s*(TB|GB)/i)
  if (!m) return null
  return `${parseFloat(m[1])}${m[2].toUpperCase()}`
}

function psuWattage(s) {
  if (!s) return null
  const m = s.match(/(\d+)\s*W/i)
  return m ? `${m[1]}W` : null
}

function psuRating(s) {
  if (!s) return null
  const m = s.match(/80\+\s*(Bronze|Silver|Gold|Platinum|Titanium)/i)
  if (!m) return null
  return `80+ ${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()}`
}

const PARSED_FILTER_MAP = {
  CPU_BRAND:        (v) => ({ path: 'CPU',     term: v }),
  CPU_MODEL:        (v) => ({ path: 'CPU',     term: v }),
  GPU_BRAND:        (v) => ({ path: 'GPU',     term: v }),
  GPU_MODEL:        (v) => ({ path: 'GPU',     term: v }),
  GPU_VRAM:         (v) => ({ path: 'GPU',     term: v }),
  RAM_CAPACITY:     (v) => ({ path: 'RAM',     term: v }),
  RAM_TYPE:         (v) => ({ path: 'RAM',     term: v }),
  RAM_SPEED:        (v) => ({ path: 'RAM',     term: v.replace('MHz', '') }),
  STORAGE_TYPE:     (v) => ({ path: 'Storage', term: v === 'NVMe SSD' ? 'NVMe' : v === 'SATA SSD' ? 'SATA' : v }),
  STORAGE_CAPACITY: (v) => ({ path: 'Storage', term: v }),
  PSU_WATTAGE:      (v) => ({ path: 'PSU',     term: v }),
  PSU_RATING:       (v) => ({ path: 'PSU',     term: v }),
}

function smartSort(key, arr) {
  const numericFirst = ['GPU_VRAM', 'RAM_CAPACITY', 'STORAGE_CAPACITY', 'PSU_WATTAGE', 'RAM_SPEED']
  if (numericFirst.includes(key)) {
    return arr.sort((a, b) => {
      const na = parseFloat(a)
      const nb = parseFloat(b)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return a.localeCompare(b)
    })
  }
  return arr.sort()
}

const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      featured,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 12,
      exclude,
    } = req.query

    const where = {}
    if (exclude) where.id = { not: exclude }
    const andConditions = []

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) where.category = category
    if (featured !== undefined) where.featured = featured === 'true'

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    for (const [key, mapFn] of Object.entries(PARSED_FILTER_MAP)) {
      if (req.query[key]) {
        const { path, term } = mapFn(req.query[key])
        andConditions.push({ specs: { path: [path], string_contains: term } })
      }
    }

    // unknown query params treated as raw spec filters
    for (const [key, value] of Object.entries(req.query)) {
      if (!KNOWN_PRODUCT_PARAMS.has(key) && value) {
        andConditions.push({ specs: { path: [key], string_contains: value } })
      }
    }

    if (andConditions.length > 0) where.AND = andConditions

    let orderBy = { createdAt: 'desc' }
    if (sort === 'price_asc') orderBy = { price: 'asc' }
    else if (sort === 'price_desc') orderBy = { price: 'desc' }
    else if (sort === 'name_asc') orderBy = { name: 'asc' }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: limitNum }),
      prisma.product.count({ where }),
    ])

    const totalPages = Math.ceil(total / limitNum)
    res.json({ products, pagination: { total, page: pageNum, limit: limitNum, totalPages } })
  } catch (err) {
    next(err)
  }
}

const getProductFilterOptions = async (req, res, next) => {
  try {
    const { category } = req.query
    const where = category ? { category } : {}
    const products = await prisma.product.findMany({ where, select: { specs: true } })

    const sets = {
      CPU_BRAND: new Set(), CPU_MODEL: new Set(),
      GPU_BRAND: new Set(), GPU_MODEL: new Set(), GPU_VRAM: new Set(),
      RAM_CAPACITY: new Set(), RAM_TYPE: new Set(), RAM_SPEED: new Set(),
      STORAGE_TYPE: new Set(), STORAGE_CAPACITY: new Set(),
      PSU_WATTAGE: new Set(), PSU_RATING: new Set(),
    }

    for (const { specs } of products) {
      if (!specs || typeof specs !== 'object' || Array.isArray(specs)) continue

      const add = (key, val) => { if (val) sets[key].add(val) }

      add('CPU_BRAND',        cpuBrand(specs.CPU))
      add('CPU_MODEL',        cpuModel(specs.CPU))
      add('GPU_BRAND',        gpuBrand(specs.GPU))
      add('GPU_MODEL',        gpuModel(specs.GPU))
      add('GPU_VRAM',         gpuVram(specs.GPU))
      add('RAM_CAPACITY',     ramCapacity(specs.RAM))
      add('RAM_TYPE',         ramType(specs.RAM))
      add('RAM_SPEED',        ramSpeed(specs.RAM))
      add('STORAGE_TYPE',     storageType(specs.Storage))
      add('STORAGE_CAPACITY', storageCapacity(specs.Storage))
      add('PSU_WATTAGE',      psuWattage(specs.PSU))
      add('PSU_RATING',       psuRating(specs.PSU))
    }

    const result = {}
    for (const [key, vals] of Object.entries(sets)) {
      if (vals.size > 0) result[key] = smartSort(key, Array.from(vals))
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
}

const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { cartItems: true } } },
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const linkedComponents = []
    if (product.specs && typeof product.specs === 'object' && !Array.isArray(product.specs)) {
      const allComponents = await prisma.component.findMany({
        select: { id: true, name: true, category: true, imageUrl: true, images: true, price: true, manufacturer: true, model: true },
      })
      for (const [specKey, specValue] of Object.entries(product.specs)) {
        if (!specValue) continue
        const words = String(specValue).trim().split(/\s+/).filter((w) => w.length > 3)
        if (words.length === 0) continue
        const match = allComponents.find((c) => {
          const cname = c.name
          return words.every((w) => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(cname))
        })
        if (match) linkedComponents.push({ specKey, component: match })
      }
    }

    res.json({ product, linkedComponents })
  } catch (err) {
    next(err)
  }
}

const getFeatured = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { featured: true },
      take: 8,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ products })
  } catch (err) {
    next(err)
  }
}

const getHeroFeatured = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { heroFeatured: true },
      take: 3,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ products })
  } catch (err) {
    next(err)
  }
}

const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, images, category, stock, specs, featured, heroFeatured, performanceScore } = req.body

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        images: images || [],
        category,
        stock: stock !== undefined ? parseInt(stock) : 0,
        specs: specs || {},
        featured: featured || false,
        heroFeatured: heroFeatured || false,
        performanceScore: performanceScore !== undefined ? parseInt(performanceScore) : 5,
      },
    })

    res.status(201).json({ product })
  } catch (err) {
    next(err)
  }
}

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, description, price, images, category, stock, specs, featured, heroFeatured, performanceScore } = req.body

    const data = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (price !== undefined) data.price = parseFloat(price)
    if (images !== undefined) data.images = images
    if (category !== undefined) data.category = category
    if (stock !== undefined) data.stock = parseInt(stock)
    if (specs !== undefined) data.specs = specs
    if (featured !== undefined) data.featured = featured
    if (heroFeatured !== undefined) data.heroFeatured = heroFeatured
    if (performanceScore !== undefined) data.performanceScore = parseInt(performanceScore)

    const product = await prisma.product.update({ where: { id }, data })
    res.json({ product })
  } catch (err) {
    next(err)
  }
}

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params
    await prisma.product.delete({ where: { id } })
    res.json({ message: 'Product deleted' })
  } catch (err) {
    next(err)
  }
}

const getProductComponents = async (req, res, next) => {
  try {
    const { id } = req.params
    const links = await prisma.productComponent.findMany({
      where: { productId: id },
      include: { component: true },
    })
    const components = links.map((l) => l.component)
    res.json({ components })
  } catch (err) {
    next(err)
  }
}

const linkProductComponent = async (req, res, next) => {
  try {
    const { id } = req.params
    const { componentId } = req.body
    const link = await prisma.productComponent.upsert({
      where: { productId_componentId: { productId: id, componentId } },
      create: { productId: id, componentId },
      update: {},
    })
    res.status(201).json({ link })
  } catch (err) {
    next(err)
  }
}

const unlinkProductComponent = async (req, res, next) => {
  try {
    const { id, componentId } = req.params
    await prisma.productComponent.delete({
      where: { productId_componentId: { productId: id, componentId } },
    })
    res.json({ message: 'Component unlinked' })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getProducts,
  getProductFilterOptions,
  getProduct,
  getFeatured,
  getHeroFeatured,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductComponents,
  linkProductComponent,
  unlinkProductComponent,
}
