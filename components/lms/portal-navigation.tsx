'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BookOpen, GraduationCap, LayoutDashboard, Menu, SlidersHorizontal, Users, X } from 'lucide-react'

export function PortalNavigation({ role, authenticated }: { role?: string; authenticated: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const links = [
    { href: '/', label: 'Przedmioty', icon: BookOpen },
    ...(role === 'teacher' ? [{ href: '/teacher', label: 'Panel nauczyciela', icon: LayoutDashboard }] : []),
    ...(authenticated ? [{ href: '/people', label: role === 'teacher' ? 'Studenci' : 'Nauczyciele', icon: Users }] : []),
    ...(authenticated && role !== 'teacher' ? [{ href: '/assessment', label: 'Mój sposób nauki', icon: SlidersHorizontal }] : []),
  ]
  return <>
    <button className="lms-menu-toggle" type="button" aria-label="Menu nawigacji" aria-controls="portal-navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}<span>Menu</span></button>
    <aside className={`lms-sidebar${open ? ' is-open' : ''}`} id="portal-navigation">
      <div className="lms-sidebar-label">Twoja platforma</div>
      <nav aria-label="Nawigacja platformy">{links.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' || pathname.startsWith('/courses') : pathname.startsWith(href)
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>
      })}</nav>
      <div className="lms-sidebar-note"><GraduationCap size={25} aria-hidden="true" /><strong>Nauka po Twojemu</strong><p>Jeden cel, różne drogi. Wybieraj format, który pomaga Ci zrozumieć materiał.</p></div>
      <div className="lms-sidebar-bottom"><span>ADAPT</span><small>Środowisko nauczania zdalnego</small></div>
    </aside>
  </>
}
