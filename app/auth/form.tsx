'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { authenticate, type AuthState } from './actions'
import { GraduationCap } from 'lucide-react'

export function AuthForm({ mode }: { mode: 'login' | 'register' | 'reset' | 'update' }) {
  const [state, action, pending] = useActionState(authenticate.bind(null, mode), {} as AuthState)
  const labels = { login: 'Zaloguj się', register: 'Utwórz konto', reset: 'Wyślij link odzyskiwania', update: 'Zmień hasło' }
  return <main className="lms-shell lms-auth"><aside className="lms-auth-intro"><Link className="lms-auth-brand" href="/"><GraduationCap size={36} aria-hidden="true" />ADAPT</Link><div><span>ŚRODOWISKO NAUCZANIA ZDALNEGO</span><h2>Twoja nauka.<br />Więcej możliwości.</h2><p>Przedmioty, materiały i testy w jednym miejscu. Ucz się krok po kroku, w formacie dopasowanym do Ciebie.</p></div><small>Wiedza zaczyna się od ciekawości.</small></aside><section className="lms-card lms-auth-card">
    <Link href="/">← Przedmioty ADAPT</Link><h1>{labels[mode]}</h1>
    <form action={action} style={{ display: 'grid', gap: 16 }}>
      {mode === 'register' && <label>Imię i nazwisko<input name="display_name" autoComplete="name" required maxLength={100} /></label>}
      {mode === 'register' && <fieldset><legend>Kim jesteś?</legend><label className="lms-role-option"><input name="role" type="radio" value="student" defaultChecked />Student</label><label className="lms-role-option"><input name="role" type="radio" value="teacher" />Nauczyciel</label></fieldset>}
      {mode !== 'update' && <label>Email<input name="email" type="email" autoComplete="email" required /></label>}
      {mode !== 'reset' && <label>Hasło<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></label>}
      {state.error && <p role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}
      <button className="action-button action-primary" disabled={pending}>{pending ? 'Proszę czekać…' : labels[mode]}</button>
    </form>
    <p><Link href="/login">Logowanie</Link> · <Link href="/register">Rejestracja</Link> · <Link href="/reset-password">Nie pamiętam hasła</Link></p>
  </section></main>
}
