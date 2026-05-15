import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('[getProfile] auth.getUser error:', authError.message, authError.status)
    return null
  }
  if (!user) {
    console.log('[getProfile] no user in session')
    return null
  }

  const { data, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[getProfile] profiles query error:', profileError.message, 'user:', user.id)
    return null
  }

  return data
})

export async function requireRole(
  minRole: 'viewer' | 'editor' | 'admin'
): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) throw new Error('Unauthenticated')
  const order = { viewer: 0, editor: 1, admin: 2 }
  if (order[profile.role] < order[minRole]) throw new Error('Forbidden')
  return profile
}
