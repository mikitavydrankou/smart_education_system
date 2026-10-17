'use client'
import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Headphones } from 'lucide-react'
import { cachedAudio, saveAudio } from '@/lib/device-storage'
import { SpeechControl } from './lesson-media'

export function AudioLesson({ text, onPlay }: { text: string; onPlay: () => void }) {
  const [saved,setSaved]=useState(false),[storageNotice,setStorageNotice]=useState('')
  const [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [rate, setRate] = useState(1)
  const controller = useRef<AbortController | null>(null), objectUrl = useRef(''), audio = useRef<HTMLAudioElement>(null), generation = useRef({ id: 0 })
  useEffect(() => {
    const playback = generation.current
    playback.id++; setUrl(''); setBusy(false); setError(''); setRate(1); setSaved(false);setStorageNotice('')
    const current=playback.id
    cachedAudio(text).then(blob=>{
      if(!blob||playback.id!==current||controller.current)return
      if(objectUrl.current)URL.revokeObjectURL(objectUrl.current)
      objectUrl.current=URL.createObjectURL(blob);setUrl(objectUrl.current);setSaved(true)
    }).catch(()=>{})
    return () => { playback.id++; controller.current?.abort(); controller.current = null; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = '' }
  }, [text])
  const prepare = async () => {
    if (controller.current) return
    const current = generation.current.id, abort = new AbortController(); controller.current = abort; setBusy(true); setError('')
    try {
      let stored:Blob|null=null
      try{stored=await cachedAudio(text)}catch{/* Use the network when device storage is unavailable. */}
      if(generation.current.id!==current||abort.signal.aborted)return
      if(stored){
        if(objectUrl.current)URL.revokeObjectURL(objectUrl.current)
        objectUrl.current=URL.createObjectURL(stored);setUrl(objectUrl.current);setSaved(true);return
      }
      if(!navigator.onLine)throw new Error('To nagranie nie zostało jeszcze zapisane. Połącz się z internetem lub skorzystaj z transkrypcji.')
      const response = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(50_000)]) })
      if (!response.ok) { const body = await response.json(); throw new Error(typeof body.error === 'string' ? body.error : 'Nagranie jest niedostępne.') }
      if (!response.headers.get('content-type')?.includes('audio/mpeg')) throw new Error('Nieprawidłowy format nagrania.')
      const blob = await response.blob()
      if (generation.current.id !== current || abort.signal.aborted) return
      try{await saveAudio(text,blob);if(generation.current.id===current)setSaved(true)}catch{if(generation.current.id===current)setStorageNotice('Nie udało się zapisać nagrania na urządzeniu. Teraz możesz je odtworzyć, ale po odświeżeniu może wymagać internetu.')}
      if(generation.current.id!==current||abort.signal.aborted)return
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = URL.createObjectURL(blob); setUrl(objectUrl.current)
    } catch (e) { if (generation.current.id === current && !abort.signal.aborted) setError(e instanceof Error && e.name !== 'TimeoutError' && e.name !== 'TypeError' ? e.message : 'Nie można pobrać nagrania. Skorzystaj z tekstu lub odczytu systemowego.') }
    finally { if (generation.current.id === current) { controller.current = null; setBusy(false) } }
  }
  return <section className="audio-lesson" aria-label="Lekcja audio"><div className="audio-lesson-title"><Headphones aria-hidden="true" /><div><span className="eyebrow">POSŁUCHAJ I ZROZUM</span><h2>Wyjaśnienie w Twoim tempie.</h2></div></div>
    <p className="muted-copy">Nagranie AI w języku polskim. Możesz zatrzymać, przewinąć i zmienić tempo. Tekst jest dostępny poniżej.</p>
    {!url && <button type="button" className="action-button action-primary" disabled={busy} onClick={prepare}>{busy ? <><LoaderCircle className="loading-icon" aria-hidden="true" /> Przygotowuję nagranie…</> : 'Przygotuj nagranie'}</button>}
    {busy && <button type="button" className="text-link" onClick={() => { generation.current.id++; controller.current?.abort(); controller.current = null; setBusy(false) }}>Anuluj nagranie</button>}
    {url && <><audio ref={audio} controls preload="metadata" src={url} aria-label="Odtwarzacz wyjaśnienia" onPlay={onPlay} onLoadedMetadata={() => { if (audio.current) audio.current.playbackRate = rate }} onError={() => setError('Przeglądarka nie odtworzyła nagrania. Użyj odczytu systemowego lub transkrypcji.')} /><label className="audio-rate">Tempo nagrania<select aria-label="Tempo nagrania" value={rate} onChange={e => { const value = Number(e.target.value); setRate(value); if (audio.current) audio.current.playbackRate = value }}><option value={0.75}>0,75×</option><option value={1}>1×</option><option value={1.25}>1,25×</option><option value={1.5}>1,5×</option></select></label></>}
    {saved && <p className="field-help" role="status">Nagranie zapisane na tym urządzeniu.</p>}{storageNotice && <p role="status" className="notice">{storageNotice}</p>}
    {error && <p role="status" className="notice">{error}</p>}
    <details className="audio-transcript"><summary>Transkrypcja i odczyt systemowy</summary><p>{text}</p><SpeechControl text={text} onPlay={onPlay} /></details>
  </section>
}
