export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth/get-profile'
import { LocationsClient } from '@/components/layout/locations-client'

export default async function LocationsPage() {
  const supabase = createServerClient()

  const [profile, { data: locations }] = await Promise.all([
    getProfile(),
    supabase.from('locations').select('*').order('name'),
  ])

  const canEdit = profile?.role === 'editor' || profile?.role === 'admin'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <LocationsClient
        initialLocations={locations ?? []}
        canEdit={canEdit}
      />
    </div>
  )
}
