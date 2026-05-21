'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Brain, Copy, Printer, ArrowLeft, Check, Calendar, Building2, BarChart3, AlertCircle } from 'lucide-react'
import { getReport } from '@/lib/storage/reportStorage'
import type { StoredReport } from '@/lib/types'

type PageState =
  | { status: 'loading' }
  | { status: 'found'; data: StoredReport }
  | { status: 'empty' }
  | { status: 'error'; message: string }

export default function ReportPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      try {
        const data = getReport()
        if (data) {
          setState({ status: 'found', data })
        } else {
          setState({ status: 'empty' })
        }
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

  async function handleCopy(report: string) {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#060a14' }}>
        <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#6366f1' }} />
      </div>
    )
  }

  if (state.status === 'empty') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#060a14' }}>
        <div className="text-center max-w-sm mx-auto">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(13,18,32,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <BarChart3 className="w-7 h-7 text-slate-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-200 mb-3">Отчёт не найден</h2>
          <p className="text-slate-400 text-sm mb-8">
            Отчёт ещё не был создан или данные были очищены.
          </p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-xl font-medium text-sm"
          >
            Создать анализ
          </Link>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#060a14' }}>
        <div className="text-center max-w-sm mx-auto">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-200 mb-3">Ошибка загрузки</h2>
          <p className="text-slate-400 text-sm mb-8">{state.message}</p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-xl font-medium text-sm"
          >
            Создать анализ
          </Link>
        </div>
      </div>
    )
  }

  const { data } = state

  return (
    <div className="min-h-screen print:bg-white" style={{ background: '#060a14' }}>
      {/* Navbar */}
      <nav
        className="border-b sticky top-0 z-50 backdrop-blur-md print:hidden"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(6,10,20,0.9)' }}
      >
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <Link
            href="/analyze"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm mr-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Новый анализ
          </Link>

          <button
            onClick={() => handleCopy(data.report)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? 'Скопировано' : 'Скопировать'}
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Printer className="w-4 h-4" />
            PDF / Печать
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 print:py-4 print:px-0">
        {/* Report header */}
        <div className="mb-10 print:mb-6">
          <div className="flex items-center gap-2 mb-5 print:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-slate-400">AI-аналитик · Перезагрузка прибыльности</span>
          </div>

          <h1 className="text-3xl font-bold text-slate-100 mb-5 print:text-black">
            Отчёт: {data.company}
          </h1>

          <div className="flex flex-wrap gap-5 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>{data.company}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{data.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span>{data.mode}</span>
            </div>
          </div>
        </div>

        {/* Report body */}
        <div
          className="rounded-2xl p-8 print:rounded-none print:border-none print:bg-white print:p-0"
          style={{
            background: 'rgba(13,18,32,0.8)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="markdown-report">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.report}</ReactMarkdown>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex items-center justify-between print:hidden">
          <Link
            href="/analyze"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Новый анализ
          </Link>

          <button
            onClick={() => handleCopy(data.report)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Скопировано' : 'Скопировать отчёт'}
          </button>
        </div>
      </div>
    </div>
  )
}
