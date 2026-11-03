import { format } from 'date-fns'
import { Route } from '@/routes/_authenticated/device-management/devices/$deviceKey'
import { Database, Loader2, Radio, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ThingModelProperty } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useThingModelProperties } from '@/features/devices/api/telemetry'
import { PropertyHistoryChart } from './properties/property-history-chart'

export function PropertyTab() {
  const { deviceKey } = Route.useParams()
  const { t } = useTranslation('deviceManagement')

  const {
    data: properties,
    isLoading: isPropertiesLoading,
    isRefetching,
    refetch,
  } = useThingModelProperties(deviceKey)
  const propertyList = (properties || []).filter(
    (property): property is ThingModelProperty & { identifier: string } =>
      Boolean(property.identifier)
  )

  return (
    <div className='flex flex-col gap-6'>
      <Card className='shadow-xs'>
        <CardHeader className='pb-4'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <div className='flex items-center gap-2'>
                <Radio className='size-5 animate-pulse text-emerald-500' />
                <CardTitle className='text-lg font-semibold'>
                  {t('deviceDetail.propertyTab.snapshotTitle')}
                </CardTitle>
              </div>
              <CardDescription className='mt-1'>
                {t('deviceDetail.propertyTab.snapshotDescription')}
              </CardDescription>
            </div>

            <div className='flex items-center gap-3'>
              <Button
                size='icon'
                variant='outline'
                onClick={() => refetch()}
                disabled={isPropertiesLoading || isRefetching}
                className='size-8'
                aria-label={t('deviceDetail.propertyTab.refresh')}
              >
                <RotateCw
                  className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isPropertiesLoading && !properties ? (
            <div className='flex h-32 items-center justify-center'>
              <Loader2 className='size-6 animate-spin text-muted-foreground' />
            </div>
          ) : propertyList.length === 0 ? (
            <div className='flex h-32 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground'>
              <Database className='size-8 text-muted-foreground/40' />
              <p className='mt-2 text-sm'>
                {t('deviceDetail.propertyTab.noData')}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {propertyList.map((prop) => {
                const isBool = typeof prop.value === 'boolean'
                const isObj =
                  typeof prop.value === 'object' && prop.value !== null

                return (
                  <div
                    key={prop.identifier}
                    className='relative flex flex-col justify-between rounded-xl border bg-card/60 p-4 transition-all hover:border-primary/40 hover:shadow-xs'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <div className='text-sm font-medium'>{prop.name}</div>
                        <div className='mt-0.5 text-[11px] text-muted-foreground'>
                          {t('deviceDetail.propertyTab.dataType')}:{' '}
                          {prop.dataType}
                        </div>
                      </div>
                      <Badge
                        variant='outline'
                        className='font-mono text-[10px] text-muted-foreground'
                      >
                        {prop.identifier}
                      </Badge>
                    </div>

                    <div className='my-4 flex items-baseline gap-1.5'>
                      {prop.value === undefined || prop.value === null ? (
                        <span className='text-sm text-muted-foreground'>
                          {t('deviceDetail.propertyTab.notReported')}
                        </span>
                      ) : isBool ? (
                        <Badge
                          variant={prop.value ? 'default' : 'secondary'}
                          className='px-2 py-0.5 text-xs'
                        >
                          {prop.value ? 'true' : 'false'}
                        </Badge>
                      ) : isObj ? (
                        <pre className='max-h-16 overflow-auto font-mono text-xs text-muted-foreground'>
                          {JSON.stringify(prop.value)}
                        </pre>
                      ) : (
                        <span className='text-2xl font-bold tracking-tight text-foreground'>
                          {String(prop.value)}
                        </span>
                      )}
                    </div>

                    <div className='space-y-1 text-[11px] text-muted-foreground'>
                      <div>
                        {t('deviceDetail.propertyTab.unit')}: {prop.unit || '-'}{' '}
                        · {t('deviceDetail.propertyTab.accessMode')}:{' '}
                        {t(
                          `deviceDetail.propertyTab.accessModes.${prop.accessMode || 'r'}`
                        )}
                      </div>
                      <div>
                        {t('deviceDetail.propertyTab.reportedAt')}:{' '}
                        {prop.reportedAt
                          ? format(
                              new Date(prop.reportedAt),
                              'yyyy-MM-dd HH:mm:ss'
                            )
                          : t('deviceDetail.propertyTab.notReported')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {propertyList.length > 0 && (
        <PropertyHistoryChart
          deviceKey={deviceKey}
          availableProperties={propertyList}
        />
      )}
    </div>
  )
}
