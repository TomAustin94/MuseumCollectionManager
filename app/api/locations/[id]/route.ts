export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/route-handler'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['display', 'storage', 'loan', 'conservation']).optional(),
  description: z.string().max(1000).nullable().optional(),
})

async function requireEditor(supabase: ReturnType<typeof createRouteClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (!profile || !['editor', 'admin'].includes(profile.role)) return null
  return profile
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient()
  const profile = await requireEditor(supabase)
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('locations')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient()
  const profile = await requireEditor(supabase)
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('locations').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
