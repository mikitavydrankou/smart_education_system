import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { LmsShell } from '@/components/lms/shell'
import { LessonBuilder } from '@/components/lms/lesson-session'
import { lmsContext } from '@/lib/lms/data'

export default async function NewLessonPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  if (!/^[\da-f-]{36}$/.test(courseId)) notFound()
  const { client, user, profile } = await lmsContext()
  if (!user) redirect('/login')
  if (profile?.role !== 'teacher') redirect('/')
  const { data: course } = await client!.from('courses').select('id,teacher_id').eq('id', courseId).maybeSingle()
  if (!course || course.teacher_id !== user.id) notFound()
  const { data } = await client!.from('lessons').select('position').eq('course_id', courseId).order('position', { ascending: false }).limit(1)
  return <LmsShell><Link href={`/courses/${courseId}`}>← Przedmiot</Link><h1>Dodaj lekcję</h1><p>Zapisz szkic, aby włączyć przesyłanie plików.</p><LessonBuilder courseId={courseId} initial={{ title: '', position: (data?.[0]?.position ?? 0) + 1, threshold: 70, content: [], questions: [] }} /></LmsShell>
}
