'use client'

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  CircleDollarSign,
  Copy,
  FileText,
  Gauge,
  Link2,
  Printer,
  Target,
  TrendingUp,
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
  green: { bg: '#ECFDF5', text: '#047857', border: '#BBF7D0', fill: '#10B981' },
  amber: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', fill: '#F59E0B' },
  red: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', fill: '#EF4444' },
  blue: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', fill: '#3B82F6' },
  indigo: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', fill: '#4F46E5' },
  violet: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', fill: '#7C3AED' },
  slate: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', fill: '#64748B' },
} as const

type Tone = keyof typeof TONES

const AGENT_META = {
  pnl: {
    badge: 'Financial Analysis',
    title: 'P&L-отчёт',
    subtitle: 'Финансовый разбор прибыльности бизнеса',
    icon: BarChart3,
    accent: PRIMARY_BLUE,
    accentLight: '#60A5FA',
    accentBg: '#EFF6FF',
    accentBorder: '#BFDBFE',
    badgeBg: '#EFF6FF',
    badgeText: '#1D4ED8',
    sectionBorderColor: '#3B82F6',
  },
  goldratt: {
    badge: 'Goldratt / TOC',
    title: 'Отчёт по ограничению',
    subtitle: 'Анализ главного системного ограничения бизнеса',
    icon: Target,
    accent: INDIGO,
    accentLight: '#818CF8',
    accentBg: '#EEF2FF',
    accentBorder: '#C7D2FE',
    badgeBg: '#EEF2FF',
    badgeText: '#3730A3',
    sectionBorderColor: '#A5B4FC',
  },
} as const

interface ReportSection {
  id: string
  heading: string
  shortHeading: string
  content: string
}

interface SummaryItem {
  label: string
  value: string
  helper: string
  tone: Tone
  icon: LucideIcon
}

interface InsightItem {
  label: string
  value: string
  tone: Tone
  icon: LucideIcon
}

interface ParsedReport {
  summary: SummaryItem[]
  insights: InsightItem[]
  revenueSeries: number[]
  profitSeries: number[]
  expenseBars: { label: string; value: number; tone: Tone }[]
  targetProgress: number
  severity: number
  priorityActions: string[]
}

function toSlug(text: string): string {
  return (
    text
      .replace(/\p{Emoji_Presentation}/gu, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
      .replace(/[^\w\s-а-яёА-ЯЁ]/gi, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'section-' + Math.random().toString(36).slice(2, 7)
  )
}

function cleanText(text: string): string {
  return text
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
    .replace(/[*_`>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeMarkdownForDisplay(markdown: string): string {
  return markdown
    .replace(/🔴/g, 'Critical')
    .replace(/🟡/g, 'Warning')
    .replace(/🟢/g, 'Good')
    .replace(/✅/g, 'High confidence')
    .replace(/⚠️|⚠/g, 'Warning')
    .replace(/🎯/g, 'Target')
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
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

function parseSourceText(sourceText?: string | null) {
  if (!sourceText?.trim()) return null
  const [metaPart, tablePart = ''] = sourceText.split('=== Очищенная таблица для анализа ===')
  const metaLines = metaPart.split('\n').map((line) => line.trim()).filter(Boolean)
  const metadata: Record<string, string> = {}

  metaLines.forEach((line) => {
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

function statusLabel(text: string): string {
  const value = text.toLowerCase()
  if (/critical|крит|risk|риск|red/.test(value)) return 'Risk'
  if (/warning|check|средн|тревог|вниман|amber/.test(value)) return 'Check'
  if (/high confidence|высокая уверен|ok|good|норм|green/.test(value)) return 'High'
  if (/medium confidence|предполож|info/.test(value)) return 'Info'
  return 'Info'
}

function toneLabel(tone: Tone): string {
  if (tone === 'red') return 'Risk'
  if (tone === 'amber') return 'Check'
  if (tone === 'green') return 'Good'
  if (tone === 'blue' || tone === 'indigo' || tone === 'violet') return 'Info'
  return 'Info'
}

function safeMetricValue(value: string, fallback = 'См. отчёт'): string {
  const cleaned = cleanText(value)
  if (!cleaned || /^[₽$€%.,\s\-−—]+$/.test(cleaned)) return fallback
  if (/^(руб|₽|%|n\/a)$/i.test(cleaned)) return fallback

  const numberMatch = cleaned.match(/-?\d[\d\s.,]*/)
  const hasCurrency = /₽|руб/i.test(cleaned)
  if (numberMatch && hasCurrency) {
    const amount = Number(numberMatch[0].replace(/\s/g, '').replace(',', '.'))
    if (Number.isFinite(amount)) {
      if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)} млн ₽`
      if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)} тыс ₽`
    }
  }

  return cleaned.length > 112 ? cleaned.slice(0, 109).trim() + '...' : cleaned
}

function safeInsightValue(value: string, fallback: string): string {
  const cleaned = safeMetricValue(value, fallback)
  if (/приоритет\s+действие|почему\s+ожидаемый эффект|показатель\s+январь|метрика\s+срок/i.test(cleaned)) {
    return fallback
  }
  return cleaned
}

function shortTitle(heading: string): string {
  const stripped = cleanText(heading)
  const isAllCaps = stripped === stripped.toUpperCase() && stripped.length > 4
  const display = isAllCaps
    ? stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase()
    : stripped
  return display.length > 34 ? display.slice(0, 31) + '...' : display
}

function splitIntoSections(markdown: string): ReportSection[] {
  const lines = markdown.split('\n')
  const sections: ReportSection[] = []
  let current: { heading: string; lines: string[] } | null = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) {
        sections.push({
          id: toSlug(current.heading),
          heading: current.heading,
          shortHeading: shortTitle(current.heading),
          content: current.lines.join('\n').trim(),
        })
      }
      current = { heading: line.replace(/^## /, '').trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }

  if (current) {
    sections.push({
      id: toSlug(current.heading),
      heading: current.heading,
      shortHeading: shortTitle(current.heading),
      content: current.lines.join('\n').trim(),
    })
  }

  return sections
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findSection(markdown: string, labels: string[]): string {
  const sections = splitIntoSections(markdown)
  const found = sections.find((section) => {
    const heading = cleanText(section.heading).toLowerCase()
    return labels.some((label) => heading.includes(label.toLowerCase()))
  })
  return found?.content ?? markdown
}

function extractLine(markdown: string, labels: string[]): string | null {
  const lines = markdown.split('\n')

  for (const label of labels) {
    const escaped = escapeRegExp(label)
    const strongRegex = new RegExp(`\\*\\*\\s*${escaped}\\s*:?\\s*\\*\\*\\s*([^\\n]+)`, 'i')
    const plainRegex = new RegExp(`${escaped}\\s*[:—-]\\s*([^\\n]+)`, 'i')
    const rowRegex = new RegExp(`^\\|\\s*[^|]*${escaped}[^|]*\\|(.+)\\|\\s*$`, 'i')

    for (const line of lines) {
      const strong = line.match(strongRegex)
      if (strong?.[1]) return cleanText(strong[1])

      const plain = line.match(plainRegex)
      if (plain?.[1]) return cleanText(plain[1])

      const row = line.match(rowRegex)
      if (row?.[1]) {
        const cells = row[1].split('|').map(cleanText).filter(Boolean)
        if (cells.length) return cells[cells.length - 1]
      }
    }
  }

  return null
}

function extractFirstSentence(markdown: string, labels: string[], fallback: string): string {
  const section = findSection(markdown, labels)
  const line = extractLine(section, labels)
  const source = line || cleanText(section.split('\n').find((item) => cleanText(item).length > 35) ?? '')
  if (!source) return fallback
  const sentence = source.split(/(?<=[.!?])\s+/)[0] || source
  return sentence.length > 132 ? sentence.slice(0, 129).trim() + '...' : sentence
}

function extractLastNumberFromRow(markdown: string, labels: string[]): string | null {
  const lines = markdown.split('\n')
  for (const label of labels) {
    const escaped = escapeRegExp(label)
    const row = lines.find((line) => new RegExp(`^\\|\\s*[^|]*${escaped}`, 'i').test(line))
    if (!row) continue

    const cells = row.split('|').map(cleanText).filter(Boolean)
    const numeric = cells.filter((cell) => /[\d]+(?:[.,]\d+)?\s*(?:%|₽|руб|млн|тыс|k|m)?/i.test(cell))
    if (numeric.length) return numeric[numeric.length - 1]
  }
  return null
}

function extractPercent(markdown: string, labels: string[], fallback: number): number {
  const source = labels.map((label) => extractLine(markdown, [label]) ?? '').join(' ')
  const fromLine = source.match(/(-?\d+(?:[.,]\d+)?)\s*%/)
  if (fromLine) return Number(fromLine[1].replace(',', '.'))

  for (const label of labels) {
    const rowValue = extractLastNumberFromRow(markdown, [label])
    const match = rowValue?.match(/(-?\d+(?:[.,]\d+)?)\s*%/)
    if (match) return Number(match[1].replace(',', '.'))
  }

  const generic = markdown.match(/(?:марж|margin|рентабельност)[^\n]{0,80}?(-?\d+(?:[.,]\d+)?)\s*%/i)
  return generic ? Number(generic[1].replace(',', '.')) : fallback
}

function extractSeries(markdown: string, label: string, fallback: number[]): number[] {
  const lines = markdown.split('\n')
  const row = lines.find((line) => new RegExp(`^\\|\\s*[^|]*${escapeRegExp(label)}`, 'i').test(line))
  if (!row) return fallback

  const values = row
    .split('|')
    .map((cell) => cell.match(/(-?\d[\d\s.,]*)/))
    .filter(Boolean)
    .map((match) => Number(match?.[1].replace(/\s/g, '').replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value > 0)

  return values.length >= 2 ? values.slice(0, 5) : fallback
}

function detectTone(text: string): Tone {
  const value = text.toLowerCase()
  if (/крит|critical|risk|🔴|red|риск|низк|плохо/.test(value)) return 'red'
  if (/средн|warning|check|amber|желт|🟡|тревог|вниман/.test(value)) return 'amber'
  if (/high confidence|хорош|good|green|🟢|✅|высокая уверен|норм/.test(value)) return 'green'
  return 'blue'
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function parsePriorityActions(markdown: string, fallback: string[]): string[] {
  const section = findSection(markdown, ['план действий', 'рекомендации', 'first action', 'первое действие'])
  const lines = section
    .split('\n')
    .map(cleanText)
    .filter((line) => /^(\d+\.|-)\s*/.test(line) || line.length > 45)
    .map((line) => line.replace(/^(\d+\.|-)\s*/, '').trim())
    .filter((line) => line.length > 0)

  return [...lines, ...fallback].slice(0, 3).map((line) =>
    line.length > 74 ? line.slice(0, 71).trim() + '...' : line,
  )
}

function buildParsedReport(markdown: string, agentType: ReportPageData['agentType']): ParsedReport {
  const margin = extractPercent(markdown, ['Чистая маржа', 'Маржа', 'Net margin'], agentType === 'pnl' ? 7 : 55)
  const targetMargin = extractPercent(markdown, ['Целевая маржа', 'Целевая рентабельность', 'Target margin'], agentType === 'pnl' ? 20 : 75)
  const targetProgress = targetMargin > 0 ? clamp((margin / targetMargin) * 100) : 45

  if (agentType === 'pnl') {
    const revenue = extractLastNumberFromRow(markdown, ['Выручка']) || extractLine(markdown, ['Выручка']) || 'Из отчёта'
    const profit =
      extractLastNumberFromRow(markdown, ['Чистая прибыль', 'Операционная прибыль']) ||
      extractLine(markdown, ['Чистая прибыль', 'Операционная прибыль']) ||
      'См. раздел'
    const bottleneck =
      extractLine(markdown, ['Главный financial bottleneck', 'Главный финансовый bottleneck', 'Главная финансовая проблема']) ||
      extractFirstSentence(markdown, ['главный финансовый bottleneck', 'главный диагноз'], 'Определено AI')
    const status = extractLine(markdown, ['Статус']) || 'Generated report'
    const firstStep = extractFirstSentence(markdown, ['рекомендации', 'план действий'], 'Сначала устранить главный финансовый разрыв.')
    const doNotTouch = extractFirstSentence(
      markdown,
      ['что не нужно оптимизировать', 'что не трогать'],
      'Не распылять фокус на вторичные расходы до проверки bottleneck.',
    )

    return {
      summary: [
        { label: 'Выручка', value: revenue, helper: 'последний доступный период', tone: 'blue', icon: CircleDollarSign },
        { label: 'Чистая прибыль', value: profit, helper: 'из P&L таблиц', tone: detectTone(profit), icon: TrendingUp },
        { label: 'Маржа', value: `${margin}%`, helper: 'текущий уровень', tone: margin < 10 ? 'red' : margin < 18 ? 'amber' : 'green', icon: Gauge },
        { label: 'Целевая маржа', value: `${targetMargin}%`, helper: 'ориентир отчёта', tone: 'green', icon: Target },
        { label: 'Financial bottleneck', value: bottleneck, helper: 'главный разрыв', tone: 'red', icon: AlertTriangle },
        { label: 'Статус', value: status, helper: 'Generated report', tone: detectTone(status), icon: CheckCircle },
      ],
      insights: [
        {
          label: 'Главная проблема',
          value: extractFirstSentence(markdown, ['главный финансовый bottleneck', 'главный диагноз'], 'Финансовая проблема определена AI из отчёта.'),
          tone: 'red',
          icon: AlertTriangle,
        },
        { label: 'Что сделать первым', value: firstStep, tone: 'blue', icon: Zap },
        { label: 'Что не трогать сейчас', value: doNotTouch, tone: 'amber', icon: Ban },
      ],
      revenueSeries: extractSeries(markdown, 'Выручка', [4.8, 5.1, 5.7]),
      profitSeries: extractSeries(markdown, 'Операционная прибыль', [0.34, 0.31, 0.34]),
      expenseBars: [
        { label: 'ФОТ', value: extractPercent(markdown, ['ФОТ'], 58), tone: 'blue' },
        { label: 'Маркетинг', value: extractPercent(markdown, ['Маркетинг'], 8), tone: 'indigo' },
        { label: 'Подрядчики', value: extractPercent(markdown, ['Подрядчики', 'субподряд'], 10), tone: 'amber' },
        { label: 'Аренда', value: extractPercent(markdown, ['Аренда'], 6), tone: 'slate' },
      ],
      targetProgress,
      severity: clamp(100 - targetProgress + 20),
      priorityActions: parsePriorityActions(markdown, [
        'Зафиксировать главный разрыв в марже',
        'Сократить влияние bottleneck на прибыль',
        'Проверить эффект через 30 дней',
      ]),
    }
  }

  const constraint =
    extractLine(markdown, ['Главное системное ограничение', 'Главное ограничение']) ||
    extractFirstSentence(markdown, ['главное ограничение', 'главный диагноз'], 'Определено AI')
  const risk = extractLine(markdown, ['Уровень риска']) || 'Средний / высокий'
  const ownerDependency = extractLine(markdown, ['Зависимость от собственника']) || 'См. раздел'
  const throughput = extractLine(markdown, ['Throughput', 'Пропускная способность']) || 'Из отчёта'
  const inventory = extractLine(markdown, ['Inventory / WIP', 'WIP', 'Inventory', 'незаверш']) || 'См. раздел'
  const firstAction = extractLine(markdown, ['Первое действие']) || extractFirstSentence(markdown, ['план действий', 'рекомендации'], 'Определено AI')
  const noise = extractFirstSentence(markdown, ['что является шумом', 'что не нужно оптимизировать'], 'Не усиливать вторичные процессы до снятия ограничения.')

  return {
    summary: [
      { label: 'Главное ограничение', value: constraint, helper: 'точка фокуса TOC', tone: 'red', icon: Target },
      { label: 'Уровень риска', value: risk, helper: 'оценка влияния', tone: detectTone(risk), icon: AlertTriangle },
      { label: 'Зависимость от собственника', value: ownerDependency, helper: 'управленческий bottleneck', tone: detectTone(ownerDependency), icon: Gauge },
      { label: 'Throughput', value: throughput, helper: 'пропускная способность', tone: 'blue', icon: Activity },
      { label: 'Inventory / WIP', value: inventory, helper: 'очереди и незавершёнка', tone: 'amber', icon: BarChart3 },
      { label: 'Первое действие', value: firstAction, helper: 'следующий шаг', tone: 'green', icon: Zap },
    ],
    insights: [
      { label: 'Системное ограничение', value: constraint, tone: 'red', icon: Target },
      { label: 'Что сделать первым', value: firstAction, tone: 'blue', icon: Zap },
      { label: 'Шум', value: noise, tone: 'amber', icon: Ban },
    ],
    revenueSeries: [42, 49, 44, 58, 62],
    profitSeries: [24, 28, 31, 34, 41],
    expenseBars: [
      { label: 'Constraint load', value: 78, tone: 'indigo' },
      { label: 'Decision queue', value: 64, tone: 'amber' },
      { label: 'Throughput reserve', value: 36, tone: 'blue' },
    ],
    targetProgress: 62,
    severity: detectTone(risk) === 'red' ? 82 : 68,
    priorityActions: parsePriorityActions(markdown, [
      'Найти и формализовать ограничение',
      'Подчинить систему ограничению',
      'Проверить прирост throughput',
    ]),
  }
}

function nodeToText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(nodeToText).join(' ')
  if (children && typeof children === 'object' && 'props' in children) {
    const element = children as { props?: { children?: ReactNode } }
    return nodeToText(element.props?.children)
  }
  return ''
}

function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const colors = TONES[tone]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none"
      style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.fill }} />
      {children}
    </span>
  )
}

function IconBadge({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  const colors = TONES[tone]
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
      style={{ background: colors.bg, borderColor: colors.border }}
    >
      <Icon className="h-4 w-4" style={{ color: colors.text }} />
    </div>
  )
}

function SummaryGrid({ items }: { items: SummaryItem[] }) {
  const primaryItems = items.slice(0, 4)
  const secondaryItems = items.slice(4)

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primaryItems.map((item, index) => {
          const colors = TONES[item.tone]
          const value = safeMetricValue(item.value)
          return (
            <div
              key={item.label}
              className="min-h-[132px] rounded-2xl border p-4"
              style={{
                background: index === 0 ? `linear-gradient(135deg, ${PRIMARY_BLUE}, ${INDIGO})` : CARD,
                borderColor: index === 0 ? '#3B82F6' : BORDER,
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
              }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <p
                  className="text-[0.68rem] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: index === 0 ? 'rgba(255,255,255,0.78)' : TEXT3 }}
                >
                  {item.label}
                </p>
                <div
                  className="rounded-xl p-2"
                  style={{ background: index === 0 ? 'rgba(255,255,255,0.16)' : colors.bg }}
                >
                  <item.icon className="h-4 w-4" style={{ color: index === 0 ? '#FFFFFF' : colors.text }} />
                </div>
              </div>
              <p
                className="line-clamp-2 text-[1.45rem] font-semibold leading-tight tracking-tight"
                style={{ color: index === 0 ? '#FFFFFF' : TEXT }}
              >
                {value}
              </p>
              <p className="mt-2 text-xs leading-snug" style={{ color: index === 0 ? 'rgba(255,255,255,0.72)' : TEXT2 }}>
                {item.helper}
              </p>
            </div>
          )
        })}
      </div>

      {secondaryItems.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {secondaryItems.map((item) => {
            const colors = TONES[item.tone]
            return (
              <div
                key={item.label}
                className="rounded-2xl border p-4"
                style={{ background: CARD, borderColor: BORDER, boxShadow: '0 8px 20px rgba(15, 23, 42, 0.045)' }}
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em]" style={{ color: TEXT3 }}>
                      {item.label}
                    </p>
                    <p className="mt-2 line-clamp-2 text-[0.95rem] font-semibold leading-snug" style={{ color: TEXT }}>
                      {safeMetricValue(item.value, 'Определено AI')}
                    </p>
                  </div>
                  <StatusPill tone={item.tone}>{toneLabel(item.tone)}</StatusPill>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: '#EEF2F7' }}>
                  <div className="h-full rounded-full" style={{ width: '62%', background: colors.fill }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Sparkline({
  revenue,
  profit,
  accent,
}: {
  revenue: number[]
  profit: number[]
  accent: string
}) {
  const width = 320
  const height = 118
  const all = [...revenue, ...profit]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const toPath = (values: number[]) =>
    values
      .map((value, index) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
        const y = height - ((value - min) / Math.max(max - min, 1)) * (height - 24) - 12
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')

  return (
    <div className="rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>
            Динамика
          </p>
          <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
            Выручка / прибыль
          </h3>
        </div>
        <TrendingUp className="h-5 w-5" style={{ color: accent }} />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible" role="img">
        {[0, 1, 2].map((item) => (
          <line
            key={item}
            x1="0"
            x2={width}
            y1={18 + item * 36}
            y2={18 + item * 36}
            stroke="#E2E8F0"
            strokeDasharray="4 6"
          />
        ))}
        <path d={toPath(revenue)} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d={toPath(profit)} fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="mt-2 flex gap-4 text-xs" style={{ color: TEXT2 }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
          Выручка
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: '#F59E0B' }} />
          Прибыль
        </span>
      </div>
    </div>
  )
}

function HorizontalBars({ bars }: { bars: { label: string; value: number; tone: Tone }[] }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>
            Структура
          </p>
          <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
            Расходы и нагрузка
          </h3>
        </div>
        <BarChart3 className="h-5 w-5" style={{ color: TEXT2 }} />
      </div>
      <div className="space-y-3">
        {bars.map((bar) => {
          const colors = TONES[bar.tone]
          return (
            <div key={bar.label}>
              <div className="mb-1.5 flex justify-between gap-3 text-xs">
                <span className="font-medium" style={{ color: TEXT }}>
                  {bar.label}
                </span>
                <span className="font-semibold" style={{ color: colors.text }}>
                  {bar.value}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full" style={{ background: '#EEF2F7' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${clamp(bar.value)}%`, background: colors.fill }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProgressPanel({ value, accent }: { value: number; accent: string }) {
  const tone: Tone = value < 45 ? 'red' : value < 75 ? 'amber' : 'green'
  const colors = TONES[tone]
  return (
    <div className="rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>
            Цель
          </p>
          <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
            До целевой маржи
          </h3>
        </div>
        <Target className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="mb-2 flex items-end justify-between">
        <span className="text-3xl font-bold tabular-nums" style={{ color: TEXT }}>
          {Math.round(value)}%
        </span>
        <StatusPill tone={tone}>{value < 75 ? 'Нужен фокус' : 'В зоне цели'}</StatusPill>
      </div>
      <div className="h-3 overflow-hidden rounded-full" style={{ background: '#EEF2F7' }}>
        <div className="h-full rounded-full" style={{ width: `${clamp(value)}%`, background: colors.fill }} />
      </div>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: TEXT2 }}>
        Индикатор показывает, насколько текущая маржа близка к целевой, даже если отчёт содержит только частичные данные.
      </p>
    </div>
  )
}

function FlowDiagram({ severity, accent }: { severity: number; accent: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>
            TOC flow
          </p>
          <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
            Throughput → Constraint → Profit
          </h3>
        </div>
        <Activity className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
        {['Throughput', 'Constraint', 'Profit'].map((label, index) => (
          <div
            key={label}
            className="rounded-lg border px-3 py-3 text-center"
            style={{
              background: index === 1 ? '#FEF2F2' : '#F8FAFC',
              borderColor: index === 1 ? '#FECACA' : BORDER_SOFT,
            }}
          >
            <p className="text-xs font-semibold" style={{ color: index === 1 ? '#B91C1C' : TEXT }}>
              {label}
            </p>
          </div>
        )).flatMap((item, index, array) =>
          index < array.length - 1
            ? [item, <ArrowRight key={`arrow-${index}`} className="h-4 w-4" style={{ color: TEXT3 }} />]
            : [item],
        )}
      </div>
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs">
          <span style={{ color: TEXT2 }}>Bottleneck severity</span>
          <span className="font-semibold" style={{ color: '#B91C1C' }}>
            {Math.round(severity)}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full" style={{ background: '#EEF2F7' }}>
          <div className="h-full rounded-full" style={{ width: `${clamp(severity)}%`, background: '#EF4444' }} />
        </div>
      </div>
    </div>
  )
}

function PriorityStack({ actions }: { actions: string[] }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>
            Priority stack
          </p>
          <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
            Первые действия
          </h3>
        </div>
        <Zap className="h-5 w-5" style={{ color: '#F59E0B' }} />
      </div>
      <div className="space-y-2.5">
        {actions.slice(0, 3).map((action, index) => (
          <div key={`${action}-${index}`} className="flex gap-3 rounded-lg border p-3" style={{ borderColor: BORDER_SOFT, background: '#FBFCFE' }}>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: index === 0 ? '#FEF3C7' : '#EEF2FF', color: index === 0 ? '#92400E' : '#3730A3' }}
            >
              {index + 1}
            </span>
            <p className="text-sm leading-snug" style={{ color: TEXT }}>
              {action}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardVisuals({
  parsed,
  agentType,
  accent,
}: {
  parsed: ParsedReport
  agentType: ReportPageData['agentType']
  accent: string
}) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {agentType === 'pnl' ? (
        <>
          <Sparkline revenue={parsed.revenueSeries} profit={parsed.profitSeries} accent={accent} />
          <HorizontalBars bars={parsed.expenseBars} />
          <ProgressPanel value={parsed.targetProgress} accent={accent} />
        </>
      ) : (
        <>
          <FlowDiagram severity={parsed.severity} accent={accent} />
          <HorizontalBars bars={parsed.expenseBars} />
          <PriorityStack actions={parsed.priorityActions} />
        </>
      )}
    </section>
  )
}

function KeyInsights({ items }: { items: InsightItem[] }) {
  const pills = ['Critical', 'Action', 'Avoid']

  return (
    <section className="rounded-3xl border p-4 sm:p-5" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>
            Executive view
          </p>
          <h2 className="text-base font-semibold" style={{ color: TEXT }}>
            Главные выводы
          </h2>
        </div>
        <FileText className="h-5 w-5" style={{ color: TEXT2 }} />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {items.map((item, index) => (
          <div key={item.label} className="rounded-2xl border p-4" style={{ borderColor: BORDER_SOFT, background: '#FBFCFE' }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
              <IconBadge icon={item.icon} tone={item.tone} />
                <h3 className="text-sm font-semibold" style={{ color: TEXT }}>
                  {item.label}
                </h3>
              </div>
              <StatusPill tone={item.tone}>{pills[index] ?? statusLabel(item.value)}</StatusPill>
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: '#334155' }}>
              {safeInsightValue(item.value, 'См. раздел рекомендаций')}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function makeComponents(accent: string, accentBg: string) {
  return {
    h3: ({ children }: { children?: ReactNode }) => (
      <h3 className="mb-2 mt-4 border-l-[3px] pl-3 text-[0.92rem] font-semibold" style={{ color: TEXT, borderColor: accent }}>
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: ReactNode }) => (
      <h4 className="mb-2 mt-3 text-sm font-semibold" style={{ color: TEXT }}>
        {children}
      </h4>
    ),
    p: ({ children }: { children?: ReactNode }) => (
      <p className="mb-2.5 text-[0.92rem] leading-[1.62]" style={{ color: '#334155' }}>
        {children}
      </p>
    ),
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="font-semibold" style={{ color: TEXT }}>
        {children}
      </strong>
    ),
    em: ({ children }: { children?: ReactNode }) => <em style={{ color: TEXT2 }}>{children}</em>,
    ul: ({ children }: { children?: ReactNode }) => <ul className="mb-3 ml-1 space-y-1.5">{children}</ul>,
    ol: ({ children }: { children?: ReactNode }) => <ol className="mb-3 ml-5 list-decimal space-y-1.5">{children}</ol>,
    li: ({ children }: { children?: ReactNode }) => (
      <li className="flex items-start gap-2 text-[0.92rem] leading-[1.55]" style={{ color: '#334155' }}>
        <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
        <span>{children}</span>
      </li>
    ),
    hr: () => <hr className="my-4" style={{ border: 'none', borderTop: `1px solid ${BORDER_SOFT}` }} />,
    blockquote: ({ children }: { children?: ReactNode }) => (
      <div
        className="my-3 rounded-r-xl px-4 py-3 text-sm"
        style={{ background: accentBg, borderLeft: `4px solid ${accent}`, color: '#334155' }}
      >
        {children}
      </div>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div className="report-table my-4 overflow-x-auto rounded-2xl border" style={{ borderColor: BORDER }}>
        <table className="w-full min-w-[680px] border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: ReactNode }) => <thead style={{ background: '#F8FAFC' }}>{children}</thead>,
    tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
    tr: ({ children }: { children?: ReactNode }) => <tr className="transition-colors">{children}</tr>,
    th: ({ children }: { children?: ReactNode }) => (
      <th className="border-b px-3.5 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.06em] whitespace-nowrap" style={{ borderColor: BORDER, color: TEXT2 }}>
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => {
      const text = nodeToText(children)
      const isStatus = text.length < 48 && /high confidence|medium confidence|critical|warning|good|risk|check|info|ok|крит|средн|высок|низк/i.test(text)
      const isNumber = /[-+−]?\d[\d\s.,]*(?:%|₽|руб|млн|тыс|k|m)?/i.test(text)
      return (
        <td className="border-b px-3.5 py-2.5 align-top text-[0.84rem] first:font-semibold" style={{ borderColor: BORDER_SOFT, color: '#334155' }}>
          {isStatus ? (
            <StatusPill tone={detectTone(text)}>{statusLabel(text)}</StatusPill>
          ) : (
            <span className={isNumber ? 'font-semibold tabular-nums' : undefined}>{children}</span>
          )}
        </td>
      )
    },
    code: ({ children, className }: { children?: ReactNode; className?: string }) => {
      const isBlock = className?.includes('language-')
      if (isBlock) {
        return (
          <code className={`block font-mono text-xs ${className ?? ''}`} style={{ color: '#1E40AF' }}>
            {children}
          </code>
        )
      }
      return (
        <code className="rounded px-1.5 py-0.5 font-mono text-xs" style={{ background: '#F1F5F9', color: '#1E40AF' }}>
          {children}
        </code>
      )
    },
    pre: ({ children }: { children?: ReactNode }) => (
      <pre className="my-3 overflow-x-auto rounded-xl p-4 text-xs" style={{ background: '#F8FAFC', border: `1px solid ${BORDER}` }}>
        {children}
      </pre>
    ),
  }
}

function SectionCard({
  section,
  meta,
  index,
}: {
  section: ReportSection
  meta: (typeof AGENT_META)[keyof typeof AGENT_META]
  index: number
}) {
  const components = makeComponents(meta.accent, meta.accentBg)
  const displayContent = sanitizeMarkdownForDisplay(section.content)

  return (
    <section
      id={section.id}
      className="mb-3.5 scroll-mt-24 overflow-hidden rounded-2xl border"
      style={{ background: CARD, borderColor: BORDER, boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)' }}
    >
      <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: BORDER_SOFT }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tabular-nums" style={{ color: meta.accent }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <h2 className="min-w-0 flex-1 truncate text-[0.98rem] font-semibold" style={{ color: TEXT }}>
            {cleanText(section.heading)}
          </h2>
          <span className="hidden rounded-full border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] sm:inline-flex" style={{ borderColor: meta.accentBorder, color: meta.accent, background: meta.accentBg }}>
            Section
          </span>
        </div>
        <div className="mt-3 h-0.5 w-16 rounded-full" style={{ background: meta.sectionBorderColor }} />
      </div>
      <div className="px-4 py-3.5 sm:px-5">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {displayContent}
        </ReactMarkdown>
      </div>
    </section>
  )
}

function FallbackMarkdown({ report, meta }: { report: string; meta: (typeof AGENT_META)[keyof typeof AGENT_META] }) {
  const components = makeComponents(meta.accent, meta.accentBg)
  return (
    <div className="rounded-2xl border p-5 print:rounded-none print:border-none print:p-0" style={{ background: CARD, borderColor: BORDER }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {sanitizeMarkdownForDisplay(report)}
      </ReactMarkdown>
    </div>
  )
}

function SourceTableBlock({
  sourceText,
  expanded,
  onToggle,
}: {
  sourceText?: string | null
  expanded: boolean
  onToggle: () => void
}) {
  const parsed = parseSourceText(sourceText)
  if (!parsed || parsed.rows.length === 0) return null

  const visibleRows = expanded ? parsed.rows : parsed.rows.slice(0, 12)
  const hasMore = parsed.rows.length > visibleRows.length
  const warnings = parsed.metadata['Предупреждения']

  return (
    <section className="mb-3.5 overflow-hidden rounded-2xl border" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 8px 22px rgba(15, 23, 42, 0.04)' }}>
      <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: BORDER_SOFT }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT2 }}>
              Source data
            </p>
            <h2 className="mt-1 text-[0.98rem] font-semibold" style={{ color: TEXT }}>
              Данные, использованные для анализа
            </h2>
          </div>
          {parsed.metadata['Quality score'] && (
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: '#EFF6FF', color: PRIMARY_BLUE }}>
              Quality score: {parsed.metadata['Quality score']}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3.5 sm:px-5">
        <div className="grid gap-2 text-xs sm:grid-cols-4">
          {[
            ['Файл', parsed.metadata['Источник'] ?? 'Источник не записан'],
            ['Лист', parsed.metadata['Лист'] ?? 'Не указан'],
            ['Строки', parsed.metadata['Строк'] ?? String(parsed.rows.length)],
            ['Колонки', parsed.metadata['Колонок'] ?? 'Не указано'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border px-3 py-2" style={{ background: '#F8FAFC', borderColor: BORDER_SOFT }}>
              <p className="font-semibold" style={{ color: '#94A3B8' }}>{label}</p>
              <p className="mt-1 truncate font-medium" style={{ color: TEXT }}>{value}</p>
            </div>
          ))}
        </div>

        {warnings && warnings !== 'нет' && (
          <div className="rounded-xl border px-3 py-2 text-xs" style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>
            {warnings}
          </div>
        )}

        <div className="report-table overflow-x-auto rounded-2xl border" style={{ borderColor: BORDER }}>
          <table className="min-w-full border-collapse text-xs">
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-50 font-semibold' : undefined}>
                  {row.slice(0, 16).map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="max-w-[180px] truncate border-b border-r px-3 py-2" style={{ borderColor: BORDER_SOFT, color: TEXT }}>
                      {cell || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(hasMore || expanded) && (
          <button type="button" onClick={onToggle} className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
            {expanded ? 'Скрыть таблицу' : `Показать больше (${parsed.rows.length} строк)`}
          </button>
        )}
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
  const sections = useMemo(() => splitIntoSections(data.report), [data.report])
  const parsed = useMemo(() => buildParsedReport(data.report, data.agentType), [data.report, data.agentType])
  const [copiedReport, setCopiedReport] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [sourceExpanded, setSourceExpanded] = useState(false)
  const [activeSection, setActiveSection] = useState(() => sections[0]?.id ?? '')

  const meta = AGENT_META[data.agentType] ?? AGENT_META.pnl
  const Icon = meta.icon
  const hasSections = sections.length > 0
  const modelLabel = isDemo ? 'Demo / OpenRouter' : data.modelUsed || 'Model not recorded'

  useEffect(() => {
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-90px 0px -58% 0px', threshold: 0 },
    )

    sections.forEach((section) => {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sections])

  const handleNavClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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
      {isDemo && (
        <div className="print:hidden" style={{ background: '#EFF6FF', borderBottom: `1px solid #BFDBFE` }}>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="text-sm leading-snug" style={{ color: '#1E40AF' }}>
              <span className="font-semibold">Демо-отчёт</span> · пример аналитики на вымышленных данных.
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#DBEAFE', color: '#1D4ED8' }}
            >
              Сделать свой анализ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 border-b print:hidden" style={{ background: 'rgba(255,255,255,0.94)', borderColor: BORDER, backdropFilter: 'blur(14px)' }}>
        <div className="mx-auto flex h-auto min-h-14 max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <Link href="/analyze" className="mr-auto inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
            <ArrowLeft className="h-4 w-4" />
            Новый анализ
          </Link>

          <button onClick={handleCopyLink} className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
            {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{copiedLink ? 'Ссылка скопирована' : 'Скопировать ссылку'}</span>
            <span className="sm:hidden">Ссылка</span>
          </button>

          <button onClick={handleCopyReport} className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
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

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8 print:px-0 print:py-4">
        <header className="mb-5 overflow-hidden rounded-3xl border print:border-none" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.07)' }}>
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ background: meta.badgeBg, borderColor: meta.accentBorder, color: meta.badgeText }}>
                    <Icon className="h-3.5 w-3.5" />
                    {meta.badge}
                  </span>
                  <StatusPill tone="blue">Generated report</StatusPill>
                </div>

                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl print:text-black" style={{ color: TEXT }}>
                  {meta.title}: {data.company}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: TEXT2 }}>
                  {meta.subtitle}
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm" style={{ color: TEXT2 }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {data.company}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {data.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-4 w-4" />
                    {data.mode}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TEXT3 }}>
                    model_used: {modelLabel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end print:hidden">
                <button onClick={handleCopyLink} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
                  Ссылка
                </button>
                <button onClick={handleCopyReport} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
                  {copiedReport ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  Отчёт
                </button>
                <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
                  <Printer className="h-4 w-4" />
                  PDF
                </button>
                <Link href="/analyze" className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: meta.accent }}>
                  <ArrowRight className="h-4 w-4" />
                  Новый анализ
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-5 space-y-4">
          <SummaryGrid items={parsed.summary} />
          <DashboardVisuals parsed={parsed} agentType={data.agentType} accent={meta.accent} />
          <KeyInsights items={parsed.insights} />
        </div>

        <div className="flex items-start gap-6">
          {hasSections && (
            <aside className="hidden w-64 shrink-0 lg:block print:hidden">
              <div className="sticky top-20 overflow-hidden rounded-3xl border" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 10px 24px rgba(15, 23, 42, 0.045)' }}>
                <div className="border-b px-4 py-3" style={{ borderColor: BORDER_SOFT, background: '#FAFBFC' }}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: meta.accentBg }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: meta.accent }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: TEXT3 }}>
                        Навигация
                      </p>
                      <p className="text-xs" style={{ color: TEXT2 }}>
                        Разделы отчёта
                      </p>
                    </div>
                  </div>
                </div>

                <nav className="max-h-[calc(100vh-7rem)] space-y-1 overflow-y-auto p-2">
                  {sections.map((section, idx) => {
                    const isActive = activeSection === section.id
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleNavClick(section.id)}
                        className="flex w-full items-start gap-2 rounded-xl border-l-2 px-2.5 py-2 text-left text-xs leading-snug transition-colors"
                        style={{
                          borderColor: isActive ? meta.accent : 'transparent',
                          background: isActive ? meta.accentBg : 'transparent',
                          color: isActive ? meta.accent : TEXT2,
                          fontWeight: isActive ? 600 : 500,
                        }}
                      >
                        <span className="shrink-0 tabular-nums" style={{ color: isActive ? meta.accentLight : '#CBD5E1' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="line-clamp-2">{section.shortHeading}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>
            </aside>
          )}

          <main className="min-w-0 flex-1">
            {data.agentType === 'pnl' && (
              <SourceTableBlock
                sourceText={data.sourceText}
                expanded={sourceExpanded}
                onToggle={() => setSourceExpanded((value) => !value)}
              />
            )}

            {hasSections ? (
              sections.map((section, index) => <SectionCard key={section.id} section={section} meta={meta} index={index} />)
            ) : (
              <FallbackMarkdown report={data.report} meta={meta} />
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-8 print:hidden">
              <Link href="/analyze" className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50" style={{ color: TEXT2 }}>
                <ArrowLeft className="h-4 w-4" />
                Новый анализ
              </Link>

              <button onClick={handleCopyReport} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: meta.accent }}>
                {copiedReport ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedReport ? 'Скопировано' : 'Скопировать отчёт'}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
