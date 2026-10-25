import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { allowedOperation, sameOrigin } from '@/lib/lms/requests'
import { validateLesson } from '@/lib/lms/validation'

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Niedozwolone źródło żądania.' }, { status: 403 })
  const client = await createClient()
  if (!client) return NextResponse.json({ error: 'Brak konfiguracji Supabase.' }, { status: 503 })
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Zaloguj się ponownie.' }, { status: 401 })
  try {
    const body = await request.json()
    if (!allowedOperation(body.operation) || !body.args || typeof body.args !== 'object' || Array.isArray(body.args)) return NextResponse.json({ error: 'Nieprawidłowe żądanie.' }, { status: 400 })
    if (body.operation === 'save_lesson') {
      const errors = validateLesson(body.args.payload, body.args.payload?.published === true)
      if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 })
    }
    const { data, error } = await client.rpc(body.operation, body.args)
    if (error) {
      console.error('lms_operation', { requestId, operation: body.operation, code: error.code })
      return NextResponse.json({ error: error.code === '42501' ? 'Brak dostępu. Sprawdź zapis na przedmiot i ukończenie ankiety.' : 'Nie udało się zapisać. Sprawdź wymagane pola, kolejność lekcji i poprawność testu.', requestId }, { status: error.code === '42501' ? 403 : 400 })
    }
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe dane żądania.', requestId }, { status: 400 })
  }
}
