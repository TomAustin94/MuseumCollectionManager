import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth/get-profile'
import { Button } from '@/components/ui/button'
import { ItemsTable } from '@/components/items/items-table'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ItemsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createServerClient()

  const [{ data: items }, { data: categories }, { data: locations }] = await Promise.all([
    supabase
      .from('items')
      .select('*, categories(id, name), locations(id, name, type)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('categories').select('*').order('name'),
    supabase.from('locations').select('*').order('name'),
  ])

  const canCreate = profile.role === 'editor' || profile.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Collection Items</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and manage the museum collection
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/items/new">
              <Plus className="h-4 w-4 mr-2" />
              New Item
            </Link>
          </Button>
        )}
      </div>

      <ItemsTable
        initialItems={items ?? []}
        categories={categories ?? []}
        locations={locations ?? []}
        userRole={profile.role}
      />
    </div>
  )
}
