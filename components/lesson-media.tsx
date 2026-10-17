'use client'
import { useEffect, useState } from 'react'
import { ArrowRight, Volume2 } from 'lucide-react'

const nodes = [
  { label: 'Przeglądarka', description: 'Odczytuje wpisany adres i rozpoczyna pobieranie strony. Po uzyskaniu adresu serwera wysyła żądanie HTTP lub HTTPS.' },
  { label: 'DNS', description: 'Rozwiązuje nazwę domeny na adres IP. Jeśli aktualny wynik jest w pamięci podręcznej, nowe zapytanie DNS nie jest konieczne.' },
  { label: 'Adres IP', description: 'Pomaga skierować pakiety do celu w sieci. Przeglądarka łączy się z usługą pod tym adresem, korzystając również z odpowiedniego portu i protokołu.' },
  { label: 'Serwer', description: 'Obsługuje żądanie i zwraca zasoby lub wygenerowane dane w odpowiedzi HTTP. Może również zwrócić informację o błędzie.' },
  { label: 'Odpowiedź', description: 'Dane wracają do przeglądarki. Przeglądarka przetwarza HTML, CSS i JavaScript, wyświetla stronę i może pobierać kolejne zasoby.' },
]
export function NetworkDiagram() {
  const [active, setActive] = useState(0)
  return <section className="mt-7 rounded-2xl bg-slate-50 p-5" aria-label="Interaktywny schemat komunikacji">
    <h3 className="mb-4 text-sm font-semibold text-slate-600">Droga żądania — wybierz element</h3>
    <div className="flex flex-wrap items-center justify-center gap-2">{nodes.map((node, i) => <div className="flex items-center gap-2" key={node.label}>
      <button type="button" aria-pressed={active === i} onClick={() => setActive(i)} className={`min-h-11 rounded-xl px-3 py-3 text-sm font-semibold ${active === i ? 'bg-teal-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>{node.label}</button>
      {i < nodes.length - 1 && <ArrowRight aria-hidden className="size-4 text-slate-400" />}
    </div>)}</div>
    <p className="mt-4 text-sm leading-6 text-slate-600" aria-live="polite">{nodes[active].description}</p>
    <p className="mt-3 text-xs text-slate-500">Schemat jest uproszczony: DNS ustala adres, a żądanie strony trafia następnie do serwera.</p>
  </section>
}
export function SpeechControl({ text }: { text: string }) {
  const [available, setAvailable] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    setAvailable('speechSynthesis' in window)
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }
  }, [])
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
    setMessage('')
  }, [text])
  const speak = () => {
    const synth = window.speechSynthesis
    synth.cancel()
    if (speaking) { setSpeaking(false); return }
    const voice = synth.getVoices().find(v => v.lang.toLowerCase().startsWith('pl'))
    if (!voice) { setMessage('Brak polskiego głosu w przeglądarce. Skorzystaj z tekstu lub zainstaluj polski głos w systemie.'); return }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pl-PL'
    utterance.voice = voice
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => { setSpeaking(false); setMessage('Nie udało się odtworzyć nagrania. Wyjaśnienie jest dostępne jako tekst.') }
    setSpeaking(true)
    synth.speak(utterance)
  }
  return <div className="mt-4"><button type="button" disabled={!available} onClick={speak} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"><Volume2 aria-hidden />{speaking ? 'Zatrzymaj czytanie' : 'Posłuchaj wyjaśnienia'}</button><p role="status" className="mt-2 text-xs text-slate-500">{message || (available ? 'Odczyt wymaga polskiego głosu systemowego. Tekst jest zawsze dostępny powyżej.' : 'Odczyt głosowy jest niedostępny w tej przeglądarce.')}</p></div>
}
