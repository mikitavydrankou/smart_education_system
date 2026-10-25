import { redirect } from 'next/navigation'
import { lmsContext } from '@/lib/lms/data'
import { LmsShell, LmsError } from '@/components/lms/shell'

export default async function PeoplePage() {
  const { client, user, profile } = await lmsContext()
  if (!user) redirect('/login')
  if (!profile) return <LmsShell><LmsError>Nie można odczytać profilu.</LmsError></LmsShell>
  const teachers = profile.role === 'student'
  const { data: people, error } = await client!.rpc('list_people')
  return <LmsShell><span className="lms-eyebrow">Społeczność ADAPT</span><h1>{teachers ? 'Nauczyciele' : 'Studenci'}</h1><p className="lms-lead">{teachers ? 'Poznaj wszystkich prowadzących na platformie.' : 'Wszyscy studenci zarejestrowani na platformie.'}</p>{error ? <LmsError>Nie udało się wczytać listy użytkowników.</LmsError> : <div className="lms-grid">{people?.map((person: { id: string; display_name: string; role: string }) => <article className="lms-card" key={person.id}><span className="lms-eyebrow">{person.role === 'teacher' ? 'Nauczyciel' : 'Student'}</span><h2>{person.display_name || 'Użytkownik bez nazwy'}</h2></article>)}{!people?.length && <p>{teachers ? 'Nie ma jeszcze nauczycieli.' : 'Nie ma jeszcze studentów.'}</p>}</div>}</LmsShell>
}
