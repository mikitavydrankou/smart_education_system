'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, ChevronRight, RotateCcw, Sparkles, Layers, SlidersHorizontal } from 'lucide-react'
import { concepts, knowledgeQuestions, practiceQuestions, type ConceptId, type QuestionContent } from '@/lib/lesson-data'
import { getResults, getWeakConcepts, type Session, type Action } from '@/lib/session'
import { useSession } from './use-session'
import { NetworkDiagram, SpeechControl } from './lesson-media'
import { MistakeExplanation } from './mistake-explanation'
import { LearningPreview } from './learning-preview'

function Header() {
  return <header className="app-header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="ADAPT — strona główna"><span className="brand-symbol" aria-hidden="true"><Layers size={21} strokeWidth={1.7} /></span>adapt<span className="brand-dot">.</span></Link>
    <span className="header-caption">Przestrzeń do zrozumienia.</span>
    <Link href="/workspace" className="header-link">Twoje materiały <ArrowRight size={15} aria-hidden="true" /></Link>
  </div></header>
}
export function Shell({ children }: { children: React.ReactNode }) { return <div className="app-shell"><Header />{children}<footer className="app-footer"><span>ADAPT</span><span>Ucz się w swoim tempie.</span></footer></div> }
function Button({ children, onClick, href, secondary = false, disabled = false }: { children: React.ReactNode; onClick?: () => void; href?: string; secondary?: boolean; disabled?: boolean }) {
  const cls = `action-button ${secondary ? 'action-secondary' : 'action-primary'}`
  return href ? <Link href={href} className={cls}>{children}</Link> : <button type="button" disabled={disabled} onClick={onClick} className={cls}>{children}</button>
}
function Pill({ children }: { children: React.ReactNode }) { return <span className="stage-eyebrow">{children}</span> }

export function Landing() {
  return <Shell><main className="home-main">
    <section className="hero-section">
      <p className="hero-eyebrow"><span aria-hidden="true" /> MNIEJ SZUMU. WIĘCEJ ZROZUMIENIA.</p>
      <h1>Zrozum więcej.<br /><span>Po swojemu.</span></h1>
      <p className="hero-description">Dodaj swój materiał. Czytaj, zobacz, posłuchaj.<br />Znajdź swoją drogę do zrozumienia — krok po kroku.</p>
      <div className="hero-actions"><Button href="/workspace">Dodaj swój materiał <ArrowRight size={17} aria-hidden="true" /></Button><Link className="text-link" href="/lesson">Rozpocznij lub wznów lekcję przykładową <ChevronRight size={17} aria-hidden="true" /></Link></div>
      <p className="hero-note">Bez konta. Bez ocen. W Twoim tempie.</p>
    </section>
    <div className="preview-container"><LearningPreview /></div>
    <section id="jak-to-dziala" className="approach-section">
      <div className="approach-intro"><span className="eyebrow">ZAPROJEKTOWANE WOKÓŁ CIEBIE</span><h2>Wiedza, która<br />staje się Twoja.</h2><p>Ten sam temat możesz odkrywać na różne sposoby. Wybierz formę, która pomaga Ci zrobić kolejny krok.</p></div>
      <div className="approach-items">{[
        { icon: SlidersHorizontal, title: 'Zacznij od tego, co wiesz.', text: 'Krótka diagnoza dobiera poziom wyjaśnień. Znane pojęcia przejrzysz w skrócie, trudniejsze poznasz dokładniej.' },
        { icon: BookOpen, title: 'Zmień perspektywę.', text: 'Proste słowa, konkretny przykład, schemat lub odczyt. Możesz zmienić sposób nauki w dowolnej chwili.' },
        { icon: Sparkles, title: 'Zrozum. Spróbuj. Zapamiętaj.', text: 'Ćwiczenia pokazują, co już rozumiesz. Po błędzie otrzymasz wyjaśnienie i nowe zadanie, by sprawdzić postęp.' },
      ].map(({ icon: Icon, title, text }) => <article key={title}><Icon size={24} strokeWidth={1.5} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    </section>
    <section className="home-closing"><span className="eyebrow">NA DOBRY POCZĄTEK</span><h2>Mały krok.<br />Nowe zrozumienie.</h2><p>Poznaj DNS, adresy IP i serwery w interaktywnej lekcji.</p><Link className="text-link" href="/lesson">Otwórz lekcję <ArrowRight size={17} aria-hidden="true" /></Link></section>
  </main></Shell>
}

function Progress({ current, total }: { current: number; total: number }) {
  return <div role="progressbar" aria-label="Postęp" aria-valuemin={0} aria-valuemax={total} aria-valuenow={current} className="lesson-progress"><div className="lesson-progress-fill" style={{ width: `${current / total * 100}%` }} /></div>
}
function AnswerCards({ question, selected, onSelect, disabled = false }: { question: QuestionContent; selected: number | null; onSelect: (value: number) => void; disabled?: boolean }) {
  return <fieldset className="answer-list" disabled={disabled}><legend className="sr-only">Wybierz jedną odpowiedź</legend>{question.options.map((option, index) => <label key={option} className={`answer-card ${selected === index ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}><input type="radio" className="size-4 shrink-0 accent-blue-600" name="answer" checked={selected === index} onChange={() => onSelect(index)} /><span>{option}</span></label>)}</fieldset>
}
const cardClass = 'lesson-card'
type Update = (action: Action | 'restart') => void

export function Lesson() {
  const { session, update, ready, storageError } = useSession()
  const focusTarget = useRef<HTMLDivElement>(null)
  const identity = `${session.stage}-${session.assessment.length}-${session.practiceIndex}-${session.phase}`
  useEffect(() => { if (ready) focusTarget.current?.focus() }, [identity, ready])
  if (!ready) return <Shell><main className="lesson-main" role="status">Wczytuję postępy lekcji…</main></Shell>
  return <Shell><main className="lesson-main">
    {storageError && <p role="status" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Przeglądarka nie pozwala zapisać postępów. Możesz kontynuować, ale odświeżenie strony może je usunąć.</p>}
    <div ref={focusTarget} tabIndex={-1} className="outline-none">
      {session.stage === 'knowledge' && <Assessment session={session} update={update} />}
      {session.stage === 'lesson' && <ContentLesson session={session} update={update} />}
      {session.stage === 'practice' && <Practice session={session} update={update} />}
      {session.stage === 'results' && <Results session={session} update={update} />}
    </div>
    <div className="mt-10 flex justify-center"><button type="button" onClick={() => { if (window.confirm('Usunąć zapisane postępy i rozpocząć lekcję od początku?')) update('restart') }} className="min-h-11 rounded-xl px-4 py-3 text-sm text-slate-500 hover:bg-slate-100"><RotateCcw aria-hidden className="mr-2 inline size-4" />Rozpocznij od nowa</button></div>
  </main></Shell>
}
function Assessment({ session, update }: { session: Session; update: Update }) {
  const q = knowledgeQuestions[session.assessment.length]
  const selectedAnswer = session.selected
  return <><Pill>Krok 1 z 4 · rozpoznanie wiedzy</Pill><h1 className="mt-6 text-3xl font-semibold">Co już wiesz?</h1><p className="mt-3 text-slate-600">Trzy krótkie pytania pomogą dobrać objaśnienia. To nie egzamin — nie przyznajemy ocen.</p><p className="mt-6 text-sm text-slate-500">Pytanie {session.assessment.length + 1} z {knowledgeQuestions.length}</p><Progress current={session.assessment.length} total={knowledgeQuestions.length} /><section className={cardClass} key={q.id}><h2 className="text-xl font-semibold">{q.prompt}</h2><AnswerCards question={q} selected={selectedAnswer} onSelect={answer => update({ type: 'select', answer })} /><div className="mt-8 flex justify-end"><Button disabled={selectedAnswer === null} onClick={() => { if (selectedAnswer === null) return; update({ type: 'assessment', answer: selectedAnswer }) }}>Kontynuuj <ChevronRight aria-hidden /></Button></div></section></>
}
function ContentLesson({ session, update }: { session: Session; update: Update }) {
  const [mode, setMode] = useState<'main' | 'simple' | 'example' | 'steps'>('main')
  const weak = getWeakConcepts(session)
  const concept = concepts.find(c => c.id === session.activeConcept)!
  const needsHelp = weak.includes(concept.id)
  const text = mode === 'main' ? (needsHelp ? `${concept.explanation} ${concept.example}` : concept.simple) : concept[mode]
  return <><Pill>Krok 2 z 4 · lekcja dopasowana do wiedzy</Pill><h1 className="mt-5 text-3xl font-semibold sm:text-4xl">Jak działa internet?</h1><p className="mt-3 text-slate-600">{weak.length ? 'Tematy wymagające wyjaśnienia otrzymują szerszy opis i przykład. Pozostałe możesz przejrzeć w skrócie.' : 'Znasz już podstawowe pojęcia. Zacznij od krótkich objaśnień lub przejdź do praktyki.'}</p><Progress current={2} total={4} />
    <div className="concept-control" aria-label="Tematy lekcji">{concepts.map(c => <button key={c.id} type="button" aria-pressed={c.id === concept.id} onClick={() => { update({ type: 'visit', concept: c.id }); setMode('main') }} className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${c.id === concept.id ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{c.shortTitle}{weak.includes(c.id) ? ' · wyjaśnienie' : ' · skrót'}{session.completed.includes(c.id) ? ' ✓' : ''}</button>)}</div>
    <section className={cardClass}><h2 className="text-2xl font-semibold">{concept.title}</h2><p className="mt-4 text-lg leading-8 text-slate-700">{text}</p><div className="explanation-control">{([['main', 'Opis'], ['simple', 'Wyjaśnij prościej'], ['example', 'Pokaż przykład'], ['steps', 'Krok po kroku']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-semibold ${mode === value ? 'border-blue-400 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}>{label}</button>)}</div><SpeechControl text={text} /><NetworkDiagram /></section>
    <div className="mt-6 flex justify-end"><Button onClick={() => update({ type: 'practice' })}>Przejdź do ćwiczeń <ArrowRight aria-hidden /></Button></div></>
}
function Practice({ session, update }: { session: Session; update: Update }) {
  const q = practiceQuestions[session.practiceIndex]
  const retry = session.phase === 'retry' || session.phase === 'retryFeedback'
  const feedback = session.phase === 'feedback' || session.phase === 'retryFeedback'
  const current = retry ? q.retry : q
  const correct = session.selected === current.answer
  const concept = concepts.find(c => c.id === q.concept)!
  const [extra, setExtra] = useState<'example' | 'steps'>('example')
  return <><Pill>Krok 3 z 4 · praktyka</Pill><p className="mt-5 text-sm text-slate-500">Zadanie {session.practiceIndex + 1} z {practiceQuestions.length} · {concept.shortTitle}{retry ? ' · druga próba' : ''}</p><Progress current={session.practiceIndex} total={practiceQuestions.length} /><section className={cardClass}><h1 className="text-2xl font-semibold">{retry ? 'Sprawdź to w innym kontekście' : 'Sprawdźmy, co rozumiesz'}</h1>
    {retry && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><h2 className="font-semibold">Dodatkowe wyjaśnienie</h2><p className="mt-2">{concept.simple}</p><div className="mt-3 flex flex-wrap gap-2"><Button secondary onClick={() => setExtra('example')}>Pokaż przykład</Button><Button secondary onClick={() => setExtra('steps')}>Krok po kroku</Button></div><p className="mt-3" aria-live="polite">{concept[extra]}</p></div>}
    <h2 className="mt-7 text-xl font-semibold">{current.prompt}</h2><AnswerCards key={`${q.id}-${retry}`} question={current} selected={session.selected} disabled={feedback} onSelect={answer => update({ type: 'select', answer })} />
    {feedback && <div role="status" className={`mt-5 rounded-2xl p-4 text-sm ${correct ? 'bg-blue-50 text-blue-950' : 'bg-amber-50 text-amber-950'}`}><p className="font-semibold">{correct ? (retry ? 'Poprawnie — dodatkowe wyjaśnienie pomogło.' : 'Poprawna odpowiedź.') : retry ? 'Ten temat warto jeszcze powtórzyć. Możesz kontynuować.' : 'Przyjrzyjmy się temu pojęciu jeszcze raz.'}</p><p className="mt-2">{!correct && <>Poprawna odpowiedź: <strong>{current.options[current.answer]}</strong>. </>}{current.reason}</p>{!correct && <><p className="mt-3 leading-6">{concept.simple}</p><MistakeExplanation key={`${q.id}-${retry}`} questionId={q.id} retry={retry} selected={session.selected!} /></>}</div>}
    <div className="mt-8 flex justify-end"><Button disabled={session.selected === null} onClick={() => update({ type: feedback ? 'next' : 'submit' })}>{!feedback ? 'Sprawdź odpowiedź' : !correct && !retry ? 'Spróbuj w nowym zadaniu' : session.practiceIndex === practiceQuestions.length - 1 ? 'Zobacz podsumowanie' : 'Następne zadanie'}<ChevronRight aria-hidden /></Button></div></section></>
}
function Results({ session, update }: { session: Session; update: Update }) {
  const result = getResults(session)
  const names = (ids: ConceptId[]) => ids.map(id => concepts.find(c => c.id === id)!.shortTitle).join(', ') || 'Brak'
  return <><div className="text-center"><div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Check aria-hidden /></div><Pill>Krok 4 z 4 · lekcja ukończona</Pill><h1 className="mt-5 text-4xl font-semibold">Twoje podsumowanie</h1><p className="mt-4 text-lg text-slate-600">Poprawnie za pierwszym razem: {result.firstCorrect} z {practiceQuestions.length}. Poprawnie po dodatkowym wyjaśnieniu: {result.correctAfterRetry}.</p><p className="mt-2 text-sm text-slate-500">Podsumowanie dotyczy ćwiczeń. Pytania wstępne służyły wyłącznie dopasowaniu lekcji.</p></div><div className="mt-8 grid gap-4">{[['Zrozumiane od razu', result.first], ['Zrozumiane po dodatkowym wyjaśnieniu', result.retry], ['Warto powtórzyć', result.review]].map(([title, ids]) => <section key={title as string} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-500">{title}</h2><p className="mt-2 text-lg font-semibold">{names(ids as ConceptId[])}</p></section>)}</div>
    {result.review.length > 0 && <section className={cardClass}><h2 className="text-xl font-semibold">Materiały do powtórki</h2>{result.review.map(id => { const c = concepts.find(c => c.id === id)!; return <details key={id} className="mt-4 rounded-xl bg-slate-50 p-4"><summary className="min-h-8 cursor-pointer font-semibold">{c.title}</summary><p className="mt-3 leading-7">{c.simple} {c.example}</p></details> })}</section>}
    <p className="mt-6 text-sm leading-6 text-slate-500">Temat wymaga powtórki, jeśli choć jedno dotyczące go zadanie pozostało błędne po drugiej próbie. Późniejsza poprawna odpowiedź nie usuwa wcześniejszej trudności.</p><div className="mt-7 flex justify-center"><Button secondary onClick={() => update('restart')}><RotateCcw aria-hidden />Przejdź lekcję ponownie</Button></div></>
}
export function AppRouter() {
  const path = usePathname()
  if (path === '/') return <Landing />
  return <Lesson />
}
