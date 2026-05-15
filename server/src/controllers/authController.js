const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/emailService')

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  emailVerified: true,
  createdAt: true,
}

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpiry,
      },
      select: USER_SELECT,
    })

    // Send emails — never fail registration if email fails
    try { await sendVerificationEmail(user, verificationToken) } catch {}
    try { await sendWelcomeEmail(user) } catch {}

    const token = signToken(user)

    res.status(201).json({ token, user })
  } catch (err) {
    next(err)
  }
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user)

    const { password: _pw, verificationToken: _vt, verificationTokenExpiry: _vre, ...userWithoutSensitive } = user

    res.json({ token, user: userWithoutSensitive })
  } catch (err) {
    next(err)
  }
}

const getMe = async (req, res, next) => {
  try {
    res.json({ user: req.user })
  } catch (err) {
    next(err)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, currentPassword, newPassword } = req.body

    const data = {}
    if (name !== undefined) data.name = name
    if (avatar !== undefined) data.avatar = avatar

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' })
      }
      // Fetch full user record to compare password
      const fullUser = await prisma.user.findUnique({ where: { id: req.user.id } })
      const valid = await bcrypt.compare(currentPassword, fullUser.password)
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' })
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' })
      }
      data.password = await bcrypt.hash(newPassword, 12)
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: USER_SELECT,
    })

    res.json({ user })
  } catch (err) {
    next(err)
  }
}

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' })
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    })

    res.json({ message: 'Email verified successfully' })
  } catch (err) {
    next(err)
  }
}

const resendVerification = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpiry },
    })

    try { await sendVerificationEmail(user, verificationToken) } catch {}

    res.json({ message: 'Verification email sent' })
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login, getMe, updateProfile, verifyEmail, resendVerification }
