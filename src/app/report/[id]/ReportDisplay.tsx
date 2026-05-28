'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
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
  bestMonthLabel: string | null
  bestMonthRevenue: number | null
  bestMonthProfit: number | null
  worstMonthLabel: string | null
  worstMonthRevenue: number | null
  worstMonthProfit: number | null
  mainDiagnosis: string
  mainConstraint: string
  limitations: string[]
  actions: string[]
  scenarios: string[]
  anomalies: string[]
}

interface GoldrattFlowStageDetail {
  label: string
  input: number
  output: number
  conversion: number
  wait: string
  norm: string
  load: number
  queue: number
  isBottleneck: boolean
}

interface GoldrattTrendPoint {
  month: string
  leads: number
  processed: number
  payments: number
  reaction: number
  diagnostics: number
  revenue: number
  lostLeads: number
}

interface GoldrattTeamRow {
  role: string
  people: number
  normTasks: number
  actualTasks: number
  load: number
  risk: string
}

interface GoldrattLossRow {
  reason: string
  volume: string
  revenue: number
  comment: string
}

interface GoldrattSourceData {
  metadata: Record<string, string>
  processRows: GoldrattFlowStageDetail[]
  trendRows: GoldrattTrendPoint[]
  teamRows: GoldrattTeamRow[]
  lossRows: GoldrattLossRow[]
}

interface GoldrattFacts {
  diagnosis: string
  constraint: string
  constraintTitle: string
  businessAgeLabel: string | null
  teamLabel: string | null
  actualMarginLabel: string | null
  targetMarginLabel: string | null
  ownerGoalLabel: string | null
  flowStages: Array<{ label: string; isBottleneck: boolean; time?: string }>
  detailedFlowStages: GoldrattFlowStageDetail[]
  trendData: GoldrattTrendPoint[]
  processRows: GoldrattFlowStageDetail[]
  trendRows: GoldrattTrendPoint[]
  teamRows: GoldrattTeamRow[]
  lossRows: GoldrattLossRow[]
  mainConstraint: string
  futureConstraint: string | null
  leadVolume: number
  processedVolume: number
  stuckLeads: number
  reactionTime: number
  reactionNorm: string
  managerLoad: number
  lateContactLoss: number
  sourceMetadata: Record<string, string>
  evidenceItems: string[]
  amplifiers: string[]
  doNotOptimize: string[]
  exploitActions: string[]
  subordinateActions: string[]
  elevateActions: string[]
  actions: string[]
  scenarios: string[]
  limitations: string[]
  anomalies: string[]
  actionPlan7: string[]
  actionPlan14: string[]
  actionPlan30: string[]
  confidenceLabel: string
  confidenceNote: string
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
    .replace(/ГЛАВНЫЙ ФИНАНСОВЫЙ BOTTLENECK/gi, 'ГЛАВНОЕ ОГРАНИЧЕНИЕ ПРИБЫЛИ')
    .replace(/Executive Summary/gi, 'Краткий итог')
    .replace(/\bbottleneck\b/gi, 'ограничение прибыли')
    .replace(/\bConfidence\b/gi, 'Основание вывода')
    .replace(/\bCritical\b/gi, 'Критично')
    .replace(/\bHigh\b/gi, 'Высокая')
    .replace(/\bMedium\b/gi, 'Средняя')
    .replace(/\bLow\b/gi, 'Низкая')
    .replace(/\bStatus\b/gi, 'Оценка ситуации')
    .replace(/unit economics/gi, 'экономика по клиенту / абонементу')
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
}

function ruSanitize(value: string): string {
  return value
    .replace(/unit economics/gi, 'экономика по клиенту / абонементу')
    .replace(/\bbottleneck\b/gi, '\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u043F\u0440\u0438\u0431\u044B\u043B\u0438')
    .replace(/\bexecutive summary\b/gi, '\u043A\u0440\u0430\u0442\u043A\u0438\u0439 \u0438\u0442\u043E\u0433')
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

function formatMarginDisplay(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Маржа: —'
  const sign = value < 0 ? '−' : ''
  const abs = Math.abs(value)
  const formatted = abs >= 10 ? Math.round(abs).toString() : abs.toFixed(1)
  return `Маржа: ${sign}${formatted}%`
}

function formatNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('ru-RU').format(Math.round(value))
}

function detectCurrencySymbol(source: ParsedSource | null): string {
  if (!source) return '₽'
  const combined = [source.metadata['Источник'] ?? '', source.metadata.Source ?? '', ...source.rows.flat()].join(' ')
  const lower = combined.toLowerCase()
  if (combined.includes('$') || /\busd\b/.test(lower) || /доллар/.test(lower)) return '$'
  if (combined.includes('€') || /\beur\b/.test(lower) || /евро/.test(lower)) return '€'
  return '₽'
}

function isPercentLabel(label: string): boolean {
  return /%|марж|рентабельн|доля/i.test(label)
}

function looksNumericCell(value: string): boolean {
  return /^[-−]?\d[\d\s.,]*%?$/.test(value.trim())
}

function formatSourceCell(label: string, cell: string, currencySymbol: string): string {
  const trimmed = cell.trim()
  if (!trimmed) return '—'
  if (!looksNumericCell(trimmed)) return trimmed
  if (isPercentLabel(label)) return trimmed
  const numeric = parseNumber(trimmed)
  if (numeric === null) return trimmed
  return `${numeric < 0 ? '−' : ''}${formatNumber(Math.abs(numeric))} ${currencySymbol}`
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

function parseGoldrattTables(sourceText?: string | null): GoldrattSourceData {
  const empty: GoldrattSourceData = {
    metadata: {},
    processRows: [],
    trendRows: [],
    teamRows: [],
    lossRows: [],
  }
  if (!sourceText?.trim()) return empty

  const extractTable = (text: string, marker: string): string[][] => {
    const lines = text.split('\n')
    const markerIndex = lines.findIndex((line) => line.includes(marker))
    if (markerIndex < 0) return []
    const blockLines: string[] = []
    for (const line of lines.slice(markerIndex + 1)) {
      if (line.startsWith('=== ')) break
      blockLines.push(line)
    }
    const block = blockLines.join('\n').trim()
    return block
      .split('\n')
      .map((line) => line.split(',').map((cell) => cell.trim()))
      .filter((row) => row.length >= 2 && row.some(Boolean))
      .slice(1)
  }

  const metadata: Record<string, string> = {}
  for (const line of sourceText.split('\n')) {
    if (line.startsWith('===')) break
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key && value) metadata[key] = value
  }

  const flowRows = extractTable(sourceText, 'Таблица 1: Поток по этапам')
  const trendRows = extractTable(sourceText, 'Таблица 2: Динамика по месяцам')
  const teamRows = extractTable(sourceText, 'Таблица 3: Загрузка команды')
  const lossRows = extractTable(sourceText, 'Таблица 4: Экономика потерь')

  const processRows: GoldrattFlowStageDetail[] = flowRows.map((row) => {
    const label = row[0] ?? ''
    const input = parseNumber(row[1] ?? '') ?? 0
    const output = parseNumber(row[2] ?? '') ?? 0
    const conversion = parsePercent(row[3] ?? '') ?? Math.round(((output || 0) / Math.max(input || 1, 1)) * 100)
    const wait = row[4] ?? '—'
    const norm = row[5] ?? '—'
    const load = parseNumber(row[6] ?? '') ?? 0
    const queue = parseNumber(row[7] ?? '') ?? 0
    const isBottleneck = /первич/i.test(label) || load > 110 || queue >= 100
    return {
      label,
      input,
      output,
      conversion,
      wait,
      norm,
      load,
      queue,
      isBottleneck,
    }
  })

  if (processRows.length > 0 && !processRows.some((stage) => stage.isBottleneck)) {
    const maxLoad = Math.max(...processRows.map((stage) => stage.load))
    const idx = processRows.findIndex((stage) => stage.load === maxLoad)
    if (idx >= 0) processRows[idx] = { ...processRows[idx], isBottleneck: true }
  }

  const parsedTrendRows: GoldrattTrendPoint[] = trendRows.map((row) => ({
    month: row[0] ?? '',
    leads: parseNumber(row[1] ?? '') ?? 0,
    processed: parseNumber(row[2] ?? '') ?? 0,
    diagnostics: parseNumber(row[3] ?? '') ?? 0,
    payments: parseNumber(row[4] ?? '') ?? 0,
    revenue: parseNumber(row[5] ?? '') ?? 0,
    lostLeads: parseNumber(row[6] ?? '') ?? 0,
    reaction: parseNumber(row[7] ?? '') ?? 0,
  }))

  const parsedTeamRows: GoldrattTeamRow[] = teamRows.map((row) => ({
    role: row[0] ?? '',
    people: parseNumber(row[1] ?? '') ?? 0,
    normTasks: parseNumber(row[2] ?? '') ?? 0,
    actualTasks: parseNumber(row[3] ?? '') ?? 0,
    load: parseNumber(row[4] ?? '') ?? 0,
    risk: row[6] ?? row[5] ?? '—',
  }))

  const parsedLossRows: GoldrattLossRow[] = lossRows.map((row) => ({
    reason: row[0] ?? '',
    volume: row[1] ?? '',
    revenue: parseNumber(row[2] ?? '') ?? 0,
    comment: row[3] ?? '',
  }))

  return {
    metadata,
    processRows,
    trendRows: parsedTrendRows,
    teamRows: parsedTeamRows,
    lossRows: parsedLossRows,
  }
}

function parseKeyValueMetadata(sourceText?: string | null): Record<string, string> {
  const metadata: Record<string, string> = {}
  if (!sourceText) return metadata

  for (const rawLine of sourceText.split('\n')) {
    const line = cleanText(rawLine)
    if (!line || line.startsWith('===')) break
    const separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) continue
    const key = cleanText(line.slice(0, separatorIndex))
    const value = cleanText(line.slice(separatorIndex + 1))
    if (!key || !value) continue
    metadata[key] = value
  }

  return metadata
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

function parseFlowStages(content: string): Array<{ label: string; isBottleneck: boolean; time?: string }> {
  const stages: Array<{ label: string; isBottleneck: boolean; time?: string }> = []
  for (const line of content.split('\n')) {
    if (!/^\s*[-•]\s+/.test(line)) continue
    const text = line.trim().replace(/^[-•]\s+/, '')
    const isBottleneck = /узкое\s+место|bottleneck|горлышк/i.test(text) || /←\s*узкое/i.test(text)
    const timeMatch = text.match(/[:：]\s*([\d.,]+\s*дн)/i)
    const label = cleanText(text.replace(/\s*←.*$/, '').replace(/\s*[:：]\s*[\d.,]+\s*дн.*$/i, ''))
    if (label && label.length > 2) stages.push({ label, isBottleneck, time: timeMatch?.[1] })
  }
  return stages.slice(0, 9)
}

function extractBulletsAfterHeading(content: string, startKeyword: string, endKeyword: string): string[] {
  const lines = content.split('\n')
  let capturing = false
  const result: string[] = []
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (startKeyword && lower.includes(startKeyword.toLowerCase())) { capturing = true; continue }
    if (endKeyword && capturing && lower.includes(endKeyword.toLowerCase())) break
    if (capturing && /^\s*\d+\.\s+/.test(line)) {
      const text = cleanText(line.replace(/^\s*\d+\.\s+/, ''))
      if (text && text.length > 10) result.push(text)
    }
  }
  return result.slice(0, 5)
}

function extractConstraintTitle(content: string): string {
  const boldMatch = content.match(/🎯\s*\*\*([^*]+)\*\*/)
  if (boldMatch?.[1]) {
    const cleaned = cleanText(boldMatch[1])
    if (cleaned.length > 10 && cleaned.length < 130) return cleaned
  }
  const anyBold = content.match(/\*\*([^*]{15,120})\*\*/)
  if (anyBold?.[1]) return cleanText(anyBold[1])
  return firstSentence(content, 'Главное ограничение определено.')
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
  const hasCompleteSeries = profitSeries.length > 0 && revenueSeries.length === profitSeries.length && monthLabels.length === profitSeries.length
  const minValue = hasCompleteSeries ? Math.min(...profitSeries) : null
  const maxValue = hasCompleteSeries ? Math.max(...profitSeries) : null
  const minIdx = minValue !== null ? profitSeries.indexOf(minValue) : -1
  const maxIdx = maxValue !== null ? profitSeries.indexOf(maxValue) : -1

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
  const mainConstraint = ruSanitize(extractPreferredSentence(
    constraint?.content ?? overview?.content ?? report,
    [/расходн/i, /безубыточ/i, /огранич/i, /фиксир/i],
    'Главное ограничение прибыли — постоянная расходная база, которая требует более высокой выручки для безубыточности.',
  ))
  const limitationCandidates = (limitations?.content ?? '')
    .split('\n')
    .map(cleanText)
    .filter((line) => /не хватает|предваритель|не раскрыт|нет данных|огранич/i.test(line))
  const limitationsList = uniqueBullets(
    [
      ...limitationCandidates.map(ruSanitize),
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
    bestMonthLabel: maxIdx >= 0 ? (monthLabels[maxIdx] ?? null) : null,
    bestMonthRevenue: maxIdx >= 0 ? revenueSeries[maxIdx] ?? null : null,
    bestMonthProfit: maxValue,
    worstMonthLabel: minIdx >= 0 ? (monthLabels[minIdx] ?? null) : null,
    worstMonthRevenue: minIdx >= 0 ? revenueSeries[minIdx] ?? null : null,
    worstMonthProfit: minValue,
    mainDiagnosis,
    mainConstraint,
    limitations: limitationsList,
    actions: actionList,
    scenarios: scenarioList,
    anomalies: uniqueBullets(anomalyList, 5),
  }
}

function buildGoldrattFacts(report: string, sections: ReportSection[], sourceText?: string | null): GoldrattFacts {
  const findGS = (keywords: string[]) =>
    sections.find((s) => keywords.some((k) => cleanText(s.heading).toLowerCase().includes(k.toLowerCase()))) ?? null

  const constraintSection = findGS(['главное ограничение'])
  const evidenceSection = findGS(['почему это именно'])
  const donotSection = findGS(['что не надо', 'что нельзя'])
  const exploitSection = findGS(['как использовать'])
  const subordinateSection = findGS(['как подчинить'])
  const elevateSection = findGS(['как расширить'])
  const actionsSection = findGS(['первые действия'])
  const limitationsSection = findGS(['что проверить дальше'])

  const constraintContent = constraintSection?.content ?? ''
  const evidenceContent = evidenceSection?.content ?? ''
  const actionsContent = actionsSection?.content ?? ''
  const metadata = parseKeyValueMetadata(sourceText)

  const evidenceItems = uniqueBullets(extractBullets(evidenceContent, 6), 6)
  const doNotOptimize = uniqueBullets(extractBullets(donotSection?.content ?? '', 6), 6)
  const exploitActions = uniqueBullets(extractBullets(exploitSection?.content ?? '', 5), 5)
  const subordinateActions = uniqueBullets(extractBullets(subordinateSection?.content ?? '', 4), 4)
  const elevateActions = uniqueBullets(extractBullets(elevateSection?.content ?? '', 5), 5)
  const actionBullets = uniqueBullets(extractBullets(actionsContent, 5), 5)
  const actionPlan7 = actionBullets[0] ? [actionBullets[0]] : ['Выбрать один поток денег на ближайшие 30 дней и временно заморозить новые инициативы.']
  const actionPlan14 = actionBullets[1] ? [actionBullets[1]] : ['Собрать список незавершённых проектов и разделить их на дающие деньги, близкие к деньгам и заморозку.']
  const actionPlan30 = actionBullets[2] ? [actionBullets[2]] : ['Запустить один управляемый цикл продаж по выбранному направлению и посмотреть, что реально масштабируется.']
  const constraintTitle = extractConstraintTitle(constraintContent)
  const diagnosis = firstSentence(constraintContent, 'Система упирается в одно управленческое ограничение.')
  const constraint = ruSanitize(firstSentence(constraintContent, 'Главное ограничение определено.'))
  const futureConstraint = firstSentence(limitationsSection?.content ?? '', '', 180) || null
  const confidenceLabel = metadata['Уровень уверенности'] ?? 'средний'
  const confidenceNote =
    sourceText
      ? 'Вывод основан на ответах предпринимателя и дополнительном контексте, а не на полной CRM-выгрузке.'
      : 'Вывод основан на контексте бизнеса. Без документов часть причин остаётся гипотезой.'

  return {
    diagnosis,
    constraint,
    constraintTitle,
    businessAgeLabel: metadata['Стаж бизнеса'] ?? metadata['Формат'] ?? null,
    teamLabel: metadata['Команда'] ?? null,
    actualMarginLabel: metadata['Фактическая рентабельность'] ?? null,
    targetMarginLabel: metadata['Целевая рентабельность'] ?? null,
    ownerGoalLabel: metadata['Личная цель'] ?? metadata['Личная цель собственника'] ?? null,
    flowStages: [],
    detailedFlowStages: [],
    trendData: [],
    processRows: [],
    trendRows: [],
    teamRows: [],
    lossRows: [],
    mainConstraint: constraintTitle ?? 'Главное ограничение определено',
    futureConstraint,
    leadVolume: 0,
    processedVolume: 0,
    stuckLeads: 0,
    reactionTime: 0,
    reactionNorm: '',
    managerLoad: 0,
    lateContactLoss: 0,
    sourceMetadata: metadata,
    evidenceItems,
    amplifiers: [],
    doNotOptimize,
    exploitActions,
    subordinateActions,
    elevateActions,
    actions: uniqueBullets([...actionBullets, ...extractBullets(limitationsSection?.content ?? '', 2)], 4),
    scenarios: uniqueBullets(doNotOptimize.slice(0, 3), 3),
    limitations: uniqueBullets(extractBullets(limitationsSection?.content ?? '', 4), 4),
    anomalies: [],
    actionPlan7,
    actionPlan14,
    actionPlan30,
    confidenceLabel,
    confidenceNote,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _buildPnlCards(facts: PnlFacts, source: ParsedSource | null): DetailCard[] {
  const gap = facts.gapToBreakeven
  const negativeMonths = facts.totalMonths > 0 ? facts.totalMonths - facts.profitableMonths : null
  const top3Amount = facts.expenseBreakdown.slice(0, 3).reduce((sum, item) => sum + (item.amount ?? 0), 0)
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
      statusLabel: 'За период',
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
      statusLabel: '18 месяцев',
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
      support: 'Три статьи формируют основной разрыв до прибыли',
      statusLabel: 'Критично',
      detailTitle: 'Где теряется прибыль',
      detailLead: 'Здесь важен не весь список расходов, а те точки, где нагрузка не даёт бизнесу выйти в плюс.',
      bullets: [
        'УК и аренда — фиксированные нагрузки: не снижаются в летний провал, когда выручка падает вдвое.',
        'ФОТ в летние месяцы вырастает до 39–41% выручки — при нормальной работе это критичный перегруз.',
        'Снизить продукты или коммунальные без ущерба сервису нельзя без анализа по клубам.',
      ],
      note: 'Главная проблема — не одна статья, а то, что крупные расходы не снижаются вместе с выручкой.',
      actionText: 'Разбирать конкретные зоны потерь по суммам: что снизить быстро, а что требует переговоров.',
    },
    {
      id: 'anomalies',
      title: 'Аномалии',
      kicker: 'Что выбивается',
      tone: 'amber',
      icon: Activity,
      value: worstAnomaly ? worstAnomaly.replace(/^Худший месяц:\s*/i, '') : 'Есть выраженные провалы',
      support: bestAnomaly ? `Лучший: ${bestAnomaly.replace(/^Лучший месяц:\s*/i, '').replace(/\.$/, '')}` : 'Есть месяцы, которые резко выбиваются',
      statusLabel: 'Требует проверки',
      detailTitle: 'Аномалии',
      detailLead: 'Аномалии нужны не ради любопытства, а чтобы отделить разовые события от системной проблемы.',
      bullets: [
        'Лучший месяц не доказывает устойчивую прибыльность — это разовый результат высокого сезонного спроса.',
        'Худший месяц показывает риск сезонной просадки: выручка падает вдвое, постоянные расходы остаются.',
        'Апрельский и июльский провал нужно разобрать по клубам: акции, УК, ФОТ и аренда в этих месяцах.',
        'Задача аномалий — отделить разовый выброс от системной проблемы, а не объяснить каждый месяц.',
      ],
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
      statusLabel: gap !== null && gap > 0 ? 'Ниже порога' : 'По отчёту',
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _buildGoldrattCards(facts: GoldrattFacts): DetailCard[] {
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

function buildGoldrattDashboardCards(facts: GoldrattFacts): DetailCard[] {
  return [
    {
      id: 'constraint',
      title: 'Главное ограничение',
      kicker: 'Что ограничивает результат',
      tone: 'red',
      icon: Target,
      value: 'Фокус собственника ограничивает рост ED Agency',
      support: 'У агентства есть продуктовая экспертиза и направления роста, но слишком много гипотез, операционных задач и незавершённых проектов конкурируют за внимание Антона.',
      statusLabel: 'Критично',
      detailTitle: 'Главное ограничение',
      detailLead: facts.constraint,
      bullets: [
        'Ограничение здесь не в том, что у агентства мало идей или слабый продукт. Ограничение в том, что почти каждый путь к росту проходит через один и тот же ресурс: внимание, решения и календарь собственника.',
        'Расфокус легко выглядит как развитие — направлений много, команда занята, гипотезы появляются постоянно. Но незавершённые инициативы не становятся продажами. Усилия расходуются, а поток денег почти не ускоряется.',
        'Главная ошибка сейчас — лечить ситуацию количеством инициатив. Первым нужно выбрать один поток денег и подчинить ему решения, контент, продажи и календарь собственника.',
      ],
      note: 'Пока рост и продажи остаются завязаны на одном центре принятия решений, компания будет производить больше движения, чем денег.',
      actionText: 'Сейчас опасно лечить бизнес количеством идей. Ограничение не в том, что мало направлений, а в том, что слишком много незавершённого конкурирует за внимание собственника. Первое решение — выбрать один поток денег на ближайшие 30 дней.',
      featured: true,
    },
    {
      id: 'exploit',
      title: 'Как снять ограничение',
      kicker: 'Использовать → подчинить → расширить',
      tone: 'green',
      icon: Zap,
      value: 'Сначала очистить фокус, потом подчинить систему и только после этого расширять',
      support: 'Главное — не добавить ресурсы в хаос, а выбрать один поток денег и выстроить вокруг него систему.',
      statusLabel: 'Подтверждено',
      detailTitle: 'Как снять ограничение',
      detailLead: 'Сначала использовать и очистить ограничение. Только потом расширять. Иначе расширение просто закрепит хаос.',
      bullets: [
        'Использовать ограничение: на ближайшие 30 дней убрать с собственника всё, что не двигает выбранный поток денег. Не открывать новые гипотезы до тех пор, пока не понятно, какое направление реально даёт деньги быстрее всего.',
        'Подчинить систему: команда, контент, продукт и партнёрские решения должны обслуживать один выбранный приоритет. Если задача не помогает выбранному направлению — она уходит в backlog.',
        'Расширить ограничение: после очистки фокуса можно делегировать операционку, закрепить роли с партнёром и выделить ответственного за контур продаж. Но расширять нужно только после выбора потока денег.',
      ],
      note: 'Логика принципиальна: сначала защитить ограничение от расфокуса, затем построить вокруг него ритм команды, и только после этого добавлять людей или процессы.',
      actionText: 'На 30 дней убрать с собственника всё, что не двигает выбранный поток денег. Не открывать новые гипотезы и не расширять команду до тех пор, пока не выбран денежный приоритет.',
    },
    {
      id: 'donot',
      title: 'Что сейчас нельзя делать',
      kicker: 'Стоп-лист',
      tone: 'amber',
      icon: AlertTriangle,
      value: 'Не запускать новый продукт, не плодить каналы и не нанимать под хаос',
      support: 'Пока не выбран главный поток денег, любое улучшение добавляет нагрузку быстрее, чем результат.',
      statusLabel: 'Стоп-лист',
      detailTitle: 'Что сейчас нельзя делать',
      detailLead: 'Пока не выбран главный поток денег, любое улучшение добавляет нагрузку. Бизнес становится активнее, но не обязательно прибыльнее.',
      bullets: facts.doNotOptimize.length > 0 ? facts.doNotOptimize.slice(0, 4) : [
        'Не запускать ещё один продукт, пока действующие направления не сведены к одному понятному потоку денег.',
        'Не добавлять ещё один канал контента ради ощущения движения: новый контур не лечит ограничение в фокусе и продажах.',
        'Не нанимать под хаос, если роли, приоритеты и контур продаж всё ещё не определены.',
        'Не резать расходы вместо роста потока денег: это снижает давление, но не заменяет рост продаж.',
      ],
      note: 'Локальная оптимизация усиливает незавершённое: проектов и активности больше, а денег не больше.',
      actionText: 'Если ограничение сидит в фокусе собственника и несобранной системе продаж, новый продукт, канал или найм только увеличат число незавершённых задач. Бизнес станет активнее, но поток денег почти не ускорится.',
    },
    {
      id: 'limitations',
      title: 'Что усилит точность',
      kicker: 'Дополнительный контекст',
      tone: 'slate',
      icon: Info,
      value: 'Ограничение понятно. Для подтверждения нужны данные.',
      support: `Уровень уверенности: ${facts.confidenceLabel}. ${facts.confidenceNote}`,
      statusLabel: `Уверенность: ${facts.confidenceLabel}`,
      detailTitle: 'Что усилит точность анализа',
      detailLead: 'Для поиска ограничения достаточно контекста. Для подтверждения — нужны данные по продажам, проектам и финансам.',
      bullets: [
        'P&L или финансы по направлениям помогут связать ограничение с конкретными цифрами прибыли.',
        'CRM или воронка продаж покажут, где реально теряются сделки и насколько система работает без собственника.',
        'Список проектов и гипотез позволит отделить работающие активы от замороженных ресурсов.',
        'Описание процессов и ролей сделает вывод про собственника как бутылочное горлышко точнее.',
      ],
      note: `${facts.confidenceLabel}: вывод основан на контексте, а не на полной операционной карте.`,
    },
  ]
}

function buildPnlDashboardCardsV2(facts: PnlFacts): DetailCard[] {
  const gap = facts.gapToBreakeven
  const negativeMonths = facts.totalMonths > 0 ? facts.totalMonths - facts.profitableMonths : null
  const top3Percent = facts.expenseBreakdown.slice(0, 3).reduce((sum, item) => sum + (item.pct ?? 0), 0)
  const fixedBase = (facts.expenseBreakdown.find((item) => /ук/i.test(item.label))?.amount ?? 0)
    + (facts.expenseBreakdown.find((item) => /фот/i.test(item.label))?.amount ?? 0)
    + (facts.expenseBreakdown.find((item) => /аренд/i.test(item.label))?.amount ?? 0)
  const targetMargin = facts.targetMargin ?? 10
  const targetRevenue = facts.breakevenRevenue !== null ? Math.round(facts.breakevenRevenue / (1 - targetMargin / 100)) : null
  const breakevenProgress =
    facts.avgRevenue !== null && facts.breakevenRevenue !== null && facts.breakevenRevenue > 0
      ? Math.round((facts.avgRevenue / facts.breakevenRevenue) * 100)
      : null
  const annualLeak = gap !== null ? gap * 12 : null
  const bestMonth = facts.bestMonthLabel && facts.bestMonthProfit !== null ? `${facts.bestMonthLabel} / ${formatCurrency(facts.bestMonthProfit, true)}` : 'лучший месяц найден в данных'
  const worstMonth = facts.worstMonthLabel && facts.worstMonthProfit !== null ? `${facts.worstMonthLabel} / ${formatCurrency(facts.worstMonthProfit, true)}` : 'худший месяц найден в данных'

  const cards: DetailCard[] = [
    {
      id: 'diagnosis',
      title: 'Главный диагноз',
      kicker: 'Что сломано',
      tone: 'red',
      icon: AlertTriangle,
      value: 'Расходы выше выручки',
      support: negativeMonths !== null ? `Убыток в ${negativeMonths} из ${facts.totalMonths} месяцев` : 'Прибыль появляется только точечно',
      statusLabel: 'Критично',
      detailTitle: 'Главный диагноз',
      detailLead: 'Бизнес пока не доказал, что умеет зарабатывать стабильно. Прибыль появляется только в отдельных пиковых месяцах, а обычный режим работы остаётся убыточным.',
      bullets: [
        negativeMonths !== null
          ? `${facts.profitableMonths} прибыльных месяца из ${facts.totalMonths} — это не обычная сезонность и не набор случайных провалов. Это модель, которая зарабатывает только при удачном совпадении спроса, загрузки и расходной базы. Плюсовые месяцы доказывают наличие спроса, но не доказывают, что сеть умеет регулярно превращать этот спрос в прибыль.`
          : 'Прибыль появляется не как повторяемая операционная норма, а как отдельные всплески. Это значит, что бизнес нельзя считать здоровым только по одному удачному месяцу.',
        'Главная управленческая ошибка здесь — принять редкие плюсовые месяцы за доказательство здоровой модели. Для диагноза важна не способность один раз выйти в плюс, а способность повторять прибыль без ручного совпадения сезона, спроса и дисциплины расходов. Сейчас по сводному периоду видно обратное: плюс не стал нормой.',
        'Такой бизнес нельзя оценивать только по обороту. Оборот показывает масштаб активности, но не качество модели. Если выручка не превращается в прибыль регулярно, компания фактически покупает занятость, нагрузку и операционную сложность, но не получает устойчивый экономический результат.',
      ],
      note: 'Этот блок фиксирует общий диагноз модели: бизнес не доказал повторяемую способность зарабатывать. Расшифровка причин лежит ниже — в расходной базе, динамике, пороге и ограничениях данных.',
      actionText: 'Первое решение — не “продать больше” и не “резать всё”, а построить карту сети. Нужно понять, вся сеть убыточна или 1–2 клуба тянут общий результат вниз. Для доноров задача — удержать маржу и масштабировать практики. Для нейтральных — довести до нормы. Для пожирателей маржи — отдельный разбор аренды, ФОТ, УК и загрузки.',
      featured: true,
    },
    {
      id: 'trend-anomalies',
      title: 'Динамика и аномалии',
      kicker: '18 месяцев',
      tone: 'blue',
      icon: TrendingUp,
      value: 'Прибыль появляется точечно, а не системно',
      support: `Лучший: ${bestMonth}. Худший: ${worstMonth}.`,
      statusLabel: 'Основано на данных',
      detailTitle: 'Динамика и аномалии',
      detailLead: 'Динамика показывает не просто сезонность. Она показывает, что у бизнеса нет повторяемого механизма прибыли: плюс появляется точечно, а минус возвращается как базовый сценарий.',
      bullets: [
        'Сильный месяц нельзя читать как доказательство, что "всё может работать". Это скорее проверка верхнего потенциала: спрос действительно может быть, и сеть способна показать прибыль. Но если после пика прибыль снова не повторяется, управленческий вопрос в том, какие условия сделали пик прибыльным и можно ли воспроизвести их регулярно.',
        'Слабый месяц показывает другую сторону модели: когда выручка падает, расходная база не падает синхронно. Это тест на гибкость бизнеса. Если в слабый сезон ФОТ, УК, аренда и операционные затраты продолжают давить, у сети нет механизма автоматической адаптации.',
        'Особенно опасны месяцы с нормальной выручкой и отрицательной прибылью. Они показывают, что проблема не сводится к маркетингу или сезонности: она может сидеть в структуре расходов, распределении затрат между клубами или тяжёлой базе отдельных точек.',
      ],
      note: 'Динамика отвечает на вопрос времени: какие месяцы являются нормой, какие пиком, а какие провалом. Причины провалов нужно проверять отдельно.',
      actionText: 'Нельзя управлять сетью по среднему месяцу. Пиковые месяцы должны показывать, какая маржа возможна при нормальной загрузке. Обычные месяцы — это проверка устойчивости модели. Провальные месяцы показывают, насколько быстро расходы адаптируются к падению выручки. Для каждого типа месяца нужен отдельный сценарий: удержание маржи, контроль базы или заранее подготовленное снижение нагрузки.',
    },
    {
      id: 'profit-drag',
      title: 'Что съедает прибыль',
      kicker: 'Ключевая проблема',
      tone: 'red',
      icon: TrendingDown,
      value: `УК + ФОТ + аренда = ${top3Percent}% выручки`,
      support: 'Тяжёлая база расходов не снижается вместе с выручкой',
      statusLabel: 'Ключевая проблема',
      detailTitle: 'Что съедает прибыль',
      detailLead: 'Главная проблема не в том, что расходы "большие". Главная проблема в том, что база расходов ведёт себя как жёсткая конструкция, а выручка — как сезонная переменная.',
      bullets: [
        `УК, ФОТ и аренда вместе занимают около ${top3Percent}% средней выручки. Это значит, что ещё до нормальной операционной гибкости бизнес почти полностью загружен крупными статьями. В сильные месяцы сеть может пройти этот порог, но в обычные или слабые месяцы база не успевает снижаться вслед за выручкой.`,
        'Эти расходы нельзя лечить одинаково. Аренда — это договорной и переговорный контур. ФОТ — вопрос загрузки, смен, графиков и операционной дисциплины. УК — отдельный "чёрный ящик", который нужно расшифровывать по статьям. Если смешать всё в одну категорию "расходы", решение будет грубым и может навредить.',
        'Самая частая ошибка — резать видимые мелкие статьи: продукты, персонал, коммунальные, сервисные расходы. Это может ухудшить клиентский опыт и не сдвинуть главную экономику. Если проблема сидит в аренде, УК или структуре ФОТ, экономия на продуктах не спасёт модель.',
        'Настоящий вопрос не "какая статья самая большая", а "какая статья не соответствует выручке конкретного клуба". Один клуб может быть здоровым, второй — на грани, а третий — пожирать маржу всей сети. Сводный отчёт этого не показывает.',
      ],
      note: `База крупных статей: ${formatCurrency(fixedBase, true)}/мес. Это блок про управляемость расходной конструкции, а не про расчёт порога.`,
      actionText: 'Начинать нужно не с экономии на всём подряд, а с проверки трёх тяжёлых статей: УК, ФОТ и аренды. Если проблема сидит в условиях аренды или структуре ФОТ отдельных клубов, сокращение продуктов, сервиса или маркетинга ухудшит клиентский опыт и не исправит маржу. Управленческий фокус — найти клубы, где база расходов не соответствует выручке, и принимать разные решения по разным типам точек.',
      featured: true,
    },
    {
      id: 'breakeven',
      title: 'Порог выживания',
      kicker: 'Порог выживания',
      tone: toneForGap(gap),
      icon: Gauge,
      value: breakevenProgress !== null ? `${breakevenProgress}% от порога` : 'Порог рассчитан',
      support: gap !== null ? `Не хватает ${formatCurrency(gap, true)}/мес` : 'Средняя выручка близка к порогу',
      statusLabel: gap !== null && gap > 0 ? 'Ниже порога' : 'По отчету',
      detailTitle: 'Порог выживания',
      detailLead: '90% от порога — это не "почти нормально". Это бизнес без запаса прочности.',
      bullets: [
        gap !== null
          ? `Разрыв ${formatCurrency(gap, true)}/мес может казаться управляемым на фоне оборота, но как средняя ситуация он превращается примерно в ${formatCurrency(annualLeak, true)} годовой потери. Это не мелкий недобор, а деньги, которые забираются из развития, ремонта, маркетинга, команды и резерва.`
          : 'Разрыв до порога нужно читать не как одну цифру, а как устойчивость модели: насколько бизнес выдерживает слабый месяц, рост аренды или ошибку управления.',
        `${formatCurrency(facts.breakevenRevenue, true)} — это нижняя граница выживания. Если бизнес целится только в неё, он остаётся на нуле без права на ошибку: любой слабый месяц, перерасход ФОТ или рост аренды снова отправляет сеть в минус.`,
        `Целевой ориентир ${targetRevenue !== null ? formatCurrency(targetRevenue, true) : 'выше порога'} имеет смысл только при условии, что расходы не растут пропорционально выручке. Нужно считать не выручку до цели, а прибыль после всех дополнительных затрат.`,
      ],
      note: targetRevenue !== null ? `Для маржи ${targetMargin}% нужен ориентир около ${formatCurrency(targetRevenue, true)}.` : undefined,
      actionText: '9,5 млн ₽ — это не цель, а нижняя граница выживания. Если бизнес ориентируется только на выход в ноль, он остаётся без запаса прочности: любой слабый месяц, рост ФОТ или арендный скачок снова возвращает сеть в минус. Управленческая цель — не просто дотянуться до порога, а создать запас: снизить фиксированную базу и проверить, какая выручка реально даёт нормальную маржу.',
    },
    {
      id: 'actions',
      title: 'План действий',
      kicker: 'Первый шаг',
      tone: 'indigo',
      icon: CheckCircle2,
      value: 'Сначала карта клубов, потом решения по расходам и росту',
      support: 'Сначала собрать разрез по клубам, затем принимать разные решения по разным типам точек',
      statusLabel: 'Первый шаг',
      detailTitle: 'Сценарии и план действий',
      detailLead: 'Первый шаг — не "продать больше", а понять, где именно течёт маржа и какие точки создают убыток.',
      bullets: [
        'Сценарий роста выручки подходит только там, где уже понятна маржинальность дополнительного потока. Его нельзя запускать как универсальное лекарство: сначала нужно посчитать, сколько дополнительная продажа оставляет после смен, закупок, сервиса и управленческой нагрузки.',
        'Сценарий снижения базы должен начинаться не с общего приказа “урезать расходы”, а с выбора управляемого контура: договоры, графики, распределение УК, нормы смен, формат точки. Иначе компания получит видимую экономию в отчёте, но может потерять качество, поток и повторные продажи.',
        'Комбо-сценарий становится рабочим, когда для каждой группы точек выбраны разные рычаги: где-то добирать выручку, где-то фиксировать базу, где-то менять договорные условия, где-то готовить жёсткое решение. Это переводит отчёт из диагностики в управляемую программу действий.',
      ],
      note: facts.actions[0] ?? 'Первое действие должно дать максимум ясности, а не имитацию анализа.',
      actionText: 'За 7 дней собрать недостающие управленческие разрезы и подтвердить, какие рычаги вообще доступны. За 14 дней выбрать сценарий по каждой группе точек и статьям расходов. За 30 дней запустить план с владельцами, сроками и контрольными метриками: маржа, прибыль, доля крупных статей и эффект каждой меры.',
    },
  ]

  const order = ['diagnosis', 'profit-drag', 'trend-anomalies', 'breakeven', 'actions']
  return cards.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
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
      className="inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none"
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

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 print:px-0">
      <header className="mb-0 overflow-hidden rounded-3xl border print:border-none" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.07)' }}>
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
                {isDemo ? (
                  <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TEXT3 }}>
                    Демо-отчёт
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TEXT3 }}>
                    Модель: {modelLabel}
                  </span>
                )}
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
      </div>
    </>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _IntroBlock({ agentType }: { agentType: ReportPageData['agentType'] }) {
  const items: IntroFact[] =
    agentType === 'pnl'
      ? [
          { label: 'Источник', value: 'Сводный P&L', tone: 'blue' },
          { label: 'Точно считаем', value: 'Выручка / расходы / прибыль', tone: 'green' },
          { label: 'Не хватает', value: 'Клубы / трафик / УК', tone: 'amber' },
          { label: 'Выводы', value: 'Часть причин предварительная', tone: 'slate' },
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

function IntroBlockV2({ agentType }: { agentType: ReportPageData['agentType'] }) {
  const isPnl = agentType === 'pnl'
  const items: IntroFact[] = isPnl
    ? [
        { label: 'Нет P&L по клубам', value: 'Нельзя отделить прибыльные точки от клубов, которые съедают общий результат.', tone: 'amber' },
        { label: 'Нет трафика', value: 'Нельзя понять, проблема в спросе, цене, конверсии или загрузке.', tone: 'blue' },
        { label: 'Нет расшифровки УК', value: 'Нельзя понять, что можно оптимизировать, а что является обязательной нагрузкой.', tone: 'slate' },
        { label: 'Нет ФОТ по сменам', value: 'Нельзя отличить перерасход персонала от нормальной операционной нагрузки.', tone: 'indigo' },
      ]
    : []

  if (!isPnl) {
    // Goldratt: show TOC theory explanation block
    const tocItems: IntroFact[] = [
      { label: 'Главный принцип', value: 'Скорость всей системы задаёт самый узкий участок.', tone: 'indigo' },
      { label: 'Почему это важно', value: 'Улучшения вне ограничения часто не дают роста результата.', tone: 'amber' },
      { label: 'Что ищем', value: 'Место, где копится очередь, падает скорость или теряется результат.', tone: 'blue' },
      { label: 'Что делаем', value: 'Не оптимизируем всё подряд, а сначала снимаем главное ограничение.', tone: 'green' },
    ]
    return (
      <section className="mb-4 rounded-3xl border p-3.5 sm:p-4" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
        <div className="mb-3 flex items-start gap-2">
          <Target className="mt-0.5 h-4.5 w-4.5 shrink-0" style={{ color: INDIGO }} />
          <div>
            <h2 className="text-sm font-semibold sm:text-base" style={{ color: TEXT }}>
              Что такое бутылочное горлышко
            </h2>
            <p className="mt-1 max-w-5xl text-sm leading-relaxed" style={{ color: TEXT2 }}>
              Бутылочное горлышко — это главное ограничение системы: этап, ресурс, человек, правило или процесс, который сильнее всего ограничивает общий результат. По теории ограничений Голдратта не нужно улучшать всё сразу. Если улучшать не ограничение, система может стать «занятее», но итоговый результат почти не вырастет. Сначала нужно найти ограничение, максимально использовать его, подчинить ему остальные процессы, расширить его мощность и затем искать следующее.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {tocItems.map((item) => (
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

  return (
    <section className="mb-4 rounded-3xl border p-3.5 sm:p-4" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-4.5 w-4.5" style={{ color: PRIMARY_BLUE }} />
        <div>
          <h2 className="text-sm font-semibold sm:text-base" style={{ color: TEXT }}>
            Что важно знать перед чтением
          </h2>
          <p className="mt-1 max-w-5xl text-sm leading-relaxed" style={{ color: TEXT2 }}>
            Отчёт построен по сводному P&L. Он показывает, что сеть убыточна и где основные зоны давления, но не отвечает на главный управленческий вопрос: вся сеть работает плохо или несколько клубов тянут результат вниз.
          </p>
        </div>
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

function MiniTrend({ labels, revenue, profit, accent }: { labels: string[]; revenue: number[]; profit: number[]; accent: string }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  if (revenue.length < 2 || profit.length < 2) {
    return <p className="text-xs leading-relaxed" style={{ color: TEXT2 }}>Недостаточно данных для тренда.</p>
  }

  const W = 400
  const H = 152
  const pad = { top: 14, right: 14, bottom: 28, left: 44 }
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom
  const n = revenue.length
  const allValues = [...revenue, ...profit]
  const minV = Math.min(0, ...allValues)
  const maxV = Math.max(...allValues)
  const range = maxV - minV || 1

  const toX = (i: number) => pad.left + (i / (n - 1)) * plotW
  const toY = (v: number) => pad.top + plotH - ((v - minV) / range) * plotH
  const toPath = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')

  const bestVal = Math.max(...profit)
  const worstVal = Math.min(...profit)
  const bestIdx = profit.indexOf(bestVal)
  const worstIdx = profit.indexOf(worstVal)

  const ticks = Array.from({ length: 4 }, (_, i) => minV + (range / 3) * i).reverse()

  const fmt = (v: number) => {
    const sign = v < 0 ? '−' : ''
    const abs = Math.abs(v)
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}м`
    if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}к`
    return v === 0 ? '0' : `${sign}${Math.round(abs)}`
  }

  const DASH = 1200

  return (
    <div className="mt-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-36 w-full overflow-visible"
        role="img"
        aria-label={`Динамика выручки и прибыли: ${labels[0] ?? 'начало'} — ${labels.at(-1) ?? 'конец'}`}
      >
        {ticks.map((tick) => {
          const y = toY(tick)
          return (
            <g key={tick}>
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke={BORDER} strokeDasharray="3 5" strokeWidth="0.8" />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="9.5" fill={TEXT3}>{fmt(tick)}</text>
            </g>
          )
        })}

        {minV < 0 && (
          <line x1={pad.left} x2={W - pad.right} y1={toY(0)} y2={toY(0)} stroke="#94A3B8" strokeWidth="1" />
        )}

        <path
          d={toPath(revenue)}
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={!reducedMotion ? { strokeDasharray: DASH, strokeDashoffset: 0, animation: 'miniDraw 750ms ease-out both' } : undefined}
        />
        <path
          d={toPath(profit)}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={!reducedMotion ? { strokeDasharray: DASH, strokeDashoffset: 0, animation: 'miniDraw 1000ms ease-out 80ms both' } : undefined}
        />

        <circle cx={toX(bestIdx)} cy={toY(bestVal)} r="4.5" fill="#10B981" />
        <circle cx={toX(worstIdx)} cy={toY(worstVal)} r="4.5" fill="#EF4444" />

        <text x={pad.left} y={H - 6} textAnchor="start" fontSize="9" fill={TEXT3}>{labels[0] ?? ''}</text>
        <text x={W - pad.right} y={H - 6} textAnchor="end" fontSize="9" fill={TEXT3}>{labels.at(-1) ?? ''}</text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]" style={{ color: TEXT3 }}>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: accent }} />
          Выручка
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: '#F59E0B' }} />
          Прибыль
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#10B981' }} />
          {labels[bestIdx] ?? 'Лучший'}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#EF4444' }} />
          {labels[worstIdx] ?? 'Худший'}
        </span>
      </div>

      <style jsx>{`
        @keyframes miniDraw {
          from { stroke-dashoffset: 1200; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}

function InteractiveTrendChart({
  labels,
  revenue,
  profit,
}: {
  labels: string[]
  revenue: number[]
  profit: number[]
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  if (revenue.length < 2 || profit.length < 2 || labels.length !== revenue.length || profit.length !== revenue.length) {
    return <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>Недостаточно данных для графика.</p>
  }

  const width = 760
  const height = 264
  const padding = { top: 14, right: 16, bottom: 30, left: 48 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const values = [...revenue, ...profit]
  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue || 1

  const toPoint = (value: number, index: number) => ({
    x: padding.left + (index / (labels.length - 1)) * plotWidth,
    y: padding.top + plotHeight - ((value - minValue) / range) * plotHeight,
  })

  const revenuePoints = revenue.map(toPoint)
  const profitPoints = profit.map(toPoint)
  const linePath = (points: { x: number; y: number }[]) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')

  const bestValue = Math.max(...profit)
  const worstValue = Math.min(...profit)
  const bestIndex = profit.indexOf(bestValue)
  const worstIndex = profit.indexOf(worstValue)
  const hoverIndex = activeIndex ?? bestIndex
  const hoverRevenue = revenue[hoverIndex]
  const hoverProfit = profit[hoverIndex]
  const hoverMargin = hoverRevenue !== 0 ? (hoverProfit / hoverRevenue) * 100 : null
  const tooltipPoint = profitPoints[hoverIndex]
  const yTicks = Array.from({ length: 5 }, (_, index) => minValue + (range / 4) * index).reverse()

  return (
    <div className="space-y-1.5">
      <div className="rounded-3xl border p-2" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" role="img" aria-label="Динамика выручки и прибыли по месяцам">
          {yTicks.map((tick) => {
            const y = padding.top + plotHeight - ((tick - minValue) / range) * plotHeight
            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 6" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill={TEXT3}>
                  {`${Math.round(tick / 1_000_000)} млн`}
                </text>
              </g>
            )
          })}

          <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke={BORDER} />
          <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke={BORDER} />

          <path
            d={linePath(revenuePoints)}
            fill="none"
            stroke={PRIMARY_BLUE}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={!reducedMotion ? { strokeDasharray: 1200, strokeDashoffset: 0, animation: 'drawLine 900ms ease-out' } : undefined}
          />
          <path
            d={linePath(profitPoints)}
            fill="none"
            stroke="#F97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={!reducedMotion ? { strokeDasharray: 1200, strokeDashoffset: 0, animation: 'drawLine 1100ms ease-out' } : undefined}
          />

          {labels.map((label, index) => {
            const revenuePoint = revenuePoints[index]
            const profitPoint = profitPoints[index]
            const isBest = index === bestIndex
            const isWorst = index === worstIndex
            const isActive = index === hoverIndex

            return (
              <g key={label}>
                <rect
                  x={revenuePoint.x - plotWidth / (labels.length * 2)}
                  y={padding.top}
                  width={plotWidth / labels.length}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                />
                <circle cx={revenuePoint.x} cy={revenuePoint.y} r={isActive ? 5 : 3.5} fill={PRIMARY_BLUE} opacity={0.95} />
                <circle
                  cx={profitPoint.x}
                  cy={profitPoint.y}
                  r={isActive ? 6 : 4}
                  fill={isBest ? '#10B981' : isWorst ? '#EF4444' : '#F97316'}
                  opacity={0.95}
                />
                {(index === 0 || index === labels.length - 1 || index === bestIndex || index === worstIndex || index % 3 === 0) && (
                  <text x={profitPoint.x} y={height - 14} textAnchor="middle" fontSize="11" fill={TEXT3}>
                    {label}
                  </text>
                )}
              </g>
            )
          })}

          {tooltipPoint && (
            <g transform={`translate(${Math.min(tooltipPoint.x + 12, width - 215)}, ${Math.max(tooltipPoint.y - 96, padding.top + 6)})`}>
              <rect width="204" height="88" rx="14" fill="#FFFFFF" stroke={BORDER} />
              <text x="12" y="22" fontSize="12" fontWeight="700" fill={TEXT}>{labels[hoverIndex]}</text>
              <text x="12" y="42" fontSize="12" fill={PRIMARY_BLUE}>{`Выручка: ${formatCurrency(hoverRevenue, true)}`}</text>
              <text x="12" y="60" fontSize="12" fill="#EA580C">{`Прибыль: ${formatCurrency(hoverProfit, true)}`}</text>
              <text x="12" y="78" fontSize="12" fill={TEXT2}>{formatMarginDisplay(hoverMargin)}</text>
            </g>
          )}
        </svg>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-3">
        <MetricChip label="Лучший месяц" value={`${labels[bestIndex]} / ${formatCurrency(bestValue, true)}`} tone="green" />
        <MetricChip label="Худший месяц" value={`${labels[worstIndex]} / ${formatCurrency(worstValue, true)}`} tone="red" />
        <MetricChip label="Период" value={`${labels[0]} — ${labels.at(-1)}`} tone="slate" />
      </div>

      <style jsx>{`
        @keyframes drawLine {
          from {
            stroke-dashoffset: 1200;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes softPulse {
          0%, 100% {
            box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.08), 0 0 16px rgba(239, 68, 68, 0.08);
          }
          50% {
            box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.12), 0 0 24px rgba(239, 68, 68, 0.18);
          }
        }
      `}</style>
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
            <div className="mb-0.5 flex items-center justify-between gap-3 text-[11px]">
              <span style={{ color: TEXT }}>{item.label}</span>
              <span className="font-semibold" style={{ color: tone.text }}>
                {item.pct !== null ? `${item.pct}%` : formatCurrency(item.amount, true)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: '#EEF2F7' }}>
              <div className="h-full rounded-full" style={{ width: `${clamp(pct || 12)}%`, background: tone.fill }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BreakevenPreview({ current, breakeven, gap, targetRevenue, targetMargin }: {
  current: number | null
  breakeven: number | null
  gap: number | null
  targetRevenue?: number | null
  targetMargin?: number | null
}) {
  const progress = current !== null && breakeven !== null && breakeven > 0 ? clamp((current / breakeven) * 100) : 0
  const tone: Tone = gap !== null && gap > 0 ? 'red' : 'green'
  return (
    <div className="space-y-2.5">
      <div className="flex items-end justify-between gap-3">
        <span className="text-[2rem] font-semibold leading-none" style={{ color: TEXT }}>{Math.round(progress)}%</span>
        <StatusPill tone={tone}>{gap !== null && gap > 0 ? 'Ниже порога' : 'Около безубыточности'}</StatusPill>
      </div>
      <div className="h-3 overflow-hidden rounded-full" style={{ background: '#EEF2F7' }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: TONES[tone].fill }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border px-2.5 py-1.5" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
          <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT3 }}>Средняя выручка</p>
          <p className="mt-0.5 text-[0.82rem] font-semibold leading-snug" style={{ color: TEXT }}>{formatCurrency(current, true)}</p>
        </div>
        <div className="rounded-xl border px-2.5 py-1.5" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
          <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT3 }}>Точка безубыточности</p>
          <p className="mt-0.5 text-[0.82rem] font-semibold leading-snug" style={{ color: TEXT }}>{formatCurrency(breakeven, true)}</p>
        </div>
        {gap !== null && gap > 0 && (
          <div className="rounded-xl border px-2.5 py-1.5" style={{ background: TONES.red.bg, borderColor: TONES.red.border }}>
            <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT3 }}>Не хватает</p>
            <p className="mt-0.5 text-[0.82rem] font-semibold leading-snug" style={{ color: TONES.red.text }}>{formatCurrency(gap, true)}/мес</p>
          </div>
        )}
        {targetRevenue != null && (
          <div className="rounded-xl border px-2.5 py-1.5" style={{ background: TONES.indigo.bg, borderColor: TONES.indigo.border }}>
            <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TEXT3 }}>Цель ({targetMargin ?? 10}% маржи)</p>
            <p className="mt-0.5 text-[0.82rem] font-semibold leading-snug" style={{ color: TONES.indigo.text }}>{formatCurrency(targetRevenue, true)}</p>
          </div>
        )}
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
    if (card.id === 'trend-anomalies') {
      return <InteractiveTrendChart labels={pnlFacts.monthLabels} revenue={pnlFacts.revenueSeries} profit={pnlFacts.profitSeries} />
    }
    if (card.id === 'profit-drag') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
            <MetricChip label="База" value={`${formatCurrency(pnlFacts.expenseBreakdown.slice(0, 3).reduce((sum, item) => sum + (item.amount ?? 0), 0), true)}/мес`} tone="red" />
            <MetricChip label="Разрыв" value={formatCurrency(pnlFacts.gapToBreakeven, true)} tone="amber" />
            <MetricChip label="Порог" value={formatCurrency(pnlFacts.breakevenRevenue, true)} tone="slate" />
          </div>
          <ExpensePreview items={pnlFacts.expenseBreakdown.slice(0, 4)} />
          <p className="text-[10px] leading-relaxed" style={{ color: TEXT3 }}>
            % рассчитан от средней выручки — это нагрузка на оборот, а не структура на 100%.
          </p>
        </div>
      )
    }
    switch (card.id) {
      case 'diagnosis':
        return (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <MetricChip label="Средняя выручка" value={formatCurrency(pnlFacts.avgRevenue, true)} />
            <MetricChip label="Средние расходы" value={formatCurrency(pnlFacts.avgCosts, true)} tone="red" />
            <MetricChip label="Средняя прибыль за период" value={formatCurrency(pnlFacts.avgProfit, true)} tone={toneForProfit(pnlFacts.avgProfit)} />
            <MetricChip label="Средняя маржа" value={formatPercent(pnlFacts.avgMargin)} tone={toneForMargin(pnlFacts.avgMargin)} />
            <MetricChip label="Прибыльных месяцев" value={`${pnlFacts.profitableMonths} из ${pnlFacts.totalMonths}`} />
            <MetricChip label="Убыточных месяцев" value={`${Math.max(pnlFacts.totalMonths - pnlFacts.profitableMonths, 0)} из ${pnlFacts.totalMonths}`} tone="red" />
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
      case 'breakeven': {
        const tgt = pnlFacts.breakevenRevenue !== null && pnlFacts.targetMargin !== null
          ? Math.round(pnlFacts.breakevenRevenue / (1 - pnlFacts.targetMargin / 100))
          : null
        return <BreakevenPreview current={pnlFacts.avgRevenue} breakeven={pnlFacts.breakevenRevenue} gap={pnlFacts.gapToBreakeven} targetRevenue={tgt} targetMargin={pnlFacts.targetMargin} />
      }
      case 'constraint':
        return (
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
            <MetricChip label="Постоянная база (УК+ФОТ+аренда)" value={formatCurrency(pnlFacts.expenseBreakdown.slice(0,3).reduce((s,i)=>s+(i.amount??0),0), true) + '/мес'} tone="red" />
            <MetricChip label="Порог безубыточности" value={formatCurrency(pnlFacts.breakevenRevenue, true)} tone="amber" />
            <MetricChip label="Средняя выручка" value={formatCurrency(pnlFacts.avgRevenue, true)} tone="slate" />
          </div>
        )
      case 'actions':
        return <ScenarioPlanPanel />
      case 'limitations':
        return null
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
    switch (card.id) {
      case 'constraint':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
              {goldrattFacts.actualMarginLabel && <MetricChip label="Факт" value={goldrattFacts.actualMarginLabel} tone="amber" />}
              {goldrattFacts.targetMarginLabel && <MetricChip label="Цель" value={goldrattFacts.targetMarginLabel} tone="blue" />}
              {goldrattFacts.teamLabel && <MetricChip label="Команда" value={goldrattFacts.teamLabel} tone="slate" />}
              <MetricChip label="Симптом" value="Заявки просели" tone="red" />
              <MetricChip label="Роль собственника" value="Стратегия + операционка" tone="indigo" />
              <MetricChip label="Фон" value="Много гипотез" tone="amber" />
            </div>
            <GoldrattConstraintPreview facts={goldrattFacts} />
            <div className="rounded-2xl border p-3" style={{ borderColor: BORDER_SOFT, background: '#FBFCFE' }}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#4338CA' }}>Почему это ограничение</p>
              <div className="space-y-1.5">
                {[
                  'Почти каждый путь к росту проходит через один ресурс — внимание и решения собственника.',
                  'Продажи зависят от ручного внимания, а не от повторяемого процесса.',
                  'Новые инициативы добавляют нагрузку в тот же узел, вместо того чтобы ускорять поток денег.',
                ].map((item, i) => (
                  <div key={i} className="flex gap-2 text-[11px] leading-snug">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: '#EEF2FF', color: '#3730A3' }}>{i + 1}</span>
                    <span style={{ color: TEXT }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'exploit':
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              {(['Найти', 'Использовать', 'Подчинить', 'Расширить', 'Найти следующее'] as const).map((step, i, arr) => (
                <span key={step} className="flex items-center gap-1">
                  <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: '#EEF2FF', color: '#4338CA' }}>{step}</span>
                  {i < arr.length - 1 && <span style={{ color: TEXT3 }}>→</span>}
                </span>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border p-3" style={{ borderColor: '#BBF7D0', background: '#F0FDF4' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#166534' }}>Использовать ограничение</p>
                <BulletPreview items={goldrattFacts.exploitActions.length > 0 ? goldrattFacts.exploitActions.slice(0, 3) : [
                  'На ближайшие 30 дней убрать с собственника всё, что не двигает выбранный поток денег.',
                  'Не открывать новые гипотезы, пока непонятно, какое направление даёт деньги быстрее всего.',
                  'Время собственника — только на продажи, оффер и решения, которые дают поток денег.',
                ]} />
              </div>
              <div className="rounded-2xl border p-3" style={{ borderColor: '#C7D2FE', background: '#EEF2FF' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#4338CA' }}>Подчинить систему</p>
                <BulletPreview items={goldrattFacts.subordinateActions.length > 0 ? goldrattFacts.subordinateActions.slice(0, 3) : [
                  'Команда, контент, продукт и партнёрские решения — только под один выбранный приоритет.',
                  'Если задача не помогает выбранному направлению сделать продажу — она уходит в backlog.',
                  'Календарь собственника временно упростить вокруг одного денежного потока.',
                ]} />
              </div>
              <div className="rounded-2xl border p-3" style={{ borderColor: '#BFDBFE', background: '#EFF6FF' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#1D4ED8' }}>Расширить ограничение</p>
                <BulletPreview items={goldrattFacts.elevateActions.length > 0 ? goldrattFacts.elevateActions.slice(0, 3) : [
                  'После очистки фокуса — делегировать операционку, которая регулярно затягивает собственника.',
                  'Закрепить роли с партнёром: кто отвечает за продажи, кто за delivery.',
                  'Расширять только после выбора потока денег, не раньше.',
                ]} />
              </div>
            </div>
            <div className="rounded-2xl border px-3 py-2.5" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#92400E' }}>Не наоборот</p>
              <p className="mt-1 text-sm leading-snug" style={{ color: '#78350F' }}>
                Не нанимать, не запускать и не автоматизировать хаос до того, как выбран главный поток денег.
              </p>
            </div>
            <div className="border-t pt-3" style={{ borderColor: BORDER_SOFT }}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>Первые действия</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { window: '48 часов', color: '#EEF2FF', textColor: '#4338CA', items: goldrattFacts.actionPlan7.length > 0 ? goldrattFacts.actionPlan7.slice(0, 2) : ['Выбрать один поток денег', 'Заморозить новые инициативы'] },
                  { window: '7 дней', color: '#F0FDF4', textColor: '#166534', items: goldrattFacts.actionPlan14.length > 0 ? goldrattFacts.actionPlan14.slice(0, 2) : ['Собрать список проектов', 'Пометить: деньги / близко / заморозить'] },
                  { window: '14 дней', color: '#F8FAFC', textColor: '#475569', items: goldrattFacts.actionPlan30.length > 0 ? goldrattFacts.actionPlan30.slice(0, 2) : ['Запустить цикл продаж', 'Сделать 20–30 контактов'] },
                ].map((step) => (
                  <div key={step.window} className="rounded-2xl border p-2.5" style={{ borderColor: BORDER_SOFT, background: step.color }}>
                    <span className="text-[10px] font-semibold" style={{ color: step.textColor }}>{step.window}</span>
                    <div className="mt-1 space-y-1">
                      {step.items.map((item, i) => (
                        <p key={i} className="text-[11px] leading-snug" style={{ color: TEXT }}>· {item}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      case 'donot':
        return (
          <div className="space-y-3">
            <GoldrattDoNotGrid />
            <div className="rounded-2xl border px-3 py-2.5" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#92400E' }}>Почему это опасно</p>
              <p className="mt-1 text-sm leading-snug" style={{ color: '#78350F' }}>
                Если ограничение сидит в фокусе собственника и несобранной системе продаж, новый продукт, канал или найм только увеличат число незавершённых задач. Бизнес станет активнее, но поток денег почти не ускорится.
              </p>
            </div>
          </div>
        )
      case 'limitations':
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {['P&L / финансы', 'CRM / воронка продаж', 'Список проектов', 'Описание процесса', 'Оргструктура / роли', 'Загрузка команды'].map((item) => (
                <span key={item} className="rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT, color: TEXT2 }}>
                  {item}
                </span>
              ))}
            </div>
            <div className="rounded-2xl border px-3 py-2.5 text-sm leading-relaxed" style={{ borderColor: BORDER_SOFT, background: '#F8FAFC', color: TEXT2 }}>
              <span className="font-semibold" style={{ color: TEXT }}>Уровень уверенности: {goldrattFacts.confidenceLabel}.</span>{' '}
              {goldrattFacts.confidenceNote}
            </div>
          </div>
        )
      default:
        return <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>{card.support ?? card.value}</p>
    }
  }

  return <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>{card.support ?? card.value}</p>
}

function MetricChip({ label, value, tone = 'slate' }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border px-2.5 py-1.5" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>{label}</p>
      <p className="mt-0.5 text-[0.92rem] font-semibold leading-snug" style={{ color: tone === 'slate' ? TEXT : TONES[tone].text }}>{value}</p>
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

function ScenarioPlanPanel() {
  const plan = [
    { window: '7 дней', action: 'Собрать P&L по клубам: выручка, аренда, ФОТ, УК, прибыль.' },
    { window: '14 дней', action: 'Разделить клубы на доноров, нейтральные точки и пожирателей маржи.' },
    { window: '30 дней', action: 'Принять разные решения по группам: масштабировать, доводить до нормы, пересобирать.' },
  ]
  const dangerous = [
    'Не резать расходы вслепую',
    'Не масштабировать продажи без маржи',
    'Не оценивать сеть только по среднему месяцу',
    'Не принимать решения без P&L по клубам',
  ]

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.76fr)]">
      <div className="rounded-3xl border p-3.5" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <h3 className="mb-2.5 text-sm font-semibold" style={{ color: TEXT }}>План 7 / 14 / 30</h3>
        <div className="space-y-1.5">
          {plan.map((step) => (
            <div key={step.window} className="grid gap-1.5 rounded-2xl border px-3 py-2.5 sm:grid-cols-[68px_1fr]" style={{ borderColor: BORDER_SOFT, background: '#FFFFFF' }}>
              <span className="inline-flex h-6 w-fit items-center justify-center rounded-full px-2.5 text-[10px] font-semibold" style={{ background: '#EEF2FF', color: '#4338CA' }}>
                {step.window}
              </span>
              <p className="text-[0.9rem] leading-[1.5]" style={{ color: '#334155' }}>{step.action}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border p-3.5" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
        <h3 className="text-sm font-semibold" style={{ color: '#92400E' }}>Какие решения сейчас опасны</h3>
        <p className="mt-2 text-[0.88rem] leading-[1.5]" style={{ color: '#78350F' }}>
          Сводный P&L показывает убыток, но не показывает, где именно он возникает. Без клубного разреза легко ударить по сильным точкам и не исправить слабые.
        </p>
        <div className="mt-2.5 grid gap-1.5">
          {dangerous.map((item) => (
            <div key={item} className="flex gap-2 text-[0.9rem] leading-snug" style={{ color: '#78350F' }}>
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#F59E0B' }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LimitationsPanel({ sourceWarning }: { sourceWarning?: string }) {
  const exact = ['Сводный P&L достаточно хорошо показывает сам факт убытка, динамику выручки, среднюю расходную базу и месяцы, где прибыль появляется или исчезает. Этого достаточно для диагноза “проблема есть”.']
  const missing = [
    'Без P&L по клубам нельзя понять, вся сеть убыточна или несколько точек маскируются внутри сводного результата. Это меняет решение: менять модель всей сети или чинить конкретные клубы.',
    'Без трафика и посещаемости нельзя отличить проблему спроса от проблемы цены, конверсии, загрузки или графика персонала. Один и тот же убыток может иметь разные причины.',
    'Без расшифровки УК и ФОТ по сменам нельзя безопасно резать расходы: можно ухудшить сервис и не попасть в статью, которая реально держит бизнес ниже порога.',
  ]
  const next = [
    sourceWarning,
    'P&L по каждому клубу с выручкой, арендой, ФОТ, УК и прибылью.',
    'Трафик, посещаемость, загрузка смен и расшифровка УК по статьям.',
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: PRIMARY_BLUE }}>Что считаем точно</p>
        <BulletPreview items={exact} />
      </div>
      <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#B45309' }}>Какие решения сейчас опасны</p>
        <BulletPreview items={missing} />
      </div>
      <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#475569' }}>Что нужно для точного анализа</p>
        <BulletPreview items={next.slice(0, 3)} />
      </div>
    </div>
  )
}

function FlowPipelineChart({ stages }: { stages: Array<{ label: string; isBottleneck: boolean; time?: string }> }) {
  const displayStages = stages.length > 0 ? stages : [
    { label: 'Заявка клиента', isBottleneck: false },
    { label: 'Профиль вакансии', isBottleneck: false },
    { label: 'Поиск кандидатов', isBottleneck: false },
    { label: 'Первичная квалификация', isBottleneck: true },
    { label: 'Интервью', isBottleneck: false },
    { label: 'Согласование', isBottleneck: false },
    { label: 'Оффер / Закрытие', isBottleneck: false },
  ]

  return (
    <div className="flex flex-wrap items-start gap-1.5 py-1">
      {displayStages.map((stage, index) => (
        <div key={stage.label} className="flex items-center gap-1.5">
          <div
            className="flex flex-col items-center gap-0.5 rounded-2xl border px-2.5 py-2 text-center"
            style={{
              background: stage.isBottleneck ? '#FEF2F2' : '#F8FAFC',
              borderColor: stage.isBottleneck ? '#FECACA' : BORDER_SOFT,
              minWidth: '80px',
              maxWidth: '115px',
            }}
          >
            {stage.isBottleneck && (
              <span className="mb-0.5 text-[8.5px] font-bold uppercase tracking-wide" style={{ color: '#DC2626' }}>
                ⚠ Узкое место
              </span>
            )}
            <span className="text-[10.5px] font-semibold leading-tight" style={{ color: stage.isBottleneck ? '#B91C1C' : TEXT }}>
              {stage.label}
            </span>
            {stage.time && (
              <span className="mt-0.5 text-[9px]" style={{ color: TEXT3 }}>{stage.time}</span>
            )}
          </div>
          {index < displayStages.length - 1 && (
            <span className="shrink-0 text-[10px]" style={{ color: TEXT3 }}>→</span>
          )}
        </div>
      ))}
    </div>
  )
}

function DetailedFlowChart({ stages }: { stages: GoldrattFlowStageDetail[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  if (stages.length === 0) return null
  const bottleneckIndex = stages.findIndex((stage) => stage.isBottleneck)
  const resolvedActiveIndex = activeIndex ?? (bottleneckIndex >= 0 ? bottleneckIndex : 0)
  const activeStage = stages[resolvedActiveIndex] ?? stages[0]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border px-3 py-2.5" style={{ borderColor: activeStage?.isBottleneck ? '#FECACA' : BORDER_SOFT, background: activeStage?.isBottleneck ? '#FFF7F7' : '#F8FAFC' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: activeStage?.isBottleneck ? '#DC2626' : TEXT3 }}>
              {activeStage?.isBottleneck ? 'Ограничение потока' : 'Активный этап'}
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>{activeStage?.label}</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT2 }}>
              {activeStage?.isBottleneck
                ? 'Здесь система физически сужается: очередь растёт быстрее, чем команда успевает её пропускать дальше по потоку.'
                : 'Наведите на этап в схеме или строку в таблице ниже, чтобы увидеть, как он влияет на пропускную способность всей системы.'}
            </p>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-xl border px-2.5 py-2" style={{ borderColor: BORDER_SOFT, background: '#FFFFFF' }}>
              <p style={{ color: TEXT3 }}>Ожидание / норма</p>
              <p className="mt-1 font-semibold" style={{ color: TEXT }}>{activeStage?.wait} / {activeStage?.norm}</p>
            </div>
            <div className="rounded-xl border px-2.5 py-2" style={{ borderColor: BORDER_SOFT, background: '#FFFFFF' }}>
              <p style={{ color: TEXT3 }}>Загрузка</p>
              <p className="mt-1 font-semibold" style={{ color: activeStage && activeStage.load > 100 ? '#B91C1C' : TEXT }}>{activeStage?.load}%</p>
            </div>
            <div className="rounded-xl border px-2.5 py-2" style={{ borderColor: BORDER_SOFT, background: '#FFFFFF' }}>
              <p style={{ color: TEXT3 }}>Очередь</p>
              <p className="mt-1 font-semibold" style={{ color: activeStage && activeStage.queue > 10 ? '#B45309' : TEXT }}>{activeStage?.queue}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[620px] flex-col gap-2 py-1">
          <div className="flex items-center gap-1">
            {stages.map((stage, index) => {
              const isActive = index === resolvedActiveIndex
              return (
                <div key={stage.label} className="flex flex-1 items-center gap-1">
                  <button
                    type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                    className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl border px-1.5 py-2 text-center transition-all"
                    style={{
                      background: stage.isBottleneck ? (isActive ? '#FEE2E2' : '#FEF2F2') : isActive ? '#EEF6FF' : '#F8FAFC',
                      borderColor: stage.isBottleneck ? '#FCA5A5' : isActive ? '#BFDBFE' : BORDER_SOFT,
                      minWidth: '72px',
                      boxShadow: stage.isBottleneck && !reducedMotion ? '0 0 0 1px rgba(239,68,68,0.08), 0 0 24px rgba(239,68,68,0.12)' : undefined,
                      animation: !reducedMotion && stage.isBottleneck ? 'softPulse 2.6s ease-in-out infinite' : undefined,
                    }}
                    aria-label={`Этап ${stage.label}: вход ${stage.input}, выход ${stage.output}, ожидание ${stage.wait}, загрузка ${stage.load}%`}
                  >
                    {stage.isBottleneck && (
                      <span className="mb-0.5 inline-flex items-center gap-1 text-[7.5px] font-bold uppercase tracking-wide" style={{ color: '#DC2626' }}>
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Ограничение
                      </span>
                    )}
                    <span className="text-[10px] font-semibold leading-tight" style={{ color: stage.isBottleneck ? '#B91C1C' : isActive ? PRIMARY_BLUE : TEXT }}>
                      {stage.label}
                    </span>
                    <span className="mt-0.5 text-[8.5px] font-medium" style={{ color: stage.isBottleneck ? '#B91C1C' : TEXT3 }}>
                      {stage.conversion}%
                    </span>
                  </button>
                  {index < stages.length - 1 && (
                    <span className="shrink-0 text-[10px]" style={{ color: TEXT3 }}>→</span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: BORDER_SOFT }}>
            <table className="w-full min-w-[620px] border-collapse text-[10px]">
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <td className="sticky left-0 z-10 border-b border-r px-2 py-1.5 font-semibold" style={{ borderColor: BORDER_SOFT, color: TEXT3, background: '#F8FAFC' }}>Этап</td>
                  <td className="border-b border-r px-2 py-1.5 text-right font-semibold" style={{ borderColor: BORDER_SOFT, color: TEXT3 }}>Вход</td>
                  <td className="border-b border-r px-2 py-1.5 text-right font-semibold" style={{ borderColor: BORDER_SOFT, color: TEXT3 }}>Выход</td>
                  <td className="border-b border-r px-2 py-1.5 text-right font-semibold" style={{ borderColor: BORDER_SOFT, color: TEXT3 }}>Конверсия</td>
                  <td className="border-b border-r px-2 py-1.5 text-right font-semibold" style={{ borderColor: BORDER_SOFT, color: TEXT3 }}>Ожидание</td>
                  <td className="border-b border-r px-2 py-1.5 text-right font-semibold" style={{ borderColor: BORDER_SOFT, color: TEXT3 }}>Норма</td>
                  <td className="border-b border-r px-2 py-1.5 text-right font-semibold" style={{ borderColor: BORDER_SOFT, color: TEXT3 }}>Загрузка</td>
                  <td className="border-b px-2 py-1.5 text-right font-semibold" style={{ borderColor: BORDER_SOFT, color: TEXT3 }}>Очередь</td>
                </tr>
              </thead>
              <tbody>
                {stages.map((stage, index) => {
                  const isActive = index === resolvedActiveIndex
                  const rowBackground = stage.isBottleneck ? (isActive ? '#FEE2E2' : '#FEF2F2') : isActive ? '#F8FBFF' : CARD
                  return (
                    <tr
                      key={stage.label}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      className="transition-colors hover:bg-slate-50"
                      style={{ background: rowBackground }}
                    >
                      <td className="sticky left-0 z-10 border-b border-r px-2 py-1.5 font-semibold" style={{ borderColor: BORDER_SOFT, color: stage.isBottleneck ? '#B91C1C' : TEXT, background: rowBackground }}>
                        {stage.label}{stage.isBottleneck ? ' ←' : ''}
                      </td>
                      <td className="border-b border-r px-2 py-1.5 text-right tabular-nums" style={{ borderColor: BORDER_SOFT, color: TEXT2 }}>{stage.input}</td>
                      <td className="border-b border-r px-2 py-1.5 text-right tabular-nums" style={{ borderColor: BORDER_SOFT, color: TEXT2 }}>{stage.output}</td>
                      <td className="border-b border-r px-2 py-1.5 text-right tabular-nums" style={{ borderColor: BORDER_SOFT, color: TEXT2 }}>{stage.conversion}%</td>
                      <td className="border-b border-r px-2 py-1.5 text-right" style={{ borderColor: BORDER_SOFT, color: stage.isBottleneck ? '#B91C1C' : TEXT2 }}>{stage.wait}</td>
                      <td className="border-b border-r px-2 py-1.5 text-right" style={{ borderColor: BORDER_SOFT, color: TEXT3 }}>{stage.norm}</td>
                      <td
                        className="border-b border-r px-2 py-1.5 text-right font-semibold tabular-nums"
                        style={{ borderColor: BORDER_SOFT, color: stage.load > 110 ? '#B91C1C' : stage.load > 95 ? '#B45309' : '#047857' }}
                      >
                        {stage.load}%
                      </td>
                      <td
                        className="border-b px-2 py-1.5 text-right font-semibold tabular-nums"
                        style={{ borderColor: BORDER_SOFT, color: stage.queue > 50 ? '#B91C1C' : stage.queue > 10 ? '#B45309' : TEXT2 }}
                      >
                        {stage.queue}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoldrattTrendChart({ data }: { data: GoldrattTrendPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  if (data.length < 2) {
    return <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>Недостаточно данных для графика.</p>
  }

  const W = 720
  const H = 208
  const pad = { top: 16, right: 18, bottom: 28, left: 44 }
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom
  const n = data.length

  const leads = data.map((d) => d.leads)
  const processed = data.map((d) => d.processed)
  const payments = data.map((d) => d.payments)

  const maxVal = Math.max(...leads, ...processed, ...payments, 1)
  const toX = (i: number) => pad.left + (i / (n - 1)) * plotW
  const toY = (v: number) => pad.top + plotH - (v / maxVal) * plotH

  const linePath = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')

  const DASH = 1000
  const hIdx = activeIndex ?? (n - 1)
  const tip = {
    x: toX(hIdx),
    y: toY(data[hIdx]?.processed ?? 0),
    month: data[hIdx]?.month ?? '',
    leads: data[hIdx]?.leads ?? 0,
    processed: data[hIdx]?.processed ?? 0,
    payments: data[hIdx]?.payments ?? 0,
    reaction: data[hIdx]?.reaction ?? 0,
  }
  const tooltipWidth = 176
  const tooltipHeight = 82
  const tooltipX = tip.x > W * 0.62
    ? Math.max(tip.x - tooltipWidth - 12, 10)
    : Math.min(tip.x + 12, W - tooltipWidth - 10)
  const tooltipY = Math.max(Math.min(tip.y - tooltipHeight / 2, H - tooltipHeight - 10), 10)
  const trendNote =
    tip.leads > tip.processed
      ? 'Лидов становится больше, но быстрая обработка не успевает за входящим потоком.'
      : 'Скорость обработки держится ближе к входящему потоку и меньше давит на оплату.'

  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-3xl border p-2" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Динамика лидов, быстрой обработки и оплат по месяцам">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const v = Math.round(maxVal * ratio)
            const y = pad.top + plotH - ratio * plotH
            return (
              <g key={ratio}>
                <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 6" strokeWidth="0.8" />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill={TEXT3}>{v}</text>
              </g>
            )
          })}
          <line x1={pad.left} x2={pad.left} y1={pad.top} y2={H - pad.bottom} stroke={BORDER} />
          <line x1={pad.left} x2={W - pad.right} y1={H - pad.bottom} y2={H - pad.bottom} stroke={BORDER} />
          <line x1={tip.x} x2={tip.x} y1={pad.top} y2={H - pad.bottom} stroke="#CBD5E1" strokeDasharray="4 6" />

          <path d={linePath(leads)} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={!reducedMotion ? { strokeDasharray: DASH, strokeDashoffset: 0, animation: 'drawLine 900ms ease-out' } : undefined} />
          <path d={linePath(processed)} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={!reducedMotion ? { strokeDasharray: DASH, strokeDashoffset: 0, animation: 'drawLine 1100ms ease-out' } : undefined} />
          <path d={linePath(payments)} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={!reducedMotion ? { strokeDasharray: DASH, strokeDashoffset: 0, animation: 'drawLine 1300ms ease-out' } : undefined} />

          {data.map((d, i) => (
            <g key={d.month}>
              <rect
                x={toX(i) - plotW / (n * 2)}
                y={pad.top}
                width={plotW / n}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(i)}
                rx="8"
                tabIndex={0}
                aria-label={`Месяц ${d.month}: лиды ${d.leads}, обработано за 2 часа ${d.processed}, оплаты ${d.payments}, реакция ${d.reaction} часов`}
              />
              <circle cx={toX(i)} cy={toY(d.leads)} r={i === hIdx ? 4.5 : 3} fill="#3B82F6" />
              <circle cx={toX(i)} cy={toY(d.processed)} r={i === hIdx ? 4.5 : 3} fill="#10B981" />
              <circle cx={toX(i)} cy={toY(d.payments)} r={i === hIdx ? 5 : 3.5} fill="#F59E0B" />
              <text x={toX(i)} y={H - 12} textAnchor="middle" fontSize="10" fill={TEXT3}>{d.month}</text>
            </g>
          ))}

          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect width={tooltipWidth} height={tooltipHeight} rx="12" fill="white" stroke={BORDER} />
            <text x="10" y="20" fontSize="11" fontWeight="700" fill={TEXT}>{tip.month}</text>
            <text x="10" y="38" fontSize="11" fill="#3B82F6">{`Лиды: ${tip.leads}`}</text>
            <text x="10" y="53" fontSize="11" fill="#10B981">{`За 2 ч: ${tip.processed}`}</text>
            <text x="10" y="68" fontSize="11" fill="#F59E0B">{`Оплаты: ${tip.payments}`}</text>
            <text x="10" y="80" fontSize="11" fill={TEXT2}>{`Реакция: ${tip.reaction} ч`}</text>
          </g>
        </svg>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: TEXT2 }}>{trendNote}</p>
      <div className="flex flex-wrap gap-2.5 text-[10px]" style={{ color: TEXT3 }}>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded-full bg-blue-500" />Лиды</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded-full bg-emerald-500" />Обработано за 2 ч</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded-full bg-amber-500" />Оплаты</span>
        <span className="ml-auto">Реакция: {data[0]?.reaction} ч → {data[data.length - 1]?.reaction} ч</span>
      </div>
    </div>
  )
}

const GOLDRATT_LEGACY_DEV_COMPONENTS = [
  parseGoldrattTables,
  parseFlowStages,
  extractBulletsAfterHeading,
  DetailedFlowChart,
  GoldrattTrendChart,
]
void GOLDRATT_LEGACY_DEV_COMPONENTS

function GoldrattConstraintPreview({ facts }: { facts: GoldrattFacts }) {
  void facts
  const items = [
    ['Вход', 'заявки просели'],
    ['Узел', 'продажи завязаны на собственнике'],
    ['Выход', 'маржа ниже цели'],
  ] as const

  return (
    <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border px-2.5 py-2" style={{ borderColor: BORDER_SOFT, background: '#FBFCFE' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#64748B' }}>{label}</p>
          <p className="mt-1 text-xs font-medium leading-snug" style={{ color: TEXT }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

function GoldrattDoNotGrid() {
  const items = [
    ['Ещё один продукт', 'добавляет новый незавершённый контур вместо продаж'],
    ['Ещё один канал', 'расширяет активность до выбора главного потока денег'],
    ['Найм под хаос', 'масштабирует перегрузку, а не результат'],
  ]

  return (
    <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
      {items.map(([title, text]) => (
        <div key={title} className="rounded-2xl border px-2.5 py-2" style={{ borderColor: BORDER_SOFT, background: '#FFF9ED' }}>
          <p className="font-semibold" style={{ color: '#9A3412' }}>{title}</p>
          <p className="mt-1 leading-relaxed" style={{ color: '#7C2D12' }}>{text}</p>
        </div>
      ))}
    </div>
  )
}

function GoldrattActionPlanPanel({ facts }: { facts: GoldrattFacts }) {
  const steps = [
    {
      window: '48 часов',
      color: '#EEF2FF',
      textColor: '#4338CA',
      goal: 'Выбрать один поток денег на ближайшие 30 дней.',
      items: facts.actionPlan7.length > 0 ? facts.actionPlan7 : [
        'Выбрать направление: например, AI-решения для бизнеса или разработку образовательных продуктов',
        'Зафиксировать, почему именно оно может быстрее дать деньги',
        'Остальные новые инициативы временно не запускать',
      ],
      success: 'Понятно, какой поток денег главный и чему подчиняются ближайшие решения.',
    },
    {
      window: '7 дней',
      color: '#F0FDF4',
      textColor: '#166534',
      goal: 'Разобрать незавершённое и убрать то, что не ведёт к деньгам.',
      items: facts.actionPlan14.length > 0 ? facts.actionPlan14 : [
        'Собрать список всех проектов и гипотез',
        'Пометить каждый: даёт деньги сейчас / может дать деньги за 30 дней / заморозить',
        'Убрать из фокуса собственника всё, что не относится к выбранному потоку',
      ],
      success: 'Количество параллельных решений уменьшилось, фокус команды стал понятнее.',
    },
    {
      window: '14 дней',
      color: '#F8FAFC',
      textColor: '#475569',
      goal: 'Запустить один управляемый цикл продаж по выбранному направлению.',
      items: facts.actionPlan30.length > 0 ? facts.actionPlan30 : [
        'Сформулировать оффер по выбранному направлению',
        'Сделать 20–30 целевых контактов',
        'Зафиксировать конверсию и причины отказов',
        'Принять решение: масштабировать, изменить оффер или выбрать другой поток',
      ],
      success: 'Появились измеримые продажи или заявки по выбранному направлению, а не просто активность.',
    },
  ]

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {steps.map((step) => (
        <div key={step.window} className="rounded-3xl border p-3.5" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
          <span className="mb-2.5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: step.color, color: step.textColor }}>
            {step.window}
          </span>
          <p className="mb-3 text-sm leading-relaxed" style={{ color: TEXT2 }}>
            <span className="font-semibold" style={{ color: TEXT }}>Цель периода:</span> {step.goal}
          </p>
          <div className="space-y-1.5">
            {step.items.map((item, i) => (
              <div key={i} className="flex gap-2.5 text-sm leading-snug" style={{ color: '#334155' }}>
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: step.color, color: step.textColor }}
                >
                  {i + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl border px-3 py-2 text-xs leading-relaxed" style={{ borderColor: BORDER_SOFT, background: '#FFFFFF', color: TEXT2 }}>
            <span className="font-semibold" style={{ color: TEXT }}>Как понять, что сработало:</span> {step.success}
          </div>
        </div>
      ))}
    </div>
  )
}

function GoldrattLimitationsPanel({ facts }: { facts: GoldrattFacts }) {
  const exact = [
    'Контекст бизнеса уже позволяет сформулировать одно главное ограничение и не распыляться на список симптомов.',
    'Логика Голдратта здесь применима: ограничение определяется по тому, где система теряет поток денег, а не по самой громкой жалобе.',
  ]
  const missing = [
    'Без цифр по продажам и каналам нельзя делать жёсткий вывод, что проблема только в маркетинге или только в оффере.',
    'Без списка проектов, ролей и реальной загрузки нельзя безопасно нанимать, расширять команду или делегировать наугад.',
  ]
  const next = facts.limitations.length > 0 ? facts.limitations : [
    'P&L или управленческие финансы по направлениям.',
    'Список текущих проектов, гипотез и ответственных за них.',
    'Данные по заявкам, продажам и конверсии по одному выбранному направлению.',
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: PRIMARY_BLUE }}>Что считаем достоверно</p>
        <BulletPreview items={exact} />
      </div>
      <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#B45309' }}>Какие решения опасны без проверки</p>
        <BulletPreview items={missing} />
      </div>
      <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#475569' }}>Что нужно для точного анализа</p>
        <BulletPreview items={next.slice(0, 3)} />
      </div>
    </div>
  )
}

function pnlActionContent(card: DetailCard): { title: string; main: string; text: string; tone: Tone } | null {
  switch (card.id) {
    case 'diagnosis':
      return {
        title: 'Что делать первым',
        main: 'Перестать трактовать выручку как главный показатель здоровья',
        text: card.actionText ?? 'Управлять нужно регулярностью прибыли: какие месяцы становятся плюсовыми, почему плюс не повторяется и какие правила должны сделать прибыль нормой, а не исключением.',
        tone: 'red',
      }
    case 'profit-drag':
      return {
        title: 'Что делать с расходной базой',
        main: 'Разбирать УК, ФОТ и аренду по каждому клубу, а не резать всё подряд',
        text: card.actionText ?? 'Главный риск — начать экономить на мелких или видимых статьях и не тронуть настоящую причину. Если проблема сидит в аренде, УК или структуре ФОТ конкретных клубов, экономия на продуктах или сервисе может ухудшить клиентский опыт и не исправить маржу. Первое действие: собрать расходы по клубам и найти, где база не соответствует выручке.',
        tone: 'amber',
      }
    case 'trend-anomalies':
      return {
        title: 'Что делать по динамике',
        main: 'Разделить месяцы на пиковые, обычные и провальные',
        text: card.actionText ?? 'Нельзя управлять сетью по среднему месяцу. Для пиковых месяцев нужны правила удержания маржи, для обычных — контроль базы расходов, для провальных — заранее подготовленный сценарий снижения операционной нагрузки.',
        tone: 'blue',
      }
    case 'breakeven':
      return {
        title: 'Что делать с порогом',
        main: 'Не ставить целью просто “выйти в ноль”',
        text: card.actionText ?? '9,5 млн ₽ — это нижняя граница выживания, а не здоровая цель. Нужен запас прочности: либо снижать базу расходов, либо целиться выше порога, иначе каждый слабый месяц снова будет возвращать сеть в минус.',
        tone: 'red',
      }
    default:
      return null
  }
}

function PnlActionCard({ card }: { card: DetailCard }) {
  const action = pnlActionContent(card)
  if (!action) return null
  const colors = TONES[action.tone]
  return (
    <aside className="flex h-full flex-col gap-3 rounded-3xl border p-3.5" style={{ background: '#FBFCFE', borderColor: colors.border, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.04)' }}>
      <h3 className="text-base font-semibold" style={{ color: TEXT }}>{action.title}</h3>
      <p className="text-[1.05rem] font-semibold leading-snug" style={{ color: colors.text }}>{action.main}</p>
      <p className="flex-1 text-[0.94rem] leading-[1.62]" style={{ color: '#334155' }}>{action.text}</p>
    </aside>
  )
}

function goldrattActionContent(card: DetailCard): { title: string; main: string; text: string; tone: Tone } | null {
  switch (card.id) {
    case 'constraint':
      return {
        title: 'Что делать первым',
        main: 'Перестать лечить бизнес количеством идей',
        text: 'Главное ограничение сейчас — внимание собственника: каждая новая гипотеза забирает тот же ресурс, через который проходят продажи, продукт и рост. Первое решение — выбрать один денежный поток и подчинить ему контент, продажи, продукт и командные задачи на ближайшие 30 дней.',
        tone: 'red',
      }
    default:
      return null
  }
}

function GoldrattActionCard({ card }: { card: DetailCard }) {
  const action = goldrattActionContent(card)
  if (!action) return null
  const colors = TONES[action.tone]
  return (
    <aside className="flex h-full flex-col gap-3 rounded-3xl border p-3.5" style={{ background: '#FBFCFE', borderColor: colors.border, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.04)' }}>
      <h3 className="text-base font-semibold" style={{ color: TEXT }}>{action.title}</h3>
      <p className="text-[1.02rem] font-semibold leading-snug" style={{ color: colors.text }}>{action.main}</p>
      <p className="flex-1 text-[0.92rem] leading-[1.55]" style={{ color: '#334155' }}>{action.text}</p>
    </aside>
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

  if (agentType === 'pnl') {
    return (
      <div className="space-y-4">
        {cards.map((card) => {
          const hasRightCard = pnlActionContent(card) !== null
          return (
            <div
              key={card.id}
              className={hasRightCard ? 'grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]' : ''}
            >
              <article
                role="button"
                tabIndex={0}
                onClick={() => onOpen(card.id)}
                onKeyDown={(event) => openFromKeyboard(event, card.id)}
                className="flex flex-col rounded-3xl border p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}
              >
                <div className="mb-2.5 flex items-start gap-3">
                  <IconBadge icon={card.icon} tone={card.tone} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>{card.kicker}</p>
                    <h3 className="mt-1 text-base font-semibold" style={{ color: TEXT }}>{card.title}</h3>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-2">
                    <p
                      className={`font-semibold tracking-tight ${card.featured ? 'text-2xl sm:text-[1.7rem]' : 'text-[1.1rem]'}`}
                      style={{ color: card.tone === 'slate' ? TEXT : TONES[card.tone].text }}
                    >
                      {card.value}
                    </p>
                    {card.support && (
                      <p className="mt-1 text-sm leading-snug" style={{ color: '#334155' }}>
                        {card.support}
                      </p>
                    )}
                  </div>
                  <CardPreview card={card} agentType={agentType} pnlFacts={pnlFacts} goldrattFacts={goldrattFacts} accent={accent} />
                </div>
                <div className="mt-2 flex items-center justify-end gap-3 pt-1.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpen(card.id)
                    }}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
                    style={{ color: accent }}
                  >
                    Что это значит
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
              {hasRightCard && <PnlActionCard card={card} />}
            </div>
          )
        })}
      </div>
    )
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
          className={`flex flex-col self-start rounded-3xl border p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            card.featured ? 'md:col-span-2 xl:col-span-2' : ''
          }`}
          style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}
        >
          <div className="mb-2.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <IconBadge icon={card.icon} tone={card.tone} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>{card.kicker}</p>
                <h3 className="mt-1 text-base font-semibold" style={{ color: TEXT }}>{card.title}</h3>
              </div>
            </div>
            <StatusPill tone={card.tone}>{card.statusLabel}</StatusPill>
          </div>
          <div className={`flex-1 ${card.featured ? 'min-h-[104px]' : 'min-h-[88px]'}`}>
            <div className="mb-2">
              <p
                className={`font-semibold tracking-tight ${card.featured ? 'text-2xl sm:text-[1.7rem]' : 'text-[1.1rem]'}`}
                style={{ color: card.tone === 'slate' ? TEXT : TONES[card.tone].text }}
              >
                {card.value}
              </p>
              {card.support && (
                <p className="mt-1 text-sm leading-snug" style={{ color: '#334155' }}>
                  {card.support}
                </p>
              )}
            </div>
            <CardPreview card={card} agentType={agentType} pnlFacts={pnlFacts} goldrattFacts={goldrattFacts} accent={accent} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 pt-1.5">
            <p className="text-[11px] leading-relaxed" style={{ color: TEXT2 }}>
              {card.statusLabel}
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

function GoldrattInfoBlock({ facts }: { facts: GoldrattFacts | null }) {
  return (
    <section className="mb-4 rounded-3xl border p-3.5 sm:p-4" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
      <div className="mb-3 flex items-start gap-2">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0" style={{ color: PRIMARY_BLUE }} />
        <div>
          <h2 className="text-sm font-semibold sm:text-base" style={{ color: TEXT }}>
            Что важно знать перед чтением
          </h2>
          <p className="mt-1 max-w-5xl text-sm leading-relaxed" style={{ color: TEXT2 }}>
            Это не BI-отчёт по идеальной CRM. Разбор по Голдратту ищет одно главное ограничение системы: что сейчас сильнее всего мешает потоку денег расти быстрее.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Основа вывода', value: 'Контекст предпринимателя, описание боли и документы, если они приложены.', tone: 'blue' as Tone },
          { label: 'Что ищем', value: 'Не список проблем, а одно ограничение, которому нужно подчинить решения.', tone: 'indigo' as Tone },
          { label: 'Уровень уверенности', value: `${facts?.confidenceLabel ?? 'средний'}: вывод основан на контексте, а не на полной CRM-карте процесса.`, tone: 'slate' as Tone },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border px-3 py-2.5" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: TONES[item.tone].text }}>{item.label}</p>
            <p className="mt-1 text-sm leading-snug" style={{ color: TEXT }}>{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function GoldrattDashboard({
  cards,
  facts,
  accent,
  onOpen,
}: {
  cards: DetailCard[]
  facts: GoldrattFacts
  accent: string
  onOpen: (id: string) => void
}) {
  const openFromKeyboard = (event: ReactKeyboardEvent<HTMLElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(id)
    }
  }

  const byId = (id: string) => cards.find((card) => card.id === id) ?? null
  const sequence = ['constraint', 'exploit', 'donot'] as const

  return (
    <div className="space-y-4">
      {sequence.map((id) => {
        const card = byId(id)
        if (!card) return null
        const isFullWidth = id === 'exploit' || id === 'donot'

        if (!isFullWidth) {
          return (
          <div key={card.id} className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <article
              role="button"
              tabIndex={0}
              onClick={() => onOpen(card.id)}
              onKeyDown={(event) => openFromKeyboard(event, card.id)}
              className="flex h-full flex-col rounded-3xl border p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}
            >
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <IconBadge icon={card.icon} tone={card.tone} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>{card.kicker}</p>
                    <h3 className="mt-1 text-base font-semibold" style={{ color: TEXT }}>{card.title}</h3>
                  </div>
                </div>
                <StatusPill tone={card.tone}>{card.statusLabel}</StatusPill>
              </div>
              <div className="flex-1">
                <div className="mb-2">
                  <p className={`font-semibold tracking-tight ${card.featured ? 'text-2xl sm:text-[1.7rem]' : 'text-[1.1rem]'}`} style={{ color: card.tone === 'slate' ? TEXT : TONES[card.tone].text }}>
                    {card.value}
                  </p>
                  {card.support && <p className="mt-1 text-sm leading-snug" style={{ color: '#334155' }}>{card.support}</p>}
                </div>
                <CardPreview card={card} agentType="goldratt" pnlFacts={null} goldrattFacts={facts} accent={accent} />
              </div>
              <div className="mt-2 flex items-center justify-end gap-3 pt-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpen(card.id)
                  }}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
                  style={{ color: accent }}
                >
                  Что это значит
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
            <div className="h-full">
              <GoldrattActionCard card={card} />
            </div>
          </div>
        )
        }

        return (
          <article
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(card.id)}
            onKeyDown={(event) => openFromKeyboard(event, card.id)}
            className="flex flex-col rounded-3xl border p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}
          >
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <IconBadge icon={card.icon} tone={card.tone} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>{card.kicker}</p>
                  <h3 className="mt-1 text-base font-semibold" style={{ color: TEXT }}>{card.title}</h3>
                </div>
              </div>
              <StatusPill tone={card.tone}>{card.statusLabel}</StatusPill>
            </div>
            <div className="flex-1">
              <div className="mb-2">
                <p className="text-[1.1rem] font-semibold tracking-tight" style={{ color: card.tone === 'slate' ? TEXT : TONES[card.tone].text }}>
                  {card.value}
                </p>
                {card.support && <p className="mt-1 text-sm leading-snug" style={{ color: '#334155' }}>{card.support}</p>}
              </div>
              <CardPreview card={card} agentType="goldratt" pnlFacts={null} goldrattFacts={facts} accent={accent} />
            </div>
            <div className="mt-2 flex items-center justify-end gap-3 pt-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpen(card.id)
                }}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
                style={{ color: accent }}
              >
                Что это значит
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </article>
        )
      })}
    </div>
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
    if (card.id === 'trend-anomalies') {
      return <InteractiveTrendChart labels={pnlFacts.monthLabels} revenue={pnlFacts.revenueSeries} profit={pnlFacts.profitSeries} />
    }
    if (card.id === 'profit-drag') {
      return (
        <div className="space-y-4 rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricChip label="База" value={`${formatCurrency(pnlFacts.expenseBreakdown.slice(0, 3).reduce((sum, item) => sum + (item.amount ?? 0), 0), true)}/мес`} tone="red" />
            <MetricChip label="Разрыв" value={formatCurrency(pnlFacts.gapToBreakeven, true)} tone="amber" />
            <MetricChip label="Порог" value={formatCurrency(pnlFacts.breakevenRevenue, true)} tone="slate" />
          </div>
          <ExpensePreview items={pnlFacts.expenseBreakdown} />
          <p className="text-[11px] leading-relaxed" style={{ color: TEXT3 }}>
            Проценты рассчитаны от средней выручки, а не от суммы расходов. Поэтому сумма может быть больше или меньше 100% — это нагрузка на оборот, а не структура pie chart.
          </p>
        </div>
      )
    }
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
            <span className="inline-flex w-fit rounded-full px-2.5 py-1" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
              База {formatCurrency(top3Amt, true)}/мес
            </span>
            <span style={{ color: TEXT3 }}>→</span>
            <span className="inline-flex w-fit rounded-full px-2.5 py-1" style={{ background: '#FEF3C7', color: '#92400E' }}>
              Порог {formatCurrency(pnlFacts.breakevenRevenue, true)}
            </span>
            <span style={{ color: TEXT3 }}>→</span>
            <span className="inline-flex w-fit rounded-full px-2.5 py-1" style={{ background: '#EEF2FF', color: '#3730A3' }}>
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
      return <ScenarioPlanPanel />
    }
    if (card.id === 'limitations') {
      return <LimitationsPanel sourceWarning={card.note} />
    }
  }

  if (agentType === 'goldratt' && goldrattFacts) {
    switch (card.id) {
      case 'constraint':
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricChip label="Узкое место" value={goldrattFacts.flowStages.find((s) => s.isBottleneck)?.label ?? 'Ключевой этап'} tone="red" />
              <MetricChip label="Доказательств" value={`${goldrattFacts.evidenceItems.length} симптомов`} tone="amber" />
              <MetricChip label="Усилителей" value={`${goldrattFacts.amplifiers.length} факторов`} tone="red" />
              <MetricChip label="Первый горизонт" value="7 дней" tone="indigo" />
            </div>
            {goldrattFacts.evidenceItems.length > 0 && (
              <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>Главные доказательства</p>
                <NumberedPreview items={goldrattFacts.evidenceItems.slice(0, 4)} />
              </div>
            )}
          </div>
        )
      case 'flow':
        return (
          <div className="space-y-3">
            <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>Этапы процесса</p>
              <FlowPipelineChart stages={goldrattFacts.flowStages} />
            </div>
            <div className="rounded-3xl border p-4 text-sm leading-relaxed" style={{ borderColor: BORDER, background: '#FBFCFE', color: TEXT2 }}>
              До узкого места входы накапливаются в очередь. На узком месте — перегрузка и ручная работа. После него следующие этапы простаивают. Занятость команды ≠ скорость системы.
            </div>
          </div>
        )
      case 'evidence':
        return (
          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>Доказательства ограничения</p>
            <NumberedPreview items={goldrattFacts.evidenceItems.length > 0 ? goldrattFacts.evidenceItems : [
              'Перед этапом скопилась очередь — входы ждут более 2 дней.',
              'После этапа — ожидание: следующие шаги простаивают.',
              'Добавление входящего потока ухудшает ситуацию.',
              'Сроки срываются именно здесь.',
            ]} />
          </div>
        )
      case 'amplifiers':
        return (
          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>Что усиливает узкое место</p>
            <BulletPreview items={goldrattFacts.amplifiers.length > 0 ? goldrattFacts.amplifiers : [
              'Ручная работа без предварительного фильтра.',
              'Переключения между несколькими задачами.',
              'Неполные входные данные от клиентов.',
              'Отсутствие стандарта входной информации.',
            ]} />
          </div>
        )
      case 'donot':
        return (
          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#B45309' }}>Не делать сейчас</p>
            <BulletPreview items={goldrattFacts.doNotOptimize.length > 0 ? goldrattFacts.doNotOptimize : [
              'Не покупать больше лидов и заявок.',
              'Не нанимать людей без изменения процесса.',
              'Не требовать от команды «просто работать быстрее».',
              'Не оптимизировать этапы после ограничения.',
            ]} />
          </div>
        )
      case 'exploit':
        return (
          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#166534' }}>Как использовать ограничение</p>
            <NumberedPreview items={goldrattFacts.exploitActions.length > 0 ? goldrattFacts.exploitActions : [
              'Ввести чек-лист входной заявки.',
              'Настроить предфильтр: неподходящие не доходят до ключевого этапа.',
              'Выделить отдельный слот для ключевой работы.',
              'Убрать переключения: фокус на 1–2 задачи.',
            ]} />
          </div>
        )
      case 'elevate':
        return (
          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: PRIMARY_BLUE }}>Как расширить ограничение</p>
            <BulletPreview items={goldrattFacts.elevateActions.length > 0 ? goldrattFacts.elevateActions : [
              'Выделить ассистента для первичного скрининга.',
              'Автоматизировать часть разбора с помощью AI.',
              'Ввести scoring входящих по профилю.',
              'Разделить квалификацию на быстрый фильтр и экспертную оценку.',
            ]} />
          </div>
        )
      case 'actions':
        return <GoldrattActionPlanPanel facts={goldrattFacts} />
      default:
        return (
          <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
            <GoldrattLimitationsPanel facts={goldrattFacts} />
          </div>
        )
    }
  }

  return (
    <div className="rounded-3xl border p-4" style={{ borderColor: BORDER, background: '#FBFCFE' }}>
      <BulletPreview items={card.bullets.slice(0, 3)} />
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
  const isPnl = agentType === 'pnl'
  return (
    <ModalShell open={open} title={card.detailTitle} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
            style={{ borderColor: BORDER, background: '#F8FAFC', color: card.tone === 'slate' ? TEXT : TONES[card.tone].text }}
          >
            <card.icon className="h-4 w-4" />
          </div>
          <div>
            <StatusPill tone={card.tone}>{card.statusLabel}</StatusPill>
            <p className="mt-2.5 text-lg font-semibold leading-snug" style={{ color: TEXT }}>{card.detailLead}</p>
            {!isPnl && card.note && (
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: TEXT2 }}>{card.note}</p>
            )}
          </div>
        </div>

        {isPnl && <DetailVisual card={card} agentType={agentType} pnlFacts={pnlFacts} goldrattFacts={goldrattFacts} accent={accent} />}

        {bullets.length > 0 && (
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
      </div>
    </ModalShell>
  )
}

function makeMarkdownComponents() {
  return {
    h2: ({ children }: { children?: ReactNode }) => (
      <h2 className="mb-3 mt-8 text-[1.2rem] font-semibold tracking-tight first:mt-0" style={{ color: TEXT }}>
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h3 className="mb-2.5 mt-6 text-[1.02rem] font-semibold tracking-tight" style={{ color: TEXT }}>
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: ReactNode }) => (
      <h4 className="mb-2 mt-4 text-[0.95rem] font-semibold" style={{ color: TEXT }}>
        {children}
      </h4>
    ),
    p: ({ children }: { children?: ReactNode }) => (
      <p className="mb-3 text-[0.98rem] leading-[1.72]" style={{ color: '#334155' }}>
        {children}
      </p>
    ),
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className="mb-4 space-y-2.5 pl-0">{children}</ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="mb-4 space-y-2.5 pl-0">{children}</ol>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li className="ml-0 flex gap-2.5 text-[0.97rem] leading-[1.68]" style={{ color: '#334155' }}>
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#93C5FD' }} />
        <span>{children}</span>
      </li>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div className="report-table my-5 overflow-x-auto rounded-2xl border shadow-[0_8px_20px_rgba(15,23,42,0.04)]" style={{ borderColor: BORDER }}>
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
    hr: () => <hr className="my-6 border-0 border-t" style={{ borderColor: BORDER_SOFT }} />,
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="font-semibold" style={{ color: TEXT }}>
        {children}
      </strong>
    ),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _SourceTableBlock({
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

function SourceTableBlockV2({
  source,
  expanded,
  onToggleExpanded,
}: {
  source: ParsedSource | null
  expanded: boolean
  onToggleExpanded: () => void
}) {
  const [showScoreInfo, setShowScoreInfo] = useState(false)

  if (!source || source.rows.length === 0) return null

  const currencySymbol = detectCurrencySymbol(source)
  const tableRows = source.rows.filter((row) => row.length > 1 && row.some((cell) => cell.trim()))
  if (tableRows.length === 0) return null

  const visibleRows = expanded ? tableRows : tableRows.slice(0, 12)
  const hasMore = tableRows.length > visibleRows.length
  const warnings = source.metadata['Предупреждения']
  const score = source.metadata['Quality score']
  const fileName = source.metadata['Источник'] ?? source.metadata.Source ?? 'Источник не записан'
  const sheetName = source.metadata['Лист'] ?? source.metadata.Sheet ?? 'Не указан'
  const rowCount = source.metadata['Строк'] ?? source.metadata.Rows ?? String(tableRows.length)
  const columnCount = source.metadata['Колонок'] ?? source.metadata.Columns ?? String(tableRows[0]?.length ?? 0)

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)' }}>
      <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: BORDER_SOFT }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT2 }}>
              Проверка исходных данных
            </p>
            <h2 className="mt-1 text-[0.98rem] font-semibold" style={{ color: TEXT }}>
              Данные, использованные для анализа
            </h2>
            <p className="mt-1 text-sm leading-snug" style={{ color: TEXT2 }}>
              Это исходные строки, на которых построены расчёты. Проверьте, что выбран правильный лист и нужные периоды.
            </p>
          </div>
          {score && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <StatusPill tone="blue">Оценка качества: {score}</StatusPill>
                <button
                  type="button"
                  onClick={() => setShowScoreInfo((v) => !v)}
                  className="flex h-5 w-5 items-center justify-center rounded-full border transition-colors"
                  style={{ borderColor: '#BFDBFE', background: showScoreInfo ? '#DBEAFE' : '#EFF6FF', color: PRIMARY_BLUE }}
                  title="Что означает оценка качества"
                  aria-expanded={showScoreInfo}
                  aria-label="Подробнее об оценке качества"
                >
                  <Info className="h-3 w-3" />
                </button>
              </div>
              <span className="text-[10px]" style={{ color: TEXT3 }}>пригодность данных для анализа</span>
            </div>
          )}
        </div>
        {score && showScoreInfo && (
          <div className="mt-3 rounded-2xl border px-3 py-2.5 text-[11px] leading-relaxed" style={{ background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E40AF' }}>
            <span className="font-semibold">Оценка качества — это не оценка бизнеса.</span> Алгоритм проверяет, пригодна ли таблица для разбора: найдены ли выручка, расходы, прибыль, периоды, ненулевые значения и достаточный объём данных.{' '}
            <span className="font-semibold">{score}/100</span> — данных достаточно для управленческого анализа. Без P&L по клубам, трафика и расшифровки УК часть выводов остаётся предварительной.
          </div>
        )}
      </div>

      <div className="space-y-3 px-4 py-3.5 sm:px-5">
        <div className="grid min-w-0 gap-2 text-xs sm:grid-cols-5">
          {([
            ['Файл', fileName, 'sm:col-span-2'],
            ['Лист', sheetName, ''],
            ['Строки', rowCount, ''],
            ['Колонки', columnCount, ''],
          ] as [string, string, string][]).map(([label, value, colSpan]) => (
            <div key={label} className={`min-w-0 overflow-hidden rounded-2xl border px-3 py-2${colSpan ? ` ${colSpan}` : ''}`} style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
              <p className="font-semibold" style={{ color: TEXT3 }}>{label}</p>
              <p className="mt-1 max-w-full truncate font-medium" style={{ color: TEXT }} title={value}>{value}</p>
            </div>
          ))}
        </div>

        {warnings && warnings.toLowerCase() !== 'нет' && (
          <div className="rounded-2xl border px-3 py-2 text-xs" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>
            {warnings}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: BORDER }}>
          <table className="min-w-[960px] w-full border-collapse text-xs">
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-50 font-semibold' : undefined}>
                  {row.slice(0, 16).map((cell, cellIndex) => {
                    const label = row[0] ?? ''
                    const formatted = cellIndex === 0 || rowIndex === 0 ? (cell.trim() || '—') : formatSourceCell(label, cell, currencySymbol)
                    const numeric = cellIndex > 0 && looksNumericCell(cell) && !isPercentLabel(label)
                    return (
                      <td
                        key={`${rowIndex}-${cellIndex}`}
                        className={`${cellIndex === 0 ? 'sticky left-0 z-10 min-w-[220px] max-w-[280px]' : 'min-w-[110px]'} border-b border-r px-3 py-2 align-top ${numeric ? 'text-right font-medium tabular-nums' : ''}`}
                        style={{
                          borderColor: BORDER_SOFT,
                          color: TEXT,
                          background: cellIndex === 0 ? (rowIndex === 0 ? '#F8FAFC' : CARD) : undefined,
                        }}
                      >
                        <span className={cellIndex === 0 ? 'block whitespace-normal break-words' : 'block whitespace-nowrap'}>
                          {formatted}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(hasMore || expanded) && (
          <button type="button" onClick={onToggleExpanded} className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
            {expanded ? 'Скрыть таблицу' : `Показать таблицу (${tableRows.length} строк)`}
          </button>
        )}
      </div>
    </section>
  )
}

function FullReportBlock({ report }: { report: string }) {
  const components = makeMarkdownComponents()
  return (
    <section className="rounded-3xl border p-5 sm:p-6" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 14px 34px rgba(15, 23, 42, 0.06)' }}>
      <div className="mb-5 border-b pb-4" style={{ borderColor: BORDER_SOFT }}>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT2 }}>
          Исходный текст анализа
        </p>
        <h2 className="mt-1 text-lg font-semibold" style={{ color: TEXT }}>
          Полная текстовая версия анализа
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: TEXT2 }}>
          Этот блок содержит полный текстовый вариант AI-анализа. Основной управленческий обзор — карточки выше — удобнее для навигации и принятия решений. Текстовая версия полезна для детального изучения и копирования.
        </p>
      </div>
      <div className="mx-auto max-w-[960px]">
        <article className="rounded-3xl border bg-white px-5 py-5 sm:px-8 sm:py-7" style={{ borderColor: BORDER_SOFT }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {sanitizeMarkdownForDisplay(report)}
        </ReactMarkdown>
        </article>
      </div>
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
  const goldrattFacts = useMemo(() => (data.agentType === 'goldratt' ? buildGoldrattFacts(data.report, sections, data.sourceText) : null), [data.agentType, data.report, sections, data.sourceText])
  const cards = useMemo(
    () => (data.agentType === 'pnl' && pnlFacts ? buildPnlDashboardCardsV2(pnlFacts) : goldrattFacts ? buildGoldrattDashboardCards(goldrattFacts) : []),
    [data.agentType, goldrattFacts, pnlFacts],
  )

  const [copiedReport, setCopiedReport] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [showFullReport, setShowFullReport] = useState(false)
  const [sourceExpanded, setSourceExpanded] = useState(false)
  const fullReportRef = useRef<HTMLDivElement>(null)

  const modelLabel = isDemo ? 'Демо-отчёт' : data.modelUsed || 'Модель не записана'
  const openCard = cards.find((card) => card.id === openCardId) ?? null

  function toggleFullReport() {
    const wasHidden = !showFullReport
    setShowFullReport((v) => !v)
    if (wasHidden) {
      setTimeout(() => {
        fullReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    }
  }

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
        {data.agentType === 'pnl' ? (
          <>
            <IntroBlockV2 agentType={data.agentType} />
            <DashboardCards
              cards={cards}
              agentType={data.agentType}
              pnlFacts={pnlFacts}
              goldrattFacts={goldrattFacts}
              accent={meta.accent}
              onOpen={setOpenCardId}
            />
          </>
        ) : (
          <>
            <GoldrattInfoBlock facts={goldrattFacts} />
            {goldrattFacts && (
              <GoldrattDashboard
                cards={cards}
                facts={goldrattFacts}
                accent={meta.accent}
                onOpen={setOpenCardId}
              />
            )}
          </>
        )}

        {data.agentType === 'pnl' && source && (
          <div className="mt-4">
            <SourceTableBlockV2 source={source} expanded={sourceExpanded} onToggleExpanded={() => setSourceExpanded((value) => !value)} />
          </div>
        )}
        {data.agentType === 'goldratt' && goldrattFacts && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
            <p className="max-w-2xl text-[11px] leading-relaxed" style={{ color: TEXT2 }}>
              <span className="font-semibold" style={{ color: TEXT }}>Уверенность: {goldrattFacts.confidenceLabel}.</span>{' '}
              {goldrattFacts.confidenceNote}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['P&L', 'CRM / воронка', 'Список проектов', 'Роли', 'Загрузка команды'].map((item) => (
                <span key={item} className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ background: CARD, borderColor: BORDER_SOFT, color: TEXT3 }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Полный текстовый отчёт — всегда внизу, кнопка рядом с контентом */}
        <div ref={fullReportRef} className="mt-6 scroll-mt-6">
          <div className="flex justify-center print:hidden">
            <button
              type="button"
              onClick={toggleFullReport}
              className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50"
              style={{ borderColor: BORDER, color: TEXT2, background: '#FFFFFF' }}
            >
              {showFullReport ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              {showFullReport ? 'Скрыть исходную AI-версию отчёта' : 'Показать исходную AI-версию отчёта'}
            </button>
          </div>
          {showFullReport && (
            <div className="mt-4">
              <FullReportBlock report={data.report} />
            </div>
          )}
        </div>

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

