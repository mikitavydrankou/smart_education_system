'use client'
import {useEffect,useState} from 'react'
export function OfflineStatus(){
 const [online,setOnline]=useState(true),[ready,setReady]=useState(false)
 useEffect(()=>{
  let alive=true
  const update=()=>setOnline(navigator.onLine)
  update();window.addEventListener('online',update);window.addEventListener('offline',update)
  const prepare=async()=>{
   if(process.env.NODE_ENV!=='production'||!('serviceWorker'in navigator)||!window.isSecureContext)return
   try{
    await navigator.serviceWorker.register('/offline-worker.js',{scope:'/'})
    const registration=await navigator.serviceWorker.ready
    const worker=registration.active
    if(!worker)return
    const assets=performance.getEntriesByType('resource').map(r=>r.name).filter(url=>new URL(url).origin===location.origin&&new URL(url).pathname.startsWith('/_next/static/'))
    const channel=new MessageChannel()
    const timeout=setTimeout(()=>channel.port1.close(),15000)
    channel.port1.onmessage=e=>{clearTimeout(timeout);if(alive)setReady(e.data.ready===true);channel.port1.close()}
    worker.postMessage({type:'PREPARE',assets},[channel.port2])
   }catch{/* Local lesson storage remains usable without shell caching. */}
  }
  prepare()
  return()=>{alive=false;window.removeEventListener('online',update);window.removeEventListener('offline',update)}
 },[])
 return <div className="offline-status" role="status"><span>{online?(ready?'Gotowe do nauki offline':'Zapis i postępy na tym urządzeniu'):'Tryb offline — korzystasz z zapisanych lekcji'}</span><small>Nowe lekcje i nowe nagrania AI wymagają internetu. {ready?'Zapisane lekcje otworzysz także bez sieci.':'Pełny tryb offline wymaga HTTPS lub localhost.'}</small></div>
}
