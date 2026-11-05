'use client'

import { type Table } from '@tanstack/react-table'
import { sleep } from '@/lib/utils'
import { ConfirmDeleteDialog } from '@/components/confirm-dialog'

type UserMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

export function UsersMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: UserMultiDeleteDialogProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      count={selectedRows.length}
      onConfirm={async () => {
        await sleep(500)
        table.resetRowSelection()
      }}
    />
  )
}
