const router = require('express').Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const {
  getComponents,
  getComponentFilterOptions,
  getComponent,
  getComponentProducts,
  createComponent,
  updateComponent,
  deleteComponent,
} = require('../controllers/componentController')

router.get('/', getComponents)
router.get('/filter-options', getComponentFilterOptions)
router.get('/:id', getComponent)
router.get('/:id/products', getComponentProducts)
router.post('/', authenticate, requireAdmin, createComponent)
router.put('/:id', authenticate, requireAdmin, updateComponent)
router.delete('/:id', authenticate, requireAdmin, deleteComponent)

module.exports = router
