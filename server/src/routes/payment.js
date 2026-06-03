const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { createIntent, confirmPayment } = require('../controllers/paymentController')

router.post('/create-intent', authenticate, createIntent)
router.post('/confirm', authenticate, confirmPayment)

module.exports = router
