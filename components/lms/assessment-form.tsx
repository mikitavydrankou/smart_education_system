'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { STYLE_LABELS, type Style } from '@/lib/lms/types'
import { lmsOperation } from './actions'

export type AssessmentConfig = { version: string; source_url: string; questions: { id: string; prompt: string; options: { text: string; style: Style }[] }[] }

export function AssessmentForm({ config, draft }: { config: AssessmentConfig; draft: Record<string, number> }) {
  const router = useRouter()
  const [answers, setAnswers] = useState(draft)
  const [ties, setTies] = useState<Style[]>([])
  const [selected, setSelected] = useState<Style | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async (current: Record<string, number>, finish: boolean) => {
    setBusy(true); setMessage('')
    try {
      const result = await lmsOperation<{ completed: boolean; tied_styles?: Style[] }>('save_assessment', { answers: current, selected_style: finish ? selected : null })
      if (result.completed) { router.refresh() }
      else if (result.tied_styles?.length) { setTies(result.tied_styles); setMessage('Kilka formatów uzyskało taki sam wynik. Wybierz preferowany.') }
      else setMessage('Odpowiedzi zapisane. Możesz wrócić do ankiety później.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się zapisać odpowiedzi.') } finally { setBusy(false) }
  }
  return <form className="lms-form" onSubmit={event => { event.preventDefault(); void save(answers, true) }}><p>Ankieta: {config.version} · {Object.keys(answers).length}/{config.questions.length} odpowiedzi</p>{config.questions.map((question, index) => <fieldset className="lms-card" key={question.id}><legend>{index + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label className="lms-option" key={optionIndex}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => { setAnswers({ ...answers, [question.id]: optionIndex }); setTies([]); setSelected(null) }} />{option.text}</label>)}</fieldset>)}{!!ties.length && <fieldset><legend>Wybierz format początkowy</legend>{ties.map(style => <label className="lms-option" key={style}><input type="radio" name="tie" checked={selected === style} onChange={() => setSelected(style)} />{STYLE_LABELS[style]}</label>)}</fieldset>}<div className="lms-row"><button type="button" className="action-button action-secondary" disabled={busy} onClick={() => void save(answers, false)}>Zapisz odpowiedzi</button><button className="action-button action-primary" disabled={busy || config.questions.some(question => answers[question.id] === undefined) || (!!ties.length && !selected)}>Zakończ ankietę</button></div>{message && <p role="status">{message}</p>}<a href={config.source_url} target="_blank" rel="noreferrer">Źródło ankiety: EducationPlanner</a></form>
}
