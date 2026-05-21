'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, BarChart3 } from 'lucide-react'
import ReportDisplay from './[id]/ReportDisplay'
import { getReport } from '@/lib/storage/reportStorage'
import type { StoredReport, ReportPageData } from '@/lib/types'

type PageState =
  | { status: 'loading' }
  | { status: 'found'; data: StoredReport }
  | { status: 'empty' }
  | { status: 'error'; message: string }

const PAGE_BG = '#F4F7FB'
const CARD = '#FFFFFF'
const BORDER = '#E2E8F0'
const TEXT = '#0F172A'
const TEXT2 = '#64748B'

function EmptyState({
  title,
  message,
  tone = 'blue',
}: {
  title: string
  message: string
  tone?: 'blue' | 'red'
}) {
  const Icon = tone === 'red' ? AlertCircle : BarChart3
  const color = tone === 'red' ? '#DC2626' : '#2563EB'
  const bg = tone === 'red' ? '#FEF2F2' : '#EFF6FF'

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: PAGE_BG }}>
      <div className="max-w-sm rounded-3xl border p-8 text-center" style={{ background: CARD, borderColor: BORDER, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.07)' }}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: bg }}>
          <Icon className="h-7 w-7" style={{ color }} />
        </div>
        <h2 className="mb-3 text-xl font-semibold" style={{ color: TEXT }}>{title}</h2>
        <p className="mb-7 text-sm leading-relaxed" style={{ color: TEXT2 }}>{message}</p>
        <Link href="/analyze" className="inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#2563EB' }}>
          Создать анализ
        </Link>
      </div>
    </div>
  )
}

export default function ReportPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      try {
        const data = getReport()
        setState(data ? { status: 'found', data } : { status: 'empty' })
      } catch (err) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Не удалось загрузить отчёт',
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: '#2563EB' }} />
      </div>
    )
  }

  if (state.status === 'empty') {
    return (
      <EmptyState
        title="Отчёт не найден"
        message="Отчёт ещё не был создан или временные данные были очищены."
      />
    )
  }

  if (state.status === 'error') {
    return (
      <EmptyState
        title="Ошибка загрузки"
        message={state.message}
        tone="red"
      />
    )
  }

  const reportData: ReportPageData = {
    id: 'local-fallback',
    report: state.data.report,
    company: state.data.company,
    date: state.data.date,
    mode: state.data.mode,
    agentType: state.data.mode.toLowerCase().includes('goldratt') ? 'goldratt' : 'pnl',
    modelUsed: 'Local fallback',
    sourceText: null,
  }

  return <ReportDisplay data={reportData} />
}
