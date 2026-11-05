'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
  const { t } = useTranslation(['deviceManagement', 'common'])
  const [value, setValue] = useState('')
  const deleteProduct = useDeleteProduct()

  const handleDelete = async () => {
    if (value.trim() !== currentRow.productKey) return

    try {
      await deleteProduct.mutateAsync(currentRow.productKey)
      toast.success(t('common:deleteSuccess'))
      setValue('')
      onOpenChange(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete product:', error)
      const apiError = error as {
        response?: { data?: { message?: string; error?: string } }
        message?: string
      }
      const errorMessage =
        apiError?.response?.data?.message ||
        apiError?.response?.data?.error ||
        apiError?.message ||
        t('common:deleteError')
      toast.error(errorMessage)
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
      isLoading={deleteProduct.isPending}
      disabled={value.trim() !== currentRow.productKey}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          {t('common:delete')}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            <span className='font-bold'>{currentRow.name}</span> (
            <span className='font-mono font-bold'>{currentRow.productKey}</span>
            ) — {t('common:deleteConfirm')}
          </p>

          <Label className='my-2'>
            {t('productDetail.header.productKey')}:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('common:typeToConfirm', {
                word: currentRow.productKey,
              })}
              className='font-mono'
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>{t('common:warning')}</AlertTitle>
            <AlertDescription>{t('common:cannotBeUndone')}</AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t('common:delete')}
      destructive
    />
  )
}
