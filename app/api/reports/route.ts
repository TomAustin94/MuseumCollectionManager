export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route-handler'

export async function GET(request: Request) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const report = searchParams.get('type') ?? 'overview'

  if (report === 'overview') {
    const [totalResult, statusResult, categoryResult] = await Promise.all([
      supabase.from('items').select('id', { count: 'exact', head: true }),
      supabase.from('items').select('status'),
      supabase
        .from('items')
        .select('category_id, categories(name)')
        .not('category_id', 'is', null),
    ])

    const total = totalResult.count ?? 0

    const statusCounts: Record<string, number> = {}
    for (const row of statusResult.data ?? []) {
      statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1
    }

    const categoryCounts: Record<string, number> = {}
    for (const row of categoryResult.data ?? []) {
      const catData = row.categories as { name: string }[] | { name: string } | null
      const name = (Array.isArray(catData) ? catData[0]?.name : catData?.name) ?? 'Unknown'
      categoryCounts[name] = (categoryCounts[name] ?? 0) + 1
    }

    return NextResponse.json({
      total,
      byStatus: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      byCategory: Object.entries(categoryCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    })
  }

  if (report === 'location') {
    const { data } = await supabase
      .from('items')
      .select('location_id, status, locations(name, type)')

    const locationMap: Record<string, { name: string; display: number; storage: number; total: number }> = {}
    for (const row of data ?? []) {
      const locData = row.locations as { name: string }[] | { name: string } | null
      const name = (Array.isArray(locData) ? locData[0]?.name : locData?.name) ?? 'Unassigned'
      if (!locationMap[name]) locationMap[name] = { name, display: 0, storage: 0, total: 0 }
      locationMap[name].total++
      if (row.status === 'display') locationMap[name].display++
      if (row.status === 'storage') locationMap[name].storage++
    }

    return NextResponse.json(Object.values(locationMap).sort((a, b) => b.total - a.total))
  }

  if (report === 'acquisition') {
    const { data } = await supabase
      .from('items')
      .select('acquisition_date, category_id, categories(name)')
      .not('acquisition_date', 'is', null)
      .order('acquisition_date')

    const categoryFilter = searchParams.get('category_id')

    const filtered = categoryFilter
      ? (data ?? []).filter((r) => r.category_id === categoryFilter)
      : (data ?? [])

    const byYear: Record<string, number> = {}
    for (const row of filtered) {
      const year = row.acquisition_date!.substring(0, 4)
      byYear[year] = (byYear[year] ?? 0) + 1
    }

    return NextResponse.json(
      Object.entries(byYear)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year))
    )
  }

  if (report === 'condition') {
    const { data } = await supabase.from('items').select('condition')

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      const c = row.condition ?? 'unknown'
      counts[c] = (counts[c] ?? 0) + 1
    }

    const order = ['excellent', 'good', 'fair', 'poor', 'damaged', 'unknown']
    return NextResponse.json(
      order
        .filter((k) => counts[k] != null)
        .map((k) => ({ condition: k, count: counts[k] }))
    )
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
}
