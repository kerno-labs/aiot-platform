'use client'

import { type Table } from '@tanstack/react-table'
import { sleep } from '@/lib/utils'
import { ConfirmDeleteDialog } from '@/components/confirm-dialog'

type TaskMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

export function TasksMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: TaskMultiDeleteDialogProps<TData>) {
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
