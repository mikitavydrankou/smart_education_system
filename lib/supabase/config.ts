export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
}

export function getSiteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin
}

export function safeNext(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/'
  return value
}
