type RegistrationOutcome = { redirect?: string; message?: string; error?: string }

export function parseRegistrationRole(value: unknown): 'student' | 'teacher' | null {
  if (value === null || value === undefined) return 'student'
  return value === 'student' || value === 'teacher' ? value : null
}

export function registrationOutcome({ session, errorCode, role = 'student' }: { session: boolean; errorCode?: string; role?: 'student' | 'teacher' }): RegistrationOutcome {
  if (errorCode) {
    const messages: Record<string, string> = {
      user_already_exists: 'Konto już istnieje. Zaloguj się lub odzyskaj hasło.',
      email_exists: 'Konto już istnieje. Zaloguj się lub odzyskaj hasło.',
      over_email_send_rate_limit: 'Osiągnięto limit wiadomości email. Odczekaj i spróbuj ponownie.',
      over_request_rate_limit: 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.',
      email_address_invalid: 'Podaj poprawny adres email.',
      weak_password: 'Hasło nie spełnia wymagań. Użyj dłuższego hasła z literami i cyframi.',
      signup_disabled: 'Rejestracja jest obecnie wyłączona. Skontaktuj się z prowadzącym.',
      email_address_not_authorized: 'Wysyłka na ten adres nie jest dostępna. Administrator musi skonfigurować pocztę SMTP.',
    }
    return { error: messages[errorCode] ?? 'Nie udało się zarejestrować. Spróbuj ponownie lub zaloguj się.' }
  }
  return session ? { redirect: role === 'teacher' ? '/teacher' : '/assessment' } : { message: 'Sprawdź skrzynkę email i potwierdź rejestrację, następnie zaloguj się.' }
}
