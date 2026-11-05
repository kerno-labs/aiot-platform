import { Plus, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useDevicesDialog } from './devices-provider'

export function DevicesPrimaryButtons() {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const { setOpen } = useDevicesDialog()

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setOpen('batch-upload')}
      >
        <span>{t('devices.buttons.batchUpload')}</span> <Upload size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>{t('common:create')}</span> <Plus size={18} />
      </Button>
    </div>
  )
}
