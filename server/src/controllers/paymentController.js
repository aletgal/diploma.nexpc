const Stripe = require('stripe')

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2023-10-16' })
}

const createIntent = async (req, res, next) => {
  try {
    const { amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    const stripe = getStripe()

    // pass KZT amount as-is (not × 100) — multiplying would overflow Stripe's int max for large builds
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'usd', // Stripe doesn't support KZT; demo shows KZT labels over USD amounts
      metadata: { userId: req.user.id },
    })

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id })
  } catch (err) {
    next(err)
  }
}

const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' })
    }

    const stripe = getStripe()
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ error: `Payment not succeeded. Status: ${intent.status}` })
    }

    res.json({ status: intent.status, paymentIntentId: intent.id })
  } catch (err) {
    next(err)
  }
}

module.exports = { createIntent, confirmPayment }
