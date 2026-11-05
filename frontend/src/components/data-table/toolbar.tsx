import { Cross2Icon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { RefreshCw, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './faceted-filter'
import { DataTableViewOptions } from './view-options'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchKey?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: {
    columnId: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  onSearch?: (value?: string) => void
  onRefresh?: () => void
  preserveFiltersOnRefresh?: boolean
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder,
  searchKey,
  searchValue,
  onSearchChange,
  filters = [],
  onSearch,
  onRefresh,
  preserveFiltersOnRefresh = false,
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation('common')
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('searchPlaceholder')
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    table.getState().globalFilter ||
    (onSearchChange && searchValue)

  // Handle Enter key press in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchValue)
    }
  }

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        {onSearchChange ? (
          <Input
            placeholder={resolvedSearchPlaceholder}
            value={searchValue ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            className='h-8 w-[150px] lg:w-[250px]'
          />
        ) : searchKey ? (
          <Input
            placeholder={resolvedSearchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            onKeyDown={handleSearchKeyDown}
            className='h-8 w-[150px] lg:w-[250px]'
          />
        ) : (
          <Input
            placeholder={resolvedSearchPlaceholder}
            value={table.getState().globalFilter ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            className='h-8 w-[150px] lg:w-[250px]'
          />
        )}
        <div className='flex gap-x-2'>
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            )
          })}
        </div>
        {onSearch && (
          <Button
            variant='default'
            size='sm'
            onClick={() => onSearch(searchValue)}
            className='h-8'
          >
            <Search className='size-4' />
            {t('search')}
          </Button>
        )}
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
              onSearchChange?.('')
              onSearch?.('')
            }}
            className='h-8 px-2 lg:px-3'
          >
            {t('reset')}
            <Cross2Icon className='ms-2 h-4 w-4' />
          </Button>
        )}
        {onRefresh && (
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              if (!preserveFiltersOnRefresh) {
                table.resetColumnFilters()
                table.setGlobalFilter('')
              }
              onRefresh()
            }}
            className='h-9'
          >
            <RefreshCw className='size-4' />
            {t('refresh')}
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
