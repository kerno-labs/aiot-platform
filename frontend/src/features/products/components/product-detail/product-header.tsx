import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Product as ProductV1Product } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/copy-button'

interface ProductHeaderProps {
  product: ProductV1Product
  onBack: () => void
}

export function ProductHeader({ product, onBack }: ProductHeaderProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const [secretVisible, setSecretVisible] = useState(false)

  const toggleSecretVisibility = () => {
    setSecretVisible(!secretVisible)
  }

  // Get status variant
  const statusVariant = product.status === 'active' ? 'default' : 'secondary'

  return (
    <div className='mb-6 space-y-4'>
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={onBack}
          aria-label={t('common:back')}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h1 className='text-3xl font-bold'>{product.name || '-'}</h1>
        <Badge variant={statusVariant}>
          {t(`productDetail.status.${product.status || 'unknown'}`)}
        </Badge>
      </div>

      <div className='flex flex-wrap items-center gap-4 text-sm'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>
            {t('productDetail.header.productKey')}:
          </span>
          <span className='font-mono'>{product.productKey || '-'}</span>
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>
            {t('productDetail.header.productSecret')}:
          </span>
          <span className='font-mono'>
            {secretVisible ? product.productKey || '-' : '********'}
          </span>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={toggleSecretVisibility}
          >
            {secretVisible ? (
              <EyeOff className='h-3 w-3' />
            ) : (
              <Eye className='h-3 w-3' />
            )}
          </Button>
          <CopyButton value={product.productKey || ''} />
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>
            {t('productDetail.header.deviceCount')}:
          </span>
          <span className='font-semibold'>{product.deviceCount || 0}</span>
        </div>
      </div>
    </div>
  )
}
