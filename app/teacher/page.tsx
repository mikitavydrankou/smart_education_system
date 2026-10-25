import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, FlaskConical, Plus } from 'lucide-react'
import { lmsContext } from '@/lib/lms/data'
import { LmsShell, LmsError } from '@/components/lms/shell'
import { CourseForm, OperationButton } from '@/components/lms/actions'

export default async function TeacherPage() {
  const { client, user, profile } = await lmsContext()
  if (!user) redirect('/login')
  if (profile?.role !== 'teacher') redirect('/')
  const { data, error } = await client!.from('courses').select('*').eq('teacher_id', user.id).order('title')
  return <LmsShell>
    <div className="lms-breadcrumb">Platforma / Panel nauczyciela</div>
    <section className="lms-page-heading"><div><span className="lms-eyebrow">Przestrzeń prowadzącego</span><h1>Panel nauczyciela</h1><p>Twórz przedmioty, dopasowuj lekcje i wspieraj postępy studentów.</p></div><a href="#new-course" className="action-button action-primary"><Plus size={16} aria-hidden="true" />Dodaj przedmiot</a></section>
    <div className="lms-dashboard-layout"><section><div className="lms-section-title"><h2><BookOpen size={20} aria-hidden="true" />Twoje przedmioty</h2><span>{data?.length ?? 0} przedmiotów</span></div>{error ? <LmsError>Nie można odczytać przedmiotów.</LmsError> : <div className="lms-stack lms-teacher-courses">{data?.map(course => <Link className="lms-card lms-teacher-course" href={`/courses/${course.id}`} key={course.id}><span className="lms-lesson-number"><BookOpen size={21} aria-hidden="true" /></span><div><span className={`lms-badge ${course.published ? 'lms-badge-approved' : 'lms-badge-pending'}`}>{course.published ? 'Opublikowany' : 'Szkic'}</span><h2>{course.title}</h2><p>{course.description}</p><span className="lms-course-link">Zarządzaj przedmiotem →</span></div></Link>)}{!data?.length && <section className="lms-card lms-empty-state"><BookOpen size={32} aria-hidden="true" /><h3>Twoje pierwsze zajęcia</h3><p>Utwórz przedmiot lub zacznij od gotowego przykładu.</p></section>}</div>}<section className="lms-card lms-demo-panel"><FlaskConical size={27} aria-hidden="true" /><div><h2>Gotowy przykład na zajęcia</h2><p>Trzy lekcje o Internecie, trzy formaty treści i sześć rodzajów zadań. Ponowne kliknięcie nie tworzy kopii.</p><OperationButton operation="create_demo_course" args={{}}>Utwórz przedmiot demonstracyjny</OperationButton></div></section></section><aside className="lms-right-rail" aria-label="Tworzenie przedmiotu" id="new-course"><section className="lms-card"><h2><Plus size={18} aria-hidden="true" />Nowy przedmiot</h2><p>Dodaj nazwę i opis. Lekcje przygotujesz wewnątrz przedmiotu.</p><CourseForm /></section></aside></div>
  </LmsShell>
}
