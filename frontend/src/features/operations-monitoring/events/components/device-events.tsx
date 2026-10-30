import { useEffect, useState } from 'react'
import { endOfDay, format, startOfDay, subDays } from 'date-fns'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AlertTriangle, CalendarDays, RefreshCw, Search } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTablePagination,
  DataTableViewOptions,
} from '@/components/data-table'
import {
  deviceEventKeys,
  type DeviceEvent,
  type GetDeviceEventsParams,
  useDeviceEvents,
} from '../api/queries'
import { EventsBulkActions } from './events-bulk-actions'
import { EventsRowActions } from './events-row-actions'

const pageSize = 20
const defaultDateRange = () => {
  const today = new Date()
  return {
    from: startOfDay(subDays(today, 6)),
    to: endOfDay(today),
  }
}

type EventFiltersDraft = {
  keyword: string
  eventType: string
  dateRange: DateRange | undefined
}

const defaultDraft: EventFiltersDraft = {
  keyword: '',
  eventType: '',
  dateRange: defaultDateRange(),
}

const buildFilters = (
  draft: EventFiltersDraft,
  deviceKey?: string,
  pageSizeOverride?: number
): GetDeviceEventsParams => {
  const range = draft.dateRange
  return {
    page: 1,
    pageSize: pageSizeOverride || pageSize,
    deviceKey,
    keyword: draft.keyword || undefined,
    eventType: draft.eventType || undefined,
    startAt: range?.from ? startOfDay(range.from).getTime() : undefined,
    endAt: range?.to ? endOfDay(range.to).getTime() : undefined,
  }
}

export function DeviceEvents({ deviceKey }: { deviceKey?: string }) {
  const { t } = useTranslation('operationsMonitoring')
  const [draft, setDraft] = useState<EventFiltersDraft>(defaultDraft)
  const [filters, setFilters] = useState<GetDeviceEventsParams>(() =>
    buildFilters(defaultDraft, deviceKey)
  )

  useEffect(() => {
    setDraft(defaultDraft)
    setFilters(buildFilters(defaultDraft, deviceKey))
  }, [deviceKey])
  const isFiltered = Boolean(
    draft.keyword ||
    draft.eventType ||
    draft.dateRange?.from?.toDateString() !==
      defaultDraft.dateRange?.from?.toDateString() ||
    draft.dateRange?.to?.toDateString() !==
      defaultDraft.dateRange?.to?.toDateString()
  )
  const [selectedEvent, setSelectedEvent] = useState<DeviceEvent | null>(null)
  const { data, isLoading, isError, refetch } = useDeviceEvents(filters)
  const queryClient = useQueryClient()
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const columns: ColumnDef<DeviceEvent>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(event) => event.stopPropagation()}
          aria-label='Select row'
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'eventAt',
      header: t('events.columns.eventAt'),
      cell: ({ row }) => (
        <span className='whitespace-nowrap'>
          {row.original.eventAt
            ? format(new Date(row.original.eventAt), 'yyyy-MM-dd HH:mm:ss')
            : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'deviceName',
      header: t('events.columns.deviceName'),
      cell: ({ row }) => row.original.deviceName || row.original.deviceKey,
    },
    {
      accessorKey: 'deviceKey',
      header: t('events.columns.deviceKey'),
      cell: ({ row }) => (
        <span className='font-mono text-sm'>{row.original.deviceKey}</span>
      ),
    },
    {
      accessorKey: 'eventType',
      header: t('events.columns.eventType'),
      cell: ({ row }) => (
        <span className='rounded-full bg-muted px-2 py-1 font-mono text-sm'>
          {row.original.eventType}
        </span>
      ),
    },
    {
      accessorKey: 'data',
      header: t('events.columns.data'),
      cell: ({ row }) => (
        <span
          className='block max-w-80 cursor-pointer truncate font-mono text-sm text-muted-foreground hover:underline'
          onClick={(event) => {
            event.stopPropagation()
            setSelectedEvent(row.original)
          }}
        >
          {row.original.data || '{}'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-center'>{t('common:actions')}</div>,
      cell: ({ row }) => <EventsRowActions row={row} />,
      enableHiding: false,
    },
  ]
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.events || [],
    columns,
    state: {
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.pageSize ?? pageSize,
      },
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    pageCount: Math.max(
      1,
      Math.ceil((data?.total || 0) / (filters.pageSize ?? pageSize))
    ),
    onPaginationChange: (updater) => {
      const pagination = functionalUpdate(updater, {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.pageSize ?? pageSize,
      })
      setFilters((current: GetDeviceEventsParams) => ({
        ...current,
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      }))
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })
  const applySearch = () => {
    setFilters((current: GetDeviceEventsParams) =>
      buildFilters(draft, deviceKey, current.pageSize)
    )
    queryClient.invalidateQueries({ queryKey: deviceEventKeys.all })
  }
  const handleRefresh = () =>
    queryClient.invalidateQueries({ queryKey: deviceEventKeys.all })
  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>
          {t('events.title')}
        </h2>
      </div>

      <div className='flex items-start justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            value={draft.keyword}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
            onKeyDown={(event) => event.key === 'Enter' && applySearch()}
            placeholder={t('events.filters.keyword')}
            className='h-9 w-full sm:w-56'
          />
          <Input
            value={draft.eventType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                eventType: event.target.value,
              }))
            }
            onKeyDown={(event) => event.key === 'Enter' && applySearch()}
            placeholder={t('events.filters.eventType')}
            className='h-9 w-full sm:w-44'
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className='h-9 w-full justify-start font-normal sm:w-64'
              >
                <CalendarDays className='size-4 text-muted-foreground' />
                {draft.dateRange?.from
                  ? draft.dateRange.to
                    ? `${format(draft.dateRange.from, 'yyyy-MM-dd')} ~ ${format(draft.dateRange.to, 'yyyy-MM-dd')}`
                    : format(draft.dateRange.from, 'yyyy-MM-dd')
                  : t('events.filters.dateRange')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='range'
                defaultMonth={draft.dateRange?.from}
                selected={draft.dateRange}
                onSelect={(range) => {
                  setDraft((current) => ({ ...current, dateRange: range }))
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant='default' size='sm' onClick={applySearch}>
            <Search className='size-4' />
            {t('common:search')}
          </Button>
          {isFiltered && (
            <Button
              variant='ghost'
              className='h-8 px-2 lg:px-3'
              onClick={() => {
                setDraft(defaultDraft)
                setFilters(buildFilters(defaultDraft, deviceKey))
              }}
            >
              {t('common:reset')}
              <Cross2Icon className='ms-2 h-4 w-4' />
            </Button>
          )}
          <Button variant='outline' size='sm' onClick={handleRefresh}>
            <RefreshCw className='size-4' />
            {t('common:refresh')}
          </Button>
        </div>
        <DataTableViewOptions
          table={table}
          labels={{
            view: t('common:view'),
            toggleColumns: t('events.viewOptions.toggleColumns'),
            columns: {
              eventAt: t('events.columns.eventAt'),
              deviceName: t('events.columns.deviceName'),
              deviceKey: t('events.columns.deviceKey'),
              eventType: t('events.columns.eventType'),
              data: t('events.columns.data'),
            },
          }}
        />
      </div>

      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={table.getVisibleLeafColumns().length}>
                    <Skeleton className='h-5 w-full' />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className='h-32 text-center'
                >
                  <div className='flex flex-col items-center gap-2'>
                    <AlertTriangle className='size-6 text-destructive' />
                    <span>{t('events.error')}</span>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => refetch()}
                    >
                      {t('events.retry')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className='h-24 text-center text-muted-foreground'
                >
                  {t('events.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} className='mt-auto' />

      <EventsBulkActions table={table} />

      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{t('events.detail.title')}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.eventType} ·{' '}
              {selectedEvent?.deviceName || selectedEvent?.deviceKey}
            </DialogDescription>
          </DialogHeader>
          <pre className='max-h-[60vh] overflow-auto rounded-md bg-muted p-4 text-xs'>
            {formatEventData(selectedEvent?.data)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatEventData(data?: string) {
  if (!data) return '{}'
  try {
    return JSON.stringify(JSON.parse(data), null, 2)
  } catch {
    return data
  }
}
