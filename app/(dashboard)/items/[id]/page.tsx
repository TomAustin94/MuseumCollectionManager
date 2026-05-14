import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth/get-profile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/items/status-badge'
import { AuditTrail } from '@/components/items/audit-trail'
import { MoveItemSheetWrapper } from '@/components/items/move-item-sheet-wrapper'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils/format'
import { Pencil, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { id: string }
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-900">{value ?? '—'}</dd>
    </div>
  )
}

const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  damaged: 'Damaged',
}

const METHOD_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  donation: 'Donation',
  bequest: 'Bequest',
  transfer: 'Transfer',
}

export default async function ItemDetailPage({ params }: PageProps) {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createServerClient()

  const [{ data: item }, { data: auditLogs }] = await Promise.all([
    supabase
      .from('items')
      .select('*, categories(id, name), locations(id, name, type)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('audit_log')
      .select('*')
      .eq('table_name', 'items')
      .eq('record_id', params.id)
      .order('changed_at', { ascending: false })
      .limit(50),
  ])

  if (!item) notFound()

  const canEdit = (profile?.role === 'editor' || profile?.role === 'admin') ?? false

  const category = (item as any).categories as { id: string; name: string } | null
  const location = (item as any).locations as { id: string; name: string; type: string } | null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/items" className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Collection Items
            </Link>
            <span>/</span>
            <span className="font-mono">{item.accession_number}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{item.title}</h1>
          <div className="flex items-center gap-2 pt-1">
            <StatusBadge status={item.status} />
            {item.condition && (
              <Badge variant="outline" className="text-xs">
                {CONDITION_LABELS[item.condition]}
              </Badge>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <MoveItemSheetWrapper
              itemId={item.id}
              currentStatus={item.status}
              currentLocationId={item.location_id}
            />
            <Button asChild variant="outline" size="sm">
              <Link href={`/items/${item.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Image gallery */}
      {item.images && item.images.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Images</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(item.images as string[]).map((url: string, i: number) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square rounded-md overflow-hidden border bg-slate-100 hover:opacity-90 transition-opacity"
              >
                <Image
                  src={url}
                  alt={`${item.title} — image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Main details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Identification</h2>
          <Separator className="mb-2" />
          <dl>
            <DetailRow label="Accession Number" value={<span className="font-mono text-xs">{item.accession_number}</span>} />
            <DetailRow label="Category" value={category?.name} />
            <DetailRow label="Location" value={location?.name} />
            <DetailRow label="Status" value={<StatusBadge status={item.status} />} />
            <DetailRow label="Condition" value={item.condition ? CONDITION_LABELS[item.condition] : null} />
            {item.tags && item.tags.length > 0 && (
              <DetailRow
                label="Tags"
                value={
                  <div className="flex flex-wrap gap-1">
                    {(item.tags as string[]).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                }
              />
            )}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Acquisition</h2>
          <Separator className="mb-2" />
          <dl>
            <DetailRow label="Acquisition Date" value={formatDate(item.acquisition_date)} />
            <DetailRow label="Method" value={item.acquisition_method ? METHOD_LABELS[item.acquisition_method] : null} />
            <DetailRow label="Donor / Vendor" value={item.donor_name} />
            <DetailRow label="Estimated Value" value={formatCurrency(item.estimated_value)} />
          </dl>
        </Card>
      </div>

      {/* Description / Provenance / Notes */}
      {(item.description || item.provenance || item.notes) && (
        <Card className="p-6 space-y-5">
          {item.description && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Description</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.description}</p>
            </div>
          )}
          {item.provenance && (
            <>
              {item.description && <Separator />}
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Provenance</h2>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.provenance}</p>
              </div>
            </>
          )}
          {item.notes && (
            <>
              {(item.description || item.provenance) && <Separator />}
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Notes</h2>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.notes}</p>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Record metadata */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Record Information</h2>
        <Separator className="mb-2" />
        <dl>
          <DetailRow label="Created" value={formatDateTime(item.created_at)} />
          <DetailRow label="Last Updated" value={formatDateTime(item.updated_at)} />
        </dl>
      </Card>

      {/* Audit trail */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Audit History</h2>
        <AuditTrail logs={auditLogs ?? []} />
      </div>
    </div>
  )
}
