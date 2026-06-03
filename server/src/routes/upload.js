const router = require('express').Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    const url = `/uploads/${req.file.filename}`
    res.json({ url })
  }
)

module.exports = router
