import { test } from 'node:test'
import assert from 'node:assert/strict'
import { synthesizeSpeech } from '../lib/speech.ts'
test('speech uses server credentials, produces MP3 bytes and rejects malformed media', async () => {
  const original = fetch, old = process.env.OPENROUTER_API_KEY, direct = process.env.OPENAI_API_KEY
  delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY
  try {
    await assert.rejects(synthesizeSpeech('To jest krótki tekst wyjaśnienia do odsłuchania.'), /niedostępne/)
    process.env.OPENROUTER_API_KEY = 'test-only'
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://openrouter.ai/api/v1/audio/speech')
      const body = JSON.parse(options!.body as string)
      assert.equal(body.response_format, 'mp3')
      const bytes = new Uint8Array(1024); bytes.set([73, 68, 51])
      return new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } })
    }
    assert.equal((await synthesizeSpeech('To jest krótki tekst wyjaśnienia do odsłuchania.')).length, 1024)
    globalThis.fetch = async () => Response.json({ error: 'not audio' })
    await assert.rejects(synthesizeSpeech('To jest krótki tekst wyjaśnienia do odsłuchania.'), /nagrania/)
  } finally {
    globalThis.fetch = original
    if (old === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = old
    if (direct === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = direct
  }
})
