import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function RuleChainsPrimaryButtons() {
  const { t } = useTranslation('common')

  return (
    <div className='flex gap-2'>
      <Button asChild className='space-x-1'>
        <Link to='/rule-engine/rule-chains/new'>
          <span>{t('create')}</span> <Plus size={18} />
        </Link>
      </Button>
    </div>
  )
}
