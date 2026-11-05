import { useTranslation } from 'react-i18next'

export function ServerSubscriptionTab() {
  const { t } = useTranslation(['deviceManagement', 'common'])

  return (
    <div className='flex h-64 flex-col items-center justify-center space-y-4'>
      <p className='text-lg text-muted-foreground'>{t('common:comingSoon')}</p>
      <p className='text-sm text-muted-foreground'>
        {t('productDetail.tabs.subscription')}
      </p>
    </div>
  )
}
