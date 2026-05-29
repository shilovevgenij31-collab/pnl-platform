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

  lines.push('=== КОНТЕКСТ БИЗНЕСА ДЛЯ ПОИСКА ОГРАНИЧЕНИЯ ===', '')

  if (data.company) lines.push(`Компания: ${data.company}`)
  if (data.businessType?.trim()) lines.push(`Тип бизнеса: ${data.businessType}`)
  if (data.company || data.businessType?.trim()) lines.push('')

  if (data.whatDoYouSell?.trim()) {
    lines.push('Что продаёт и кому:', data.whatDoYouSell, '')
  }

  if (data.revenueMechanics?.trim()) {
    lines.push('Основные источники выручки:', data.revenueMechanics, '')
  }

  if (data.ownerDependency?.trim()) {
    lines.push('Команда:', data.ownerDependency, '')
  }

  const hasMargin = data.currentMargin?.trim() || data.targetMargin?.trim()
  if (hasMargin) {
    if (data.currentMargin?.trim()) lines.push(`Текущая рентабельность: ${data.currentMargin}`)
    if (data.targetMargin?.trim()) lines.push(`Целевая рентабельность: ${data.targetMargin}`)
    lines.push('')
  }

  if (data.mainPain?.trim()) {
    lines.push('Главная боль:', data.mainPain, '')
  }

  if (data.bottleneckGuess?.trim()) {
    lines.push('Где предприниматель сам видит бутылочное горлышко:', data.bottleneckGuess, '')
  }

  if (data.founderPlan?.trim()) {
    lines.push('Как предприниматель предлагает исправлять проблему:', data.founderPlan, '')
  }

  if (data.pnlText?.trim()) {
    lines.push('=== ПРИЛОЖЕННЫЙ ДОКУМЕНТ ===', '')
    if (data.sourceFileName) lines.push(`Файл: ${data.sourceFileName}`)
    if (data.selectedSheet) lines.push(`Лист: ${data.selectedSheet}`)
    if (data.qualityScore) lines.push(`Оценка пригодности: ${data.qualityScore}/100`)
    lines.push('', data.pnlText.trim())
  }

  return lines.join('\n')
}
