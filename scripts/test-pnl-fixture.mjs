/**
 * Offline fixture test for ОПиУ Факт 2025 ОЕ.xlsx
 * Run: node scripts/test-pnl-fixture.mjs
 * Tests the same analyzeSheet logic used in AnalyzeClient.tsx
 */
import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE = resolve(__dirname, '../fixtures/OPiU_Fakt_2025_OE.xlsx')
const OUT = resolve(__dirname, '../fixtures/fixture-analysis.json')

// ── Same constants as AnalyzeClient.tsx ──────────────────────────────────────

const REVENUE_KEYWORDS = [
  'выручка', 'доход', 'продажи', 'оборот', 'реализация',
  'общая выручка', 'выручка с ндс', 'агентское вознаграждение',
  'revenue', 'sales', 'income', 'gross revenue', 'net revenue',
]
const EXPENSE_KEYWORDS = [
  'расходы', 'расход', 'себестоимость', 'затраты',
  'переменные расходы', 'постоянные расходы',
  'фот', 'зарплата', 'маркетинг', 'аренда', 'подрядчики',
  'сырье', 'материалы', 'упаковка', 'реклама', 'коммунальные',
  'cogs', 'cost', 'expense', 'payroll', 'salary',
  'marketing', 'ads', 'rent', 'contractors', 'opex', 'operating',
  'роялти', 'амортизация', 'налоги', 'кредиты',
]
const PROFIT_KEYWORDS = [
  'прибыль', 'чистая прибыль', 'валовая прибыль', 'маржинальная прибыль',
  'операционная прибыль', 'ebitda',
  'маржа', 'маржинальность', 'рентабельность',
  'profit', 'net profit', 'gross profit', 'operating profit', 'margin',
]
const FORMULA_ERRORS = ['#VALUE!', '#DIV/0!', '#REF!', '#N/A', '#NAME?']
const PERIOD_KEYWORDS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
  'янв', 'фев', 'мар', 'апр', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  'q1', 'q2', 'q3', 'q4', '2024', '2025', '2026',
  'month', 'месяц', 'итого', 'квартал', 'период', 'quarter', 'period',
]
const MAX_NORMALIZED_CHARS = 75_000
const PREVIEW_ROWS = 20
const PREVIEW_COLS = 15

// ── Same helpers as AnalyzeClient.tsx ────────────────────────────────────────

function cellToText(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).replace(/\s+/g, ' ').trim()
}

function parseNumber(value) {
  const normalized = value
    .replace(/\s/g, '')
    .replace(/[₽$€%]/g, '')
    .replace(',', '.')
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function normalizeRows(rawRows) {
  const rows = rawRows
    .map((row) => row.map(cellToText))
    .filter((row) => row.some((cell) => cell.length > 0))

  const usedColumns = new Set()
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      if (cell.length > 0) usedColumns.add(index)
    })
  })

  const columns = [...usedColumns].sort((a, b) => a - b)
  return rows.map((row) => columns.map((index) => row[index] ?? ''))
}

function csvEscape(value) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}

function keywordHits(text, keywords) {
  const lower = text.toLowerCase()
  return keywords.filter((keyword) => lower.includes(keyword))
}

function analyzeSheet(sheetName, rawRows, fileName) {
  const rows = normalizeRows(rawRows)
  const flat = rows.flat()
  const text = flat.join(' ').toLowerCase()
  const numericValues = flat.map(parseNumber).filter((value) => value !== null)
  const formulaErrorsCount = flat.filter((cell) =>
    FORMULA_ERRORS.some((error) => cell.toUpperCase().includes(error))
  ).length
  const revenueHits = keywordHits(text, REVENUE_KEYWORDS)
  const expenseHits = keywordHits(text, EXPENSE_KEYWORDS)
  const profitHits = keywordHits(text, PROFIT_KEYWORDS)
  const periodHits = keywordHits(text, PERIOD_KEYWORDS)
  const detectedKeywords = [...new Set([...revenueHits, ...expenseHits, ...profitHits, ...periodHits])]
  const nonEmptyRows = rows.length
  const nonEmptyColumns = rows.reduce((max, row) => Math.max(max, row.filter(Boolean).length), 0)
  const nonZeroNumericValuesCount = numericValues.filter((value) => value !== 0).length

  const warnings = []
  const hardBlockReasons = []
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

  const status = hardBlockReasons.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'good'
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

// ── Run analysis ──────────────────────────────────────────────────────────────

console.log(`Reading: ${FILE}\n`)
const buf = readFileSync(FILE)
const workbook = XLSX.read(buf, { type: 'buffer' })

console.log('Sheet names:', workbook.SheetNames)

const analyses = workbook.SheetNames.map((sheetName) => {
  const ws = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  })
  return analyzeSheet(sheetName, rows, 'ОПиУ Факт 2025 ОЕ.xlsx')
}).sort((a, b) => b.qualityScore - a.qualityScore)

for (const a of analyses) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Sheet: "${a.sheetName}"`)
  console.log(`Status: ${a.status.toUpperCase()}  |  Quality score: ${a.qualityScore}`)
  console.log(`Rows: ${a.nonEmptyRows}  |  Columns: ${a.nonEmptyColumns}`)
  console.log(`Numeric values: ${a.numericValuesCount}  |  Non-zero: ${a.nonZeroNumericValuesCount}`)
  console.log(`Formula errors: ${a.formulaErrorsCount}  |  flat.length: ${a.rows.flat().length}`)
  console.log(`Formula error threshold: ${Math.max(3, Math.ceil(a.rows.flat().length * 0.08))}`)
  console.log(`Keywords detected: ${a.detectedKeywords.join(', ') || '(none)'}`)
  if (a.hardBlockReasons.length > 0) {
    console.log(`HARD BLOCKS: ${a.hardBlockReasons.map(r => `  - ${r}`).join('\n  ')}`)
  }
  if (a.warnings.length > 0) {
    console.log(`Warnings: ${a.warnings.map(w => `  - ${w}`).join('\n  ')}`)
  }
  console.log(`\nPreview (first ${Math.min(a.previewRows.length, 20)} rows, first 6 cols):`)
  a.previewRows.slice(0, 20).forEach((row, i) => {
    const cells = row.slice(0, 6).map(c => String(c || '').slice(0, 25).padEnd(26))
    console.log(`  [${String(i).padStart(2, '0')}] ${cells.join('|')}`)
  })
}

const best = analyses[0]
console.log(`\n${'═'.repeat(60)}`)
console.log(`BEST SHEET: "${best?.sheetName}" (score: ${best?.qualityScore}, status: ${best?.status})`)

// Save analysis result to JSON for reference
const summary = analyses.map(a => ({
  sheetName: a.sheetName,
  status: a.status,
  qualityScore: a.qualityScore,
  nonEmptyRows: a.nonEmptyRows,
  nonEmptyColumns: a.nonEmptyColumns,
  numericValuesCount: a.numericValuesCount,
  nonZeroNumericValuesCount: a.nonZeroNumericValuesCount,
  formulaErrorsCount: a.formulaErrorsCount,
  detectedKeywords: a.detectedKeywords,
  hardBlockReasons: a.hardBlockReasons,
  warnings: a.warnings,
  previewRows: a.previewRows.slice(0, 10),
  normalizedTextLength: a.normalizedText.length,
}))
writeFileSync(OUT, JSON.stringify(summary, null, 2), 'utf-8')
console.log(`\nFull analysis saved to: ${OUT}`)
