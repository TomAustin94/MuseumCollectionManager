'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { AuditLog, Json } from '@/lib/supabase/types'
import { formatDateTime } from '@/lib/utils/format'

interface AuditTrailProps {
  logs: AuditLog[]
}

function getDiff(
  oldData: Json | null,
  newData: Json | null
): Array<{ field: string; from: string; to: string }> {
  if (!oldData || !newData) return []
  if (typeof oldData !== 'object' || typeof newData !== 'object') return []
  if (Array.isArray(oldData) || Array.isArray(newData)) return []

  const old = oldData as Record<string, Json>
  const next = newData as Record<string, Json>

  const SKIP = new Set(['search_vector', 'updated_at', 'created_at'])
  const diffs: Array<{ field: string; from: string; to: string }> = []

  const allKeys = Array.from(new Set([...Object.keys(old), ...Object.keys(next)]))
  for (const key of allKeys) {
    if (SKIP.has(key)) continue
    const fromVal = JSON.stringify(old[key] ?? null)
    const toVal = JSON.stringify(next[key] ?? null)
    if (fromVal !== toVal) {
      diffs.push({
        field: key,
        from: old[key] == null ? '—' : String(old[key]),
        to: next[key] == null ? '—' : String(next[key]),
      })
    }
  }
  return diffs
}

const ACTION_VARIANT: Record<
  AuditLog['action'],
  'info' | 'warning' | 'danger'
> = {
  INSERT: 'info',
  UPDATE: 'warning',
  DELETE: 'danger',
}

function truncateId(id: string | null): string {
  if (!id) return 'system'
  return id.slice(0, 8) + '…'
}

export function AuditTrail({ logs }: AuditTrailProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4 text-center">No audit history found.</p>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold text-slate-700 w-40">Date</TableHead>
            <TableHead className="font-semibold text-slate-700 w-28">Action</TableHead>
            <TableHead className="font-semibold text-slate-700 w-28">Changed By</TableHead>
            <TableHead className="font-semibold text-slate-700">Changes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const diffs = getDiff(log.old_data, log.new_data)
            return (
              <TableRow key={log.id} className="align-top">
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {formatDateTime(log.changed_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_VARIANT[log.action]} className="font-mono text-xs">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-600">
                  {truncateId(log.changed_by)}
                </TableCell>
                <TableCell>
                  {log.action === 'INSERT' ? (
                    <span className="text-xs text-slate-500 italic">Record created</span>
                  ) : log.action === 'DELETE' ? (
                    <span className="text-xs text-slate-500 italic">Record deleted</span>
                  ) : diffs.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No tracked changes</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {diffs.map((d) => (
                        <li key={d.field} className="text-xs text-slate-700">
                          <span className="font-medium text-slate-900">{d.field}:</span>{' '}
                          <span className="text-red-600 line-through">{d.from}</span>{' '}
                          <span className="text-slate-400">→</span>{' '}
                          <span className="text-green-700">{d.to}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
