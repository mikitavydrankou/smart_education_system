'use client'

import type { PracticeActivity } from '@/lib/lms/types'

export function PracticeTask({ activity, answer, onChange }: { activity: PracticeActivity; answer: unknown; onChange: (answer: unknown) => void }) {
  if (activity.type === 'single') return <fieldset><legend>Wykonaj ćwiczenie</legend>{activity.options.map((option, index) => <label className="lms-option" key={index}><input type="radio" name="practice-answer" checked={answer === index} onChange={() => onChange(index)} />{option}</label>)}</fieldset>
  const items = Array.isArray(answer) ? answer as string[] : [...activity.options].sort((first, second) => first.localeCompare(second))
  return <div><p>Ustaw elementy w odpowiedniej kolejności i potwierdź rozwiązanie.</p><ol>{items.map((item, index) => <li key={item}>{item}<button type="button" aria-label={`Przenieś wyżej: ${item}`} disabled={!index} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next) }}>↑</button><button type="button" aria-label={`Przenieś niżej: ${item}`} disabled={index === items.length - 1} onClick={() => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; onChange(next) }}>↓</button></li>)}</ol></div>
}
