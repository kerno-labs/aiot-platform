import { useState } from 'react'
import { Route } from '@/routes/_authenticated/device-management/devices/$deviceKey'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeviceEvents } from '@/features/operations-monitoring/events'
import { PropertyTab } from './property-tab'
import { ServiceInvocationsTab } from './service-invocations-tab'

export function ThingModelDataTab() {
  const { t } = useTranslation('deviceManagement')
  const { deviceKey } = Route.useParams()
  const [activeTab, setActiveTab] = useState('properties')
  const [visitedTabs, setVisitedTabs] = useState(['properties'])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setVisitedTabs((tabs) => (tabs.includes(value) ? tabs : [...tabs, value]))
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className='gap-4'>
      <TabsList className='mb-1 w-fit'>
        <TabsTrigger value='properties' className='px-4'>
          {t('deviceDetail.thingModelDataTab.properties')}
        </TabsTrigger>
        <TabsTrigger value='eventManagement' className='px-4'>
          {t('deviceDetail.thingModelDataTab.eventManagement')}
        </TabsTrigger>
        <TabsTrigger value='serviceInvocation' className='px-4'>
          {t('deviceDetail.thingModelDataTab.serviceInvocation')}
        </TabsTrigger>
      </TabsList>

      {/* Keep visited panels mounted so switching tabs preserves filters and query keys. */}
      <TabsContent
        forceMount
        value='properties'
        className='mt-0 data-[state=inactive]:hidden'
      >
        <PropertyTab />
      </TabsContent>
      <TabsContent
        forceMount
        value='eventManagement'
        className='mt-0 data-[state=inactive]:hidden'
      >
        {visitedTabs.includes('eventManagement') && (
          <DeviceEvents deviceKey={deviceKey} />
        )}
      </TabsContent>
      <TabsContent
        forceMount
        value='serviceInvocation'
        className='mt-0 data-[state=inactive]:hidden'
      >
        {visitedTabs.includes('serviceInvocation') && (
          <ServiceInvocationsTab deviceKey={deviceKey} />
        )}
      </TabsContent>
    </Tabs>
  )
}
