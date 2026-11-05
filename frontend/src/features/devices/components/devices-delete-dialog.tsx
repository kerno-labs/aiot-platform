'use client'

import { useTranslation } from 'react-i18next'
import { ConfirmDeleteDialog } from '@/components/confirm-dialog'
import { useDeleteDevice } from '../api/queries'
import { type Device } from '../data/schema'

type DeviceDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Device
}

export function DevicesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: DeviceDeleteDialogProps) {
  const { t } = useTranslation('deviceManagement')
  const deleteDevice = useDeleteDevice()

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      itemName={currentRow.name}
      confirmWord={currentRow.deviceKey}
      confirmLabel={`${t('devices.columns.deviceKey')}:`}
      isLoading={deleteDevice.isPending}
      onConfirm={() => deleteDevice.mutateAsync(currentRow.deviceKey)}
    />
  )
}
