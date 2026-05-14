import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth/get-profile'
import { ItemForm } from '@/components/items/item-form'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewItemPage() {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')

  if (profile.role === 'viewer') {
    redirect('/dashboard/items')
  }

  const supabase = createServerClient()

  const [{ data: categories }, { data: locations }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('locations').select('*').order('name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/dashboard/items" className="hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Collection Items
          </Link>
          <span>/</span>
          <span>New Item</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Item</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add a new item to the museum collection
        </p>
      </div>

      <ItemForm
        categories={categories ?? []}
        locations={locations ?? []}
        mode="create"
      />
    </div>
  )
}
