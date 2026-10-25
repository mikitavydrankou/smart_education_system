import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl, safeNext } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  const client = await createClient()
  const params = request.nextUrl.searchParams
  let success = false
  if (client && params.get('code')) {
    const { error } = await client.auth.exchangeCodeForSession(params.get('code')!)
    success = !error
  } else if (client && params.get('token_hash')) {
    const type = params.get('type')
    if (type && ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'].includes(type)) {
      const { error } = await client.auth.verifyOtp({ token_hash: params.get('token_hash')!, type: type as EmailOtpType })
      success = !error
    }
  }
  return NextResponse.redirect(new URL(success ? safeNext(params.get('next')) : '/auth/error', getSiteUrl()))
}
