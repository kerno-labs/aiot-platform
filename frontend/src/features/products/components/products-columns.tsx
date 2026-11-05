import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { productStatusStyles } from '../data/data'
import { type Product, type ProductStatus } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export function useProductsColumns(): ColumnDef<Product>[] {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const nameLabel = t('productDetail.info.fields.name')
  const nodeTypeLabel = t('productDetail.info.fields.nodeType')
  const descriptionLabel = t('common:description')
  const categoryLabel = t('productDetail.info.fields.category')
  const statusLabel = t('common:status')
  const createdAtLabel = t('common:createdAt')

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
          aria-label={t('common:selectAll')}
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
          aria-label={t('common:selectRow')}
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'productKey',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('productDetail.header.productKey')}
        />
      ),
      cell: ({ row }) => {
        const productKey = row.getValue('productKey') as string
        if (!productKey) return null

        return (
          <Link
            to='/device-management/products/$productKey'
            params={{ productKey }}
            className='block'
          >
            <LongText className='max-w-36 cursor-pointer ps-3 font-mono text-sm hover:text-primary hover:underline'>
              {productKey}
            </LongText>
          </Link>
        )
      },
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
        <DataTableColumnHeader column={column} title={nameLabel} />
      ),
      cell: ({ row }) => (
        <LongText className='max-w-48'>{row.getValue('name')}</LongText>
      ),
      meta: { className: 'w-48', label: nameLabel },
      enableSorting: false,
    },
    {
      accessorKey: 'nodeType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={nodeTypeLabel} />
      ),
      cell: ({ row }) => {
        const nodeType = row.getValue('nodeType') as string | undefined
        return (
          <Badge variant='outline' className='text-nowrap'>
            {nodeType
              ? t(`productDetail.nodeTypes.${nodeType}`, {
                  defaultValue: nodeType,
                })
              : '-'}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      meta: { label: nodeTypeLabel },
      enableSorting: false,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={descriptionLabel} />
      ),
      cell: ({ row }) => (
        <LongText className='max-w-64 text-muted-foreground'>
          {row.getValue('description') || '-'}
        </LongText>
      ),
      meta: { label: descriptionLabel },
      enableSorting: false,
    },
    {
      accessorKey: 'categoryId',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={categoryLabel} />
      ),
      cell: ({ row }) => (
        <Badge variant='secondary' className='capitalize'>
          {row.original.categoryName || '-'}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)))
      },
      meta: { label: categoryLabel },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={statusLabel} />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as ProductStatus
        const statusStyles = productStatusStyles.get(status)
        return (
          <Badge variant='outline' className={cn('capitalize', statusStyles)}>
            {status
              ? t(`productDetail.status.${status}`, { defaultValue: status })
              : '-'}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
      meta: { label: statusLabel },
      enableSorting: false,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={createdAtLabel} />
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue('createdAt') as string | undefined
        return <div className='text-nowrap'>{createdAt || '-'}</div>
      },
      meta: { label: createdAtLabel },
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
