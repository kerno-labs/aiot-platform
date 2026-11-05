import { useState, useMemo } from 'react'
import { Cross2Icon, DotsHorizontalIcon } from '@radix-ui/react-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type Updater,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  deleteDeviceGroupsGroupUuidDevices,
  getDeviceGroupsGroupUuidDevices,
  getProducts,
} from '@/api/generated'
import type {
  Device as DeviceV1Device,
  AiotBackendApiV1DeviceGroup as DeviceGroupV1Group,
} from '@/api/generated/model'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTableBulkActions as BulkActionsToolbar,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableViewOptions,
} from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { deviceStateKey, deviceStateStyles } from '@/features/devices/data/data'
import { DEVICE_STATE, type DeviceState } from '@/features/devices/data/schema'
import { AddDevicesDialog } from './add-devices-dialog'

interface GroupDevicesTabProps {
  group: DeviceGroupV1Group
  onDevicesUpdated?: () => void
}

export function GroupDevicesTab({
  group,
  onDevicesUpdated,
}: GroupDevicesTabProps) {
  const { t } = useTranslation('deviceGroup')
  const { t: tDevice } = useTranslation('deviceManagement')
  const { t: tCommon } = useTranslation('common')
  const queryClient = useQueryClient()

  // Search & filter states
  const [searchInput, setSearchInput] = useState('')
  const [selectedProductKey, setSelectedProductKey] = useState<string>('all')
  const [appliedSearchText, setAppliedSearchText] = useState('')
  const [appliedProductKeys, setAppliedProductKeys] = useState<string[]>([])

  // Local table state
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState<boolean>(false)
  const [targetKeysToRemove, setTargetKeysToRemove] = useState<string[]>([])

  // Fetch products for filter dropdown
  const { data: productsData } = useQuery({
    queryKey: ['products-for-group-table-filter'],
    queryFn: () => getProducts({ page: 1, pageSize: 100 }),
  })
  const products = productsData?.data?.products || []

  // Handlers for search and refresh
  const handleSearch = () => {
    const pKeys =
      selectedProductKey && selectedProductKey !== 'all'
        ? [selectedProductKey]
        : []
    setAppliedProductKeys(pKeys)
    setAppliedSearchText(searchInput.trim())
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    void queryClient.invalidateQueries({
      queryKey: ['device-group', group.groupUuid, 'devices'],
    })
  }

  const handleReset = () => {
    setSearchInput('')
    setSelectedProductKey('all')
    setAppliedProductKeys([])
    setAppliedSearchText('')
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    void queryClient.invalidateQueries({
      queryKey: ['device-group', group.groupUuid, 'devices'],
    })
  }

  const handleRefresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ['device-group', group.groupUuid, 'devices'],
    })
  }

  // Query group devices
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      'device-group',
      group.groupUuid,
      'devices',
      pagination.pageIndex + 1,
      pagination.pageSize,
      appliedProductKeys,
      appliedSearchText,
    ],
    queryFn: () =>
      getDeviceGroupsGroupUuidDevices(group.groupUuid || '', {
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        productKeys:
          appliedProductKeys.length > 0
            ? appliedProductKeys.join(',')
            : undefined,
        search: appliedSearchText || undefined,
      }),
    enabled: !!group.groupUuid,
  })

  const devices: DeviceV1Device[] = useMemo(() => {
    return response?.data?.devices || []
  }, [response])

  const total = response?.data?.total || 0
  const pageCount = useMemo(() => {
    if (!total) {
      return devices.length > 0
        ? Math.max(1, Math.ceil(devices.length / pagination.pageSize))
        : 1
    }
    return Math.ceil(total / pagination.pageSize)
  }, [total, pagination.pageSize, devices.length])

  // Mutation for removing devices from manual group
  const removeMutation = useMutation({
    mutationFn: (keys: string[]) =>
      deleteDeviceGroupsGroupUuidDevices(group.groupUuid || '', {
        deviceKeys: keys,
      }),
    onSuccess: () => {
      toast.success(t('removeSuccess'))
      setRowSelection({})
      setTargetKeysToRemove([])
      setRemoveConfirmOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['device-group', group.groupUuid, 'devices'],
      })
      queryClient.invalidateQueries({
        queryKey: ['device-group', group.groupUuid, 'devices-count'],
      })
      onDevicesUpdated?.()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, tCommon('deleteError')))
    },
  })

  const handleSingleRemove = (deviceKey: string) => {
    setTargetKeysToRemove([deviceKey])
    setRemoveConfirmOpen(true)
  }

  // Define columns matching standard devices table
  const columns = useMemo<ColumnDef<DeviceV1Device>[]>(() => {
    const isManual = group.type !== 'dynamic'
    const cols: ColumnDef<DeviceV1Device>[] = []

    if (isManual) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label='Select all'
            className='translate-y-[2px]'
          />
        ),
        meta: {
          className: cn('max-md:sticky start-0 z-10 rounded-tl-[inherit]'),
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label='Select row'
            className='translate-y-[2px]'
          />
        ),
        enableSorting: false,
        enableHiding: false,
      })
    }

    cols.push(
      {
        accessorKey: 'deviceKey',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={tDevice('devices.columns.deviceKey')}
          />
        ),
        cell: ({ row }) => (
          <Link
            to='/device-management/devices/$deviceKey'
            params={{ deviceKey: row.original.deviceKey || '' }}
            className='hover:underline'
          >
            <LongText className='max-w-36 ps-3 font-mono text-sm'>
              {row.getValue('deviceKey')}
            </LongText>
          </Link>
        ),
        meta: {
          className: cn(
            'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
            'ps-0.5 max-md:sticky start-6 @4xl/content:table-cell @4xl/content:drop-shadow-none'
          ),
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={tDevice('devices.columns.name')}
          />
        ),
        cell: ({ row }) => (
          <Link
            to='/device-management/devices/$deviceKey'
            params={{ deviceKey: row.original.deviceKey || '' }}
            className='hover:underline'
          >
            <LongText className='max-w-48 font-medium'>
              {row.getValue('name')}
            </LongText>
          </Link>
        ),
        meta: { className: 'w-48' },
        enableSorting: false,
      },
      {
        accessorKey: 'productName',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={tDevice('devices.columns.product')}
          />
        ),
        filterFn: (row, _id, value: string[]) => {
          return value.includes(row.original.productKey || '')
        },
        cell: ({ row }) => {
          const productName = row.getValue('productName') as string | undefined
          return (
            <LongText className='max-w-40'>
              {productName || (
                <span className='text-muted-foreground'>
                  {tDevice('devices.unknown')}
                </span>
              )}
            </LongText>
          )
        },
        meta: { className: 'w-40' },
        enableSorting: false,
      },
      {
        accessorKey: 'state',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={tCommon('status')} />
        ),
        cell: ({ row }) => {
          const state = (row.getValue('state') ??
            DEVICE_STATE.INACTIVE) as DeviceState
          const stateStyles = deviceStateStyles.get(state)
          const stateKey = deviceStateKey(state)
          return (
            <Badge variant='outline' className={cn('capitalize', stateStyles)}>
              {tDevice(`devices.state.${stateKey}`)}
            </Badge>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'lastOnlineTime',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={tDevice('devices.columns.lastOnline')}
          />
        ),
        cell: ({ row }) => {
          const time = row.getValue('lastOnlineTime') as string | undefined
          return (
            <LongText className='max-w-40 text-sm'>
              {time || (
                <span className='text-muted-foreground'>
                  {tDevice('devices.never')}
                </span>
              )}
            </LongText>
          )
        },
        enableSorting: false,
      }
    )

    if (isManual) {
      cols.push({
        id: 'actions',
        header: () => <div className='text-center'>{tCommon('actions')}</div>,
        cell: ({ row }) => {
          const device = row.original
          return (
            <div className='flex justify-center'>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
                  >
                    <DotsHorizontalIcon className='h-4 w-4' />
                    <span className='sr-only'>{tCommon('actions')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-[160px]'>
                  <DropdownMenuItem
                    onClick={() =>
                      device.deviceKey && handleSingleRemove(device.deviceKey)
                    }
                    className='text-red-500!'
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    {t('removeFromGroup')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        meta: {
          className: cn(
            'sticky end-0 z-10 bg-background',
            'shadow-[-4px_0_6px_-2px_rgb(0_0_0_/_0.05)] dark:shadow-[-4px_0_6px_-2px_rgb(0_0_0_/_0.3)]'
          ),
        },
        enableHiding: false,
      })
    }

    return cols
  }, [group.type, t, tDevice, tCommon])

  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    setPagination((old) => {
      const newPagination =
        typeof updater === 'function' ? updater(old) : updater
      if (newPagination.pageSize !== old.pageSize && total) {
        const newPageCount = Math.ceil(total / newPagination.pageSize)
        if (newPagination.pageIndex >= newPageCount) {
          return { ...newPagination, pageIndex: 0 }
        }
      }
      return newPagination
    })
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: devices,
    columns,
    pageCount,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: group.type !== 'dynamic',
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: handlePaginationChange,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const existingKeys = useMemo(
    () => devices.map((d) => d.deviceKey).filter(Boolean) as string[],
    [devices]
  )

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-1 flex-wrap items-center gap-2'>
          <Input
            placeholder={t('searchDevicePlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className='h-8 w-[180px] lg:w-[240px]'
          />
          <Select
            value={selectedProductKey}
            onValueChange={(val) => setSelectedProductKey(val)}
          >
            <SelectTrigger className='h-8 w-[160px] lg:w-[180px]'>
              <SelectValue placeholder={t('productName')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('allProducts')}</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.productKey} value={p.productKey || ''}>
                  {p.name || p.productKey}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant='default'
            size='sm'
            onClick={handleSearch}
            className='h-8'
          >
            <Search className='size-4' />
            {tCommon('search')}
          </Button>
          {(appliedSearchText ||
            appliedProductKeys.length > 0 ||
            searchInput ||
            (selectedProductKey && selectedProductKey !== 'all')) && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleReset}
              className='h-8 px-2 lg:px-3'
            >
              {tCommon('reset')}
              <Cross2Icon className='ms-2 h-4 w-4' />
            </Button>
          )}
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            className='h-8'
          >
            <RefreshCw className='size-4' />
            {tCommon('refresh')}
          </Button>
        </div>
        <div className='flex items-center gap-2'>
          <DataTableViewOptions table={table} />
          {group.type !== 'dynamic' && (
            <Button
              className='flex items-center gap-1.5'
              size='sm'
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className='h-4 w-4' />
              <span>{t('addDevice')}</span>
            </Button>
          )}
        </div>
      </div>

      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
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
              Array.from({ length: pagination.pageSize }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className='h-6 w-full' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-destructive'
                >
                  Error loading devices. Please try again.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='group/row'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
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
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  {t('noDevicesFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} className='mt-auto' />

      {group.type !== 'dynamic' && (
        <>
          <BulkActionsToolbar table={table}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='destructive'
                  size='icon'
                  onClick={() => {
                    const selected = table
                      .getFilteredSelectedRowModel()
                      .rows.map((r) => r.original.deviceKey)
                      .filter(Boolean) as string[]
                    setTargetKeysToRemove(selected)
                    setRemoveConfirmOpen(true)
                  }}
                  className='size-8'
                  aria-label={t('batchRemoveFromGroup')}
                  title={t('batchRemoveFromGroup')}
                >
                  <Trash2 className='size-4' />
                  <span className='sr-only'>{t('batchRemoveFromGroup')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('batchRemoveFromGroup')}</p>
              </TooltipContent>
            </Tooltip>
          </BulkActionsToolbar>

          <ConfirmDialog
            open={removeConfirmOpen}
            onOpenChange={setRemoveConfirmOpen}
            title={t('removeFromGroup')}
            desc={t('removeConfirm')}
            confirmText={t('common:delete')}
            cancelBtnText={t('common:cancel')}
            destructive
            handleConfirm={() => removeMutation.mutate(targetKeysToRemove)}
            isLoading={removeMutation.isPending}
          />

          {group.groupUuid && (
            <AddDevicesDialog
              open={addDialogOpen}
              onOpenChange={setAddDialogOpen}
              groupUuid={group.groupUuid}
              existingDeviceKeys={existingKeys}
            />
          )}
        </>
      )}
    </div>
  )
}
