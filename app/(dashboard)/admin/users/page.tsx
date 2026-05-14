export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/get-profile'
import { UsersClient } from '@/components/layout/users-client'

export default async function UsersPage() {
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/dashboard/items')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage user roles and permissions</p>
      </div>
      <UsersClient currentUserId={profile.id} />
    </div>
  )
}
