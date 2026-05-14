import { format, parseISO } from 'date-fns'

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return format(parseISO(dateString), 'dd MMM yyyy')
  } catch {
    return dateString
  }
}

export function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(cents)
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    return format(parseISO(dateString), 'dd MMM yyyy HH:mm')
  } catch {
    return dateString
  }
}
