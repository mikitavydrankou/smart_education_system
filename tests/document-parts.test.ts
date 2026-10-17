import {test} from 'node:test'
import assert from 'node:assert/strict'
import {splitDocument,MAX_DOCUMENT_CHARS} from '../lib/document-parts.ts'
import {importMaterial} from '../lib/import-material.ts'

test('long documents import without losing text and split into bounded lesson parts',async()=>{
 const text=Array.from({length:90},(_,i)=>`Section ${i}. ${'Educational material about resource management. '.repeat(30)}`).join('\n\n').trim()
 assert.ok(text.length>20000)
 assert.equal(await importMaterial(new File([text],'paper.txt')),text)
 const parts=splitDocument(text)
 assert.ok(parts.length>1)
 assert.equal(parts.map(p=>p.text).join(''),text)
 assert.ok(parts.every(p=>p.text.length>=120 && p.text.length<=20000))
 assert.equal(splitDocument('x'.repeat(MAX_DOCUMENT_CHARS+1)).length,0)
})
test('part boundaries preserve all characters including tiny trailing fragments',()=>{
 for(const length of [120,19999,20000,20001,24001,250000]){
  const text='x'.repeat(length),parts=splitDocument(text)
  assert.equal(parts.map(p=>p.text).join(''),text)
  assert.ok(parts.every(p=>p.text.length>=120&&p.text.length<=20000))
 }
})
test('a short tail beginning with whitespace is merged into the preceding lesson',()=>{
 const text='x'.repeat(23881)+'\n'+'y'.repeat(119)
 const parts=splitDocument(text)
 assert.equal(parts.map(p=>p.text).join(''),text)
 assert.ok(parts.every(p=>p.text.trim().length>=120))
})
