import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ChevronDown,
  Layers,
  Loader2,
  RotateCw,
  TrendingUp,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTelemetryHistorySeries } from '@/features/devices/api/telemetry'

interface PropertyHistoryChartProps {
  deviceKey: string
  availableProperties: Array<{
    identifier: string
    name?: string
    unit?: string
  }>
}

type TimeRangeKey = '1h' | '6h' | '24h' | '7d'

const TIME_RANGES: Record<TimeRangeKey, { durationMs: number }> = {
  '1h': { durationMs: 1 * 60 * 60 * 1000 },
  '6h': { durationMs: 6 * 60 * 60 * 1000 },
  '24h': { durationMs: 24 * 60 * 60 * 1000 },
  '7d': { durationMs: 7 * 24 * 60 * 60 * 1000 },
}

const SERIES_COLORS = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#db2777',
]

export function PropertyHistoryChart({
  deviceKey,
  availableProperties,
}: PropertyHistoryChartProps) {
  const { t } = useTranslation('deviceManagement')
  const [selectedProperties, setSelectedProperties] = useState<string[] | null>(
    null
  )
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('24h')
  const [historyEndTime, setHistoryEndTime] = useState(() => Date.now())

  const selectedIds =
    selectedProperties === null
      ? availableProperties[0]?.identifier
        ? [availableProperties[0].identifier]
        : []
      : selectedProperties
  const selected = availableProperties.filter((property) =>
    selectedIds.includes(property.identifier)
  )

  const historyQueries = useTelemetryHistorySeries(
    {
      deviceKey,
      properties: selected.map((property) => property.identifier),
      durationMs: TIME_RANGES[timeRange].durationMs,
      endTime: historyEndTime,
      limit: 500,
    },
    selected.length > 0
  )
  const isLoading = historyQueries.some((query) => query.isLoading)
  const isRefetching = historyQueries.some((query) => query.isRefetching)

  const handleManualRefresh = () => {
    setHistoryEndTime(Date.now())
  }

  // Merge numeric history points by timestamp so each selected property is a chart series.
  const { chartData, seriesStats } = useMemo(() => {
    const timeFmt = timeRange === '7d' ? 'MM-dd HH:mm' : 'HH:mm:ss'
    const merged = new Map<number, Record<string, number | string>>()
    const stats = selected.map((property, index) => {
      const query = historyQueries[index]
      const numericPoints = (query?.data || [])
        .map((point) => {
          if (point.timestamp == null || !Number.isFinite(point.timestamp)) {
            return null
          }
          const value =
            typeof point.value === 'number'
              ? point.value
              : typeof point.value === 'string'
                ? Number(point.value)
                : Number.NaN
          if (!Number.isFinite(value)) return null
          const timestamp = point.timestamp
          const row = merged.get(timestamp) || {
            timestamp,
            formattedTime: format(new Date(timestamp), timeFmt),
            fullTime: format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss'),
          }
          row[property.identifier] = value
          merged.set(timestamp, row)
          return { timestamp, value }
        })
        .filter((point): point is NonNullable<typeof point> => point !== null)
        .sort((a, b) => a.timestamp - b.timestamp)

      const values = numericPoints.map((point) => point.value)
      if (values.length === 0) {
        return {
          property,
          color: SERIES_COLORS[index % SERIES_COLORS.length],
          min: '--',
          max: '--',
          avg: '--',
          latest: '--',
          count: 0,
        }
      }
      const min = Math.min(...values)
      const max = Math.max(...values)
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length
      const latest = values[values.length - 1]

      return {
        property,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        min: Number(min.toFixed(2)),
        max: Number(max.toFixed(2)),
        avg: Number(avg.toFixed(2)),
        latest: Number(latest.toFixed(2)),
        count: values.length,
      }
    })
    return {
      chartData: [...merged.values()].sort(
        (a, b) => Number(a.timestamp) - Number(b.timestamp)
      ),
      seriesStats: stats,
    }
  }, [historyQueries, selected, timeRange])

  const chartConfig = Object.fromEntries(
    seriesStats.map((series) => [
      series.property.identifier,
      {
        label: series.property.name || series.property.identifier,
        color: series.color,
      },
    ])
  ) satisfies ChartConfig

  const toggleProperty = (identifier: string, checked: boolean) => {
    setSelectedProperties((current) => {
      const currentIds = current ?? selectedIds
      return checked
        ? [...new Set([...currentIds, identifier])]
        : currentIds.filter((id) => id !== identifier)
    })
    setHistoryEndTime(Date.now())
  }

  return (
    <Card className='shadow-xs'>
      <CardHeader className='pb-4'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <TrendingUp className='size-5 text-primary' />
              <CardTitle className='text-lg font-semibold'>
                {t('deviceDetail.propertyTab.historyTitle')}
              </CardTitle>
            </div>
            <CardDescription className='mt-1'>
              {t('deviceDetail.propertyTab.historyDescription')}
            </CardDescription>
          </div>

          {/* Chart controls. */}
          <div className='flex flex-wrap items-center gap-2'>
            {/* Property selector. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  className='h-8 min-w-36 justify-between text-xs'
                >
                  <span className='flex min-w-0 items-center'>
                    <Layers className='mr-1.5 size-3.5 shrink-0 text-muted-foreground' />
                    <span className='truncate'>
                      {selected.length === 1
                        ? selected[0].name || selected[0].identifier
                        : t('deviceDetail.propertyTab.selectedProperties', {
                            count: selected.length,
                          })}
                    </span>
                  </span>
                  <ChevronDown className='ml-2 size-3.5 shrink-0 text-muted-foreground' />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align='end'
                className='max-h-72 w-64 overflow-y-auto p-2'
              >
                <div className='mb-2 flex items-center justify-between px-2'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('deviceDetail.propertyTab.selectProperties')}
                  </span>
                  <button
                    type='button'
                    className='text-xs text-primary hover:underline'
                    onClick={() => {
                      setSelectedProperties(
                        availableProperties.map((p) => p.identifier)
                      )
                      setHistoryEndTime(Date.now())
                    }}
                  >
                    {t('deviceDetail.propertyTab.selectAll')}
                  </button>
                </div>
                {availableProperties.map((property) => (
                  <label
                    key={property.identifier}
                    className='flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent'
                  >
                    <Checkbox
                      checked={selectedIds.includes(property.identifier)}
                      onCheckedChange={(checked) =>
                        toggleProperty(property.identifier, checked === true)
                      }
                    />
                    <span className='min-w-0 flex-1 truncate'>
                      {property.name || property.identifier}
                    </span>
                    {property.unit && (
                      <span className='text-xs text-muted-foreground'>
                        {property.unit}
                      </span>
                    )}
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            <Select
              value={timeRange}
              onValueChange={(value) => {
                setTimeRange(value as TimeRangeKey)
                setHistoryEndTime(Date.now())
              }}
            >
              <SelectTrigger
                className='w-[160px] rounded-lg'
                aria-label={t('deviceDetail.propertyTab.timeRange')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-xl'>
                {(Object.keys(TIME_RANGES) as TimeRangeKey[]).map((key) => (
                  <SelectItem key={key} value={key} className='rounded-lg'>
                    {t(`deviceDetail.propertyTab.timeRanges.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Manual refresh. */}
            <Button
              size='icon'
              variant='outline'
              onClick={handleManualRefresh}
              disabled={isLoading || isRefetching}
              className='size-8'
            >
              <RotateCw
                className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {seriesStats.map((stats) => (
            <div
              key={stats.property.identifier}
              className='rounded-lg border bg-card p-3'
            >
              <div className='mb-2 flex items-center gap-2 text-sm font-medium'>
                <span
                  className='size-2.5 rounded-full'
                  style={{ backgroundColor: stats.color }}
                />
                <span className='truncate'>
                  {stats.property.name || stats.property.identifier}
                </span>
              </div>
              <div className='grid grid-cols-5 gap-2'>
                {[
                  [t('deviceDetail.propertyTab.latestValue'), stats.latest],
                  [t('deviceDetail.propertyTab.maxValue'), stats.max],
                  [t('deviceDetail.propertyTab.minValue'), stats.min],
                  [t('deviceDetail.propertyTab.avgValue'), stats.avg],
                  [t('deviceDetail.propertyTab.sampleCount'), stats.count],
                ].map(([label, value]) => (
                  <div key={label} className='min-w-0'>
                    <div className='truncate text-[10px] text-muted-foreground'>
                      {label}
                    </div>
                    <div className='truncate text-sm font-semibold'>
                      {value === '--'
                        ? value
                        : label === t('deviceDetail.propertyTab.sampleCount')
                          ? `${value} ${t('deviceDetail.propertyTab.pointsUnit')}`
                          : `${value}${stats.property.unit ? ` ${stats.property.unit}` : ''}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && chartData.length === 0 ? (
          <div className='flex h-[320px] w-full items-center justify-center'>
            <Loader2 className='size-6 animate-spin text-muted-foreground' />
          </div>
        ) : chartData.length === 0 ? (
          <div className='flex h-[320px] w-full flex-col items-center justify-center rounded-md border border-dashed p-8 text-center'>
            <TrendingUp className='size-10 text-muted-foreground/40' />
            <p className='mt-2 font-medium text-muted-foreground'>
              {selected.length === 0
                ? t('deviceDetail.propertyTab.noPropertiesSelected')
                : t('deviceDetail.propertyTab.noHistoryData')}
            </p>
            <p className='mt-1 text-xs text-muted-foreground/70'>
              {t('deviceDetail.propertyTab.noHistoryDataDescription')}
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className='aspect-auto h-[300px] w-full'
          >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12, top: 10, bottom: 4 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray='3 3'
                className='stroke-muted/40'
              />
              <XAxis
                dataKey='formattedTime'
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={40}
                stroke='var(--muted-foreground)'
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke='var(--muted-foreground)'
                fontSize={11}
                domain={['auto', 'auto']}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className='w-[160px]'
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullTime || ''
                    }
                    formatter={(value, name) => {
                      const unit = selected.find(
                        (p) => p.identifier === name
                      )?.unit
                      return `${value}${unit ? ` ${unit}` : ''}`
                    }}
                  />
                }
              />
              <Legend />
              {seriesStats.map((series) => (
                <Line
                  key={series.property.identifier}
                  type='monotone'
                  dataKey={series.property.identifier}
                  name={series.property.name || series.property.identifier}
                  stroke={series.color}
                  strokeWidth={2}
                  connectNulls
                  dot={chartData.length <= 25 ? { r: 3 } : false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
