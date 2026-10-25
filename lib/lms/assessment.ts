import type { Style } from './types.ts'
import { educationPlannerQuestionnaire } from './educationplanner.ts'

export type AssessmentOption = { id: string; label: string; style: Style }
export type AssessmentQuestion = { id: string; prompt: string; options: AssessmentOption[] }
export type AssessmentDefinition = { id: string; version: number; sourceUrl: string; questions: AssessmentQuestion[] }
export type AssessmentScore = {
  scores: Record<Style, number>
  leaders: Style[]
  answered: number
  total: number
  complete: boolean
}

export const ASSESSMENT_SOURCE = {
  url: 'https://www.educationplanner.org/students/self-assessments/learning-styles',
  verifiedModule: 'https://www.educationplanner.org/assets/learning-styles-hT05YZcg.js',
  verifiedOn: '2026-10-25',
  questionCount: 20,
  algorithm: 'one-point-per-choice-highest-count-with-ties',
  contentVerified: true,
  contentOrigin: 'user-provided-html-fragments',
  translationStatus: 'translated-from-user-provided-material',
  publishable: true,
  termsUrl: 'https://www.pheaa.org/about/online-services-terms-of-use',
} as const

export const EDUCATIONPLANNER_ASSESSMENT: AssessmentDefinition = {
  id: 'educationplanner', version: 1, sourceUrl: educationPlannerQuestionnaire.sourceUrl,
  questions: educationPlannerQuestionnaire.questions.map(question => ({
    id: question.id, prompt: question.prompt,
    options: question.options.map((option, index) => ({ id: String(index), label: option.text, style: option.style })),
  })),
}

export function scoreAssessment(definition: AssessmentDefinition, answers: Record<string, string>): AssessmentScore {
  const styles: Style[] = ['visual', 'auditory', 'kinesthetic']
  const scores: Record<Style, number> = { visual: 0, auditory: 0, kinesthetic: 0 }
  const questionIds = new Set(definition.questions.map(question => question.id))
  if (!definition.questions.length || questionIds.size !== definition.questions.length) throw new Error('Nieprawidłowa definicja ankiety.')
  if (Object.keys(answers).some(questionId => !questionIds.has(questionId))) throw new Error('Nieznane pytanie ankiety.')
  let answered = 0
  for (const question of definition.questions) {
    const selected = answers[question.id]
    if (selected === undefined) continue
    const option = question.options.find(candidate => candidate.id === selected)
    if (!option || !styles.includes(option.style)) throw new Error('Nieprawidłowa odpowiedź ankiety.')
    scores[option.style] += 1
    answered += 1
  }
  const highest = Math.max(...Object.values(scores))
  return {
    scores,
    leaders: highest ? styles.filter(style => scores[style] === highest) : [],
    answered,
    total: definition.questions.length,
    complete: answered === definition.questions.length,
  }
}
