'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Tag,
  MapPin,
  BarChart2,
  Users,
  ScrollText,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { UserRole } from '@/lib/supabase/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Items', href: '/dashboard/items', icon: Package },
  { label: 'Categories', href: '/dashboard/categories', icon: Tag },
  { label: 'Locations', href: '/dashboard/locations', icon: MapPin },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart2 },
  {
    label: 'Users',
    href: '/dashboard/admin/users',
    icon: Users,
    adminOnly: true,
  },
  {
    label: 'Audit Log',
    href: '/dashboard/admin/audit',
    icon: ScrollText,
    adminOnly: true,
  },
]

interface SidebarProps {
  role: UserRole
  email: string
  fullName: string | null
}

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export function Sidebar({ role, email, fullName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === 'admin'
  )

  function isActive(href: string) {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = getInitials(fullName, email)

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-4">
        <span className="text-sm font-semibold text-slate-900 truncate">
          Collection Manager
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2 mb-1">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {fullName && (
              <p className="truncate text-sm font-medium text-slate-900">
                {fullName}
              </p>
            )}
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 rounded-md bg-white border border-slate-200 p-2 shadow-sm"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-slate-700" />
        ) : (
          <Menu className="h-5 w-5 text-slate-700" />
        )}
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-60 flex flex-col border-r border-slate-200 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
