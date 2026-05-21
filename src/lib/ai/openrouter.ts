import { AIProviderError } from './provider'
import type { AIProvider, AIMessage, AIResponse, AIProviderErrorCode } from './provider'

const API_KEY = process.env.OPENROUTER_API_KEY
const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free'
const BASE_URL = 'https://openrouter.ai/api/v1'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Tested 2026-05-21: gemma=859ms OK, nemotron=1590ms OK, gpt-oss=11s OK, rest 404/429
const FALLBACK_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-20b:free',
]

type ModelCallResult =
  | { status: 'ok'; content: string }
  | { status: 'rate_limited' }
  | { status: 'unavailable' }
  | { status: 'empty' }

function normalizeFetchError(error: unknown): AIProviderError {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new AIProviderError('AI_TIMEOUT', 'OpenRouter request timed out')
  }

  return new AIProviderError(
    'AI_PROVIDER_ERROR',
    error instanceof Error ? error.message : 'OpenRouter request failed',
  )
}

async function callModel(model: string, messages: AIMessage[]): Promise<ModelCallResult> {
  let response: Response

  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': 'Profitability AI Analyst',
      },
      body: JSON.stringify({ model, messages, max_tokens: 4000, temperature: 0.3 }),
      signal: AbortSignal.timeout(150_000),
    })
  } catch (error) {
    throw normalizeFetchError(error)
  }

  if (response.status === 429) return { status: 'rate_limited' }
  if (response.status === 503) return { status: 'unavailable' }

  if (!response.ok) {
    const text = await response.text()
    throw new AIProviderError('AI_PROVIDER_ERROR', `OpenRouter error ${response.status}: ${text}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content || typeof content !== 'string' || !content.trim()) {
    return { status: 'empty' }
  }

  return { status: 'ok', content }
}

export class OpenRouterProvider implements AIProvider {
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    if (!API_KEY) {
      throw new AIProviderError('NOT_CONFIGURED', 'OPENROUTER_API_KEY is not configured')
    }

    const models = [PRIMARY_MODEL, ...FALLBACK_MODELS]
    let lastCode: AIProviderErrorCode | null = null

    for (const model of models) {
      try {
        const result = await callModel(model, messages)
        if (result.status === 'ok') return { content: result.content, modelUsed: model }
        if (result.status === 'rate_limited') lastCode = 'AI_RATE_LIMITED'
        if (result.status === 'unavailable') lastCode = 'AI_PROVIDER_ERROR'
        if (result.status === 'empty') lastCode = 'AI_EMPTY_RESPONSE'
      } catch (error) {
        if (error instanceof AIProviderError) lastCode = error.code
        if (model === models[models.length - 1]) throw error
      }
    }

    throw new AIProviderError(lastCode ?? 'AI_PROVIDER_ERROR', 'All OpenRouter models failed')
  }
}
