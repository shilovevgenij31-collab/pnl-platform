import type { AnalyzeFormFields, AgentType } from '@/lib/types'

type FormInput = Partial<AnalyzeFormFields>

export function buildUserPrompt(data: FormInput, agentType: AgentType): string {
  return agentType === 'goldratt'
    ? buildGoldrattUserPrompt(data)
    : buildPnlUserPrompt(data)
}

function buildPnlUserPrompt(data: FormInput): string {
  const lines: string[] = []

  lines.push('=== КОНТЕКСТ БИЗНЕСА ===', '')
  if (data.name) lines.push(`Имя: ${data.name}`)
  if (data.company) lines.push(`Компания: ${data.company}`)
  if (data.businessType) lines.push(`Тип бизнеса: ${data.businessType}`)
  if (data.industry) lines.push(`Ниша / отрасль: ${data.industry}`)
  if (data.geography) lines.push(`География: ${data.geography}`)
  if (data.team) lines.push(`Команда: ${data.team}`)
  if (data.currentRevenue) lines.push(`Текущая выручка: ${data.currentRevenue}`)
  if (data.currentMargin) lines.push(`Текущая рентабельность: ${data.currentMargin}`)
  if (data.targetMargin) lines.push(`Целевая рентабельность: ${data.targetMargin}`)
  if (data.mainPain) lines.push('', 'Главная боль прямо сейчас:', data.mainPain)
  if (data.triedBefore) lines.push('', 'Что уже пробовали для роста прибыли:', data.triedBefore)
  if (data.extraContext) lines.push('', 'Дополнительный контекст:', data.extraContext)

  if (data.founderPlan?.trim()) {
    lines.push('', '=== КАК ПРЕДПРИНИМАТЕЛЬ ВИДИТ РЕШЕНИЕ ===', '', data.founderPlan)
  }

  if (data.pnlText?.trim()) {
    lines.push('', '=== P&L / ФИНАНСОВЫЕ ДАННЫЕ ===', '', data.pnlText)
  }

  return lines.join('\n')
}

function buildGoldrattUserPrompt(data: FormInput): string {
  const lines: string[] = []

  lines.push('=== КОНТЕКСТ БИЗНЕСА ===', '')
  if (data.name) lines.push(`Имя: ${data.name}`)
  if (data.company) lines.push(`Компания: ${data.company}`)
  if (data.businessType) lines.push(`Тип бизнеса: ${data.businessType}`)
  if (data.industry) lines.push(`Ниша / отрасль: ${data.industry}`)
  if (data.geography) lines.push(`География: ${data.geography}`)
  if (data.team) lines.push(`Команда: ${data.team}`)

  lines.push('', '=== 1. О БИЗНЕСЕ — ЧТО И КОМУ ===', '')
  if (data.whatDoYouSell) lines.push(`Чем занимается бизнес:\n${data.whatDoYouSell}`, '')
  if (data.whoIsCustomer) lines.push(`Кто платит деньги прямо сейчас:\n${data.whoIsCustomer}`, '')
  if (data.businessAge) lines.push(`Сколько лет бизнесу и сколько человек в команде:\n${data.businessAge}`, '')
  if (data.revenueMechanics) lines.push(`Основные направления / продукты:\n${data.revenueMechanics}`, '')
  if (data.partnersRoles) lines.push(`Партнёры, роли и доли:\n${data.partnersRoles}`, '')

  lines.push('', '=== 2. ДЕНЬГИ — ЦИФРЫ ЧЕСТНО ===', '')
  if (data.currentRevenue) lines.push(`Ежемесячная выручка:\n${data.currentRevenue}`, '')
  if (data.currentProfit) lines.push(`Чистая прибыль / доход собственника:\n${data.currentProfit}`, '')
  if (data.currentMargin) lines.push(`Текущая рентабельность:\n${data.currentMargin}`, '')
  if (data.targetMargin) lines.push(`Целевая рентабельность:\n${data.targetMargin}`, '')
  if (data.ownerFinancialGoal) lines.push(`Личная финансовая цель собственника:\n${data.ownerFinancialGoal}`, '')

  lines.push('', '=== 3. ГДЕ ЗАСТРЯЛО — УЗКОЕ МЕСТО ===', '')
  if (data.mainPain) lines.push(`Что мешает зарабатывать больше прямо сейчас:\n${data.mainPain}`, '')
  if (data.delaysQueues) lines.push(`Где скапливается очередь, задержка или перегрузка:\n${data.delaysQueues}`, '')
  if (data.ownerDependency) lines.push(`Что не двигается без собственника, ключевого человека или одного этапа:\n${data.ownerDependency}`, '')
  if (data.oneProblemToRemove) lines.push(`Если убрать одну проблему, что бы это было:\n${data.oneProblemToRemove}`, '')
  if (data.bottleneckGuess) lines.push(`Гипотеза пользователя о возможном ограничении:\n${data.bottleneckGuess}`, '')

  lines.push('', '=== 4. ЧТО УЖЕ ПРОБОВАЛИ ===', '')
  if (data.triedBefore) lines.push(`Какие решения уже пробовали:\n${data.triedBefore}`, '')
  if (data.triedResults) lines.push(`Что сработало, что не сработало:\n${data.triedResults}`, '')
  if (data.unfinishedProjects) lines.push(`Незавершённые проекты или активы без потока денег:\n${data.unfinishedProjects}`, '')

  lines.push('', '=== 5. СОБСТВЕННИК КАК ЧАСТЬ СИСТЕМЫ ===', '')
  if (data.ownerDailyRole) lines.push(`Что собственник делает лично каждый день:\n${data.ownerDailyRole}`, '')
  if (data.ownerStrengthsWeaknesses) lines.push(`Сильные и слабые стороны собственника:\n${data.ownerStrengthsWeaknesses}`, '')

  lines.push('', '=== 6. ГОРИЗОНТ И ПРИОРИТЕТЫ ===', '')
  if (data.planningHorizon) lines.push(`Горизонт планирования:\n${data.planningHorizon}`, '')
  if (data.competingPriorities) lines.push(`Какие проекты и направления конкурируют за внимание:\n${data.competingPriorities}`, '')
  if (data.highestImpactDecision) lines.push(`Какое одно решение сильнее всего повлияет на результат:\n${data.highestImpactDecision}`, '')
  if (data.desiredResult) lines.push(`Желаемый результат через 30–90 дней:\n${data.desiredResult}`, '')
  if (data.extraContext) lines.push(`Дополнительный контекст:\n${data.extraContext}`, '')

  if (data.founderPlan?.trim()) {
    lines.push('', '=== КАК ПРЕДПРИНИМАТЕЛЬ ВИДИТ РЕШЕНИЕ ===', '', data.founderPlan)
  }

  if (data.pnlText?.trim()) {
    lines.push('', '=== ПРИЛОЖЕННЫЙ ДОКУМЕНТ / ДОПОЛНИТЕЛЬНЫЙ ИСТОЧНИК ===', '')
    if (data.sourceFileName) lines.push(`Файл: ${data.sourceFileName}`)
    if (data.selectedSheet) lines.push(`Лист: ${data.selectedSheet}`)
    if (data.qualityScore) lines.push(`Оценка пригодности источника: ${data.qualityScore}/100`)
    lines.push('', data.pnlText.trim())
  }

  return lines.join('\n')
}
