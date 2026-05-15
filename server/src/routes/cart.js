const router = require('express').Router()
const { body } = require('express-validator')
const { authenticate } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController')

router.get('/', authenticate, getCart)

router.post(
  '/',
  authenticate,
  [
    body('productId').notEmpty().withMessage('productId is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  addToCart
)

router.put(
  '/:id',
  authenticate,
  [
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or more'),
  ],
  validate,
  updateCartItem
)

router.delete('/:id', authenticate, removeFromCart)
router.delete('/', authenticate, clearCart)

module.exports = router
