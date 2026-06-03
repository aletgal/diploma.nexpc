const prisma = require('../utils/prisma')

const getProductReviews = async (req, res, next) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 5 } = req.query
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId: id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where: { productId: id } }),
    ])

    res.json({ reviews, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (err) {
    next(err)
  }
}

const getProductRating = async (req, res, next) => {
  try {
    const { id } = req.params
    const reviews = await prisma.review.findMany({ where: { productId: id }, select: { rating: true } })

    if (reviews.length === 0) {
      return res.json({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let sum = 0
    for (const r of reviews) {
      sum += r.rating
      distribution[r.rating] = (distribution[r.rating] || 0) + 1
    }

    res.json({ average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length, distribution })
  } catch (err) {
    next(err)
  }
}

const createReview = async (req, res, next) => {
  try {
    const { id: productId } = req.params
    const { rating, title, comment } = req.body
    const userId = req.user.id

    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' })
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })
    if (!comment?.trim()) return res.status(400).json({ error: 'Comment is required' })

    const review = await prisma.review.create({
      data: { userId, productId, rating: parseInt(rating), title: title.trim(), comment: comment.trim() },
      include: { user: { select: { name: true } } },
    })

    res.status(201).json({ review })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'You have already reviewed this product' })
    next(err)
  }
}

const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params
    const review = await prisma.review.findUnique({ where: { id } })
    if (!review) return res.status(404).json({ error: 'Review not found' })
    if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' })
    }
    await prisma.review.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { getProductReviews, getProductRating, createReview, deleteReview }
