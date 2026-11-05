import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import type { RuleChain } from '@/api/generated/model'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { RuleChainsRowActions } from './rule-chains-row-actions'

export function useRuleChainsColumns(): ColumnDef<RuleChain>[] {
  const { t } = useTranslation(['ruleChain', 'common'])

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('common:name')} />
      ),
      cell: ({ row }) => (
        <Link
          to='/rule-engine/rule-chains/$uuid'
          params={{ uuid: row.original.uuid ?? '' }}
          className='hover:underline'
        >
          <LongText className='max-w-56 font-medium text-foreground'>
            {row.original.name || '-'}
          </LongText>
        </Link>
      ),
      meta: { className: 'w-56' },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('common:description')}
        />
      ),
      cell: ({ row }) => (
        <LongText className='max-w-72 text-sm text-muted-foreground'>
          {row.original.description || '-'}
        </LongText>
      ),
      meta: { className: 'min-w-[180px]' },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('common:status')} />
      ),
      cell: ({ row }) => {
        const status = row.original.status || '-'
        return (
          <Badge variant='outline'>
            {t(`status.${status}`, { defaultValue: status })}
          </Badge>
        )
      },
      meta: { className: 'w-32' },
      enableSorting: false,
    },
    {
      accessorKey: 'version',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('list.columns.version')}
        />
      ),
      cell: ({ row }) => <span>{row.original.version ?? '-'}</span>,
      meta: { className: 'w-24' },
      enableSorting: false,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('common:updatedAt')} />
      ),
      cell: ({ row }) => (
        <span className='text-nowrap'>{row.original.updatedAt || '-'}</span>
      ),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <div className='text-center'>{t('common:actions')}</div>,
      cell: ({ row }) => <RuleChainsRowActions row={row} />,
      meta: {
        className: cn(
          'sticky end-0 z-10 bg-background',
          'shadow-[-4px_0_6px_-2px_rgb(0_0_0_/_0.05)] dark:shadow-[-4px_0_6px_-2px_rgb(0_0_0_/_0.3)]'
        ),
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
