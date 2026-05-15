const prisma = require('../utils/prisma')

const validatePromo = async (req, res, next) => {
  try {
    const { code, cartTotal } = req.body
    if (!code) return res.status(400).json({ error: 'Code is required' })

    const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } })
    if (!promo || !promo.isActive) return res.status(400).json({ error: 'Invalid or inactive promo code' })
    if (promo.expiresAt && new Date() > promo.expiresAt) return res.status(400).json({ error: 'Promo code has expired' })
    if (promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'Promo code usage limit reached' })

    const total = parseFloat(cartTotal) || 0
    const discountAmount = Math.round((total * promo.discount) / 100)
    const finalTotal = Math.max(0, total - discountAmount)

    res.json({ valid: true, discount: promo.discount, discountAmount, finalTotal, promoId: promo.id })
  } catch (err) {
    next(err)
  }
}

const listPromoCodes = async (req, res, next) => {
  try {
    const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ codes })
  } catch (err) {
    next(err)
  }
}

const createPromoCode = async (req, res, next) => {
  try {
    const { code, discount, maxUses, expiresAt } = req.body
    if (!code || !discount) return res.status(400).json({ error: 'code and discount are required' })
    if (discount < 1 || discount > 100) return res.status(400).json({ error: 'Discount must be between 1 and 100' })

    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        discount: parseFloat(discount),
        maxUses: parseInt(maxUses) || 100,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    res.status(201).json({ promo })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Promo code already exists' })
    next(err)
  }
}

const deletePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params
    await prisma.promoCode.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

const togglePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params
    const promo = await prisma.promoCode.findUnique({ where: { id } })
    if (!promo) return res.status(404).json({ error: 'Promo code not found' })

    const updated = await prisma.promoCode.update({
      where: { id },
      data: { isActive: !promo.isActive },
    })
    res.json({ promo: updated })
  } catch (err) {
    next(err)
  }
}

module.exports = { validatePromo, listPromoCodes, createPromoCode, deletePromoCode, togglePromoCode }
