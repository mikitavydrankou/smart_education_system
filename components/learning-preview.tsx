'use client'

import { useState } from 'react'
import { ArrowUpRight, BookOpen, Headphones, Network, Check } from 'lucide-react'
import { NetworkDiagram, SpeechControl } from './lesson-media'
import { concepts } from '@/lib/lesson-data'

const formats = [
  { id: 'text', label: 'Tekst', icon: BookOpen },
  { id: 'diagram', label: 'Schemat', icon: Network },
  { id: 'audio', label: 'Audio', icon: Headphones },
] as const

export function LearningPreview() {
  const [format, setFormat] = useState<(typeof formats)[number]['id']>('text')
  return <section className="learning-preview" aria-label="Podgląd sposobów nauki">
    <div className="preview-toolbar"><span className="preview-window-dots" aria-hidden="true"><i /><i /><i /></span><span>Twoja przestrzeń do nauki</span><span className="preview-toolbar-note">ADAPT</span></div>
    <div className="preview-body">
      <aside className="preview-sidebar" aria-label="Zakres przykładowej lekcji">
        <span className="eyebrow">MATERIAŁ</span><div className="source-icon"><BookOpen aria-hidden="true" /></div>
        <h2>Jak działa{' '}<br />internet?</h2><p>3 pojęcia · 10–15 min</p>
        <ol><li className="current"><span>01</span> DNS</li><li><span>02</span> Adresy IP</li><li><span>03</span> Serwer</li></ol>
        <div className="preview-source-note"><Check size={15} aria-hidden="true" /> Przykładowa lekcja</div>
      </aside>
      <div className="preview-content">
        <div className="preview-content-top"><span className="eyebrow">JEDEN TEMAT. RÓŻNE PERSPEKTYWY.</span><ArrowUpRight size={18} aria-hidden="true" /></div>
        <div className="format-control" role="group" aria-label="Sposób przedstawienia materiału">{formats.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={format === id} onClick={() => setFormat(id)}><Icon size={16} aria-hidden="true" />{label}</button>)}</div>
        <div className="preview-panel" aria-live="polite">
          {format === 'text' && <><span className="preview-topic-number">01 / DNS</span><h3>Od nazwy<br />do adresu.</h3><p>{concepts[0].simple}</p><div className="definition-row"><span>Nazwa domeny</span><span aria-hidden="true">→</span><span>Adres IP</span></div><p className="preview-footnote">Najpierw zrozum ideę. Potem przejdź do szczegółów.</p></>}
          {format === 'diagram' && <><span className="preview-topic-number">01 / POŁĄCZ FAKTY</span><h3>Zobacz, jak<br />to się łączy.</h3><NetworkDiagram /></>}
          {format === 'audio' && <><span className="preview-topic-number">01 / POSŁUCHAJ</span><h3>Ta sama wiedza.<br />W Twoim tempie.</h3><div className="audio-wave" aria-hidden="true">{Array.from({ length: 31 }, (_, i) => <span key={i} style={{ height: `${12 + ((i * 17 + 9) % 42)}px` }} />)}</div><SpeechControl text={concepts[0].simple} /><details className="audio-transcript"><summary>Tekst wyjaśnienia</summary><p>{concepts[0].simple}</p></details></>}
        </div>
      </div>
    </div>
  </section>
}
