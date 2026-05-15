const router = require('express').Router()
const { body } = require('express-validator')
const { authenticate, requireAdmin } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { chat, recommend, performancePredict, benchmark, generateDescription, generateUseCases, rateComponent } = require('../controllers/aiController')

router.post(
  '/chat',
  authenticate,
  [body('message').notEmpty().withMessage('message is required')],
  validate,
  chat
)

router.post('/recommend', recommend)

router.post('/performance', performancePredict)

router.post('/benchmark', benchmark)

router.post('/generate-description', generateDescription)

router.post('/generate-use-cases', generateUseCases)

router.post('/rate-component', rateComponent)

module.exports = router
