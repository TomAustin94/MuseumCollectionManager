export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-handler'

// ---------------------------------------------------------------------------
// Validation schema for item updates (all fields optional)
// ---------------------------------------------------------------------------
const updateItemSchema = z.object({
  accession_number: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  status: z.enum(['display', 'storage', 'loan', 'conservation', 'lost']).optional(),
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

interface RouteContext {
  params: { id: string }
}

// ---------------------------------------------------------------------------
// GET /api/items/[id]
// ---------------------------------------------------------------------------
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = createRouteClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: item, error } = await supabase
    .from('items')
    .select('*, categories(id, name), locations(id, name, type)')
    .eq('id', params.id)
    .single()

  if (error || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const { data: auditLogs } = await supabase
    .from('audit_log')
    .select('*')
    .eq('table_name', 'items')
    .eq('record_id', params.id)
    .order('changed_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ item, auditLogs: auditLogs ?? [] })
}

// ---------------------------------------------------------------------------
// PATCH /api/items/[id]
// ---------------------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const supabase = createRouteClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify item exists
  const { data: existing } = await supabase
    .from('items')
    .select('id, notes')
    .eq('id', params.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const updateData = { ...parsed.data }

  // If a movement note is provided, append it to existing notes
  const incomingNote = (body as Record<string, unknown>).notes as string | undefined
  if (incomingNote && existing.notes) {
    updateData.notes = `${existing.notes}\n\n[${new Date().toISOString()}] ${incomingNote}`
  }

  const { data: item, error } = await supabase
    .from('items')
    .update({
      ...updateData,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An item with this accession number already exists' },
        { status: 409 }
      )
    }
    console.error('[PATCH /api/items/[id]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item })
}

// ---------------------------------------------------------------------------
// DELETE /api/items/[id]  – soft delete (admin only)
// ---------------------------------------------------------------------------
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = createRouteClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })
  }

  const { data: item, error } = await supabase
    .from('items')
    .update({
      status: 'lost',
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('id, status')
    .single()

  if (error || !item) {
    return NextResponse.json({ error: 'Item not found or could not be updated' }, { status: 404 })
  }

  return NextResponse.json({ item })
}
