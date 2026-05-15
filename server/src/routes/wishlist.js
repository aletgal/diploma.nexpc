const router = require('express').Router()
const { body } = require('express-validator')
const { authenticate } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
} = require('../controllers/wishlistController')

router.get('/', authenticate, getWishlist)

router.post(
  '/toggle',
  authenticate,
  [body('productId').notEmpty().withMessage('productId is required')],
  validate,
  toggleWishlist
)

router.delete('/:id', authenticate, removeFromWishlist)

module.exports = router
