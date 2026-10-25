import Link from 'next/link'
import { LmsShell, LmsError } from '@/components/lms/shell'
import { lmsContext } from '@/lib/lms/data'
import { ArrowRight, BookOpen, CheckCircle2, Compass, Layers, UserRound } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { client, profile } = await lmsContext()
  const result = client ? await client.from('course_catalog').select('*').order('title') : null
  const courses = result?.data ?? []
  return <LmsShell>
    <div className="lms-breadcrumb">Platforma / Katalog przedmiotów</div>
    <section className="lms-page-heading"><div><span className="lms-eyebrow">Katalog platformy</span><h1>Dostępne przedmioty</h1><p>Wybierz przedmiot i rozpocznij swoją ścieżkę nauki.</p></div>{profile?.role === 'teacher' && <Link className="action-button action-primary" href="/teacher">Zarządzaj przedmiotami <ArrowRight size={16} aria-hidden="true" /></Link>}</section>
    {profile?.role === 'student' && !profile.assessment_completed && <aside className="lms-notice"><h2>Zacznij od poznania swojego sposobu nauki</h2><p>Przed zapisaniem się na przedmiot ukończ ankietę wstępną.</p><Link href="/assessment">Przejdź do ankiety →</Link></aside>}
    <div className="lms-dashboard-layout"><section className="lms-catalog-panel"><div className="lms-section-title"><h2><BookOpen size={20} aria-hidden="true" />Przedmioty</h2><span>{courses.length} opublikowanych</span></div>
      {!client ? <LmsError>Nie skonfigurowano połączenia z Supabase.</LmsError> : result?.error ? <LmsError>Nie można odczytać katalogu. Sprawdź migracje i udostępnienie schematu lms w Supabase.</LmsError> : <div className="lms-grid">{courses.map((course: { id: string; title: string; description: string; teacher_name: string }, index: number) => <Link className="lms-card lms-course" href={`/courses/${course.id}`} key={course.id}><div className={`lms-course-cover lms-cover-${index % 3}`}><BookOpen size={42} strokeWidth={1.4} aria-hidden="true" /><span>ADAPT / PRZEDMIOT</span><Layers size={80} strokeWidth={.8} className="lms-cover-decoration" aria-hidden="true" /></div><div className="lms-course-body"><span className="lms-eyebrow">Materiały i ćwiczenia</span><h3>{course.title}</h3><p>{course.description}</p><small><UserRound size={15} aria-hidden="true" />Prowadzący: {course.teacher_name || 'Nauczyciel'}</small><span className="lms-course-link">Zobacz przedmiot <ArrowRight size={16} aria-hidden="true" /></span></div></Link>)}{courses.length === 0 && <section className="lms-card lms-empty-state"><BookOpen size={36} aria-hidden="true" /><h3>Tu zaczyna się Twoja nauka</h3><p>Przedmioty pojawią się tutaj, gdy nauczyciel je opublikuje.</p>{profile?.role === 'teacher' && <Link href="/teacher">Utwórz pierwszy przedmiot →</Link>}</section>}</div>}
    </section><aside className="lms-right-rail" aria-label="Informacje o nauce"><section className="lms-card"><h2><Compass size={20} aria-hidden="true" />Jak zacząć?</h2><ol className="lms-start-steps"><li><span>1</span><div><strong>Poznaj swój format</strong><p>Wypełnij ankietę sposobu nauki.</p></div></li><li><span>2</span><div><strong>Zapisz się na przedmiot</strong><p>Poczekaj na akceptację prowadzącego.</p></div></li><li><span>3</span><div><strong>Ucz się krok po kroku</strong><p>Rozwiązuj testy i odblokowuj lekcje.</p></div></li></ol></section><section className="lms-card lms-tip-card"><CheckCircle2 size={24} aria-hidden="true" /><h2>Twój format, Twój wybór</h2><p>Wzrokowiec, słuchowiec czy kinestetyk? W lekcji możesz zmienić dostępny format i spróbować innej drogi.</p></section></aside></div>
  </LmsShell>
}
