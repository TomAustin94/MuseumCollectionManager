'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Location } from '@/lib/supabase/types'

const moveSchema = z.object({
  status: z.enum(['display', 'storage', 'loan', 'conservation', 'lost']),
  location_id: z.string().nullable(),
  note: z.string().max(1000, 'Note must be under 1000 characters').optional(),
})

type MoveFormValues = z.infer<typeof moveSchema>

interface MoveItemSheetProps {
  itemId: string
  currentStatus: string
  currentLocationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MoveItemSheet({
  itemId,
  currentStatus,
  currentLocationId,
  open,
  onOpenChange,
  onSuccess,
}: MoveItemSheetProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MoveFormValues>({
    resolver: zodResolver(moveSchema),
    defaultValues: {
      status: currentStatus as MoveFormValues['status'],
      location_id: currentLocationId,
      note: '',
    },
  })

  const statusValue = watch('status')
  const locationValue = watch('location_id')

  useEffect(() => {
    if (!open) return
    setIsLoadingLocations(true)
    fetch('/api/locations')
      .then((r) => r.json())
      .then((data) => setLocations(data.locations ?? []))
      .catch(() => toast.error('Failed to load locations'))
      .finally(() => setIsLoadingLocations(false))
  }, [open])

  useEffect(() => {
    if (open) {
      reset({
        status: currentStatus as MoveFormValues['status'],
        location_id: currentLocationId,
        note: '',
      })
    }
  }, [open, currentStatus, currentLocationId, reset])

  const onSubmit = async (values: MoveFormValues) => {
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: values.status,
          location_id: values.location_id ?? null,
          notes: values.note ? values.note : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to move item')
      }

      toast.success('Item moved successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move item')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Move Item</SheetTitle>
          <SheetDescription>
            Update the status and location of this collection item.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col gap-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="move-status">New Status</Label>
            <Select
              value={statusValue}
              onValueChange={(v) => setValue('status', v as MoveFormValues['status'])}
            >
              <SelectTrigger id="move-status">
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
            {errors.status && (
              <p className="text-xs text-red-500">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="move-location">New Location</Label>
            <Select
              value={locationValue ?? 'none'}
              onValueChange={(v) => setValue('location_id', v === 'none' ? null : v)}
              disabled={isLoadingLocations}
            >
              <SelectTrigger id="move-location">
                <SelectValue placeholder={isLoadingLocations ? 'Loading…' : 'Select location'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No location —</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="move-note">Movement Note</Label>
            <Textarea
              id="move-note"
              placeholder="Reason for move, handling instructions, etc."
              rows={4}
              {...register('note')}
            />
            {errors.note && (
              <p className="text-xs text-red-500">{errors.note.message}</p>
            )}
          </div>

          <SheetFooter className="mt-auto pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Confirm Move'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
