import assert from 'node:assert/strict'
import test from 'node:test'
import { scoreAssessment, type AssessmentDefinition } from '../lib/lms/assessment.ts'

const questionnaire: AssessmentDefinition = {
  id: 'test-fixture', version: 1, sourceUrl: 'https://example.org/fixture',
  questions: [
    { id: 'first', prompt: 'Fixture A', options: [{ id: 'v', label: 'A', style: 'visual' }, { id: 'a', label: 'B', style: 'auditory' }] },
    { id: 'second', prompt: 'Fixture B', options: [{ id: 'v', label: 'A', style: 'visual' }, { id: 'a', label: 'B', style: 'auditory' }] },
  ],
}

test('assessment scores retain ties and distinguish incomplete answers', () => {
  assert.deepEqual(scoreAssessment(questionnaire, { first: 'v', second: 'a' }), {
    scores: { visual: 1, auditory: 1, kinesthetic: 0 }, leaders: ['visual', 'auditory'], answered: 2, total: 2, complete: true,
  })
  assert.equal(scoreAssessment(questionnaire, { first: 'v' }).complete, false)
  assert.deepEqual(scoreAssessment(questionnaire, {}).leaders, [])
})

test('assessment rejects forged options and unexpected answers', () => {
  assert.throws(() => scoreAssessment(questionnaire, { first: 'forged' }))
  assert.throws(() => scoreAssessment(questionnaire, { unknown: 'v' }))
})
