import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useOTAPackagesContext } from '../hooks/use-ota-packages-context'

export function OTAPackagesPrimaryButtons() {
  const { t } = useTranslation('common')
  const { setOpenDialog } = useOTAPackagesContext()

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpenDialog('create')}>
        <span>{t('create')}</span> <Plus size={18} />
      </Button>
    </div>
  )
}
