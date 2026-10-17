import { concepts, knowledgeQuestions, practiceQuestions, type ConceptId } from './lesson-data.ts'

export type Action =
  | { type: 'assessment'; answer: number }
  | { type: 'select'; answer: number }
  | { type: 'visit'; concept: ConceptId }
  | { type: 'practice' | 'submit' | 'next' }
export type Attempt = { answer: number; retryAnswer?: number }
export type Session = {
  version: 2; stage: 'knowledge' | 'lesson' | 'practice' | 'results'
  assessment: number[]; completed: ConceptId[]; activeConcept: ConceptId
  practiceIndex: number; selected: number | null
  phase: 'question' | 'feedback' | 'retry' | 'retryFeedback'
  attempts: Attempt[]; events: Action[]
}
export function createSession(): Session {
  return { version: 2, stage: 'knowledge', assessment: [], completed: [], activeConcept: 'dns', practiceIndex: 0, selected: null, phase: 'question', attempts: [], events: [] }
}
export function getWeakConcepts(s: Session): ConceptId[] {
  return knowledgeQuestions.filter((q, i) => s.assessment[i] !== undefined && s.assessment[i] !== q.answer).map(q => q.concept)
}
const validAnswer = (a: number, options: string[]) => Number.isInteger(a) && a >= 0 && a < options.length
export function reduceSession(s: Session, action: Action): Session {
  let next: Session = s
  if (action.type === 'select' && s.stage === 'knowledge' && validAnswer(action.answer, knowledgeQuestions[s.assessment.length].options)) {
    next = { ...s, selected: action.answer }
  } else if (action.type === 'assessment' && s.stage === 'knowledge') {
    const q = knowledgeQuestions[s.assessment.length]
    if (!q || s.selected !== action.answer || !validAnswer(action.answer, q.options)) return s
    const assessment = [...s.assessment, action.answer]
    next = { ...s, assessment, selected: null, stage: assessment.length === knowledgeQuestions.length ? 'lesson' : 'knowledge' }
    if (next.stage === 'lesson') next.activeConcept = getWeakConcepts(next)[0] ?? 'dns'
  } else if (action.type === 'visit' && s.stage === 'lesson' && concepts.some(c => c.id === action.concept)) {
    next = { ...s, activeConcept: action.concept, completed: [...new Set([...s.completed, action.concept])] }
  } else if (action.type === 'practice' && s.stage === 'lesson') {
    next = { ...s, stage: 'practice' }
  } else if (s.stage === 'practice') {
    const q = practiceQuestions[s.practiceIndex]
    if (!q) return s
    const current = s.phase === 'retry' || s.phase === 'retryFeedback' ? q.retry : q
    if (action.type === 'select' && (s.phase === 'question' || s.phase === 'retry') && validAnswer(action.answer, current.options)) {
      next = { ...s, selected: action.answer }
    } else if (action.type === 'submit' && s.selected !== null && (s.phase === 'question' || s.phase === 'retry')) {
      const attempts = [...s.attempts]
      attempts[s.practiceIndex] = s.phase === 'retry'
        ? { ...attempts[s.practiceIndex], retryAnswer: s.selected }
        : { answer: s.selected }
      next = { ...s, attempts, phase: s.phase === 'retry' ? 'retryFeedback' : 'feedback' }
    } else if (action.type === 'next' && (s.phase === 'feedback' || s.phase === 'retryFeedback')) {
      if (s.phase === 'feedback' && s.selected !== q.answer) next = { ...s, phase: 'retry', selected: null }
      else next = { ...s, practiceIndex: s.practiceIndex + 1, phase: 'question', selected: null, stage: s.practiceIndex + 1 === practiceQuestions.length ? 'results' : 'practice' }
    }
  }
  return next === s ? s : { ...next, events: [...s.events, action] }
}

// Replay only valid events, then require a matching canonical snapshot. Never trust stored indexes or scores.
export function restoreSession(raw: string | null): Session {
  try {
    if (!raw || raw.length > 500_000) return createSession()
    const value = JSON.parse(raw)
    if (!value || value.version !== 2 || !Array.isArray(value.events) || value.events.length > 5000) return createSession()
    let session = createSession()
    for (const event of value.events) {
      if (!event || typeof event !== 'object') return createSession()
      const next = reduceSession(session, event)
      if (next === session) return createSession()
      session = next
    }
    if (JSON.stringify(session) !== JSON.stringify(value)) return createSession()
    return session
  } catch { return createSession() }
}
export function getResults(s: Session) {
  const first: ConceptId[] = [], retry: ConceptId[] = [], review: ConceptId[] = []
  for (const c of concepts) {
    const questions = practiceQuestions.map((q, i) => ({ q, attempt: s.attempts[i] })).filter(({ q }) => q.concept === c.id)
    if (questions.some(({ q, attempt }) => !attempt || (attempt.answer !== q.answer && attempt.retryAnswer !== q.retry.answer))) review.push(c.id)
    else if (questions.some(({ q, attempt }) => attempt.answer !== q.answer)) retry.push(c.id)
    else first.push(c.id)
  }
  return {
    first, retry, review,
    firstCorrect: s.attempts.filter((a, i) => a.answer === practiceQuestions[i].answer).length,
    correctAfterRetry: s.attempts.filter((a, i) => a.answer !== practiceQuestions[i].answer && a.retryAnswer === practiceQuestions[i].retry.answer).length,
  }
}
