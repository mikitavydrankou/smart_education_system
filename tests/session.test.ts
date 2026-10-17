import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSession, reduceSession, restoreSession, getResults, getWeakConcepts } from '../lib/session.ts'
import { knowledgeQuestions, practiceQuestions } from '../lib/lesson-data.ts'

test('assessment records answers by concept and determines gaps', () => {
  let s = createSession()
  for (const q of knowledgeQuestions) {
    const answer = q.concept === 'dns' ? (q.answer + 1) % q.options.length : q.answer
    s = reduceSession(s, { type: 'select', answer })
    s = reduceSession(s, { type: 'assessment', answer })
  }
  assert.equal(s.stage, 'lesson')
  assert.deepEqual(getWeakConcepts(s), ['dns'])
  assert.equal(s.assessment.length, 3)
})

test('retry survives refresh, is limited, and never overwrites earlier review', () => {
  let s = createSession()
  for (const q of knowledgeQuestions) {
    s = reduceSession(s, { type: 'select', answer: q.answer })
    s = reduceSession(s, { type: 'assessment', answer: q.answer })
  }
  s = reduceSession(s, { type: 'practice' })
  for (const q of practiceQuestions) {
    s = reduceSession(s, { type: 'select', answer: (q.answer + 1) % q.options.length })
    s = reduceSession(s, { type: 'submit' })
    assert.equal(s.phase, 'feedback')
    assert.deepEqual(restoreSession(JSON.stringify(s)), s)
    s = reduceSession(s, { type: 'next' })
    assert.equal(s.phase, 'retry')
    assert.notEqual(q.prompt, q.retry.prompt)
    s = reduceSession(s, { type: 'select', answer: q.id === practiceQuestions[0].id ? (q.retry.answer + 1) % q.retry.options.length : q.retry.answer })
    s = reduceSession(s, { type: 'submit' })
    assert.deepEqual(restoreSession(JSON.stringify(s)), s)
    s = reduceSession(s, { type: 'next' })
  }
  assert.equal(s.stage, 'results')
  const results = getResults(s)
  assert.equal(results.review.includes('dns'), true)
  assert.equal(results.first.length, 0)
  assert.equal(results.retry.length, 2)
  assert.equal(results.correctAfterRetry, practiceQuestions.length - 1)
})

test('invalid and outdated storage resets safely', () => {
  for (const value of ['{', 'null', '{}', '{"version":1}', '{"version":2,"events":[{"type":"submit"}]}']) {
    assert.deepEqual(restoreSession(value), createSession())
  }
})

test('invalid answers and duplicate submit cannot change recorded answers', () => {
  let s = createSession()
  assert.deepEqual(reduceSession(s, { type: 'assessment', answer: 99 }), s)
  for (const q of knowledgeQuestions) {
    s = reduceSession(s, { type: 'select', answer: q.answer })
    s = reduceSession(s, { type: 'assessment', answer: q.answer })
  }
  s = reduceSession(s, { type: 'practice' })
  s = reduceSession(s, { type: 'select', answer: practiceQuestions[0].answer })
  s = reduceSession(s, { type: 'submit' })
  assert.deepEqual(reduceSession(s, { type: 'submit' }), s)
  assert.deepEqual(reduceSession(s, { type: 'select', answer: 1 }), s)
  s = reduceSession(s, { type: 'next' })
  assert.equal(s.practiceIndex, 1)
  assert.deepEqual(restoreSession(JSON.stringify(s)), s)
})

test('all-first-correct session has real totals and no review', () => {
  let s = createSession()
  for (const q of knowledgeQuestions) {
    s = reduceSession(s, { type: 'select', answer: q.answer })
    s = reduceSession(s, { type: 'assessment', answer: q.answer })
  }
  s = reduceSession(s, { type: 'practice' })
  for (const q of practiceQuestions) {
    s = reduceSession(s, { type: 'select', answer: q.answer })
    s = reduceSession(s, { type: 'submit' })
    s = reduceSession(s, { type: 'next' })
  }
  assert.equal(getResults(s).firstCorrect, practiceQuestions.length)
  assert.equal(getResults(s).first.length, 3)
  assert.deepEqual(getResults(s).review, [])
})

test('duplicate assessment submit never answers the following question', () => {
  let s = createSession()
  s = reduceSession(s, { type: 'select', answer: knowledgeQuestions[0].answer })
  s = reduceSession(s, { type: 'assessment', answer: knowledgeQuestions[0].answer })
  assert.deepEqual(reduceSession(s, { type: 'assessment', answer: knowledgeQuestions[0].answer }), s)
})
