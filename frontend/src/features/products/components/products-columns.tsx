import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { nodeTypes, statuses, productStatusStyles } from '../data/data'
import { type Product, type ProductStatus } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const productsColumns: ColumnDef<Product>[] = [
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
    accessorKey: 'productKey',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Product Key' />
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
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-48'>{row.getValue('name')}</LongText>
    ),
    meta: { className: 'w-48' },
    enableSorting: false,
  },
  {
    accessorKey: 'nodeType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='节点类型' />
    ),
    cell: ({ row }) => {
      const nodeType = row.getValue('nodeType') as string
      const nodeTypeInfo = nodeTypes.find((n) => n.value === nodeType)
      return (
        <Badge variant='outline' className='text-nowrap'>
          {nodeTypeInfo?.label || '-'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Description' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-64 text-muted-foreground'>
        {row.getValue('description') || '-'}
      </LongText>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'categoryId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    cell: ({ row }) => (
      <Badge variant='secondary' className='capitalize'>
        {row.original.categoryName || '-'}
      </Badge>
    ),
    filterFn: (row, id, value) => {
      return value.includes(String(row.getValue(id)))
    },
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as ProductStatus
      const statusStyles = productStatusStyles.get(status)
      const statusInfo = statuses.find((s) => s.value === status)
      return (
        <Badge variant='outline' className={cn('capitalize', statusStyles)}>
          {statusInfo?.label || status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue('createdAt') as string | undefined
      return <div className='text-nowrap'>{createdAt || '-'}</div>
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: () => <div className='text-center'>Actions</div>,
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
