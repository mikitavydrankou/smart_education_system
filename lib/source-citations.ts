import type {Source} from './material.ts'
export function sourceCitations(source: Source) {
  return source.blocks.flatMap(block => {
    const result: {id:string;blockId:string;quote:string}[]=[]
    let start=0
    while(start<block.text.length){
      let end=Math.min(start+450,block.text.length)
      if(end<block.text.length && block.text.length-end<12)end=block.text.length-12
      const quote=block.text.slice(start,end)
      if(quote.trim().length>=12)result.push({id:`${block.id}-c${result.length+1}`,blockId:block.id,quote})
      start=end
    }
    return result
  })
}
/** Resolve source IDs to exact quotations and calculate local diagram indexes server-side. */
export function resolveCitations(value: unknown, source: Source, issues: string[] = []): unknown {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  if (!record(value) || !Array.isArray(value.concepts)) return null
  const citations = sourceCitations(source)
  let invalid = false
  const concepts = value.concepts.map((c, i) => {
    if (!record(c) || !Array.isArray(c.evidence)) { invalid = true; return c }
    const evidence: unknown[] = c.evidence.map((e, j) => {
      if (!record(e)) { invalid = true; return e }
      if ('citationId' in e) {
        const found = citations.find(x => x.id === e.citationId)
        if (!found) { invalid = true; issues.push(`concepts[${i}].evidence[${j}].citationId: choose an existing source citation ID`); return e }
        return { blockId: found.blockId, quote: found.quote }
      }
      return e
    })
    const link = (entry: unknown, path: string) => {
      if (!record(entry) || !('citationId' in entry)) return entry
      const found = citations.find(x => x.id === entry.citationId)
      if (!found) { invalid = true; issues.push(`${path}.citationId: choose an existing source citation ID`); return entry }
      let index = evidence.findIndex(e => record(e) && e.blockId === found.blockId && e.quote === found.quote)
      if (index < 0) { index = evidence.length; evidence.push({ blockId: found.blockId, quote: found.quote }) }
      const { citationId, ...rest } = entry
      void citationId
      return { ...rest, evidenceIndex: index }
    }
    let media = c.media
    if (record(media) && record(media.diagram)) {
      const d = media.diagram
      media = { ...media, diagram: { ...d,
        nodes: Array.isArray(d.nodes) ? d.nodes.map((n, j) => link(n, `concepts[${i}].media.diagram.nodes[${j}]`)) : d.nodes,
        edges: Array.isArray(d.edges) ? d.edges.map((e, j) => link(e, `concepts[${i}].media.diagram.edges[${j}]`)) : d.edges,
      } }
    }
    if (evidence.length > 3) { invalid = true; issues.push(`concepts[${i}].evidence: at most three distinct citations across concept and diagram; reuse selected IDs`) }
    return { ...c, evidence, ...(media !== undefined ? { media } : {}) }
  })
  return invalid ? null : { ...value, concepts }
}
