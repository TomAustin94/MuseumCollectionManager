'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { StatusBadge } from '@/components/items/status-badge'
import type { Item, Category, Location, ItemStatus, ItemCondition } from '@/lib/supabase/types'
import { formatDate } from '@/lib/utils/format'
import { Download, Search, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'

type ItemWithJoins = Item & {
  categories?: { id: string; name: string } | null
  locations?: { id: string; name: string; type: string } | null
}

interface ItemsTableProps {
  initialItems: ItemWithJoins[]
  categories: Category[]
  locations: Location[]
  userRole: string
}

const CONDITION_LABELS: Record<ItemCondition, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  damaged: 'Damaged',
}

const PAGE_SIZE = 20

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function ItemsTable({ initialItems, categories, locations, userRole }: ItemsTableProps) {
  const [items, setItems] = useState<ItemWithJoins[]>(initialItems)
  const [totalCount, setTotalCount] = useState<number>(initialItems.length)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [conditionFilter, setConditionFilter] = useState<string>('all')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [isPending, startTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)
  const skipInitialFetch = useRef(true)

  const debouncedSearch = useDebounce(search, 400)

  const canEdit = userRole === 'editor' || userRole === 'admin'

  const buildQueryString = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter)
      if (conditionFilter !== 'all') params.set('condition', conditionFilter)
      params.set('page', String(pagination.pageIndex + 1))
      params.set('limit', String(PAGE_SIZE))
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => params.set(k, v))
      }
      return params.toString()
    },
    [debouncedSearch, statusFilter, categoryFilter, conditionFilter, pagination.pageIndex]
  )

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/items?${buildQueryString()}`)
        if (!res.ok) throw new Error('Failed to fetch items')
        const json = await res.json()
        setItems(json.items ?? [])
        setTotalCount(json.total ?? 0)
      } catch {
        toast.error('Failed to load items')
      }
    })
  }, [buildQueryString])

  // Reset to page 0 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [debouncedSearch, statusFilter, categoryFilter, conditionFilter])

  const columns: ColumnDef<ItemWithJoins>[] = [
    {
      accessorKey: 'accession_number',
      header: 'Accession #',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-slate-700">
          {row.original.accession_number}
        </span>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/items/${row.original.id}`}
          className="font-medium text-slate-900 hover:text-primary hover:underline line-clamp-2 max-w-xs"
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.categories?.name ?? '—'}
        </span>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.locations?.name ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'condition',
      header: 'Condition',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.condition ? CONDITION_LABELS[row.original.condition] : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/items/${row.original.id}`} aria-label="View item">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {canEdit && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/dashboard/items/${row.original.id}/edit`} aria-label="Edit item">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / PAGE_SIZE),
    state: { pagination },
    onPaginationChange: setPagination,
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter)
      if (conditionFilter !== 'all') params.set('condition', conditionFilter)

      const res = await fetch(`/api/items/export?${params.toString()}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'collection-export.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const pageCount = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="display">On Display</SelectItem>
            <SelectItem value="storage">In Storage</SelectItem>
            <SelectItem value="loan">On Loan</SelectItem>
            <SelectItem value="conservation">Conservation</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All conditions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All conditions</SelectItem>
            <SelectItem value="excellent">Excellent</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
            <SelectItem value="poor">Poor</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting}
          className="ml-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-slate-50">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold text-slate-700">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400">
                  Loading…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {totalCount === 0
            ? 'No items'
            : `Showing ${pagination.pageIndex * PAGE_SIZE + 1}–${Math.min(
                (pagination.pageIndex + 1) * PAGE_SIZE,
                totalCount
              )} of ${totalCount} items`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {pagination.pageIndex + 1} of {pageCount || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
