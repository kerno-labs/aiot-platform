import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useProducts } from './products-provider'

export function ProductsPrimaryButtons() {
  const { t } = useTranslation('deviceManagement')
  const { setOpen } = useProducts()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>{t('productDetail.actions.create')}</span> <Plus size={18} />
      </Button>
    </div>
  )
}
