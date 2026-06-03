const prisma = require('../utils/prisma')

const getWishlist = async (req, res, next) => {
  try {
    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: { product: true },
      orderBy: { id: 'asc' },
    })

    res.json({ wishlistItems })
  } catch (err) {
    next(err)
  }
}

const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    })

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } })
      return res.json({ removed: true })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const item = await prisma.wishlist.create({
      data: { userId: req.user.id, productId },
      include: { product: true },
    })

    res.json({ added: true, item })
  } catch (err) {
    next(err)
  }
}

const removeFromWishlist = async (req, res, next) => {
  try {
    const { id } = req.params

    const existing = await prisma.wishlist.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Wishlist item not found' })
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await prisma.wishlist.delete({ where: { id } })

    res.json({ message: 'Item removed from wishlist' })
  } catch (err) {
    next(err)
  }
}

module.exports = { getWishlist, toggleWishlist, removeFromWishlist }
