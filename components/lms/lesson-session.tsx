'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LessonPlayer } from './lesson-player'
import { LessonEditor } from './lesson-editor'
import { lmsOperation } from './actions'
import type { AttemptResult, LessonInput, LessonRevision, Style, StudySession } from '@/lib/lms/types'

export function LessonSession({ lesson, revision, preferredStyle, preview }: { lesson: { id: string; title: string }; revision: LessonRevision; preferredStyle: Style | null; preview: boolean }) {
  const attempt = useRef<string | null>(null)
  const [notice, setNotice] = useState('')
  const [resultId, setResultId] = useState<string | null>(null)
  const beginStudy = useCallback(async (variant: string) => {
    attempt.current = null
    setResultId(null)
    return lmsOperation<StudySession>('create_study_session', { lesson: lesson.id, variant, preview })
  }, [lesson.id, preview])
  const completeBlock = useCallback((study: string, block: string, answer?: unknown) => lmsOperation<StudySession>('record_study_block', { study, block, answer: answer ?? null }), [])
  return <><LessonPlayer lesson={lesson} revision={revision} preferredStyle={preferredStyle} onBeginStudy={beginStudy} onCompleteBlock={completeBlock} onStyleChange={style => {
    if (!preview) void lmsOperation('set_preferred_style', { style }).catch(() => setNotice('Wybrany format działa w tej lekcji, ale nie udało się zapisać preferencji.'))
  }} onSubmit={async (answers, study) => {
    attempt.current ??= await lmsOperation<string>('start_attempt', { lesson: lesson.id, preview, study })
    const result = await lmsOperation<AttemptResult>('submit_attempt', { attempt: attempt.current, answers })
    setResultId(result.id ?? null)
    attempt.current = null
    return result
  }} />{resultId && <Link href={`/results/${resultId}`}>Zapisany wynik testu →</Link>}{notice && <p role="status">{notice}</p>}</>
}

export function LessonBuilder({ courseId, initial }: { courseId: string; initial: LessonInput }) {
  const router = useRouter()
  return <LessonEditor key={initial.id ?? 'new'} initial={initial} onSave={async (payload, publish) => {
    const id = await lmsOperation<string>('save_lesson', { payload: { ...payload, course_id: courseId, published: publish } })
    if (!initial.id) router.replace(`/courses/${courseId}/lessons/${id}/edit`)
    router.refresh()
  }} onUpload={initial.id ? async file => {
    const form = new FormData()
    form.set('file', file); form.set('course', courseId); form.set('lesson', initial.id!)
    const response = await fetch('/api/lms/files', { method: 'POST', body: form })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error ?? 'Nie udało się przesłać pliku.')
    return body.data
  } : undefined} />
}
