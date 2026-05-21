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
      style={{ background: '#F4F7FB' }}
    >
      <div
        className="text-center max-w-sm mx-auto rounded-3xl border p-8"
        style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.07)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: '#EFF6FF' }}
        >
          <BarChart3 className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold mb-3" style={{ color: '#0F172A' }}>Отчёт не найден</h2>
        <p className="text-sm mb-8" style={{ color: '#64748B' }}>Отчёт не найден или был удалён.</p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl font-medium text-sm"
          style={{ background: '#2563EB' }}
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
