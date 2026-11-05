import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { ArrowUpCircle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { OTAPackagesMultiDeleteDialog } from './ota-packages-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useTranslation('ota')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <>
      <BulkActionsToolbar table={table}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='default'
              size='icon'
              className='size-8'
              aria-label={t('packageList.actions.bulkUpgrade')}
              title={t('packageList.actions.bulkUpgrade')}
            >
              <ArrowUpCircle />
              <span className='sr-only'>
                {t('packageList.actions.bulkUpgrade')}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('packageList.actions.bulkUpgrade')}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='Delete selected packages'
              title='Delete selected packages'
            >
              <Trash2 />
              <span className='sr-only'>Delete selected packages</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete selected packages</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <OTAPackagesMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
