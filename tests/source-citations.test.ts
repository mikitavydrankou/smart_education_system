import {test} from 'node:test'
import assert from 'node:assert/strict'
import {sourceCitations,resolveCitations} from '../lib/source-citations.ts'
import {normalizeSource,validateCourse} from '../lib/material.ts'
import {sourceText,richCourseFixture} from './material-fixture.ts'
test('AI selects existing citation IDs and server supplies exact source text',()=>{
 const source=normalizeSource(sourceText)!,citations=sourceCitations(source)
 const value={...richCourseFixture,concepts:richCourseFixture.concepts.map(c=>({...c,evidence:[{citationId:citations.find(x=>x.blockId===c.evidence[0].blockId)!.id}]}))}
 const resolved=resolveCitations(value,source)
 assert.ok(validateCourse(resolved,source,true))
 for(const c of (resolved as typeof richCourseFixture).concepts) for(const e of c.evidence)assert.ok(source.blocks.find(b=>b.id===e.blockId)!.text.includes(e.quote))
 value.concepts[0].evidence[0].citationId='invented'
 assert.equal(resolveCitations(value,source),null)
})
test('citations keep PDF whitespace, line wraps and hyphens verbatim',()=>{
 const source=normalizeSource(('A resource manage-\nment example. '+ 'Long scientific evidence. '.repeat(60)))!
 const citations=sourceCitations(source)
 assert.ok(citations.length>1)
 assert.ok(citations.every(c=>c.quote.length>=12&&c.quote.length<=500&&source.blocks.find(b=>b.id===c.blockId)!.text.includes(c.quote)))
})

test('diagram citations resolve by source ID instead of confusing concept and evidence indexes',()=>{
 const source=normalizeSource(sourceText)!,citations=sourceCitations(source)
 const course=structuredClone(richCourseFixture)
 const raw={...course,concepts:course.concepts.map(c=>{
  const citationId=citations.find(x=>x.blockId===c.evidence[0].blockId)!.id
  const ref=(value:Record<string,unknown>)=>{const {evidenceIndex,...rest}=value;void evidenceIndex;return {...rest,citationId}}
  return {...c,evidence:[{citationId}],media:{...c.media,diagram:{...c.media.diagram,nodes:c.media.diagram.nodes.map(n=>ref(n)),edges:c.media.diagram.edges.map(e=>ref(e))}}}
 })}
 const resolved=resolveCitations(raw,source)
 assert.ok(validateCourse(resolved,source,true))
 for(const c of (resolved as typeof richCourseFixture).concepts)assert.ok(c.media.diagram.nodes.every(n=>n.evidenceIndex===0))
 raw.concepts[2].media.diagram.nodes[0].citationId='not-a-citation'
 assert.equal(resolveCitations(raw,source),null)
})

test('extra diagram citations reuse the concept evidence cap instead of rejecting the lesson',()=>{
 const source=normalizeSource(`${sourceText}\n\n${'Dodatkowy opis procesu metabolicznego w komórkach roślinnych. '.repeat(40)}`)!
 const citations=sourceCitations(source)
 assert.ok(citations.length>=4)
 const course=structuredClone(richCourseFixture)
 const c0=course.concepts[0]
 const base=citations.slice(0,3)
 const extra=citations[3]!
 const raw={
  ...course,
  concepts:[{
   ...c0,
   evidence:base.map(x=>({citationId:x.id})),
   media:{...c0.media,diagram:{
    ...c0.media.diagram,
    nodes:c0.media.diagram.nodes.map(n=>{const {evidenceIndex,...rest}=n;void evidenceIndex;return {...rest,citationId:extra.id}}),
    edges:c0.media.diagram.edges.map(e=>{const {evidenceIndex,...rest}=e;void evidenceIndex;return {...rest,citationId:extra.id}}),
   }},
  },...course.concepts.slice(1)],
 }
 const resolved=resolveCitations(raw,source) as typeof course
 assert.ok(resolved)
 assert.equal(resolved.concepts[0].evidence.length,3)
 assert.ok(resolved.concepts[0].media.diagram.nodes.every(n=>n.evidenceIndex>=0&&n.evidenceIndex<3))
})
