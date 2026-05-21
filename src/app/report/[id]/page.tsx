import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { getReportById } from '@/lib/repositories/reportRepository'
import ReportDisplay from './ReportDisplay'

export const dynamic = 'force-dynamic'

// Matches Supabase UUID v4 format — avoids unnecessary DB queries for invalid ids
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: '#060a14' }}
    >
      <div className="text-center max-w-sm mx-auto">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(13,18,32,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <BarChart3 className="w-7 h-7 text-slate-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-200 mb-3">Отчёт не найден</h2>
        <p className="text-slate-400 text-sm mb-8">Отчёт не найден или был удалён.</p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-xl font-medium text-sm"
        >
          Создать новый анализ
        </Link>
      </div>
    </div>
  )
}

export default async function ReportByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Skip DB query for obviously invalid ids
  if (!UUID_REGEX.test(id)) {
    return <NotFound />
  }

  const data = await getReportById(id)

  if (!data) {
    return <NotFound />
  }

  return <ReportDisplay data={data} />
}
