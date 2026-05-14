import { createServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

export async function getProfile(): Promise<Profile | null> {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function requireRole(
  minRole: 'viewer' | 'editor' | 'admin'
): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) throw new Error('Unauthenticated')
  const order = { viewer: 0, editor: 1, admin: 2 }
  if (order[profile.role] < order[minRole]) throw new Error('Forbidden')
  return profile
}
