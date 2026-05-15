const router = require('express').Router()
const { body } = require('express-validator')
const { authenticate } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { register, login, getMe, updateProfile, verifyEmail, resendVerification } = require('../controllers/authController')

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  register
)

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
)

router.get('/me', authenticate, getMe)

router.put(
  '/me',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  ],
  validate,
  updateProfile
)

router.get('/verify-email', verifyEmail)
router.post('/resend-verification', authenticate, resendVerification)

module.exports = router
