'use client'
import { useCallback, useEffect, useState } from 'react'
import { createSession, reduceSession, restoreSession, type Action } from '@/lib/session'

const storageKey = 'adapt-session'
export function useSession() {
  const [session, setSession] = useState(createSession)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    try { setSession(restoreSession(localStorage.getItem(storageKey))) }
    catch { setStorageError(true) }
    setReady(true)
  }, [])
  const update = useCallback((action: Action | 'restart') => {
    setSession(previous => action === 'restart' ? createSession() : reduceSession(previous, action))
  }, [])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(storageKey, JSON.stringify(session)) }
    catch { setStorageError(true) }
  }, [session, ready])
  return { session, update, ready, storageError }
}
