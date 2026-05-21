import type { AgentType } from '@/lib/types'
import AnalyzeClient from './AnalyzeClient'

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>
}) {
  const params = await searchParams
  const initialAgent: AgentType = params.agent === 'goldratt' ? 'goldratt' : 'pnl'
  return <AnalyzeClient initialAgent={initialAgent} />
}
