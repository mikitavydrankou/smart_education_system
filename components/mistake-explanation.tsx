'use client'
import { useEffect, useRef, useState } from 'react'
import { resolveMistake, type ExplanationStyle } from '@/lib/explanation'

export function MistakeExplanation({ questionId, retry, selected }: { questionId: string; retry: boolean; selected: number }) {
  const [style, setStyle] = useState<ExplanationStyle>('simple')
  const [result, setResult] = useState<{ text: string; source: 'ai' | 'fallback' } | null>(null)
  const [loading, setLoading] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const cache = useRef(new Map<string, { text: string; source: 'ai' | 'fallback' }>())
  useEffect(() => () => controller.current?.abort(), [])
  const explain = async () => {
    if (controller.current) return
    const input = { questionId, retry, selected, style }
    const cached = cache.current.get(style)
    if (cached) { setResult(cached); return }
    const abort = new AbortController()
    controller.current = abort
    setLoading(true)
    let responseValue: { text: string; source: 'ai' | 'fallback' }
    try {
      const response = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(12_000)]) })
      if (!response.ok) throw new Error('Unavailable')
      responseValue = await response.json()
      if (typeof responseValue.text !== 'string' || !['ai', 'fallback'].includes(responseValue.source)) throw new Error('Invalid response')
    } catch {
      if (abort.signal.aborted) return
      responseValue = { text: resolveMistake(input)!.fallback, source: 'fallback' }
    } finally { controller.current = null; if (!abort.signal.aborted) setLoading(false) }
    cache.current.set(style, responseValue)
    setResult(responseValue)
  }
  return <div className="mt-5 border-t border-amber-200 pt-4">
    <label className="text-sm font-medium">Forma wyjaśnienia <select className="ml-2 min-h-11 max-w-full rounded-lg border bg-white p-2 text-slate-900" value={style} disabled={loading} onChange={e => { setStyle(e.target.value as ExplanationStyle); setResult(null) }}><option value="simple">Prostymi słowami</option><option value="example">Na przykładzie</option><option value="steps">Krok po kroku</option></select></label>
    <button type="button" disabled={loading || !!result} onClick={explain} className="mt-3 block min-h-11 rounded-xl border border-amber-300 bg-white px-4 py-3 font-semibold disabled:opacity-60">{loading ? 'Przygotowuję wyjaśnienie…' : 'Wyjaśnij mój błąd'}</button>
    <p className="mt-2 text-xs">Opcjonalnie skorzystaj z AI. Gdy jest niedostępna, otrzymasz sprawdzone wyjaśnienie z lekcji.</p>
    <div aria-live="polite" aria-busy={loading}>{result && <><p className="mt-4 font-semibold">{result.source === 'ai' ? 'Wyjaśnienie AI' : 'Wyjaśnienie z materiałów lekcji'}</p><p className="mt-2 whitespace-pre-line leading-6">{result.text}</p></>}</div>
  </div>
}
