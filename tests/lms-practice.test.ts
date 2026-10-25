import test from 'node:test'
import assert from 'node:assert/strict'
import { validPracticeActivity, correctPracticeAnswer } from '../lib/lms/practice.ts'

test('interactive tasks validate their options and answers', () => {
  assert.equal(validPracticeActivity({ type: 'single', options: ['A', 'B'], answer: 1 }), true)
  assert.equal(validPracticeActivity({ type: 'single', options: ['A', 'A'], answer: 1 }), false)
  assert.equal(validPracticeActivity({ type: 'single', options: ['A', 'B'], answer: 4 }), false)
  assert.equal(validPracticeActivity({ type: 'ordering', options: ['B', 'A'], answer: ['A', 'B'] }), true)
  assert.equal(validPracticeActivity({ type: 'ordering', options: ['B', 'A'], answer: ['A', 'A'] }), false)
})

test('practice only completes on the correct selection or exact order', () => {
  const selection = { type: 'single', options: ['A', 'B'], answer: 1 }
  assert.equal(correctPracticeAnswer(selection, 1), true)
  assert.equal(correctPracticeAnswer(selection, 0), false)
  const ordering = { type: 'ordering', options: ['B', 'A'], answer: ['A', 'B'] }
  assert.equal(correctPracticeAnswer(ordering, ['B', 'A']), false)
  assert.equal(correctPracticeAnswer(ordering, ['A', 'B']), true)
  assert.equal(correctPracticeAnswer(ordering, undefined), false)
})
