import Link from 'next/link'
import { lmsContext } from '@/lib/lms/data'
import { logout } from '@/app/auth/actions'
import { GraduationCap, LogOut } from 'lucide-react'
import { PortalNavigation } from './portal-navigation'

export async function LmsShell({ children }: { children: React.ReactNode }) {
  const { user, profile } = await lmsContext()
  const name = profile?.display_name || (user ? 'Użytkownik' : 'Gość')
  return <div className="app-shell lms"><a className="lms-skip-link" href="#main-content">Przejdź do treści</a><header className="app-header"><div className="header-inner"><Link href="/" className="brand"><GraduationCap aria-hidden="true" /><span>ADAPT<small>Platforma edukacyjna</small></span></Link><div className="lms-header-caption">Twoje miejsce do nauki</div><div className="lms-account">{user ? <><span className="lms-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><div className="lms-account-name"><strong>{name}</strong><small>{profile?.role === 'teacher' ? 'Nauczyciel' : 'Student'}</small></div><form action={logout}><button className="lms-logout"><LogOut size={17} aria-hidden="true" /><span>Wyloguj</span></button></form></> : <><Link href="/login">Zaloguj się</Link><Link className="action-button action-primary" href="/register">Zarejestruj się</Link></>}</div></div></header><div className="lms-workspace"><PortalNavigation role={profile?.role} authenticated={Boolean(user)} /><div className="lms-content"><main className="lms-main" id="main-content">{children}</main><footer className="app-footer"><span>ADAPT · Ucz się po swojemu</span><Link href="/lesson">Przykładowa lekcja</Link></footer></div></div></div>
}

export function LmsError({ children }: { children: React.ReactNode }) {
  return <section className="lms-card" role="alert"><h1>Platforma chwilowo niedostępna</h1><p>{children}</p><p>Nie zapisano żadnych zmian. Spróbuj ponownie po sprawdzeniu połączenia.</p></section>
}
