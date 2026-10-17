'use client'
import { ArrowUp, ArrowDown, GripVertical, RotateCcw } from 'lucide-react'
import { activityState, type AdaptiveLearning, type AdaptiveAction } from '@/lib/adaptive'
import { conceptMedia } from '@/lib/learning-media'
import type { Course } from '@/lib/material'

export function ActionExercise({ learning, course, update }: { learning: AdaptiveLearning; course: Course; update: (a: AdaptiveAction) => void }) {
  const c = course.concepts.find(c => c.id === learning.ids[learning.index])!, a = conceptMedia(c, course).activity, state = activityState(learning, course)
  const set = (answer: string[]) => update({ type: 'activity-answer', answer })
  const move = (from: number, to: number) => { if (to < 0 || to >= a.items.length) return; const next = [...state.answer]; const [item] = next.splice(from, 1); next.splice(to, 0, item); set(next) }
  const assign = (id: string, target: string) => { const i = a.items.findIndex(item => item.id === id); if (i < 0 || !a.targets.some(t => t.id === target)) return; const next = [...state.answer]; next[i] = target; set(next) }
  return <section className="action-exercise" aria-label="Zadanie interaktywne">
    <span className="eyebrow">UCZ SIĘ PRZEZ DZIAŁANIE · {a.kind === 'order' ? 'KOLEJNOŚĆ' : a.kind === 'match' ? 'DOPASOWANIE' : 'KLASYFIKACJA'}</span><h2>{a.prompt}</h2>
    <p className="muted-copy">{a.kind === 'order' ? 'Przestaw elementy przez przeciąganie, przyciski strzałek lub wybór pozycji.' : 'Przeciągnij element do właściwego pola lub wybierz odpowiedź z listy pod nim.'}</p>
    {a.kind === 'order' ? <ol className="ordering-items">{state.answer.map((id, index) => {
      const item = a.items.find(item => item.id === id)!
      return <li key={id} draggable onDragStart={e => e.dataTransfer.setData('text/plain', id)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const from = state.answer.indexOf(e.dataTransfer.getData('text/plain')); if (from >= 0) move(from, index) }}>
        <GripVertical size={16} aria-hidden="true" /><span className="order-position">{index + 1}</span><strong>{item.label}</strong><div className="order-controls"><button type="button" disabled={index === 0} aria-label={`Przesuń w górę: ${item.label}`} onClick={() => move(index, index - 1)}><ArrowUp size={16} /></button><button type="button" disabled={index === state.answer.length - 1} aria-label={`Przesuń w dół: ${item.label}`} onClick={() => move(index, index + 1)}><ArrowDown size={16} /></button><select aria-label={`Pozycja: ${item.label}`} value={index} onChange={e => move(index, Number(e.target.value))}>{state.answer.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></div>
      </li>
    })}</ol> : <>
      <div className="activity-items">{a.items.map((item, i) => <div key={item.id} draggable onDragStart={e => e.dataTransfer.setData('text/plain', item.id)}><span className="activity-drag"><GripVertical size={16} aria-hidden="true" /><strong>{item.label}</strong></span><select aria-label={`Dopasowanie: ${item.label}`} value={state.answer[i]} onChange={e => { const answer = [...state.answer]; answer[i] = e.target.value; set(answer) }}><option value="">Wybierz…</option>{a.targets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>)}</div>
      <div className="activity-targets">{a.targets.map(t => <section key={t.id} aria-label={`Pole: ${t.label}`} tabIndex={0} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); assign(e.dataTransfer.getData('text/plain'), t.id) }}><h3>{t.label}</h3>{a.items.filter((_, i) => state.answer[i] === t.id).map(item => <span key={item.id}>{item.label}</span>)}</section>)}</div>
    </>}
    <div className="activity-actions"><button className="action-button action-secondary" type="button" disabled={!state.answer.every(Boolean) || JSON.stringify(state.lastCheck) === JSON.stringify(state.answer)} onClick={() => update({ type: 'activity-check' })}>Sprawdź układ</button><button type="button" className="text-link" onClick={() => update({ type: 'activity-reset' })}><RotateCcw size={14} aria-hidden="true" /> Ułóż ponownie</button></div>
    {state.correct !== null && <div role="status" className={`practice-feedback ${state.correct ? 'correct' : 'needs-review'}`}><strong>{state.correct ? 'Poprawny układ — udało Ci się zastosować wiedzę.' : 'Ten układ wymaga zmiany. Sprawdź zależności i spróbuj ponownie.'}</strong><p>{a.reason}</p></div>}
    <button type="button" className="text-link reveal-solution" onClick={() => update({ type: 'activity-reveal' })}>Pokaż rozwiązanie z wyjaśnieniem</button>
    {state.revealed && <div className="activity-solution"><p>Pokazane rozwiązanie służy nauce. Sprawdzenie po podpowiedzi nie poprawia profilu wyników.</p>{a.items.map((item, i) => <p key={item.id}><strong>{a.kind === 'order' ? `${a.solution.indexOf(item.id) + 1}. ${item.label}` : `${item.label} → ${a.targets.find(t => t.id === a.solution[i])!.label}`}</strong> — {item.explanation}</p>)}</div>}
    <p className="field-help">To ćwiczenie rozwija umiejętność. Wynik wspólnego sprawdzenia wiedzy zapisujemy osobno.</p>
  </section>
}
