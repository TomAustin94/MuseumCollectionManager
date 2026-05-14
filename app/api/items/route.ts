export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-handler'

// ---------------------------------------------------------------------------
// Validation schema for item creation
// ---------------------------------------------------------------------------
const createItemSchema = z.object({
  accession_number: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  status: z.enum(['display', 'storage', 'loan', 'conservation', 'lost']).default('storage'),
  acquisition_date: z.string().nullable().optional(),
  acquisition_method: z.enum(['purchase', 'donation', 'bequest', 'transfer']).nullable().optional(),
  donor_name: z.string().max(255).nullable().optional(),
  estimated_value: z.number().positive().nullable().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'damaged']).nullable().optional(),
  provenance: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
})

// ---------------------------------------------------------------------------
// GET /api/items
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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit

  let query = supabase
    .from('items')
    .select('*, categories(id, name), locations(id, name, type)', { count: 'exact' })

  if (q) {
    // Fuzzy / full-text search using ilike as a fallback; Postgres similarity
    // functions require the pg_trgm extension and cannot be expressed directly
    // via the PostgREST client, so we use a stored-procedure approach via rpc
    // or fall back to ilike. Use ilike with OR for title/accession search.
    query = query.or(
      `title.ilike.%${q}%,accession_number.ilike.%${q}%,description.ilike.%${q}%`
    )
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (category_id) {
    query = query.eq('category_id', category_id)
  }

  if (location_id) {
    query = query.eq('location_id', location_id)
  }

  if (condition) {
    query = query.eq('condition', condition)
  }

  if (date_from) {
    query = query.gte('acquisition_date', date_from)
  }

  if (date_to) {
    query = query.lte('acquisition_date', date_to)
  }

  const { data: items, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[GET /api/items]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: items ?? [], total: count ?? 0, page, limit })
}

// ---------------------------------------------------------------------------
// POST /api/items
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const supabase = createRouteClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { data: item, error } = await supabase
    .from('items')
    .insert({
      ...parsed.data,
      created_by: session.user.id,
      updated_by: session.user.id,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An item with this accession number already exists' },
        { status: 409 }
      )
    }
    console.error('[POST /api/items]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item }, { status: 201 })
}
