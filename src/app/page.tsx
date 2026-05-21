import Link from 'next/link'
import {
  BarChart3,
  Target,
  CheckCircle2,
  ArrowRight,
  Brain,
  TrendingUp,
  Network,
  Calendar,
  AlertTriangle,
  FileText,
  Lightbulb,
  XCircle,
  ListChecks,
} from 'lucide-react'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const PAGE_BG = '#F4F7FB'
const CARD = '#FFFFFF'
const BORDER = '#E2E8F0'
const TEXT = '#0F172A'
const TEXT2 = '#64748B'

// ─── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard() {
  return (
    <div
      className="rounded-3xl overflow-hidden w-full max-w-sm mx-auto"
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 20px 60px rgba(37,99,235,0.12), 0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* header */}
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: '#EFF6FF' }}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold" style={{ color: TEXT }}>
              P&L-отчёт
            </span>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: '#ECFDF5', color: '#059669' }}
          >
            Financial Analysis
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: TEXT2 }}>
          ТехКонсалт ООО · Март 2026
        </p>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-3 divide-x" style={{ borderBottom: `1px solid ${BORDER}` }}>
        {[
          { label: 'Маржа', value: '6.2%', flag: '🔴' },
          { label: 'ФОТ/выручка', value: '58%', flag: '🔴' },
          { label: 'До цели', value: '−1M ₽', flag: '⚠️' },
        ].map((m) => (
          <div key={m.label} className="px-3 py-3 text-center">
            <div className="text-base font-bold" style={{ color: TEXT }}>
              {m.value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: TEXT2 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* sparkline */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: TEXT2 }}>
            Динамика выручки
          </span>
          <span className="text-xs font-semibold text-emerald-600">+18.7%</span>
        </div>
        <svg viewBox="0 0 240 48" className="w-full h-10" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,38 C30,32 60,28 90,20 C120,12 150,22 180,14 C210,6 230,10 240,8"
            fill="none"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0,38 C30,32 60,28 90,20 C120,12 150,22 180,14 C210,6 230,10 240,8 L240,48 L0,48 Z"
            fill="url(#sparkGrad)"
          />
        </svg>
      </div>

      {/* bottleneck alert */}
      <div
        className="mx-4 mb-3 rounded-xl px-4 py-3"
        style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-red-700">Главный Bottleneck</span>
        </div>
        <p className="text-xs text-red-600 leading-relaxed">
          ФОТ составляет 58% выручки при норме 35–40%.{' '}
          <span className="font-semibold">Упущено −1 026 000 ₽/мес.</span>
        </p>
      </div>

      {/* actions */}
      <div className="px-4 pb-4">
        <p className="text-xs font-semibold mb-2" style={{ color: TEXT2 }}>
          Приоритетные действия
        </p>
        {[
          'Аудит ФОТ по проектам (7 дней)',
          'Зафиксировать лимит ФОТ',
          'Пересмотреть ставки клиентов',
        ].map((item) => (
          <div key={item} className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-xs" style={{ color: TEXT2 }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
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
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}
            >
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm" style={{ color: TEXT }}>
              Перезагрузка прибыльности
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/analyze?agent=pnl"
              className="text-sm transition-colors hover:text-blue-600"
              style={{ color: TEXT2 }}
            >
              P&L Agent
            </Link>
            <Link
              href="/analyze?agent=goldratt"
              className="text-sm transition-colors hover:text-blue-600"
              style={{ color: TEXT2 }}
            >
              Goldratt Agent
            </Link>
            <Link
              href="/demo/pnl"
              className="text-sm transition-colors hover:text-blue-600"
              style={{ color: TEXT2 }}
            >
              Пример отчёта
            </Link>
          </div>

          <Link
            href="/analyze"
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
          >
            Запустить анализ
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6 lg:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left content */}
            <div className="flex-1 max-w-xl">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-sm font-medium"
                style={{
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                }}
              >
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Для программы «Перезагрузка прибыльности»
              </div>

              <h1
                className="text-4xl lg:text-5xl font-bold leading-[1.15] tracking-tight mb-5"
                style={{ color: TEXT }}
              >
                AI-диагностика
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                  }}
                >
                  прибыльности бизнеса
                </span>
              </h1>

              <p className="text-lg leading-relaxed mb-8" style={{ color: TEXT2 }}>
                Загрузите P&L или описание бизнеса и получите структурированный отчёт: где
                теряется прибыль, какое ограничение тормозит рост и что делать дальше.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link
                  href="/analyze?agent=pnl"
                  className="flex items-center justify-center gap-2.5 text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #059669, #0891b2)',
                    boxShadow: '0 8px 24px rgba(5,150,105,0.25)',
                  }}
                >
                  <BarChart3 className="w-4 h-4" />
                  Разобрать P&L
                </Link>
                <Link
                  href="/analyze?agent=goldratt"
                  className="flex items-center justify-center gap-2.5 text-white px-6 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    boxShadow: '0 8px 24px rgba(124,58,237,0.25)',
                  }}
                >
                  <Target className="w-4 h-4" />
                  Найти ограничение
                </Link>
              </div>

              <div className="flex items-center gap-6 text-sm" style={{ color: TEXT2 }}>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />2 AI-агента
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  14+ разделов
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Конкретные данные
                </span>
              </div>
            </div>

            {/* Right preview card */}
            <div className="w-full lg:w-auto lg:flex-shrink-0 lg:w-[380px]">
              <PreviewCard />
            </div>
          </div>
        </div>
      </section>

      {/* Agent cards */}
      <section className="py-16 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3" style={{ color: TEXT }}>
              Два AI-агента — два разных инструмента
            </h2>
            <p style={{ color: TEXT2 }}>Разные вопросы, разные методологии, разные отчёты</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* P&L Agent */}
            <div
              className="rounded-3xl p-8 flex flex-col"
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: '#ECFDF5' }}
                >
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-600 mb-0.5">
                    Financial Analysis
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: TEXT }}>
                    P&L Agent
                  </h3>
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-5" style={{ color: TEXT2 }}>
                Финансовый разбор прибыльности. Анализирует P&L, расходы, маржу. Находит
                конкретные зоны потерь с цифрами и формулами.
              </p>

              <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wide">
                Главный вопрос
              </p>
              <p className="text-sm font-medium mb-6" style={{ color: TEXT }}>
                «Где бизнес теряет прибыль по цифрам?»
              </p>

              <ul className="space-y-2 mb-8 flex-1">
                {[
                  'P&L и структура расходов',
                  'Зоны потерь прибыли с суммами',
                  'Главный финансовый bottleneck',
                  'Точка безубыточности',
                  'Сценарии роста рентабельности',
                  'Что НЕ нужно оптимизировать',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: TEXT2 }}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <Link
                  href="/analyze?agent=pnl"
                  className="flex items-center justify-center gap-2 flex-1 text-white py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
                >
                  Запустить
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/demo/pnl"
                  className="flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #A7F3D0',
                    color: '#065F46',
                  }}
                >
                  Пример
                </Link>
              </div>
            </div>

            {/* Goldratt Agent */}
            <div
              className="rounded-3xl p-8 flex flex-col"
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: '#F5F3FF' }}
                >
                  <Target className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-violet-600 mb-0.5">Goldratt / TOC</div>
                  <h3 className="text-xl font-bold" style={{ color: TEXT }}>
                    Goldratt Agent
                  </h3>
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-5" style={{ color: TEXT2 }}>
                Системный диагност по Теории ограничений. Определяет, что именно сдерживает
                рост бизнеса как системы. Без P&L — только описание.
              </p>

              <p className="text-xs font-semibold text-violet-600 mb-2 uppercase tracking-wide">
                Главный вопрос
              </p>
              <p className="text-sm font-medium mb-6" style={{ color: TEXT }}>
                «Что является главным системным ограничением?»
              </p>

              <ul className="space-y-2 mb-8 flex-1">
                {[
                  'Карта бизнеса и Throughput',
                  'Главное системное ограничение',
                  'Что является шумом (не ограничением)',
                  'Five Focusing Steps для компании',
                  'Что НЕ нужно оптимизировать',
                  'Как проверить гипотезу ограничения',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: TEXT2 }}>
                    <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <Link
                  href="/analyze?agent=goldratt"
                  className="flex items-center justify-center gap-2 flex-1 text-white py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  Запустить
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/demo/goldratt"
                  className="flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: '#F5F3FF',
                    border: '1px solid #DDD6FE',
                    color: '#5B21B6',
                  }}
                >
                  Пример
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get in the report */}
      <section className="py-16 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3" style={{ color: TEXT }}>
              Что получаете в каждом отчёте
            </h2>
            <p style={{ color: TEXT2 }}>
              Структурированный консалтинговый анализ — не общие советы
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                num: '01',
                icon: FileText,
                title: 'Executive Summary',
                desc: 'Главный вывод: что происходит с бизнесом и насколько ситуация критическая.',
                accent: '#2563EB',
                bg: '#EFF6FF',
              },
              {
                num: '02',
                icon: BarChart3,
                title: 'Ключевые метрики',
                desc: 'Маржа, ФОТ/выручка, разрыв до цели — все расчёты с формулами и источником.',
                accent: '#059669',
                bg: '#ECFDF5',
              },
              {
                num: '03',
                icon: AlertTriangle,
                title: 'Главный Bottleneck',
                desc: 'Одна конкретная проблема — с логикой, цифрами и уровнем уверенности.',
                accent: '#DC2626',
                bg: '#FEF2F2',
              },
              {
                num: '04',
                icon: XCircle,
                title: 'Что НЕ оптимизировать',
                desc: 'Обязательный раздел. Что трогать сейчас бессмысленно или опасно.',
                accent: '#D97706',
                bg: '#FFFBEB',
              },
              {
                num: '05',
                icon: Lightbulb,
                title: 'Рекомендации',
                desc: 'Каждая: действие + почему + ожидаемый эффект + срок + метрика контроля.',
                accent: '#7c3aed',
                bg: '#F5F3FF',
              },
              {
                num: '06',
                icon: ListChecks,
                title: 'План 7 / 14 / 30 дней',
                desc: 'Конкретные шаги по срокам — что делать немедленно, что строить системно.',
                accent: '#0891b2',
                bg: '#F0F9FF',
              },
            ].map((item) => (
              <div
                key={item.num}
                className="rounded-2xl p-5"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: item.bg }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: item.accent }} />
                  </div>
                  <div>
                    <div
                      className="text-xs font-bold tabular-nums mb-0.5"
                      style={{ color: '#CBD5E1' }}
                    >
                      {item.num}
                    </div>
                    <h3 className="font-semibold text-sm leading-tight" style={{ color: TEXT }}>
                      {item.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold" style={{ color: TEXT }}>
              Как это работает
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Brain,
                title: 'Выберите агента',
                desc: 'P&L Agent — если есть финансовые данные. Goldratt Agent — если хотите найти системное ограничение.',
              },
              {
                step: '02',
                icon: TrendingUp,
                title: 'Загрузите данные',
                desc: 'P&L: вставьте таблицу из Excel или загрузите файл. Goldratt: ответьте на 3–5 диагностических вопросов.',
              },
              {
                step: '03',
                icon: Network,
                title: 'Получите отчёт',
                desc: 'AI анализирует за 1–2 минуты и выдаёт подробный консалтинговый отчёт с рекомендациями и планом действий.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-2xl p-6"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: '#EFF6FF' }}
                  >
                    <s.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span
                    className="text-3xl font-bold"
                    style={{ color: '#E2E8F0' }}
                  >
                    {s.step}
                  </span>
                </div>
                <h3 className="font-semibold mb-2" style={{ color: TEXT }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality principles */}
      <section className="py-16 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3" style={{ color: TEXT }}>
              Принципы качества анализа
            </h2>
            <p style={{ color: TEXT2 }}>Глубокий консалтинговый анализ без общих слов</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: BarChart3,
                title: 'Только конкретика',
                desc: '«ФОТ 54% при ориентире 35%» — не «оптимизируйте расходы».',
              },
              {
                icon: Target,
                title: 'Одно главное ограничение',
                desc: 'Не список из десяти. Одно — то, что тормозит систему.',
              },
              {
                icon: TrendingUp,
                title: 'Уровни уверенности',
                desc: '✅ Высокая / ⚠️ Средняя / 🔵 Предположение — никаких скрытых допущений.',
              },
              {
                icon: Network,
                title: 'Честный анализ',
                desc: 'Нет данных → «не указано». Нет доказательств → «предположение».',
              },
              {
                icon: CheckCircle2,
                title: 'Что НЕ делать',
                desc: 'Обязательный раздел. Часто важнее самих рекомендаций.',
              },
              {
                icon: Calendar,
                title: 'Конкретный план',
                desc: 'Каждая рекомендация: действие + почему + эффект + срок + метрика.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-5"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: '#EFF6FF' }}
                >
                  <f.icon className="w-4.5 h-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="font-semibold mb-1.5 text-sm" style={{ color: TEXT }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: TEXT2 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-xl mx-auto text-center">
          <div
            className="rounded-3xl p-10"
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="text-2xl font-bold mb-3" style={{ color: TEXT }}>
              Выберите с чего начать
            </h2>
            <p className="mb-8" style={{ color: TEXT2 }}>
              Есть P&L — начните с финансового анализа.
              <br />
              Нет цифр — начните с диагностики ограничения.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/analyze?agent=pnl"
                className="flex items-center justify-center gap-2 flex-1 text-white py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
              >
                <BarChart3 className="w-4 h-4" />
                P&L Agent
              </Link>
              <Link
                href="/analyze?agent=goldratt"
                className="flex items-center justify-center gap-2 flex-1 text-white py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                <Target className="w-4 h-4" />
                Goldratt Agent
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-5">
              <Link href="/demo/pnl" className="text-sm hover:text-blue-600 transition-colors" style={{ color: TEXT2 }}>
                Пример P&L-отчёта →
              </Link>
              <Link href="/demo/goldratt" className="text-sm hover:text-blue-600 transition-colors" style={{ color: TEXT2 }}>
                Пример Goldratt-отчёта →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}
            >
              <Brain className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm" style={{ color: TEXT2 }}>
              Перезагрузка прибыльности
            </span>
          </div>
          <span className="text-sm" style={{ color: '#CBD5E1' }}>
            2 AI-агента · 2026
          </span>
        </div>
      </footer>
    </div>
  )
}
