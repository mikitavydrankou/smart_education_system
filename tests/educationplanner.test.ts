import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { educationPlannerQuestionnaire } from '../lib/lms/educationplanner.ts'
import { EDUCATIONPLANNER_ASSESSMENT, scoreAssessment } from '../lib/lms/assessment.ts'

test('all supplied fragments produce twenty distinct questions in source order', () => {
  assert.equal(educationPlannerQuestionnaire.questions.length, 20)
  assert.equal(new Set(educationPlannerQuestionnaire.questions.map(question => question.id)).size, 20)
  assert.deepEqual(educationPlannerQuestionnaire.questions.map(question => question.sourceIndex), Array.from({ length: 20 }, (_, index) => index))
  for (const question of educationPlannerQuestionnaire.questions) {
    assert.deepEqual(question.options.map(option => option.style), ['visual', 'auditory', 'kinesthetic'])
    assert.ok(question.prompt.length > 0)
  }
})

test('the complete translated questionnaire scores all three preferences and preserves ties', () => {
  assert.equal(educationPlannerQuestionnaire.approved, true)
  for (const style of ['visual', 'auditory', 'kinesthetic']) {
    const answers = Object.fromEntries(EDUCATIONPLANNER_ASSESSMENT.questions.map(question => [question.id, question.options.find(option => option.style === style)!.id]))
    const result = scoreAssessment(EDUCATIONPLANNER_ASSESSMENT, answers)
    assert.equal(result.complete, true)
    assert.deepEqual(result.leaders, [style])
  }
  const answers = Object.fromEntries(EDUCATIONPLANNER_ASSESSMENT.questions.map((question, index) => [question.id, question.options[index < 10 ? 0 : 1].id]))
  assert.deepEqual(scoreAssessment(EDUCATIONPLANNER_ASSESSMENT, answers).leaders, ['visual', 'auditory'])
})

test('database migration publishes the exact same translated questions and scoring keys', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202610250003_educationplanner_assessment.sql', import.meta.url), 'utf8')
  const payload = migration.match(/\$assessment\$([\s\S]*?)\$assessment\$/)?.[1]
  assert.ok(payload)
  assert.deepEqual(JSON.parse(payload), educationPlannerQuestionnaire.questions.map(({ id, prompt, options }) => ({ id, prompt, options })))
})
