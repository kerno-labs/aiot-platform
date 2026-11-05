import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { ProductsMultiDeleteDialog } from './products-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useTranslation('common')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <>
      <BulkActionsToolbar table={table}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label={t('delete')}
              title={t('delete')}
            >
              <Trash2 />
              <span className='sr-only'>{t('delete')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('delete')}</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <ProductsMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
