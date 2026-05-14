import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth/get-profile'
import { ItemForm } from '@/components/items/item-form'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

export default async function EditItemPage({ params }: PageProps) {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')

  if (!profile || profile.role === 'viewer') {
    redirect(`/dashboard/items/${params.id}`)
  }

  const supabase = createServerClient()

  const [{ data: item }, { data: categories }, { data: locations }] = await Promise.all([
    supabase.from('items').select('*').eq('id', params.id).single(),
    supabase.from('categories').select('*').order('name'),
    supabase.from('locations').select('*').order('name'),
  ])

  if (!item) notFound()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/dashboard/items" className="hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Collection Items
          </Link>
          <span>/</span>
          <Link href={`/dashboard/items/${item.id}`} className="hover:text-slate-800 font-mono">
            {item.accession_number}
          </Link>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Edit: {item.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Update item details — all changes are recorded in the audit log
        </p>
      </div>

      <ItemForm
        item={item}
        categories={categories ?? []}
        locations={locations ?? []}
        mode="edit"
      />
    </div>
  )
}
