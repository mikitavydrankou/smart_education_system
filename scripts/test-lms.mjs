import { execFileSync } from 'node:child_process'

let status
try {
  status = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
} catch {
  console.error('Start the isolated local Supabase first: pnpm exec supabase start')
  process.exit(1)
}
const api = new URL(status.API_URL)
const database = new URL(status.DB_URL)
if (!['127.0.0.1', 'localhost'].includes(api.hostname) || api.port !== '54321' || !['127.0.0.1', 'localhost'].includes(database.hostname) || database.port !== '54322') {
  throw new Error('LMS browser tests require the default local Supabase. Hosted projects are never used.')
}
const env = { ...process.env, LMS_E2E: '1', NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY, NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100' }
const suites = process.argv.includes('--all') ? [] : ['tests/browser/lms.spec.ts', 'tests/browser/lms-editor.spec.ts', 'tests/browser/design.spec.ts', 'tests/browser/educationplanner.spec.ts', 'tests/browser/demo-roles.spec.ts', 'tests/browser/lms-material.spec.ts', 'tests/browser/media.spec.ts']
execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], { stdio: 'inherit', env })
execFileSync('pnpm', ['exec', 'playwright', 'test', ...suites, '--reporter=dot'], { stdio: 'inherit', env })
