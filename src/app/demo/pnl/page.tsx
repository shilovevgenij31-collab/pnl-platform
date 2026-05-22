import ReportDisplay from '@/app/report/[id]/ReportDisplay'
import { demoPnlReport, demoPnlSourceText } from '@/lib/demoReports'

export const metadata = {
  title: 'Демо P&L-отчёта: АгентПро — Перезагрузка прибыльности',
}

const demoData = {
  id: 'demo-pnl',
  report: demoPnlReport,
  company: 'АгентПро (демо)',
  date: '22 мая 2025',
  mode: 'P&L Analysis',
  agentType: 'pnl' as const,
  sourceText: demoPnlSourceText,
}

export default function DemoPnlPage() {
  return <ReportDisplay data={demoData} isDemo />
}
