import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LmsShell, LmsError } from '@/components/lms/shell'
import { lmsContext } from '@/lib/lms/data'

export default async function AttemptResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  if (!/^[\da-f-]{36}$/.test(attemptId)) notFound()
  const { client, user } = await lmsContext()
  if (!user) redirect('/login')
  const { data: attempt, error } = await client!.from('attempts').select('id,lesson_id,score,total,percentage,passed,preview,submitted_at').eq('id', attemptId).maybeSingle()
  if (error) return <LmsShell><LmsError>Nie można odczytać wyniku.</LmsError></LmsShell>
  if (!attempt?.submitted_at) notFound()
  const { data: lesson } = await client!.from('lessons').select('title,course_id').eq('id', attempt.lesson_id).maybeSingle()
  return <LmsShell><span className="lms-eyebrow">{attempt.preview ? 'Wynik podglądu' : 'Twój wynik'}</span><h1>{attempt.passed ? 'Test zaliczony!' : 'Jeszcze jedna próba?'}</h1><section className="lms-card"><h2>{lesson?.title ?? 'Test lekcji'}</h2><p>{attempt.score} / {attempt.total} punktów · {Number(attempt.percentage).toFixed(1)}%</p>{attempt.preview ? <p>Wynik podglądu nie zmienia postępów studentów.</p> : <p>{attempt.passed ? 'Możesz przejść do kolejnej lekcji.' : 'Powtórz test lub przeczytaj lekcję w innej dostępnej wersji.'}</p>}{lesson && <div className="lms-row"><Link href={`/courses/${lesson.course_id}/lessons/${attempt.lesson_id}`}>Wróć do lekcji</Link><Link href={`/courses/${lesson.course_id}${attempt.preview ? '?preview=1' : ''}`}>Lista lekcji →</Link></div>}</section></LmsShell>
}
