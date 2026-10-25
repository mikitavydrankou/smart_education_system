import assert from 'node:assert/strict'
import test from 'node:test'
import { safeNext } from './config.ts'

test('authentication redirects cannot escape the application', () => {
  assert.equal(safeNext('//evil.example'), '/')
  assert.equal(safeNext('/\\evil.example'), '/')
  assert.equal(safeNext('https://evil.example'), '/')
  assert.equal(safeNext('/courses/example?tab=lessons'), '/courses/example?tab=lessons')
})
