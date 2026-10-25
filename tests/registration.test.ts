import test from 'node:test'
import assert from 'node:assert/strict'
import { registrationOutcome, parseRegistrationRole } from '../lib/supabase/registration.ts'

test('registration with an active session goes directly to onboarding', () => {
  assert.deepEqual(registrationOutcome({ session: true }), { redirect: '/assessment' })
})

test('teacher signup goes to the teacher panel and accepts only the two demo roles', () => {
  assert.deepEqual(registrationOutcome({ session: true, role: 'teacher' }), { redirect: '/teacher' })
  assert.equal(parseRegistrationRole('teacher'), 'teacher')
  assert.equal(parseRegistrationRole('student'), 'student')
  assert.equal(parseRegistrationRole(null), 'student')
  assert.equal(parseRegistrationRole('admin'), null)
})

test('registration only requests email confirmation when no session was issued', () => {
  assert.match(registrationOutcome({ session: false }).message ?? '', /email/)
})

test('registration reports actionable safe errors without exposing provider details', () => {
  assert.match(registrationOutcome({ session: false, errorCode: 'user_already_exists' }).error ?? '', /zaloguj/i)
  assert.match(registrationOutcome({ session: false, errorCode: 'over_email_send_rate_limit' }).error ?? '', /limit/)
  assert.match(registrationOutcome({ session: false, errorCode: 'unexpected_failure' }).error ?? '', /Nie udało/)
})
