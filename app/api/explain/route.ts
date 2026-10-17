import { resolveMistake } from '@/lib/explanation'
import { explainMistake } from '@/lib/ai-explanation'

export const runtime = 'nodejs'
const cache = new Map<string, { expires: number; result: ReturnType<typeof explainMistake> }>()
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  const url = new URL(request.url)
  // Next may use an internal hostname in request.url. The browser's Host is
  // authoritative for this request; do not accept arbitrary forwarded hosts.
  const origin = `${url.protocol}//${request.headers.get('host') || url.host}`
  if (request.headers.get('origin') && request.headers.get('origin') !== origin) return Response.json({ error: 'Niedozwolone źródło żądania.' }, { status: 403, headers })
  try {
    if (Number(request.headers.get('content-length')) > 1024) return Response.json({ error: 'Żądanie jest zbyt duże.' }, { status: 413, headers })
    const raw = await request.text()
    if (raw.length > 1024) return Response.json({ error: 'Żądanie jest zbyt duże.' }, { status: 413, headers })
    const mistake = resolveMistake(JSON.parse(raw))
    if (!mistake) return Response.json({ error: 'Nieprawidłowe dane odpowiedzi.' }, { status: 400, headers })
    const key = JSON.stringify(mistake)
    const now = Date.now()
    for (const [k, v] of cache) if (v.expires < now) cache.delete(k)
    let entry = cache.get(key)
    if (!entry) {
      if (cache.size >= 200) cache.delete(cache.keys().next().value!)
      entry = { expires: now + 300_000, result: explainMistake(mistake) }
      cache.set(key, entry)
    }
    return Response.json(await entry.result, { headers })
  } catch { return Response.json({ error: 'Nie udało się odczytać żądania.' }, { status: 400, headers }) }
}
