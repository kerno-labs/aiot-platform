import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'

export function TasksTab() {
  const { t } = useTranslation('common')

  return (
    <Card>
      <CardContent className='flex min-h-[400px] items-center justify-center'>
        <div className='text-center'>
          <p className='text-lg text-muted-foreground'>{t('comingSoon')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
