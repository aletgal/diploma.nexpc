const router = require('express').Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const {
  getStats,
  getUsers,
  updateUserRole,
  getOrders,
  getAnalytics,
  getNotifications,
  bulkPriceUpdate,
  getAllOrdersForExport,
} = require('../controllers/adminController')
const {
  listPromoCodes,
  createPromoCode,
  deletePromoCode,
  togglePromoCode,
} = require('../controllers/promoController')

router.get('/stats', authenticate, requireAdmin, getStats)
router.get('/users', authenticate, requireAdmin, getUsers)
router.patch('/users/:id/role', authenticate, requireAdmin, updateUserRole)
router.get('/orders', authenticate, requireAdmin, getOrders)
router.get('/orders/export', authenticate, requireAdmin, getAllOrdersForExport)
router.get('/analytics', authenticate, requireAdmin, getAnalytics)
router.get('/notifications', authenticate, requireAdmin, getNotifications)
router.patch('/products/bulk-price', authenticate, requireAdmin, bulkPriceUpdate)

router.get('/promo', authenticate, requireAdmin, listPromoCodes)
router.post('/promo', authenticate, requireAdmin, createPromoCode)
router.delete('/promo/:id', authenticate, requireAdmin, deletePromoCode)
router.patch('/promo/:id/toggle', authenticate, requireAdmin, togglePromoCode)

module.exports = router
