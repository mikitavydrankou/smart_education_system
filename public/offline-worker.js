/* Only same-origin application documents/assets are cached. API requests always go to the network. */
const CACHE = 'adapt-shell-v1'
const allowedAsset = url => url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')
async function saveAsset(url) {
  if (!allowedAsset(new URL(url, self.location.origin))) return
  const cache = await caches.open(CACHE)
  if (await cache.match(url)) return
  const response = await fetch(url)
  if (!response.ok) throw new Error('Asset unavailable')
  await cache.put(url, response)
}
async function prepare() {
  const cache = await caches.open(CACHE)
  const response = await fetch('/workspace', {cache:'reload'})
  if (!response.ok) throw new Error('Shell unavailable')
  const html = await response.clone().text()
  const assets = [...html.matchAll(/(?:src|href)="([^"<>]+)"/g)].map(m=>m[1].replace(/&amp;/g,'&')).filter(url=>allowedAsset(new URL(url,self.location.origin)))
  await Promise.all(assets.map(saveAsset))
  await cache.put('/workspace',response)
}
self.addEventListener('install',event=>event.waitUntil(prepare().then(()=>self.skipWaiting())))
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()))
self.addEventListener('message',event=>{
  if(event.data?.type!=='PREPARE')return
  event.waitUntil((async()=>{
    try {
      const cache=await caches.open(CACHE)
      if(!await cache.match('/workspace'))await prepare()
      await Promise.all((event.data.assets||[]).slice(0,80).map(saveAsset))
      event.ports[0]?.postMessage({ready:true})
    }catch{event.ports[0]?.postMessage({ready:false})}
  })())
})
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url)
 if(url.origin!==self.location.origin||event.request.method!=='GET')return
 if(allowedAsset(url)){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE),hit=await cache.match(event.request)
   if(hit)return hit
   const response=await fetch(event.request)
   if(response.ok)await cache.put(event.request,response.clone())
   return response
  })());return
 }
 if(event.request.mode==='navigate'&&url.pathname==='/workspace')event.respondWith((async()=>{
  try{
   const response=await fetch(event.request)
   if(response.ok){const cache=await caches.open(CACHE);await cache.put('/workspace',response.clone());return response}
   return await (await caches.open(CACHE)).match('/workspace')||response
  }catch{return await (await caches.open(CACHE)).match('/workspace')||Response.error()}
 })())
})
