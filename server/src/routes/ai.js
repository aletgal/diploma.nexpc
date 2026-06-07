const router = require('express').Router()
const { body } = require('express-validator')
const { authenticate, requireAdmin } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { chat, recommend, ramRecommendation, performancePredict, benchmark, generateDescription, generateUseCases, rateComponent, getBuildTemplate } = require('../controllers/aiController')

router.post(
  '/chat',
  authenticate,
  [body('message').notEmpty().withMessage('message is required')],
  validate,
  chat
)

router.post('/recommend', recommend)

router.post('/ram-recommendation', ramRecommendation)

router.post('/performance', performancePredict)

router.post('/benchmark', benchmark)

router.post('/generate-description', generateDescription)

router.post('/generate-use-cases', generateUseCases)

router.post('/rate-component', rateComponent)

router.post('/build-template', getBuildTemplate)

module.exports = router
