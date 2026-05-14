'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/format'
import type { AuditLog } from '@/lib/supabase/types'

const actionVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  INSERT: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
}

function diffChanges(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): string {
  if (!oldData && newData) return 'New record created'
  if (oldData && !newData) return 'Record deleted'
  if (!oldData || !newData) return '—'

  const changes: string[] = []
  const keys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]))
  const skipKeys = new Set(['search_vector', 'updated_at'])

  for (const key of keys) {
    if (skipKeys.has(key)) continue
    const oldVal = oldData[key]
    const newVal = newData[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push(`${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`)
    }
  }

  return changes.length > 0 ? changes.join(', ') : 'No field changes'
}

interface Props {
  logs: AuditLog[]
}

export function AuditLogClient({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">No audit entries yet</div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Table</TableHead>
            <TableHead>Record ID</TableHead>
            <TableHead>Changed By</TableHead>
            <TableHead>Changes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDateTime(log.changed_at)}
              </TableCell>
              <TableCell>
                <Badge variant={actionVariant[log.action] ?? 'default'}>{log.action}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {log.record_id.slice(0, 8)}…
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {log.changed_by ? log.changed_by.slice(0, 8) + '…' : 'system'}
              </TableCell>
              <TableCell className="text-sm max-w-xs truncate">
                {diffChanges(
                  log.old_data as Record<string, unknown> | null,
                  log.new_data as Record<string, unknown> | null
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
