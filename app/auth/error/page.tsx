import Link from 'next/link'
export default function AuthErrorPage() {
  return <main className="lms-shell"><h1>Nie udało się potwierdzić konta</h1><p>Link jest nieprawidłowy lub wygasł. Zaloguj się lub poproś o nowy link odzyskiwania hasła.</p><Link href="/login">Przejdź do logowania</Link> · <Link href="/reset-password">Odzyskaj dostęp</Link></main>
}
