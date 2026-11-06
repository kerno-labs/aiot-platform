import { useState } from 'react'
import { format, subDays } from 'date-fns'
import {
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Play, RefreshCw, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { DataTablePagination } from '@/components/data-table'
import {
  DateTimeRangePicker,
  type DateTimeRangeValue,
} from '@/components/date-time-range-picker'
import {
  type DeviceServiceInvocation,
  type GetDevicesDeviceKeyThingModelServiceInvocationsParams,
  useInvokeDeviceService,
  useServiceInvocations,
} from '../../api/service-invocations'

type TimeRange = DateTimeRangeValue

const defaultRange = (): TimeRange => ({
  startAt: subDays(new Date(), 7),
  endAt: new Date(),
})
const toFilters = (
  serviceIdentifier = '',
  range = defaultRange(),
  page = 1,
  pageSize = 20
): GetDevicesDeviceKeyThingModelServiceInvocationsParams => ({
  serviceIdentifier: serviceIdentifier || undefined,
  startAt: range.startAt
    ? format(range.startAt, 'yyyy-MM-dd HH:mm:ss')
    : undefined,
  endAt: range.endAt ? format(range.endAt, 'yyyy-MM-dd HH:mm:ss') : undefined,
  page,
  pageSize,
})

export function ServiceInvocationsTab({ deviceKey }: { deviceKey: string }) {
  'use no memo'

  const { t } = useTranslation(['deviceManagement', 'common'])
  const [identifier, setIdentifier] = useState('')
  const [range, setRange] = useState<TimeRange>(defaultRange)
  const [filters, setFilters] = useState(() => toFilters())
  const [selected, setSelected] = useState<{
    title: string
    value?: string
  } | null>(null)
  const [invokeOpen, setInvokeOpen] = useState(false)
  const [invokeIdentifier, setInvokeIdentifier] = useState('')
  const [invokeParams, setInvokeParams] = useState('{}')

  const { data, isLoading, isError, refetch } = useServiceInvocations(
    deviceKey,
    filters
  )
  const invokeMutation = useInvokeDeviceService(deviceKey)

  // TanStack Table's mutable instance must stay outside compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.invocations || [],
    columns: [],
    state: {
      pagination: {
        pageIndex: (filters.page || 1) - 1,
        pageSize: filters.pageSize || 20,
      },
    },
    pageCount: Math.max(
      1,
      Math.ceil((data?.total || 0) / (filters.pageSize || 20))
    ),
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, {
        pageIndex: (filters.page || 1) - 1,
        pageSize: filters.pageSize || 20,
      })
      setFilters((current) => ({
        ...current,
        page: next.pageSize !== current.pageSize ? 1 : next.pageIndex + 1,
        pageSize: next.pageSize,
      }))
    },
    getCoreRowModel: getCoreRowModel(),
  })
  const apply = () =>
    setFilters(toFilters(identifier, range, 1, filters.pageSize))
  const reset = () => {
    const nextRange = defaultRange()
    setIdentifier('')
    setRange(nextRange)
    setFilters(toFilters('', nextRange))
  }
  const handleInvoke = async () => {
    const trimmedId = invokeIdentifier.trim()
    if (!trimmedId) {
      toast.error(
        t('deviceDetail.serviceInvocations.invoke.identifierRequired')
      )
      return
    }
    const trimmedParams = invokeParams.trim() || '{}'
    try {
      const parsed = JSON.parse(trimmedParams)
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        toast.error(t('deviceDetail.serviceInvocations.invoke.invalidJson'))
        return
      }
    } catch {
      toast.error(t('deviceDetail.serviceInvocations.invoke.invalidJson'))
      return
    }
    try {
      await invokeMutation.mutateAsync({
        deviceKey,
        serviceIdentifier: trimmedId,
        data: { inputParams: trimmedParams },
      })
      toast.success(t('deviceDetail.serviceInvocations.invoke.success'))
      setInvokeOpen(false)
      setInvokeIdentifier('')
      setInvokeParams('{}')
      refetch()
    } catch {
      toast.error(t('deviceDetail.serviceInvocations.invoke.error'))
    }
  }

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-2xl font-bold tracking-tight'>
          {t('deviceDetail.thingModelDataTab.serviceInvocation')}
        </h2>
        <Button size='sm' onClick={() => setInvokeOpen(true)}>
          <Play className='size-4' />
          {t('deviceDetail.serviceInvocations.invoke.button')}
        </Button>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && apply()}
          placeholder={t(
            'deviceDetail.serviceInvocations.filters.serviceIdentifier'
          )}
          className='h-9 w-56'
        />
        <DateTimeRangePicker
          value={range}
          onChange={setRange}
          placeholder={t('deviceDetail.serviceInvocations.filters.dateRange')}
          startAtLabel={t('deviceDetail.serviceInvocations.filters.startAt')}
          endAtLabel={t('deviceDetail.serviceInvocations.filters.endAt')}
          timePrecisionLabel={t(
            'deviceDetail.serviceInvocations.filters.timePrecision'
          )}
          className='h-9'
        />
        <Button size='sm' onClick={apply}>
          <Search className='size-4' />
          {t('common:search')}
        </Button>
        <Button variant='outline' size='sm' onClick={() => refetch()}>
          <RefreshCw className='size-4' />
          {t('common:refresh')}
        </Button>
        <Button variant='ghost' size='sm' onClick={reset}>
          {t('common:reset')}
        </Button>
      </div>
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'invokedAt',
                'serviceIdentifier',
                'serviceName',
                'status',
                'inputParams',
                'outputParams',
              ].map((key) => (
                <TableHead key={key}>
                  {key === 'status'
                    ? t('common:status')
                    : t(`deviceDetail.serviceInvocations.columns.${key}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: filters.pageSize || 20 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-destructive'
                >
                  {t('common:loadError')}
                </TableCell>
              </TableRow>
            ) : (data?.invocations || []).length ? (
              data!.invocations!.map((item) => (
                <InvocationRow
                  key={item.uuid}
                  item={item}
                  onView={setSelected}
                />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-muted-foreground'
                >
                  {t('deviceDetail.serviceInvocations.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          <pre className='max-h-[60vh] overflow-auto rounded-md bg-muted p-4 text-xs'>
            {formatJSON(selected?.value)}
          </pre>
        </DialogContent>
      </Dialog>
      <Dialog open={invokeOpen} onOpenChange={setInvokeOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {t('deviceDetail.serviceInvocations.invoke.title')}
            </DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label htmlFor='service-identifier'>
                {t('deviceDetail.serviceInvocations.filters.serviceIdentifier')}
              </Label>
              <Input
                id='service-identifier'
                value={invokeIdentifier}
                onChange={(event) => setInvokeIdentifier(event.target.value)}
                placeholder={t(
                  'deviceDetail.serviceInvocations.invoke.serviceIdentifierPlaceholder'
                )}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='service-input-params'>
                {t('deviceDetail.serviceInvocations.invoke.inputParams')}
              </Label>
              <Textarea
                id='service-input-params'
                value={invokeParams}
                onChange={(event) => setInvokeParams(event.target.value)}
                placeholder={t(
                  'deviceDetail.serviceInvocations.invoke.inputParamsPlaceholder'
                )}
                rows={4}
                className='font-mono text-xs'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setInvokeOpen(false)}
              disabled={invokeMutation.isPending}
            >
              {t('common:cancel')}
            </Button>
            <Button onClick={handleInvoke} disabled={invokeMutation.isPending}>
              {invokeMutation.isPending
                ? t('deviceDetail.serviceInvocations.invoke.submitting')
                : t('deviceDetail.serviceInvocations.invoke.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function deriveInvocationStatus(
  outputParams?: string
): 'pending' | 'success' | 'failed' {
  if (!outputParams || !outputParams.trim()) {
    return 'pending'
  }
  try {
    const parsed = JSON.parse(outputParams) as { code?: unknown }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.code === 'number' &&
      parsed.code !== 0 &&
      parsed.code !== 200
    ) {
      return 'failed'
    }
  } catch {
    // Non-envelope JSON output indicates a replied payload.
  }
  return 'success'
}

function InvocationRow({
  item,
  onView,
}: {
  item: DeviceServiceInvocation
  onView: (value: { title: string; value?: string }) => void
}) {
  const { t } = useTranslation('deviceManagement')
  const status = deriveInvocationStatus(item.outputParams)
  const jsonCell = (title: string, value?: string) => (
    <button
      type='button'
      className='block max-w-72 truncate font-mono text-sm text-muted-foreground hover:underline'
      onClick={() => onView({ title, value })}
    >
      {value || '-'}
    </button>
  )
  return (
    <TableRow>
      <TableCell className='whitespace-nowrap'>
        {item.invokedAt || '-'}
      </TableCell>
      <TableCell className='font-mono text-sm'>
        {item.serviceIdentifier}
      </TableCell>
      <TableCell>{item.serviceName}</TableCell>
      <TableCell>
        <Badge
          variant={
            status === 'success'
              ? 'default'
              : status === 'failed'
                ? 'destructive'
                : 'secondary'
          }
        >
          {t(`deviceDetail.serviceInvocations.status.${status}`)}
        </Badge>
      </TableCell>
      <TableCell>
        {jsonCell(
          t('deviceDetail.serviceInvocations.columns.inputParams'),
          item.inputParams
        )}
      </TableCell>
      <TableCell>
        {jsonCell(
          t('deviceDetail.serviceInvocations.columns.outputParams'),
          item.outputParams
        )}
      </TableCell>
    </TableRow>
  )
}

function formatJSON(value?: string) {
  if (!value) return '-'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}
