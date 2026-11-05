'use client'

import { useTranslation } from 'react-i18next'
import { ConfirmDeleteDialog } from '@/components/confirm-dialog'
import { useDeleteProduct } from '../api/queries'
import { type Product } from '../data/schema'

type ProductDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Product
}

export function ProductsDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: ProductDeleteDialogProps) {
  const { t } = useTranslation('deviceManagement')
  const deleteProduct = useDeleteProduct()

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      itemName={currentRow.name}
      confirmWord={currentRow.productKey}
      confirmLabel={`${t('productDetail.header.productKey')}:`}
      isLoading={deleteProduct.isPending}
      onConfirm={() => deleteProduct.mutateAsync(currentRow.productKey)}
    />
  )
}
