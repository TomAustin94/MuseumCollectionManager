import { Badge } from '@/components/ui/badge'
import type { ItemStatus } from '@/lib/supabase/types'

const STATUS_CONFIG: Record<
  ItemStatus,
  { label: string; variant: 'success' | 'muted' | 'warning' | 'info' | 'danger' }
> = {
  display: { label: 'On Display', variant: 'success' },
  storage: { label: 'In Storage', variant: 'muted' },
  loan: { label: 'On Loan', variant: 'warning' },
  conservation: { label: 'Conservation', variant: 'info' },
  lost: { label: 'Lost', variant: 'danger' },
}

interface StatusBadgeProps {
  status: ItemStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
