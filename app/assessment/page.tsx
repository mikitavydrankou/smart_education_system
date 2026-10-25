import Link from 'next/link'
import { redirect } from 'next/navigation'
import { lmsContext } from '@/lib/lms/data'
import { LmsShell, LmsError } from '@/components/lms/shell'
import { AssessmentForm } from '@/components/lms/assessment-form'
import { STYLE_LABELS, type Style } from '@/lib/lms/types'

export default async function AssessmentPage() {
  const { client, user, profile } = await lmsContext()
  if (!user) redirect('/login')
  if (!profile) return <LmsShell><LmsError>Nie można odczytać profilu. Sprawdź migracje bazy.</LmsError></LmsShell>
  if (profile.assessment_completed) return <LmsShell><span className="lms-eyebrow">Twój sposób nauki</span><h1>Ucz się po swojemu.</h1><section className="lms-card"><h2>Wybrany format: {STYLE_LABELS[profile.preferred_style as Style]}</h2><p>To punkt wyjścia. Podczas nauki możesz wybierać inne dostępne wersje lekcji.</p><Link className="action-button action-primary" href="/">Przejdź do przedmiotów</Link></section></LmsShell>
  const { data: config, error } = await client!.from('assessment_config').select('*').eq('approved', true).maybeSingle()
  return <LmsShell><span className="lms-eyebrow">Zanim zaczniesz</span><h1>Poznaj swój sposób nauki.</h1><p className="lms-lead">Ankieta pomoże wybrać początkową wersję lekcji. Później możesz zmienić format.</p>{error ? <LmsError>Nie można odczytać ankiety.</LmsError> : config ? <AssessmentForm config={config} draft={profile.assessment_answers ?? {}} /> : <section className="lms-card" role="status"><h2>Ankieta jest przygotowywana</h2><p>Ankieta nie jest teraz dostępna. Spróbuj ponownie później lub skontaktuj się z prowadzącym.</p><p>Twoje konto zostało utworzone. Zapisy na przedmioty będą dostępne po opublikowaniu i ukończeniu ankiety.</p><a href="https://www.educationplanner.org/students/self-assessments/learning-styles" target="_blank" rel="noreferrer">Zobacz źródło ankiety →</a></section>}</LmsShell>
}
