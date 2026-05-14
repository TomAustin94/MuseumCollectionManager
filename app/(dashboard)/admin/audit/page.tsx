export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/get-profile'
import { createServerClient } from '@/lib/supabase/server'
import { AuditLogClient } from '@/components/layout/audit-log-client'

export default async function AuditPage() {
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/dashboard/items')

  const supabase = createServerClient()
  const { data: logs } = await supabase
    .from('audit_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(200)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">All data changes (last 200 records)</p>
      </div>
      <AuditLogClient logs={logs ?? []} />
    </div>
  )
}
