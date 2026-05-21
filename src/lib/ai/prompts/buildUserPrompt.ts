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

  lines.push('', '=== БИЗНЕС-ДИАГНОСТИКА ===', '')

  if (data.whatDoYouSell)
    lines.push(`Что продаёт / производит компания:\n${data.whatDoYouSell}`, '')
  if (data.whoIsCustomer)
    lines.push(`Кто основной клиент:\n${data.whoIsCustomer}`, '')
  if (data.revenueMechanics)
    lines.push(`Как бизнес зарабатывает деньги:\n${data.revenueMechanics}`, '')
  if (data.mainPain)
    lines.push(`Что сейчас больше всего мешает росту:\n${data.mainPain}`, '')
  if (data.bottleneckGuess)
    lines.push(`Где, по ощущению, сейчас узкое место:\n${data.bottleneckGuess}`, '')
  if (data.delaysQueues)
    lines.push(`Где возникают очереди, задержки или перегрузка:\n${data.delaysQueues}`, '')
  if (data.ownerDependency)
    lines.push(`Какие процессы зависят лично от собственника:\n${data.ownerDependency}`, '')
  if (data.unfinishedProjects)
    lines.push(`Проекты, которые забирают ресурсы, но пока не дают денег:\n${data.unfinishedProjects}`, '')
  if (data.triedBefore)
    lines.push(`Что уже пробовали исправить:\n${data.triedBefore}`, '')
  if (data.desiredResult)
    lines.push(`Желаемый результат через 30–90 дней:\n${data.desiredResult}`, '')
  if (data.extraContext)
    lines.push(`Дополнительный контекст:\n${data.extraContext}`, '')

  return lines.join('\n')
}
