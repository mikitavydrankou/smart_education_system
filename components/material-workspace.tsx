'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileText, Upload, Check, LoaderCircle, RotateCcw, Plus, BookOpen, Network, Headphones, PencilLine } from 'lucide-react'
import { Shell } from './adapt-app'
import { useWorkspace } from './use-workspace'
import { OfflineStatus } from './offline-status'
import { ConceptDiagram } from './concept-diagram'
import { ActionExercise } from './action-exercise'
import { AudioLesson } from './audio-lesson'
import { LearnerProfile } from './learner-profile'
import { conceptMedia } from '@/lib/learning-media'
import { createAdaptiveLearning, reduceAdaptiveLearning, restoreAdaptiveWorkspace, type AdaptiveWorkspace as Workspace, type AdaptiveAction as LearningAction } from '@/lib/adaptive'
import { splitDocument, MAX_DOCUMENT_CHARS } from '@/lib/document-parts'
import { importMaterial } from '@/lib/import-material'
import { normalizeSource, validateCourse, learningResults, type Format, type MaterialConcept } from '@/lib/material'

const formats: { id: Format; label: string; icon: typeof BookOpen }[] = [
  { id: 'text', label: 'Tekst', icon: BookOpen }, { id: 'visual', label: 'Schemat', icon: Network },
  { id: 'audio', label: 'Audio', icon: Headphones }, { id: 'practice', label: 'Praktyka', icon: PencilLine },
]
function FormatControl({ value, onChange }: { value: Format; onChange: (value: Format) => void }) {
  return <div className="format-control workspace-formats" role="group" aria-label="Sposób nauki">{formats.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={value === id} onClick={() => onChange(id)}><Icon size={16} aria-hidden="true" />{label}</button>)}</div>
}

export function MaterialWorkspace() {
  const { workspace, setWorkspace, draft, setDraft, name, setName, profile, setProfile, ready, storageError, learnerRecords, part, setPart, library, librarySaved } = useWorkspace()
  const parts = useMemo(() => splitDocument(draft), [draft])
  const partIndex = Math.min(part, Math.max(0, parts.length - 1))
  const [busy, setBusy] = useState(false), [importing, setImporting] = useState(false), [error, setError] = useState('')
  const request = useRef<AbortController | null>(null), focus = useRef<HTMLDivElement>(null)
  const identity = `${workspace?.learning.stage}-${workspace?.learning.index}-${workspace?.learning.phase}`
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { if (ready) focus.current?.focus() }, [identity, ready])
  const update = (action: LearningAction) => setWorkspace(v => v ? { ...v, learning: reduceAdaptiveLearning(v.learning, action, v.course) } : v)
  const generate = async () => {
    if (request.current || importing) return
    const source = normalizeSource(parts[partIndex]?.text)
    if (!source) { setError('Dodaj od 120 do 250 000 znaków materiału i wybierz część do nauki.'); return }
    const controller = new AbortController(); request.current = controller
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/material', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: source.text, profile }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(185_000)]) })
      const body = await response.json()
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Nie udało się przygotować lekcji.')
      const course = validateCourse(body.course, source, true)
      if (!course) throw new Error('Odpowiedź AI nie przeszła weryfikacji. Spróbuj ponownie.')
      setWorkspace({ version: 2, source, name: `${(name.trim() || 'Mój materiał').slice(0, 95)}${parts.length > 1 ? ` · część ${partIndex + 1}/${parts.length}` : ''}`, profile, course, learning: createAdaptiveLearning(course, profile, learnerRecords) })
    } catch (e) {
      setError(controller.signal.aborted ? 'Generowanie anulowane. Materiał pozostał w formularzu.' : e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Przekroczono czas oczekiwania. Spróbuj ponownie.')
    } finally { request.current = null; setBusy(false) }
  }
  const reset = () => {
    if (workspace && !window.confirm('Zamknąć bieżącą lekcję i dodać nowy materiał? Zapisane lekcje zostaną w bibliotece.')) return
    setWorkspace(null); setPart(0); setDraft(''); setName('Mój materiał'); setError('')
  }
  return <Shell><main className="workspace-main">
    {!ready ? <p role="status">Wczytuję Twoje materiały…</p> : <>
      <div className="workspace-breadcrumb"><Link href="/">ADAPT</Link><span aria-hidden="true">/</span><span>{workspace ? workspace.name : 'Nowy materiał'}</span>{workspace && <button type="button" onClick={reset}><Plus size={15} aria-hidden="true" /> Nowy materiał</button>}</div>
      {storageError && <p className="notice" role="status">Przeglądarka nie pozwala zapisać materiału i postępów. Możesz kontynuować, ale odświeżenie strony może je usunąć.</p>}
      <OfflineStatus />{workspace && librarySaved && <p className="field-help" role="status">Lekcja zapisana w bibliotece urządzenia.</p>}
      <div ref={focus} tabIndex={-1} className="outline-none">
        {!workspace ? <>
          <div className="workspace-heading"><span className="eyebrow">TWÓJ MATERIAŁ. TWOJA DROGA.</span><h1>Od informacji<br /><span>do zrozumienia.</span></h1><p>Dodaj materiał i wybierz, czego potrzebujesz. Przygotujemy tematy, wyjaśnienia i ćwiczenia oparte na Twoim źródle.</p></div>
          {library.length > 0 && <section className="device-library" aria-label="Zapisane lekcje"><h2>Twoje zapisane lekcje</h2><p>Ostatnie 12 lekcji, dostępne na tym urządzeniu bez ponownego generowania.</p><div>{library.map(item=><button type="button" className="saved-lesson" key={item.id} aria-label={`Otwórz lekcję: ${item.title}`} onClick={()=>{const restored=restoreAdaptiveWorkspace(item.raw);if(restored){
                const doc=item.document
                const compatible=doc&&typeof doc.text==='string'&&doc.text.length<=MAX_DOCUMENT_CHARS&&Number.isInteger(doc.part)&&doc.part>=0&&typeof doc.name==='string'&&doc.name.length<=120&&normalizeSource(splitDocument(doc.text)[doc.part]?.text)?.text===restored.source.text
                setDraft(compatible?doc.text:restored.source.text);setName(compatible?doc.name:restored.name);setPart(compatible?doc.part:0);setProfile(restored.profile);setWorkspace(restored)
              }}}><BookOpen aria-hidden="true" size={18}/><span><strong>{item.title}</strong><small>{item.name}</small></span><ArrowRight aria-hidden="true" size={18}/></button>)}</div></section>}
          <div className="workspace-setup">
            <section className="source-editor"><div className="section-title"><FileText size={20} aria-hidden="true" /><h2>Dodaj materiał</h2></div>
              <label className={`file-import ${busy || importing ? 'is-disabled' : ''}`}><Upload size={21} aria-hidden="true" /><span><strong>{importing ? 'Odczytuję dokument…' : 'Wybierz plik z urządzenia'}</strong><small>TXT, Markdown, DOCX, PDF z tekstem · do 10 MB</small></span><input type="file" className="sr-only" aria-label="Wybierz plik" accept=".txt,.md,.markdown,.docx,.pdf" disabled={busy || importing} onChange={async e => {
                const file = e.target.files?.[0]; e.target.value = ''
                if (!file) return
                setImporting(true); setError('')
                try { const text = await importMaterial(file); setDraft(text); setPart(0); setName(file.name.slice(0, 120)) }
                catch (e) { setError(e instanceof Error ? e.message : 'Nie można odczytać pliku. Spróbuj wkleić tekst.') }
                finally { setImporting(false) }
              }} /></label>
              <div className="editor-divider"><span>lub wklej tekst</span></div>
              <label className="field-label" htmlFor="material-name">Nazwa materiału</label><input id="material-name" maxLength={120} disabled={busy || importing} value={name} onChange={e => setName(e.target.value)} />
              <label className="field-label" htmlFor="material-text">Materiał źródłowy</label><textarea id="material-text" rows={13} maxLength={MAX_DOCUMENT_CHARS} disabled={busy || importing} value={draft} placeholder="Wklej notatki, fragment podręcznika lub artykułu…" onChange={e => { setDraft(e.target.value); setPart(0) }} aria-describedby="material-limit" />
              <p id="material-limit" className="field-help"><span>120–250 000 znaków</span><span>{draft.length.toLocaleString('pl-PL')} / 250 000</span></p>
              {parts.length > 1 && <section className="document-parts" aria-label="Części dokumentu"><h3>Dokument podzielony na {parts.length} części</h3><p>Cały tekst został zachowany. Jedna lekcja obejmuje wybraną część; po jej ukończeniu możesz przejść do następnej. To nie jest podsumowanie całego dokumentu.</p><label className="field-label" htmlFor="document-part">Część do nauki</label><select id="document-part" disabled={busy || importing} value={partIndex} onChange={e => setPart(Number(e.target.value))}>{parts.map((p,i)=><option key={i} value={i}>{p.label}</option>)}</select><p className="field-help">Część {partIndex+1} z {parts.length} · {parts[partIndex].text.length.toLocaleString('pl-PL')} znaków</p><details><summary>Podgląd wybranej części</summary><p className="document-part-preview">{parts[partIndex].text}</p></details></section>}
            </section>
            <section className="preferences-panel"><span className="eyebrow">DOPASUJ DO SIEBIE</span><h2>Jak chcesz się uczyć?</h2><p>To punkt wyjścia. Formę wyjaśnienia możesz zmienić w trakcie nauki.</p>
              <fieldset disabled={busy || importing}>
                <label className="field-label" htmlFor="learning-goal">Cel nauki</label><select id="learning-goal" value={profile.goal} onChange={e => setProfile({ ...profile, goal: e.target.value as typeof profile.goal })}><option value="understand">Chcę zrozumieć temat</option><option value="exam">Przygotowuję się do sprawdzianu</option><option value="apply">Chcę zastosować tę wiedzę</option></select>
                <label className="field-label" htmlFor="learning-level">Poziom wyjaśnień</label><select id="learning-level" value={profile.level} onChange={e => setProfile({ ...profile, level: e.target.value as typeof profile.level })}><option value="beginner">Od podstaw — prostym językiem</option><option value="intermediate">Znam podstawy — przejdźmy dalej</option></select>
                <label className="field-label" htmlFor="learning-time">Czas na naukę</label><select id="learning-time" value={profile.minutes} onChange={e => setProfile({ ...profile, minutes: Number(e.target.value) as typeof profile.minutes })}><option value={5}>Około 5 minut</option><option value={15}>Około 15 minut</option><option value={30}>Około 30 minut</option></select>
                <p className="field-label">Od czego zaczynamy?</p><FormatControl value={profile.format} onChange={format => setProfile({ ...profile, format, discover: false })} /><label className="auto-choice"><input type="checkbox" checked={profile.discover === true} onChange={e => setProfile({ ...profile, discover: e.target.checked })} />Nie wiem, co pomaga — poznaj mój sposób nauki</label><p className="privacy-note">Profil powstaje z wyników, nie z etykiety „wzrokowiec” lub „słuchowiec”. {learnerRecords.filter(o => o.kind === 'quiz').length} zapisanych pierwszych sprawdzeń z wcześniejszych lekcji.</p>
              </fieldset>
              <p className="privacy-note">Plik odczytujemy na urządzeniu. Po kliknięciu poniżej tekst i ustawienia trafią do usługi AI. Materiał i postępy zapisujemy lokalnie w tej przeglądarce.</p>
              <button type="button" className="action-button action-primary" disabled={busy || importing || draft.trim().length < 120} onClick={generate}>{busy ? <><LoaderCircle className="loading-icon" aria-hidden="true" /> Przygotowuję lekcję…</> : <>Przygotuj moją lekcję <ArrowRight aria-hidden="true" /></>}</button>
              {busy && <div role="status" className="generation-status"><p>Porządkujemy pojęcia, dobieramy wyjaśnienia i sprawdzamy cytaty. Jeśli kontrola jakości wykryje błąd, automatycznie ponowimy próbę. Może to potrwać do trzech minut.</p><button type="button" onClick={() => request.current?.abort()}>Anuluj generowanie</button></div>}
            </section>
          </div>
          {error && <p role="alert" className="notice error-notice">{error}</p>}
          <p className="workspace-example-link">Chcesz najpierw zobaczyć przykład? <Link href="/lesson">Otwórz gotową lekcję o internecie <ArrowRight size={14} aria-hidden="true" /></Link></p>
        </> : workspace.learning.stage === 'outline' ? <>
          <div className="workspace-heading"><span className="eyebrow">MATERIAŁ ZAMIENIONY W PLAN</span><h1>Twoja mapa nauki</h1><p>{workspace.course.introduction}</p></div>
          <section className="outline-card"><div className="section-title"><BookOpen size={22} aria-hidden="true" /><h2>{workspace.course.title}</h2></div><p className="muted-copy">Wybierz tematy do tej sesji. Wyjaśnienia i zadania przygotowano z AI na podstawie Twojego tekstu; możesz sprawdzić cytaty.</p>
            <div className="outline-topics">{workspace.course.concepts.map((c, i) => <label key={c.id}><input type="checkbox" checked={workspace.learning.ids.includes(c.id)} onChange={e => update({ type: 'topics', ids: e.target.checked ? [...workspace.learning.ids, c.id] : workspace.learning.ids.filter(id => id !== c.id) })} /><span className="topic-number">{String(i + 1).padStart(2, '0')}</span><span><strong>{c.title}</strong><small>{c.simple}</small></span></label>)}</div>
            <div className="workspace-actions"><span>{workspace.learning.ids.length} z {workspace.course.concepts.length} tematów</span><button type="button" className="action-button action-primary" disabled={!workspace.learning.ids.length} onClick={() => update({ type: 'start', ids: workspace.learning.ids })}>Zacznij naukę <ArrowRight aria-hidden="true" /></button></div>
          </section>
        </> : workspace.learning.stage === 'results' ? <><WorkspaceResults workspace={workspace} onRestart={() => setWorkspace({ ...workspace, learning: createAdaptiveLearning(workspace.course, workspace.profile, learnerRecords) })} onNew={reset} />{parts.length > 1 && partIndex + 1 < parts.length && <div className="workspace-actions"><p>Ukończono część {partIndex + 1} z {parts.length}. Pozostały materiał jest zachowany.</p><button type="button" className="action-button action-primary" onClick={() => { setPart(partIndex + 1); setWorkspace(null); setError('') }}>Przejdź do kolejnej części <ArrowRight aria-hidden="true" /></button></div>}</> : <WorkspaceStudy workspace={workspace} update={update} />}
      </div>
    </>}
  </main></Shell>
}

function SourceEvidence({ concept, workspace }: { concept: MaterialConcept; workspace: Workspace }) {
  return <details className="source-evidence"><summary>Zobacz fragment źródła</summary>{concept.evidence.map((e, i) => <div key={`${e.blockId}-${i}`}><span>Fragment {e.blockId.slice(1)} · {workspace.name}</span><blockquote>{e.quote}</blockquote><details><summary>Cały akapit</summary><p>{workspace.source.blocks.find(b => b.id === e.blockId)?.text}</p></details></div>)}</details>
}
function WorkspaceStudy({ workspace: w, update }: { workspace: Workspace; update: (a: LearningAction) => void }) {
  const s = w.learning, c = w.course.concepts.find(c => c.id === s.ids[s.index])!
  const [detail, setDetail] = useState<'explanation' | 'simple' | 'example'>('explanation')
  const [help, setHelp] = useState<'example' | 'steps'>('example')
  const retry = s.phase === 'retry' || s.phase === 'retryFeedback', feedback = s.phase === 'feedback' || s.phase === 'retryFeedback'
  const q = retry ? c.retry : c.question, correct = s.selected === q.answer
  const media = conceptMedia(c, w.course)
  useEffect(() => { setDetail('explanation'); setHelp('example') }, [c.id])
  return <div className="study-layout">
    <aside className="study-sidebar"><span className="eyebrow">TWOJA LEKCJA</span><h2>{w.course.title}</h2><ol>{s.ids.map((id, i) => <li key={id} aria-current={i === s.index ? 'step' : undefined}><span>{i < s.index ? <Check size={14} aria-hidden="true" /> : String(i + 1).padStart(2, '0')}</span>{w.course.concepts.find(c => c.id === id)?.title}</li>)}</ol><p>Wybrany poziom: {w.profile.level === 'beginner' ? 'od podstaw' : 'znam podstawy'}</p></aside>
    <div className="study-main"><span className="stage-eyebrow">Temat {s.index + 1} z {s.ids.length}{retry ? ' · druga próba' : ''}</span><h1>{c.title}</h1><div role="progressbar" aria-label="Postęp lekcji" aria-valuemin={0} aria-valuemax={s.ids.length} aria-valuenow={s.index} className="lesson-progress"><div className="lesson-progress-fill" style={{ width: `${s.index / s.ids.length * 100}%` }} /></div>
      <FormatControl value={s.format} onChange={format => update({ type: 'format', format })} /><LearnerProfile learning={s} update={update} />
      <section className="study-representation">
        {s.format === 'text' && <><div className="explanation-control">{([['explanation', 'Wyjaśnienie'], ['simple', 'Wyjaśnij prościej'], ['example', 'Pokaż przykład']] as const).map(([id, label]) => <button type="button" aria-pressed={detail === id} key={id} onClick={() => setDetail(id)}>{label}</button>)}</div><p className="material-explanation">{c[detail]}</p></>}
        {s.format === 'visual' && <ConceptDiagram key={c.id} diagram={media.diagram} evidence={c.evidence} />}
        {s.format === 'audio' && <AudioLesson key={c.id} text={media.narration} onPlay={() => update({ type: 'audio-played' })} />}
        {s.format === 'practice' && <ActionExercise learning={s} course={w.course} update={update} />}
        {!c.media && <p className="muted-copy">Ten kurs pochodzi z wcześniejszej wersji. Schemat i ćwiczenie odtworzono z istniejących cytatów; postępy zostały zachowane. Nowe kursy otrzymują osobne multimedia dla każdego tematu.</p>}
        <SourceEvidence concept={c} workspace={w} />
        {s.phase === 'question' && !s.quizOpen && <button type="button" className="action-button action-primary" onClick={() => update({ type: 'practice' })}>Sprawdź zrozumienie <ArrowRight aria-hidden="true" /></button>}
      </section>
      {(s.quizOpen || s.phase !== 'question') && <section className="study-question">
        {retry && <div className="retry-scaffold"><span className="eyebrow">DODATKOWE WYJAŚNIENIE</span><p>{c.simple}</p><div className="explanation-control"><button type="button" aria-pressed={help === 'example'} onClick={() => setHelp('example')}>Pokaż przykład</button><button type="button" aria-pressed={help === 'steps'} onClick={() => setHelp('steps')}>Krok po kroku</button></div><p>{help === 'example' ? c.example : c.steps.join(' → ')}</p></div>}
        <h2>{q.prompt}</h2><fieldset className="answer-list" disabled={feedback}><legend className="sr-only">Wybierz jedną odpowiedź</legend>{q.options.map((option, i) => <label key={`${c.id}-${retry}-${i}`} className={`answer-card ${s.selected === i ? 'is-selected' : ''} ${feedback ? 'is-disabled' : ''}`}><input type="radio" name="material-answer" checked={s.selected === i} onChange={() => update({ type: 'select', answer: i })} /><span>{option}</span></label>)}</fieldset>
        {feedback && <div role="status" className={`practice-feedback ${correct ? 'correct' : 'needs-review'}`}><strong>{correct ? retry ? 'Dodatkowe wyjaśnienie pomogło.' : 'Poprawna odpowiedź.' : retry ? 'Ten temat warto jeszcze powtórzyć.' : 'Przyjrzyjmy się temu jeszcze raz.'}</strong>{!correct && <p>Poprawna odpowiedź: {q.options[q.answer]}</p>}<p>{q.reason}</p>{!correct && <p>{c.simple}</p>}</div>}
        <SourceEvidence concept={c} workspace={w} />
        <div className="workspace-actions"><span>{retry ? 'Jedna dodatkowa próba w nowym kontekście.' : 'Liczy się zrozumienie, nie ocena.'}</span><button type="button" disabled={s.selected === null} className="action-button action-primary" onClick={() => update({ type: feedback ? 'next' : 'submit' })}>{!feedback ? 'Sprawdź odpowiedź' : !correct && !retry ? 'Spróbuj w nowym zadaniu' : s.index + 1 === s.ids.length ? 'Zobacz podsumowanie' : 'Następny temat'}<ArrowRight aria-hidden="true" /></button></div>
      </section>}
    </div>
  </div>
}
function WorkspaceResults({ workspace: w, onRestart, onNew }: { workspace: Workspace; onRestart: () => void; onNew: () => void }) {
  const result = learningResults(w.learning, w.course)
  return <div className="workspace-results"><span className="result-icon"><Check aria-hidden="true" /></span><span className="eyebrow">KOLEJNY KROK ZA TOBĄ</span><h1>Twoje podsumowanie</h1><p>{w.course.title}</p><LearnerProfile learning={w.learning} /><section className="outline-card"><h2>Co już rozumiesz?</h2><p>Poprawnie od razu: {result.first} z {w.learning.ids.length}. Po dodatkowym wyjaśnieniu: {result.recovered}.</p><div className="results-concepts">{w.learning.ids.map((id, i) => { const c = w.course.concepts.find(c => c.id === id)!, a = w.learning.attempts[i]; return <div key={id}><strong>{c.title}</strong><span>{a.first === c.question.answer ? 'Zrozumiane od razu' : a.retry === c.retry.answer ? 'Zrozumiane po wyjaśnieniu' : 'Do powtórki'}</span></div> })}</div>
    {result.review.length ? <p className="notice">Warto powtórzyć: {result.review.join(', ')}.</p> : <p className="muted-copy">W tej sesji udało Ci się rozwiązać zadanie z każdego wybranego tematu. Wróć później, aby sprawdzić, co pamiętasz.</p>}</section><div className="hero-actions"><button type="button" className="action-button action-secondary" onClick={onRestart}><RotateCcw aria-hidden="true" />Powtórz tę lekcję</button><button type="button" className="action-button action-primary" onClick={onNew}>Dodaj kolejny materiał <Plus aria-hidden="true" /></button></div></div>
}
