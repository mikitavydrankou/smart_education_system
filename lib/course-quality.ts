import {canonicalCourseSchema} from './course-schema.ts'
import {resolveCitations,sourceCitations} from './source-citations.ts'
import {validateCourse,type Source} from './material.ts'

type Schema={type?:string;properties?:Record<string,Schema>;required?:string[];items?:Schema;enum?:unknown[];minLength?:number;maxLength?:number;pattern?:string;minItems?:number;maxItems?:number;minimum?:number;maximum?:number}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
function shape(value:unknown,s:Schema,path:string,issues:string[]){
 if(s.enum&&!s.enum.includes(value))issues.push(`${path}: select an allowed value`)
 if(s.type==='object'){
  if(!record(value)){issues.push(`${path}: expected object`);return}
  for(const key of s.required||[])if(!(key in value))issues.push(`${path}.${key}: missing field`)
  for(const [key,child]of Object.entries(s.properties||{}))if(key in value)shape(value[key],child,`${path}.${key}`,issues)
 }else if(s.type==='array'){
  if(!Array.isArray(value)){issues.push(`${path}: expected array`);return}
  if(value.length<(s.minItems??0)||value.length>(s.maxItems??Infinity))issues.push(`${path}: expected ${s.minItems}..${s.maxItems} items`)
  value.forEach((v,i)=>shape(v,s.items||{},`${path}[${i}]`,issues))
 }else if(s.type==='string'){
  if(typeof value!=='string'){issues.push(`${path}: expected string`);return}
  if(value.trim().length<(s.minLength??0)||value.length>(s.maxLength??Infinity))issues.push(`${path}: expected ${s.minLength}..${s.maxLength} characters`)
  if(s.pattern&&!new RegExp(s.pattern).test(value))issues.push(`${path}: invalid identifier pattern`)
 }else if(s.type==='integer'&&(!Number.isInteger(value)||Number(value)<(s.minimum??-Infinity)||Number(value)>(s.maximum??Infinity)))issues.push(`${path}: expected integer ${s.minimum}..${s.maximum}`)
}
/** Content-free paths/constraints only: safe for server diagnostics and targeted repair. */
export function courseQualityIssues(raw:unknown,source:Source):string[]{
 const issues:string[]=[],resolved=resolveCitations(raw,source,issues)
 if(!resolved){
  if(record(raw)&&Array.isArray(raw.concepts))raw.concepts.forEach((c,i)=>{
   if(record(c)&&Array.isArray(c.evidence))c.evidence.forEach((e,j)=>{if(record(e)&&'citationId'in e&&!sourceCitations(source).some(x=>x.id===e.citationId))issues.push(`concepts[${i}].evidence[${j}].citationId: choose an existing source citation ID`)})
  })
  return issues.length?issues:['course: invalid course or evidence structure']
 }
 shape(resolved,canonicalCourseSchema as unknown as Schema,'course',issues)
 if(issues.some(x=>/expected object|expected array|missing field|expected string/.test(x)))return issues.slice(0,30)
 const v=resolved as {concepts:{id:string;evidence:{blockId:string;quote:string}[];question:{options:string[];prompt:string};retry:{options:string[];prompt:string};media:{diagram:{nodes:{id:string;label:string;evidenceIndex:number}[];edges:{from:string;to:string;evidenceIndex:number}[]};activity:{kind:string;items:{id:string;label:string}[];targets:{id:string;label:string}[];solution:string[]}}}[]}
 const unique=(values:string[])=>new Set(values).size===values.length
 if(!unique(v.concepts.map(c=>c.id)))issues.push('concepts: IDs must be unique')
 v.concepts.forEach((c,i)=>{
  const p=`concepts[${i}]`
  c.evidence.forEach((e,j)=>{if(!source.blocks.some(b=>b.id===e.blockId&&b.text.includes(e.quote)))issues.push(`${p}.evidence[${j}]: quote must be verbatim in its source block`)})
  for(const key of ['question','retry']as const)if(!unique(c[key].options))issues.push(`${p}.${key}.options: options must be distinct`)
  if(c.question.prompt===c.retry.prompt)issues.push(`${p}.retry.prompt: must differ from first question`)
  const d=c.media.diagram,a=c.media.activity,nodeIds=d.nodes.map(n=>n.id),targetIds=a.targets.map(t=>t.id),itemIds=a.items.map(t=>t.id)
  if(!unique(nodeIds)||!unique(d.nodes.map(n=>n.label)))issues.push(`${p}.media.diagram.nodes: unique IDs and labels required`)
  d.nodes.forEach((n,j)=>{if(n.evidenceIndex>=c.evidence.length)issues.push(`${p}.media.diagram.nodes[${j}].evidenceIndex: zero-based index must be below ${c.evidence.length}`)})
  const pairs=new Set<string>(),connected=new Set([nodeIds[0]])
  d.edges.forEach((e,j)=>{const pair=`${e.from}:${e.to}`;if(!nodeIds.includes(e.from)||!nodeIds.includes(e.to)||e.from===e.to||pairs.has(pair))issues.push(`${p}.media.diagram.edges[${j}]: existing distinct endpoints and unique directed pair required`);pairs.add(pair);if(e.evidenceIndex>=c.evidence.length)issues.push(`${p}.media.diagram.edges[${j}].evidenceIndex: zero-based index must be below ${c.evidence.length}`)})
  for(let k=0;k<nodeIds.length;k++)for(const e of d.edges)if(connected.has(e.from)||connected.has(e.to)){connected.add(e.from);connected.add(e.to)}
  if(nodeIds.some(id=>!connected.has(id)))issues.push(`${p}.media.diagram.edges: connect every node`)
  if(!unique(itemIds)||!unique(a.items.map(x=>x.label)))issues.push(`${p}.media.activity.items: unique IDs and labels required`)
  if(!unique(targetIds)||!unique(a.targets.map(x=>x.label)))issues.push(`${p}.media.activity.targets: unique IDs and labels required`)
  if(a.solution.length!==a.items.length)issues.push(`${p}.media.activity.solution: one answer per item required`)
  if(a.kind==='order'){
   if(a.targets.length)issues.push(`${p}.media.activity.targets: order requires an empty array`)
   if(!unique(a.solution)||a.solution.some(id=>!itemIds.includes(id)))issues.push(`${p}.media.activity.solution: permutation of all item IDs required`)
  }else{
   if(a.kind==='match'&&(a.targets.length!==a.items.length||!unique(a.solution)))issues.push(`${p}.media.activity.targets: match requires exactly one unique target per item; no distractors`)
   if(a.targets.length<2||a.solution.some(id=>!targetIds.includes(id))||targetIds.some(id=>!a.solution.includes(id)))issues.push(`${p}.media.activity.targets: every target must be used; solution must use target IDs`)
  }
 })
 if(!issues.length&&!validateCourse(resolved,source,true))issues.push('course: final domain validation failed')
 return issues.slice(0,30)
}
