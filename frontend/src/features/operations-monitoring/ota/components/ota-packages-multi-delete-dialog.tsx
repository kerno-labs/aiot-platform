'use client'

import { type Table } from '@tanstack/react-table'
import { ConfirmDeleteDialog } from '@/components/confirm-dialog'
import { useDeleteOTAPackages } from '../api/queries'
import { type OTAPackage } from '../data/schema'

type OTAPackagesMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

export function OTAPackagesMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: OTAPackagesMultiDeleteDialogProps<TData>) {
  const deleteMultipleMutation = useDeleteOTAPackages()
  const selectedRows = table.getFilteredSelectedRowModel().rows

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      count={selectedRows.length}
      isLoading={deleteMultipleMutation.isPending}
      onConfirm={async () => {
        const packages = selectedRows.map((row) => row.original as OTAPackage)
        const packageIds = packages
          .map((pkg) => pkg.uuid)
          .filter((id): id is string => id !== undefined)
        await deleteMultipleMutation.mutateAsync(packageIds)
        table.resetRowSelection()
      }}
    />
  )
}
