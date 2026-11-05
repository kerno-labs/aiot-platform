import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface DeleteTslDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

export function DeleteTslDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteTslDialogProps) {
  const { t } = useTranslation('common')

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={onConfirm}
      isLoading={isPending}
      title={t('delete')}
      desc={t('deleteConfirm')}
      confirmText={t('delete')}
      destructive
    />
  )
}
