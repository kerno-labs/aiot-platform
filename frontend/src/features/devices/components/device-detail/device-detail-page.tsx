import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_authenticated/device-management/devices/$deviceKey'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Main } from '@/components/layout/main'
import { useDeviceByKey } from '@/features/devices/api/queries'
import { DeviceEndpointsCard } from './device-endpoints-card'
import { DeviceHeader } from './device-header'
import { DeviceInfoTab } from './device-info-tab'
import { FileManagementTab } from './file-management-tab'
import { LogServiceTab } from './log-service-tab'
import { OnlineDebugTab } from './online-debug-tab'
import { TasksTab } from './tasks-tab'
import { ThingModelDataTab } from './thing-model-data-tab'

export function DeviceDetailPage() {
  const { t } = useTranslation('deviceManagement')
  const { deviceKey } = Route.useParams()
  const navigate = useNavigate()
  const { data: deviceResponse, isLoading, error } = useDeviceByKey(deviceKey)

  const handleBack = () => {
    navigate({ to: '/device-management/devices' })
  }

  if (isLoading) {
    return (
      <Main className='flex flex-1 flex-col'>
        <div className='flex flex-1 flex-col'>
          <div className='animate-pulse space-y-4'>
            <div className='h-8 w-48 rounded bg-muted'></div>
            <div className='h-16 rounded bg-muted'></div>
            <div className='h-96 rounded bg-muted'></div>
          </div>
        </div>
      </Main>
    )
  }

  if (error || !deviceResponse?.device) {
    return (
      <Main className='flex flex-1 flex-col'>
        <div className='flex flex-1 flex-col items-center justify-center space-y-4'>
          <p className='text-lg text-muted-foreground'>
            {t('deviceDetail.notFound')}
          </p>
          <Button onClick={handleBack}>{t('deviceDetail.backButton')}</Button>
        </div>
      </Main>
    )
  }

  const device = deviceResponse.device

  return (
    <Main className='flex flex-1 flex-col'>
      <div className='flex flex-1 flex-col'>
        <DeviceHeader device={device} onBack={handleBack} />

        <Tabs defaultValue='info' className='flex flex-1 flex-col'>
          <TabsList className='mb-4'>
            <TabsTrigger value='info'>
              {t('deviceDetail.tabs.info')}
            </TabsTrigger>
            <TabsTrigger value='connection'>
              {t('deviceDetail.tabs.connection')}
            </TabsTrigger>
            <TabsTrigger value='thingModel'>
              {t('deviceDetail.tabs.thingModel')}
            </TabsTrigger>
            <TabsTrigger value='debug'>
              {t('deviceDetail.tabs.debug')}
            </TabsTrigger>
            <TabsTrigger value='tasks'>
              {t('deviceDetail.tabs.tasks')}
            </TabsTrigger>
          </TabsList>

          <div className='min-w-0 flex-1'>
            <TabsContent value='info' className='mt-0'>
              <DeviceInfoTab device={device} />
            </TabsContent>

            <TabsContent value='connection' className='mt-0'>
              <DeviceEndpointsCard deviceKey={device.deviceKey || ''} />
            </TabsContent>

            <TabsContent value='thingModel' className='mt-0'>
              <ThingModelDataTab />
            </TabsContent>

            <TabsContent value='files' className='mt-0'>
              <FileManagementTab />
            </TabsContent>

            <TabsContent value='logs' className='mt-0'>
              <LogServiceTab />
            </TabsContent>

            <TabsContent value='debug' className='mt-0'>
              <OnlineDebugTab />
            </TabsContent>

            <TabsContent value='tasks' className='mt-0'>
              <TasksTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Main>
  )
}
