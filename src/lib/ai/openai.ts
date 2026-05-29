import { AIProviderError, isLikelyTimeoutError } from './provider'
import type { AIProvider, AIMessage, AIResponse } from './provider'

const BASE_URL = 'https://api.openai.com/v1'

export class OpenAIProvider implements AIProvider {
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    if (!apiKey) {
      console.error('[AI] provider=openai missing OPENAI_API_KEY')
      throw new AIProviderError('NOT_CONFIGURED', 'OPENAI_API_KEY is not configured')
    }

    let response: Response
    try {
      response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: 8000,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(120_000),
      })
    } catch (error) {
      if (isLikelyTimeoutError(error)) {
        throw new AIProviderError('AI_TIMEOUT', 'OpenAI request timed out')
      }
      throw new AIProviderError(
        'AI_PROVIDER_ERROR',
        error instanceof Error ? error.message : 'OpenAI request failed',
      )
    }

    if (response.status === 401) {
      throw new AIProviderError('NOT_CONFIGURED', 'Invalid OPENAI_API_KEY')
    }
    if (response.status === 429) {
      throw new AIProviderError('AI_RATE_LIMITED', 'OpenAI rate limit exceeded')
    }
    if (response.status === 503) {
      throw new AIProviderError('AI_PROVIDER_ERROR', 'OpenAI API overloaded')
    }

    if (!response.ok) {
      const text = await response.text()
      console.error('[OpenAIProvider] API error', response.status, text)
      throw new AIProviderError('AI_PROVIDER_ERROR', `OpenAI error ${response.status}`)
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[]
      model?: string
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
    }

    const text = data.choices?.[0]?.message?.content ?? ''
    if (!text.trim()) {
      throw new AIProviderError('AI_EMPTY_RESPONSE', 'OpenAI returned empty response')
    }

    if (data.usage) {
      console.log(
        `[OpenAIProvider] model=${data.model ?? model} prompt_tokens=${data.usage.prompt_tokens} completion_tokens=${data.usage.completion_tokens} total=${data.usage.total_tokens}`,
      )
    }

    return {
      content: text,
      modelUsed: data.model ?? model,
    }
  }
}
