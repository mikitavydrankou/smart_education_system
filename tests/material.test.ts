import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSource, validateProfile, validateCourse, createLearning, reduceLearning, restoreWorkspace, learningResults } from '../lib/material.ts'
import { sourceText, courseFixture } from './material-fixture.ts'
import { importMaterial } from '../lib/import-material.ts'

const profile = { goal: 'understand', level: 'beginner', minutes: 15, format: 'text' } as const

test('source is normalized into stable evidence blocks and rejects empty/oversized material', () => {
  assert.equal(normalizeSource('too short'), null)
  assert.equal(normalizeSource('x'.repeat(20_001)), null)
  const source = normalizeSource(sourceText.replaceAll('\n', '\r\n'))!
  assert.equal(source.blocks.length, 3)
  assert.equal(source.blocks[0].id, 'b1')
  assert.equal(source.blocks[1].text, 'Chlorofil pochłania światło. Zielony barwnik znajduje się w błonach tylakoidów chloroplastów.')
  assert.deepEqual(normalizeSource(source.text), source)
  assert.equal(validateProfile({ ...profile, minutes: 999 }), null)
  assert.deepEqual(validateProfile(profile), profile)
})

test('accepted courses must cite exact source text and contain valid distinct questions', () => {
  const source = normalizeSource(sourceText)!
  assert.ok(validateCourse(courseFixture, source))
  for (const mutate of [
    (v: typeof courseFixture) => { v.concepts[0].evidence[0].quote = 'Wymyślona informacja.' },
    (v: typeof courseFixture) => { v.concepts[0].evidence[0].blockId = 'missing' },
    (v: typeof courseFixture) => { v.concepts[0].question.answer = 99 },
    (v: typeof courseFixture) => { v.concepts[1].id = v.concepts[0].id },
    (v: typeof courseFixture) => { v.concepts[0].retry.prompt = v.concepts[0].question.prompt },
  ]) {
    const value = structuredClone(courseFixture); mutate(value)
    assert.equal(validateCourse(value, source), null)
  }
})

test('selected topics, bounded retries and answers restore by replay and yield factual results', () => {
  const source = normalizeSource(sourceText)!, course = validateCourse(courseFixture, source)!
  let state = createLearning(course, profile)
  state = reduceLearning(state, { type: 'start', ids: ['chloroplasty', 'chlorofil'] }, course)
  state = reduceLearning(state, { type: 'select', answer: 2 }, course)
  state = reduceLearning(state, { type: 'submit' }, course)
  assert.equal(state.phase, 'feedback')
  assert.deepEqual(reduceLearning(state, { type: 'submit' }, course), state)
  state = reduceLearning(state, { type: 'next' }, course)
  assert.equal(state.phase, 'retry')
  state = reduceLearning(state, { type: 'select', answer: 1 }, course)
  state = reduceLearning(state, { type: 'submit' }, course)
  const workspace = { version: 1, source, name: 'Biologia', profile, course, learning: state }
  assert.deepEqual(restoreWorkspace(JSON.stringify(workspace))?.learning, state)
  state = reduceLearning(state, { type: 'next' }, course)
  assert.equal(state.format, 'text', 'the next concept returns to the preferred learning format after retry')
  state = reduceLearning(state, { type: 'select', answer: 0 }, course)
  state = reduceLearning(state, { type: 'submit' }, course)
  state = reduceLearning(state, { type: 'next' }, course)
  assert.equal(state.stage, 'results')
  assert.deepEqual(learningResults(state, course), { first: 1, recovered: 1, review: [] })
  assert.equal(restoreWorkspace(JSON.stringify({ ...workspace, learning: { ...state, index: 99 } })), null)
  assert.equal(restoreWorkspace('{broken'), null)
})

test('a failed second attempt stays unresolved and cannot trigger a third attempt', () => {
  const course = validateCourse(courseFixture, normalizeSource(sourceText)!)!
  let s = reduceLearning(createLearning(course, profile), { type: 'start', ids: ['chloroplasty'] }, course)
  s = reduceLearning(s, { type: 'select', answer: 2 }, course)
  s = reduceLearning(s, { type: 'submit' }, course)
  s = reduceLearning(s, { type: 'next' }, course)
  s = reduceLearning(s, { type: 'select', answer: 0 }, course)
  s = reduceLearning(s, { type: 'submit' }, course)
  assert.deepEqual(reduceLearning(s, { type: 'select', answer: 1 }, course), s)
  s = reduceLearning(s, { type: 'next' }, course)
  assert.equal(s.stage, 'results')
  assert.deepEqual(learningResults(s, course), { first: 0, recovered: 0, review: ['Chloroplasty'] })
  assert.deepEqual(reduceLearning(s, { type: 'next' }, course), s)
})

test('local text import enforces type/size/text limits without damaging the source', async () => {
  assert.equal(await importMaterial(new File([sourceText], 'notes.md')), sourceText)
  await assert.rejects(importMaterial(new File(['short'], 'notes.txt')), /120 znaków/)
  await assert.rejects(importMaterial(new File([sourceText], 'notes.exe')), /TXT, Markdown, DOCX lub PDF/)
  await assert.rejects(importMaterial(new File(['x'.repeat(250_001)], 'notes.txt')), /250 000/)
  await assert.rejects(importMaterial(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'notes.txt')), /10 MB/)
})
