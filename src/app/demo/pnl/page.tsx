import ReportDisplay from '@/app/report/[id]/ReportDisplay'
import { demoPnlReport } from '@/lib/demoReports'

export const metadata = {
  title: 'Пример P&L-отчёта — Перезагрузка прибыльности',
}

const demoData = {
  id: 'demo-pnl',
  report: demoPnlReport,
  company: 'ТехКонсалт (демо)',
  date: '21 мая 2026',
  mode: 'P&L Analysis',
  agentType: 'pnl' as const,
}

export default function DemoPnlPage() {
  return <ReportDisplay data={demoData} isDemo />
}
