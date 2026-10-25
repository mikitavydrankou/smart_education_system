'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export async function lmsOperation<T = unknown>(operation: string, args: object): Promise<T> {
  const response = await fetch('/api/lms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, args }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? 'Nie udało się wykonać operacji.')
  return result.data
}

export function OperationButton({ operation, args, children }: { operation: string; args: object; children: React.ReactNode }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <div><button className="action-button action-primary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await lmsOperation(operation, args); router.refresh() } catch (error) { setError(error instanceof Error ? error.message : 'Błąd połączenia.') } finally { setBusy(false) } }}>{busy ? 'Zapisywanie…' : children}</button>{error && <p role="alert">{error}</p>}</div>
}

export function CourseForm({ initial }: { initial?: { id: string; title: string; description: string; published: boolean } }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <form className="lms-form lms-card" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const id = await lmsOperation<string>('save_course', { payload: { id: initial?.id, title: form.get('title'), description: form.get('description'), published: form.get('published') === 'on' } })
      router.push(`/courses/${id}`); router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'Błąd połączenia.') } finally { setBusy(false) }
  }}><h2>{initial ? 'Ustawienia przedmiotu' : 'Dodaj przedmiot'}</h2><label>Nazwa<input name="title" required defaultValue={initial?.title} /></label><label>Opis<textarea name="description" rows={4} defaultValue={initial?.description} /></label><label className="lms-check"><input type="checkbox" name="published" defaultChecked={initial?.published} />Widoczny w katalogu</label><button className="action-button action-primary" disabled={busy}>{busy ? 'Zapisywanie…' : 'Zapisz przedmiot'}</button>{error && <p role="alert">{error}</p>}</form>
}
