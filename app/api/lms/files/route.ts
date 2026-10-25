import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validStoragePath, sameOrigin } from '@/lib/lms/requests'

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') ?? ''
  if (!validStoragePath(path)) return NextResponse.json({ error: 'Nieprawidłowy plik.' }, { status: 400 })
  const client = await createClient()
  if (!client) return NextResponse.json({ error: 'Brak konfiguracji Supabase.' }, { status: 503 })
  const { data, error } = await client.storage.from('lms-files').createSignedUrl(path, 120)
  if (error || !data) return NextResponse.json({ error: 'Plik niedostępny.' }, { status: 403 })
  return NextResponse.redirect(data.signedUrl, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Niedozwolone źródło.' }, { status: 403 })
  const client = await createClient()
  if (!client) return NextResponse.json({ error: 'Brak konfiguracji Supabase.' }, { status: 503 })
  const form = await request.formData()
  const file = form.get('file')
  const course = String(form.get('course') ?? '')
  const lesson = String(form.get('lesson') ?? '')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Wybierz plik.' }, { status: 400 })
  const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'application/pdf': 'pdf' }
  const extension = extensions[file.type]
  const path = `${course}/${lesson}/${crypto.randomUUID()}.${extension}`
  if (!extension || !validStoragePath(path) || !file.size || file.size > (file.type.startsWith('image/') ? 5 : 20) * 1024 * 1024) return NextResponse.json({ error: 'Dozwolone obrazy do 5 MB oraz audio i PDF do 20 MB.' }, { status: 400 })
  const { error } = await client.storage.from('lms-files').upload(path, file, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: 'Nie udało się przesłać pliku. Zapisz najpierw szkic lekcji.' }, { status: 403 })
  return NextResponse.json({ data: `/api/lms/files?path=${encodeURIComponent(path)}` })
}
