const nodemailer = require('nodemailer')

let transporter = null

async function getTransporter() {
  if (transporter) return transporter

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } else {
    // Ethereal Email for testing — auto-creates test account
    const testAccount = await nodemailer.createTestAccount()
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    console.log('[Email] Using Ethereal test account:', testAccount.user)
  }

  return transporter
}

const FROM = process.env.EMAIL_FROM || '"NEX PC" <noreply@nexpc.kz>'
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000'

async function send(to, subject, html) {
  try {
    const t = await getTransporter()
    const info = await t.sendMail({ from: FROM, to, subject, html })
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('[Email] Preview URL:', nodemailer.getTestMessageUrl(info))
    }
  } catch (err) {
    console.error('[Email] Failed to send:', err.message)
    throw err
  }
}

async function sendVerificationEmail(user, token) {
  const url = `${BASE_URL}/verify-email?token=${token}`
  await send(
    user.email,
    'Verify your NEX PC email',
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#111827;margin-bottom:8px">Verify your email</h2>
      <p style="color:#6b7280;margin-bottom:24px">Hi ${user.name}, please confirm your email address to activate your NEX PC account.</p>
      <a href="${url}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Verify Email</a>
      <p style="color:#9ca3af;font-size:13px;margin-top:24px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>
    `
  )
}

async function sendWelcomeEmail(user) {
  await send(
    user.email,
    'Welcome to NEX PC!',
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#111827;margin-bottom:8px">Welcome to NEX PC, ${user.name}!</h2>
      <p style="color:#6b7280;margin-bottom:24px">Your account has been created. Explore our ready-made PCs or build your own custom configuration.</p>
      <a href="${BASE_URL}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Shop Now</a>
    </div>
    `
  )
}

async function sendOrderConfirmation(user, order) {
  const orderId = String(order.id).slice(-8).toUpperCase()
  await send(
    user.email,
    `Order Confirmed — #${orderId}`,
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#111827;margin-bottom:8px">Order Confirmed!</h2>
      <p style="color:#6b7280;margin-bottom:8px">Hi ${user.name}, your order <strong>#${orderId}</strong> has been placed.</p>
      <p style="color:#6b7280;margin-bottom:24px">Total: <strong>₸${order.totalPrice.toLocaleString()}</strong></p>
      <a href="${BASE_URL}/orders/${order.id}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View Order</a>
    </div>
    `
  )
}

async function sendOrderStatusUpdate(user, order, newStatus) {
  const orderId = String(order.id).slice(-8).toUpperCase()
  const statusLabel = newStatus.charAt(0) + newStatus.slice(1).toLowerCase()
  await send(
    user.email,
    `Order Update — #${orderId} is ${statusLabel}`,
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#111827;margin-bottom:8px">Order Status Updated</h2>
      <p style="color:#6b7280;margin-bottom:8px">Hi ${user.name}, your order <strong>#${orderId}</strong> is now <strong>${statusLabel}</strong>.</p>
      <a href="${BASE_URL}/orders/${order.id}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">View Order</a>
    </div>
    `
  )
}

async function sendPasswordResetEmail(user, token) {
  const url = `${BASE_URL}/reset-password?token=${token}`
  await send(
    user.email,
    'Reset your NEX PC password',
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#111827;margin-bottom:8px">Reset your password</h2>
      <p style="color:#6b7280;margin-bottom:24px">Hi ${user.name}, click below to reset your password. This link expires in 1 hour.</p>
      <a href="${url}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a>
      <p style="color:#9ca3af;font-size:13px;margin-top:24px">If you didn't request a reset, ignore this email.</p>
    </div>
    `
  )
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPasswordResetEmail,
}
