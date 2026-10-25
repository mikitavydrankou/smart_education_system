import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { LmsShell, LmsError } from '@/components/lms/shell'
import { LessonSession } from '@/components/lms/lesson-session'
import { lmsContext } from '@/lib/lms/data'

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params
  if (![courseId, lessonId].every(id => /^[\da-f-]{36}$/.test(id))) notFound()
  const { client, user, profile } = await lmsContext()
  if (!user) redirect('/login')
  if (!client) return <LmsShell><LmsError>Brak konfiguracji Supabase.</LmsError></LmsShell>
  if (profile?.role === 'student' && !profile.assessment_completed) redirect('/assessment')
  const { data: course } = await client.from('courses').select('teacher_id,title').eq('id', courseId).maybeSingle()
  const preview = course?.teacher_id === user.id
  const { data, error } = await client.rpc('get_lesson', { lesson: lessonId, preview })
  if (error) return <LmsShell><LmsError>Lekcja jest zablokowana lub niedostępna. Sprawdź zatwierdzenie zapisu i zaliczenie poprzednich lekcji.</LmsError><Link href={`/courses/${courseId}`}>Wróć do przedmiotu</Link></LmsShell>
  if (!data || data.course_id !== courseId) notFound()
  const { data: lessons } = await client.from('lessons').select('id,title,position').eq('course_id', courseId).eq('published', true).order('position')
  const { data: completions } = preview
    ? await client.from('attempts').select('lesson_id').eq('student_id', user.id).eq('preview', true).eq('passed', true)
    : await client.from('lesson_progress').select('lesson_id').eq('student_id', user.id).eq('passed', true)
  const passed = new Set(completions?.map(item => item.lesson_id))
  let unlocked = true
  return <LmsShell><div className="lms-breadcrumb"><Link href="/">Przedmioty</Link><span>/</span><Link href={`/courses/${courseId}${preview ? '?preview=1' : ''}`}>{course?.title}</Link><span>/</span><span>{data.title}</span></div>{preview && <aside className="lms-notice">Tryb studenta · próby nie zmieniają postępów studentów.</aside>}<div className="lms-dashboard-layout lms-study-layout"><section><Link className="lms-back-link" href={`/courses/${courseId}${preview ? '?preview=1' : ''}`}>← Lista lekcji</Link><LessonSession lesson={data} revision={{ id: data.revision_id, content: data.content, questions: data.questions, threshold: data.threshold }} preferredStyle={profile?.preferred_style ?? null} preview={preview} /></section><aside className="lms-right-rail"><section className="lms-card"><h2>Indeks przedmiotu</h2><nav aria-label="Lekcje przedmiotu" className="lms-course-index">{lessons?.map(lesson => {
    const available = unlocked
    if (!passed.has(lesson.id)) unlocked = false
    return available ? <Link key={lesson.id} aria-current={lesson.id === lessonId ? 'page' : undefined} href={`/courses/${courseId}/lessons/${lesson.id}${preview ? '?preview=1' : ''}`}><span>{lesson.position}</span>{lesson.title}</Link> : <span className="lms-index-locked" key={lesson.id}><span>{lesson.position}</span>{lesson.title}<small>Zablokowana</small></span>
  })}</nav></section><section className="lms-card"><h2>Sprawdzenie wiedzy</h2><p>Przejdź przez materiał, a następnie rozwiąż test.</p><strong className="lms-threshold">Próg zaliczenia: {data.threshold}%</strong></section></aside></div></LmsShell>
}
