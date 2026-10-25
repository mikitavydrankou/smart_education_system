import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, Check, LockKeyhole, Settings2, Users } from 'lucide-react'
import { lmsContext } from '@/lib/lms/data'
import { LmsShell, LmsError } from '@/components/lms/shell'
import { CourseForm, OperationButton } from '@/components/lms/actions'

export default async function CoursePage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { courseId } = await params
  if (!/^[\da-f-]{36}$/.test(courseId)) notFound()
  const { client, user, profile } = await lmsContext()
  if (!client) return <LmsShell><LmsError>Brak konfiguracji Supabase.</LmsError></LmsShell>
  const { data: course, error } = await client.from('courses').select('*').eq('id', courseId).maybeSingle()
  if (error) return <LmsShell><LmsError>Nie udało się odczytać przedmiotu.</LmsError></LmsShell>
  if (!course) notFound()
  const owner = user?.id === course.teacher_id
  const preview = owner && (await searchParams).preview === '1'
  const { data: enrollment } = user ? await client.from('enrollments').select('*').eq('course_id', courseId).eq('student_id', user.id).maybeSingle() : { data: null }
  const allowed = owner || enrollment?.status === 'approved'
  const lessonsResult = allowed ? await client.from('lessons').select('*').eq('course_id', courseId).order('position') : { data: [], error: null }
  const { data: progress } = user && allowed ? await client.from('lesson_progress').select('lesson_id,passed').eq('student_id', user.id) : { data: [] }
  const { data: previewAttempts } = preview ? await client.from('attempts').select('lesson_id').eq('student_id', user!.id).eq('preview', true).eq('passed', true) : { data: [] }
  const passed = new Set(preview ? previewAttempts?.map(item => item.lesson_id) : progress?.filter(item => item.passed).map(item => item.lesson_id))
  const { data: requests } = owner ? await client.from('enrollments').select('student_id,status,profiles!enrollments_student_id_fkey(display_name)').eq('course_id', courseId) : { data: [] }
  let unlocked = true
  const published = lessonsResult.data?.filter(item => item.published) ?? []
  const completed = published.filter(item => passed.has(item.id)).length
  const percent = published.length ? Math.round(completed / published.length * 100) : 0
  return <LmsShell>
    <div className="lms-breadcrumb"><Link href="/">Przedmioty</Link><span>/</span><span>{course.title}</span></div>
    <section className="lms-course-heading"><div className="lms-course-emblem"><BookOpen size={30} aria-hidden="true" /></div><div><span className="lms-eyebrow">{owner ? 'Twój przedmiot' : 'Przedmiot'}</span><h1>{course.title}</h1><p>{course.description}</p></div></section>
    {owner && <nav className="lms-course-tabs" aria-label="Tryb przedmiotu"><Link aria-current={!preview ? 'page' : undefined} href={`/courses/${courseId}`}>Tryb nauczyciela</Link><Link aria-current={preview ? 'page' : undefined} href={`/courses/${courseId}?preview=1`}>Tryb studenta</Link><span>{preview ? 'Podgląd: lekcje odblokowujesz po kolei.' : 'Zarządzanie treścią i zapisami.'}</span></nav>}
    <div className="lms-dashboard-layout"><section className="lms-course-sections">
      {!user ? <aside className="lms-notice"><h2>Dołącz do przedmiotu</h2><p>Zaloguj się, aby zapisać się na przedmiot. Treść jest dostępna po zatwierdzeniu przez prowadzącego.</p><Link className="action-button action-primary" href="/login">Zaloguj się →</Link></aside> : !owner && !profile?.assessment_completed ? <aside className="lms-notice"><p>Najpierw ukończ ankietę wstępną.</p><Link href="/assessment">Mój sposób nauki →</Link></aside> : !allowed ? <section className="lms-card">{enrollment?.status === 'pending' ? <p>Twoje zgłoszenie czeka na zatwierdzenie przez prowadzącego.</p> : <><h2>Rozpocznij naukę</h2><p>{enrollment?.status === 'rejected' ? 'Zgłoszenie zostało odrzucone. Możesz zgłosić się ponownie.' : 'Zapisz się, aby rozpocząć naukę.'}</p><OperationButton operation="request_enrollment" args={{ course: courseId }}>Zapisz się</OperationButton></>}</section> : null}
      {allowed && <><div className="lms-section-title"><h2><BookOpen size={20} aria-hidden="true" />Lekcje</h2>{owner && !preview && <Link className="action-button action-primary" href={`/courses/${courseId}/lessons/new`}>Dodaj lekcję</Link>}</div>{published.length > 0 && completed === published.length && !owner && <p className="lms-notice" role="status">Gratulacje! Ukończyłeś wszystkie lekcje tego przedmiotu.</p>}{lessonsResult.error ? <LmsError>Nie można odczytać lekcji.</LmsError> : <ol className="lms-lesson-list">{lessonsResult.data?.map(lesson => {
        if (preview && !lesson.published) return null
        const available = (owner && !preview) || unlocked
        if (lesson.published && !passed.has(lesson.id)) unlocked = false
        const done = passed.has(lesson.id)
        return <li className={`lms-card lms-lesson-row${!available ? ' is-locked' : ''}${done ? ' is-complete' : ''}`} key={lesson.id}><span className="lms-lesson-number" aria-hidden="true">{done ? <Check size={20} /> : !available ? <LockKeyhole size={18} /> : String(lesson.position).padStart(2, '0')}</span><div className="lms-lesson-summary"><span className="lms-eyebrow">Lekcja {lesson.position} · {lesson.published ? done ? 'Ukończona' : available ? 'Dostępna' : 'Zablokowana' : 'Szkic'}</span><h3>{lesson.title}</h3><small>Materiał lekcji · test sprawdzający</small></div><div className="lms-row">{available ? <Link className="lms-lesson-open" href={`/courses/${courseId}/lessons/${lesson.id}${owner ? '?preview=1' : ''}`}>{owner ? 'Widok studenta' : 'Otwórz lekcję'} →</Link> : <span>Najpierw zalicz poprzednie lekcje</span>}{owner && !preview && <Link href={`/courses/${courseId}/lessons/${lesson.id}/edit`}>Edytuj</Link>}</div></li>
      })}</ol>}{!lessonsResult.error && lessonsResult.data?.length === 0 && <section className="lms-card lms-empty-state"><BookOpen size={28} aria-hidden="true" /><h3>Nie ma jeszcze lekcji</h3><p>{owner ? 'Dodaj pierwszą lekcję, aby przygotować materiały dla studentów.' : 'Prowadzący przygotowuje materiały do tego przedmiotu.'}</p></section>}</>}
      {owner && !preview && <details className="lms-card lms-course-settings"><summary><Settings2 size={18} aria-hidden="true" />Ustawienia przedmiotu</summary><CourseForm initial={course} /></details>}
    </section><aside className="lms-right-rail" aria-label="Informacje o przedmiocie">
      {allowed && (!owner || preview) && <section className="lms-card"><h2>Twoje postępy</h2><div className="lms-progress-value">{percent}<small>%</small></div><progress className="lms-progress" aria-label="Ukończenie przedmiotu" max={published.length || 1} value={completed} /><p>Ukończone lekcje: {completed} z {published.length}</p>{preview && <small>Postępy podglądu, bez ocen studentów.</small>}</section>}
      {owner && !preview ? <section className="lms-card"><h2><Users size={20} aria-hidden="true" />Zgłoszenia studentów</h2><div className="lms-stack lms-enrollment-list">{requests?.map(item => <section key={item.student_id}><h3>{(item.profiles as unknown as { display_name: string })?.display_name || item.student_id}</h3><p><span className={`lms-badge lms-badge-${item.status}`}>{({ pending: 'Oczekuje', approved: 'Zatwierdzony', rejected: 'Odrzucony' } as Record<string, string>)[item.status]}</span></p>{item.status === 'pending' && <div className="lms-row"><OperationButton operation="review_enrollment" args={{ course: courseId, student: item.student_id, approve: true }}>Zatwierdź</OperationButton><OperationButton operation="review_enrollment" args={{ course: courseId, student: item.student_id, approve: false }}>Odrzuć</OperationButton></div>}</section>)}{!requests?.length && <p>Nowe zgłoszenia studentów pojawią się tutaj.</p>}</div></section> : <section className="lms-card"><h2>O przedmiocie</h2><p>Lekcje realizujesz po kolei. Zaliczenie testu otwiera kolejny etap.</p><p>Jeśli potrzebujesz innego podejścia, wybierz dostępny format materiału.</p></section>}
    </aside></div>
  </LmsShell>
}
