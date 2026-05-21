import { OpenRouterProvider } from './openrouter'
import type { AIProvider } from './provider'

export function createAIProvider(): AIProvider {
  return new OpenRouterProvider()
}

export type { AIProvider, AIMessage, AIResponse } from './provider'
