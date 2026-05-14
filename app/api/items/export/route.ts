export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-handler'
import { toCsv } from '@/lib/utils/csv'

// ---------------------------------------------------------------------------
// GET /api/items/export
// Returns all matching items as a CSV file (no pagination)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const supabase = createRouteClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const q = searchParams.get('q')?.trim() || ''
  const status = searchParams.get('status') || ''
  const category_id = searchParams.get('category_id') || ''
  const location_id = searchParams.get('location_id') || ''
  const condition = searchParams.get('condition') || ''
  const date_from = searchParams.get('date_from') || ''
  const date_to = searchParams.get('date_to') || ''

  let query = supabase
    .from('items')
    .select('*, categories(id, name), locations(id, name, type)')

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,accession_number.ilike.%${q}%,description.ilike.%${q}%`
    )
  }

  if (status) query = query.eq('status', status)
  if (category_id) query = query.eq('category_id', category_id)
  if (location_id) query = query.eq('location_id', location_id)
  if (condition) query = query.eq('condition', condition)
  if (date_from) query = query.gte('acquisition_date', date_from)
  if (date_to) query = query.lte('acquisition_date', date_to)

  const { data: items, error } = await query.order('accession_number', { ascending: true })

  if (error) {
    console.error('[GET /api/items/export]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type ItemWithJoins = typeof items extends (infer T)[] | null ? T : never

  const rows = (items ?? []).map((item: ItemWithJoins & {
    categories?: { id: string; name: string } | null
    locations?: { id: string; name: string; type: string } | null
  }) => ({
    accession_number: item.accession_number,
    title: item.title,
    description: item.description ?? '',
    category_name: item.categories?.name ?? '',
    location_name: item.locations?.name ?? '',
    location_type: item.locations?.type ?? '',
    status: item.status,
    condition: item.condition ?? '',
    acquisition_date: item.acquisition_date ?? '',
    acquisition_method: item.acquisition_method ?? '',
    donor_name: item.donor_name ?? '',
    estimated_value: item.estimated_value ?? '',
    provenance: item.provenance ?? '',
    notes: item.notes ?? '',
    tags: Array.isArray(item.tags) ? item.tags.join('; ') : '',
    images_count: Array.isArray(item.images) ? item.images.length : 0,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }))

  const csv = toCsv(rows)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="collection-export.csv"',
    },
  })
}
