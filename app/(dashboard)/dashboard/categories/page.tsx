export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth/get-profile'
import { CategoriesClient } from '@/components/layout/categories-client'

export default async function CategoriesPage() {
  const supabase = createServerClient()
  const profile = await getProfile()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  const canEdit = profile?.role === 'editor' || profile?.role === 'admin'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <CategoriesClient
        initialCategories={categories ?? []}
        canEdit={canEdit}
      />
    </div>
  )
}
