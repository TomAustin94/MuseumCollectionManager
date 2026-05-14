'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/format'
import type { Profile, UserRole } from '@/lib/supabase/types'

const roleVariant: Record<UserRole, 'default' | 'warning' | 'danger'> = {
  viewer: 'default',
  editor: 'warning',
  admin: 'danger',
}

interface Props {
  currentUserId: string
}

export function UsersClient({ currentUserId }: Props) {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        setUsers(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const updateRole = async (userId: string, role: UserRole) => {
    setUpdating(userId)
    const res = await fetch(`/api/admin/users?id=${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setUpdating(null)

    if (!res.ok) {
      toast.error('Failed to update role')
      return
    }

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    toast.success('Role updated')
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading users…</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>MFA</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-40">Change Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.full_name ?? '—'}
                {user.id === currentUserId && (
                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                )}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={roleVariant[user.role]} className="capitalize">
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.mfa_enabled ? 'success' : 'muted'}>
                  {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDateTime(user.created_at)}
              </TableCell>
              <TableCell>
                <Select
                  defaultValue={user.role}
                  onValueChange={(v) => updateRole(user.id, v as UserRole)}
                  disabled={updating === user.id || user.id === currentUserId}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
