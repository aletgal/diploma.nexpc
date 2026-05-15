const router = require('express').Router()
const { body } = require('express-validator')
const { authenticate, requireAdmin } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const {
  getOrders,
  getOrder,
  createOrder,
  cancelOrder,
  updateOrderStatus,
  reorder,
} = require('../controllers/orderController')

router.get('/', authenticate, getOrders)
router.get('/:id', authenticate, getOrder)

router.post(
  '/',
  authenticate,
  [body('address').notEmpty().withMessage('Address is required').isObject().withMessage('Address must be an object')],
  validate,
  createOrder
)

router.patch('/:id/cancel', authenticate, cancelOrder)
router.post('/:id/reorder', authenticate, reorder)

router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  [
    body('status')
      .isIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
      .withMessage('Invalid status value'),
  ],
  validate,
  updateOrderStatus
)

module.exports = router
