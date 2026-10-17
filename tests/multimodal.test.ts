import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateMedia, initialActivityAnswer, gradeActivity, legacyMedia } from '../lib/learning-media.ts'
import { createAdaptiveLearning, reduceAdaptiveLearning, restoreAdaptiveWorkspace, formatStatistics, learnerSummary } from '../lib/adaptive.ts'
import { validateCourse, normalizeSource, defaultProfile, createLearning, reduceLearning } from '../lib/material.ts'
import { courseFixture, sourceText } from './material-fixture.ts'

const course = validateCourse(courseFixture, normalizeSource(sourceText)!)!
const media = () => legacyMedia(course.concepts[0], course)
test('media validates graph references and unambiguous activity solutions', () => {
  assert.ok(validateMedia(media(), course.concepts[0].evidence.length))
  const bad = media(); bad.diagram.edges[0].to = 'missing'
  assert.equal(validateMedia(bad, 1), null)
  const activity = media(); activity.activity.solution[0] = 'missing'
  assert.equal(validateMedia(activity, 1), null)
})
test('ordering, matching and classification use deterministic grading', () => {
  const match = media().activity
  assert.equal(gradeActivity(match, initialActivityAnswer(match)), false)
  assert.equal(gradeActivity(match, match.solution), true)
  const order = { ...match, kind: 'order' as const, targets: [], solution: match.items.map(i => i.id) }
  assert.equal(gradeActivity(order, initialActivityAnswer(order)), false)
  assert.equal(gradeActivity(order, order.solution), true)
  const classify = { ...match, kind: 'classify' as const, targets: match.targets.slice(0, 2), solution: match.items.map((_, i) => match.targets[i % 2].id) }
  assert.equal(gradeActivity(classify, classify.solution), true)
  assert.equal(gradeActivity(classify, ['bad']), false)
})
test('adaptive outcomes follow teaching format and duplicate checks cannot inflate history', () => {
  let s = createAdaptiveLearning(course, defaultProfile)
  s = reduceAdaptiveLearning(s, { type: 'start', ids: s.ids }, course)
  s = reduceAdaptiveLearning(s, { type: 'practice' }, course)
  assert.equal(s.format, s.teachingFormat)
  s = reduceAdaptiveLearning(s, { type: 'select', answer: 2 }, course)
  s = reduceAdaptiveLearning(s, { type: 'submit' }, course)
  assert.equal(s.history[0].format, 'text')
  assert.equal(s.history[0].correct, false)
  assert.deepEqual(reduceAdaptiveLearning(s, { type: 'submit' }, course), s)
  s = reduceAdaptiveLearning(s, { type: 'next' }, course)
  assert.equal(s.format, 'visual')
  s = reduceAdaptiveLearning(s, { type: 'activity-answer', answer: media().activity.solution }, course)
  s = reduceAdaptiveLearning(s, { type: 'activity-check' }, course)
  s = reduceAdaptiveLearning(s, { type: 'activity-check' }, course)
  assert.equal(s.history.filter(h => h.kind === 'activity').length, 1)
  assert.equal(formatStatistics(s).text.total, 1)
})
test('manual choices and disabling automatic selection preserve user control', () => {
  let s = createAdaptiveLearning(course, defaultProfile)
  s = reduceAdaptiveLearning(s, { type: 'start', ids: s.ids }, course)
  s = reduceAdaptiveLearning(s, { type: 'format', format: 'audio' }, course)
  s = reduceAdaptiveLearning(s, { type: 'practice' }, course)
  assert.equal(s.format, s.teachingFormat)
  s = reduceAdaptiveLearning(s, { type: 'select', answer: 2 }, course)
  s = reduceAdaptiveLearning(s, { type: 'submit' }, course)
  s = reduceAdaptiveLearning(s, { type: 'next' }, course)
  assert.equal(s.teachingFormat, 'audio')
  assert.equal(s.format, 'audio')
  assert.equal(s.manualLock, true)
  assert.ok(s.notice)
})
test('valid version-one progress migrates without losing scores, selections or stage', () => {
  let old = createLearning(course, defaultProfile)
  old = reduceLearning(old, { type: 'start', ids: old.ids }, course)
  old = reduceLearning(old, { type: 'select', answer: 2 }, course)
  old = reduceLearning(old, { type: 'submit' }, course)
  const restored = restoreAdaptiveWorkspace(JSON.stringify({ version: 1, source: normalizeSource(sourceText), name: 'Biologia', course, profile: defaultProfile, learning: old }))!
  assert.equal(restored.version, 2)
  assert.equal(restored.learning.phase, 'feedback')
  assert.deepEqual(restored.learning.attempts, old.attempts)
  assert.equal(restored.learning.selected, 2)
  assert.deepEqual(restoreAdaptiveWorkspace(JSON.stringify(restored)), restored)
})

test('learner discovery stays uncertain with sparse data and can use prior course results', () => {
  const prior = [
    ...[0, 1, 2, 3].map(i => ({ conceptId: `past-${i}`, kind: 'quiz' as const, format: 'visual' as const, correct: true })),
    ...[4, 5].map(i => ({ conceptId: `past-${i}`, kind: 'quiz' as const, format: 'text' as const, correct: false })),
  ]
  const sparse = createAdaptiveLearning(course, defaultProfile, prior.slice(0, 1))
  assert.equal(learnerSummary(sparse).leader, null)
  let s = createAdaptiveLearning(course, defaultProfile, prior)
  assert.equal(learnerSummary(s).leader, 'visual')
  s = reduceAdaptiveLearning(s, { type: 'start', ids: s.ids }, course)
  assert.equal(s.format, 'visual')
  s = reduceAdaptiveLearning(s, { type: 'automatic', enabled: false }, course)
  assert.equal(s.automatic, false)
})
