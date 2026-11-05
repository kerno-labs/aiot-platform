import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useGroups } from './groups-provider'

export function GroupsPrimaryButtons() {
  const { t } = useTranslation('common')
  const { setOpen } = useGroups()

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>{t('create')}</span> <Plus size={18} />
      </Button>
    </div>
  )
}
