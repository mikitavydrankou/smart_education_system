'use client'
import { learnerSummary, formatNames, type AdaptiveLearning, type AdaptiveAction } from '@/lib/adaptive'
import type { Format } from '@/lib/material'
export function LearnerProfile({ learning: s, update }: { learning: AdaptiveLearning; update?: (action: AdaptiveAction) => void }) {
  const summary = learnerSummary(s)
  return <section className="learner-profile" aria-label="Twój profil nauki"><div><span className="eyebrow">PROFIL OPARTY NA OBSERWACJACH</span><h2>{summary.label}</h2><p>{summary.total} pierwszych sprawdzeń wiedzy. Preferencja: {formatNames[s.preferredFormat]}. To wstępne dane, zależne także od tematu i trudności zadań.</p></div>
    {update && <><label className="auto-choice"><input type="checkbox" checked={s.automatic} onChange={e => update({ type: 'automatic', enabled: e.target.checked })} />Dobieraj sposób podania na podstawie wyników</label><p role="status" className="adaptation-reason">{s.notice}</p></>}
    <details><summary>Zobacz obserwacje i sposób doboru</summary><ul className="format-observations">{(Object.keys(formatNames) as Format[]).map(f => <li key={f}><strong>{formatNames[f]}</strong><span>{summary.stats[f].total ? `${summary.stats[f].correct} poprawnych z ${summary.stats[f].total} pierwszych sprawdzeń` : 'Jeszcze brak porównywalnych wyników'}</span></li>)}</ul><p>Na początku próbujemy różnych formatów. Sugestię opartą na wyniku pokazujemy dopiero po co najmniej 6 pierwszych sprawdzeniach i 2 tematach w co najmniej 2 formatach, przy wyraźnej różnicy obserwowanych wyników. To reguła produktu, nie test psychologiczny ani dowód przyczynowy. Druga próba i ćwiczenia z podpowiedzią nie zawyżają porównania. Samo kliknięcie Audio nie jest traktowane jako odsłuch.</p></details>
  </section>
}
