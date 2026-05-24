'use client'

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Gauge,
  Info,
  Link2,
  Printer,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ReportPageData } from '@/lib/types'

const PAGE_BG = '#F4F7FB'
const CARD = '#FFFFFF'
const BORDER = '#E2E8F0'
const BORDER_SOFT = '#EEF2F7'
const TEXT = '#0F172A'
const TEXT2 = '#64748B'
const TEXT3 = '#94A3B8'
const PRIMARY_BLUE = '#2563EB'
const INDIGO = '#4F46E5'

const TONES = {
  blue: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', fill: '#3B82F6' },
  indigo: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', fill: '#4F46E5' },
  amber: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', fill: '#F59E0B' },
  red: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', fill: '#EF4444' },
  green: { bg: '#ECFDF5', text: '#047857', border: '#BBF7D0', fill: '#10B981' },
  slate: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', fill: '#64748B' },
} as const

type Tone = keyof typeof TONES

const AGENT_META = {
  pnl: {
    badge: 'Финансовый анализ',
    title: 'P&L / отчёт о прибылях и убытках',
    subtitle: 'Короткий управленческий обзор по прибыльности с деталями по клику',
    accent: PRIMARY_BLUE,
    accentBg: '#EFF6FF',
    accentBorder: '#BFDBFE',
    badgeText: '#1D4ED8',
    icon: BarChart3,
  },
  goldratt: {
    badge: 'Анализ ограничений',
    title: 'Отчёт по главному ограничению',
    subtitle: 'Короткий управленческий обзор по системе и её главному ограничению',
    accent: INDIGO,
    accentBg: '#EEF2FF',
    accentBorder: '#C7D2FE',
    badgeText: '#3730A3',
    icon: Target,
  },
} as const

type SectionType =
  | 'overview'
  | 'metrics'
  | 'expenses'
  | 'losses'
  | 'anomalies'
  | 'constraint'
  | 'breakeven'
  | 'scenarios'
  | 'actions'
  | 'limitations'
  | 'generic'

interface ReportSection {
  id: string
  heading: string
  content: string
  type: SectionType
}

interface ParsedSource {
  metadata: Record<string, string>
  rows: string[][]
}

interface ExpenseItem {
  label: string
  amount: number | null
  pct: number | null
  tone: Tone
}

interface PnlFacts {
  avgRevenue: number | null
  lastRevenue: number | null
  avgProfit: number | null
  lastProfit: number | null
  avgMargin: number | null
  lastMargin: number | null
  targetMargin: number | null
  avgCosts: number | null
  breakevenRevenue: number | null
  gapToBreakeven: number | null
  monthLabels: string[]
  revenueSeries: number[]
  profitSeries: number[]
  expenseBreakdown: ExpenseItem[]
  profitableMonths: number
  totalMonths: number
  mainDiagnosis: string
  mainConstraint: string
  limitations: string[]
  actions: string[]
  scenarios: string[]
  anomalies: string[]
}

interface GoldrattFacts {
  diagnosis: string
  constraint: string
  actions: string[]
  scenarios: string[]
  limitations: string[]
  anomalies: string[]
}

interface DetailCard {
  id: string
  title: string
  kicker: string
  tone: Tone
  icon: LucideIcon
  value: string
  support?: string
  statusLabel: string
  detailTitle: string
  detailLead: string
  bullets: string[]
  note?: string
  actionText?: string
  featured?: boolean
}

interface IntroFact {
  label: string
  value: string
  tone: Tone
}

function toSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48) || Math.random().toString(36).slice(2, 8)
  )
}

function cleanText(value: string): string {
  return value
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/[_`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isGarbageText(value: string): boolean {
  const cleaned = cleanText(value)
  if (!cleaned) return true
  if (/^[-:|.\s]+$/.test(cleaned)) return true
  if (/^(?:—|-){2,}$/.test(cleaned.replace(/\s/g, ''))) return true
  if (/^(?:\d+\.)?$/.test(cleaned)) return true
  return false
}

function sanitizeMarkdownForDisplay(markdown: string): string {
  return markdown
    .replace(/Executive Summary/gi, 'Краткий итог')
    .replace(/Bottleneck/gi, 'Главное ограничение прибыли')
    .replace(/Confidence/gi, 'Основание вывода')
    .replace(/Critical/gi, 'Критично')
    .replace(/High/gi, 'Высокая')
    .replace(/Medium/gi, 'Средняя')
    .replace(/Low/gi, 'Низкая')
    .replace(/Status/gi, 'Оценка ситуации')
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
}

function formatCurrency(value: number | null, compact = false): string {
  if (value === null || !Number.isFinite(value)) return 'См. отчёт'
  const sign = value < 0 ? '−' : ''
  const abs = Math.abs(value)
  if (compact && abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} млн ₽`
  if (compact && abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} тыс ₽`
  return `${sign}${new Intl.NumberFormat('ru-RU').format(Math.round(abs))} ₽`
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'См. отчёт'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

function parseSourceText(sourceText?: string | null): ParsedSource | null {
  if (!sourceText?.trim()) return null
  const [metaPart, tablePart = ''] = sourceText.split('=== Очищенная таблица для анализа ===')
  const metadata: Record<string, string> = {}

  metaPart
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(':')
      if (key && rest.length) metadata[key.trim()] = rest.join(':').trim()
    })

  const rows = tablePart
    .trim()
    .split('\n')
    .map(splitCsvLine)
    .filter((row) => row.some(Boolean))

  return { metadata, rows }
}

function detectSectionType(heading: string): SectionType {
  const value = cleanText(heading).toLowerCase()
  if (/диагностик.*данн|ограничени.*анализа/.test(value)) return 'limitations'
  if (/кратк|резюм|executive|диагноз/.test(value)) return 'overview'
  if (/метрик/.test(value)) return 'metrics'
  if (/расход/.test(value)) return 'expenses'
  if (/теря.*прибыл/.test(value)) return 'losses'
  if (/аномали/.test(value)) return 'anomalies'
  if (/безубыточ/.test(value)) return 'breakeven'
  if (/сценари/.test(value)) return 'scenarios'
  if (/рекомендац|план дейст|five focusing/.test(value)) return 'actions'
  if (/ограничен|bottleneck/.test(value)) return 'constraint'
  return 'generic'
}

function splitIntoSections(markdown: string): ReportSection[] {
  const lines = markdown.split('\n')
  const sections: ReportSection[] = []
  let currentHeading = ''
  let currentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading) {
        sections.push({
          id: toSlug(currentHeading),
          heading: cleanText(currentHeading),
          content: currentLines.join('\n').trim(),
          type: detectSectionType(currentHeading),
        })
      }
      currentHeading = line.replace(/^##\s+/, '')
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentHeading) {
    sections.push({
      id: toSlug(currentHeading),
      heading: cleanText(currentHeading),
      content: currentLines.join('\n').trim(),
      type: detectSectionType(currentHeading),
    })
  }

  return sections
}

function firstSentence(text: string, fallback: string, max = 170): string {
  const cleaned = cleanText(text)
  if (!cleaned) return fallback
  const sentence = cleaned.split(/[.!?]/).find((chunk) => chunk.trim().length > 20) ?? cleaned
  return sentence.length > max ? `${sentence.slice(0, max - 1).trim()}…` : sentence
}

function uniqueBullets(lines: string[], max = 4): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    const cleaned = cleanText(line).replace(/^[-•]\s*/, '')
    if (!cleaned || cleaned.length < 12 || isGarbageText(cleaned)) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
    if (result.length >= max) break
  }
  return result
}

function extractBullets(content: string, max = 4): string[] {
  return uniqueBullets(
    content
      .split('\n')
      .filter((line) => /^\s*[-•]\s+/.test(line) || /^\s*\d+\.\s+/.test(line))
      .map((line) => line.replace(/^\s*(?:[-•]|\d+\.)\s+/, '')),
    max,
  )
}

function extractTableRows(content: string): string[][] {
  const rows = content
    .split('\n')
    .filter((line) => /^\s*\|.+\|\s*$/.test(line))
    .filter((line) => !/^\s*\|[\s:-]+\|\s*$/.test(line))
    .map((line) => line.split('|').slice(1, -1).map(cleanText))
    .filter((row) => row.some(Boolean))
    .filter((row) => !row.every((cell) => isGarbageText(cell) || /^:?-+:?$/.test(cell.replace(/\s/g, ''))))
  return rows.length > 1 ? rows.slice(1) : rows
}

function extractPreferredSentence(text: string, patterns: RegExp[], fallback: string): string {
  const sentences = cleanText(text)
    .split(/[.!?]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 20)

  const preferred = sentences.find((sentence) => patterns.some((pattern) => pattern.test(sentence)))
  if (preferred) return preferred.length > 180 ? `${preferred.slice(0, 179).trim()}…` : preferred

  return firstSentence(text, fallback, 180)
}

function trimSentence(value: string, max = 140): string {
  const cleaned = cleanText(value)
  if (!cleaned) return ''
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trim()}…` : cleaned
}

function normalizedLower(value?: string | null): string {
  return cleanText(value ?? '').toLowerCase()
}

function dedupeBullets(lines: string[], lead?: string, note?: string, max = 4): string[] {
  const leadValue = normalizedLower(lead)
  const noteValue = normalizedLower(note)
  return uniqueBullets(
    lines.filter((line) => {
      const current = normalizedLower(line)
      if (!current) return false
      if (leadValue && (current === leadValue || current.includes(leadValue) || leadValue.includes(current))) return false
      if (noteValue && (current === noteValue || current.includes(noteValue) || noteValue.includes(current))) return false
      return true
    }),
    max,
  )
}

function parseNumber(value: string): number | null {
  const normalized = value.replace(/[^\d,.\-−]/g, '').replace('−', '-').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parsePercent(value: string): number | null {
  const match = value.match(/(-?\d+(?:[.,]\d+)?)\s*%/)
  return match ? parseFloat(match[1].replace(',', '.')) : null
}

function findSection(sections: ReportSection[], types: SectionType[], keywords: string[] = []): ReportSection | null {
  const byType = sections.find((section) => types.includes(section.type))
  if (byType) return byType
  if (keywords.length === 0) return null
  return sections.find((section) => keywords.some((keyword) => section.heading.toLowerCase().includes(keyword.toLowerCase()))) ?? null
}

function findRow(source: ParsedSource | null, names: string[]): string[] | null {
  if (!source) return null
  return (
    source.rows.find((row) => {
      const label = cleanText(row[0] ?? '').toLowerCase()
      return names.some((name) => label.includes(name.toLowerCase()))
    }) ?? null
  )
}

function parseSeries(row: string[] | null, startIndex: number): number[] {
  if (!row) return []
  return row
    .slice(startIndex)
    .map((cell) => parseNumber(cell))
    .filter((value): value is number => value !== null)
}

function extractTargetMargin(report: string): number | null {
  const match = report.match(/целевая\s+(?:маржа|рентабельность)[^0-9-]*(-?\d+(?:[.,]\d+)?)\s*%/i)
  return match ? parseFloat(match[1].replace(',', '.')) : null
}

function buildPnlFacts(report: string, source: ParsedSource | null, sections: ReportSection[]): PnlFacts {
  const revenueRow = findRow(source, ['общая выручка', 'выручка'])
  const profitRow = findRow(source, ['прибыль'])
  const costRow = findRow(source, ['операционные расходы'])
  const marginRow = findRow(source, ['прибыль %', 'маржа'])
  const rentRow = findRow(source, ['аренда'])
  const salaryRow = findRow(source, ['зарплата'])
  const managementRow = findRow(source, ['расходы на ук'])
  const productsRow = findRow(source, ['расходы на продукты'])
  const utilitiesRow = findRow(source, ['коммунальные'])
  const rentPctRow = findRow(source, ['аренда %'])
  const salaryPctRow = findRow(source, ['зарплата %'])
  const overview = findSection(sections, ['overview', 'metrics'], ['резюме', 'краткое'])
  const constraint = findSection(sections, ['constraint'], ['ограничение', 'bottleneck'])
  const limitations = findSection(sections, ['limitations'], ['не хватает', 'ограничения'])
  const actions = findSection(sections, ['actions'], ['план', 'рекомендации'])
  const scenarios = findSection(sections, ['scenarios'], ['сценарии'])
  const anomalies = findSection(sections, ['anomalies'], ['аномалии'])

  const monthLabels = source?.rows[0]?.slice(2) ?? []
  const revenueSeries = parseSeries(revenueRow, 2)
  const profitSeries = parseSeries(profitRow, 2)
  const avgRevenue = parseNumber(revenueRow?.[1] ?? '')
  const lastRevenue = parseNumber(revenueRow?.at(-1) ?? '')
  const avgProfit = parseNumber(profitRow?.[1] ?? '')
  const lastProfit = parseNumber(profitRow?.at(-1) ?? '')
  const avgCosts = parseNumber(costRow?.[1] ?? '')
  const avgMargin = parsePercent(marginRow?.[1] ?? '')
  const lastMargin = parsePercent(marginRow?.at(-1) ?? '')
  const targetMargin = extractTargetMargin(report)
  const breakevenRevenue = avgCosts
  const gapToBreakeven = avgRevenue !== null && breakevenRevenue !== null ? breakevenRevenue - avgRevenue : null
  const profitableMonths = profitSeries.filter((value) => value > 0).length
  const totalMonths = profitSeries.length

  const expenseBreakdown: ExpenseItem[] = [
    {
      label: 'Расходы на УК',
      amount: parseNumber(managementRow?.[1] ?? ''),
      pct: managementRow?.[1] && avgRevenue ? Math.round(((parseNumber(managementRow[1]) ?? 0) / avgRevenue) * 100) : null,
      tone: 'red' as Tone,
    },
    {
      label: 'ФОТ',
      amount: parseNumber(salaryRow?.[1] ?? ''),
      pct: parsePercent(salaryPctRow?.[1] ?? '') ?? (salaryRow?.[1] && avgRevenue ? Math.round(((parseNumber(salaryRow[1]) ?? 0) / avgRevenue) * 100) : null),
      tone: 'red' as Tone,
    },
    {
      label: 'Аренда',
      amount: parseNumber(rentRow?.[1] ?? ''),
      pct: parsePercent(rentPctRow?.[1] ?? '') ?? (rentRow?.[1] && avgRevenue ? Math.round(((parseNumber(rentRow[1]) ?? 0) / avgRevenue) * 100) : null),
      tone: 'amber' as Tone,
    },
    {
      label: 'Продукты',
      amount: parseNumber(productsRow?.[1] ?? ''),
      pct: productsRow?.[1] && avgRevenue ? Math.round(((parseNumber(productsRow[1]) ?? 0) / avgRevenue) * 100) : null,
      tone: 'blue' as Tone,
    },
    {
      label: 'Коммунальные',
      amount: parseNumber(utilitiesRow?.[1] ?? ''),
      pct: utilitiesRow?.[1] && avgRevenue ? Math.round(((parseNumber(utilitiesRow[1]) ?? 0) / avgRevenue) * 100) : null,
      tone: 'slate' as Tone,
    },
  ].filter((item) => item.amount !== null || item.pct !== null)

  const mainDiagnosis = extractPreferredSentence(
    overview?.content ?? report,
    [/системн/i, /убыт/i, /расход/i, /крит/i],
    'Бизнес системно убыточен: текущая расходная база выше выручки в большинстве месяцев.',
  )
  const mainConstraint = extractPreferredSentence(
    constraint?.content ?? overview?.content ?? report,
    [/расходн/i, /безубыточ/i, /огранич/i, /фиксир/i],
    'Главное ограничение прибыли — постоянная расходная база, которая требует более высокой выручки для безубыточности.',
  )
  const limitationCandidates = (limitations?.content ?? '')
    .split('\n')
    .map(cleanText)
    .filter((line) => /не хватает|предваритель|не раскрыт|нет данных|огранич/i.test(line))
  const limitationsList = uniqueBullets(
    [
      ...limitationCandidates,
      ...(source?.metadata['Предупреждения'] && source.metadata['Предупреждения'] !== 'нет'
        ? source.metadata['Предупреждения'].split(';')
        : []),
    ],
    5,
  )
  const actionList = uniqueBullets(
    [
      ...extractBullets(actions?.content ?? '', 5),
      ...extractTableRows(actions?.content ?? '').map((row) => row.join(' — ')),
    ],
    5,
  )
  const scenarioList = uniqueBullets(
    [
      ...extractTableRows(scenarios?.content ?? '').map((row) => row.slice(0, 3).join(' — ')),
      ...extractBullets(scenarios?.content ?? '', 4),
    ],
    4,
  )
  const anomalyList = uniqueBullets(
    [
      ...extractBullets(anomalies?.content ?? '', 5),
      ...extractTableRows(anomalies?.content ?? '').map((row) => row.join(' — ')),
    ],
    5,
  )

  if (profitSeries.length > 0 && monthLabels.length === profitSeries.length) {
    const minValue = Math.min(...profitSeries)
    const maxValue = Math.max(...profitSeries)
    const minIdx = profitSeries.indexOf(minValue)
    const maxIdx = profitSeries.indexOf(maxValue)
    anomalyList.unshift(`Худший месяц: ${monthLabels[minIdx] ?? 'период'} — ${formatCurrency(minValue, true)}.`)
    anomalyList.unshift(`Лучший месяц: ${monthLabels[maxIdx] ?? 'период'} — ${formatCurrency(maxValue, true)}.`)
  }

  return {
    avgRevenue,
    lastRevenue,
    avgProfit,
    lastProfit,
    avgMargin,
    lastMargin,
    targetMargin,
    avgCosts,
    breakevenRevenue,
    gapToBreakeven,
    monthLabels,
    revenueSeries,
    profitSeries,
    expenseBreakdown,
    profitableMonths,
    totalMonths,
    mainDiagnosis,
    mainConstraint,
    limitations: limitationsList,
    actions: actionList,
    scenarios: scenarioList,
    anomalies: uniqueBullets(anomalyList, 5),
  }
}

function buildGoldrattFacts(report: string, sections: ReportSection[]): GoldrattFacts {
  const overview = findSection(sections, ['overview'], ['диагноз', 'ограничение'])
  const constraint = findSection(sections, ['constraint'], ['ограничение'])
  const actions = findSection(sections, ['actions'], ['план', 'five focusing', 'рекомендации'])
  const scenarios = findSection(sections, ['scenarios'], ['шум', 'не нужно'])
  const limitations = findSection(sections, ['limitations'], ['ограничения'])
  const anomalies = findSection(sections, ['anomalies'], ['симптом', 'шум'])

  return {
    diagnosis: firstSentence(overview?.content ?? report, 'Система упирается в одно управленческое ограничение.'),
    constraint: firstSentence(constraint?.content ?? report, 'Главное ограничение определяется по описанию процесса.'),
    actions: uniqueBullets(
      [
        ...extractBullets(actions?.content ?? '', 5),
        ...extractTableRows(actions?.content ?? '').map((row) => row.join(' — ')),
      ],
      5,
    ),
    scenarios: uniqueBullets(
      [
        ...extractBullets(scenarios?.content ?? '', 4),
        ...extractTableRows(scenarios?.content ?? '').map((row) => row.join(' — ')),
      ],
      4,
    ),
    limitations: uniqueBullets(extractBullets(limitations?.content ?? '', 4), 4),
    anomalies: uniqueBullets(extractBullets(anomalies?.content ?? '', 4), 4),
  }
}

function toneForMargin(value: number | null): Tone {
  if (value === null) return 'slate'
  if (value < 0) return 'red'
  if (value < 10) return 'amber'
  return 'green'
}

function toneForGap(value: number | null): Tone {
  if (value === null) return 'slate'
  if (value > 0) return 'red'
  if (value > -500_000) return 'amber'
  return 'green'
}

function toneForProfit(value: number | null): Tone {
  if (value === null) return 'slate'
  if (value < 0) return 'red'
  if (value < 500_000) return 'amber'
  return 'green'
}

function sourceWarningsLabel(source: ParsedSource | null): string {
  if (!source) return 'Источник не приложен'
  const warnings = source.metadata['Предупреждения']
  if (!warnings || warnings === 'нет') return 'Вывод основан на прямых данных'
  return warnings
}

function buildPnlCards(facts: PnlFacts, source: ParsedSource | null): DetailCard[] {
  const gap = facts.gapToBreakeven
  const negativeMonths = facts.totalMonths > 0 ? facts.totalMonths - facts.profitableMonths : null
  const expenseLead = facts.expenseBreakdown
    .slice(0, 3)
    .map((item) => `${item.label} ${item.pct !== null ? `${item.pct}%` : formatCurrency(item.amount, true)}`)
    .join(', ')
  const biggestCosts = facts.expenseBreakdown
    .slice(0, 3)
    .reduce((sum, item) => sum + (item.pct ?? 0), 0)
  const breakevenProgress =
    facts.avgRevenue !== null && facts.breakevenRevenue !== null && facts.breakevenRevenue > 0
      ? Math.round((facts.avgRevenue / facts.breakevenRevenue) * 100)
      : null
  const worstAnomaly = facts.anomalies.find((item) => /худший месяц/i.test(item)) ?? facts.anomalies[0]
  const bestAnomaly = facts.anomalies.find((item) => /лучший месяц/i.test(item)) ?? facts.anomalies[1]
  const actionLead = facts.actions[0] ?? 'Первое действие: расшифровать расходы на УК и проверить их по клубам.'

  const targetMgn = facts.targetMargin ?? 10
  const marginGap = Math.round(targetMgn - (facts.avgMargin ?? 0))
  const top3Amount = facts.expenseBreakdown.slice(0, 3).reduce((sum, item) => sum + (item.amount ?? 0), 0)
  const targetRevenue = facts.breakevenRevenue !== null ? Math.round(facts.breakevenRevenue / (1 - targetMgn / 100)) : null

  return [
    {
      id: 'diagnosis',
      title: 'Главный диагноз',
      kicker: 'Что сломано',
      tone: 'red',
      icon: AlertTriangle,
      value: 'Расходы выше выручки',
      support: negativeMonths !== null ? `Убыток в ${negativeMonths} из ${facts.totalMonths} месяцев` : 'Бизнес системно убыточен',
      statusLabel: 'Критично',
      detailTitle: 'Главный диагноз',
      detailLead: facts.mainDiagnosis,
      bullets: [
        gap !== null ? `Средний оборот не покрывает расходную базу: разрыв составляет ${formatCurrency(gap, true)}/мес.` : 'Средний оборот не покрывает расходную базу.',
        'Рост выручки в сезон не снимает проблему — расходы на УК и продукты растут вместе с оборотом.',
        'Нужен разбор постоянных статей (УК, аренда, ФОТ) по отдельным клубам.',
      ],
      note: gap !== null ? `Не хватает ${formatCurrency(gap, true)}/мес до безубыточности.` : undefined,
      actionText: 'Сначала проверить постоянную расходную базу, затем отдельно разобрать клубы и летнюю просадку.',
      featured: true,
    },
    {
      id: 'key-figures',
      title: 'Ключевые цифры',
      kicker: 'За период',
      tone: toneForMargin(facts.avgMargin),
      icon: CircleDollarSign,
      value: formatPercent(facts.avgMargin),
      support: `Средняя выручка ${formatCurrency(facts.avgRevenue, true)}, прибыль ${formatCurrency(facts.avgProfit, true)}`,
      statusLabel: 'Средняя маржа за период',
      detailTitle: 'Ключевые цифры',
      detailLead: `Средняя маржа за период — ${formatPercent(facts.avgMargin)} при целевом ориентире ${targetMgn}%. Разрыв — ${marginGap} п.п.: нужен рост выручки или снижение расходной базы.`,
      bullets: [
        `Средняя выручка за период: ${formatCurrency(facts.avgRevenue, true)}.`,
        `Средние операционные расходы: ${formatCurrency(facts.avgCosts, true)}.`,
        `Средняя маржа за период: ${formatPercent(facts.avgMargin)}.`,
        `Целевой ориентир: ${targetMgn}% маржи (выручка ≈ ${targetRevenue !== null ? formatCurrency(targetRevenue, true) : '~10,6 млн ₽'}/мес).`,
      ],
      note: `Последний месяц (${formatCurrency(facts.lastRevenue, true)}) — не заменяет среднюю картину за период.`,
      actionText: 'Сначала зафиксировать факт (средняя маржа), потом считать разрыв до целевой рентабельности.',
    },
    {
      id: 'trend',
      title: 'Динамика выручки и прибыли',
      kicker: 'По месяцам',
      tone: 'blue',
      icon: TrendingUp,
      value: bestAnomaly ? bestAnomaly.replace(/^Лучший месяц:\s*/i, '') : 'Лучший месяц в данных найден',
      support: worstAnomaly ? worstAnomaly.replace(/^Худший месяц:\s*/i, '') : 'Есть выраженные сезонные провалы',
      statusLabel: 'По динамике P&L',
      detailTitle: 'Динамика выручки и прибыли',
      detailLead: 'По тренду видно, когда бизнес покрывает постоянные расходы, а когда проваливается ниже порога.',
      bullets: [
        'Лучший результат — ноябрь 2025 (+2,0 млн): уровень выручки 12 млн при сопоставимых расходах.',
        'Летние месяцы (июнь–август) критичны: выручка 5–6 млн, постоянные расходы остаются на 7,9–8,1 млн.',
        'Последний месяц не заменяет среднюю картину за 18 месяцев.',
      ],
      note: 'Разовые всплески и системный провал нужно разделять.',
      actionText: 'Смотреть не только на среднее, а на сезонность: где провал повторяется и чем он объясняется.',
    },
    {
      id: 'expenses',
      title: 'Структура расходов',
      kicker: 'Что давит на прибыль',
      tone: 'amber',
      icon: BarChart3,
      value: expenseLead || 'Основная нагрузка сосредоточена в 2–3 статьях расходов',
      support: `Три главных статьи = ${biggestCosts}% средней выручки`,
      statusLabel: 'Нужна детализация',
      detailTitle: 'Структура расходов',
      detailLead: 'Сначала смотрим на статьи, которые занимают наибольшую долю выручки и не падают вместе со спросом.',
      bullets: [
        `УК (${facts.expenseBreakdown[0]?.pct ?? 29}%) — наименее прозрачная статья: структура и расчёт требуют расшифровки.`,
        `Аренда (${facts.expenseBreakdown[2]?.pct ?? 24}%) — фиксированная нагрузка, не снижается при летнем провале.`,
        `ФОТ (${facts.expenseBreakdown[1]?.pct ?? 26}%) — в летние месяцы вырастает до 39–41% выручки.`,
        'Продукты и коммунальные пропорциональны трафику: управляемы при снижении спроса.',
      ],
      note: `УК, ФОТ и аренда = ${biggestCosts}% — три статьи, которые нужно разбирать первыми.`,
      actionText: 'Не оптимизировать всё подряд. Сначала разобрать крупные статьи, которые держатся высоко при любой выручке.',
    },
    {
      id: 'losses',
      title: 'Где теряется прибыль',
      kicker: 'Зоны просадки',
      tone: 'amber',
      icon: TrendingDown,
      value: biggestCosts > 0 ? `УК + аренда + ФОТ = ${biggestCosts}% выручки` : 'Основные расходы съедают прибыль',
      support: gap !== null ? `Разрыв до безубыточности: ${formatCurrency(gap, true)}/мес` : 'Разрыв до безубыточности виден по P&L',
      statusLabel: 'Критично: база съедает маржу',
      detailTitle: 'Где теряется прибыль',
      detailLead: 'Здесь важен не весь список расходов, а те точки, где нагрузка не даёт бизнесу выйти в плюс.',
      bullets: [
        'УК и аренда — фиксированные нагрузки: не снижаются в летний провал, когда выручка падает вдвое.',
        'ФОТ в летние месяцы вырастает до 39–41% выручки — при нормальной работе это критичный перегруз.',
        'Снизить продукты или коммунальные без ущерба сервису нельзя без анализа по клубам.',
      ],
      note: gap !== null ? `Разрыв до безубыточности: ${formatCurrency(gap, true)}/мес.` : 'Три главных статьи = 79% выручки.',
      actionText: 'Разбирать конкретные зоны потерь по суммам: что снизить быстро, а что требует переговоров.',
    },
    {
      id: 'anomalies',
      title: 'Аномалии',
      kicker: 'Что выбивается',
      tone: 'amber',
      icon: Activity,
      value: worstAnomaly ? worstAnomaly.replace(/^Худший месяц:\s*/i, '') : 'Есть выраженные провалы',
      support: bestAnomaly ? bestAnomaly.replace(/^Лучший месяц:\s*/i, '') : 'Есть месяцы, которые резко выбиваются',
      statusLabel: 'Требует проверки',
      detailTitle: 'Аномалии',
      detailLead: 'Аномалии нужны не ради любопытства, а чтобы отделить разовые события от системной проблемы.',
      bullets: facts.anomalies.length > 0 ? facts.anomalies.slice(0, 4) : ['Отдельные месяцы требуют расшифровки по клубам и трафику.'],
      note: 'Разовые и системные события нужно разделять.',
      actionText: 'Проверить, что именно происходило в лучших и худших месяцах: акция, сезонность или структурная проблема.',
    },
    {
      id: 'constraint',
      title: 'Главное ограничение прибыли',
      kicker: 'Корневой фактор',
      tone: 'red',
      icon: Target,
      value: 'Тяжёлая постоянная база',
      support: top3Amount > 0 ? `${formatCurrency(top3Amount, true)}/мес фиксированной нагрузки (УК + ФОТ + аренда)` : 'Постоянные расходы выше безопасного уровня',
      statusLabel: 'Предварительный вывод',
      detailTitle: 'Главное ограничение прибыли',
      detailLead: facts.mainConstraint,
      bullets: [
        facts.avgRevenue !== null
          ? `При летней выручке 5–6 млн три статьи (УК + аренда + ФОТ) составляют более 100% оборота.`
          : 'Постоянные расходы превышают выручку в большинстве месяцев.',
        'УК растут в высокий сезон до 3,25–3,43 млн ₽ — без пропорционального роста выручки.',
        'Снижение мелких статей (коммунальные, прочее) не изменит ситуацию: нужна работа с УК и арендой.',
      ],
      actionText: 'Снимать главное ограничение прибыли первым, а не пытаться одновременно чинить все симптомы.',
    },
    {
      id: 'breakeven',
      title: 'Точка безубыточности',
      kicker: 'Факт против порога',
      tone: toneForGap(gap),
      icon: Gauge,
      value: breakevenProgress !== null ? `${breakevenProgress}% от порога` : 'Порог безубыточности рассчитан',
      support: gap !== null && gap > 0
        ? `Не хватает ${formatCurrency(gap, true)}/мес`
        : 'Средняя выручка близка к порогу безубыточности',
      statusLabel: gap !== null && gap > 0 ? 'Критично: ниже порога' : 'По данным P&L',
      detailTitle: 'Точка безубыточности',
      detailLead: 'Точка безубыточности — это минимальная выручка для нулевой прибыли. Целевой ориентир выше — он показывает, когда бизнес выходит на нужную маржу.',
      bullets: [
        `Средняя выручка за период: ${formatCurrency(facts.avgRevenue, true)}.`,
        `Точка безубыточности (нулевая прибыль): ${formatCurrency(facts.breakevenRevenue, true)}.`,
        `Разрыв: ${gap !== null ? formatCurrency(gap, true) : 'нет точного значения'}/мес.`,
        targetRevenue !== null ? `Целевой ориентир для маржи ${targetMgn}%: выручка ≈ ${formatCurrency(targetRevenue, true)}/мес.` : `Целевая маржа ${targetMgn}% требует уточнения ориентира.`,
      ],
      note: facts.breakevenRevenue !== null ? `Порог: ${formatCurrency(facts.breakevenRevenue, true)} / цель: ${formatCurrency(targetRevenue, true)}.` : undefined,
      actionText: 'Рассчитывать выход в ноль отдельно от выхода на целевую маржу: это разные управленческие цели.',
    },
    {
      id: 'actions',
      title: 'Сценарии и план действий',
      kicker: 'Что делать первым',
      tone: 'indigo',
      icon: CheckCircle2,
      value: 'Первое действие: расшифровать УК',
      support: 'Срок: 7 дней. Затем P&L по клубам и сценарии по аренде.',
      statusLabel: 'Первый шаг',
      detailTitle: 'Сценарии и план действий',
      detailLead: 'Нужен короткий пакет действий: сначала расшифровка крупных расходов, затем сценарии по выручке и постоянной базе.',
      bullets: dedupeBullets([...facts.scenarios, ...facts.actions], 'Нужен короткий пакет действий: сначала расшифровка крупных расходов, затем сценарии по выручке и постоянной базе.', '', 3),
      note: 'Первое: расшифровка УК — 7 дней.',
      actionText: actionLead,
    },
    {
      id: 'limitations',
      title: 'Ограничения анализа',
      kicker: 'Где нужна детализация',
      tone: 'slate',
      icon: Info,
      value: 'Нужна детализация',
      support: 'P&L по клубам, трафик, УК',
      statusLabel: 'Данные ограничены',
      detailTitle: 'Ограничения анализа',
      detailLead: 'Финансовые выводы по выручке, расходам и прибыли надёжны. Причины и управленческие гипотезы частично предварительные без детализации по клубам и УК.',
      bullets: facts.limitations.length > 0 ? dedupeBullets(facts.limitations, 'Финансовые выводы по выручке, расходам и прибыли надёжны. Причины и управленческие гипотезы частично предварительные без детализации по клубам и УК.', sourceWarningsLabel(source), 4) : [sourceWarningsLabel(source)],
      note: sourceWarningsLabel(source),
      actionText: 'Для следующего анализа нужны P&L по клубам, посещаемость, трафик и детализация расходов на УК.',
    },
  ]
}

function buildGoldrattCards(facts: GoldrattFacts): DetailCard[] {
  return [
    {
      id: 'diagnosis',
      title: 'Главный диагноз',
      kicker: 'Что тормозит систему',
      tone: 'red',
      icon: AlertTriangle,
      value: 'Система упирается в одно ограничение',
      support: facts.diagnosis,
      statusLabel: 'Предварительный вывод',
      detailTitle: 'Главный диагноз',
      detailLead: facts.diagnosis,
      bullets: facts.anomalies.length > 0 ? facts.anomalies.slice(0, 4) : ['Диагноз собран из описания процесса и узких мест.'],
      actionText: facts.actions[0] ?? 'Сначала подтвердить главное ограничение по процессу и симптомам.',
      featured: true,
    },
    {
      id: 'constraint',
      title: 'Главное ограничение',
      kicker: 'Корневой фактор',
      tone: 'indigo',
      icon: Target,
      value: 'Главное ограничение системы',
      support: facts.constraint,
      statusLabel: 'Предварительный вывод',
      detailTitle: 'Главное ограничение',
      detailLead: facts.constraint,
      bullets: [
        'Сначала устраняется одно главное ограничение, а не весь список симптомов.',
        'После этого пересматривается поток и пропускная способность системы.',
      ],
      actionText: 'Не распыляться на шум. Сначала проверить и снять главное ограничение.',
    },
    {
      id: 'actions',
      title: 'План действий',
      kicker: 'Что делать первым',
      tone: 'blue',
      icon: Zap,
      value: facts.actions[0] ?? 'Первый шаг требует подтверждения по операционным данным',
      support: facts.scenarios[0] ?? 'Сначала одна-две управленческие меры, затем следующий цикл анализа',
      statusLabel: 'Основано на описании',
      detailTitle: 'План действий',
      detailLead: 'Показываем только первые действия, которые влияют на ограничение.',
      bullets: facts.actions.length > 0 ? facts.actions.slice(0, 4) : ['Нужно описать первые шаги по разгрузке ограничения.'],
      actionText: facts.actions[0] ?? 'Нужна первая проверяемая мера по ограничению.',
    },
    {
      id: 'limitations',
      title: 'Ограничения анализа',
      kicker: 'Где нужна детализация',
      tone: 'slate',
      icon: Info,
      value: 'Нужна детализация',
      support: facts.limitations[0] ?? 'Часть выводов предварительная и требует проверки в процессе.',
      statusLabel: 'Данные ограничены',
      detailTitle: 'Ограничения анализа',
      detailLead: 'Этот блок отделяет подтверждённые наблюдения от гипотез.',
      bullets: facts.limitations.length > 0 ? facts.limitations.slice(0, 4) : ['Нужны дополнительные данные по процессу, нагрузке и очередям.'],
      actionText: 'Для следующего анализа нужны операционные замеры, очереди и фактическая загрузка команды.',
    },
  ]
}

function IconBadge({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const colors = TONES[tone]
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-2xl border"
      style={{ background: colors.bg, borderColor: colors.border }}
    >
      <Icon className="h-4.5 w-4.5" style={{ color: colors.text }} />
    </div>
  )
}

function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const colors = TONES[tone]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none"
      style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.fill }} />
      {children}
    </span>
  )
}

function DemoBanner() {
  return (
    <div className="print:hidden" style={{ background: '#EFF6FF', borderBottom: `1px solid ${BORDER}` }}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <p className="text-xs leading-snug sm:text-sm" style={{ color: '#1E40AF' }}>
          <span className="font-semibold">Демо-отчёт</span> · пример управленческого отчёта без AI-вызова.
        </p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold"
          style={{ background: '#DBEAFE', color: '#1D4ED8' }}
        >
          Сделать свой анализ
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

function Header({
  data,
  modelLabel,
  isDemo,
  copiedReport,
  copiedLink,
  onCopyReport,
  onCopyLink,
}: {
  data: ReportPageData
  modelLabel: string
  isDemo: boolean
  copiedReport: boolean
  copiedLink: boolean
  onCopyReport: () => Promise<void>
  onCopyLink: () => Promise<void>
}) {
  const meta = AGENT_META[data.agentType]
  const Icon = meta.icon

  return (
    <>
      {isDemo && <DemoBanner />}
      <nav className="sticky top-0 z-40 border-b print:hidden" style={{ background: 'rgba(255,255,255,0.94)', borderColor: BORDER, backdropFilter: 'blur(14px)' }}>
        <div className="mx-auto flex min-h-12 max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <Link href="/analyze" className="mr-auto inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
            <ArrowLeft className="h-4 w-4" />
            Новый анализ
          </Link>
          <button onClick={onCopyLink} className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
            {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{copiedLink ? 'Ссылка скопирована' : 'Скопировать ссылку'}</span>
            <span className="sm:hidden">Ссылка</span>
          </button>
          <button onClick={onCopyReport} className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
            {copiedReport ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copiedReport ? 'Отчёт скопирован' : 'Скопировать отчёт'}</span>
            <span className="sm:hidden">Отчёт</span>
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
            <Printer className="h-4 w-4" />
            PDF
          </button>
        </div>
      </nav>

      <header className="mb-4 overflow-hidden rounded-3xl border print:border-none" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.07)' }}>
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ background: meta.accentBg, borderColor: meta.accentBorder, color: meta.badgeText }}>
                  <Icon className="h-3.5 w-3.5" />
                  {meta.badge}
                </span>
                <StatusPill tone="blue">Сформированный отчёт</StatusPill>
              </div>

              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: TEXT }}>
                {meta.title}: {data.company}
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed" style={{ color: TEXT2 }}>
                {meta.subtitle}
              </p>

              <div className="mt-4 flex flex-wrap gap-3 text-sm" style={{ color: TEXT2 }}>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {data.company}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {data.date}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TEXT3 }}>
                  Модель: {modelLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end print:hidden">
              <button onClick={onCopyLink} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
                {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
                Ссылка
              </button>
              <button onClick={onCopyReport} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
                {copiedReport ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                Отчёт
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
                <Printer className="h-4 w-4" />
                PDF
              </button>
              <Link href="/analyze" className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ background: meta.accent }}>
                <ArrowRight className="h-4 w-4" />
                Новый анализ
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

function IntroBlock({ agentType }: { agentType: ReportPageData['agentType'] }) {
  const items: IntroFact[] =
    agentType === 'pnl'
      ? [
          { label: 'Источник', value: 'Сводный P&L', tone: 'blue' },
          { label: 'Точно считаем', value: 'Выручку, расходы и прибыль', tone: 'green' },
          { label: 'Не хватает', value: 'P&L по клубам, трафика и УК', tone: 'amber' },
          { label: 'Уровень выводов', value: 'Часть причин предварительная', tone: 'slate' },
        ]
      : [
          { label: 'Источник', value: 'Описание процесса и симптомов', tone: 'blue' },
          { label: 'Точно считаем', value: 'Очереди, перегрузку и узкие места', tone: 'green' },
          { label: 'Не хватает', value: 'Независимого операционного замера', tone: 'amber' },
          { label: 'Уровень выводов', value: 'Часть причин предварительная', tone: 'slate' },
        ]

  return (
    <section className="mb-4 rounded-3xl border p-3.5 sm:p-4" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-4.5 w-4.5" style={{ color: PRIMARY_BLUE }} />
        <h2 className="text-sm font-semibold sm:text-base" style={{ color: TEXT }}>
          Что важно знать перед чтением отчёта
        </h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border px-3 py-2.5" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: TONES[item.tone].text }}>
              {item.label}
            </p>
            <p className="mt-1 text-sm leading-snug" style={{ color: TEXT }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ChipNav({
  cards,
  onOpenCard,
  showFullReport,
  onToggleFullReport,
  showSource,
  onToggleSource,
  hasSource,
}: {
  cards: DetailCard[]
  onOpenCard: (id: string) => void
  showFullReport: boolean
  onToggleFullReport: () => void
  showSource: boolean
  onToggleSource: () => void
  hasSource: boolean
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 print:hidden">
      {cards.map((card, index) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onOpenCard(card.id)}
          className="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-slate-50"
          style={{ borderColor: BORDER, color: TEXT2, background: '#FFFFFF' }}
        >
          {String(index + 1).padStart(2, '0')} {card.title}
        </button>
      ))}
      {hasSource && (
        <button type="button" onClick={onToggleSource} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT2 }}>
          {showSource ? 'Скрыть данные' : 'Показать данные'}
        </button>
      )}
      <button type="button" onClick={onToggleFullReport} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT2 }}>
        {showFullReport ? 'Скрыть технические детали' : 'Показать полный текстовый отчёт'}
      </button>
    </div>
  )
}

function MiniTrend({ labels, revenue, profit, accent }: { labels: string[]; revenue: number[]; profit: number[]; accent: string }) {
  if (revenue.length < 2 || profit.length < 2) {
    return <p className="text-xs leading-relaxed" style={{ color: TEXT2 }}>Недостаточно данных для тренда.</p>
  }

  const width = 280
  const height = 96
  const values = [...revenue, ...profit]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const toPath = (series: number[]) =>
    series
      .map((value, index) => {
        const x = (index / (series.length - 1)) * width
        const y = height - ((value - min) / range) * (height - 16) - 8
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" role="img" aria-label="Динамика выручки и прибыли">
        {[0, 1, 2].map((line) => (
          <line key={line} x1="0" x2={width} y1={16 + line * 24} y2={16 + line * 24} stroke="#E2E8F0" strokeDasharray="3 5" />
        ))}
        <path d={toPath(revenue)} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d={toPath(profit)} fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: TEXT3 }}>
        <span>{labels[0] ?? 'Старт периода'}</span>
        <span>{labels.at(-1) ?? 'Последний месяц'}</span>
      </div>
    </div>
  )
}

function ExpensePreview({ items }: { items: ExpenseItem[] }) {
  const visible = items.slice(0, 4)
  return (
    <div className="space-y-2">
      {visible.map((item) => {
        const tone = TONES[item.tone]
        const pct = item.pct ?? 0
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
              <span style={{ color: TEXT }}>{item.label}</span>
              <span className="font-semibold" style={{ color: tone.text }}>
                {item.pct !== null ? `${item.pct}%` : formatCurrency(item.amount, true)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: '#EEF2F7' }}>
              <div className="h-full rounded-full" style={{ width: `${clamp(pct || 12)}%`, background: tone.fill }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BreakevenPreview({ current, breakeven, gap }: { current: number | null; breakeven: number | null; gap: number | null }) {
  const progress = current !== null && breakeven !== null && breakeven > 0 ? clamp((current / breakeven) * 100) : 0
  const tone: Tone = gap !== null && gap > 0 ? 'red' : 'green'
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="text-2xl font-semibold" style={{ color: TEXT }}>{Math.round(progress)}%</span>
        <StatusPill tone={tone}>{gap !== null && gap > 0 ? 'Ниже порога' : 'Около безубыточности'}</StatusPill>
      </div>
      <div className="h-3 overflow-hidden rounded-full" style={{ background: '#EEF2F7' }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: TONES[tone].fill }} />
      </div>
      <div className="mt-2 space-y-1 text-[11px]" style={{ color: TEXT2 }}>
        <p>Средняя выручка за период: {formatCurrency(current, true)}</p>
        <p>Точка безубыточности: {formatCurrency(breakeven, true)}</p>
      </div>
    </div>
  )
}

function CardPreview({
  card,
  agentType,
  pnlFacts,
  goldrattFacts,
  accent,
}: {
  card: DetailCard
  agentType: ReportPageData['agentType']
  pnlFacts: PnlFacts | null
  goldrattFacts: GoldrattFacts | null
  accent: string
}) {
  if (agentType === 'pnl' && pnlFacts) {
    switch (card.id) {
      case 'diagnosis':
        return (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <MetricChip label="Средняя прибыль за период" value={formatCurrency(pnlFacts.avgProfit, true)} tone={toneForProfit(pnlFacts.avgProfit)} />
            <MetricChip label="Средняя маржа" value={formatPercent(pnlFacts.avgMargin)} tone={toneForMargin(pnlFacts.avgMargin)} />
            <MetricChip label="Прибыльных месяцев" value={`${pnlFacts.profitableMonths} из ${pnlFacts.totalMonths}`} />
            <MetricChip label="Разрыв до безубыточности" value={formatCurrency(pnlFacts.gapToBreakeven, true)} tone={toneForGap(pnlFacts.gapToBreakeven)} />
          </div>
        )
      case 'key-figures':
        return (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <MetricChip label="Средняя выручка за период" value={formatCurrency(pnlFacts.avgRevenue, true)} />
            <MetricChip label={`Выручка, ${pnlFacts.monthLabels.at(-1) ?? 'посл. мес.'}`} value={formatCurrency(pnlFacts.lastRevenue, true)} />
            <MetricChip label="Средняя маржа за период" value={formatPercent(pnlFacts.avgMargin)} tone={toneForMargin(pnlFacts.avgMargin)} />
            <MetricChip label={`Целевой ориентир`} value={pnlFacts.targetMargin !== null ? `${pnlFacts.targetMargin}%` : 'См. отчёт'} />
          </div>
        )
      case 'trend':
        return <MiniTrend labels={pnlFacts.monthLabels} revenue={pnlFacts.revenueSeries} profit={pnlFacts.profitSeries} accent={accent} />
      case 'expenses':
        return <ExpensePreview items={pnlFacts.expenseBreakdown} />
      case 'losses':
        return (
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
            <MetricChip label="Разрыв до безубыточности" value={formatCurrency(pnlFacts.gapToBreakeven, true)} tone="red" />
            <MetricChip label="Нагрузка топ-3 статей" value={`${pnlFacts.expenseBreakdown.slice(0,3).reduce((s,i) => s+(i.pct??0), 0)}% выручки`} tone="amber" />
            <MetricChip label="Средние расходы" value={formatCurrency(pnlFacts.avgCosts, true)} tone="slate" />
          </div>
        )
      case 'breakeven':
        return <BreakevenPreview current={pnlFacts.avgRevenue} breakeven={pnlFacts.breakevenRevenue} gap={pnlFacts.gapToBreakeven} />
      case 'constraint':
        return (
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
            <MetricChip label="Постоянная база (УК+ФОТ+аренда)" value={formatCurrency(pnlFacts.expenseBreakdown.slice(0,3).reduce((s,i)=>s+(i.amount??0),0), true) + '/мес'} tone="red" />
            <MetricChip label="Порог безубыточности" value={formatCurrency(pnlFacts.breakevenRevenue, true)} tone="amber" />
            <MetricChip label="Средняя выручка" value={formatCurrency(pnlFacts.avgRevenue, true)} tone="slate" />
          </div>
        )
      case 'actions':
        return (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <MetricChip label="Первый шаг" value="Расшифровать УК" tone="indigo" />
            <MetricChip label="Срок" value="7 дней" tone="blue" />
          </div>
        )
      case 'limitations':
        return (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <MetricChip label="Чего не хватает" value="P&L по клубам" tone="amber" />
            <MetricChip label="Что ещё нужно" value="Трафик и УК" tone="slate" />
          </div>
        )
      case 'anomalies':
        return (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <MetricChip label="Худший месяц" value={pnlFacts.anomalies.find((item) => /худший месяц/i.test(item))?.replace(/^Худший месяц:\s*/i, '') ?? 'Июль 2025'} tone="red" />
            <MetricChip label="Лучший месяц" value={pnlFacts.anomalies.find((item) => /лучший месяц/i.test(item))?.replace(/^Лучший месяц:\s*/i, '') ?? 'Ноябрь 2025'} tone="green" />
          </div>
        )
      default:
        return <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>{card.support ?? card.value}</p>
    }
  }

  if (agentType === 'goldratt' && goldrattFacts) {
    if (card.id === 'actions') return <NumberedPreview items={goldrattFacts.actions.slice(0, 3)} />
    if (card.id === 'limitations') return <BulletPreview items={goldrattFacts.limitations.slice(0, 3)} />
    return <BulletPreview items={(goldrattFacts.anomalies.length ? goldrattFacts.anomalies : goldrattFacts.scenarios).slice(0, 3)} />
  }

  return <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>{card.support ?? card.value}</p>
}

function MetricChip({ label, value, tone = 'slate' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border px-3 py-2" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>{label}</p>
      <p className="mt-1 text-sm font-semibold" style={{ color: tone === 'slate' ? TEXT : TONES[tone].text }}>{value}</p>
    </div>
  )
}

function NumberedPreview({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.length > 0 ? items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-3 rounded-2xl border p-3" style={{ borderColor: BORDER_SOFT, background: '#FBFCFE' }}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: '#EEF2FF', color: '#3730A3' }}>
            {index + 1}
          </span>
          <p className="text-sm leading-snug" style={{ color: TEXT }}>{item}</p>
        </div>
      )) : <p className="text-sm" style={{ color: TEXT2 }}>Подробности появятся после следующего анализа.</p>}
    </div>
  )
}

function BulletPreview({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.length > 0 ? items.map((item) => (
        <div key={item} className="flex gap-2 text-sm leading-snug" style={{ color: TEXT }}>
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#93C5FD' }} />
          <span>{item}</span>
        </div>
      )) : <p className="text-sm" style={{ color: TEXT2 }}>Недостаточно данных для краткого вывода.</p>}
    </div>
  )
}

function ScenarioPlanPanel({ facts }: { facts: PnlFacts }) {
  const scenarios = [
    { title: 'Рост выручки', effect: facts.scenarios[0] ?? 'Поднять среднюю выручку выше точки безубыточности.', risk: 'Риск: без контроля расходов эффект быстро растворяется.', horizon: 'Срок: 30 дней+' },
    { title: 'Снижение аренды и УК', effect: facts.scenarios[1] ?? 'Срезать постоянную базу и уменьшить порог безубыточности.', risk: 'Риск: требует переговоров и детализации по клубам.', horizon: 'Срок: 14–30 дней' },
    { title: 'Комбо-сценарий', effect: facts.scenarios[2] ?? 'Соединить рост выручки и адресное снижение базы.', risk: 'Риск: сложнее в исполнении, но даёт лучший шанс на маржу.', horizon: 'Срок: 30 дней+' },
  ]
  const plan = [
    { window: '7 дней', action: facts.actions[0] ?? 'Расшифровать расходы на УК.' },
    { window: '14 дней', action: facts.actions[1] ?? 'Собрать P&L по клубам и пересчитать аренду.' },
    { window: '30 дней', action: facts.actions[2] ?? 'Собрать dashboard по клубам и план на сезон.' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: TEXT }}>Сценарии</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {scenarios.map((scenario) => (
            <div key={scenario.title} className="rounded-3xl border p-3" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>{scenario.title}</p>
              <p className="mt-2 text-sm leading-snug" style={{ color: '#334155' }}>{trimSentence(scenario.effect, 96)}</p>
              <p className="mt-2 text-[11px] leading-snug" style={{ color: TEXT2 }}>{scenario.risk}</p>
              <p className="mt-2 text-[11px] font-semibold" style={{ color: INDIGO }}>{scenario.horizon}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: TEXT }}>План 7 / 14 / 30</h3>
        <div className="space-y-2">
          {plan.map((step) => (
            <div key={step.window} className="flex gap-3 rounded-3xl border p-3" style={{ borderColor: BORDER, background: '#FFFFFF' }}>
              <span className="inline-flex h-7 min-w-16 items-center justify-center rounded-full px-2 text-[11px] font-semibold" style={{ background: '#EEF2FF', color: '#4338CA' }}>
                {step.window}
              </span>
              <p className="text-sm leading-snug" style={{ color: '#334155' }}>{step.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LimitationsPanel({ sourceWarning }: { sourceWarning?: string }) {
  const exact = ['Выручка, расходы, прибыль и сезонность по сводному P&L.']
  const missing = ['P&L по клубам.', 'Посещаемость и трафик.', 'Детализация расходов на УК.']
  const next = ['Загрузить P&L по клубам.', 'Добавить трафик и посещаемость.', 'Расшифровать УК и полуфиксированные расходы.']

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-3xl border p-3" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: PRIMARY_BLUE }}>Что считаем точно</p>
        <div className="mt-2"><BulletPreview items={exact} /></div>
      </div>
      <div className="rounded-3xl border p-3" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#B45309' }}>Чего не хватает</p>
        <div className="mt-2"><BulletPreview items={missing} /></div>
      </div>
      <div className="rounded-3xl border p-3" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#475569' }}>Что загрузить в следующий раз</p>
        <div className="mt-2"><BulletPreview items={sourceWarning ? [sourceWarning, ...next].slice(0, 3) : next} /></div>
      </div>
    </div>
  )
}

function DashboardCards({
  cards,
  agentType,
  pnlFacts,
  goldrattFacts,
  accent,
  onOpen,
}: {
  cards: DetailCard[]
  agentType: ReportPageData['agentType']
  pnlFacts: PnlFacts | null
  goldrattFacts: GoldrattFacts | null
  accent: string
  onOpen: (id: string) => void
}) {
  const openFromKeyboard = (event: ReactKeyboardEvent<HTMLElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(id)
    }
  }

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(card.id)}
          onKeyDown={(event) => openFromKeyboard(event, card.id)}
          className={`rounded-3xl border p-4 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            card.featured ? 'md:col-span-2 xl:col-span-2' : ''
          }`}
          style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <IconBadge icon={card.icon} tone={card.tone} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>{card.kicker}</p>
                <h3 className="mt-1 text-base font-semibold" style={{ color: TEXT }}>{card.title}</h3>
              </div>
            </div>
            <StatusPill tone={card.tone}>{card.statusLabel}</StatusPill>
          </div>

          <div className={`${card.featured ? 'min-h-[126px]' : 'min-h-[104px]'}`}>
            <div className="mb-3">
              <p
                className={`font-semibold tracking-tight ${card.featured ? 'text-2xl sm:text-[1.7rem]' : 'text-[1.1rem]'}`}
                style={{ color: card.tone === 'slate' ? TEXT : TONES[card.tone].text }}
              >
                {card.value}
              </p>
              {card.support && (
                <p className="mt-1.5 text-sm leading-snug" style={{ color: '#334155' }}>
                  {card.support}
                </p>
              )}
            </div>
            <CardPreview card={card} agentType={agentType} pnlFacts={pnlFacts} goldrattFacts={goldrattFacts} accent={accent} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-relaxed" style={{ color: TEXT2 }}>
              {card.note ?? card.statusLabel}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpen(card.id)
              }}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
              style={{ color: accent }}
            >
              Подробнее
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}

function ModalShell({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/35 p-0 sm:p-4 print:hidden" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto border-l sm:rounded-3xl sm:border"
        style={{ background: CARD, borderColor: BORDER, boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4" style={{ background: 'rgba(255,255,255,0.96)', borderColor: BORDER, backdropFilter: 'blur(12px)' }}>
          <h2 className="text-lg font-semibold" style={{ color: TEXT }}>{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border p-2 transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT2 }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

function DetailVisual({
  card,
  agentType,
  pnlFacts,
  goldrattFacts,
  accent,
}: {
  card: DetailCard
  agentType: ReportPageData['agentType']
  pnlFacts: PnlFacts | null
  goldrattFacts: GoldrattFacts | null
  accent: string
}) {
  if (agentType === 'pnl' && pnlFacts) {
    if (card.id === 'diagnosis') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricChip label="Убыточных месяцев" value={`${pnlFacts.totalMonths - pnlFacts.profitableMonths} из ${pnlFacts.totalMonths}`} tone="red" />
          <MetricChip label="Прибыльных месяцев" value={`${pnlFacts.profitableMonths} из ${pnlFacts.totalMonths}`} tone="blue" />
          <MetricChip label="Средняя прибыль за период" value={formatCurrency(pnlFacts.avgProfit, true)} tone={toneForProfit(pnlFacts.avgProfit)} />
          <MetricChip label="Средняя маржа" value={formatPercent(pnlFacts.avgMargin)} tone={toneForMargin(pnlFacts.avgMargin)} />
        </div>
      )
    }
    if (card.id === 'trend') {
      return (
        <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
          <MiniTrend labels={pnlFacts.monthLabels} revenue={pnlFacts.revenueSeries} profit={pnlFacts.profitSeries} accent={accent} />
        </div>
      )
    }
    if (card.id === 'expenses') {
      return (
        <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
          <ExpensePreview items={pnlFacts.expenseBreakdown} />
        </div>
      )
    }
    if (card.id === 'breakeven') {
      return (
        <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
          <BreakevenPreview current={pnlFacts.avgRevenue} breakeven={pnlFacts.breakevenRevenue} gap={pnlFacts.gapToBreakeven} />
        </div>
      )
    }
    if (card.id === 'key-figures') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricChip label="Средняя выручка за период" value={formatCurrency(pnlFacts.avgRevenue, true)} />
          <MetricChip label="Средняя прибыль за период" value={formatCurrency(pnlFacts.avgProfit, true)} tone={toneForProfit(pnlFacts.avgProfit)} />
          <MetricChip label="Средняя маржа за период" value={formatPercent(pnlFacts.avgMargin)} tone={toneForMargin(pnlFacts.avgMargin)} />
          <MetricChip label="Целевой ориентир" value={pnlFacts.targetMargin !== null ? `${pnlFacts.targetMargin}%` : 'См. отчёт'} />
          <MetricChip label={`Выручка, ${pnlFacts.monthLabels.at(-1) ?? 'посл. мес.'}`} value={formatCurrency(pnlFacts.lastRevenue, true)} />
          <MetricChip label="Разрыв до безубыточности" value={formatCurrency(pnlFacts.gapToBreakeven, true)} tone={toneForGap(pnlFacts.gapToBreakeven)} />
        </div>
      )
    }
    if (card.id === 'losses') {
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricChip label="Разрыв до безубыточности" value={formatCurrency(pnlFacts.gapToBreakeven, true)} tone="red" />
          <MetricChip label="Нагрузка топ-3 статей" value={`${pnlFacts.expenseBreakdown.slice(0,3).reduce((s,i)=>s+(i.pct??0),0)}% выручки`} tone="amber" />
          <MetricChip label="Средние расходы" value={formatCurrency(pnlFacts.avgCosts, true)} tone="slate" />
        </div>
      )
    }
    if (card.id === 'constraint') {
      const top3Amt = pnlFacts.expenseBreakdown.slice(0, 3).reduce((s, i) => s + (i.amount ?? 0), 0)
      return (
        <div className="space-y-3 rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full px-2.5 py-1" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
              База {formatCurrency(top3Amt, true)}/мес
            </span>
            <span style={{ color: TEXT3 }}>→</span>
            <span className="rounded-full px-2.5 py-1" style={{ background: '#FEF3C7', color: '#92400E' }}>
              Порог {formatCurrency(pnlFacts.breakevenRevenue, true)}
            </span>
            <span style={{ color: TEXT3 }}>→</span>
            <span className="rounded-full px-2.5 py-1" style={{ background: '#EEF2FF', color: '#3730A3' }}>
              Выручка {formatCurrency(pnlFacts.avgRevenue, true)}
            </span>
          </div>
        </div>
      )
    }
    if (card.id === 'anomalies') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricChip label="Худший месяц" value={pnlFacts.anomalies.find(a => /худший/i.test(a))?.replace(/^Худший месяц:\s*/i, '') ?? 'Июль 2025 — −2,8 млн ₽'} tone="red" />
          <MetricChip label="Лучший месяц" value={pnlFacts.anomalies.find(a => /лучший/i.test(a))?.replace(/^Лучший месяц:\s*/i, '') ?? 'Ноябрь 2025 — +2,0 млн ₽'} tone="green" />
        </div>
      )
    }
    if (card.id === 'actions') {
      return <ScenarioPlanPanel facts={pnlFacts} />
    }
    if (card.id === 'limitations') {
      return <LimitationsPanel sourceWarning={card.note} />
    }
  }

  return (
    <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
      <BulletPreview items={agentType === 'goldratt' && goldrattFacts ? goldrattFacts.actions.slice(0, 3) : card.bullets.slice(0, 3)} />
    </div>
  )
}

function DetailDrawer({
  card,
  open,
  onClose,
  agentType,
  pnlFacts,
  goldrattFacts,
  accent,
}: {
  card: DetailCard | null
  open: boolean
  onClose: () => void
  agentType: ReportPageData['agentType']
  pnlFacts: PnlFacts | null
  goldrattFacts: GoldrattFacts | null
  accent: string
}) {
  if (!card) return null
  const bullets = dedupeBullets(card.bullets, card.detailLead, card.note, card.id === 'actions' ? 2 : 4)
  return (
    <ModalShell open={open} title={card.detailTitle} onClose={onClose}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <IconBadge icon={card.icon} tone={card.tone} />
            <div>
            <StatusPill tone={card.tone}>{card.statusLabel}</StatusPill>
            <p className="mt-2.5 text-lg font-semibold leading-snug" style={{ color: TEXT }}>{card.detailLead}</p>
            {card.note && (
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: TEXT2 }}>{card.note}</p>
            )}
          </div>
        </div>

        <DetailVisual card={card} agentType={agentType} pnlFacts={pnlFacts} goldrattFacts={goldrattFacts} accent={accent} />

        {bullets.length > 0 && card.id !== 'actions' && card.id !== 'limitations' && (
          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: CARD }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: TEXT }}>Что это значит</h3>
            <div className="space-y-2 text-sm leading-relaxed" style={{ color: '#334155' }}>
              {bullets.map((bullet) => (
              <div key={bullet} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONES[card.tone].fill }} />
                <span>{bullet}</span>
              </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: TEXT }}>Что делать</h3>
          <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>
            {card.actionText ?? card.support ?? card.value}
          </p>
        </div>
      </div>
    </ModalShell>
  )
}

function makeMarkdownComponents() {
  return {
    h3: ({ children }: { children?: ReactNode }) => (
      <h3 className="mb-2 mt-4 text-base font-semibold" style={{ color: TEXT }}>
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: ReactNode }) => (
      <h4 className="mb-2 mt-3 text-sm font-semibold" style={{ color: TEXT }}>
        {children}
      </h4>
    ),
    p: ({ children }: { children?: ReactNode }) => (
      <p className="mb-2.5 text-[0.95rem] leading-[1.62]" style={{ color: '#334155' }}>
        {children}
      </p>
    ),
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className="mb-3 space-y-2 pl-0">{children}</ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="mb-3 space-y-2 pl-0">{children}</ol>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li className="ml-0 flex gap-2 text-[0.95rem] leading-[1.6]" style={{ color: '#334155' }}>
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#93C5FD' }} />
        <span>{children}</span>
      </li>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div className="report-table my-4 overflow-x-auto rounded-2xl border" style={{ borderColor: BORDER }}>
        <table className="min-w-[720px] w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: ReactNode }) => <thead style={{ background: '#F8FAFC' }}>{children}</thead>,
    th: ({ children }: { children?: ReactNode }) => (
      <th className="border-b px-3.5 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: BORDER, color: TEXT2 }}>
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="border-b px-3.5 py-2.5 align-top text-[0.84rem]" style={{ borderColor: BORDER_SOFT, color: '#334155' }}>
        {children}
      </td>
    ),
    code: ({ children }: { children?: ReactNode }) => (
      <code className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: '#F1F5F9', color: '#1E40AF' }}>
        {children}
      </code>
    ),
    pre: ({ children }: { children?: ReactNode }) => (
      <pre className="my-3 overflow-x-auto rounded-xl p-4 text-xs" style={{ background: '#F8FAFC', border: `1px solid ${BORDER}` }}>
        {children}
      </pre>
    ),
  }
}

function SourceTableBlock({
  source,
  expanded,
  onToggleExpanded,
}: {
  source: ParsedSource | null
  expanded: boolean
  onToggleExpanded: () => void
}) {
  if (!source || source.rows.length === 0) return null

  const visibleRows = expanded ? source.rows : source.rows.slice(0, 12)
  const hasMore = source.rows.length > visibleRows.length
  const warnings = source.metadata['Предупреждения']

  return (
    <section className="mb-4 overflow-hidden rounded-3xl border" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)' }}>
      <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: BORDER_SOFT }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT2 }}>
              Исходные данные
            </p>
            <h2 className="mt-1 text-[0.98rem] font-semibold" style={{ color: TEXT }}>
              Данные, использованные для анализа
            </h2>
          </div>
          {source.metadata['Quality score'] && <StatusPill tone="blue">Оценка качества: {source.metadata['Quality score']}</StatusPill>}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3.5 sm:px-5">
        <div className="grid gap-2 text-xs sm:grid-cols-4">
          {[
            ['Файл', source.metadata['Источник'] ?? 'Источник не записан'],
            ['Лист', source.metadata['Лист'] ?? 'Не указан'],
            ['Строки', source.metadata['Строк'] ?? String(source.rows.length)],
            ['Колонки', source.metadata['Колонок'] ?? 'Не указано'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border px-3 py-2" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
              <p className="font-semibold" style={{ color: TEXT3 }}>{label}</p>
              <p className="mt-1 truncate font-medium" style={{ color: TEXT }}>{value}</p>
            </div>
          ))}
        </div>

        {warnings && warnings !== 'нет' && (
          <div className="rounded-2xl border px-3 py-2 text-xs" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>
            {warnings}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: BORDER }}>
          <table className="min-w-full border-collapse text-xs">
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-50 font-semibold' : undefined}>
                  {row.slice(0, 16).map((cell, cellIndex) => (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className={`max-w-[180px] truncate border-b border-r px-3 py-2${cellIndex === 0 ? ' sticky left-0 z-10' : ''}`}
                      style={{
                        borderColor: BORDER_SOFT,
                        color: TEXT,
                        background: cellIndex === 0 ? (rowIndex === 0 ? '#F8FAFC' : CARD) : undefined,
                      }}
                    >
                      {cell || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(hasMore || expanded) && (
          <button type="button" onClick={onToggleExpanded} className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
            {expanded ? 'Скрыть таблицу' : `Показать больше (${source.rows.length} строк)`}
          </button>
        )}
      </div>
    </section>
  )
}

function FullReportBlock({ report }: { report: string }) {
  const components = makeMarkdownComponents()
  return (
    <section className="rounded-3xl border p-5" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)' }}>
      <div className="mb-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT2 }}>
          Технические детали
        </p>
        <h2 className="mt-1 text-lg font-semibold" style={{ color: TEXT }}>
          Полный текстовый отчёт
        </h2>
      </div>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {sanitizeMarkdownForDisplay(report)}
      </ReactMarkdown>
    </section>
  )
}

export default function ReportDisplay({
  data,
  isDemo = false,
}: {
  data: ReportPageData
  isDemo?: boolean
}) {
  const meta = AGENT_META[data.agentType] ?? AGENT_META.pnl
  const source = useMemo(() => parseSourceText(data.sourceText), [data.sourceText])
  const sections = useMemo(() => splitIntoSections(data.report), [data.report])
  const pnlFacts = useMemo(() => (data.agentType === 'pnl' ? buildPnlFacts(data.report, source, sections) : null), [data.agentType, data.report, sections, source])
  const goldrattFacts = useMemo(() => (data.agentType === 'goldratt' ? buildGoldrattFacts(data.report, sections) : null), [data.agentType, data.report, sections])
  const cards = useMemo(
    () => (data.agentType === 'pnl' && pnlFacts ? buildPnlCards(pnlFacts, source) : buildGoldrattCards(goldrattFacts!)),
    [data.agentType, goldrattFacts, pnlFacts, source],
  )

  const [copiedReport, setCopiedReport] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [showFullReport, setShowFullReport] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [sourceExpanded, setSourceExpanded] = useState(false)

  const modelLabel = isDemo ? 'Демо-отчёт' : data.modelUsed || 'Модель не записана'
  const openCard = cards.find((card) => card.id === openCardId) ?? null

  async function handleCopyReport() {
    await navigator.clipboard.writeText(data.report)
    setCopiedReport(true)
    setTimeout(() => setCopiedReport(false), 2000)
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="min-h-screen print:bg-white" style={{ background: PAGE_BG }}>
      <Header
        data={data}
        modelLabel={modelLabel}
        isDemo={isDemo}
        copiedReport={copiedReport}
        copiedLink={copiedLink}
        onCopyReport={handleCopyReport}
        onCopyLink={handleCopyLink}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8 print:px-0 print:py-4">
        <IntroBlock agentType={data.agentType} />

        <ChipNav
          cards={cards}
          onOpenCard={setOpenCardId}
          showFullReport={showFullReport}
          onToggleFullReport={() => setShowFullReport((value) => !value)}
          showSource={showSource}
          onToggleSource={() => setShowSource((value) => !value)}
          hasSource={Boolean(source) && data.agentType === 'pnl'}
        />

        <DashboardCards
          cards={cards}
          agentType={data.agentType}
          pnlFacts={pnlFacts}
          goldrattFacts={goldrattFacts}
          accent={meta.accent}
          onOpen={setOpenCardId}
        />

        {data.agentType === 'pnl' && showSource && (
          <div className="mt-4">
            <SourceTableBlock source={source} expanded={sourceExpanded} onToggleExpanded={() => setSourceExpanded((value) => !value)} />
          </div>
        )}

        {showFullReport && (
          <div className="mt-4">
            <FullReportBlock report={data.report} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-8 print:hidden">
          <Link href="/analyze" className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
            <ArrowLeft className="h-4 w-4" />
            Новый анализ
          </Link>

          <button onClick={handleCopyReport} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: meta.accent }}>
            {copiedReport ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedReport ? 'Скопировано' : 'Скопировать отчёт'}
          </button>
        </div>
      </div>

      <DetailDrawer
        card={openCard}
        open={Boolean(openCard)}
        onClose={() => setOpenCardId(null)}
        agentType={data.agentType}
        pnlFacts={pnlFacts}
        goldrattFacts={goldrattFacts}
        accent={meta.accent}
      />
    </div>
  )
}
