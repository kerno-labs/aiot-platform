import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { deviceStateKey, deviceStateStyles } from '../data/data'
import { type Device, type DeviceState } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { DeviceEnabledSwitch } from './device-enabled-switch'

export const useDevicesColumns = (): ColumnDef<Device>[] => {
  const { t } = useTranslation(['deviceManagement', 'common'])

  return [
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
    },
    {
      accessorKey: 'deviceKey',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('devices.columns.deviceKey')}
        />
      ),
      cell: ({ row }) => (
        <Link
          to='/device-management/devices/$deviceKey'
          params={{ deviceKey: row.original.deviceKey }}
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
          title={t('devices.columns.name')}
        />
      ),
      cell: ({ row }) => (
        <Link
          to='/device-management/devices/$deviceKey'
          params={{ deviceKey: row.original.deviceKey }}
          className='hover:underline'
        >
          <LongText className='max-w-48'>{row.getValue('name')}</LongText>
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
          title={t('devices.columns.product')}
        />
      ),
      cell: ({ row }) => {
        const productName = row.getValue('productName') as string | undefined
        return (
          <LongText className='max-w-40'>
            {productName || (
              <span className='text-muted-foreground'>
                {t('devices.unknown')}
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
        <DataTableColumnHeader
          column={column}
          title={t('devices.columns.state')}
        />
      ),
      cell: ({ row }) => {
        const state = row.getValue('state') as DeviceState
        const stateStyles = deviceStateStyles.get(state)
        const stateKey = deviceStateKey(state)
        return (
          <Badge variant='outline' className={cn('capitalize', stateStyles)}>
            {t(`devices.state.${stateKey}`)}
          </Badge>
        )
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(String(row.getValue(id)))
      },
      enableSorting: false,
    },
    {
      accessorKey: 'enabled',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('devices.columns.enabled')}
        />
      ),
      cell: ({ row }) => <DeviceEnabledSwitch device={row.original} />,
      filterFn: (row, id, value) => {
        return value === row.getValue(id)
      },
      enableSorting: false,
    },
    {
      accessorKey: 'lastOnlineTime',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('devices.columns.lastOnline')}
        />
      ),
      cell: ({ row }) => {
        const time = row.getValue('lastOnlineTime') as string | undefined
        if (!time)
          return (
            <div className='text-muted-foreground'>{t('devices.never')}</div>
          )
        return <div className='text-nowrap'>{time}</div>
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <div className='text-center'>{t('common:actions')}</div>,
      cell: DataTableRowActions,
      meta: {
        className: cn(
          'sticky end-0 z-10 bg-background',
          'shadow-[-4px_0_6px_-2px_rgb(0_0_0_/_0.05)] dark:shadow-[-4px_0_6px_-2px_rgb(0_0_0_/_0.3)]'
        ),
      },
      enableHiding: false,
    },
  ]
}

// Keep the old export for backward compatibility, but it won't have translations
export const devicesColumns: ColumnDef<Device>[] = []
