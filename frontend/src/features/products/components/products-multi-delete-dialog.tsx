'use client'

import { type Table } from '@tanstack/react-table'
import { ConfirmDeleteDialog } from '@/components/confirm-dialog'
import { useDeleteProduct } from '../api/queries'
import { type Product } from '../data/schema'

type ProductMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

export function ProductsMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: ProductMultiDeleteDialogProps<TData>) {
  const deleteProduct = useDeleteProduct()
  const selectedRows = table.getFilteredSelectedRowModel().rows

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      count={selectedRows.length}
      isLoading={deleteProduct.isPending}
      onConfirm={async () => {
        const products = selectedRows.map((row) => row.original as Product)
        for (const product of products) {
          await deleteProduct.mutateAsync(product.productKey)
        }
        table.resetRowSelection()
      }}
    />
  )
}
