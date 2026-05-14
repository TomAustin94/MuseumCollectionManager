'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import type { Location, LocationType } from '@/lib/supabase/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['display', 'storage', 'loan', 'conservation'] as const),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const typeVariant: Record<LocationType, 'success' | 'muted' | 'warning' | 'info'> = {
  display: 'success',
  storage: 'muted',
  loan: 'warning',
  conservation: 'info',
}

interface Props {
  initialLocations: Location[]
  canEdit: boolean
}

export function LocationsClient({ initialLocations, canEdit }: Props) {
  const [locations, setLocations] = useState(initialLocations)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'storage' },
  })

  const locType = watch('type')

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', type: 'storage', description: '' })
    setOpen(true)
  }

  const openEdit = (loc: Location) => {
    setEditing(loc)
    reset({ name: loc.name, type: loc.type, description: loc.description ?? '' })
    setOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    const body = {
      name: data.name,
      type: data.type,
      description: data.description || null,
    }

    const url = editing ? `/api/locations/${editing.id}` : '/api/locations'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Failed to save location')
      return
    }

    const saved = await res.json()
    if (editing) {
      setLocations((prev) => prev.map((l) => (l.id === saved.id ? saved : l)))
      toast.success('Location updated')
    } else {
      setLocations((prev) => [...prev, saved])
      toast.success('Location created')
    }
    setOpen(false)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (!res.ok) {
      toast.error('Failed to delete location')
      return
    }
    setLocations((prev) => prev.filter((l) => l.id !== id))
    toast.success('Location deleted')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage storage and display locations</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Location
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              {canEdit && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 4 : 3}
                  className="text-center text-muted-foreground py-8"
                >
                  No locations yet
                </TableCell>
              </TableRow>
            )}
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-medium">{loc.name}</TableCell>
                <TableCell>
                  <Badge variant={typeVariant[loc.type]} className="capitalize">
                    {loc.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{loc.description ?? '—'}</TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(loc.id)}
                        disabled={deleting === loc.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'New Location'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={locType}
                onValueChange={(v) => setValue('type', v as LocationType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="display">Display</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="conservation">Conservation</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
