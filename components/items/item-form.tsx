'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import type { Item, Category, Location } from '@/lib/supabase/types'
import { X, Upload, Loader2 } from 'lucide-react'
import Image from 'next/image'

const itemSchema = z.object({
  accession_number: z.string().min(1, 'Accession number is required').max(100),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional().nullable(),
  category_id: z.string().nullable().optional(),
  location_id: z.string().nullable().optional(),
  status: z.enum(['display', 'storage', 'loan', 'conservation', 'lost']).default('storage'),
  acquisition_date: z.string().nullable().optional(),
  acquisition_method: z
    .enum(['purchase', 'donation', 'bequest', 'transfer'])
    .nullable()
    .optional(),
  donor_name: z.string().max(255).nullable().optional(),
  estimated_value: z.preprocess(
    (v: unknown) => (v === '' || v == null ? null : Number(v)),
    z.number().positive().nullable().optional()
  ),
  condition: z
    .enum(['excellent', 'good', 'fair', 'poor', 'damaged'])
    .nullable()
    .optional(),
  provenance: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.string().optional(), // comma-separated
  images: z.array(z.string()).optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface ItemFormProps {
  item?: Item
  categories: Category[]
  locations: Location[]
  mode: 'create' | 'edit'
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

function fieldError(msg?: string) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-500">{msg}</p>
}

export function ItemForm({ item, categories, locations, mode }: ItemFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageUrls, setImageUrls] = useState<string[]>(item?.images ?? [])
  const [uploadingImages, setUploadingImages] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      accession_number: item?.accession_number ?? '',
      title: item?.title ?? '',
      description: item?.description ?? '',
      category_id: item?.category_id ?? null,
      location_id: item?.location_id ?? null,
      status: item?.status ?? 'storage',
      acquisition_date: item?.acquisition_date ?? '',
      acquisition_method: item?.acquisition_method ?? null,
      donor_name: item?.donor_name ?? '',
      estimated_value: item?.estimated_value ?? undefined,
      condition: item?.condition ?? null,
      provenance: item?.provenance ?? '',
      notes: item?.notes ?? '',
      tags: item?.tags?.join(', ') ?? '',
      images: item?.images ?? [],
    },
  })

  const handleImageFiles = async (files: FileList) => {
    const valid = Array.from(files).filter((f) => {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
        toast.error(`${f.name}: unsupported format (JPEG, PNG, WebP only)`)
        return false
      }
      if (f.size > MAX_IMAGE_SIZE) {
        toast.error(`${f.name}: exceeds 5 MB limit`)
        return false
      }
      return true
    })

    if (valid.length === 0) return

    setUploadingImages(true)
    const uploaded: string[] = []

    for (const file of valid) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/items/upload-image', { method: 'POST', body: fd })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? 'Upload failed')
        }
        const { url } = await res.json()
        uploaded.push(url)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`)
      }
    }

    if (uploaded.length > 0) {
      setImageUrls((prev) => [...prev, ...uploaded])
      toast.success(`${uploaded.length} image(s) uploaded`)
    }
    setUploadingImages(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url))
  }

  const onSubmit = async (values: ItemFormValues) => {
    const tagArray = values.tags
      ? values.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    const payload = {
      ...values,
      tags: tagArray,
      images: imageUrls,
      category_id: values.category_id || null,
      location_id: values.location_id || null,
      acquisition_method: values.acquisition_method || null,
      condition: values.condition || null,
      acquisition_date: values.acquisition_date || null,
      description: values.description || null,
      donor_name: values.donor_name || null,
      provenance: values.provenance || null,
      notes: values.notes || null,
      estimated_value: values.estimated_value ?? null,
    }

    try {
      const url = mode === 'create' ? '/api/items' : `/api/items/${item!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to save item')
      }

      const data = await res.json()
      toast.success(mode === 'create' ? 'Item created' : 'Item updated')
      router.push(`/items/${data.item?.id ?? item?.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save item')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
      {/* Core identification */}
      <Card className="p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Identification</h2>
        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="accession_number">
              Accession Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="accession_number"
              {...register('accession_number')}
              placeholder="e.g. MCM-2024-001"
              className="mt-1"
            />
            {fieldError(errors.accession_number?.message)}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status" className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="display">On Display</SelectItem>
                    <SelectItem value="storage">In Storage</SelectItem>
                    <SelectItem value="loan">On Loan</SelectItem>
                    <SelectItem value="conservation">Conservation</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {fieldError(errors.status?.message)}
          </div>
        </div>

        <div>
          <Label htmlFor="title">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Full descriptive title of the item"
            className="mt-1"
          />
          {fieldError(errors.title?.message)}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            rows={3}
            placeholder="Detailed description of the item"
            className="mt-1"
          />
          {fieldError(errors.description?.message)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                >
                  <SelectTrigger id="category_id" className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="location_id">Location</Label>
            <Controller
              name="location_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                >
                  <SelectTrigger id="location_id" className="mt-1">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="condition">Condition</Label>
          <Controller
            name="condition"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? 'none'}
                onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
              >
                <SelectTrigger id="condition" className="mt-1 w-full sm:w-1/2">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not assessed —</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </Card>

      {/* Acquisition */}
      <Card className="p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Acquisition</h2>
        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="acquisition_date">Acquisition Date</Label>
            <Input
              id="acquisition_date"
              type="date"
              {...register('acquisition_date')}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="acquisition_method">Acquisition Method</Label>
            <Controller
              name="acquisition_method"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                >
                  <SelectTrigger id="acquisition_method" className="mt-1">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unknown —</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="donation">Donation</SelectItem>
                    <SelectItem value="bequest">Bequest</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="donor_name">Donor / Vendor Name</Label>
            <Input
              id="donor_name"
              {...register('donor_name')}
              placeholder="Name of donor or vendor"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="estimated_value">Estimated Value (£)</Label>
            <Input
              id="estimated_value"
              type="number"
              min="0"
              step="0.01"
              {...register('estimated_value')}
              placeholder="0.00"
              className="mt-1"
            />
            {fieldError(errors.estimated_value?.message)}
          </div>
        </div>

        <div>
          <Label htmlFor="provenance">Provenance</Label>
          <Textarea
            id="provenance"
            {...register('provenance')}
            rows={3}
            placeholder="History of ownership and custody"
            className="mt-1"
          />
        </div>
      </Card>

      {/* Additional info */}
      <Card className="p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Additional Information</h2>
        <Separator />

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            rows={3}
            placeholder="Internal notes, conservation notes, etc."
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            {...register('tags')}
            placeholder="Comma-separated tags, e.g. bronze, roman, sculpture"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-slate-500">Separate tags with commas</p>
        </div>
      </Card>

      {/* Images */}
      <Card className="p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Images</h2>
        <Separator />

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {imageUrls.map((url) => (
              <div key={url} className="relative group aspect-square rounded-md overflow-hidden border bg-slate-100">
                <Image
                  src={url}
                  alt="Item image"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 25vw"
                />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploadingImages}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingImages ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploadingImages ? 'Uploading…' : 'Upload Images'}
          </Button>
          <p className="mt-1 text-xs text-slate-500">JPEG, PNG or WebP · Max 5 MB per image</p>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 pb-8">
        <Button type="submit" disabled={isSubmitting || uploadingImages}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : mode === 'create' ? (
            'Create Item'
          ) : (
            'Save Changes'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
