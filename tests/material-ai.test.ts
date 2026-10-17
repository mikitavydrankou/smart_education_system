import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateMaterial, generateCourseMedia } from '../lib/material-ai.ts'
import { normalizeSource, defaultProfile, validateCourse } from '../lib/material.ts'
import { sourceText, courseFixture, richCourseFixture } from './material-fixture.ts'

test('generation requires a provider and returns text-only courses without media', async () => {
  const original = fetch, old = process.env.OPENROUTER_API_KEY, openai = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY; delete process.env.OPENROUTER_API_KEY
  const source = normalizeSource(sourceText)!
  try {
    await assert.rejects(generateMaterial(source, defaultProfile), /Skonfiguruj/)
    process.env.OPENROUTER_API_KEY = 'test-placeholder'
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options!.body as string)
      assert.equal(body.store, false)
      assert.equal(body.max_output_tokens, 2500)
      assert.equal(body.text.format.type, 'json_schema')
      assert.equal(body.text.format.name, 'adapt_course_text')
      assert.ok(!('mediaVersion' in body.text.format.schema.properties))
      assert.deepEqual(JSON.parse(body.input).source.blocks, source.blocks)
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(courseFixture) }] }] })
    }
    const course = await generateMaterial(source, defaultProfile)
    assert.equal(course.concepts.length, 3)
    assert.equal(course.mediaVersion, undefined)
    assert.ok(course.concepts.every(c => !c.media))
    const invented = structuredClone(courseFixture); invented.concepts[0].evidence[0].quote = 'Nie ma tego w źródle.'
    globalThis.fetch = async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(invented) }] }] })
    await assert.rejects(generateMaterial(source, defaultProfile), /LESSON_STRUCTURE/)
    globalThis.fetch = async () => Response.json({ status: 'incomplete', output: [] })
    await assert.rejects(generateMaterial(source, defaultProfile), /zakończyć/)
    globalThis.fetch = async () => new Response(null, { status: 503 })
    await assert.rejects(generateMaterial(source, defaultProfile), /niedostępna/)
  } finally {
    globalThis.fetch = original
    if (old === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = old
    if (openai === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = openai
  }
})

test('text generation uses a single provider attempt without repair', async () => {
  const original = fetch, old = process.env.OPENROUTER_API_KEY
  process.env.OPENROUTER_API_KEY = 'test-placeholder'
  let calls = 0
  try {
    globalThis.fetch = async () => {
      calls++
      const bad = structuredClone(courseFixture)
      bad.concepts[0].evidence[0].quote = 'Nie ma tego w źródle.'
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(bad) }] }] })
    }
    await assert.rejects(generateMaterial(normalizeSource(sourceText)!, defaultProfile), /LESSON_STRUCTURE/)
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = original
    if (old === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = old
  }
})

test('provider credit exhaustion has an actionable Polish error without leaking provider details', async () => {
  const original = fetch, old = process.env.OPENROUTER_API_KEY; process.env.OPENROUTER_API_KEY = 'test-placeholder'
  try {
    globalThis.fetch = async () => Response.json({ error: { message: 'private billing details' } }, { status: 402 })
    await assert.rejects(generateMaterial(normalizeSource(sourceText)!, defaultProfile), /Limit środków/)
  } finally { globalThis.fetch = original; if (old === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = old }
})

test('strict schema permits an explicit insufficient-material result without inventing a course', async () => {
  const original = fetch, old = process.env.OPENROUTER_API_KEY; process.env.OPENROUTER_API_KEY = 'test-placeholder'
  try {
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options!.body as string)
      assert.equal(body.text.format.schema.properties.concepts.minItems, 0)
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...courseFixture, concepts: [] }) }] }] })
    }
    await assert.rejects(generateMaterial(normalizeSource(sourceText)!, defaultProfile), /za mało informacji/)
  } finally { globalThis.fetch = original; if (old === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = old }
})

test('media enrich attaches mediaVersion 2 without changing concept ids', async () => {
  const original = fetch, old = process.env.OPENROUTER_API_KEY, openai = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY
  process.env.OPENROUTER_API_KEY = 'test-placeholder'
  const source = normalizeSource(sourceText)!
  const textCourse = validateCourse(courseFixture, source, false)!
  try {
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options!.body as string)
      assert.equal(body.max_output_tokens, 4000)
      assert.equal(body.text.format.name, 'adapt_course_media')
      assert.equal(body.text.format.schema.properties.concepts.minItems, 3)
      const mediaPayload = {
        mediaVersion: 2,
        concepts: richCourseFixture.concepts.map(c => ({ id: c.id, media: c.media })),
      }
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(mediaPayload) }] }] })
    }
    const rich = await generateCourseMedia(source, textCourse)
    assert.equal(rich.mediaVersion, 2)
    assert.deepEqual(rich.concepts.map(c => c.id), textCourse.concepts.map(c => c.id))
    assert.ok(rich.concepts.every(c => c.media))
    assert.equal(rich.title, textCourse.title)
  } finally {
    globalThis.fetch = original
    if (old === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = old
    if (openai === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = openai
  }
})

test('media enrich rejects invalid courses and keeps a clear Polish error on provider failure', async () => {
  const original = fetch, old = process.env.OPENROUTER_API_KEY
  process.env.OPENROUTER_API_KEY = 'test-placeholder'
  const source = normalizeSource(sourceText)!
  try {
    await assert.rejects(generateCourseMedia(source, { title: 'x', introduction: 'short', concepts: [] } as never), /lekcję tekstową|tekstow/i)
    globalThis.fetch = async () => new Response(null, { status: 503 })
    await assert.rejects(generateCourseMedia(source, validateCourse(courseFixture, source, false)!), /niedostępna|schemat/i)
  } finally {
    globalThis.fetch = original
    if (old === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = old
  }
})
