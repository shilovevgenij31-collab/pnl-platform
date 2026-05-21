import ReportDisplay from '@/app/report/[id]/ReportDisplay'
import { demoGoldrattReport } from '@/lib/demoReports'

export const metadata = {
  title: 'Пример Goldratt-отчёта — Перезагрузка прибыльности',
}

const demoData = {
  id: 'demo-goldratt',
  report: demoGoldrattReport,
  company: 'РекрутПро (демо)',
  date: '21 мая 2026',
  mode: 'Goldratt / TOC',
  agentType: 'goldratt' as const,
}

export default function DemoGoldrattPage() {
  return <ReportDisplay data={demoData} isDemo />
}
