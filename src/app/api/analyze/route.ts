import { NextRequest, NextResponse } from 'next/server'
import { createAIProvider, getAIProviderConfig } from '@/lib/ai'
import { AIProviderError, isLikelyTimeoutError } from '@/lib/ai/provider'
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

const PNL_REVENUE_KW = [
  'выручка', 'доход', 'продажи', 'оборот', 'реализация', 'общая выручка',
  'агентское вознаграждение', 'revenue', 'income', 'sales', 'gross revenue',
]
const PNL_EXPENSE_KW = [
  'расходы', 'расход', 'себестоимость', 'затраты', 'переменные расходы',
  'постоянные расходы', 'фот', 'зарплата', 'маркетинг', 'аренда', 'подрядчики',
  'сырье', 'материалы', 'упаковка', 'cogs', 'cost', 'expense', 'salary',
  'payroll', 'marketing', 'rent', 'operating', 'opex', 'налоги', 'кредиты', 'амортизация',
]

function assessPnlTextQuality(text: string): string | null {
  const lower = text.toLowerCase()
  const numericTokens = text.match(/\d+/g) ?? []
  if (numericTokens.length < 3) {
    return 'Данные не содержат числовых значений. Добавьте финансовые данные: выручку, расходы, прибыль.'
  }
  if (numericTokens.every((t) => Number(t) === 0)) {
    return 'Все числовые значения равны нулю. Добавьте реальные финансовые данные.'
  }
  const hasRevenue = PNL_REVENUE_KW.some((kw) => lower.includes(kw))
  const hasExpenses = PNL_EXPENSE_KW.some((kw) => lower.includes(kw))
  if (!hasRevenue && !hasExpenses) {
    return 'Данные не похожи на заполненный P&L. Добавьте выручку, расходы и числовые значения или используйте шаблон.'
  }
  return null
}

function validateInput(data: FormInput, agentType: AgentType): string | null {
  if (agentType === 'pnl') {
    if (!data.pnlText?.trim() && !data.mainPain?.trim()) {
      return 'Добавьте P&L-данные или опишите финансовую ситуацию.'
    }
    if (data.pnlText?.trim()) {
      const qualityIssue = assessPnlTextQuality(data.pnlText.trim())
      if (qualityIssue) return qualityIssue
    }
  } else {
    if (!data.mainPain?.trim() && !data.whatDoYouSell?.trim()) {
      return 'Опишите бизнес: заполните описание ситуации.'
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
  if (isLikelyTimeoutError(error)) {
    return {
      error: 'AI-анализ занял слишком много времени. Попробуйте ещё раз или откройте demo-отчёт.',
      code: 'AI_TIMEOUT',
    }
  }

  if (error instanceof AIProviderError) {
    if (error.code === 'NOT_CONFIGURED') {
      return {
        error: 'AI-провайдер не настроен. Проверьте env выбранного провайдера в .env.local.',
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
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  // MVP in-memory limiter. It is not shared across serverless instances; use Redis/Upstash/KV for production.
  if (isRateLimited(getClientIp(req))) {
    console.warn('[POST /api/analyze] rate limited', { requestId })
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.', code: 'RATE_LIMITED', requestId },
      { status: 429 },
    )
  }

  let body: FormInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Некорректный формат запроса.', code: 'VALIDATION_ERROR', requestId },
      { status: 400 },
    )
  }

  const agentType: AgentType = body.agentType === 'goldratt' ? 'goldratt' : 'pnl'
  const inputLengthChars = buildUserPrompt(body, agentType).length
  const aiConfig = getAIProviderConfig()
  const logBase = {
    requestId,
    provider: aiConfig.provider,
    model: aiConfig.model,
    agentType,
    inputLengthChars,
    fileName: body.sourceFileName || undefined,
    selectedSheet: body.selectedSheet || undefined,
    parsedRows: body.parsedRows || undefined,
    parsedColumns: body.parsedColumns || undefined,
    qualityScore: body.qualityScore || undefined,
    qualityWarningsCount: body.qualityWarnings ? body.qualityWarnings.split('|').filter(Boolean).length : undefined,
  }

  const validationError = validateInput(body, agentType)
  if (validationError) {
    return NextResponse.json(
      { error: validationError, code: 'VALIDATION_ERROR', requestId },
      { status: 400 },
    )
  }

  // PNL_DEBUG=1 → log CSV structure before AI call (safe: no keys, no full P&L text)
  if (process.env.PNL_DEBUG === '1' && agentType === 'pnl' && body.pnlText) {
    const lines = body.pnlText.split('\n')
    const tableStart = lines.findIndex((l) => l.includes('=== Очищенная таблица'))
    const csvLines = tableStart >= 0
      ? lines.slice(tableStart + 1, tableStart + 12)
      : lines.slice(0, 12)
    console.info('[PnL pipeline debug]', {
      requestId,
      sourceFileName: body.sourceFileName,
      selectedSheet: body.selectedSheet,
      parsedRows: body.parsedRows,
      parsedColumns: body.parsedColumns,
      qualityScore: body.qualityScore,
      // First 12 CSV rows — enough to see header structure without exposing full data
      csvPreviewLines: csvLines,
    })
  }

  let report: string
  let modelUsed: string
  const aiStart = Date.now()
  try {
    const systemPrompt = agentType === 'pnl' ? PNL_SYSTEM_PROMPT : GOLDRATT_SYSTEM_PROMPT
    const userPrompt = buildUserPrompt(body, agentType)
    const result = await ai.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    report = result.content
    modelUsed = result.modelUsed
    console.info('[POST /api/analyze] AI completed', {
      ...logBase,
      modelUsed,
      aiDurationMs: Date.now() - aiStart,
      reportLengthChars: report.length,
    })
  } catch (error) {
    const normalized = aiErrorResponse(error)
    console.error('[POST /api/analyze] AI error:', {
      ...logBase,
      aiDurationMs: Date.now() - aiStart,
      errorCode: normalized.code,
      rawError: error,
    })
    return NextResponse.json({ ...normalized, requestId }, { status: 500 })
  }

  const dbStart = Date.now()
  try {
    const { id } = await saveReportToDatabase({ ...body, report, modelUsed, agentType })
    console.info('[POST /api/analyze] completed', {
      ...logBase,
      modelUsed,
      dbSaveDurationMs: Date.now() - dbStart,
      totalDurationMs: Date.now() - startedAt,
      reportLengthChars: report.length,
    })
    return NextResponse.json({ id, status: 'success' })
  } catch (error) {
    console.error('[POST /api/analyze] DB save error:', {
      ...logBase,
      dbSaveDurationMs: Date.now() - dbStart,
      errorCode: 'DB_SAVE_FAILED',
      rawError: error,
    })
    const isConfig = error instanceof Error && error.message.includes('Supabase не настроен')
    return NextResponse.json(
      {
        error: isConfig
          ? 'Сервер хранения не настроен. Отчёт был сгенерирован.'
          : 'Отчёт был сгенерирован, но не удалось сохранить его на сервере. Попробуйте ещё раз.',
        code: 'DB_SAVE_FAILED',
        requestId,
        report,
        company: body.company || body.name || 'Ваш бизнес',
      },
      { status: 500 },
    )
  }
}
