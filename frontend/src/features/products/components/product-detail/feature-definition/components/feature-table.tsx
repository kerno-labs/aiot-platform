import { useState, type ReactNode } from 'react'
import { Edit2, Plus, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FeatureItem {
  identifier: string
  name: string
}

interface FeatureColumn<T> {
  header: ReactNode
  cell: (item: T) => ReactNode
}

interface FeatureTableProps<T extends FeatureItem> {
  items: T[]
  columns: FeatureColumn<T>[]
  addLabel: string
  emptyText: string
  // Indexes refer to the unfiltered list so edits stay correct while searching.
  onAdd: () => void
  onEdit: (item: T, index: number) => void
  onDelete: (index: number) => void
}

export function FeatureTable<T extends FeatureItem>({
  items,
  columns,
  addLabel,
  emptyText,
  onAdd,
  onEdit,
  onDelete,
}: FeatureTableProps<T>) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const [query, setQuery] = useState('')

  const keyword = query.trim().toLowerCase()
  const rows = items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        !keyword ||
        item.identifier.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword)
    )

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='relative w-full max-w-xs'>
          <Search className='absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common:search')}
            className='h-8 pl-8 text-xs'
          />
        </div>
        <Button size='sm' onClick={onAdd}>
          <Plus className='mr-1 h-3 w-3' />
          {addLabel}
        </Button>
      </div>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {t('productDetail.featureDefinition.columns.identifier')}
              </TableHead>
              <TableHead>
                {t('productDetail.featureDefinition.columns.name')}
              </TableHead>
              {columns.map((column, i) => (
                <TableHead key={i}>{column.header}</TableHead>
              ))}
              <TableHead className='w-24' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 3}
                  className='h-24 text-center text-sm text-muted-foreground'
                >
                  {items.length === 0 ? emptyText : t('common:noResults')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ item, index }) => (
                <TableRow
                  key={item.identifier || index}
                  className='cursor-pointer'
                  onClick={() => onEdit(item, index)}
                >
                  <TableCell className='font-mono text-xs'>
                    {item.identifier}
                  </TableCell>
                  <TableCell className='text-sm'>{item.name}</TableCell>
                  {columns.map((column, i) => (
                    <TableCell key={i} className='text-xs'>
                      {column.cell(item)}
                    </TableCell>
                  ))}
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={t('common:edit')}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(item, index)
                      }}
                    >
                      <Edit2 className='h-3 w-3' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={t('common:delete')}
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(index)
                      }}
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
