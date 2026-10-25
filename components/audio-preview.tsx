import { Headphones, Play } from 'lucide-react'

export function AudioPreview() {
  return <section className="audio-preview" aria-label="Podgląd nagrania audio"><div className="audio-preview-heading"><Headphones size={19} aria-hidden="true" /><strong>Posłuchaj wyjaśnienia</strong><span>DEMO</span></div><div className="audio-preview-player"><button type="button" disabled aria-label="Posłuchaj wyjaśnienia"><Play size={18} aria-hidden="true" /></button><div className="audio-preview-wave" aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <span key={index} style={{ height: `${8 + index * 17 % 26}px` }} />)}</div><small>0:00</small></div><p>Odtwarzacz demonstracyjny — bez odtwarzania dźwięku. Skorzystaj z tekstu wyjaśnienia.</p></section>
}
