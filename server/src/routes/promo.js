const router = require('express').Router()
const { validatePromo } = require('../controllers/promoController')

router.post('/validate', validatePromo)

module.exports = router
