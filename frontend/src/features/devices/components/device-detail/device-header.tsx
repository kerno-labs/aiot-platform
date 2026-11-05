import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Device as DeviceV1Device } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/copy-button'

interface DeviceHeaderProps {
  device: DeviceV1Device
  onBack: () => void
}

export function DeviceHeader({ device, onBack }: DeviceHeaderProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])

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
        <h1 className='text-2xl font-bold'>{device.name || '-'}</h1>
      </div>

      <div className='flex flex-wrap items-center gap-4 text-sm'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>
            {t('deviceDetail.header.product')}:
          </span>
          <span>{device.productName || '-'}</span>
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>
            {t('productDetail.header.productKey')}:
          </span>
          {device.productKey ? (
            <Link
              to='/device-management/products/$productKey'
              params={{ productKey: device.productKey }}
              aria-label={t('deviceDetail.header.viewProduct')}
              className='font-mono text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none'
            >
              {device.productKey}
            </Link>
          ) : (
            <span className='font-mono'>-</span>
          )}
          {device.productKey && <CopyButton value={device.productKey} />}
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground'>
            {t('deviceDetail.header.deviceKey')}:
          </span>
          <span className='font-mono'>{device.deviceKey || '-'}</span>
          {device.deviceKey && <CopyButton value={device.deviceKey} />}
        </div>
      </div>
    </div>
  )
}
