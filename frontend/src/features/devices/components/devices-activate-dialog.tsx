'use client'

import { CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useActivateDevice } from '../api/queries'
import { type Device } from '../data/schema'

type DeviceActivateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Device
}

export function DevicesActivateDialog({
  open,
  onOpenChange,
  currentRow,
}: DeviceActivateDialogProps) {
  const { t } = useTranslation('common')
  const activateDevice = useActivateDevice()

  const handleActivate = async () => {
    try {
      await activateDevice.mutateAsync({
        id: currentRow.id,
        data: {},
      })
      toast.success(t('updateSuccess'))
      onOpenChange(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to activate device:', error)
      toast.error(getApiErrorMessage(error, t('updateError')))
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleActivate}
      isLoading={activateDevice.isPending}
      title={
        <span>
          <CheckCircle className='me-1 inline-block' size={18} />
          {t('confirm')}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            <span className='font-bold'>{currentRow.name}</span>
          </p>
        </div>
      }
    />
  )
}
