import { AIProviderError, isLikelyTimeoutError } from './provider'
import type { AIProvider, AIMessage, AIResponse } from './provider'

const BASE_URL = 'https://api.anthropic.com/v1'

export class ClaudeProvider implements AIProvider {
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest'
    if (!apiKey) {
      console.error('[AI] provider=claude missing ANTHROPIC_API_KEY')
      throw new AIProviderError('NOT_CONFIGURED', 'ANTHROPIC_API_KEY is not configured')
    }

    // Anthropic API takes system separately from user/assistant messages
    const systemMessage = messages.find((m) => m.role === 'system')
    const conversationMessages = messages.filter((m) => m.role !== 'system')

    let response: Response
    try {
      response = await fetch(`${BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8000,
          temperature: 0.3,
          ...(systemMessage ? { system: systemMessage.content } : {}),
          messages: conversationMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        }),
        signal: AbortSignal.timeout(120_000),
      })
    } catch (error) {
      if (isLikelyTimeoutError(error)) {
        throw new AIProviderError('AI_TIMEOUT', 'Claude request timed out')
      }
      throw new AIProviderError(
        'AI_PROVIDER_ERROR',
        error instanceof Error ? error.message : 'Claude request failed',
      )
    }

    if (response.status === 401) {
      throw new AIProviderError('NOT_CONFIGURED', 'Invalid ANTHROPIC_API_KEY')
    }
    if (response.status === 429) {
      throw new AIProviderError('AI_RATE_LIMITED', 'Claude rate limit exceeded')
    }
    if (response.status === 529 || response.status === 503) {
      throw new AIProviderError('AI_PROVIDER_ERROR', 'Claude API overloaded')
    }

    if (!response.ok) {
      const text = await response.text()
      console.error('[ClaudeProvider] API error', response.status, text)
      throw new AIProviderError('AI_PROVIDER_ERROR', `Claude error ${response.status}`)
    }

    const data = await response.json() as {
      content?: { type: string; text: string }[]
      model?: string
    }

    const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
    if (!text.trim()) {
      throw new AIProviderError('AI_EMPTY_RESPONSE', 'Claude returned empty response')
    }

    return {
      content: text,
      modelUsed: data.model ?? model,
    }
  }
}
