import { normalizeSource, validateCourse } from '@/lib/material'
import { generateCourseMedia, GenerationError } from '@/lib/material-ai'

export const runtime = 'nodejs'
export const maxDuration = 60
let active = 0
const recent: number[] = []
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  const url = new URL(request.url), origin = `${url.protocol}//${request.headers.get('host') || url.host}`
  if (request.headers.get('origin') && request.headers.get('origin') !== origin) return Response.json({ error: 'Niedozwolone źródło żądania.' }, { status: 403, headers })
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'Wymagany jest format JSON.' }, { status: 415, headers })
  let input: unknown
  try {
    const reader = request.body?.getReader()
    if (!reader) throw new Error('Empty')
    const chunks: Uint8Array[] = []; let length = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 100_000) { await reader.cancel(); return Response.json({ error: 'Materiał jest zbyt duży.' }, { status: 413, headers }) }
      chunks.push(value)
    }
    const bytes = new Uint8Array(length); let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    input = JSON.parse(new TextDecoder().decode(bytes))
  } catch { return Response.json({ error: 'Nie można odczytać materiału.' }, { status: 400, headers }) }
  const v = input as { text?: unknown; course?: unknown } | null
  const source = normalizeSource(v?.text)
  const course = source ? validateCourse(v?.course, source, false) : null
  if (!source || !course) return Response.json({ error: 'Przekaż zapisany materiał i poprawną lekcję tekstową.' }, { status: 400, headers })
  const now = Date.now()
  while (recent.length && recent[0] < now - 60_000) recent.shift()
  if (active >= 2 || recent.length >= 10) return Response.json({ error: 'Trwa zbyt wiele prób generowania. Poczekaj minutę i spróbuj ponownie.' }, { status: 429, headers: { ...headers, 'Retry-After': '60' } })
  recent.push(now); active++
  try {
    return Response.json({ course: await generateCourseMedia(source, course, request.signal) }, { headers })
  } catch (error) {
    return Response.json({ error: error instanceof GenerationError ? error.message : 'Nie udało się uzupełnić schematów.' }, { status: error instanceof GenerationError ? error.status : 500, headers })
  } finally { active-- }
}
