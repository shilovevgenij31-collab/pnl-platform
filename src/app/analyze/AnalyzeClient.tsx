'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Target,
  Loader2,
  AlertCircle,
  RotateCcw,
  Trash2,
  FileText,
  Upload,
  X,
  CheckCircle2,
} from 'lucide-react'
import { saveFormDraft, getFormDraft, clearFormDraft } from '@/lib/storage/formStorage'
import { saveReport } from '@/lib/storage/reportStorage'
import type { AnalyzeFormFields, AgentType } from '@/lib/types'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const PAGE_BG = '#F4F7FB'
const CARD = '#FFFFFF'
const BORDER = '#E2E8F0'
const TEXT = '#0F172A'
const TEXT2 = '#64748B'
const INPUT_BG = '#FFFFFF'
const INPUT_BORDER = '#E2E8F0'

// ─── Empty forms ───────────────────────────────────────────────────────────────

const BASE_EMPTY: Omit<AnalyzeFormFields, 'agentType'> = {
  name: '',
  email: '',
  telegram: '',
  company: '',
  businessType: '',
  industry: '',
  geography: '',
  team: '',
  mainPain: '',
  triedBefore: '',
  extraContext: '',
  currentRevenue: '',
  currentMargin: '',
  targetMargin: '',
  pnlText: '',
  whatDoYouSell: '',
  whoIsCustomer: '',
  revenueMechanics: '',
  bottleneckGuess: '',
  delaysQueues: '',
  ownerDependency: '',
  unfinishedProjects: '',
  desiredResult: '',
}

const EMPTY_PNL: AnalyzeFormFields = { ...BASE_EMPTY, agentType: 'pnl' }
const EMPTY_GOLDRATT: AnalyzeFormFields = { ...BASE_EMPTY, agentType: 'goldratt' }

// ─── Test data ─────────────────────────────────────────────────────────────────

const PNL_TEST_FILL: Partial<AnalyzeFormFields> = {
  company: 'Digital Agency',
  businessType: 'Агентство',
  targetMargin: '20%',
  mainPain:
    'Прибыль есть, но маленькая — уходит в расходы. Непонятно, где именно теряется маржа. Расходы растут быстрее выручки.',
  pnlText: `Выручка: 3 200 000 руб/месяц
Расходы:
  — ФОТ: 1 800 000 руб (56% от выручки)
  — Аренда офиса: 120 000 руб
  — Маркетинг и реклама: 280 000 руб
  — Подрядчики и фриланс: 380 000 руб
  — ПО и инструменты: 95 000 руб
  — Прочие операционные: 175 000 руб
Итого расходов: 2 850 000 руб
Прибыль до налогов: 350 000 руб (10.9%)`,
}

const GOLDRATT_TEST_FILL: Partial<AnalyzeFormFields> = {
  company: 'Консалтинг Пример',
  businessType: 'Услуги',
  whatDoYouSell:
    'Консалтинг по оптимизации бизнес-процессов для производственных компаний. Проекты от 3 до 6 месяцев, средний чек 800к–1.5М руб.',
  bottleneckGuess: 'Собственник',
  mainPain: `Бизнес работает, клиенты есть, но всё замыкается на мне. Участвую в каждой продаже, каждом проекте, каждом решении. Нанял двух консультантов — работают, но без меня ничего не закрывают. Хочу вырасти с 2 до 5 проектов параллельно, но физически не успеваю. Пробовали писать регламенты — не работает.`,
}

// ─── File extensions ───────────────────────────────────────────────────────────

const EXCEL_EXTS = ['xlsx', 'xls']
const TEXT_EXTS = ['txt', 'csv', 'md', 'json']
const ALL_SUPPORTED_EXTS = [...EXCEL_EXTS, ...TEXT_EXTS]
const GOOGLE_SHEETS_TEMPLATE_URL = ''
const TEMPLATE_URL = '/templates/pnl-template.xlsx'
const MAX_NORMALIZED_CHARS = 75_000
const PREVIEW_ROWS = 20
const PREVIEW_COLS = 15

const REVENUE_KEYWORDS = ['выручка', 'доход', 'продажи', 'оборот', 'агентское вознаграждение']
const EXPENSE_KEYWORDS = ['расходы', 'себестоимость', 'фот', 'зарплата', 'маркетинг', 'аренда', 'подрядчики']
const PROFIT_KEYWORDS = ['прибыль', 'маржа', 'рентабельность']
const FORMULA_ERRORS = ['#VALUE!', '#DIV/0!', '#REF!', '#N/A', '#NAME?']
const PERIOD_KEYWORDS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
  'янв', 'фев', 'мар', 'апр', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  'month', 'месяц', 'итого',
]

type CellValue = string | number | boolean | Date | null | undefined

type SheetQualityStatus = 'good' | 'warning' | 'blocked'

type SheetAnalysis = {
  sheetName: string
  rows: string[][]
  previewRows: string[][]
  nonEmptyRows: number
  nonEmptyColumns: number
  numericValuesCount: number
  nonZeroNumericValuesCount: number
  formulaErrorsCount: number
  detectedKeywords: string[]
  qualityScore: number
  warnings: string[]
  hardBlockReasons: string[]
  status: SheetQualityStatus
  normalizedText: string
  truncated: boolean
}

function cellToText(value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).replace(/\s+/g, ' ').trim()
}

function parseNumber(value: string): number | null {
  const normalized = value
    .replace(/\s/g, '')
    .replace(/[₽$€%]/g, '')
    .replace(',', '.')
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function normalizeRows(rawRows: CellValue[][]): string[][] {
  const rows = rawRows
    .map((row) => row.map(cellToText))
    .filter((row) => row.some((cell) => cell.length > 0))

  const usedColumns = new Set<number>()
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      if (cell.length > 0) usedColumns.add(index)
    })
  })

  const columns = [...usedColumns].sort((a, b) => a - b)
  return rows.map((row) => columns.map((index) => row[index] ?? ''))
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}

function keywordHits(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase()
  return keywords.filter((keyword) => lower.includes(keyword))
}

function analyzeSheet(sheetName: string, rawRows: CellValue[][], fileName: string): SheetAnalysis {
  const rows = normalizeRows(rawRows)
  const flat = rows.flat()
  const text = flat.join(' ').toLowerCase()
  const numericValues = flat.map(parseNumber).filter((value): value is number => value !== null)
  const formulaErrorsCount = flat.filter((cell) => FORMULA_ERRORS.some((error) => cell.toUpperCase().includes(error))).length
  const revenueHits = keywordHits(text, REVENUE_KEYWORDS)
  const expenseHits = keywordHits(text, EXPENSE_KEYWORDS)
  const profitHits = keywordHits(text, PROFIT_KEYWORDS)
  const periodHits = keywordHits(text, PERIOD_KEYWORDS)
  const detectedKeywords = [...new Set([...revenueHits, ...expenseHits, ...profitHits, ...periodHits])]
  const nonEmptyRows = rows.length
  const nonEmptyColumns = rows.reduce((max, row) => Math.max(max, row.filter(Boolean).length), 0)
  const nonZeroNumericValuesCount = numericValues.filter((value) => value !== 0).length

  const warnings: string[] = []
  const hardBlockReasons: string[] = []
  const serviceSheet = /инструкц|readme|описан|guide|help/i.test(sheetName)

  if (serviceSheet) hardBlockReasons.push('Это служебный лист шаблона, а не данные бизнеса.')
  if (nonEmptyRows === 0) hardBlockReasons.push('Лист пустой.')
  if (nonEmptyRows > 0 && nonEmptyRows < 3) hardBlockReasons.push('Слишком мало содержательных строк.')
  if (numericValues.length < 5) hardBlockReasons.push('Слишком мало числовых значений.')
  if (numericValues.length >= 5 && nonZeroNumericValuesCount === 0) hardBlockReasons.push('Все числовые значения равны нулю.')
  if (revenueHits.length === 0 || expenseHits.length === 0) hardBlockReasons.push('Не найдены одновременно выручка и расходы.')
  if (formulaErrorsCount > Math.max(3, Math.ceil(flat.length * 0.08))) hardBlockReasons.push('Слишком много ошибок формул.')
  if (nonZeroNumericValuesCount < 3 && revenueHits.length > 0 && expenseHits.length > 0) hardBlockReasons.push('Лист похож на незаполненный шаблон.')

  if (profitHits.length === 0) warnings.push('Не найдены прибыль, маржа или рентабельность.')
  if (periodHits.length <= 1) warnings.push('Найден один период или периоды не распознаны.')
  if (formulaErrorsCount > 0) warnings.push(`Найдены ошибки формул: ${formulaErrorsCount}.`)

  let score = 0
  if (revenueHits.length > 0) score += 25
  if (expenseHits.length > 0) score += 25
  if (profitHits.length > 0) score += 15
  if (nonZeroNumericValuesCount >= 5) score += 15
  if (periodHits.length > 1) score += 10
  if (nonEmptyRows >= 6 && nonEmptyColumns >= 3) score += 10
  score -= Math.min(30, formulaErrorsCount * 5)
  if (hardBlockReasons.length > 0) score = Math.min(score, 39)
  score = Math.max(0, Math.min(100, score))

  const normalizedCsv = rowsToCsv(rows)
  const normalizedTooLarge = normalizedCsv.length > MAX_NORMALIZED_CHARS
  const truncatedCsv = normalizedTooLarge ? normalizedCsv.slice(0, MAX_NORMALIZED_CHARS) : normalizedCsv
  if (normalizedTooLarge) warnings.push('Таблица была обрезана до безопасного размера для анализа.')

  const status: SheetQualityStatus = hardBlockReasons.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'good'
  const allWarnings = [...hardBlockReasons, ...warnings]
  const metadata = [
    `Источник: Excel-файл ${fileName}`,
    `Лист: ${sheetName}`,
    `Строк: ${nonEmptyRows}`,
    `Колонок: ${nonEmptyColumns}`,
    `Quality score: ${score}`,
    `Предупреждения: ${allWarnings.length ? allWarnings.join(' | ') : 'нет'}`,
    '',
    '=== Очищенная таблица для анализа ===',
  ].join('\n')

  return {
    sheetName,
    rows,
    previewRows: rows.slice(0, PREVIEW_ROWS).map((row) => row.slice(0, PREVIEW_COLS)),
    nonEmptyRows,
    nonEmptyColumns,
    numericValuesCount: numericValues.length,
    nonZeroNumericValuesCount,
    formulaErrorsCount,
    detectedKeywords,
    qualityScore: score,
    warnings,
    hardBlockReasons,
    status,
    normalizedText: `${metadata}\n${truncatedCsv}`,
    truncated: normalizedTooLarge,
  }
}

function qualityStatusLabel(status: SheetQualityStatus): string {
  if (status === 'good') return 'Данные подходят для анализа'
  if (status === 'warning') return 'Нужна проверка'
  return 'Файл не подходит для анализа'
}

// ─── Margin & bottleneck options ───────────────────────────────────────────────

const MARGIN_PRESETS = ['10%', '15%', '20%', '25%', '30%']

const BOTTLENECK_OPTIONS = [
  'Продажи',
  'Маркетинг',
  'Производство / исполнение',
  'Команда',
  'Собственник',
  'Финансы',
  'Операционка',
  'Не знаю',
]

// ─── Loading steps ─────────────────────────────────────────────────────────────

const PNL_STEPS = [
  'Читаем финансовые данные...',
  'Анализируем структуру расходов...',
  'Рассчитываем ключевые метрики...',
  'Определяем зоны потерь прибыли...',
  'Ищем главный финансовый bottleneck...',
  'Рассчитываем точку безубыточности...',
  'Строим сценарии рентабельности...',
  'Формируем рекомендации...',
  'Составляем план на 7 / 14 / 30 дней...',
  'Финализируем P&L-отчёт...',
]

const GOLDRATT_STEPS = [
  'Читаем описание бизнеса...',
  'Составляем карту бизнеса...',
  'Анализируем Throughput / Inventory / OE...',
  'Ищем симптомы системы...',
  'Определяем главное ограничение...',
  'Проверяем гипотезу ограничения...',
  'Строим Five Focusing Steps...',
  'Формируем план через линзу ограничения...',
  'Финализируем Goldratt-отчёт...',
]

// ─── Agent config ──────────────────────────────────────────────────────────────

const AGENT_CONFIG = {
  pnl: {
    badge: 'Financial Analysis',
    title: 'P&L Agent',
    subtitle: 'Финансовый разбор прибыльности',
    cardDesc:
      'Анализирует P&L, находит зоны потери прибыли, финансовые аномалии, точку безубыточности и сценарии роста рентабельности.',
    cta: 'Сформировать P&L-отчёт',
    loadingTitle: 'Анализируем P&L',
    icon: BarChart3,
    accent: '#059669',
    accentLight: '#10b981',
    accentBg: '#ECFDF5',
    accentBorder: '#A7F3D0',
    accentText: 'text-emerald-700',
    badgeBg: '#F0FDF4',
    badgeBorder: '#A7F3D0',
    badgeText: '#065F46',
    btnStyle: { background: 'linear-gradient(135deg, #059669, #0891b2)' },
    activeBg: '#F0FDF4',
    activeBorder: '#6EE7B7',
  },
  goldratt: {
    badge: 'Goldratt / TOC',
    title: 'Goldratt Agent',
    subtitle: 'Поиск системного ограничения',
    cardDesc:
      'Определяет главное системное ограничение по Теории ограничений: где застревает поток, что является шумом и что делать первым.',
    cta: 'Найти бутылочное горлышко',
    loadingTitle: 'Ищем ограничение',
    icon: Target,
    accent: '#7c3aed',
    accentLight: '#8b5cf6',
    accentBg: '#F5F3FF',
    accentBorder: '#DDD6FE',
    accentText: 'text-violet-700',
    badgeBg: '#F5F3FF',
    badgeBorder: '#DDD6FE',
    badgeText: '#5B21B6',
    btnStyle: { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' },
    activeBg: '#F5F3FF',
    activeBorder: '#C4B5FD',
  },
} as const

type AgentCfg = (typeof AGENT_CONFIG)[AgentType]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AnalyzeClient({ initialAgent }: { initialAgent: AgentType }) {
  const router = useRouter()
  const [agent, setAgent] = useState<AgentType>(initialAgent)
  const [pnlForm, setPnlForm] = useState<AnalyzeFormFields>(EMPTY_PNL)
  const [goldrattForm, setGoldrattForm] = useState<AnalyzeFormFields>(EMPTY_GOLDRATT)
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [savedLocally, setSavedLocally] = useState(false)
  const [hasPnlDraft, setHasPnlDraft] = useState(false)
  const [hasGoldrattDraft, setHasGoldrattDraft] = useState(false)
  const [pnlFileName, setPnlFileName] = useState<string | null>(null)
  const [goldrattFileName, setGoldrattFileName] = useState<string | null>(null)
  const [pnlSheetStatus, setPnlSheetStatus] = useState<SheetQualityStatus | null>(null)

  const cfg = AGENT_CONFIG[agent]
  const form = agent === 'pnl' ? pnlForm : goldrattForm
  const hasDraft = agent === 'pnl' ? hasPnlDraft : hasGoldrattDraft
  const fileName = agent === 'pnl' ? pnlFileName : goldrattFileName

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      const pnlDraft = getFormDraft('pnl')
      if (pnlDraft) {
        setPnlForm({ ...EMPTY_PNL, ...pnlDraft, agentType: 'pnl' })
        setHasPnlDraft(true)
      }

      const goldrattDraft = getFormDraft('goldratt')
      if (goldrattDraft) {
        setGoldrattForm({ ...EMPTY_GOLDRATT, ...goldrattDraft, agentType: 'goldratt' })
        setHasGoldrattDraft(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  function switchAgent(next: AgentType) {
    setAgent(next)
    setError(null)
    setSavedLocally(false)
    router.replace(`/analyze?agent=${next}`, { scroll: false })
  }

  const setField = useCallback(
    (key: keyof AnalyzeFormFields, value: string) => {
      if (agent === 'pnl') {
        setPnlForm((prev) => {
          const next = { ...prev, [key]: value }
          saveFormDraft('pnl', next)
          setHasPnlDraft(true)
          return next
        })
      } else {
        setGoldrattForm((prev) => {
          const next = { ...prev, [key]: value }
          saveFormDraft('goldratt', next)
          setHasGoldrattDraft(true)
          return next
        })
      }
    },
    [agent],
  )

  function fillForm(data: Partial<AnalyzeFormFields>) {
    if (agent === 'pnl') {
      setPnlForm((prev) => {
        const next = { ...prev, ...data }
        saveFormDraft('pnl', next)
        setHasPnlDraft(true)
        return next
      })
    } else {
      setGoldrattForm((prev) => {
        const next = { ...prev, ...data }
        saveFormDraft('goldratt', next)
        setHasGoldrattDraft(true)
        return next
      })
    }
    setError(null)
  }

  function handleClearForm() {
    if (agent === 'pnl') {
      setPnlForm(EMPTY_PNL)
      setHasPnlDraft(false)
      setPnlFileName(null)
      setPnlSheetStatus(null)
      clearFormDraft('pnl')
    } else {
      setGoldrattForm(EMPTY_GOLDRATT)
      setHasGoldrattDraft(false)
      setGoldrattFileName(null)
      clearFormDraft('goldratt')
    }
    setError(null)
    setSavedLocally(false)
  }

  function handleFileLoaded(text: string, name: string, analysis?: SheetAnalysis) {
    if (agent === 'pnl') {
      const metadata: Partial<AnalyzeFormFields> = analysis
        ? {
            pnlText: text,
            sourceFileName: name,
            selectedSheet: analysis.sheetName,
            parsedRows: String(analysis.nonEmptyRows),
            parsedColumns: String(analysis.nonEmptyColumns),
            qualityScore: String(analysis.qualityScore),
            qualityWarnings: [...analysis.hardBlockReasons, ...analysis.warnings].join(' | '),
          }
        : { pnlText: text, sourceFileName: name }
      fillForm(metadata)
      setPnlFileName(name)
      setPnlSheetStatus(analysis?.status ?? null)
    } else {
      setField('mainPain', text)
      setGoldrattFileName(name)
    }
  }

  function handleClearFile() {
    if (agent === 'pnl') {
      setPnlFileName(null)
      setPnlSheetStatus(null)
      fillForm({
        pnlText: '',
        sourceFileName: '',
        selectedSheet: '',
        parsedRows: '',
        parsedColumns: '',
        qualityScore: '',
        qualityWarnings: '',
      })
    }
    else setGoldrattFileName(null)
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()

    if (agent === 'pnl') {
      if (!form.company?.trim()) { setError('Укажите название компании или проекта.'); return }
      if (!form.businessType?.trim()) { setError('Выберите тип бизнеса.'); return }
      if (form.businessType === 'Другое' && !form.industry?.trim()) { setError('Укажите тип бизнеса или нишу.'); return }
      if (!form.targetMargin?.trim()) { setError('Укажите целевую рентабельность.'); return }
      if (!form.mainPain?.trim()) { setError('Опишите главную боль бизнеса.'); return }
      if (!form.pnlText?.trim()) { setError('Добавьте P&L-данные: загрузите файл или вставьте данные текстом.'); return }
      if (pnlSheetStatus === 'blocked') {
        setError('Файл не подходит для анализа: выбранный лист не похож на заполненный P&L. Выберите другой лист, загрузите заполненный файл, скачайте шаблон или вставьте таблицу вручную.')
        return
      }
    } else {
      if (!form.company?.trim()) { setError('Укажите название компании или проекта.'); return }
      if (!form.businessType?.trim()) { setError('Выберите тип бизнеса.'); return }
      if (form.businessType === 'Другое' && !form.industry?.trim()) { setError('Укажите тип бизнеса или нишу.'); return }
      if (!form.whatDoYouSell?.trim()) { setError('Опишите, что продаёт или производит компания.'); return }
      if (!form.bottleneckGuess?.trim()) { setError('Выберите, где, по ощущению, узкое место.'); return }
      if (!form.mainPain?.trim()) { setError('Опишите ситуацию в бизнесе.'); return }
    }

    setLoading(true)
    setError(null)
    setSavedLocally(false)
    setStepIndex(0)

    const steps = agent === 'pnl' ? PNL_STEPS : GOLDRATT_STEPS
    let step = 0
    const interval = setInterval(() => {
      step = Math.min(step + 1, steps.length - 1)
      setStepIndex(step)
    }, 3500)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok && data.code === 'DB_SAVE_FAILED' && data.report) {
        saveReport({
          report: data.report,
          company: data.company || form.company || form.name || 'Ваш бизнес',
          date: new Date().toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          mode: agent === 'pnl' ? 'P&L Analysis' : 'Goldratt / TOC',
        })
        setSavedLocally(true)
        setError(data.error)
        return
      }

      if (!res.ok) throw new Error(data.error || 'Ошибка анализа')
      router.push(`/report/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте снова.')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  // ─── Loading screen ───────────────────────────────────────────────────────────

  if (loading) {
    const steps = agent === 'pnl' ? PNL_STEPS : GOLDRATT_STEPS
    const Icon = cfg.icon
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: PAGE_BG }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-10 text-center"
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div
              className="absolute inset-0 rounded-full border-4"
              style={{ borderColor: `${cfg.accentBorder}` }}
            />
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
              style={{ borderTopColor: cfg.accent }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-7 h-7" style={{ color: cfg.accent }} />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-1" style={{ color: TEXT }}>
            {cfg.loadingTitle}
          </h2>
          <p className="text-sm font-medium mb-6" style={{ color: cfg.accent }}>
            {steps[stepIndex]}
          </p>

          <div className="space-y-2 text-left">
            {steps.slice(0, stepIndex + 1).map((msg, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: i < stepIndex ? cfg.accentBg : '#EFF6FF' }}
                >
                  {i < stepIndex ? (
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg.accent }} />
                  ) : (
                    <Loader2
                      className="w-3 h-3 animate-spin"
                      style={{ color: cfg.accent }}
                    />
                  )}
                </div>
                <span
                  className="text-xs"
                  style={{ color: i < stepIndex ? '#CBD5E1' : TEXT2 }}
                >
                  {msg}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs mt-6" style={{ color: '#CBD5E1' }}>
            Обычно занимает 1–2 минуты
          </p>
        </div>
      </div>
    )
  }

  // ─── Shared styles ────────────────────────────────────────────────────────────

  const inputCls =
    'w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors'
  const inputStyle: React.CSSProperties = {
    background: INPUT_BG,
    border: `1px solid ${INPUT_BORDER}`,
    color: TEXT,
  }
  const focusStyle: React.CSSProperties = {
    borderColor: cfg.accentLight,
    boxShadow: `0 0 0 3px ${cfg.accentBg}`,
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: CARD,
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm transition-colors hover:text-blue-600"
            style={{ color: TEXT2 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: cfg.accentBg }}
            >
              <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.accent }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: TEXT }}>
              {cfg.title}
            </span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Agent selector */}
        <div className="mb-8">
          <p className="text-sm mb-3 text-center" style={{ color: TEXT2 }}>
            Выберите AI-агента
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <AgentCard
              agentKey="pnl"
              active={agent === 'pnl'}
              onClick={() => switchAgent('pnl')}
              hasDraft={hasPnlDraft}
            />
            <AgentCard
              agentKey="goldratt"
              active={agent === 'goldratt'}
              onClick={() => switchAgent('goldratt')}
              hasDraft={hasGoldrattDraft}
            />
          </div>
        </div>

        {/* 2-column layout */}
        <div className="lg:grid lg:grid-cols-[1fr_272px] lg:gap-8 lg:items-start">
          {/* Left: form */}
          <div>
            {/* Form header */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: cfg.badgeBg,
                      color: cfg.badgeText,
                      border: `1px solid ${cfg.badgeBorder}`,
                    }}
                  >
                    {cfg.badge}
                  </span>
                </div>
                <h1 className="text-2xl font-bold mb-1.5" style={{ color: TEXT }}>
                  {cfg.subtitle}
                </h1>
                <p className="text-sm" style={{ color: TEXT2 }}>
                  {cfg.cardDesc}
                </p>
              </div>
              {hasDraft && (
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="flex items-center gap-1.5 text-xs transition-colors hover:text-red-600 flex-shrink-0 mt-1"
                  style={{ color: TEXT2 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Очистить форму
                </button>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div
                className="flex items-start gap-3 rounded-2xl p-4 mb-6"
                style={{
                  background: savedLocally ? '#FFFBEB' : '#FEF2F2',
                  border: savedLocally ? '1px solid #FDE68A' : '1px solid #FECACA',
                }}
              >
                <AlertCircle
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  style={{ color: savedLocally ? '#D97706' : '#EF4444' }}
                />
                <div className="flex-1">
                  <p className="text-sm" style={{ color: savedLocally ? '#92400E' : '#991B1B' }}>
                    {error}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {error.includes('Файл не подходит') && (
                      <>
                        <button
                          type="button"
                          onClick={() => setError(null)}
                          className="text-xs font-semibold"
                          style={{ color: '#DC2626' }}
                        >
                          Выбрать другой лист
                        </button>
                        <a
                          href={TEMPLATE_URL}
                          download
                          className="text-xs font-semibold"
                          style={{ color: '#DC2626' }}
                        >
                          Скачать шаблон
                        </a>
                        <button
                          type="button"
                          onClick={handleClearFile}
                          className="text-xs font-semibold"
                          style={{ color: '#DC2626' }}
                        >
                          Вставить вручную
                        </button>
                      </>
                    )}
                    {savedLocally && (
                      <Link
                        href="/report"
                        className="text-xs font-semibold"
                        style={{ color: '#D97706' }}
                      >
                        Открыть временный отчёт →
                      </Link>
                    )}
                    {!error.includes('Файл не подходит') && (
                      <button
                        type="button"
                        onClick={() => handleSubmit()}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: savedLocally ? '#D97706' : '#DC2626' }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Попробовать ещё раз
                      </button>
                    )}
                    <Link
                      href={agent === 'pnl' ? '/demo/pnl' : '/demo/goldratt'}
                      className="text-xs font-medium transition-colors hover:text-blue-600"
                      style={{ color: TEXT2 }}
                    >
                      Посмотреть пример отчёта →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Form card */}
            <div
              className="rounded-2xl p-6 mb-5"
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                {agent === 'pnl' ? (
                  <PnlSection
                    form={form}
                    setField={setField}
                    fillForm={fillForm}
                    inputCls={inputCls}
                    inputStyle={inputStyle}
                    focusStyle={focusStyle}
                    cfg={cfg}
                    fileName={fileName}
                    onFileLoaded={handleFileLoaded}
                    onClearFile={handleClearFile}
                    onFillTest={() => fillForm(PNL_TEST_FILL)}
                  />
                ) : (
                  <GoldrattSection
                    form={form}
                    setField={setField}
                    fillForm={fillForm}
                    inputCls={inputCls}
                    inputStyle={inputStyle}
                    focusStyle={focusStyle}
                    cfg={cfg}
                    fileName={fileName}
                    onFileLoaded={handleFileLoaded}
                    onClearFile={handleClearFile}
                    onFillTest={() => fillForm(GOLDRATT_TEST_FILL)}
                  />
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all hover:opacity-90 shadow-lg"
                    style={{
                      ...cfg.btnStyle,
                      boxShadow: `0 8px 24px ${cfg.accent}30`,
                    }}
                  >
                    <ArrowRight className="w-5 h-5" />
                    {cfg.cta}
                  </button>
                  <p className="text-center text-xs mt-3" style={{ color: '#CBD5E1' }}>
                    Анализ занимает 1–2 минуты
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Right: info sidebar */}
          <div className="hidden lg:block">
            <WhatYouGetCard cfg={cfg} agent={agent} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── What you get sidebar ─────────────────────────────────────────────────────

const PNL_REPORT_SECTIONS = [
  'Диагностика входных данных',
  'Executive Summary',
  'Ключевые метрики + формулы',
  'Анализ расходов по статьям',
  'Зоны потерь прибыли',
  'Аномалии и странности',
  'Главный финансовый bottleneck',
  'Точка безубыточности',
  'Сценарии рентабельности',
  'Что НЕ оптимизировать',
  'Рекомендации с эффектом',
  'План на 7 / 14 / 30 дней',
  'Главный диагноз',
  'Ограничения анализа',
]

const GOLDRATT_REPORT_SECTIONS = [
  'Диагностика входных данных',
  'Executive Summary',
  'Карта бизнеса и Throughput',
  'T / I / OE анализ',
  'Симптомы системы',
  'Главное системное ограничение',
  'Что является шумом',
  'Five Focusing Steps',
  'Что НЕ оптимизировать',
  'Рекомендации',
  'План действий',
  'Главный диагноз',
  'Ограничения анализа',
]

function WhatYouGetCard({ cfg, agent }: { cfg: AgentCfg; agent: AgentType }) {
  const items = agent === 'pnl' ? PNL_REPORT_SECTIONS : GOLDRATT_REPORT_SECTIONS
  const Icon = cfg.icon

  return (
    <div className="sticky top-24 space-y-4">
      <div
        className="rounded-2xl p-5"
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: cfg.accentBg }}
          >
            <Icon className="w-4 h-4" style={{ color: cfg.accent }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>
            Что будет в отчёте
          </p>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <span
                className="text-xs font-semibold tabular-nums w-5 text-right flex-shrink-0"
                style={{ color: '#CBD5E1' }}
              >
                {String(idx + 1).padStart(2, '0')}
              </span>
              <CheckCircle2
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: cfg.accentLight }}
              />
              <span className="text-xs leading-snug" style={{ color: TEXT2 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl px-4 py-3.5"
        style={{ background: cfg.accentBg, border: `1px solid ${cfg.accentBorder}` }}
      >
        <p className="text-xs leading-relaxed" style={{ color: cfg.badgeText }}>
          AI анализирует данные за <strong>1–2 минуты</strong> и формирует структурированный
          консалтинговый отчёт
        </p>
      </div>
    </div>
  )
}

// ─── Agent selector card ───────────────────────────────────────────────────────

function AgentCard({
  agentKey,
  active,
  onClick,
  hasDraft,
}: {
  agentKey: AgentType
  active: boolean
  onClick: () => void
  hasDraft: boolean
}) {
  const cfg = AGENT_CONFIG[agentKey]
  const Icon = cfg.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl p-4 transition-all w-full"
      style={{
        background: active ? cfg.activeBg : CARD,
        border: active ? `1.5px solid ${cfg.activeBorder}` : `1.5px solid ${BORDER}`,
        boxShadow: active ? `0 4px 12px ${cfg.accent}15` : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: active ? cfg.accentBg : '#F8FAFC' }}
        >
          <Icon
            className="w-4.5 h-4.5"
            style={{ width: 18, height: 18, color: active ? cfg.accent : '#94A3B8' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold" style={{ color: active ? TEXT : TEXT2 }}>
              {cfg.title}
            </span>
            {hasDraft && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: '#FFFBEB', color: '#D97706' }}
              >
                черновик
              </span>
            )}
          </div>
          <p className="text-xs leading-snug" style={{ color: active ? cfg.accent : '#94A3B8' }}>
            {cfg.subtitle}
          </p>
        </div>
        {active && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
            style={{ background: cfg.accent }}
          />
        )}
      </div>
    </button>
  )
}

// ─── File upload zone ─────────────────────────────────────────────────────────

function FileUploadZone({
  onFileLoaded,
  fileName,
  onClearFile,
  accent,
  accentBg,
  accentBorder,
  variant,
}: {
  onFileLoaded: (text: string, name: string, analysis?: SheetAnalysis) => void
  fileName: string | null
  onClearFile: () => void
  accent: string
  accentBg: string
  accentBorder: string
  variant: 'pnl' | 'goldratt'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [reading, setReading] = useState(false)
  const [sheetAnalyses, setSheetAnalyses] = useState<SheetAnalysis[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')

  const title =
    variant === 'pnl' ? 'Загрузите P&L или таблицу' : 'Загрузите описание бизнеса'
  const subtitle =
    variant === 'pnl'
      ? 'Подойдёт Excel-файл, выгрузка из Google Sheets или таблица, скопированная вручную.'
      : 'Подойдёт заметка, транскрипт созвона, описание проблемы или таблица с наблюдениями.'
  const hint =
    variant === 'pnl'
      ? 'Если файл не читается, просто скопируйте таблицу и вставьте её ниже.'
      : 'P&L сюда загружать не нужно. Для финансовых цифр используйте P&L Agent.'

  async function processFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALL_SUPPORTED_EXTS.includes(ext)) {
      setFileError('Не удалось прочитать файл. Скопируйте данные и вставьте их вручную.')
      return
    }
    setFileError(null)
    setReading(true)
    setSheetAnalyses([])
    setSelectedSheet('')

    try {
      if (EXCEL_EXTS.includes(ext)) {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const analyses = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<CellValue[]>(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
            raw: false,
          })
          return analyzeSheet(sheetName, rows, file.name)
        }).sort((a, b) => b.qualityScore - a.qualityScore)

        const best = analyses[0]
        if (!best) {
          setFileError('Не удалось найти листы в Excel-файле. Скачайте шаблон или вставьте данные вручную.')
          return
        }

        setSheetAnalyses(analyses)
        setSelectedSheet(best.sheetName)
        onFileLoaded(best.normalizedText, file.name, best)
      } else {
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            onFileLoaded((e.target?.result as string) ?? '', file.name)
            resolve()
          }
          reader.onerror = () => reject(new Error('read error'))
          reader.readAsText(file, 'UTF-8')
        })
      }
    } catch {
      setFileError('Не удалось прочитать файл. Скопируйте данные и вставьте их вручную.')
    } finally {
      setReading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleSheetChange(sheetName: string) {
    const next = sheetAnalyses.find((item) => item.sheetName === sheetName)
    if (!next) return
    setSelectedSheet(sheetName)
    onFileLoaded(next.normalizedText, fileName ?? 'Excel-файл', next)
  }

  const currentAnalysis = sheetAnalyses.find((item) => item.sheetName === selectedSheet)

  if (fileName) {
    return (
      <div className="space-y-3">
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
        >
          <FileText className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: TEXT }}>
              {fileName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: accent }}>
              Файл загружен и добавлен в анализ
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClearFile()
              setFileError(null)
              setSheetAnalyses([])
              setSelectedSheet('')
            }}
            className="transition-colors hover:text-red-500 flex-shrink-0"
            style={{ color: '#94A3B8' }}
            aria-label="Убрать файл"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentAnalysis && (
          <div className="rounded-2xl border bg-white p-4" style={{ borderColor: BORDER }}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>
                  Проверьте данные перед анализом
                </p>
                <p className="mt-1 text-xs" style={{ color: TEXT2 }}>
                  В анализ будет отправлена очищенная таблица.
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  background: currentAnalysis.status === 'good' ? '#DCFCE7' : currentAnalysis.status === 'warning' ? '#FEF3C7' : '#FEE2E2',
                  color: currentAnalysis.status === 'good' ? '#166534' : currentAnalysis.status === 'warning' ? '#92400E' : '#991B1B',
                }}
              >
                {qualityStatusLabel(currentAnalysis.status)}
              </span>
            </div>

            {sheetAnalyses.length > 1 && (
              <label className="mb-3 block text-xs font-medium" style={{ color: TEXT2 }}>
                Выберите лист для анализа
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  style={{ borderColor: BORDER, color: TEXT }}
                >
                  {sheetAnalyses.map((sheet) => (
                    <option key={sheet.sheetName} value={sheet.sheetName}>
                      {sheet.sheetName} · {sheet.qualityScore}/100 · {qualityStatusLabel(sheet.status)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Лист', currentAnalysis.sheetName],
                ['Score', `${currentAnalysis.qualityScore}/100`],
                ['Строки', String(currentAnalysis.nonEmptyRows)],
                ['Колонки', String(currentAnalysis.nonEmptyColumns)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border px-3 py-2" style={{ borderColor: '#EEF2F7', background: '#F8FAFC' }}>
                  <p className="text-[0.68rem] uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold" style={{ color: TEXT }}>{value}</p>
                </div>
              ))}
            </div>

            {[...currentAnalysis.hardBlockReasons, ...currentAnalysis.warnings].length > 0 && (
              <div className="mb-3 rounded-xl border px-3 py-2" style={{ borderColor: currentAnalysis.status === 'blocked' ? '#FECACA' : '#FDE68A', background: currentAnalysis.status === 'blocked' ? '#FEF2F2' : '#FFFBEB' }}>
                <p className="mb-1 text-xs font-semibold" style={{ color: currentAnalysis.status === 'blocked' ? '#991B1B' : '#92400E' }}>
                  Предупреждения
                </p>
                <ul className="space-y-1 text-xs" style={{ color: currentAnalysis.status === 'blocked' ? '#991B1B' : '#92400E' }}>
                  {[...currentAnalysis.hardBlockReasons, ...currentAnalysis.warnings].map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: BORDER }}>
              <table className="min-w-full border-collapse text-xs">
                <tbody>
                  {currentAnalysis.previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-50 font-semibold' : undefined}>
                      {row.map((cell, colIndex) => (
                        <td key={`${rowIndex}-${colIndex}`} className="max-w-[180px] truncate border-b border-r px-2.5 py-2" style={{ borderColor: '#EEF2F7', color: TEXT }}>
                          {cell || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: BORDER, color: TEXT }}>
                Выбрать другой лист
              </button>
              <a href={TEMPLATE_URL} download className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: BORDER, color: TEXT }}>
                Скачать шаблон
              </a>
              <button type="button" onClick={onClearFile} className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: BORDER, color: TEXT }}>
                Вставить вручную
              </button>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,.md,.json,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={reading}
        className="w-full rounded-xl px-5 py-5 flex items-start gap-4 transition-all text-left"
        style={{
          background: dragging ? accentBg : '#FAFBFC',
          border: `2px dashed ${dragging ? accent : '#CBD5E1'}`,
          opacity: reading ? 0.7 : 1,
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: dragging ? accentBg : '#F1F5F9' }}
        >
          {reading ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: accent }} />
          ) : (
            <Upload className="w-5 h-5" style={{ color: dragging ? accent : '#94A3B8' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5" style={{ color: TEXT }}>
            {reading ? 'Читаем файл...' : title}
          </p>
          {!reading && (
            <>
              <p className="text-xs leading-relaxed mb-1" style={{ color: TEXT2 }}>
                {subtitle}
              </p>
              <p className="text-xs" style={{ color: '#CBD5E1' }}>
                {hint}
              </p>
            </>
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,.md,.json,.xlsx,.xls"
        onChange={handleInputChange}
        className="hidden"
      />
      {fileError && (
        <p className="text-xs text-amber-600 mt-2 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {fileError}
        </p>
      )}
    </div>
  )
}

// ─── Shared section props ─────────────────────────────────────────────────────

type SectionProps = {
  form: AnalyzeFormFields
  setField: (key: keyof AnalyzeFormFields, value: string) => void
  fillForm: (data: Partial<AnalyzeFormFields>) => void
  inputCls: string
  inputStyle: React.CSSProperties
  focusStyle: React.CSSProperties
  cfg: AgentCfg
  fileName: string | null
  onFileLoaded: (text: string, name: string, analysis?: SheetAnalysis) => void
  onClearFile: () => void
  onFillTest: () => void
}

// ─── Margin pills ─────────────────────────────────────────────────────────────

function MarginPills({
  value,
  onChange,
  accent,
  accentBg,
  inputCls,
  inputStyle,
  focusStyle,
}: {
  value: string
  onChange: (v: string) => void
  accent: string
  accentBg: string
  inputCls: string
  inputStyle: React.CSSProperties
  focusStyle: React.CSSProperties
}) {
  return (
    <div>
      <label className="block text-sm mb-2" style={{ color: TEXT2 }}>
        Целевая рентабельность *
      </label>
      <div className="flex flex-wrap gap-2 mb-2.5">
        {MARGIN_PRESETS.map((opt) => {
          const isActive = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive ? accentBg : '#F8FAFC',
                border: `1.5px solid ${isActive ? accent : '#E2E8F0'}`,
                color: isActive ? accent : TEXT2,
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Или введите вручную: 35%, 3 млн руб/мес..."
        className={inputCls}
        style={inputStyle}
        onFocus={(e) => Object.assign(e.target.style, { ...inputStyle, ...focusStyle })}
        onBlur={(e) => Object.assign(e.target.style, inputStyle)}
      />
    </div>
  )
}

// ─── Bottleneck pills ─────────────────────────────────────────────────────────

function BottleneckPills({
  value,
  onChange,
  accent,
  accentBg,
}: {
  value: string
  onChange: (v: string) => void
  accent: string
  accentBg: string
}) {
  return (
    <div>
      <label className="block text-sm mb-2" style={{ color: TEXT2 }}>
        Где, по ощущению, узкое место? *
      </label>
      <div className="flex flex-wrap gap-2">
        {BOTTLENECK_OPTIONS.map((opt) => {
          const isActive = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(isActive ? '' : opt)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive ? accentBg : '#F8FAFC',
                border: `1.5px solid ${isActive ? accent : '#E2E8F0'}`,
                color: isActive ? accent : TEXT2,
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── P&L form section ─────────────────────────────────────────────────────────

function PnlSection({
  form, setField, fillForm, inputCls, inputStyle, focusStyle, cfg, fileName, onFileLoaded, onClearFile, onFillTest,
}: SectionProps) {
  return (
    <>
      <div className="flex justify-end -mt-1">
        <button
          type="button"
          onClick={onFillTest}
          className="text-xs transition-opacity hover:opacity-60"
          style={{ color: cfg.accent }}
        >
          Вставить тестовый P&L
        </button>
      </div>

      {/* 1. Company */}
      <Field
        label="Компания / проект *"
        value={form.company}
        onChange={(v) => setField('company', v)}
        placeholder="ООО «Ромашка» или название проекта"
        inputCls={inputCls}
        inputStyle={inputStyle}
        focusStyle={focusStyle}
      />

      {/* 2. Business type */}
      <div>
        <label className="block text-sm mb-1.5" style={{ color: TEXT2 }}>
          Тип бизнеса *
        </label>
        <select
          value={form.businessType}
          onChange={(e) => {
            const t = e.target.value
            fillForm({ businessType: t, industry: t !== 'Другое' ? '' : form.industry })
          }}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">Выберите тип</option>
          <option>Услуги</option>
          <option>Агентство</option>
          <option>Производство</option>
          <option>Торговля</option>
          <option>Онлайн-продукт</option>
          <option>Другое</option>
        </select>
        {form.businessType === 'Другое' && (
          <div className="mt-2">
            <Field
              label="Укажите тип бизнеса или нишу *"
              value={form.industry}
              onChange={(v) => setField('industry', v)}
              placeholder="Например: франшиза, образовательный проект, строительная компания, фитнес-студия"
              inputCls={inputCls}
              inputStyle={inputStyle}
              focusStyle={focusStyle}
            />
          </div>
        )}
      </div>

      {/* 3. Target margin — pills + input */}
      <MarginPills
        value={form.targetMargin}
        onChange={(v) => setField('targetMargin', v)}
        accent={cfg.accent}
        accentBg={cfg.accentBg}
        inputCls={inputCls}
        inputStyle={inputStyle}
        focusStyle={focusStyle}
      />

      {/* 4. Main pain */}
      <TextArea
        label="Главная боль *"
        value={form.mainPain}
        onChange={(v) => setField('mainPain', v)}
        placeholder="Например: прибыль просела, расходы растут быстрее выручки, непонятно где теряется маржа"
        rows={4}
        inputCls={inputCls}
        inputStyle={inputStyle}
      />

      {/* 5. Financial data — upload + paste */}
      <div>
        <label className="block text-sm mb-2" style={{ color: TEXT2 }}>
          P&L / финансовые данные *
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          <a
            href={TEMPLATE_URL}
            download
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50"
            style={{ borderColor: cfg.accentBorder, color: cfg.accent }}
          >
            <FileText className="h-3.5 w-3.5" />
            Скачать шаблон P&L
          </a>
          {GOOGLE_SHEETS_TEMPLATE_URL ? (
            <a
              href={GOOGLE_SHEETS_TEMPLATE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50"
              style={{ borderColor: cfg.accentBorder, color: cfg.accent }}
            >
              Открыть шаблон в Google Sheets
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: BORDER, color: '#94A3B8', background: '#F8FAFC' }}
            >
              Google Sheets — скоро
            </span>
          )}
        </div>
        <FileUploadZone
          variant="pnl"
          onFileLoaded={onFileLoaded}
          fileName={fileName}
          onClearFile={onClearFile}
          accent={cfg.accent}
          accentBg={cfg.accentBg}
          accentBorder={cfg.accentBorder}
        />
        <div className="mt-2">
          <TextArea
            label=""
            value={form.pnlText}
            onChange={(v) => setField('pnlText', v)}
            placeholder={`Выручка: 5 000 000 руб/месяц\nРасходы:\n  — ФОТ: 2 500 000 руб\n  — Аренда: 300 000 руб\n  — Маркетинг: 400 000 руб\n  — Прочее: 200 000 руб\nПрибыль: 1 000 000 руб\n\nИли вставьте таблицу из Excel / Google Sheets...`}
            rows={8}
            mono
            inputCls={inputCls}
            inputStyle={inputStyle}
          />
        </div>
      </div>
    </>
  )
}

// ─── Goldratt form section ────────────────────────────────────────────────────

function GoldrattSection({
  form, setField, fillForm, inputCls, inputStyle, focusStyle, cfg, fileName, onFileLoaded, onClearFile, onFillTest,
}: SectionProps) {
  return (
    <>
      <div className="flex justify-end -mt-1">
        <button
          type="button"
          onClick={onFillTest}
          className="text-xs transition-opacity hover:opacity-60"
          style={{ color: cfg.accent }}
        >
          Вставить тестовое описание
        </button>
      </div>

      {/* 1. Company */}
      <Field
        label="Компания / проект *"
        value={form.company}
        onChange={(v) => setField('company', v)}
        placeholder="ООО «Ромашка» или название проекта"
        inputCls={inputCls}
        inputStyle={inputStyle}
        focusStyle={focusStyle}
      />

      {/* 2. Business type */}
      <div>
        <label className="block text-sm mb-1.5" style={{ color: TEXT2 }}>
          Тип бизнеса *
        </label>
        <select
          value={form.businessType}
          onChange={(e) => {
            const t = e.target.value
            fillForm({ businessType: t, industry: t !== 'Другое' ? '' : form.industry })
          }}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">Выберите тип</option>
          <option>Услуги</option>
          <option>Агентство</option>
          <option>Производство</option>
          <option>Торговля</option>
          <option>Онлайн-продукт</option>
          <option>Другое</option>
        </select>
        {form.businessType === 'Другое' && (
          <div className="mt-2">
            <Field
              label="Укажите тип бизнеса или нишу *"
              value={form.industry}
              onChange={(v) => setField('industry', v)}
              placeholder="Например: франшиза, образовательный проект, строительная компания, фитнес-студия"
              inputCls={inputCls}
              inputStyle={inputStyle}
              focusStyle={focusStyle}
            />
          </div>
        )}
      </div>

      {/* 3. What do you sell */}
      <TextArea
        label="Что продаёт компания? *"
        value={form.whatDoYouSell}
        onChange={(v) => setField('whatDoYouSell', v)}
        placeholder="Например: маркетинговые услуги на ретейнере, производство мебели, онлайн-курс"
        rows={3}
        inputCls={inputCls}
        inputStyle={inputStyle}
      />

      {/* 4. Bottleneck — pills */}
      <BottleneckPills
        value={form.bottleneckGuess}
        onChange={(v) => setField('bottleneckGuess', v)}
        accent={cfg.accent}
        accentBg={cfg.accentBg}
      />

      {/* 5. Description — upload + textarea */}
      <div>
        <label className="block text-sm mb-2" style={{ color: TEXT2 }}>
          Описание ситуации *
        </label>
        <FileUploadZone
          variant="goldratt"
          onFileLoaded={onFileLoaded}
          fileName={fileName}
          onClearFile={onClearFile}
          accent={cfg.accent}
          accentBg={cfg.accentBg}
          accentBorder={cfg.accentBorder}
        />
        <div className="mt-2">
          <TextArea
            label=""
            value={form.mainPain}
            onChange={(v) => setField('mainPain', v)}
            placeholder="Опишите: что сейчас мешает росту, где возникают задержки, от кого зависят ключевые решения, что уже пробовали..."
            rows={6}
            inputCls={inputCls}
            inputStyle={inputStyle}
          />
        </div>
      </div>
    </>
  )
}

// ─── Reusable form components ──────────────────────────────────────────────────

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  inputCls,
  inputStyle,
  focusStyle,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputCls: string
  inputStyle: React.CSSProperties
  focusStyle: React.CSSProperties
}) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: TEXT2 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
        style={inputStyle}
        onFocus={(e) => Object.assign(e.target.style, { ...inputStyle, ...focusStyle })}
        onBlur={(e) => Object.assign(e.target.style, inputStyle)}
      />
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  mono,
  inputCls,
  inputStyle,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  mono?: boolean
  inputCls: string
  inputStyle: React.CSSProperties
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm mb-1.5" style={{ color: TEXT2 }}>
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${inputCls} resize-y ${mono ? 'font-mono text-xs' : ''}`}
        style={inputStyle}
      />
    </div>
  )
}
