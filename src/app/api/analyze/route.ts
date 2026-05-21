import { NextRequest, NextResponse } from 'next/server'
import { createAIProvider } from '@/lib/ai'
import { AIProviderError } from '@/lib/ai/provider'
import { PNL_SYSTEM_PROMPT } from '@/lib/ai/prompts/pnlPrompt'
import { GOLDRATT_SYSTEM_PROMPT } from '@/lib/ai/prompts/goldrattPrompt'
import { buildUserPrompt } from '@/lib/ai/prompts/buildUserPrompt'
import { saveReportToDatabase } from '@/lib/repositories/reportRepository'
import type { AnalyzeFormFields, AgentType, ErrorCode } from '@/lib/types'

type FormInput = Partial<AnalyzeFormFields>
type RateLimitEntry = { count: number; resetAt: number }

export const runtime = 'nodejs'
export const maxDuration = 180

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5
const rateLimitStore = new Map<string, RateLimitEntry>()

function validateInput(data: FormInput, agentType: AgentType): string | null {
  if (agentType === 'pnl') {
    if (!data.pnlText?.trim() && !data.mainPain?.trim() && !data.company?.trim()) {
      return 'Вставьте P&L-данные или заполните хотя бы контекст бизнеса.'
    }
  } else {
    if (!data.mainPain?.trim() && !data.whatDoYouSell?.trim() && !data.company?.trim()) {
      return 'Опишите бизнес: заполните хотя бы одно диагностическое поле или название компании.'
    }
  }
  return null
}

const ai = createAIProvider()

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  return forwarded || realIp || 'unknown'
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) return true

  existing.count += 1
  return false
}

function aiErrorResponse(error: unknown): { error: string; code: ErrorCode } {
  if (error instanceof AIProviderError) {
    if (error.code === 'NOT_CONFIGURED') {
      return {
        error: 'AI-провайдер не настроен. Проверьте OPENROUTER_API_KEY в .env.local.',
        code: 'NOT_CONFIGURED',
      }
    }
    if (error.code === 'AI_TIMEOUT') {
      return {
        error: 'AI-анализ занял слишком много времени. Попробуйте ещё раз или откройте demo-отчёт.',
        code: 'AI_TIMEOUT',
      }
    }
    if (error.code === 'AI_RATE_LIMITED') {
      return {
        error: 'AI-сервис временно перегружен. Попробуйте позже или откройте demo-отчёт.',
        code: 'AI_RATE_LIMITED',
      }
    }
    if (error.code === 'AI_EMPTY_RESPONSE') {
      return {
        error: 'AI-сервис вернул пустой ответ. Попробуйте ещё раз.',
        code: 'AI_EMPTY_RESPONSE',
      }
    }
  }

  return {
    error: 'AI-сервис временно недоступен. Попробуйте позже или откройте demo-отчёт.',
    code: 'AI_PROVIDER_ERROR',
  }
}

export async function POST(req: NextRequest) {
  // MVP in-memory limiter. It is not shared across serverless instances; use Redis/Upstash/KV for production.
  if (isRateLimited(getClientIp(req))) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.', code: 'RATE_LIMITED' },
      { status: 429 },
    )
  }

  let body: FormInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Некорректный формат запроса.', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const agentType: AgentType = body.agentType === 'goldratt' ? 'goldratt' : 'pnl'

  const validationError = validateInput(body, agentType)
  if (validationError) {
    return NextResponse.json(
      { error: validationError, code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  let report: string
  let modelUsed: string
  try {
    const systemPrompt = agentType === 'pnl' ? PNL_SYSTEM_PROMPT : GOLDRATT_SYSTEM_PROMPT
    const userPrompt = buildUserPrompt(body, agentType)
    const result = await ai.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    report = result.content
    modelUsed = result.modelUsed
  } catch (error) {
    console.error('[POST /api/analyze] AI error:', error)
    return NextResponse.json(aiErrorResponse(error), { status: 500 })
  }

  try {
    const { id } = await saveReportToDatabase({ ...body, report, modelUsed, agentType })
    return NextResponse.json({ id, status: 'success' })
  } catch (error) {
    console.error('[POST /api/analyze] DB save error:', error)
    const isConfig = error instanceof Error && error.message.includes('Supabase не настроен')
    return NextResponse.json(
      {
        error: isConfig
          ? 'Сервер хранения не настроен. Отчёт был сгенерирован.'
          : 'Отчёт был сгенерирован, но не удалось сохранить его на сервере. Попробуйте ещё раз.',
        code: 'DB_SAVE_FAILED',
        report,
        company: body.company || body.name || 'Ваш бизнес',
      },
      { status: 500 },
    )
  }
}
