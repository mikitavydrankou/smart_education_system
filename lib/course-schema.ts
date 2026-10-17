import { mediaSchema, mediaSchemaFor } from './learning-media-schema.ts'
import { sourceCitations } from './source-citations.ts'
import type { Course, Source } from './material.ts'
export const boundedString = (minLength: number, maxLength: number) => ({ type: 'string', minLength, maxLength })
const str = boundedString
const object = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) })
const array = (items: unknown, minItems: number, maxItems: number) => ({ type: 'array', items, minItems, maxItems })
const question = object({ prompt: str(8, 400), options: array(str(1, 250), 3, 3), answer: { type: 'integer', minimum: 0, maximum: 2 }, reason: str(8, 1000) })
const fields = { id: { ...str(1, 40), pattern: '^[a-z0-9-]+$' }, title: str(2, 100), explanation: str(15, 1800), simple: str(10, 800), example: str(10, 1000), steps: array(str(5, 400), 2, 5), question, retry: question }
const richCourse = (evidence: unknown, minConcepts = 3, media = mediaSchema) => object({ title: str(3, 120), introduction: str(10, 600), mediaVersion: { type: 'integer', enum: [2] }, concepts: array(object({ ...fields, evidence: array(evidence, 1, 3), media }), minConcepts, 5) })
const textCourse = (evidence: unknown, minConcepts = 3) => object({ title: str(3, 120), introduction: str(10, 600), concepts: array(object({ ...fields, evidence: array(evidence, 1, 3) }), minConcepts, 5) })
export const canonicalCourseSchema = richCourse(object({ blockId: str(1, 40), quote: str(12, 500) }))
export const canonicalTextCourseSchema = textCourse(object({ blockId: str(1, 40), quote: str(12, 500) }))
export function generationSchema(source?: Source) {
  const citationId = source ? { type: 'string', enum: sourceCitations(source).map(c => c.id) } : { type: 'string' }
  return richCourse(object({ citationId }), 0, mediaSchemaFor({ citationId }))
}
export function textGenerationSchema(source?: Source) {
  const citationId = source ? { type: 'string', enum: sourceCitations(source).map(c => c.id) } : { type: 'string' }
  return textCourse(object({ citationId }), 0)
}
/** Media-only payload keyed by existing concept ids; citation allow-list from the full source. */
export function mediaGenerationSchema(source: Source, course: Course) {
  const citationId = { type: 'string', enum: sourceCitations(source).map(c => c.id) }
  const ids = course.concepts.map(c => c.id)
  return object({
    mediaVersion: { type: 'integer', enum: [2] },
    concepts: array(object({ id: { type: 'string', enum: ids }, media: mediaSchemaFor({ citationId }) }), ids.length, ids.length),
  })
}
