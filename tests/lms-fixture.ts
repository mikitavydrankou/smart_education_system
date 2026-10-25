import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { Client } from 'pg'

export async function createLmsFixture({ usePublishedAssessment = false }: { usePublishedAssessment?: boolean } = {}) {
  if (process.env.LMS_E2E !== '1') throw new Error('Local LMS tests require LMS_E2E=1.')
  let status: Record<string, string>
  try {
    status = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
  } catch {
    throw new Error('Local Supabase status is unavailable. Start the local stack and allow Docker access.')
  }
  const apiUrl = new URL(status.API_URL)
  const databaseUrl = new URL(status.DB_URL)
  if (!['localhost', '127.0.0.1'].includes(apiUrl.hostname) || apiUrl.port !== '54321' || !['localhost', '127.0.0.1'].includes(databaseUrl.hostname) || databaseUrl.port !== '54322') throw new Error('LMS fixtures only run against default local Supabase.')
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin !== apiUrl.origin) throw new Error('Application Supabase URL does not match local fixture.')
  const admin = createClient(apiUrl.href, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const database = new Client({ connectionString: databaseUrl.href })
  await database.connect()
  const suffix = randomUUID()
  const password = `Test-only-${randomUUID()}!`
  const teacherEmail = `teacher-${suffix}@example.test`
  const studentEmail = `student-${suffix}@example.test`
  const signupTeacherEmail = `signup-teacher-${suffix}@example.test`
  const signupStudentEmail = `signup-student-${suffix}@example.test`
  const teacher = await admin.auth.admin.createUser({ email: teacherEmail, password, email_confirm: true })
  if (teacher.error || !teacher.data.user) throw new Error('Could not create local teacher fixture.')
  const student = await admin.auth.admin.createUser({ email: studentEmail, password, email_confirm: true })
  if (student.error || !student.data.user) throw new Error('Could not create local student fixture.')
  const teacherId = teacher.data.user.id
  const studentId = student.data.user.id
  const courseId = randomUUID()
  const firstLessonId = randomUUID()
  const secondLessonId = randomUUID()
  const originalConfig = (await database.query('select * from lms.assessment_config where id')).rows[0]
  const questions = [{ id: 'fixture-preference', prompt: 'TEST ONLY: wybierz format', options: [{ text: 'TEST ONLY: obrazy', style: 'visual' }, { text: 'TEST ONLY: praktyka', style: 'kinesthetic' }] }]
  if (!usePublishedAssessment) await database.query('update lms.assessment_config set approved=true,version=$1,source_url=$2,questions=$3 where id', ['TEST ONLY E2E', 'https://example.test/fixture-not-educationplanner', JSON.stringify(questions)])
  await database.query("update lms.profiles set role='teacher',display_name='Nauczyciel testowy' where id=$1", [teacherId])
  await database.query("update lms.profiles set display_name='Student testowy' where id=$1", [studentId])
  await database.query('insert into lms.courses(id,title,description,teacher_id,published) values($1,$2,$3,$4,true)', [courseId, `TEST ONLY ${suffix}`, 'Przedmiot testowy', teacherId])
  for (const [index, lessonId] of [firstLessonId, secondLessonId].entries()) {
    const revisionId = randomUUID()
    const content = [
      { id: 'visual', styles: ['visual'], blocks: [{ id: 'visual-text', type: 'text', text: 'Materiał wizualny testowy' }] },
      { id: 'practice', styles: ['kinesthetic'], blocks: [{ id: 'practice-text', type: 'practice', text: 'Materiał praktyczny testowy' }] },
    ]
    const testQuestions = [{ id: 'addition', type: 'single', prompt: 'Ile wynosi 2 + 2?', options: ['Cztery', 'Pięć'], answer: 0 }]
    await database.query('insert into lms.lessons(id,course_id,title,position,published) values($1,$2,$3,$4,true)', [lessonId, courseId, `Lekcja testowa ${index + 1}`, index + 1])
    await database.query('insert into lms.revisions(id,lesson_id,title,position,content,questions,threshold) values($1,$2,$3,$4,$5,$6,70)', [revisionId, lessonId, `Lekcja testowa ${index + 1}`, index + 1, JSON.stringify(content), JSON.stringify(testQuestions)])
    await database.query('update lms.lessons set current_revision_id=$1 where id=$2', [revisionId, lessonId])
  }
  return {
    teacherEmail, studentEmail, signupTeacherEmail, signupStudentEmail, password, courseId, firstLessonId, secondLessonId,
    async cleanup() {
      const registrations = await database.query('select id from auth.users where email=any($1::text[])', [[signupTeacherEmail, signupStudentEmail]])
      for (const registration of registrations.rows) await admin.auth.admin.deleteUser(registration.id)
      await database.query('delete from lms.attempts where student_id in ($1,$2)', [teacherId, studentId])
      await database.query('update lms.lessons set current_revision_id=null,draft_revision_id=null where course_id in (select id from lms.courses where teacher_id=$1)', [teacherId])
      await database.query('delete from lms.courses where teacher_id=$1', [teacherId])
      await database.query('update lms.assessment_config set approved=$1,version=$2,source_url=$3,questions=$4 where id', [originalConfig.approved, originalConfig.version, originalConfig.source_url, JSON.stringify(originalConfig.questions)])
      await admin.auth.admin.deleteUser(studentId)
      await admin.auth.admin.deleteUser(teacherId)
      await database.end()
    },
  }
}
