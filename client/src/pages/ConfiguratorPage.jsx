import { useState, useEffect } from 'react'
import ConfiguratorQuestionnaire from '../components/configurator/ConfiguratorQuestionnaire'
import ConfiguratorBuilder from '../components/configurator/ConfiguratorBuilder'

const STORAGE_KEY = 'nex_pc_builder_context'
const LOAD_BUILD_KEY = 'savedBuildToLoad'
const SKIP_KEY = 'skipQuestionnaire'
const PRE_SELECT_KEY = 'preSelectComponent'
const TEMPLATE_KEY = 'nexpc_template'

export default function ConfiguratorPage() {
  const [phase, setPhase] = useState(() => {
    try {
      if (
        localStorage.getItem(LOAD_BUILD_KEY) ||
        localStorage.getItem(SKIP_KEY) === 'true' ||
        localStorage.getItem(PRE_SELECT_KEY) ||
        localStorage.getItem(TEMPLATE_KEY) ||
        localStorage.getItem('nexpc_build_template')
      ) {
        return 'builder'
      }
    } catch {}
    return 'questionnaire'
  })

  const [aiContext, setAiContext] = useState(() => {
    try {
      // Template from "Build Like a Pro" section takes priority
      const templateRaw = localStorage.getItem(TEMPLATE_KEY)
      if (templateRaw) {
        const template = JSON.parse(templateRaw)
        return {
          purpose: template.purpose,
          budget: { max: template.budget },
          additionalPreferences: Array.isArray(template.specs) ? template.specs.join(', ') : (template.specs || ''),
          skipQuestionnaire: true,
        }
      }
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [initialBuild, setInitialBuild] = useState(() => {
    try {
      const raw = localStorage.getItem(LOAD_BUILD_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [preSelectSlot, setPreSelectSlot] = useState(() => {
    try {
      const raw = localStorage.getItem(PRE_SELECT_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const savedTemplate = localStorage.getItem('nexpc_build_template')
    if (savedTemplate) {
      const template = JSON.parse(savedTemplate)
      localStorage.removeItem('nexpc_build_template')
      setAiContext(template)
      setPhase('builder')
    }

    // Clean up all one-time flags after mount
    if (localStorage.getItem(TEMPLATE_KEY)) {
      localStorage.removeItem(TEMPLATE_KEY)
      // aiContext already populated from template in initializer; persist it
      if (aiContext) localStorage.setItem(STORAGE_KEY, JSON.stringify(aiContext))
    }
    if (initialBuild) {
      localStorage.removeItem(LOAD_BUILD_KEY)
      localStorage.removeItem(SKIP_KEY)
      if (!aiContext) {
        const ctx = { useCase: 'custom', skipQuestionnaire: true, budget: { min: 0, max: 9999999 } }
        setAiContext(ctx)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
      }
    } else if (localStorage.getItem(SKIP_KEY) === 'true') {
      localStorage.removeItem(SKIP_KEY)
      if (!aiContext) {
        const ctx = { useCase: 'custom', skipQuestionnaire: true, budget: { min: 0, max: 9999999 } }
        setAiContext(ctx)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
      }
    }
    if (localStorage.getItem(PRE_SELECT_KEY)) {
      localStorage.removeItem(PRE_SELECT_KEY)
      if (!aiContext) {
        const ctx = { useCase: 'custom', skipQuestionnaire: true, budget: { min: 0, max: 9999999 } }
        setAiContext(ctx)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
      }
    }
  }, []) // eslint-disable-line

  function handleComplete(ctx) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
    setAiContext(ctx)
    setPhase('builder')
  }

  function handleRestart() {
    localStorage.removeItem(STORAGE_KEY)
    setAiContext(null)
    setInitialBuild(null)
    setPhase('questionnaire')
  }

  if (phase === 'builder') {
    const ctx = aiContext || { useCase: 'custom', skipQuestionnaire: true, budget: { min: 0, max: 9999999 } }
    return <ConfiguratorBuilder aiContext={ctx} initialBuild={initialBuild} preSelectSlot={preSelectSlot} onRestart={handleRestart} />
  }

  return <ConfiguratorQuestionnaire onComplete={handleComplete} />
}
