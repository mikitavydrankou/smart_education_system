import {restoreAdaptiveWorkspace,type AdaptiveWorkspace} from './adaptive.ts'
export type SavedLesson={id:string;title:string;name:string;updatedAt:number;raw:string;document?:{text:string;name:string;part:number}}
type SavedAudio={id:string;updatedAt:number;blob:Blob}
function database():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('adapt-device-v1',1)
  request.onupgradeneeded=()=>{for(const name of ['lessons','audio'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'})}
  request.onsuccess=()=>resolve(request.result)
  request.onerror=()=>reject(request.error)
  request.onblocked=()=>reject(new Error('Device storage blocked'))
 })
}
async function records<T>(store:string):Promise<T[]>{
 const db=await database()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,'readonly'),request=tx.objectStore(store).getAll()
  let values:T[]=[]
  request.onsuccess=()=>{values=request.result}
  tx.oncomplete=()=>{db.close();resolve(values)}
  tx.onerror=tx.onabort=()=>{db.close();reject(tx.error)}
 })
}
async function putBounded<T extends SavedLesson|SavedAudio>(store:string,value:T,countLimit:number,byteLimit=Infinity):Promise<T[]>{
 const db=await database()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,'readwrite'),object=tx.objectStore(store),request=object.getAll()
  const kept:T[]=[]
  request.onsuccess=()=>{
   const existing=(request.result as T[]).filter(x=>x.id!==value.id).sort((a,b)=>b.updatedAt-a.updatedAt)
   let bytes=0
   for(const record of [value,...existing]){
    const size='blob'in record?record.blob.size:0
    if(kept.length<countLimit&&bytes+size<=byteLimit){kept.push(record);bytes+=size}
    else object.delete(record.id)
   }
   object.put(value)
  }
  tx.oncomplete=()=>{db.close();resolve(kept)}
  tx.onerror=tx.onabort=()=>{db.close();reject(tx.error)}
 })
}
async function digest(value:string){
 if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}
 // Identification only, not cryptography; supports local HTTP on a phone.
 let a=2166136261,b=5381;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i)}
 return `${(a>>>0).toString(16)}-${(b>>>0).toString(16)}-${value.length}`
}
let writes:Promise<unknown>=Promise.resolve()
export async function savedLessons(){return (await records<SavedLesson>('lessons')).filter(l=>typeof l.id==='string'&&typeof l.title==='string'&&typeof l.updatedAt==='number'&&restoreAdaptiveWorkspace(l.raw)).sort((a,b)=>b.updatedAt-a.updatedAt)}
export function saveLesson(workspace:AdaptiveWorkspace,document?:SavedLesson['document']):Promise<SavedLesson[]>{
 const operation=writes.catch(()=>{}).then(async()=>{
  const id=await digest(JSON.stringify({source:workspace.source,course:workspace.course}))
  const record={id,title:workspace.course.title,name:workspace.name,updatedAt:Date.now(),raw:JSON.stringify(workspace),...(document?{document}:{})}
  return putBounded('lessons',record,12)
 })
 writes=operation;return operation
}
export async function cachedAudio(text:string){const id=await digest(text);return (await records<SavedAudio>('audio')).find(a=>a.id===id)?.blob??null}
export async function saveAudio(text:string,blob:Blob){
 if(blob.size>8*1024*1024)throw new Error('Audio too large')
 const id=await digest(text)
 await putBounded('audio',{id,blob,updatedAt:Date.now()},10,32*1024*1024)
}
