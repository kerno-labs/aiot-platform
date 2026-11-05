'use client'

import { useTranslation } from 'react-i18next'
import { ConfirmDeleteDialog } from '@/components/confirm-dialog'
import { useRemoveOrganizationMember } from '../api/queries'
import { type User } from '../data/schema'

type UserDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: UserDeleteDialogProps) {
  const { t } = useTranslation('users')
  const removeMutation = useRemoveOrganizationMember()

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      itemName={currentRow.username}
      confirmWord={currentRow.username}
      confirmLabel={t('confirmUsernameLabel')}
      isLoading={removeMutation.isPending}
      onConfirm={() => removeMutation.mutateAsync({ userId: currentRow.id })}
    />
  )
}
