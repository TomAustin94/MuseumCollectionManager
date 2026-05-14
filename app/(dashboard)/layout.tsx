export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', session.user.id)
    .single()

  const role = profile?.role ?? 'viewer'
  const email = profile?.email ?? session.user.email ?? ''
  const fullName = profile?.full_name ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} email={email} fullName={fullName} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  )
}
