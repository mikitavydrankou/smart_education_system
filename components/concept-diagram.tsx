'use client'
import { useId, useState } from 'react'
import type { LearningMedia } from '@/lib/learning-media'
import type { MaterialConcept } from '@/lib/material'

function lines(text: string) {
  const result: string[] = []; let row = ''
  for (const word of text.split(/\s+/)) { if ((row + word).length > 22 && row) { result.push(row); row = '' }; row += `${row ? ' ' : ''}${word}` }
  if (row) result.push(row)
  return result.slice(0, 4)
}
export function ConceptDiagram({ diagram, evidence }: { diagram: LearningMedia['diagram']; evidence: MaterialConcept['evidence'] }) {
  const marker = useId().replaceAll(':', ''), [selected, setSelected] = useState(0), [edge, setEdge] = useState<number | null>(null)
  const positions = diagram.nodes.map((_, i) => ({ x: 120 + (i % 3) * 235, y: 90 + Math.floor(i / 3) * 210 }))
  const active = diagram.nodes[selected] ?? diagram.nodes[0], relation = edge === null ? null : diagram.edges[edge]
  const height = diagram.nodes.length > 3 ? 410 : 220
  return <section className="concept-diagram" aria-label="Krok po kroku">
    <h2>{diagram.title}</h2><p className="muted-copy">Wybierz element lub połączenie. Strzałki pokazują relacje opisane w źródle.</p>
    <div className="diagram-viewport" tabIndex={0} aria-label="Schemat relacji — na małym ekranie przewiń w poziomie">
      <svg viewBox={`0 0 720 ${height}`} role="group" aria-label="Interaktywna mapa pojęć">
        <defs><marker id={marker} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="currentColor" /></marker></defs>
        {diagram.edges.map((e, i) => {
          const from = positions[diagram.nodes.findIndex(n => n.id === e.from)], to = positions[diagram.nodes.findIndex(n => n.id === e.to)]
          const dx = to.x - from.x, dy = to.y - from.y, scale = Math.min(100 / (Math.abs(dx) || 1), 48 / (Math.abs(dy) || 1))
          const start = { x: from.x + dx * scale, y: from.y + dy * scale }, end = { x: to.x - dx * scale, y: to.y - dy * scale }
          const curve = dy === 0 ? (i % 2 ? 50 : -50) : 30
          const mx = (start.x + end.x) / 2, my = (start.y + end.y) / 2 + curve
          const label = `${diagram.nodes.find(n => n.id === e.from)!.label} — ${e.label} — ${diagram.nodes.find(n => n.id === e.to)!.label}`
          return <g key={`${e.from}-${e.to}`} className={`diagram-edge ${edge === i ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`Relacja: ${label}`} onClick={() => setEdge(i)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEdge(i) } }}>
            <path className="edge-hit" d={`M${start.x},${start.y} Q${mx},${my} ${end.x},${end.y}`} />
            <path className="edge-line" markerEnd={`url(#${marker})`} d={`M${start.x},${start.y} Q${mx},${my} ${end.x},${end.y}`} />
            <text x={mx} y={my - 7} textAnchor="middle">{e.label.length > 28 ? `${e.label.slice(0, 27)}…` : e.label}</text>
          </g>
        })}
        {diagram.nodes.map((n, i) => <g key={n.id} role="button" tabIndex={0} aria-label={`Element: ${n.label}`} aria-pressed={edge === null && selected === i} className={`diagram-node ${edge === null && selected === i ? 'selected' : ''}`} transform={`translate(${positions[i].x - 95},${positions[i].y - 43})`} onClick={() => { setSelected(i); setEdge(null) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(i); setEdge(null) } }}>
          <rect width="190" height="86" rx="15" /><text textAnchor="middle" x="95" y={lines(n.label).length > 2 ? 23 : 34}>{lines(n.label).map((line, j) => <tspan key={j} x="95" dy={j ? 17 : 0}>{line}</tspan>)}</text>
        </g>)}
      </svg>
    </div>
    <div className="diagram-detail" aria-live="polite"><strong>{relation ? relation.label : active.label}</strong><p>{relation ? `${diagram.nodes.find(n => n.id === relation.from)!.label} → ${relation.label} → ${diagram.nodes.find(n => n.id === relation.to)!.label}` : active.detail}</p><blockquote>{evidence[relation ? relation.evidenceIndex : active.evidenceIndex]?.quote}</blockquote></div>
    <details className="diagram-text"><summary>Opis tekstowy wszystkich relacji</summary><ul>{diagram.edges.map((e, i) => <li key={i}>{diagram.nodes.find(n => n.id === e.from)!.label} → {e.label} → {diagram.nodes.find(n => n.id === e.to)!.label}</li>)}</ul></details>
  </section>
}
