import ReportDisplay from '@/app/report/[id]/ReportDisplay'
import { demoGoldrattReport, demoGoldrattSourceText } from '@/lib/demoReports'

export const metadata = {
  title: 'Пример Goldratt-отчёта — Перезагрузка прибыльности',
}

const demoData = {
  id: 'demo-goldratt',
  report: demoGoldrattReport,
  company: 'FlowDesk AI (демо)',
  date: '25 мая 2026',
  mode: 'Goldratt / TOC',
  agentType: 'goldratt' as const,
  sourceText: demoGoldrattSourceText,
}

export default function DemoGoldrattPage() {
  return <ReportDisplay data={demoData} isDemo />
}
