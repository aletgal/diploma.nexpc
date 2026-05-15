const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const {
  getBuilds,
  getBuild,
  createBuild,
  updateBuild,
  deleteBuild,
} = require('../controllers/buildController')

router.get('/', authenticate, getBuilds)
router.get('/:id', authenticate, getBuild)
router.post('/', authenticate, createBuild)
router.put('/:id', authenticate, updateBuild)
router.delete('/:id', authenticate, deleteBuild)

module.exports = router
