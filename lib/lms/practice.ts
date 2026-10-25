import type { PracticeActivity } from './types.ts'

export function validPracticeActivity(value: unknown): value is PracticeActivity {
  if (!value || typeof value !== 'object') return false
  const activity = value as Record<string, unknown>
  if (!Array.isArray(activity.options) || activity.options.length < 2 || !activity.options.every(option => typeof option === 'string' && option.trim()) || new Set(activity.options).size !== activity.options.length) return false
  if (activity.type === 'single') return Number.isInteger(activity.answer) && Number(activity.answer) >= 0 && Number(activity.answer) < activity.options.length
  return activity.type === 'ordering' && Array.isArray(activity.answer) && activity.answer.length === activity.options.length && new Set(activity.answer).size === activity.options.length && activity.answer.every(item => (activity.options as unknown[]).includes(item))
}

export function correctPracticeAnswer(activity: unknown, answer: unknown) {
  if (!validPracticeActivity(activity)) return false
  return activity.type === 'single' ? answer === activity.answer : JSON.stringify(answer) === JSON.stringify(activity.answer)
}
