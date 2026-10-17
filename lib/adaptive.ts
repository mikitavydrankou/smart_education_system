import { createLearning, reduceLearning, restoreWorkspace, normalizeSource, validateCourse, validateProfile, type Learning, type LearningAction, type Course, type Profile, type Format, type Source } from './material.ts'
import { conceptMedia, initialActivityAnswer, validActivityAnswer, gradeActivity } from './learning-media.ts'

export type Outcome = { conceptId: string; kind: 'quiz' | 'retry' | 'activity'; format: Format; correct: boolean }
type ActivityState = { answer: string[]; lastCheck: string[] | null; correct: boolean | null; first: boolean | null; revealed: boolean }
export type AdaptiveLearning = Omit<Learning, 'events'> & {
  automatic: boolean; discovery: boolean; manualLock: boolean; teachingFormat: Format; observed: boolean; quizOpen: boolean
  prior: Outcome[]; history: Outcome[]; activities: Record<string, ActivityState>; notice: string; events: AdaptiveAction[]
}
export type AdaptiveAction = LearningAction | { type: 'automatic'; enabled: boolean } | { type: 'activity-answer'; answer: string[] } | { type: 'audio-played' | 'activity-check' | 'activity-reveal' | 'activity-reset' }
export type AdaptiveWorkspace = { version: 2; source: Source; name: string; profile: Profile; course: Course; learning: AdaptiveLearning }
const modes: Format[] = ['text', 'visual', 'audio', 'practice']
export const formatNames: Record<Format, string> = { text: 'Tekst', visual: 'Schemat', audio: 'Audio', practice: 'Działanie' }
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function validateOutcomes(value: unknown): Outcome[] {
  if (!Array.isArray(value) || value.length > 200) return []
  return value.filter((v): v is Outcome => isRecord(v) && typeof v.conceptId === 'string' && v.conceptId.length <= 180 && ['quiz', 'retry', 'activity'].includes(v.kind as string) && modes.includes(v.format as Format) && typeof v.correct === 'boolean').map(v => ({ conceptId: v.conceptId, kind: v.kind, format: v.format, correct: v.correct }))
}
export function mergeOutcomes(...sets: Outcome[][]): Outcome[] {
  const map = new Map<string, Outcome>()
  for (const set of sets) for (const event of set) {
    const key = `${event.conceptId}:${event.kind}`
    if (!map.has(key)) map.set(key, event)
  }
  return [...map.values()].slice(-200)
}
function courseKey(course: Course): string {
  let h = 2166136261
  for (const ch of `${course.title}|${course.concepts.map(c => `${c.id}:${c.question.prompt}`).join('|')}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0).toString(16)
}
export function formatStatistics(s: Pick<AdaptiveLearning, 'prior' | 'history'>) {
  const result = Object.fromEntries(modes.map(f => [f, { total: 0, correct: 0, concepts: 0, estimate: 0.5 }])) as Record<Format, { total: number; correct: number; concepts: number; estimate: number }>
  const all = mergeOutcomes(s.prior, s.history).filter(o => o.kind === 'quiz')
  for (const f of modes) {
    const observed = all.filter(o => o.format === f)
    result[f] = { total: observed.length, correct: observed.filter(o => o.correct).length, concepts: new Set(observed.map(o => o.conceptId)).size, estimate: (observed.filter(o => o.correct).length + 1) / (observed.length + 2) }
  }
  return result
}
export function learnerSummary(s: AdaptiveLearning) {
  const stats = formatStatistics(s), eligible = modes.filter(f => stats[f].concepts >= 2)
  const ranked = [...eligible].sort((a, b) => stats[b].estimate - stats[a].estimate)
  const total = modes.reduce((n, f) => n + stats[f].total, 0)
  const leader = total >= 6 && ranked.length >= 2 && stats[ranked[0]].estimate - stats[ranked[1]].estimate >= 0.15 ? ranked[0] : null
  return { stats, total, leader, label: leader ? `Najlepsze dotąd wyniki: ${formatNames[leader]}` : total ? 'Profil w trakcie poznawania' : 'Poznajemy Twój sposób nauki' }
}
function nextPresentation(s: AdaptiveLearning): { format: Format; notice: string } {
  if (!s.automatic) return { format: s.preferredFormat, notice: 'Wybór automatyczny jest wyłączony. Korzystamy z Twojej preferencji.' }
  const summary = learnerSummary(s)
  if (summary.leader) return { format: summary.leader, notice: `Wstępna sugestia na podstawie ${summary.total} pierwszych sprawdzeń: ${formatNames[summary.leader]}. To obserwacja, nie stały typ uczenia się.` }
  if (s.discovery) {
    const least = [...modes].sort((a, b) => summary.stats[a].total - summary.stats[b].total || modes.indexOf(a) - modes.indexOf(b))[0]
    return { format: least, notice: `Wciąż zbieramy dane. Wypróbuj format „${formatNames[least]}” na nowym temacie; możesz go zmienić.` }
  }
  return { format: s.preferredFormat, notice: 'Za mało porównywalnych wyników do zmiany rekomendacji. Zostajemy przy Twojej preferencji.' }
}
export function createAdaptiveLearning(course: Course, profile: Profile, prior: Outcome[] = []): AdaptiveLearning {
  return { ...createLearning(course, profile), automatic: true, discovery: profile.discover === true, manualLock: false, teachingFormat: profile.format, observed: profile.format === 'text' || profile.format === 'visual', quizOpen: false, prior: validateOutcomes(prior), history: [], activities: {}, notice: profile.discover ? 'Na początku sprawdzimy różne sposoby pracy. Profil będzie się aktualizował po pierwszych odpowiedziach z kolejnych tematów.' : 'Zaczynamy od wybranego formatu. Wyniki mogą pomóc dobrać kolejne wyjaśnienia.', events: [] }
}
export function activityState(s: AdaptiveLearning, course: Course): ActivityState {
  const c = course.concepts.find(c => c.id === s.ids[s.index])!
  return s.activities[c.id] ?? { answer: initialActivityAnswer(conceptMedia(c, course).activity), lastCheck: null, correct: null, first: null, revealed: false }
}
export function reduceAdaptiveLearning(s: AdaptiveLearning, action: AdaptiveAction, course: Course): AdaptiveLearning {
  let n: AdaptiveLearning = s
  const c = course.concepts.find(c => c.id === s.ids[s.index])
  const key = c ? `${courseKey(course)}:${c.id}` : ''
  if (action.type === 'automatic' && typeof action.enabled === 'boolean') n = { ...s, automatic: action.enabled, manualLock: false, notice: action.enabled ? 'Automatyczny dobór włączony. Ręczny wybór formatu nadal jest dostępny.' : 'Automatyczny dobór wyłączony. Ty wybierasz sposób pracy.' }
  else if (action.type === 'audio-played' && s.stage === 'study' && s.format === 'audio') n = { ...s, teachingFormat: 'audio', observed: true }
  else if (['activity-answer', 'activity-check', 'activity-reveal', 'activity-reset'].includes(action.type) && s.stage === 'study' && c) {
    const a = conceptMedia(c, course).activity, current = activityState(s, course)
    let updated = current, history = s.history
    if (action.type === 'activity-answer' && validActivityAnswer(a, action.answer)) updated = { ...current, answer: action.answer, correct: null }
    if (action.type === 'activity-reset') updated = { ...current, answer: initialActivityAnswer(a), lastCheck: null, correct: null }
    if (action.type === 'activity-reveal') updated = { ...current, answer: [...a.solution], correct: null, revealed: true }
    if (action.type === 'activity-check' && current.answer.every(Boolean) && JSON.stringify(current.answer) !== JSON.stringify(current.lastCheck)) {
      const correct = gradeActivity(a, current.answer)
      updated = { ...current, lastCheck: [...current.answer], correct, first: current.first ?? (current.revealed ? null : correct) }
      if (current.first === null && !current.revealed) history = mergeOutcomes(history, [{ conceptId: key, kind: 'activity', format: 'practice', correct }])
    }
    if (updated !== current) n = { ...s, activities: { ...s.activities, [c.id]: updated }, history, ...(action.type === 'activity-answer' ? { observed: true, teachingFormat: 'practice' as const } : {}) }
  } else {
    if (action.type === 'select' && !s.quizOpen) return s
    const base = reduceLearning(s as unknown as Learning, action as LearningAction, course)
    if (base === (s as unknown as Learning)) return s
    n = { ...s, ...base, events: s.events }
    if (action.type === 'start' && s.automatic && s.discovery) {
      const chosen = nextPresentation(n)
      n = { ...n, format: chosen.format, teachingFormat: chosen.format, observed: chosen.format === 'text' || chosen.format === 'visual', notice: chosen.notice }
    }
    if (action.type === 'format') n = { ...n, teachingFormat: action.format, observed: action.format === 'text' || action.format === 'visual', manualLock: true, notice: 'Ręczny wybór na ten temat. Wyniki odnosimy do ostatniej formy pracy; samo otwarcie audio lub zadania nie jest dowodem użycia.' }
    if (action.type === 'practice') { n.quizOpen = true; n.format = s.format }
    if (action.type === 'submit' && c && s.observed) n.history = mergeOutcomes(s.history, [{ conceptId: key, kind: s.phase === 'retry' ? 'retry' : 'quiz', format: s.teachingFormat, correct: s.selected === (s.phase === 'retry' ? c.retry.answer : c.question.answer) }])
    if (action.type === 'next' && n.phase === 'retry') {
      const alternative: Record<Format, Format> = { text: 'visual', visual: 'practice', practice: 'audio', audio: 'visual' }
      const candidate = alternative[s.teachingFormat]
      n.quizOpen = true
      n.format = s.format
      n.notice = s.automatic && !s.manualLock ? `Po błędzie proponujemy inną perspektywę: ${formatNames[candidate]}. Możesz wybrać dowolny format przed drugą próbą.` : `Zachowujemy Twój wybór: ${formatNames[s.format]}. Możesz zmienić format przed drugą próbą.`
      if (s.automatic && !s.manualLock) { n.format = candidate; n.teachingFormat = candidate; n.observed = candidate === 'visual' || candidate === 'text' }
    }
    if (action.type === 'next' && n.index !== s.index) {
      const chosen = nextPresentation(n)
      n = { ...n, format: chosen.format, teachingFormat: chosen.format, observed: chosen.format === 'text' || chosen.format === 'visual', quizOpen: false, manualLock: false, notice: chosen.notice }
    }
  }
  return n === s ? s : { ...n, events: [...s.events, action] }
}
export function restoreAdaptiveWorkspace(raw: string | null): AdaptiveWorkspace | null {
  try {
    if (!raw || raw.length > 700_000) return null
    const v = JSON.parse(raw)
    if (v?.version === 1) {
      const old = restoreWorkspace(raw)
      if (!old) return null
      let learning = createAdaptiveLearning(old.course, old.profile)
      learning = reduceAdaptiveLearning(learning, { type: 'automatic', enabled: false }, old.course)
      for (const event of old.learning.events) {
        if (event.type === 'select' && !learning.quizOpen) learning = reduceAdaptiveLearning(learning, { type: 'practice' }, old.course)
        learning = reduceAdaptiveLearning(learning, event, old.course)
      }
      learning = reduceAdaptiveLearning(learning, { type: 'automatic', enabled: true }, old.course)
      if (learning.stage !== old.learning.stage || learning.index !== old.learning.index || learning.phase !== old.learning.phase || learning.selected !== old.learning.selected || JSON.stringify(learning.attempts) !== JSON.stringify(old.learning.attempts)) return null
      return { ...old, version: 2, learning }
    }
    if (!isRecord(v) || v.version !== 2 || !isRecord(v.source) || !isRecord(v.learning) || typeof v.name !== 'string' || !v.name.trim() || v.name.length > 120 || !Array.isArray(v.learning.events) || v.learning.events.length > 5000) return null
    const source = normalizeSource(v.source.text), profile = validateProfile(v.profile)
    if (!source || !profile || JSON.stringify(source) !== JSON.stringify(v.source)) return null
    const course = validateCourse(v.course, source)
    if (!course || !Array.isArray(v.learning.prior) || JSON.stringify(validateOutcomes(v.learning.prior)) !== JSON.stringify(v.learning.prior)) return null
    let learning = createAdaptiveLearning(course, profile, v.learning.prior as Outcome[])
    for (const a of v.learning.events) {
      if (!isRecord(a)) return null
      const next = reduceAdaptiveLearning(learning, a as AdaptiveAction, course)
      if (next === learning) return null
      learning = next
    }
    if (JSON.stringify(learning) !== JSON.stringify(v.learning)) return null
    return { version: 2, name: v.name, source, profile, course, learning }
  } catch { return null }
}
