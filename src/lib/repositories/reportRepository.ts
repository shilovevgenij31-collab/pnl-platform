import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SaveReportInput, ReportPageData, AgentType } from '@/lib/types'

export async function saveReportToDatabase(input: SaveReportInput): Promise<{ id: string }> {
  // createSupabaseServerClient throws if env vars are missing — let it propagate
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('reports')
    .insert({
      name: input.name || null,
      email: input.email || null,
      telegram: input.telegram || null,
      company: input.company || null,
      business_type: input.businessType || null,
      industry: input.industry || null,
      geography: input.geography || null,
      team: input.team || null,
      current_revenue: input.currentRevenue || null,
      current_margin: input.currentMargin || null,
      target_margin: input.targetMargin || null,
      main_pain: input.mainPain || null,
      tried_before: input.triedBefore || null,
      extra_context: input.extraContext || null,
      pnl_text: input.pnlText || null,
      report: input.report,
      model_used: input.modelUsed || null,
      agent_type: input.agentType || 'pnl',
      status: 'completed',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[saveReportToDatabase] Supabase error:', error.code, error.message, error.details)
    throw new Error(`DB_SAVE_FAILED: ${error.message}`)
  }

  return { id: data.id as string }
}

export async function getReportById(id: string): Promise<ReportPageData | null> {
  let supabase: ReturnType<typeof createSupabaseServerClient>

  try {
    supabase = createSupabaseServerClient()
  } catch (err) {
    console.error('[getReportById] Supabase not configured:', err)
    return null
  }

  const { data, error } = await supabase
    .from('reports')
    .select('id, created_at, company, report, agent_type, model_used')
    .eq('id', id)
    .single()

  if (error) {
    // PGRST116 = no rows — not an unexpected error
    if (error.code !== 'PGRST116') {
      console.error('[getReportById] DB error:', error.code, error.message)
    }
    return null
  }

  if (!data) return null

  const agentType: AgentType =
    (data.agent_type as string) === 'goldratt' ? 'goldratt' : 'pnl'

  return {
    id: data.id as string,
    report: data.report as string,
    company: (data.company as string | null) || 'Ваш бизнес',
    date: new Date(data.created_at as string).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    mode: agentType === 'goldratt' ? 'Goldratt / TOC' : 'P&L Analysis',
    agentType,
    modelUsed: (data.model_used as string | null) || null,
  }
}
