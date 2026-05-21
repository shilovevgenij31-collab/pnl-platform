import { OpenRouterProvider } from './openrouter'
import { ClaudeProvider } from './claude'
import type { AIProvider } from './provider'

export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'openrouter'

  if (provider === 'claude') {
    return new ClaudeProvider()
  }

  if (provider !== 'openrouter') {
    console.warn(`[AI] Unknown AI_PROVIDER "${provider}", falling back to OpenRouter`)
  }

  return new OpenRouterProvider()
}

export type { AIProvider, AIMessage, AIResponse } from './provider'
