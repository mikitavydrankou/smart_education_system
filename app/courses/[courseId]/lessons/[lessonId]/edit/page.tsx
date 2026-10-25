import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { LmsShell, LmsError } from '@/components/lms/shell'
import { LessonBuilder } from '@/components/lms/lesson-session'
import { lmsContext } from '@/lib/lms/data'

export default async function EditLessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params
  if (![courseId, lessonId].every(id => /^[\da-f-]{36}$/.test(id))) notFound()
  const { client, user, profile } = await lmsContext()
  if (!user) redirect('/login')
  if (profile?.role !== 'teacher') redirect('/')
  const { data: course } = await client!.from('courses').select('teacher_id').eq('id', courseId).maybeSingle()
  if (course?.teacher_id !== user.id) notFound()
  const { data, error } = await client!.rpc('get_lesson', { lesson: lessonId, preview: false })
  if (error) return <LmsShell><LmsError>Nie można odczytać szkicu.</LmsError></LmsShell>
  if (!data || data.course_id !== courseId) notFound()
  return <LmsShell><Link href={`/courses/${courseId}`}>← Przedmiot</Link><h1>Edytuj lekcję</h1><p>Zmiany tworzą nową wersję. Rozpoczęte lekcje zachowują wcześniejszą treść i wyniki.</p><LessonBuilder courseId={courseId} initial={data} /></LmsShell>
}
