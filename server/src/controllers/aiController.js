const { anthropic, MODEL } = require('../utils/anthropic')
const prisma = require('../utils/prisma')

const SYSTEM_PROMPT =
  "You are NEX PC's AI assistant, expert in PC building and hardware. Help users choose components, troubleshoot compatibility, and build optimal PCs within their budget. When recommending components, be specific with part names, prices, and explain compatibility. Be concise and professional."

const SLOT_BUDGET_WEIGHTS = {
  GPU: 0.35, CPU: 0.20, MOTHERBOARD: 0.10, RAM: 0.10,
  STORAGE: 0.08, PSU: 0.07, CASE: 0.06, COOLING: 0.04, FAN: 0.03,
}

const chat = async (req, res, next) => {
  try {
    const { message, history = [], buildId } = req.body

    let buildContext = ''
    if (buildId) {
      const build = await prisma.customBuild.findUnique({ where: { id: buildId } })
      if (build && build.userId === req.user.id) {
        buildContext = `\n\nCurrent build components: ${JSON.stringify(build.components, null, 2)}`
      }
    }

    const systemPrompt = SYSTEM_PROMPT + buildContext

    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ]

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    let fullText = ''

    try {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      })

      stream.on('text', (text) => {
        fullText += text
        res.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`)
      })

      await stream.finalMessage()

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()

      if (buildId) {
        const build = await prisma.customBuild.findUnique({ where: { id: buildId } })
        if (build && build.userId === req.user.id) {
          const existingContext = build.aiContext || {}
          const conversationHistory = existingContext.history || []
          conversationHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: fullText }
          )
          await prisma.customBuild.update({
            where: { id: buildId },
            data: { aiContext: { ...existingContext, history: conversationHistory } },
          })
        }
      }
    } catch (streamErr) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: streamErr.message })}\n\n`)
      res.end()
    }
  } catch (err) {
    next(err)
  }
}

const recommend = async (req, res, next) => {
  try {
    const { aiContext, currentBuild, selectingCategory, budget } = req.body

    const ac = aiContext || {}
    const buildList = Array.isArray(currentBuild)
      ? currentBuild
      : Object.entries(currentBuild || {}).filter(([, v]) => v).map(([slot, c]) => ({ slot, ...c }))

    const isUnlimited = !budget?.max || budget.max === null || budget.max === 0
    const effectiveBudget = isUnlimited ? 99999999 : budget.max
    const spentBudget = buildList.reduce((sum, c) => sum + (c.price || 0), 0)
    const remainingBudget = effectiveBudget - spentBudget

    const allComponents = await prisma.component.findMany({
      where: { category: selectingCategory, stock: { gt: 0 } },
    })

    const purpose = (ac.purpose || '').toLowerCase()
    const specificUse = JSON.stringify(ac.specificUse || '').toLowerCase()
    const isRendering = /render|3d|blender|maya|cinema|davinci|монтаж|видео|workstation/i.test(purpose + specificUse)
    const isGaming = /gaming|игр|game|fps/i.test(purpose + specificUse)
    const isHighEnd = effectiveBudget >= 1000000

    const scoredComponents = allComponents.map((comp) => {
      let score = 0
      const spec = comp.specData || {}

      if (selectingCategory === 'CPU') {
        const cores = parseInt(spec.cores) || 0
        const boost = parseFloat(spec.boostClock) || 0
        const isX3D = /x3d/i.test(comp.name)
        const isI9 = /i9|ryzen 9/i.test(comp.name)
        const isI7 = /i7|ryzen 7/i.test(comp.name)

        if (isRendering) {
          score += cores * 10
          score += boost * 5
          if (isX3D) score -= 200
          if (isI9) score += 150
          if (isI7) score += 80
        } else if (isGaming) {
          score += boost * 15
          if (isX3D) score += 200
          score += cores * 3
        } else {
          score += cores * 8
          score += boost * 8
        }

        if (isUnlimited || isHighEnd) {
          if (comp.price < 150000) score -= 300
          if (comp.price < 100000) score -= 500
        }
      }

      if (selectingCategory === 'GPU') {
        const vram = parseInt(spec.memorySize) || 0
        const isRendering3D = /render|3d|blender|maya|cinema/i.test(purpose + specificUse)
        score += vram * 20
        score += (comp.price / 10000)

        if (isRendering3D) {
          score += vram * 30
        }

        if (isUnlimited || isHighEnd) {
          if (comp.price < 200000) score -= 400
        }
      }

      if (selectingCategory === 'RAM') {
        const size = parseInt(spec.memorySize) || 0
        const speed = parseInt(spec.memoryClock) || 0
        score += size * 5
        score += speed * 0.1
        if (isRendering) score += size * 10
      }

      score += (comp.price / effectiveBudget) * 100

      return { ...comp, score }
    })

    const sortedComponents = scoredComponents.sort((a, b) => b.score - a.score)
    const topComponents = sortedComponents.slice(0, 10)

    const budgetSection = isUnlimited
      ? 'BUDGET: UNLIMITED. Recommend the absolute best component regardless of price. Do not mention budget constraints or price warnings in the reason.'
      : `Budget: ${effectiveBudget}₸
Budget spent: ${spentBudget}₸
Budget remaining: ${remainingBudget}₸`

    const prompt = `You are expert PC builder for NEX PC Kazakhstan.

Customer profile:
- Purpose: ${ac.purpose}
- Specific use: ${JSON.stringify(ac.specificUse)}
- Preferences: ${ac.additionalPreferences}

${budgetSection}

Already selected components:
${buildList.length > 0 ? buildList.map((c) => `${c.slot}: ${c.name} (${c.price}₸)`).join('\n') : 'None yet'}

Pre-ranked components for ${selectingCategory} (best matches first based on specs and use case):
${topComponents.map((c, i) => `${i + 1}. [${c.id}] ${c.name} - ${c.price}₸
   Specs: ${JSON.stringify(c.specData)}`).join('\n')}

Select the TOP 1-3 from this list. Consider compatibility with already selected components.
${isUnlimited ? 'Do not mention price warnings or budget exceedance in your reason.' : ''}
Return JSON only: {"recommendations": [{"componentId": "exact_id", "priority": 1, "reason": "specific technical reason why this fits the use case"}]}`

    let recommendations = []
    let incompatible = []
    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock) {
        const match = textBlock.text.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          recommendations = (parsed.recommendations || []).slice(0, 3)
          incompatible = (parsed.incompatible || []).slice(0, 10)
        }
      }
    } catch (err) {
      console.warn('[AI recommend] AI call failed:', err.message)
    }

    const validIds = new Set(allComponents.map((c) => c.id))
    recommendations = recommendations.filter((r) => validIds.has(r.componentId))
    incompatible = incompatible.filter((r) => validIds.has(r.componentId))

    if (recommendations.length === 0 && allComponents.length > 0) {
      console.warn('[AI recommend] Fallback triggered for', selectingCategory)
      const affordable = sortedComponents.filter((c) => remainingBudget <= 0 || (c.price || 0) <= remainingBudget)
      const pool = affordable.length > 0 ? affordable : sortedComponents
      recommendations = pool.slice(0, 3).map((c, i) => ({
        componentId: c.id,
        priority: i + 1,
        reason: 'Best available option based on use case and budget',
      }))
    }

    res.json({ recommendations, incompatible })
  } catch (err) {
    next(err)
  }
}

const ramRecommendation = async (req, res, next) => {
  try {
    const { aiContext, motherboard, budget } = req.body

    const ramSlots = motherboard?.specData?.ramSlots || 4
    const supportedRamType = motherboard?.specData?.supportedRamType || 'DDR4'
    const maxRamSpeed = motherboard?.specData?.maxRamSpeed || ''
    const purpose = aiContext?.purpose || aiContext?.useCase || 'general use'
    const specificUse = JSON.stringify(aiContext?.specificUse || aiContext?.games || aiContext?.software || [])

    const userMessage = `Customer needs PC for ${purpose} (${specificUse}).
Motherboard has ${ramSlots} RAM slots supporting ${supportedRamType} up to ${maxRamSpeed}.
Budget remaining for ALL remaining components: ${budget || 0}₸.
How many RAM sticks and what capacity?
Guidelines: Gaming=2×16GB, Workstation/Rendering=4×16GB or 2×32GB, Office=1×8GB or 2×8GB.
Return JSON only: { "recommendedSlots": 2, "capacityPerStick": "16GB", "totalCapacity": "32GB", "speed": "${maxRamSpeed || supportedRamType}", "reason": "..." }`

    let result = null
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 400,
        system: 'You are a PC hardware expert. Recommend optimal RAM configuration based on use case and motherboard specs. Respond only with valid JSON.',
        messages: [{ role: 'user', content: userMessage }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock) {
        const match = textBlock.text.match(/\{[\s\S]*\}/)
        if (match) result = JSON.parse(match[0])
      }
    } catch (_) {}

    if (!result) return res.status(503).json({ error: 'RAM recommendation unavailable' })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

const performancePredict = async (req, res, next) => {
  try {
    const { components } = req.body

    if (!components || typeof components !== 'object') {
      return res.status(400).json({ error: 'components object required' })
    }

    const buildLines = Object.entries(components)
      .filter(([, v]) => v && v.name)
      .map(([k, v]) => {
        const specs = v.specData ? ` (${JSON.stringify(v.specData)})` : ''
        return `${k}: ${v.name}${specs}`
      })
      .join('\n')

    if (!buildLines) {
      return res.status(400).json({ error: 'No components provided' })
    }

    const userMessage = `Analyze this PC build and predict 1080p gaming performance:

${buildLines}

Predict average FPS and optimal quality settings for these 6 games at 1080p:
- Valorant
- CS2
- Fortnite
- GTA V
- Red Dead Redemption 2
- Cyberpunk 2077

Respond ONLY with valid JSON in exactly this format:
{
  "games": [
    { "name": "Valorant", "fps": 300, "quality": "Ultra" },
    { "name": "CS2", "fps": 240, "quality": "Ultra" },
    { "name": "Fortnite", "fps": 180, "quality": "Epic" },
    { "name": "GTA V", "fps": 165, "quality": "Ultra" },
    { "name": "Red Dead Redemption 2", "fps": 95, "quality": "High" },
    { "name": "Cyberpunk 2077", "fps": 85, "quality": "High" }
  ],
  "bottleneck": "None",
  "overallRating": "High-end"
}

Rules:
- bottleneck must be exactly one of: "None", "CPU-bound", "GPU-bound"
- overallRating must be exactly one of: "Budget", "Mid-range", "High-end", "Enthusiast"
- quality must be one of: "Low", "Medium", "High", "Ultra", "Epic"
- fps must be realistic average integer values`

    let predictions = null
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: 'You are an expert PC hardware analyst. Predict gaming performance accurately based on specific hardware specs. Be realistic. Respond only with valid JSON, no other text.',
        messages: [{ role: 'user', content: userMessage }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock) {
        const match = textBlock.text.match(/\{[\s\S]*\}/)
        if (match) {
          predictions = JSON.parse(match[0])
        }
      }
    } catch (_) {}

    if (!predictions) {
      return res.status(503).json({ error: 'Performance prediction unavailable' })
    }

    res.json(predictions)
  } catch (err) {
    next(err)
  }
}

const benchmark = async (req, res, next) => {
  try {
    const { productName, specs } = req.body
    if (!specs || typeof specs !== 'object') {
      return res.status(400).json({ error: 'specs object required' })
    }

    const buildLines = Object.entries(specs)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join('\n')

    if (!buildLines) return res.status(400).json({ error: 'No specs provided' })

    const userMessage = `Analyze this PC and predict 1080p gaming performance:

PC: ${productName || 'Gaming PC'}
${buildLines}

Predict average FPS and optimal quality settings for these 6 games at 1080p:
- Valorant
- CS2
- Fortnite
- GTA V
- Red Dead Redemption 2
- Cyberpunk 2077

Respond ONLY with valid JSON in exactly this format:
{
  "games": [
    { "name": "Valorant", "fps": 300, "quality": "Ultra" },
    { "name": "CS2", "fps": 240, "quality": "Ultra" },
    { "name": "Fortnite", "fps": 180, "quality": "Epic" },
    { "name": "GTA V", "fps": 165, "quality": "Ultra" },
    { "name": "Red Dead Redemption 2", "fps": 95, "quality": "High" },
    { "name": "Cyberpunk 2077", "fps": 85, "quality": "High" }
  ],
  "bottleneck": "None",
  "overallRating": "High-end"
}

Rules:
- bottleneck must be exactly one of: "None", "CPU-bound", "GPU-bound"
- overallRating must be exactly one of: "Budget", "Mid-range", "High-end", "Enthusiast"
- quality must be one of: "Low", "Medium", "High", "Ultra", "Epic"
- fps must be realistic average integer values`

    let predictions = null
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: 'You are an expert PC hardware analyst. Predict gaming performance accurately based on hardware specs. Be realistic. Respond only with valid JSON, no other text.',
        messages: [{ role: 'user', content: userMessage }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock) {
        const match = textBlock.text.match(/\{[\s\S]*\}/)
        if (match) predictions = JSON.parse(match[0])
      }
    } catch (_) {}

    if (!predictions) return res.status(503).json({ error: 'Benchmark unavailable' })
    res.json(predictions)
  } catch (err) {
    next(err)
  }
}

const generateDescription = async (req, res, next) => {
  try {
    const { name, category, specData, specs, isComponent } = req.body
    if (!name) return res.status(400).json({ error: 'name required' })

    const specStr = specData
      ? JSON.stringify(specData)
      : specs ? JSON.stringify(specs) : ''
    const type = isComponent ? `${category} component` : 'ready-made gaming PC'

    const userMessage = `Write a compelling product description for this ${type}:
Name: ${name}
${specStr ? `Specs: ${specStr}` : ''}

Write 2-3 sentences that highlight key features and ideal use cases. Be specific, engaging, and professional. Do not use bullet points or markdown. Output only the description text.`

    let description = ''
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: 'You are a professional product copywriter for a PC hardware store in Kazakhstan. Write concise, accurate, compelling product descriptions. Output only the description text.',
        messages: [{ role: 'user', content: userMessage }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock) description = textBlock.text.trim()
    } catch (_) {}

    if (!description) return res.status(503).json({ error: 'Description generation unavailable' })
    res.json({ description })
  } catch (err) {
    next(err)
  }
}

const generateUseCases = async (req, res, next) => {
  try {
    const { productName, specs } = req.body
    if (!productName) return res.status(400).json({ error: 'productName required' })

    const specStr = specs ? JSON.stringify(specs) : ''

    const userMessage = `Based on this PC build, identify its ideal use cases:
PC: ${productName}
${specStr ? `Specs: ${specStr}` : ''}

Return a JSON array of 3-5 use case objects. Each should have:
- "label": short label (e.g. "Gaming", "Streaming", "Video Editing", "Office Work", "3D Rendering", "Programming")
- "icon": one of: "gamepad", "radio", "film", "monitor", "code", "box"
- "description": 10-15 words explaining why this PC fits this use case

Respond ONLY with valid JSON array, no other text:
[{ "label": "Gaming", "icon": "gamepad", "description": "Handles all modern games at high settings with ease" }]`

    let useCases = []
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: 'You are a PC hardware expert. Analyze PC specs and identify appropriate use cases. Respond only with valid JSON array.',
        messages: [{ role: 'user', content: userMessage }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock) {
        const match = textBlock.text.match(/\[[\s\S]*\]/)
        if (match) useCases = JSON.parse(match[0])
      }
    } catch (_) {}

    if (!useCases || useCases.length === 0) return res.status(503).json({ error: 'Use cases unavailable' })
    res.json({ useCases })
  } catch (err) {
    next(err)
  }
}

const rateComponent = async (req, res, next) => {
  try {
    const { name, category, specData, price } = req.body
    if (!name || !category) return res.status(400).json({ error: 'name and category required' })

    const specStr = specData ? JSON.stringify(specData) : ''
    const priceStr = price ? `₸${Number(price).toLocaleString()}` : 'unknown'

    const userMessage = `Rate this PC component:
Category: ${category}
Name: ${name}
${specStr ? `Specs: ${specStr}` : ''}
Price: ${priceStr}

Respond ONLY with valid JSON:
{
  "tier": "Mid-range",
  "score": 75,
  "reasoning": "Brief 1-2 sentence explanation"
}

Rules:
- tier must be exactly one of: "Budget", "Mid-range", "High-end", "Enthusiast"
- score must be 0-100 integer
- reasoning must be specific about the component's performance tier`

    let rating = null
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: 'You are an expert PC hardware analyst. Rate components accurately based on specs and price. Respond only with valid JSON.',
        messages: [{ role: 'user', content: userMessage }],
      })
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock) {
        const match = textBlock.text.match(/\{[\s\S]*\}/)
        if (match) rating = JSON.parse(match[0])
      }
    } catch (_) {}

    if (!rating) return res.status(503).json({ error: 'Rating unavailable' })
    res.json(rating)
  } catch (err) {
    next(err)
  }
}

const TEMPLATE_META = {
  budget_gaming: { name: 'Budget Gaming', purpose: 'Gaming' },
  stream_setup: { name: 'Stream Setup', purpose: 'Gaming & Streaming' },
  '3d_rendering': { name: '3D Rendering', purpose: '3D Rendering' },
  no_limits: { name: 'No Limits', purpose: 'Enthusiast / No limits' },
}

function tplNum(v) {
  const m = String(v ?? '').match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : 0
}

function tplSizeGB(v) {
  const s = String(v ?? '')
  const n = tplNum(s)
  return /tb/i.test(s) ? n * 1024 : n
}

const tplCores = (c) => tplNum(c.specData?.cores)
const tplVram = (c) => tplSizeGB(c.specData?.memorySize)
const tplPower = (c) => tplNum(c.specData?.power)
const tplRamType = (c) => c.specData?.memoryType || ''
const tplFormFactor = (c) => c.specData?.formFactor || ''
const tplIsNVMe = (c) => /nvme/i.test(c.specData?.memoryType || '') || /nvme/i.test(c.name || '')

const tplByPriceAsc = (a, b) => a.price - b.price
const tplByPriceDesc = (a, b) => b.price - a.price
const tplByCoresDesc = (a, b) => tplCores(b) - tplCores(a) || b.price - a.price
const tplByVramDesc = (a, b) => tplVram(b) - tplVram(a) || b.price - a.price
const tplBySpeedDesc = (a, b) => tplNum(b.specData?.memoryClock) - tplNum(a.specData?.memoryClock) || b.price - a.price

function tplPick(list, { filter, sort, priceMax } = {}) {
  const pool = list || []
  let f = filter ? pool.filter(filter) : pool.slice()
  if (priceMax) {
    const capped = f.filter((c) => c.price <= priceMax)
    if (capped.length) f = capped
  }
  if (f.length === 0) f = pool.slice()
  if (sort) f.sort(sort)
  return f[0] || null
}

function tplSelectBuild(type, byCat) {
  const cpus = byCat.CPU || []
  const mobos = byCat.MOTHERBOARD || []
  const gpus = byCat.GPU || []
  const rams = byCat.RAM || []
  const storages = byCat.STORAGE || []
  const psus = byCat.PSU || []
  const cases = byCat.CASE || []
  const coolers = byCat.COOLING || []
  const fans = byCat.FAN || []

  const result = {}

  if (type === 'budget_gaming') {
    result.CPU = tplPick(cpus, { filter: (c) => tplCores(c) >= 6, priceMax: 70000, sort: tplByPriceAsc })
    result.GPU = tplPick(gpus, { filter: (c) => tplVram(c) >= 8, priceMax: 100000, sort: tplByPriceDesc })
    result.RAM = tplPick(rams, { filter: (c) => tplSizeGB(c.specData?.memorySize) >= 16, priceMax: 25000, sort: tplByPriceAsc })
    result.STORAGE = tplPick(storages, { filter: tplIsNVMe, priceMax: 20000, sort: tplByPriceAsc })
    result.PSU = tplPick(psus, { filter: (c) => tplPower(c) >= 550 && tplPower(c) <= 650, priceMax: 25000, sort: tplByPriceAsc })
    result.CASE = tplPick(cases, { filter: (c) => /atx|micro/i.test(tplFormFactor(c)), priceMax: 20000, sort: tplByPriceAsc })
    result.COOLING = tplPick(coolers, { filter: (c) => !c.specData?.waterCooling, priceMax: 15000, sort: tplByPriceAsc })
    result.FAN = tplPick(fans, { sort: tplByPriceAsc })
  } else if (type === 'stream_setup') {
    result.CPU = tplPick(cpus, { filter: (c) => tplCores(c) >= 8 && !/x3d/i.test(c.name), priceMax: 120000, sort: tplByPriceAsc })
    result.GPU = tplPick(gpus, { filter: (c) => tplVram(c) >= 8, priceMax: 160000, sort: tplByPriceDesc })
    result.RAM = tplPick(rams, { filter: (c) => tplSizeGB(c.specData?.memorySize) >= 32, priceMax: 45000, sort: tplByPriceAsc })
    result.STORAGE = tplPick(storages, { filter: (c) => tplIsNVMe(c) && tplSizeGB(c.specData?.memorySize) >= 1000, priceMax: 40000, sort: tplByPriceAsc })
    result.PSU = tplPick(psus, { filter: (c) => tplPower(c) >= 650 && tplPower(c) <= 850, priceMax: 45000, sort: tplByPriceAsc })
    result.CASE = tplPick(cases, { filter: (c) => /atx/i.test(tplFormFactor(c)), priceMax: 40000, sort: tplByPriceAsc })
    result.COOLING = tplPick(coolers, { priceMax: 35000, sort: tplByPriceDesc })
    result.FAN = tplPick(fans, { sort: tplByPriceAsc })
  } else if (type === '3d_rendering') {
    result.CPU = tplPick(cpus, { filter: (c) => /i9|ryzen 9/i.test(c.name), priceMax: 250000, sort: tplByCoresDesc })
    result.GPU = tplPick(gpus, { priceMax: 300000, sort: tplByVramDesc })
    result.RAM = tplPick(rams, { filter: (c) => tplSizeGB(c.specData?.memorySize) >= 64 && /ddr5/i.test(tplRamType(c)), sort: tplByPriceAsc })
      || tplPick(rams, { filter: (c) => tplSizeGB(c.specData?.memorySize) >= 64, sort: tplByPriceAsc })
    result.STORAGE = tplPick(storages, { filter: (c) => tplIsNVMe(c) && tplSizeGB(c.specData?.memorySize) >= 1000, sort: tplByPriceAsc })
    result.PSU = tplPick(psus, { filter: (c) => tplPower(c) >= 850, sort: tplByPriceAsc })
    result.CASE = tplPick(cases, { sort: tplByPriceDesc })
    result.COOLING = tplPick(coolers, { sort: tplByPriceDesc })
    result.FAN = tplPick(fans, { sort: tplByPriceAsc })
  } else {
    result.CPU = tplPick(cpus, { sort: tplByPriceDesc })
    result.GPU = tplPick(gpus, { sort: tplByPriceDesc })
    result.RAM = tplPick(rams, { filter: (c) => /ddr5/i.test(tplRamType(c)), sort: tplBySpeedDesc })
      || tplPick(rams, { sort: tplByPriceDesc })
    result.STORAGE = tplPick(storages, { sort: tplByPriceDesc })
    result.PSU = tplPick(psus, { sort: tplByPriceDesc })
    result.CASE = tplPick(cases, { sort: tplByPriceDesc })
    result.COOLING = tplPick(coolers, { sort: tplByPriceDesc })
    result.FAN = tplPick(fans, { sort: tplByPriceDesc })
  }

  const cpuSocket = result.CPU?.specData?.socket
  const moboPriceMax = type === 'budget_gaming' ? 35000 : type === 'stream_setup' ? 60000 : undefined
  const moboSort = (type === '3d_rendering' || type === 'no_limits') ? tplByPriceDesc : tplByPriceAsc
  result.MOTHERBOARD = tplPick(mobos, {
    filter: (c) => !cpuSocket || (c.specData?.socket || '').toLowerCase() === cpuSocket.toLowerCase(),
    priceMax: moboPriceMax,
    sort: moboSort,
  })

  return result
}

function tplSlim(c) {
  if (!c) return null
  return {
    id: c.id,
    name: c.name,
    price: c.price,
    category: c.category,
    specData: c.specData,
    imageUrl: c.imageUrl || c.images?.[0] || null,
  }
}

const getBuildTemplate = async (req, res, next) => {
  try {
    const { templateType } = req.body
    const meta = TEMPLATE_META[templateType]
    if (!meta) return res.status(400).json({ error: 'Invalid templateType' })

    const inStock = await prisma.component.findMany({ where: { stock: { gt: 0 } } })
    const byCat = {}
    for (const c of inStock) {
      (byCat[c.category] = byCat[c.category] || []).push(c)
    }

    const selected = tplSelectBuild(templateType, byCat)

    const SLOT_ORDER = ['CPU', 'MOTHERBOARD', 'GPU', 'RAM', 'STORAGE', 'PSU', 'CASE', 'COOLING', 'FAN']
    const components = {}
    let totalPrice = 0
    for (const slot of SLOT_ORDER) {
      const slim = tplSlim(selected[slot])
      components[slot] = slim
      if (slim) totalPrice += slim.price
    }

    res.json({
      templateName: meta.name,
      components,
      totalPrice,
      aiContext: { purpose: meta.purpose, budget: { max: Math.round(totalPrice * 1.1) } },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { chat, recommend, ramRecommendation, performancePredict, benchmark, generateDescription, generateUseCases, rateComponent, getBuildTemplate }
