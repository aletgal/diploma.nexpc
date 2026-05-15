const prisma = require('../utils/prisma')

const getBuilds = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 9 } = req.query

    const where = { userId: req.user.id }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const [builds, total] = await Promise.all([
      prisma.customBuild.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.customBuild.count({ where }),
    ])

    res.json({ builds, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } })
  } catch (err) {
    next(err)
  }
}

const getBuild = async (req, res, next) => {
  try {
    const { id } = req.params

    const build = await prisma.customBuild.findUnique({ where: { id } })

    if (!build) {
      return res.status(404).json({ error: 'Build not found' })
    }
    if (build.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    res.json({ build })
  } catch (err) {
    next(err)
  }
}

const createBuild = async (req, res, next) => {
  try {
    const { name, components, totalPrice, aiContext, status } = req.body

    const build = await prisma.customBuild.create({
      data: {
        userId: req.user.id,
        name: name || '',
        components: components || {},
        totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : 0,
        aiContext: aiContext || {},
        status: status || 'draft',
      },
    })

    res.status(201).json({ build })
  } catch (err) {
    next(err)
  }
}

const updateBuild = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, components, totalPrice, aiContext, status } = req.body

    const existing = await prisma.customBuild.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Build not found' })
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const data = {}
    if (name !== undefined) data.name = name
    if (components !== undefined) data.components = components
    if (totalPrice !== undefined) data.totalPrice = parseFloat(totalPrice)
    if (aiContext !== undefined) data.aiContext = aiContext
    if (status !== undefined) data.status = status

    const build = await prisma.customBuild.update({
      where: { id },
      data,
    })

    res.json({ build })
  } catch (err) {
    next(err)
  }
}

const deleteBuild = async (req, res, next) => {
  try {
    const { id } = req.params

    const existing = await prisma.customBuild.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Build not found' })
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await prisma.customBuild.delete({ where: { id } })

    res.json({ message: 'Build deleted' })
  } catch (err) {
    next(err)
  }
}

module.exports = { getBuilds, getBuild, createBuild, updateBuild, deleteBuild }
