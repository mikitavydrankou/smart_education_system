import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveMistake } from '../lib/explanation.ts'
import { explainMistake } from '../lib/ai-explanation.ts'
import { concepts, knowledgeQuestions, practiceQuestions } from '../lib/lesson-data.ts'

test('question bank has valid answers and genuinely different retry contexts', () => {
  const ids = new Set<string>()
  for (const q of [...knowledgeQuestions, ...practiceQuestions]) {
    assert.equal(ids.has(q.id), false)
    ids.add(q.id)
    assert.equal(concepts.some(c => c.id === q.concept), true)
    assert.notEqual(q.prompt, q.retry.prompt)
    for (const question of [q, q.retry]) {
      assert.ok(question.answer >= 0 && question.answer < question.options.length)
      assert.equal(new Set(question.options).size, question.options.length)
      assert.ok(question.reason.length > 20)
      assert.equal(/[\u0400-\u04ff]/u.test(JSON.stringify(question)), false)
    }
  }
})
test('AI input accepts only a real incorrect answer with a supported style', () => {
  for (const input of [null, {}, { questionId: 'fake', retry: false, selected: 0, style: 'simple' }, { questionId: 'p-dns', retry: false, selected: 1, style: 'simple' }, { questionId: 'p-dns', retry: false, selected: -1, style: 'simple' }, { questionId: 'p-dns', retry: false, selected: 0, style: 'invent' }]) assert.equal(resolveMistake(input), null)
  assert.ok(resolveMistake({ questionId: 'p-dns', retry: false, selected: 0, style: 'example' })?.fallback.includes('Poprawna odpowiedź'))
})
test('missing API key uses accurate fallback and is never labeled AI', async () => {
  const oldKey = process.env.OPENAI_API_KEY
  const oldRouterKey = process.env.OPENROUTER_API_KEY
  delete process.env.OPENAI_API_KEY
  delete process.env.OPENROUTER_API_KEY
  try {
    const mistake = resolveMistake({ questionId: 'p-dns', retry: false, selected: 0, style: 'simple' })!
    assert.deepEqual(await explainMistake(mistake), { text: mistake.fallback, source: 'fallback' })
  } finally {
    if (oldKey !== undefined) process.env.OPENAI_API_KEY = oldKey
    if (oldRouterKey !== undefined) process.env.OPENROUTER_API_KEY = oldRouterKey
  }
})

test('OpenRouter key uses its Responses endpoint and namespaced model', async () => {
  const oldRouterKey = process.env.OPENROUTER_API_KEY
  const oldRouterModel = process.env.OPENROUTER_MODEL
  const originalFetch = globalThis.fetch
  process.env.OPENROUTER_API_KEY = 'test-router-placeholder'
  delete process.env.OPENROUTER_MODEL
  const mistake = resolveMistake({ questionId: 'p-dns', retry: false, selected: 0, style: 'simple' })!
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://openrouter.ai/api/v1/responses')
      assert.equal((options!.headers as Record<string, string>).Authorization, 'Bearer test-router-placeholder')
      const body = JSON.parse(options!.body as string)
      assert.equal(body.model, 'openai/gpt-4.1-mini')
      assert.equal(body.store, false)
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'DNS ustala adres IP, a serwer udostępnia pliki strony.' }] }] })
    }
    assert.equal((await explainMistake(mistake)).source, 'ai')
    process.env.OPENROUTER_MODEL = 'openai/gpt-4.1'
    globalThis.fetch = async (_url, options) => {
      assert.equal(JSON.parse(options!.body as string).model, 'openai/gpt-4.1')
      return new Response(null, { status: 503 })
    }
    assert.deepEqual(await explainMistake(mistake), { text: mistake.fallback, source: 'fallback' })
  } finally {
    globalThis.fetch = originalFetch
    if (oldRouterKey === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = oldRouterKey
    if (oldRouterModel === undefined) delete process.env.OPENROUTER_MODEL
    else process.env.OPENROUTER_MODEL = oldRouterModel
  }
})
test('provider failure safely falls back; successful Responses text is extracted', async () => {
  const oldKey = process.env.OPENAI_API_KEY
  const originalFetch = globalThis.fetch
  process.env.OPENAI_API_KEY = 'test-only-placeholder'
  const mistake = resolveMistake({ questionId: 'p-dns', retry: false, selected: 0, style: 'simple' })!
  try {
    globalThis.fetch = async () => { throw new Error('offline') }
    assert.equal((await explainMistake(mistake)).source, 'fallback')
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options!.body as string)
      assert.equal(body.store, false)
      assert.equal(body.max_output_tokens, 350)
      assert.equal(JSON.parse(body.input).correctAnswer, mistake.correctAnswer)
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'DNS ustala adres IP. Pliki pobiera się z serwera.' }] }] })
    }
    assert.equal((await explainMistake(mistake)).source, 'ai')
    globalThis.fetch = async () => Response.json({ status: 'incomplete', output: [] })
    assert.equal((await explainMistake(mistake)).source, 'fallback')
  } finally {
    globalThis.fetch = originalFetch
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = oldKey
  }
})
