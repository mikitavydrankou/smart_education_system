import { createClient } from '@/lib/supabase/server'

export async function lmsContext() {
  const client = await createClient()
  if (!client) return { client: null, user: null, profile: null }
  const { data: { user } } = await client.auth.getUser()
  const { data: profile } = user ? await client.from('profiles').select('*').eq('id', user.id).single() : { data: null }
  return { client, user, profile }
}
