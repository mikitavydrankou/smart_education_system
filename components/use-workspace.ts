'use client'
import { useEffect, useState } from 'react'
import {saveLesson,savedLessons,type SavedLesson} from '@/lib/device-storage'
import { MAX_DOCUMENT_CHARS } from '@/lib/document-parts'
import { defaultProfile, validateProfile, type Profile } from '@/lib/material'
import { restoreAdaptiveWorkspace, mergeOutcomes, validateOutcomes, type AdaptiveWorkspace as Workspace, type Outcome } from '@/lib/adaptive'

const key = 'adapt-workspace-v1', draftKey = 'adapt-draft-v1'
export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [draft, setDraft] = useState('')
  const [library,setLibrary]=useState<SavedLesson[]>([])
  const [librarySaved,setLibrarySaved]=useState(false)
  const [part, setPart] = useState(0)
  const [name, setName] = useState('Mój materiał')
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [learnerRecords, setLearnerRecords] = useState<Outcome[]>([])
  useEffect(() => {
    try {
      setWorkspace(restoreAdaptiveWorkspace(localStorage.getItem(key)))
      try { setLearnerRecords(validateOutcomes(JSON.parse(localStorage.getItem('adapt-learner-v1') || '[]'))) } catch { /* Invalid learning evidence starts empty. */ }
      const raw = localStorage.getItem(draftKey)
      if (raw && raw.length < 1_600_000) {
        try {
          const v = JSON.parse(raw), p = validateProfile(v.profile)
          if (typeof v.text === 'string' && v.text.length <= MAX_DOCUMENT_CHARS) setDraft(v.text)
          if (typeof v.name === 'string' && v.name.trim() && v.name.length <= 120) setName(v.name)
          if (p) setProfile(p)
          if (Number.isInteger(v.part) && v.part >= 0 && v.part < 100) setPart(v.part)
        } catch { /* A malformed draft does not affect an accepted course. */ }
      }
    } catch { setStorageError(true) }
    setReady(true)
    savedLessons().then(setLibrary).catch(()=>setStorageError(true))
  }, [])
  useEffect(()=>{
    if(!ready||!workspace){setLibrarySaved(false);return}
    let alive=true
    setLibrarySaved(false)
    saveLesson(workspace,{text:draft,name,part}).then(values=>{if(alive){setLibrary(values);setLibrarySaved(true)}}).catch(()=>{if(alive)setStorageError(true)})
    return()=>{alive=false}
  },[workspace,ready,draft,name,part])
  useEffect(() => {
    if (!ready) return
    try {
      if (workspace) localStorage.setItem(key, JSON.stringify(workspace)); else localStorage.removeItem(key)
      localStorage.setItem(draftKey, JSON.stringify({ text: draft, name, profile, part }))
    } catch { setStorageError(true) }
  }, [workspace, draft, name, profile, part, ready])
  useEffect(() => {
    if (!ready || !workspace) return
    setLearnerRecords(previous => {
      const merged = mergeOutcomes(previous, workspace.learning.prior, workspace.learning.history)
      return JSON.stringify(merged) === JSON.stringify(previous) ? previous : merged
    })
  }, [workspace, ready])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem('adapt-learner-v1', JSON.stringify(learnerRecords)) } catch { setStorageError(true) }
  }, [learnerRecords, ready])
  return { workspace, setWorkspace, draft, setDraft, name, setName, profile, setProfile, ready, storageError, learnerRecords, part, setPart, library, librarySaved }
}
