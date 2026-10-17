import { validateMedia, type LearningMedia } from './learning-media.ts'
export type Format = 'text' | 'visual' | 'audio' | 'practice'
export type Profile = { goal: 'understand' | 'exam' | 'apply'; level: 'beginner' | 'intermediate'; minutes: 5 | 15 | 30; format: Format; discover?: boolean }
export type Source = { text: string; blocks: { id: string; text: string }[] }
export type MaterialQuestion = { prompt: string; options: string[]; answer: number; reason: string }
export type MaterialConcept = {
  id: string; title: string; explanation: string; simple: string; example: string; steps: string[]
  evidence: { blockId: string; quote: string }[]; question: MaterialQuestion; retry: MaterialQuestion
  media?: LearningMedia
}
export type Course = { title: string; introduction: string; concepts: MaterialConcept[]; mediaVersion?: 2 }
export const defaultProfile: Profile = { goal: 'understand', level: 'beginner', minutes: 15, format: 'text', discover: true }
const formats = ['text', 'visual', 'audio', 'practice']
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown, min = 1, max = 2000): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max

export function normalizeSource(value: unknown): Source | null {
  if (typeof value !== 'string' || value.length > 20_000) return null
  const normalized = value.replace(/\r\n?/g, '\n').replace(/\0/g, '').trim()
  if (normalized.length < 120) return null
  const chunks = normalized.split(/\n\s*\n/).flatMap(paragraph => {
    const result: string[] = []
    for (let i = 0; i < paragraph.length; i += 1600) result.push(paragraph.slice(i, i + 1600).trim())
    return result.filter(Boolean)
  })
  const blocks = chunks.map((value, i) => ({ id: `b${i + 1}`, text: value }))
  const canonical = blocks.map(b => b.text).join('\n\n')
  return canonical.length <= 20_000 ? { text: canonical, blocks } : null
}
export function validateProfile(v: unknown): Profile | null {
  if (!object(v) || !['understand', 'exam', 'apply'].includes(v.goal as string) || !['beginner', 'intermediate'].includes(v.level as string) || ![5, 15, 30].includes(v.minutes as number) || !formats.includes(v.format as string)) return null
  if (v.discover !== undefined && typeof v.discover !== 'boolean') return null
  return { goal: v.goal, level: v.level, minutes: v.minutes, format: v.format, ...(v.discover !== undefined ? { discover: v.discover } : {}) } as Profile
}
function question(v: unknown): MaterialQuestion | null {
  if (!object(v) || !text(v.prompt, 8, 400) || !text(v.reason, 8, 1000) || !Array.isArray(v.options) || v.options.length < 3 || v.options.length > 4 || !v.options.every(o => text(o, 1, 250)) || new Set(v.options).size !== v.options.length || !Number.isInteger(v.answer) || (v.answer as number) < 0 || (v.answer as number) >= v.options.length) return null
  return { prompt: v.prompt, options: v.options, answer: v.answer as number, reason: v.reason }
}
export function validateCourse(value: unknown, source: Source, requireMedia = false): Course | null {
  if (!object(value) || !text(value.title, 3, 120) || !text(value.introduction, 10, 600) || !Array.isArray(value.concepts) || value.concepts.length < 3 || value.concepts.length > 5) return null
  const ids = new Set<string>(), concepts: MaterialConcept[] = []
  const rich = value.mediaVersion === 2
  if ((requireMedia && !rich) || (value.mediaVersion !== undefined && !rich)) return null
  for (const v of value.concepts) {
    if (!object(v) || typeof v.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(v.id) || ids.has(v.id) || !text(v.title, 2, 100) || !text(v.explanation, 15, 1800) || !text(v.simple, 10, 800) || !text(v.example, 10, 1000) || !Array.isArray(v.steps) || v.steps.length < 2 || v.steps.length > 5 || !v.steps.every(s => text(s, 5, 400)) || !Array.isArray(v.evidence) || v.evidence.length < 1 || v.evidence.length > 3) return null
    const evidence: MaterialConcept['evidence'] = []
    for (const e of v.evidence) {
      if (!object(e) || !text(e.blockId) || !text(e.quote, 12, 500) || !source.blocks.some(b => b.id === e.blockId && b.text.includes(e.quote as string))) return null
      evidence.push({ blockId: e.blockId, quote: e.quote })
    }
    const first = question(v.question), retry = question(v.retry)
    if (!first || !retry || first.prompt === retry.prompt) return null
    const media = rich ? validateMedia(v.media, evidence.length) : null
    if (rich && !media) return null
    ids.add(v.id)
    concepts.push({ id: v.id, title: v.title, explanation: v.explanation, simple: v.simple, example: v.example, steps: v.steps, evidence, question: first, retry, ...(media ? { media } : {}) })
  }
  return { title: value.title, introduction: value.introduction, concepts, ...(rich ? { mediaVersion: 2 as const } : {}) }
}

export type LearningAction = { type: 'start' | 'topics'; ids: string[] } | { type: 'format'; format: Format } | { type: 'select'; answer: number } | { type: 'practice' | 'submit' | 'next' }
export type Learning = {
  stage: 'outline' | 'study' | 'results'; ids: string[]; index: number; format: Format; preferredFormat: Format
  selected: number | null; phase: 'question' | 'feedback' | 'retry' | 'retryFeedback'
  attempts: { first: number; retry?: number }[]; events: LearningAction[]
}
export type Workspace = { version: 1; source: Source; name: string; profile: Profile; course: Course; learning: Learning }
export function createLearning(course: Course, profile: Profile): Learning {
  return { stage: 'outline', ids: course.concepts.map(c => c.id), index: 0, format: profile.format, preferredFormat: profile.format, selected: null, phase: 'question', attempts: [], events: [] }
}
export function reduceLearning(s: Learning, action: LearningAction, course: Course): Learning {
  let next: Learning = s
  if ((action.type === 'start' || action.type === 'topics') && s.stage === 'outline' && Array.isArray(action.ids) && (action.type === 'topics' || action.ids.length) && new Set(action.ids).size === action.ids.length && action.ids.every(id => course.concepts.some(c => c.id === id))) {
    next = { ...s, stage: action.type === 'start' ? 'study' : 'outline', ids: course.concepts.filter(c => action.ids.includes(c.id)).map(c => c.id) }
  } else if (action.type === 'format' && s.stage === 'study' && formats.includes(action.format)) next = { ...s, format: action.format, preferredFormat: action.format }
  else if (action.type === 'practice' && s.stage === 'study' && s.phase === 'question') next = { ...s, format: 'practice' }
  else if (s.stage === 'study') {
    const concept = course.concepts.find(c => c.id === s.ids[s.index])
    if (!concept) return s
    const retry = s.phase === 'retry' || s.phase === 'retryFeedback', q = retry ? concept.retry : concept.question
    if (action.type === 'select' && (s.phase === 'question' || s.phase === 'retry') && Number.isInteger(action.answer) && action.answer >= 0 && action.answer < q.options.length) next = { ...s, selected: action.answer }
    if (action.type === 'submit' && s.selected !== null && (s.phase === 'question' || s.phase === 'retry')) {
      const attempts = [...s.attempts]
      attempts[s.index] = retry ? { ...attempts[s.index], retry: s.selected } : { first: s.selected }
      next = { ...s, attempts, phase: retry ? 'retryFeedback' : 'feedback' }
    }
    if (action.type === 'next' && (s.phase === 'feedback' || s.phase === 'retryFeedback')) {
      next = s.phase === 'feedback' && s.selected !== q.answer
        ? { ...s, phase: 'retry', selected: null, format: 'practice' }
        : { ...s, index: s.index + 1, selected: null, phase: 'question', format: s.preferredFormat, stage: s.index + 1 === s.ids.length ? 'results' : 'study' }
    }
  }
  return next === s ? s : { ...next, events: [...s.events, action] }
}
export function learningResults(s: Pick<Learning, 'ids' | 'attempts'>, course: Course) {
  let first = 0, recovered = 0
  const review: string[] = []
  for (const [i, id] of s.ids.entries()) {
    const c = course.concepts.find(c => c.id === id)!, a = s.attempts[i]
    if (a?.first === c.question.answer) first++
    else if (a?.retry === c.retry.answer) recovered++
    else review.push(c.title)
  }
  return { first, recovered, review }
}
export function restoreWorkspace(raw: string | null): Workspace | null {
  try {
    if (!raw || raw.length > 500_000) return null
    const v = JSON.parse(raw)
    if (!object(v) || v.version !== 1 || !object(v.source) || !text(v.name, 1, 120) || !object(v.learning) || !Array.isArray(v.learning.events) || v.learning.events.length > 3000) return null
    const source = normalizeSource(v.source.text), profile = validateProfile(v.profile)
    if (!source || !profile || JSON.stringify(source) !== JSON.stringify(v.source)) return null
    const course = validateCourse(v.course, source)
    if (!course) return null
    let learning = createLearning(course, profile)
    for (const event of v.learning.events) {
      if (!object(event)) return null
      const next = reduceLearning(learning, event as LearningAction, course)
      if (next === learning) return null
      learning = next
    }
    if (JSON.stringify(learning) !== JSON.stringify(v.learning)) return null
    return { version: 1, source, name: v.name, profile, course, learning }
  } catch { return null }
}
