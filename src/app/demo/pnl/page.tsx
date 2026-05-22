import ReportDisplay from '@/app/report/[id]/ReportDisplay'
import { demoPnlReport, demoPnlSourceText } from '@/lib/demoReports'

export const metadata = {
  title: 'Демо P&L-отчёта: Лига Миров — Перезагрузка прибыльности',
}

const demoData = {
  id: 'demo-pnl',
  report: demoPnlReport,
  company: 'Лига Миров (демо)',
  date: '22 мая 2026',
  mode: 'P&L Analysis',
  agentType: 'pnl' as const,
  sourceText: demoPnlSourceText,
}

export default function DemoPnlPage() {
  return <ReportDisplay data={demoData} isDemo />
}
