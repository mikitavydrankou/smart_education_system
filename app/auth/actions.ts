'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/supabase/config'
import { registrationOutcome, parseRegistrationRole } from '@/lib/supabase/registration'

export type AuthState = { error?: string; message?: string }

export async function authenticate(mode: string, _state: AuthState, form: FormData): Promise<AuthState> {
  const client = await createClient()
  if (!client) return { error: 'Brak konfiguracji Supabase. Skontaktuj się z administratorem.' }
  const email = String(form.get('email') || '').trim()
  const password = String(form.get('password') || '')
  if (mode !== 'update' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Podaj poprawny adres email.' }
  if (mode !== 'reset' && password.length < 8) return { error: 'Hasło musi zawierać co najmniej 8 znaków.' }
  if (mode === 'register') {
    const displayName = String(form.get('display_name') || '').trim().slice(0, 100)
    if (!displayName) return { error: 'Podaj imię i nazwisko.' }
    const role = parseRegistrationRole(form.get('role'))
    if (!role) return { error: 'Wybierz rolę: student lub nauczyciel.' }
    const next = role === 'teacher' ? '/teacher' : '/assessment'
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { display_name: displayName, role }, emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${next}` } })
    const outcome = registrationOutcome({ session: !!data.session, role, errorCode: error ? error.code ?? 'unexpected_failure' : undefined })
    if (error) console.error('auth_registration', { code: error.code ?? 'unexpected_failure', status: error.status })
    if (outcome.redirect) redirect(outcome.redirect)
    return outcome
  }
  if (mode === 'reset') {
    await client.auth.resetPasswordForEmail(email, { redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password?update=1` })
    return { message: 'Jeżeli konto istnieje, otrzymasz wiadomość z linkiem do zmiany hasła.' }
  }
  if (mode === 'update') {
    const { data } = await client.auth.getUser()
    if (!data.user) return { error: 'Otwórz aktualny link odzyskiwania hasła z wiadomości email.' }
    const { error } = await client.auth.updateUser({ password })
    return error ? { error: 'Nie udało się zmienić hasła. Otwórz nowy link odzyskiwania.' } : { message: 'Hasło zostało zmienione.' }
  }
  const { error, data } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) return { error: 'Nieprawidłowy email lub hasło albo niepotwierdzone konto.' }
  const { data: profile, error: profileError } = await client.from('profiles').select('role, assessment_completed').eq('id', data.user.id).single()
  if (profileError) return { error: 'Nie udało się odczytać profilu. Skontaktuj się z administratorem.' }
  redirect(profile.role === 'student' && !profile.assessment_completed ? '/assessment' : '/')
}

export async function logout() {
  const client = await createClient()
  if (client) await client.auth.signOut()
  redirect('/')
}
