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
import type { Category } from '@/lib/supabase/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  parent_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  initialCategories: Category[]
  canEdit: boolean
}

export function CategoriesClient({ initialCategories, canEdit }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  const parentId = watch('parent_id')

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', description: '', parent_id: '' })
    setOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    reset({
      name: cat.name,
      description: cat.description ?? '',
      parent_id: cat.parent_id ?? '',
    })
    setOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    const body = {
      name: data.name,
      description: data.description || null,
      parent_id: data.parent_id || null,
    }

    const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Failed to save category')
      return
    }

    const saved = await res.json()
    if (editing) {
      setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
      toast.success('Category updated')
    } else {
      setCategories((prev) => [...prev, saved])
      toast.success('Category created')
    }
    setOpen(false)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (!res.ok) {
      toast.error('Failed to delete category')
      return
    }
    setCategories((prev) => prev.filter((c) => c.id !== id))
    toast.success('Category deleted')
  }

  const parentOptions = categories.filter((c) => !c.parent_id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage collection categories</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Parent</TableHead>
              {canEdit && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 4 : 3} className="text-center text-muted-foreground py-8">
                  No categories yet
                </TableCell>
              </TableRow>
            )}
            {categories.map((cat) => {
              const parent = categories.find((c) => c.id === cat.parent_id)
              return (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">
                    {cat.parent_id && <span className="text-muted-foreground mr-2">└</span>}
                    {cat.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{cat.description ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{parent?.name ?? '—'}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cat.id)}
                          disabled={deleting === cat.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select
                value={parentId ?? ''}
                onValueChange={(v) => setValue('parent_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {parentOptions
                    .filter((c) => c.id !== editing?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
