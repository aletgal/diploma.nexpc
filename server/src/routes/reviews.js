const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { deleteReview } = require('../controllers/reviewController')

router.delete('/:id', authenticate, deleteReview)

module.exports = router
