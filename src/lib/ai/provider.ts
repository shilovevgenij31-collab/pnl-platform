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

export function isLikelyTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = `${error.name} ${error.message}`.toLowerCase()
  return (
    error.name === 'TimeoutError' ||
    error.name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted') ||
    message.includes('signal timed out') ||
    message.includes('operation was aborted due to timeout')
  )
}
