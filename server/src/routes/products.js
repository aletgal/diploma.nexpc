const router = require('express').Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const {
  getProducts,
  getProductFilterOptions,
  getProduct,
  getFeatured,
  getHeroFeatured,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductComponents,
  linkProductComponent,
  unlinkProductComponent,
} = require('../controllers/productController')
const { getProductReviews, getProductRating, createReview } = require('../controllers/reviewController')

router.get('/', getProducts)
router.get('/featured', getFeatured)
router.get('/hero', getHeroFeatured)
router.get('/filter-options', getProductFilterOptions)
router.get('/:id', getProduct)
router.get('/:id/components', getProductComponents)
router.post('/', authenticate, requireAdmin, createProduct)
router.post('/:id/components', authenticate, requireAdmin, linkProductComponent)
router.put('/:id', authenticate, requireAdmin, updateProduct)
router.delete('/:id', authenticate, requireAdmin, deleteProduct)
router.delete('/:id/components/:componentId', authenticate, requireAdmin, unlinkProductComponent)

router.get('/:id/reviews', getProductReviews)
router.get('/:id/rating', getProductRating)
router.post('/:id/reviews', authenticate, createReview)

module.exports = router
