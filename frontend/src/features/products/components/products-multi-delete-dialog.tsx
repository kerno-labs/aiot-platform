'use client'

import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteProduct } from '../api/queries'
import { type Product } from '../data/schema'

type ProductMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

const CONFIRM_WORD = 'DELETE'

export function ProductsMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: ProductMultiDeleteDialogProps<TData>) {
  const { t } = useTranslation('common')
  const [value, setValue] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteProduct = useDeleteProduct()

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = async () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(t('typeToConfirm', { word: CONFIRM_WORD }))
      return
    }

    setIsDeleting(true)
    const products = selectedRows.map((row) => row.original as Product)
    let successCount = 0
    let failCount = 0

    try {
      // Delete products one by one
      for (const product of products) {
        try {
          await deleteProduct.mutateAsync(product.id)
          successCount++
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            `Failed to delete product ${product.productKey}:`,
            error
          )
          failCount++
        }
      }

      // Show result
      if (successCount > 0) {
        toast.success(t('deleteSuccess'))
      }
      if (failCount > 0) {
        toast.error(t('deleteError'))
      }

      setValue('')
      table.resetRowSelection()
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) setValue('')
        onOpenChange(open)
      }}
      handleConfirm={handleDelete}
      isLoading={isDeleting}
      disabled={value.trim() !== CONFIRM_WORD}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          {t('delete')} ({selectedRows.length})
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>{t('deleteConfirm')}</p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span className=''>
              {t('typeToConfirm', { word: CONFIRM_WORD })}
            </span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('typeToConfirm', { word: CONFIRM_WORD })}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t('warning')}</AlertTitle>
            <AlertDescription>{t('cannotBeUndone')}</AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('delete')}
      destructive
    />
  )
}
