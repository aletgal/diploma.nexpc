const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, avatar: true, emailVerified: true, createdAt: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

module.exports = { authenticate, requireAdmin }
