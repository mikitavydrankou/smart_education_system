import { synthesizeSpeech } from '@/lib/speech'
export const runtime = 'nodejs'
export const maxDuration = 50
let active = 0
const recent: number[] = []
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }, url = new URL(request.url)
  if (request.headers.get('origin') && request.headers.get('origin') !== `${url.protocol}//${request.headers.get('host') || url.host}`) return Response.json({ error: 'Niedozwolone źródło żądania.' }, { status: 403, headers })
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'Wymagany jest format JSON.' }, { status: 415, headers })
  let text: unknown
  try {
    const reader = request.body?.getReader(); if (!reader) throw new Error('Empty')
    const decoder = new TextDecoder(); let raw = '', length = 0
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      length += value.byteLength
      if (length > 16_000) { await reader.cancel(); return Response.json({ error: 'Tekst jest zbyt duży.' }, { status: 413, headers }) }
      raw += decoder.decode(value, { stream: true })
    }
    raw += decoder.decode(); text = JSON.parse(raw)?.text
  } catch { return Response.json({ error: 'Nie można odczytać tekstu.' }, { status: 400, headers }) }
  if (typeof text !== 'string' || text.trim().length < 20 || text.length > 2600) return Response.json({ error: 'Tekst nagrania musi zawierać od 20 do 2600 znaków.' }, { status: 400, headers })
  const now = Date.now(); while (recent.length && recent[0] < now - 60_000) recent.shift()
  if (active >= 2 || recent.length >= 12) return Response.json({ error: 'Poczekaj minutę przed przygotowaniem kolejnego nagrania.' }, { status: 429, headers: { ...headers, 'Retry-After': '60' } })
  active++; recent.push(now)
  try { const bytes = await synthesizeSpeech(text, request.signal); return new Response(bytes as BodyInit, { headers: { ...headers, 'Content-Type': 'audio/mpeg', 'Content-Length': String(bytes.length) } }) }
  catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'Nagranie jest niedostępne.' }, { status: 503, headers }) }
  finally { active-- }
}
