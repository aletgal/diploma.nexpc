require('dotenv').config()
const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const prisma = require('./utils/prisma')

const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const app = express()
const PORT = process.env.PORT || 5000

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

const aiRecommendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI recommendation requests, please slow down.' },
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(uploadsDir))

app.use('/api', generalLimiter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth',       require('./routes/auth'))
app.use('/api/products',   require('./routes/products'))
app.use('/api/components', require('./routes/components'))
app.use('/api/cart',       require('./routes/cart'))
app.use('/api/wishlist',   require('./routes/wishlist'))
app.use('/api/orders',     require('./routes/orders'))
app.use('/api/builds',     require('./routes/builds'))
app.use('/api/admin',      require('./routes/admin'))
app.use('/api/payment',    require('./routes/payment'))
app.use('/api/upload',     require('./routes/upload'))

app.use('/api/promo',    require('./routes/promo'))
app.use('/api/reviews',  require('./routes/reviews'))

// AI routes — apply stricter limiter to /recommend
const aiRouter = require('./routes/ai')
app.use('/api/ai', (req, res, next) => {
  if (req.path === '/recommend' || req.path === '/performance') return aiRecommendLimiter(req, res, next)
  next()
}, aiRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

const server = app.listen(PORT, () => {
  console.log(`NEX PC server running on http://localhost:${PORT}`)
})

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...')
  server.close(async () => {
    await prisma.$disconnect()
    console.log('Prisma disconnected. Exiting.')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
