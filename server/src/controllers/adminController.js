const prisma = require('../utils/prisma')

const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalComponents,
      totalOrders,
      revenueResult,
      ordersByStatusRaw,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.component.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalPrice: true } }),
      prisma.order.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
    ])

    const totalRevenue = revenueResult._sum.totalPrice || 0

    const ordersByStatus = ordersByStatusRaw.reduce((acc, item) => {
      acc[item.status] = item._count.status
      return acc
    }, {})

    res.json({
      totalUsers,
      totalProducts,
      totalComponents,
      totalOrders,
      totalRevenue,
      ordersByStatus,
      recentOrders,
    })
  } catch (err) {
    next(err)
  }
}

const getUsers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query

    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      users,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    })
  } catch (err) {
    next(err)
  }
}

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params
    const { role } = req.body

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    })

    res.json({ user })
  } catch (err) {
    next(err)
  }
}

const getOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query

    const where = {}
    if (status) {
      where.status = status
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ])

    res.json({
      orders,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    })
  } catch (err) {
    next(err)
  }
}

const getAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [allOrders, ordersByStatusRaw] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
        select: { totalPrice: true, createdAt: true, items: true },
      }),
      prisma.order.groupBy({ by: ['status'], _count: { status: true } }),
    ])

    const dailyMap = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = 0
    }
    for (const order of allOrders) {
      const key = new Date(order.createdAt).toISOString().slice(0, 10)
      if (key in dailyMap) dailyMap[key] += order.totalPrice || 0
    }
    const dailyRevenue = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }))

    const ordersByStatus = ordersByStatusRaw.map((s) => ({ status: s.status, count: s._count.status }))

    const productCounts = {}
    const allOrdersForProducts = await prisma.order.findMany({ select: { items: true } })
    for (const order of allOrdersForProducts) {
      const items = Array.isArray(order.items) ? order.items : []
      for (const item of items) {
        if (item.productId) {
          productCounts[item.productId] = (productCounts[item.productId] || { id: item.productId, name: item.name || 'Unknown', count: 0 })
          productCounts[item.productId].count++
        }
      }
    }
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => ({ name: (p.name || 'Unknown').slice(0, 25), orders: p.count }))

    res.json({ dailyRevenue, ordersByStatus, topProducts })
  } catch (err) {
    next(err)
  }
}

const getNotifications = async (req, res, next) => {
  try {
    const [recentOrders, lowStockProducts] = await Promise.all([
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: { stock: { lte: 5 } },
        select: { id: true, name: true, stock: true },
        orderBy: { stock: 'asc' },
        take: 5,
      }),
    ])

    const notifications = [
      ...recentOrders.map((o) => ({
        id: `order-${o.id}`,
        type: 'order',
        message: `New order #${String(o.id).slice(-8).toUpperCase()} — ${o.totalPrice?.toLocaleString('kk-KZ')} ₸`,
        link: `/admin/orders`,
        createdAt: o.createdAt,
      })),
      ...lowStockProducts.map((p) => ({
        id: `stock-${p.id}`,
        type: 'stock',
        message: `Low stock: ${p.name} — ${p.stock} remaining`,
        link: `/admin/products`,
        createdAt: new Date(),
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.json({ notifications })
  } catch (err) {
    next(err)
  }
}

const bulkPriceUpdate = async (req, res, next) => {
  try {
    const { ids, priceChange } = req.body
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' })
    if (!priceChange?.type) return res.status(400).json({ error: 'priceChange.type required' })

    const products = await prisma.product.findMany({ where: { id: { in: ids } } })

    await prisma.$transaction(
      products.map((p) => {
        let newPrice
        if (priceChange.type === 'fixed') {
          newPrice = parseFloat(priceChange.value)
        } else {
          const pct = parseFloat(priceChange.value) / 100
          newPrice = priceChange.direction === 'decrease' ? p.price * (1 - pct) : p.price * (1 + pct)
        }
        newPrice = Math.max(0, Math.round(newPrice))
        return prisma.product.update({ where: { id: p.id }, data: { price: newPrice } })
      })
    )

    res.json({ updated: ids.length })
  } catch (err) {
    next(err)
  }
}

const getAllOrdersForExport = async (req, res, next) => {
  try {
    const { status } = req.query
    const where = {}
    if (status) where.status = status

    const orders = await prisma.order.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ orders })
  } catch (err) {
    next(err)
  }
}

module.exports = { getStats, getUsers, updateUserRole, getOrders, getAnalytics, getNotifications, bulkPriceUpdate, getAllOrdersForExport }
