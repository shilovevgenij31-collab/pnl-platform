export type AgentType = 'pnl' | 'goldratt'

// Form fields — all strings so forms can use empty-string defaults
export interface AnalyzeFormFields {
  agentType: AgentType
  // Contact (common)
  name: string
  email: string
  telegram: string
  company: string
  // Business context (common)
  businessType: string
  industry: string
  geography: string
  team: string
  mainPain: string
  triedBefore: string
  extraContext: string
  // P&L Agent specific
  currentRevenue: string
  currentMargin: string
  targetMargin: string
  pnlText: string
  // Goldratt Agent specific
  whatDoYouSell: string
  whoIsCustomer: string
  revenueMechanics: string
  bottleneckGuess: string
  delaysQueues: string
  ownerDependency: string
  unfinishedProjects: string
  desiredResult: string
  businessAge: string
  partnersRoles: string
  currentProfit: string
  ownerFinancialGoal: string
  oneProblemToRemove: string
  triedResults: string
  ownerDailyRole: string
  ownerStrengthsWeaknesses: string
  planningHorizon: string
  competingPriorities: string
  highestImpactDecision: string
  founderPlan?: string
  sourceFileName?: string
  selectedSheet?: string
  parsedRows?: string
  parsedColumns?: string
  qualityScore?: string
  qualityWarnings?: string
}

// AI message passed to any provider
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// AI response returned by any provider
export interface AIResponse {
  content: string
  modelUsed: string
}

// Report persisted in localStorage (no id — legacy fallback)
export interface StoredReport {
  report: string
  company: string
  date: string
  mode: string
}

// Input when saving a new report to the database
export interface SaveReportInput extends Partial<AnalyzeFormFields> {
  report: string
  modelUsed?: string
}

// Data passed to the report page (DB-backed, always has id)
export interface ReportPageData {
  id: string
  report: string
  company: string
  date: string
  mode: string
  agentType: AgentType
  modelUsed?: string | null
  sourceText?: string | null
}

// Typed error codes for all API responses
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AI_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'AI_PROVIDER_ERROR'
  | 'AI_EMPTY_RESPONSE'
  | 'DB_SAVE_FAILED'
  | 'NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

// Shapes returned by POST /api/analyze

export interface AnalyzeApiSuccess {
  id: string
  status: 'success'
}

export interface AnalyzeApiError {
  error: string
  code: ErrorCode
  requestId?: string
}

// AI succeeded but DB save failed — report text returned so client can use localStorage fallback
export interface AnalyzeApiSaveFailure extends AnalyzeApiError {
  code: 'DB_SAVE_FAILED'
  report: string
  company: string
}
