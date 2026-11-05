import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
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
import { useTranslation } from 'react-i18next'
import { getGetRuleChainsQueryKey, useGetRuleChains } from '@/api/generated'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { useRuleChainsColumns } from './rule-chains-columns'

export function RuleChainsTable() {
  const { t } = useTranslation(['ruleChain', 'common'])
  const queryClient = useQueryClient()
  const columns = useRuleChainsColumns()
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const searchText = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined
  const statusFilters = columnFilters.find((filter) => filter.id === 'status')
    ?.value as string[] | undefined
  const status = statusFilters?.length === 1 ? statusFilters[0] : undefined

  const handleSearch = () => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  const handleReset = () => {
    setColumnFilters([])
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  const handleRefresh = () => {
    handleReset()
    queryClient.invalidateQueries({ queryKey: getGetRuleChainsQueryKey() })
  }

  const {
    data: response,
    isLoading,
    isError,
  } = useGetRuleChains({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: searchText,
    status,
  })

  const data = useMemo(
    () => response?.data?.items ?? [],
    [response?.data?.items]
  )
  const totalCount = response?.data?.total ?? 0
  const pageCount = Math.ceil(totalCount / pagination.pageSize)

  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    setPagination((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      return {
        ...next,
        pageIndex: Math.max(0, next.pageIndex),
        pageSize: Math.max(1, next.pageSize),
      }
    })
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: handlePaginationChange,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder={t('list.search')}
        searchKey='name'
        filters={[
          {
            columnId: 'status',
            title: t('common:status'),
            options: [
              { label: t('status.draft'), value: 'draft' },
              { label: t('status.published'), value: 'published' },
            ],
          },
        ]}
        onSearch={handleSearch}
        onRefresh={handleRefresh}
      />
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
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_column, columnIndex) => (
                    <TableCell key={columnIndex}>
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
                  {t('list.loadError')}
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  {t('list.empty')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className='group/row'>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted',
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
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
