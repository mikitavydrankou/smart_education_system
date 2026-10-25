import test from 'node:test'
import assert from 'node:assert/strict'
import { allowedOperation, validStoragePath, sameOrigin } from '../lib/lms/requests.ts'

test('LMS RPC allowlist excludes role changes and arbitrary functions', () => {
  assert.equal(allowedOperation('save_course'), true)
  assert.equal(allowedOperation('set_role'), false)
  assert.equal(allowedOperation('__proto__'), false)
})

test('file paths contain course and lesson UUIDs and no traversal', () => {
  const path = 'a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000001/file.png'
  assert.equal(validStoragePath(path), true)
  assert.equal(validStoragePath('../private/file.png'), false)
  assert.equal(validStoragePath(path + '/../secret'), false)
})

test('origin checks use the actual request host behind the Next.js server', () => {
  assert.equal(sameOrigin(new Request('http://localhost:3100/api/lms', { headers: { host: '127.0.0.1:3100', origin: 'http://127.0.0.1:3100' } })), true)
  assert.equal(sameOrigin(new Request('http://localhost:3100/api/lms', { headers: { host: 'school.example', origin: 'https://evil.example' } })), false)
  assert.equal(sameOrigin(new Request('http://localhost:3100/api/lms')), false)
})
