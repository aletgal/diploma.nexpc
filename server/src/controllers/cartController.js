const prisma = require('../utils/prisma')

const getCart = async (req, res, next) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true },
      orderBy: { id: 'asc' },
    })

    res.json({ cartItems })
  } catch (err) {
    next(err)
  }
}

const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    if (product.stock <= 0) {
      return res.status(400).json({ error: `${product.name} is out of stock` })
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    })

    let cartItem
    if (existing) {
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + parseInt(quantity) },
        include: { product: true },
      })
    } else {
      cartItem = await prisma.cartItem.create({
        data: { userId: req.user.id, productId, quantity: parseInt(quantity) },
        include: { product: true },
      })
    }

    res.json({ cartItem })
  } catch (err) {
    next(err)
  }
}

const updateCartItem = async (req, res, next) => {
  try {
    const { id } = req.params
    const { quantity } = req.body

    const existing = await prisma.cartItem.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Cart item not found' })
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    if (parseInt(quantity) <= 0) {
      await prisma.cartItem.delete({ where: { id } })
      return res.json({ deleted: true })
    }

    const cartItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity: parseInt(quantity) },
      include: { product: true },
    })

    res.json({ cartItem })
  } catch (err) {
    next(err)
  }
}

const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params

    const existing = await prisma.cartItem.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Cart item not found' })
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await prisma.cartItem.delete({ where: { id } })

    res.json({ deleted: true })
  } catch (err) {
    next(err)
  }
}

const clearCart = async (req, res, next) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id } })

    res.json({ message: 'Cart cleared' })
  } catch (err) {
    next(err)
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart }
