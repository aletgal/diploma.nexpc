const prisma = require('../utils/prisma')
const { sendOrderConfirmation } = require('../services/emailService')

const getOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ orders })
  } catch (err) {
    next(err)
  }
}

const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params

    const order = await prisma.order.findUnique({ where: { id } })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    res.json({ order })
  } catch (err) {
    next(err)
  }
}

const createOrder = async (req, res, next) => {
  try {
    const { address, customBuild, paymentStatus, paymentMethod, paymentIntentId, promoCode } = req.body

    let promoDiscount = 0
    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({ where: { code: promoCode.toUpperCase() } })
      if (promo && promo.isActive && promo.usedCount < promo.maxUses) {
        promoDiscount = promo.discount
        await prisma.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })
      }
    }

    // Custom build order (from configurator checkout)
    if (customBuild) {
      const { name: buildName, components, totalPrice: buildTotal } = customBuild
      const componentItems = Object.entries(components || {}).map(([slot, comp]) => ({
        slot,
        name: comp.name,
        price: comp.price || 0,
        quantity: comp.quantity || 1,
        imageUrl: comp.imageUrl || null,
      }))
      const rawTotal = buildTotal || componentItems.reduce((s, c) => s + c.price * c.quantity, 0)
      const totalPrice = promoDiscount > 0 ? rawTotal * (1 - promoDiscount / 100) : rawTotal
      const order = await prisma.order.create({
        data: {
          userId: req.user.id,
          totalPrice,
          items: { type: 'CUSTOM_BUILD', buildName: buildName || 'Custom Build', components: componentItems },
          address: address || {},
          status: 'PENDING',
          paymentStatus: paymentStatus || 'PENDING',
          paymentMethod: paymentMethod || null,
          paymentIntentId: paymentIntentId || null,
        },
      })
      sendOrderConfirmation(req.user, order).catch(() => {})
      return res.status(201).json({ order })
    }

    // Regular cart order — wrap in transaction to check and decrement stock
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true },
    })

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' })
    }

    // Check stock before starting transaction
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${item.product.name}. Available: ${item.product.stock}`,
        })
      }
    }

    const items = cartItems.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      images: item.product.images,
      specs: item.product.specs || {},
    }))

    const rawTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const totalPrice = promoDiscount > 0 ? rawTotal * (1 - promoDiscount / 100) : rawTotal

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cartItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product || product.stock < item.quantity) {
          throw Object.assign(new Error(`Not enough stock for ${item.product.name}`), { status: 400 })
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          totalPrice,
          items,
          address,
          status: 'PENDING',
          paymentStatus: paymentStatus || 'PENDING',
          paymentMethod: paymentMethod || null,
          paymentIntentId: paymentIntentId || null,
        },
      })

      await tx.cartItem.deleteMany({ where: { userId: req.user.id } })

      return newOrder
    })

    sendOrderConfirmation(req.user, order).catch(() => {})

    res.status(201).json({ order })
  } catch (err) {
    next(err)
  }
}

const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only PENDING orders can be cancelled' })
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    res.json({ order: updated })
  } catch (err) {
    next(err)
  }
}

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    const { sendOrderStatusUpdate } = require('../services/emailService')
    try { await sendOrderStatusUpdate(order.user, order, status) } catch {}

    res.json({ order })
  } catch (err) {
    next(err)
  }
}

const reorder = async (req, res, next) => {
  try {
    const { id } = req.params

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (order.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' })

    const rawItems = order.items
    let items = []
    if (rawItems?.type === 'CUSTOM_BUILD') {
      return res.status(400).json({ error: 'Custom builds cannot be reordered via cart' })
    } else if (Array.isArray(rawItems)) {
      items = rawItems
    }

    const added = []
    const skipped = []

    for (const item of items) {
      if (!item.productId) { skipped.push(item.name || 'Unknown'); continue }
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product || product.stock <= 0) { skipped.push(item.name || 'Unknown'); continue }

      const qty = item.quantity || 1
      const existing = await prisma.cartItem.findUnique({
        where: { userId_productId: { userId: req.user.id, productId: item.productId } },
      })
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + qty },
        })
      } else {
        await prisma.cartItem.create({
          data: { userId: req.user.id, productId: item.productId, quantity: qty },
        })
      }
      added.push(item.name || product.name)
    }

    res.json({ added, skipped })
  } catch (err) {
    next(err)
  }
}

module.exports = { getOrders, getOrder, createOrder, cancelOrder, updateOrderStatus, reorder }
