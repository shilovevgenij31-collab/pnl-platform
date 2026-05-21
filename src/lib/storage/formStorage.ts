import type { AnalyzeFormFields, AgentType } from '@/lib/types'

const DRAFT_KEYS: Record<AgentType, string> = {
  pnl: 'pnl-form-draft',
  goldratt: 'goldratt-form-draft',
}

export function saveFormDraft(agentType: AgentType, data: AnalyzeFormFields): void {
  try {
    localStorage.setItem(DRAFT_KEYS[agentType], JSON.stringify(data))
  } catch {
    // localStorage unavailable (SSR, private mode, quota exceeded)
  }
}

export function getFormDraft(agentType: AgentType): AnalyzeFormFields | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEYS[agentType])
    if (!raw) return null
    return JSON.parse(raw) as AnalyzeFormFields
  } catch {
    return null
  }
}

export function clearFormDraft(agentType: AgentType): void {
  try {
    localStorage.removeItem(DRAFT_KEYS[agentType])
  } catch {
    // ignore
  }
}
