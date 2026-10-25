const operations = new Set(['save_course', 'request_enrollment', 'review_enrollment', 'save_lesson', 'start_attempt', 'submit_attempt', 'save_assessment', 'set_preferred_style', 'create_study_session', 'record_study_block', 'create_demo_course'])

export function allowedOperation(value: unknown): value is string {
  return typeof value === 'string' && operations.has(value)
}

export function validStoragePath(value: string) {
  return /^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(value)
}

export function sameOrigin(request: Request) {
  try {
    const origin = new URL(request.headers.get('origin') ?? '')
    return ['http:', 'https:'].includes(origin.protocol) && origin.host === (request.headers.get('host') ?? new URL(request.url).host)
  } catch { return false }
}
