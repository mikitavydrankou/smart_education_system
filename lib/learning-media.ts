import type { Course, MaterialConcept } from './material.ts'

export type Activity = {
  kind: 'order' | 'match' | 'classify'; prompt: string
  items: { id: string; label: string; explanation: string }[]
  targets: { id: string; label: string }[]; solution: string[]; reason: string
}
export type LearningMedia = {
  diagram: { title: string; nodes: { id: string; label: string; detail: string; evidenceIndex: number }[]; edges: { from: string; to: string; label: string; evidenceIndex: number }[] }
  narration: string; activity: Activity
}
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown, max: number, min = 1): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v)
export function validateMedia(v: unknown, evidenceCount: number): LearningMedia | null {
  if (!obj(v) || !obj(v.diagram) || !obj(v.activity) || !str(v.narration, 2600, 40)) return null
  const d = v.diagram, a = v.activity
  if (!str(d.title, 120) || !Array.isArray(d.nodes) || d.nodes.length < 2 || d.nodes.length > 6 || !Array.isArray(d.edges) || d.edges.length < 1 || d.edges.length > 8) return null
  const validEvidence = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < evidenceCount
  const nodes: LearningMedia['diagram']['nodes'] = [], edges: LearningMedia['diagram']['edges'] = []
  for (const n of d.nodes) {
    if (!obj(n) || !id(n.id) || nodes.some(x => x.id === n.id || x.label === n.label) || !str(n.label, 80) || !str(n.detail, 500) || !validEvidence(n.evidenceIndex)) return null
    nodes.push({ id: n.id, label: n.label, detail: n.detail, evidenceIndex: n.evidenceIndex as number })
  }
  for (const e of d.edges) {
    if (!obj(e) || !id(e.from) || !id(e.to) || e.from === e.to || !nodes.some(n => n.id === e.from) || !nodes.some(n => n.id === e.to) || !str(e.label, 80) || !validEvidence(e.evidenceIndex) || edges.some(x => x.from === e.from && x.to === e.to)) return null
    edges.push({ from: e.from, to: e.to, label: e.label, evidenceIndex: e.evidenceIndex as number })
  }
  const connected = new Set([nodes[0].id])
  for (let i = 0; i < nodes.length; i++) for (const e of edges) if (connected.has(e.from) || connected.has(e.to)) { connected.add(e.from); connected.add(e.to) }
  if (connected.size !== nodes.length || !['order', 'match', 'classify'].includes(a.kind as string) || !str(a.prompt, 400, 8) || !str(a.reason, 800, 8) || !Array.isArray(a.items) || a.items.length < 3 || a.items.length > 6 || !Array.isArray(a.targets) || !Array.isArray(a.solution) || a.solution.length !== a.items.length) return null
  const items: Activity['items'] = [], targets: Activity['targets'] = []
  for (const item of a.items) {
    if (!obj(item) || !id(item.id) || !str(item.label, 200) || !str(item.explanation, 400) || items.some(i => i.id === item.id || i.label === item.label)) return null
    items.push({ id: item.id, label: item.label, explanation: item.explanation })
  }
  for (const t of a.targets) {
    if (!obj(t) || !id(t.id) || !str(t.label, 300) || targets.some(x => x.id === t.id || x.label === t.label)) return null
    targets.push({ id: t.id, label: t.label })
  }
  const solution = a.solution as string[]
  if (a.kind === 'order') {
    if (targets.length || new Set(solution).size !== items.length || !solution.every(x => items.some(i => i.id === x))) return null
  } else {
    if (targets.length < 2 || targets.length > 6 || !solution.every(x => targets.some(t => t.id === x)) || targets.some(t => !solution.includes(t.id))) return null
    if (a.kind === 'match' && (targets.length !== items.length || new Set(solution).size !== items.length)) return null
  }
  return { diagram: { title: d.title, nodes, edges }, narration: v.narration, activity: { kind: a.kind as Activity['kind'], prompt: a.prompt, items, targets, solution, reason: a.reason } }
}
export function initialActivityAnswer(a: Activity): string[] {
  if (a.kind !== 'order') return a.items.map(() => '')
  const ids = a.items.map(i => i.id)
  const shuffled = [...ids.slice(1), ids[0]]
  return shuffled.every((v, i) => v === a.solution[i]) ? [...shuffled.slice(1), shuffled[0]] : shuffled
}
export function validActivityAnswer(a: Activity, answer: unknown): answer is string[] {
  return Array.isArray(answer) && answer.length === a.items.length && answer.every(v => typeof v === 'string') && (a.kind === 'order' ? new Set(answer).size === a.items.length && answer.every(v => a.items.some(i => i.id === v)) : answer.every(v => v === '' || a.targets.some(t => t.id === v)))
}
export function gradeActivity(a: Activity, answer: string[]): boolean { return validActivityAnswer(a, answer) && answer.every((v, i) => v === a.solution[i]) }
export function legacyMedia(c: MaterialConcept, course: Course): LearningMedia {
  const pairs = course.concepts.slice(0, 3)
  return {
    diagram: {
      title: `Źródło pojęcia: ${c.title}`.slice(0, 120),
      nodes: [{ id: 'concept', label: c.title.slice(0, 80), detail: c.simple, evidenceIndex: 0 }, { id: 'source', label: 'Fragment źródłowy', detail: c.evidence[0].quote, evidenceIndex: 0 }],
      edges: [{ from: 'source', to: 'concept', label: 'wyjaśnia', evidenceIndex: 0 }],
    },
    narration: `${c.title}. ${c.explanation} ${c.example}`.slice(0, 2600),
    activity: { kind: 'match', prompt: 'Połącz pojęcia z ich fragmentami źródłowymi.', items: pairs.map((p, i) => ({ id: `i${i}`, label: p.title, explanation: p.simple })), targets: pairs.map((p, i) => ({ id: `t${i}`, label: p.evidence[0].quote.slice(0, 300) })), solution: pairs.map((_, i) => `t${i}`), reason: 'Porównaj treść cytatów z pojęciami w materiale źródłowym.' },
  }
}
export function conceptMedia(c: MaterialConcept, course: Course): LearningMedia { return c.media ?? legacyMedia(c, course) }
