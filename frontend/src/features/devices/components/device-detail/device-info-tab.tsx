import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { Device as DeviceV1Device } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { CopyButton } from '@/components/copy-button'
import { deviceStateKey } from '../../data/data'
import { DEVICE_STATE } from '../../data/schema'
import { TagsEditor } from './tags-editor'

interface DeviceInfoTabProps {
  device: DeviceV1Device
}

export function DeviceInfoTab({ device }: DeviceInfoTabProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const [logUploadEnabled, setLogUploadEnabled] = useState(false)

  const getStatusVariant = () => {
    if (device.state === DEVICE_STATE.ONLINE) return 'default'
    if (device.state === DEVICE_STATE.OFFLINE) return 'secondary'
    return 'destructive'
  }

  const handleLogUploadToggle = (checked: boolean) => {
    setLogUploadEnabled(checked)
    toast.success(
      checked
        ? t('deviceDetail.info.logUploadEnabled')
        : t('deviceDetail.info.logUploadDisabled')
    )
  }

  const handleTestLatency = () => {
    toast.info(t('deviceDetail.info.testingLatency'))
    // Placeholder for latency test
    setTimeout(() => {
      toast.success(t('deviceDetail.info.latencyResult', { latency: '45ms' }))
    }, 1000)
  }

  return (
    <div className='space-y-6'>
      {/* Main Device Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('deviceDetail.info.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {/* Left Column */}
            <div className='space-y-4'>
              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.productName')}
                </p>
                <p className='font-medium'>{device.productName || '-'}</p>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('common:createdAt')}
                </p>
                <p className='font-medium'>{device.createdAt || '-'}</p>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.currentStatus')}
                </p>
                <Badge variant={getStatusVariant()}>
                  {device.state !== undefined
                    ? t(`devices.state.${deviceStateKey(device.state)}`)
                    : '-'}
                </Badge>
              </div>
            </div>

            {/* Middle Column */}
            <div className='space-y-4'>
              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.productKey')}
                </p>
                <div className='flex items-center gap-2'>
                  {device.productKey ? (
                    <Link
                      to='/device-management/products/$productKey'
                      params={{ productKey: device.productKey }}
                      aria-label={t('deviceDetail.info.viewProduct')}
                      className='font-mono text-sm text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none'
                    >
                      {device.productKey}
                    </Link>
                  ) : (
                    <p className='font-mono text-sm'>-</p>
                  )}
                  {device.productKey && (
                    <CopyButton value={device.productKey} />
                  )}
                </div>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.deviceKey')}
                </p>
                <div className='flex items-center gap-2'>
                  <p className='font-mono text-sm'>{device.deviceKey || '-'}</p>
                  {device.deviceKey && <CopyButton value={device.deviceKey} />}
                </div>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.ipAddress')}
                </p>
                <p className='font-medium'>-</p>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.activationTime')}
                </p>
                <p className='font-medium'>-</p>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.realTimeLatency')}
                </p>
                <Button variant='outline' size='sm' onClick={handleTestLatency}>
                  {t('deviceDetail.info.test')}
                </Button>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.lastOfflineTime')}
                </p>
                <p className='font-medium'>{device.lastOfflineTime ?? '-'}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className='space-y-4'>
              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.authMethod')}
                </p>
                <p className='font-medium'>-</p>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.firmwareVersion')}
                </p>
                <p className='font-medium'>-</p>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.lastOnlineTime')}
                </p>
                <p className='font-medium'>{device.lastOnlineTime ?? '-'}</p>
              </div>

              <div className='space-y-1'>
                <p className='text-sm text-muted-foreground'>
                  {t('deviceDetail.info.fields.deviceLogUpload')}
                </p>
                <Switch
                  checked={logUploadEnabled}
                  onCheckedChange={handleLogUploadToggle}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Extended Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('deviceDetail.extendedInfo.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>
                {t('deviceDetail.extendedInfo.fields.sdkLanguage')}
              </p>
              <p className='font-medium'>-</p>
            </div>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>
                {t('deviceDetail.extendedInfo.fields.version')}
              </p>
              <p className='font-medium'>-</p>
            </div>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>
                {t('deviceDetail.extendedInfo.fields.moduleVendor')}
              </p>
              <p className='font-medium'>-</p>
            </div>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>
                {t('deviceDetail.extendedInfo.fields.moduleInfo')}
              </p>
              <p className='font-medium'>-</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tag Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('deviceDetail.tags.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TagsEditor deviceKey={device.deviceKey || ''} />
        </CardContent>
      </Card>
    </div>
  )
}
