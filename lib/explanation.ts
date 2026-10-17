import { concepts, practiceQuestions } from './lesson-data.ts'
export const explanationStyles = ['simple', 'example', 'steps'] as const
export type ExplanationStyle = typeof explanationStyles[number]
export type MistakeInput = { questionId: string; retry: boolean; selected: number; style: ExplanationStyle }
export function resolveMistake(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<MistakeInput>
  const q = practiceQuestions.find(q => q.id === v.questionId)
  if (!q || typeof v.retry !== 'boolean' || !explanationStyles.includes(v.style as ExplanationStyle)) return null
  const question = v.retry ? q.retry : q
  if (typeof v.selected !== 'number' || !Number.isInteger(v.selected) || v.selected < 0 || v.selected >= question.options.length || v.selected === question.answer) return null
  const concept = concepts.find(c => c.id === q.concept)!
  const style = v.style as ExplanationStyle
  return {
    concept: concept.title, question: question.prompt, selectedAnswer: question.options[v.selected],
    correctAnswer: question.options[question.answer], verifiedExplanation: question.reason,
    requestedStyle: style,
    fallback: `Wybrano: „${question.options[v.selected]}”. Poprawna odpowiedź: „${question.options[question.answer]}”. ${question.reason} ${style === 'example' ? concept.example : style === 'steps' ? concept.steps : concept.simple}`,
  }
}
