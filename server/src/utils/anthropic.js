const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'

module.exports = { anthropic, MODEL }
