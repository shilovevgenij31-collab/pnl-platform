import { OpenRouterProvider } from './openrouter'
import { ClaudeProvider } from './claude'
import { OpenAIProvider } from './openai'
import type { AIProvider } from './provider'

export function getAIProviderConfig() {
  const provider = process.env.AI_PROVIDER || 'openrouter'

  if (provider === 'claude') {
    return {
      provider: 'claude',
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest',
    } as const
  }

  if (provider === 'openai') {
    return {
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    } as const
  }

  if (provider !== 'openrouter') {
    console.warn(`[AI] Unknown AI_PROVIDER "${provider}", falling back to OpenRouter`)
  }

  return {
    provider: 'openrouter',
    model: process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
  } as const
}

export function createAIProvider(): AIProvider {
  const config = getAIProviderConfig()
  if (config.provider === 'claude') return new ClaudeProvider()
  if (config.provider === 'openai') return new OpenAIProvider()
  return new OpenRouterProvider()
}

export type { AIProvider, AIMessage, AIResponse } from './provider'
