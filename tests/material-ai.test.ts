import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateMaterial } from '../lib/material-ai.ts'
import { normalizeSource, defaultProfile } from '../lib/material.ts'
import { sourceText, richCourseFixture as courseFixture } from './material-fixture.ts'

test('generation requires a provider and rejects invented source evidence or incomplete output', async () => {
  const original = fetch, old = process.env.OPENROUTER_API_KEY, openai = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY; delete process.env.OPENROUTER_API_KEY
  const source = normalizeSource(sourceText)!
  try {
    await assert.rejects(generateMaterial(source, defaultProfile), /Skonfiguruj/)
    process.env.OPENROUTER_API_KEY = 'test-placeholder'
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options!.body as string)
      assert.equal(body.store, false)
      assert.equal(body.text.format.type, 'json_schema')
      assert.deepEqual(JSON.parse(body.input).source.blocks, source.blocks)
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(courseFixture) }] }] })
    }
    assert.equal((await generateMaterial(source, defaultProfile)).concepts.length, 3)
    const invented = structuredClone(courseFixture); invented.concepts[0].evidence[0].quote = 'Nie ma tego w źródle.'
    globalThis.fetch = async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(invented) }] }] })
    await assert.rejects(generateMaterial(source, defaultProfile), /LESSON_STRUCTURE/)
    globalThis.fetch = async () => Response.json({ status: 'incomplete', output: [] })
    await assert.rejects(generateMaterial(source, defaultProfile), /zakończyć/)
    globalThis.fetch = async () => new Response(null, { status: 503 })
    await assert.rejects(generateMaterial(source, defaultProfile), /niedostępna/)
  } finally {
    globalThis.fetch = original
    if (old === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = old
    if (openai === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = openai
  }
})

test('invalid media receives one bounded repair attempt before rejecting the lesson', async()=>{
 const original=fetch,old=process.env.OPENROUTER_API_KEY
 process.env.OPENROUTER_API_KEY='test-placeholder'
 let calls=0
 try{
  globalThis.fetch=async()=>{
   calls++
   const course=structuredClone(courseFixture)
   if(calls===1)course.concepts[0].media.activity.solution=['invalid']
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(course)}]}]})
  }
  assert.equal((await generateMaterial(normalizeSource(sourceText)!,defaultProfile)).concepts.length,3)
  assert.equal(calls,2)
 }finally{globalThis.fetch=original;if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old}
})

test('provider credit exhaustion has an actionable Polish error without leaking provider details',async()=>{
 const original=fetch,old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='test-placeholder'
 try{
  globalThis.fetch=async()=>Response.json({error:{message:'private billing details'}},{status:402})
  await assert.rejects(generateMaterial(normalizeSource(sourceText)!,defaultProfile),/Limit środków/)
 }finally{globalThis.fetch=original;if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old}
})

test('repair receives the rejected course and exact failed constraints',async()=>{
 const original=fetch,old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='test-placeholder';let calls=0
 try{
  globalThis.fetch=async(_url,options)=>{
   const body=JSON.parse(options!.body as string),input=JSON.parse(body.input)
   const course=structuredClone(courseFixture)
   if(calls++===0)(course.concepts[0].media.activity.targets as {id:string;label:string}[]).push({id:'extra',label:'Unused extra target'})
   else {
    assert.equal(input.repair.previousCourse.concepts[0].media.activity.targets.at(-1).id,'extra')
    assert.ok(input.repair.issues.some((s:string)=>s.includes('concepts[0].media.activity.targets')))
   }
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(course)}]}]})
  }
  await generateMaterial(normalizeSource(sourceText)!,defaultProfile)
  assert.equal(calls,2)
 }finally{globalThis.fetch=original;if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old}
})

test('strict schema permits an explicit insufficient-material result without inventing a course',async()=>{
 const original=fetch,old=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY='test-placeholder'
 try{
  globalThis.fetch=async(_url,options)=>{
   const body=JSON.parse(options!.body as string)
   assert.equal(body.text.format.schema.properties.concepts.minItems,0)
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({...courseFixture,concepts:[]})}]}]})
  }
  await assert.rejects(generateMaterial(normalizeSource(sourceText)!,defaultProfile),/za mało informacji/)
 }finally{globalThis.fetch=original;if(old===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=old}
})
