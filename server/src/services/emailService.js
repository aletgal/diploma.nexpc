const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'NEX PC <noreply@nexpc.me>'
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000'

async function sendVerificationEmail(user, token) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: 'Verify your NEX PC account',
    html: `<h2>Welcome to NEX PC!</h2><p>Click the link to verify your email:</p><a href="${verifyUrl}">Verify Email</a>`,
  })
}

async function sendWelcomeEmail(user) {
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: 'Welcome to NEX PC!',
    html: `<h2>Welcome ${user.name}!</h2><p>Your account has been created successfully.</p>`,
  })
}

async function sendOrderConfirmation(user, order) {
  const orderId = String(order.id).slice(-8).toUpperCase()
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Order Confirmed — #${orderId}`,
    html: `<h2>Order Confirmed!</h2><p>Your order #${orderId} for ${order.totalPrice.toLocaleString()} ₸ has been placed successfully.</p><p>Track your order at: ${BASE_URL}/orders</p>`,
  })
}

async function sendOrderStatusUpdate(user, order, newStatus) {
  const orderId = String(order.id).slice(-8).toUpperCase()
  const statusMessages = {
    CONFIRMED: 'Your order is confirmed and we are preparing your build.',
    PROCESSING: 'Your PC is being assembled and tested.',
    SHIPPED: 'Your order has been shipped and is on its way!',
    DELIVERED: 'Your order has been delivered. Enjoy your new PC!',
    CANCELLED: 'Your order has been cancelled.',
  }
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: `Order Update — #${orderId} is now ${newStatus}`,
    html: `<h2>Order Status Update</h2><p>Order #${orderId}: <strong>${newStatus}</strong></p><p>${statusMessages[newStatus] || ''}</p><p>View your order: ${BASE_URL}/orders/${order.id}</p>`,
  })
}

async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: 'Reset your NEX PC password',
    html: `<h2>Reset your password</h2><p>Hi ${user.name}, click below to reset your password. This link expires in 1 hour.</p><a href="${resetUrl}">Reset Password</a><p>If you didn't request a reset, ignore this email.</p>`,
  })
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPasswordResetEmail,
}
