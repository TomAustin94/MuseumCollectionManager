export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getProfile } from '@/lib/auth/get-profile'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={profile.role} email={profile.email} fullName={profile.full_name} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  )
}
