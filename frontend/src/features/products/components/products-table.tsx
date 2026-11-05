import { useState, useMemo } from 'react'
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
import type { ProductListItem as ProductV1Product } from '@/api/generated/model'
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
import { useProducts, productKeys } from '../api/queries'
import { categories, statuses } from '../data/data'
import { type Product } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { useProductsColumns } from './products-columns'

export function ProductsTable() {
  const { t } = useTranslation(['deviceManagement', 'common'])
  // Get query client for manual invalidation
  const queryClient = useQueryClient()
  const columns = useProductsColumns()

  // All states are local (not synced to URL)
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [appliedFilters, setAppliedFilters] = useState<ColumnFiltersState>([]) // Actual filters used for API
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Extract filter values from appliedFilters (not columnFilters)
  const category = appliedFilters.find((f) => f.id === 'categoryId')?.value as
    string | undefined
  const status = appliedFilters.find((f) => f.id === 'status')?.value as
    string | undefined
  const searchText = appliedFilters.find((f) => f.id === 'productKey')
    ?.value as string | undefined

  // Handler to apply filters and trigger API call
  const handleSearch = () => {
    setAppliedFilters(columnFilters)
    setPagination((prev) => ({ ...prev, pageIndex: 0 })) // Reset to first page
  }

  // Handler to reset filters and refresh data
  const handleRefresh = () => {
    setColumnFilters([])
    setAppliedFilters([])
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    // Invalidate queries to force refetch
    queryClient.invalidateQueries({ queryKey: productKeys.lists() })
  }

  // Fetch products from API
  const {
    data: response,
    isLoading,
    isError,
  } = useProducts({
    page: pagination.pageIndex + 1, // API pages are 1-indexed
    pageSize: pagination.pageSize,
    category,
    status,
    searchText,
  })

  // Transform API data to table format
  const data = useMemo(() => {
    if (!response?.products) return []
    return response.products.map((product: ProductV1Product) => ({
      id: product.id || '',
      productKey: product.productKey || '',
      name: product.name || '',
      description: product.description || '',
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      status: product.status || '',
      nodeType: product.nodeType,
      connectivityMethod: product.connectivityMethod,
      accessProtocol: product.accessProtocol,
      createdAt: product.createdAt || '',
      updatedAt: product.updatedAt || '',
    })) as Product[]
  }, [response])

  // Calculate total page count from API response
  const pageCount = useMemo(() => {
    // If we have data but no total, calculate from data length
    if (!response?.total) {
      if (data.length > 0) {
        // At least 1 page if we have data
        return Math.max(1, Math.ceil(data.length / pagination.pageSize))
      }
      // Return 1 as minimum to show pagination UI
      return 1
    }
    return Math.ceil(response.total / pagination.pageSize)
  }, [response?.total, pagination.pageSize, data.length])

  // Custom pagination change handler to prevent out-of-range pages
  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    setPagination((old) => {
      const newPagination =
        typeof updater === 'function' ? updater(old) : updater

      // Only check if pageSize changed
      if (newPagination.pageSize !== old.pageSize && response?.total) {
        // Calculate new page count with new pageSize
        const newPageCount = Math.ceil(response.total / newPagination.pageSize)

        // If new pageIndex is out of range, reset to first page
        if (newPagination.pageIndex >= newPageCount) {
          return { ...newPagination, pageIndex: 0 }
        }
      }

      return newPagination
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
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: true,
    manualPagination: true, // API handles pagination
    manualFiltering: true, // API handles filtering
    onPaginationChange: handlePaginationChange,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // Client-side sorting for current page
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
        searchKey='productKey'
        filters={[
          {
            columnId: 'status',
            title: t('common:status'),
            options: statuses.map((status) => ({
              label: t(`productDetail.status.${status.value}`),
              value: status.value,
            })),
          },
          {
            columnId: 'categoryId',
            title: t('productDetail.info.fields.category'),
            options: categories.map((category) => ({
              label: category.label,
              value: category.value,
            })),
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
                {headerGroup.headers.map((header) => {
                  return (
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
                  )
                })}
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
                  {t('common:loadError')}
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
                  {t('common:noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
      <DataTableBulkActions table={table} />
    </div>
  )
}
