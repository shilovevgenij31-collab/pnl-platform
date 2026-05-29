/**
 * Synthetic regression test for P&L extraction logic.
 * Verifies that detectMonthGroups + parseSeriesFromGroups correctly extract
 * revenue/profit series from a WB/OZON marketplace P&L structure.
 *
 * Run: node test-pnl-extraction.mjs
 */

// ─── Inline extraction helpers (mirrors ReportDisplay.tsx) ──────────────────

const MONTH_CELL_RE = /январ|феврал|март|апрел|\bмай\b|июн|июл|август|сентябр|октябр|ноябр|декабр|q[1-4]|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec/i
const PERIOD_CELL_RE = /20\d{2}|\d{1,2}\.\d{4}|\d{2}\.\d{2}/
const TOTAL_CELL_RE = /^итого$|^всего$|^total$|^итог$|^∑$|^итого:$/i
const TOTAL_CELL_LOOSE_RE = /^итого\b|^всего\b|^total\b/i
const CHANNEL_RE = /^wb$|^ozon$|^wildberries$|^wb\.ru$|^ozon\.ru$|^озон$|^маркетплейс\b/i

function parseNumber(value) {
  if (!value?.trim()) return null
  const normalized = value.replace(/[^\d,.\-−]/g, '').replace('−', '-').replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function detectMonthGroups(rows) {
  let monthRowIdx = -1
  let bestCount = 0
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const count = rows[i].filter((c, j) => j >= 1 && (MONTH_CELL_RE.test(c) || PERIOD_CELL_RE.test(c))).length
    if (count > bestCount) { bestCount = count; monthRowIdx = i }
  }
  if (monthRowIdx < 0 || bestCount < 1) {
    const fallbackCols = (rows[0] ?? []).slice(2).map((c, i) => ({ cell: c.trim(), idx: i + 2 })).filter(x => x.cell)
    return fallbackCols.map(({ cell, idx }) => ({ label: cell, totalIndex: idx, subIndices: [] }))
  }
  const monthRow = rows[monthRowIdx]
  const channelRow = rows[monthRowIdx + 1] ?? []
  const monthPositions = []
  monthRow.forEach((cell, i) => {
    if (i >= 1 && (MONTH_CELL_RE.test(cell) || PERIOD_CELL_RE.test(cell)))
      monthPositions.push({ idx: i, label: cell.trim() })
  })
  if (monthPositions.length === 0) return []
  const groups = []
  for (let m = 0; m < monthPositions.length; m++) {
    const { idx: startIdx, label } = monthPositions[m]
    const endIdx = monthPositions[m + 1]?.idx ?? monthRow.length
    let totalIdx = -1
    const channelIndices = []
    for (let i = startIdx; i < endIdx; i++) {
      const cell = (channelRow[i] ?? '').trim()
      if (TOTAL_CELL_RE.test(cell) || TOTAL_CELL_LOOSE_RE.test(cell)) {
        if (totalIdx < 0) totalIdx = i
      } else if (CHANNEL_RE.test(cell)) {
        channelIndices.push(i)
      }
    }
    if (totalIdx >= 0) {
      groups.push({ label, totalIndex: totalIdx, subIndices: [] })
    } else if (channelIndices.length >= 2) {
      groups.push({ label, totalIndex: -1, subIndices: channelIndices })
    } else {
      groups.push({ label, totalIndex: startIdx, subIndices: [] })
    }
  }
  return groups
}

function getGroupValue(row, group) {
  if (!row) return null
  if (group.totalIndex >= 0) return parseNumber(row[group.totalIndex] ?? '')
  const vals = group.subIndices.map(i => parseNumber(row[i] ?? '')).filter(v => v !== null)
  return vals.length > 0 ? vals.reduce((a, b) => a + b) : null
}

function parseSeriesFromGroups(row, groups) {
  if (!row || groups.length === 0) return []
  return groups.map(g => getGroupValue(row, g)).filter(v => v !== null)
}

function findRow(rows, names) {
  return rows.find(row => {
    const label = (row[0] ?? '').toLowerCase()
    return names.some(name => label.includes(name.toLowerCase()))
  }) ?? null
}

function avgFromSeries(series) {
  if (series.length === 0) return null
  return Math.round(series.reduce((a, b) => a + b) / series.length)
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const PASS = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'
let passed = 0
let failed = 0

function assert(condition, label, actual, expected) {
  if (condition) {
    console.log(`${PASS} ${label}`)
    passed++
  } else {
    console.log(`${FAIL} ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    failed++
  }
}

// ─── Structure A: Month → WB | OZON | Итого (4 months × 3 cols = 12 + label = 13 cols) ──

console.log('\n=== Structure A: Month/WB/OZON/Итого ===')
const structA = [
  ['Pnl (Only месяц)', '2026', '', '', '', '', '', '', '', '', '', '', ''],
  ['Категория', 'январь', '', '', 'февраль', '', '', 'март', '', '', 'апрель', '', ''],
  ['',          'WB',     'OZON', 'Итого', 'WB', 'OZON', 'Итого', 'WB', 'OZON', 'Итого', 'WB', 'OZON', 'Итого'],
  ['Выручка (Органика + Выкуп)', '800000', '400000', '1200000', '900000', '500000', '1400000', '950000', '550000', '1500000', '1100000', '600000', '1700000'],
  ['Расходы', '600000', '300000', '900000', '700000', '350000', '1050000', '650000', '325000', '975000', '800000', '400000', '1200000'],
  ['Чистая прибыль', '200000', '100000', '300000', '200000', '150000', '350000', '300000', '225000', '525000', '300000', '200000', '500000'],
]

const groupsA = detectMonthGroups(structA)
assert(groupsA.length === 4, 'A: 4 month groups detected', groupsA.length, 4)
assert(groupsA[0].totalIndex === 3, 'A: Jan totalIndex=3 (Итого col)', groupsA[0].totalIndex, 3)
assert(groupsA[1].totalIndex === 6, 'A: Feb totalIndex=6', groupsA[1].totalIndex, 6)
assert(groupsA[2].totalIndex === 9, 'A: Mar totalIndex=9', groupsA[2].totalIndex, 9)
assert(groupsA[3].totalIndex === 12, 'A: Apr totalIndex=12', groupsA[3].totalIndex, 12)
assert(groupsA[0].label === 'январь', 'A: Jan label', groupsA[0].label, 'январь')

const revenueRowA = findRow(structA, ['выручка'])
const revenueSA = parseSeriesFromGroups(revenueRowA, groupsA)
assert(revenueSA.length === 4, 'A: 4 revenue values', revenueSA.length, 4)
assert(revenueSA[0] === 1200000, 'A: Jan revenue = 1 200 000', revenueSA[0], 1200000)
assert(revenueSA[3] === 1700000, 'A: Apr revenue = 1 700 000', revenueSA[3], 1700000)

const profitRowA = findRow(structA, ['прибыль'])
const profitSA = parseSeriesFromGroups(profitRowA, groupsA)
assert(profitSA.length === 4, 'A: 4 profit values', profitSA.length, 4)
assert(profitSA.every(v => v > 0), 'A: all months profitable', profitSA, 'all > 0')

const avgRevA = avgFromSeries(revenueSA)
assert(avgRevA > 0, 'A: avgRevenue > 0', avgRevA, '> 0')
assert(avgRevA === Math.round((1200000+1400000+1500000+1700000)/4), 'A: avgRevenue correct', avgRevA, Math.round((1200000+1400000+1500000+1700000)/4))

// ─── Structure B: Month → WB | OZON (no Итого — sum of channels) ───────────

console.log('\n=== Structure B: Month/WB/OZON (sum WB+OZON) ===')
const structB = [
  ['', '2026'],
  ['Статья', 'январь', '', 'февраль', '', 'март', '', 'апрель', ''],
  ['',       'WB', 'OZON', 'WB', 'OZON', 'WB', 'OZON', 'WB', 'OZON'],
  ['Выручка',  '800000', '400000', '900000', '500000', '950000', '550000', '1100000', '600000'],
  ['Расходы',  '600000', '300000', '700000', '350000', '650000', '325000', '800000',  '400000'],
  ['Прибыль',  '200000', '100000', '200000', '150000', '300000', '225000', '300000',  '200000'],
]

const groupsB = detectMonthGroups(structB)
assert(groupsB.length === 4, 'B: 4 month groups', groupsB.length, 4)
assert(groupsB[0].totalIndex === -1, 'B: Jan no Итого (totalIndex=-1)', groupsB[0].totalIndex, -1)
assert(groupsB[0].subIndices.length === 2, 'B: Jan has 2 subIndices (WB+OZON)', groupsB[0].subIndices.length, 2)

const revenueRowB = findRow(structB, ['выручка'])
const revenueSB = parseSeriesFromGroups(revenueRowB, groupsB)
assert(revenueSB.length === 4, 'B: 4 revenue values', revenueSB.length, 4)
assert(revenueSB[0] === 1200000, 'B: Jan = 800000+400000 = 1200000', revenueSB[0], 1200000)
assert(revenueSB[3] === 1700000, 'B: Apr = 1100000+600000 = 1700000', revenueSB[3], 1700000)

const profitRowB = findRow(structB, ['прибыль'])
const profitSB = parseSeriesFromGroups(profitRowB, groupsB)
assert(profitSB.length === 4, 'B: 4 profit values', profitSB.length, 4)
assert(profitSB.every(v => v > 0), 'B: all months profitable', profitSB, 'all > 0')

// ─── Structure C: Simple (no subcolumns — month column = total) ─────────────

console.log('\n=== Structure C: Simple month columns (no subcolumns) ===')
const structC = [
  ['Статья', 'январь', 'февраль', 'март', 'апрель'],
  ['Выручка', '1200000', '1400000', '1500000', '1700000'],
  ['Расходы', '900000', '1050000', '975000', '1200000'],
  ['Прибыль', '300000', '350000', '525000', '500000'],
]
const groupsC = detectMonthGroups(structC)
assert(groupsC.length === 4, 'C: 4 month groups', groupsC.length, 4)
assert(groupsC[0].totalIndex === 1, 'C: Jan totalIndex=1 (month col)', groupsC[0].totalIndex, 1)

const revenueRowC = findRow(structC, ['выручка'])
const revenueSeriesC = parseSeriesFromGroups(revenueRowC, groupsC)
assert(revenueSeriesC.length === 4, 'C: 4 revenue values', revenueSeriesC.length, 4)
assert(revenueSeriesC[0] === 1200000, 'C: Jan revenue correct', revenueSeriesC[0], 1200000)

// ─── Protection: parseNumber('') must return null ────────────────────────────

console.log('\n=== parseNumber guards ===')
assert(parseNumber('') === null, 'parseNumber("") = null', parseNumber(''), null)
assert(parseNumber('   ') === null, 'parseNumber("   ") = null', parseNumber('   '), null)
assert(parseNumber('0') === 0, 'parseNumber("0") = 0', parseNumber('0'), 0)
assert(parseNumber('1 500 000') === 1500000, 'parseNumber("1 500 000") = 1500000', parseNumber('1 500 000'), 1500000)
assert(parseNumber('−500 000') === -500000, 'parseNumber("−500 000") = -500000', parseNumber('−500 000'), -500000)

// ─── Protection: no fake zeros when row not found ────────────────────────────

console.log('\n=== No fake zeros when row not found ===')
const missingRow = findRow(structA, ['несуществующая строка'])
const missingSeries = parseSeriesFromGroups(missingRow, groupsA)
assert(missingSeries.length === 0, 'missing row → empty series', missingSeries.length, 0)
const avgMissing = avgFromSeries(missingSeries)
assert(avgMissing === null, 'avgFromSeries([]) = null', avgMissing, null)

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${PASS} ${passed} passed, ${failed > 0 ? FAIL : ''} ${failed} failed`)
if (failed > 0) process.exit(1)
