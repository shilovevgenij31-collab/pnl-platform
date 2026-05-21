import type { AIMessage, AIResponse, ErrorCode } from '@/lib/types'

export type { AIMessage, AIResponse }

export type AIProviderErrorCode = Extract<
  ErrorCode,
  'NOT_CONFIGURED' | 'AI_TIMEOUT' | 'AI_RATE_LIMITED' | 'AI_PROVIDER_ERROR' | 'AI_EMPTY_RESPONSE'
>

export class AIProviderError extends Error {
  code: AIProviderErrorCode

  constructor(code: AIProviderErrorCode, message: string) {
    super(message)
    this.name = 'AIProviderError'
    this.code = code
  }
}

export interface AIProvider {
  chat(messages: AIMessage[]): Promise<AIResponse>
}
