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
    const { aiContext, currentBuild, selectingCategory, availableComponents, budget, buildMeta = {} } = req.body

    // currentBuild is array; supports legacy object format too
    const buildList = Array.isArray(currentBuild)
      ? currentBuild
      : Object.entries(currentBuild || {}).filter(([, v]) => v).map(([slot, c]) => ({ slot, ...c }))

    const spentBudget = buildList.reduce((sum, c) => sum + (c.price || 0), 0)
    const budgetMax = budget?.max || 0
    const remainingBudget = budgetMax > 0 ? budgetMax - spentBudget : null

    const suggestedMax = budgetMax > 0
      ? Math.floor(budgetMax * (SLOT_BUDGET_WEIGHTS[selectingCategory] || 0.10))
      : null
    const hardMax = remainingBudget != null ? Math.floor(remainingBudget * 0.65) : null
    const finalMax = (suggestedMax != null && hardMax != null)
      ? Math.min(suggestedMax, hardMax)
      : (suggestedMax || hardMax || null)

    let filteredComponents = availableComponents || []
    if (finalMax != null && finalMax > 0) {
      const maxPrice = Math.max(finalMax, (remainingBudget || 0) * 0.8)
      const budgetFiltered = filteredComponents.filter((c) => c.price <= maxPrice)
      if (budgetFiltered.length > 0) filteredComponents = budgetFiltered
    }

    const getPackSize = (comp) => {
      const text = `${comp.name || ''} ${comp.description || ''}`.toLowerCase()
      if (/5[- ]?pack|5pack/.test(text)) return 5
      if (/3[- ]?pack|triple[- ]?pack|3pack/.test(text)) return 3
      if (/2[- ]?pack|dual[- ]?pack|2pack/.test(text)) return 2
      return 1
    }

    const componentList = filteredComponents.slice(0, 30).map((c) => ({
      id: c.id,
      name: c.name,
      manufacturer: c.manufacturer,
      price: c.price,
      specData: c.specData,
      ...(selectingCategory === 'FAN' && { packSize: getPackSize(c) }),
    }))

    const selectedSummary = buildList.length > 0
      ? buildList.map((c) => `- ${c.slot || c.category || 'component'}: ${c.name} (${(c.price || 0).toLocaleString()}₸)`).join('\n')
      : 'Nothing selected yet'

    const cpuTdp = buildMeta.cpuTdp || 0
    const getCategoryGuidance = () => {
      switch (selectingCategory) {
        case 'PSU':
          if (buildMeta.minPsuWattage) {
            const rec = Math.ceil(buildMeta.minPsuWattage * 1.2)
            return `MANDATORY: min wattage=${buildMeta.minPsuWattage}W (CPU ${buildMeta.cpuTdp}W + GPU ~${buildMeta.gpuWatts}W + 150W system). Recommend ≥${rec}W. Do NOT go below ${buildMeta.minPsuWattage}W.`
          }
          return 'Recommend quality PSU with 20% headroom above estimated system draw. Preferred brands: Corsair, Seasonic, be quiet!'
        case 'COOLING':
          return [
            buildMeta.cpuSocket && `MANDATORY: CPU socket=${buildMeta.cpuSocket}. Cooler MUST list this socket.`,
            `Case: "${buildMeta.caseName || 'unknown'}" (${buildMeta.caseFormFactor || 'ATX'}). Check cooler height clearance.`,
            cpuTdp >= 125
              ? `High-TDP CPU (${cpuTdp}W): recommend 240mm or 360mm AIO, or premium large air cooler.`
              : `CPU TDP=${cpuTdp}W: air cooler or 120mm AIO sufficient.`,
          ].filter(Boolean).join(' ')
        case 'FAN': {
          const maxFans = buildMeta.maxFans || 4
          const estFanCost = 9000
          const budgetAfterFans = remainingBudget != null ? remainingBudget - estFanCost : null
          return `Case: "${buildMeta.caseName || 'unknown'}" (${buildMeta.caseFormFactor || 'ATX'}), max fans: ${maxFans}.
CPU TDP: ${cpuTdp}W (from selected CPU specData). Budget remaining after fans: ₸${budgetAfterFans != null ? budgetAfterFans.toLocaleString() : 'N/A'}.
Purpose: ${aiContext?.purpose || aiContext?.useCase || 'general'}.
packSize in component data = number of fans in that item (3-pack = 3 fans).
RECOMMEND specific number of fans (not just one):
- Gaming + high TDP (>125W): ${maxFans} fans
- Gaming + low TDP: ${Math.max(2, maxFans - 1)} fans
- Office: 2 fans minimum
- Budget remaining < 15000₸: 1-2 fans only
State exact count in your reason: 'Recommend X fans because...'`
        }
        case 'RAM':
          if (buildMeta.ddrType) return `MANDATORY: Motherboard requires ${buildMeta.ddrType}. ONLY recommend ${buildMeta.ddrType} modules. Wrong type = system won't boot.`
          return ''
        case 'GPU':
          return `Resolution target: ${aiContext?.resolution || 'not specified'}.
1080p → RTX 4060/4070 or RX 7600/7700 tier.
1440p → RTX 4070 Ti/4080 or RX 7900 XT tier.
4K → RTX 4080/4090 tier. Rendering/creative → prioritize VRAM (12GB+).`
        case 'CPU':
          return `Use case: ${aiContext?.useCase || 'General'}.
Competitive FPS (CS2/Valorant): high single-core clock > core count.
AAA gaming: balance clock + cores.
3D rendering/ML: maximize core count. Streaming: needs 20-30% CPU headroom.`
        default: return ''
      }
    }

    const categoryGuidance = getCategoryGuidance()

    const systemPrompt = `You are an expert PC builder AI for NEX PC store in Kazakhstan.
Recommend the BEST components from the provided catalog for this customer.

CRITICAL RULES:
1. BUDGET: Total budget ${budgetMax > 0 ? budgetMax.toLocaleString() : 'unlimited'}₸. Spent so far: ${spentBudget.toLocaleString()}₸. Remaining: ${remainingBudget != null ? remainingBudget.toLocaleString() : 'unlimited'}₸.
   Only ${buildList.length} slots have been filled so far out of 9 total.
   Remaining slots still need budget. Suggested max for THIS component: ${finalMax != null ? finalMax.toLocaleString() : 'N/A'}₸
   NEVER recommend components exceeding ${remainingBudget != null ? Math.floor(remainingBudget * 0.6).toLocaleString() : 'N/A'}₸ for this slot unless it is the last slot.

2. CONTEXT: Read the customer profile carefully:
   - Purpose: ${aiContext?.purpose || aiContext?.useCase || 'General'}
   - Specific use: ${JSON.stringify(aiContext?.specificUse || aiContext?.games || aiContext?.software || [])}
   - Additional preferences: ${aiContext?.additionalPreferences || aiContext?.preferences || 'none'}
   - Budget: ${budgetMax > 0 ? budgetMax.toLocaleString() : 'flexible'}₸
   These details MUST influence your recommendation heavily.

3. ONLY selected components count toward spent budget:
${selectedSummary}

4. COMPATIBILITY: Ensure recommended component is compatible with already selected components.
   - CPU ↔ Motherboard: sockets must match exactly (AM5, LGA1700, etc.)
   - RAM ↔ Motherboard: DDR4/DDR5 must match chipset support
   - GPU ↔ Case: GPU physical length ≤ case GPU clearance (mm)
   - Cooler ↔ CPU: cooler socket list must include the CPU socket
   - PSU: wattage ≥ CPU TDP + GPU TDP + 150W system overhead

5. ALWAYS return 1-3 recommendations. NEVER return empty array.
   If no component fits budget perfectly, recommend cheapest available option.

Respond ONLY with valid JSON, no other text:
{
  "recommendations": [{ "componentId": "exact_id", "priority": 1, "reason": "specific reason mentioning customer's use case and budget" }],
  "incompatible": [{ "componentId": "id", "reason": "exact incompatibility" }]
}`

    const userMessage = `Customer profile:
- Purpose: ${aiContext?.purpose || aiContext?.useCase || 'General'}
- Specific use: ${JSON.stringify(aiContext?.specificUse || aiContext?.games || aiContext?.software || [])}
- Additional preferences: "${aiContext?.additionalPreferences || aiContext?.preferences || 'none'}"
- Resolution/quality target: ${aiContext?.resolution || 'not specified'}
- Budget: ₸${(budget?.min || 0).toLocaleString()} – ₸${budgetMax > 0 ? budgetMax.toLocaleString() : 'No limit'}

Currently selected (${buildList.length} / 9 slots):
${selectedSummary}

Selecting now: ${selectingCategory}
${categoryGuidance ? `\nCategory guidance:\n${categoryGuidance}` : ''}

Available ${selectingCategory} components (use exact IDs from this list):
${JSON.stringify(componentList, null, 2)}

Return JSON only.`

    let recommendations = []
    let incompatible = []
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
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

    const validIds = new Set((availableComponents || []).map((c) => c.id))
    recommendations = recommendations.filter((r) => validIds.has(r.componentId))
    incompatible = incompatible.filter((r) => validIds.has(r.componentId))

    // fallback if AI returns nothing valid
    if (recommendations.length === 0 && (availableComponents || []).length > 0) {
      console.warn('[AI recommend] Fallback triggered for', selectingCategory)
      const pool = (filteredComponents.length > 0 ? filteredComponents : availableComponents)
        .filter((c) => validIds.has(c.id))
      let fallback = null
      if (finalMax != null && finalMax > 0) {
        const sorted = [...pool].sort((a, b) => b.price - a.price)
        fallback = sorted.find((c) => c.price <= finalMax)
      }
      if (!fallback && remainingBudget != null) {
        const sorted = [...pool].sort((a, b) => b.price - a.price)
        fallback = sorted.find((c) => c.price <= remainingBudget * 0.7)
      }
      if (!fallback) fallback = [...pool].sort((a, b) => a.price - b.price)[0]
      if (fallback) {
        recommendations = [{ componentId: fallback.id, priority: 1, reason: 'Best available option within your budget constraints' }]
      }
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

module.exports = { chat, recommend, ramRecommendation, performancePredict, benchmark, generateDescription, generateUseCases, rateComponent }
