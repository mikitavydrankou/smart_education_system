'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { STYLE_LABELS, type AttemptResult, type Block, type LessonRevision, type Question, type Style, type StudySession } from '@/lib/lms/types';
import { correctPracticeAnswer } from '@/lib/lms/practice';
import { PracticeTask } from './practice-task';
import { AudioPreview } from '@/components/audio-preview';

const safeUrl = (url?: string) => url?.startsWith('https://') || url?.startsWith('/api/lms/files?path=') ? url : undefined;

function ContentBlock({ block }: { block: Block }) {
  if (block.type === 'heading') return <h3>{block.text}</h3>;
  if (block.type === 'list') return <ul>{block.text.split('\n').filter(Boolean).map((line, index) => <li key={index}>{line}</li>)}</ul>;
  if (block.type === 'image') return <figure>{safeUrl(block.url) && <Image unoptimized src={safeUrl(block.url)!} width={960} height={540} style={{ height: 'auto', maxWidth: '100%' }} alt={block.text} />}<figcaption>{block.text}</figcaption></figure>;
  if (block.type === 'audio') return <div><audio controls src={safeUrl(block.url)} /><details><summary>Transkrypcja</summary><p className="lms-prose">{block.transcript}</p></details></div>;
  if (block.type === 'pdf') return <a href={safeUrl(block.url)} target="_blank" rel="noreferrer">{block.text || 'Otwórz dokument PDF'}</a>;
  return <div className={block.type === 'practice' ? 'lms-practice' : 'lms-prose'}>{block.type === 'practice' && <strong>Ćwiczenie praktyczne</strong>}<p>{block.text}</p></div>;
}

function AnswerInput({ question, answer, onChange }: { question: Question; answer: unknown; onChange: (value: unknown) => void }) {
  if (question.type === 'short') return <input aria-label="Twoja odpowiedź" value={typeof answer === 'string' ? answer : ''} onChange={event => onChange(event.target.value)} />;
  if (question.type === 'matching') {
    const selected = answer && typeof answer === 'object' ? answer as Record<string, string> : {};
    const rights = question.rightOptions || [];
    return <div>{question.options.map(left => <label className="lms-field" key={left}>{left}<select value={selected[left] || ''} onChange={event => onChange({ ...selected, [left]: event.target.value })}><option value="">Wybierz dopasowanie</option>{rights.map(right => <option key={right}>{right}</option>)}</select></label>)}</div>;
  }
  if (question.type === 'ordering') {
    const items = Array.isArray(answer) ? answer as string[] : question.options;
    return <div><p>Ustaw elementy w poprawnej kolejności.</p><ol>{items.map((item, index) => <li key={item}>{item} <button type="button" disabled={!index} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }}>↑</button> <button type="button" disabled={index === items.length - 1} onClick={() => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; onChange(next); }}>↓</button></li>)}</ol></div>;
  }
  return <div>{question.options.map((option, index) => <label className="lms-option" key={index}><input type={question.type === 'multiple' ? 'checkbox' : 'radio'} name={question.id} checked={question.type === 'multiple' ? Array.isArray(answer) && answer.includes(index) : answer === (question.type === 'boolean' ? index === 0 : index)} onChange={() => onChange(question.type === 'multiple' ? (Array.isArray(answer) && answer.includes(index) ? answer.filter(value => value !== index) : [...(Array.isArray(answer) ? answer : []), index]) : question.type === 'boolean' ? index === 0 : index)} />{option}</label>)}</div>;
}

export function LessonPlayer({ lesson, revision, preferredStyle, onSubmit, onStyleChange, onBeginStudy, onCompleteBlock }: {
  lesson: { id: string; title: string }; revision: LessonRevision; preferredStyle: Style | null;
  onSubmit: (answers: Record<string, unknown>, studyId: string) => Promise<AttemptResult>;
  onStyleChange?: (style: Style) => void;
  onBeginStudy: (variant: string) => Promise<StudySession>;
  onCompleteBlock: (study: string, block: string, answer?: unknown) => Promise<StudySession>;
}) {
  const [style, setStyle] = useState<Style | null>(preferredStyle);
  const [study, setStudy] = useState<StudySession | null>(null);
  const [testing, setTesting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [activityAnswer, setActivityAnswer] = useState<unknown>();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const variant = revision.content.find(item => style && item.styles.includes(style));
  const variantId = variant?.id;
  useEffect(() => {
    if (!variantId) return;
    let active = true;
    void onBeginStudy(variantId).then(session => { if (active) setStudy(session); }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Nie udało się rozpocząć lekcji.'); });
    return () => { active = false; };
  }, [variantId, style, revision.id, onBeginStudy]);
  const block = study && variant?.blocks.find(item => !study.completed_blocks.includes(item.id));
  const selectStyle = (next: Style) => {
    if (next === style) return;
    setStyle(next); setStudy(null); setTesting(false); setAnswers({}); setActivityAnswer(undefined); setResult(null); setError(''); onStyleChange?.(next);
  };
  const completeBlock = async () => {
    if (!study || !block) return;
    let answer = activityAnswer;
    if (block.activity?.type === 'ordering' && answer === undefined) answer = [...block.activity.options].sort((first, second) => first.localeCompare(second));
    if (block.activity && !correctPracticeAnswer(block.activity, answer)) { setError('To jeszcze nie jest poprawne rozwiązanie. Spróbuj ponownie.'); return; }
    setBusy(true); setError('');
    try { setStudy(await onCompleteBlock(study.id, block.id, answer)); setActivityAnswer(undefined); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Nie udało się zapisać postępu.'); }
    finally { setBusy(false); }
  };
  return <article className="lms-lesson"><h1>{lesson.title}</h1><div className="lms-style-picker" aria-label="Format lekcji">{revision.content.flatMap(item => item.styles).map(item => <button className="action-button" type="button" disabled={busy} key={item} aria-pressed={style === item} onClick={() => selectStyle(item)}>{STYLE_LABELS[item]}</button>)}</div>
    {!variant ? <p>Twój preferowany format nie jest dostępny. Wybierz jedną z wersji powyżej.</p> : !testing ? <section>
      <p role="status">Materiał: {study?.completed_blocks.length ?? 0} / {variant.blocks.length} kroków</p>
      {!study && !error && <p>Przygotowywanie materiału…</p>}
      {!study && error && <button className="action-button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { setStudy(await onBeginStudy(variant.id)); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Błąd połączenia.'); } finally { setBusy(false); } }}>Ponów wczytanie materiału</button>}
      {block && <div key={block.id} className="lms-material-step"><ContentBlock block={block} />{style === 'auditory' && block.type !== 'audio' && <AudioPreview />}{block.activity && <PracticeTask activity={block.activity} answer={activityAnswer} onChange={setActivityAnswer} />}<button className="action-button action-primary" disabled={busy} onClick={() => void completeBlock()}>{busy ? 'Zapisywanie…' : block.activity ? 'Sprawdź ćwiczenie i kontynuuj' : 'Potwierdzam zapoznanie się z materiałem'}</button></div>}
      {study?.completed && <><h2>Materiał ukończony</h2><p>Możesz teraz sprawdzić swoją wiedzę.</p><details><summary>Powtórz materiał</summary>{variant.blocks.map(item => <ContentBlock block={item} key={item.id} />)}</details></>}
      <button className="action-button" disabled={!study?.completed || busy} onClick={() => { setTesting(true); setResult(null); setError(''); }}>Przejdź do testu</button>
    </section> : <form onSubmit={async event => {
      event.preventDefault(); if (!study?.completed) return; setBusy(true); setError('');
      try { const submitted = { ...answers }; for (const question of revision.questions) if (question.type === 'ordering' && !submitted[question.id]) submitted[question.id] = [...question.options]; setResult(await onSubmit(submitted, study.id)); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Nie udało się zapisać wyniku. Spróbuj ponownie.'); }
      finally { setBusy(false); }
    }}>
      {!result && <><p>Próg zaliczenia: {revision.threshold}%</p>{revision.questions.map((question, index) => <fieldset key={question.id}><legend>{index + 1}. {question.prompt}</legend><AnswerInput question={question} answer={answers[question.id]} onChange={answer => setAnswers(current => ({ ...current, [question.id]: answer }))} /></fieldset>)}<button className="action-button" disabled={busy}>{busy ? 'Sprawdzanie…' : 'Zakończ test'}</button></>}
      {result && <div role="status"><h2>{result.passed ? 'Test zaliczony!' : 'Spróbuj ponownie'}</h2><p>Wynik: {result.score}/{result.total} ({Number(result.percentage.toFixed(1))}%)</p>{result.passed ? <p>{result.preview ? 'To wynik podglądu. Postępy studentów nie zostały zmienione.' : 'Wróć do listy lekcji, aby kontynuować naukę.'}</p> : <><p>Powtórz test lub wróć do materiału i wybierz inny format. Zmiana formatu rozpocznie ponowne przejście materiału.</p><button type="button" className="action-button" onClick={() => { setAnswers({}); setResult(null); setError(''); }}>Powtórz test</button><button type="button" className="action-button" onClick={() => { setTesting(false); setAnswers({}); setResult(null); setError(''); }}>Wróć do lekcji / zmień format</button></>}</div>}
    </form>}
    {error && <p role="alert">{error}</p>}
  </article>;
}
