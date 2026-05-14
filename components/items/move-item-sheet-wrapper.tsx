'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MoveItemSheet } from '@/components/items/move-item-sheet'
import { ArrowRightLeft } from 'lucide-react'

interface MoveItemSheetWrapperProps {
  itemId: string
  currentStatus: string
  currentLocationId: string | null
}

export function MoveItemSheetWrapper({
  itemId,
  currentStatus,
  currentLocationId,
}: MoveItemSheetWrapperProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        Move Item
      </Button>
      <MoveItemSheet
        itemId={itemId}
        currentStatus={currentStatus}
        currentLocationId={currentLocationId}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
