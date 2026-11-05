'use client'

import { type Table } from '@tanstack/react-table'
import { ConfirmDeleteDialog } from '@/components/confirm-dialog'
import { useDeleteDevice } from '../api/queries'
import { type Device } from '../data/schema'

type DeviceMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

export function DevicesMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: DeviceMultiDeleteDialogProps<TData>) {
  const deleteDevice = useDeleteDevice()
  const selectedRows = table.getFilteredSelectedRowModel().rows

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      count={selectedRows.length}
      isLoading={deleteDevice.isPending}
      onConfirm={async () => {
        const devices = selectedRows.map((row) => row.original as Device)
        for (const device of devices) {
          await deleteDevice.mutateAsync(device.deviceKey)
        }
        table.resetRowSelection()
      }}
    />
  )
}
