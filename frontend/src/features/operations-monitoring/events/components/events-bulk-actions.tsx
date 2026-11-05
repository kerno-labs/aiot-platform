import { type Table } from '@tanstack/react-table'
import { Download, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions } from '@/components/data-table'
import { type DeviceEvent } from '../api/queries'

type EventsBulkActionsProps = {
  table: Table<DeviceEvent>
}

export function EventsBulkActions({ table }: EventsBulkActionsProps) {
  const { t } = useTranslation('operationsMonitoring')
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = () => {
    toast.info(
      t('events.bulkActions.deletePlaceholder', { count: selectedRows.length })
    )
    table.resetRowSelection()
  }

  const handleExport = () => {
    toast.info(
      t('events.bulkActions.exportPlaceholder', { count: selectedRows.length })
    )
    table.resetRowSelection()
  }

  return (
    <DataTableBulkActions table={table}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            onClick={handleExport}
            className='size-8'
            aria-label={t('events.bulkActions.export')}
            title={t('events.bulkActions.export')}
          >
            <Download />
            <span className='sr-only'>{t('events.bulkActions.export')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('events.bulkActions.export')}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='destructive'
            size='icon'
            onClick={handleDelete}
            className='size-8'
            aria-label={t('events.bulkActions.delete')}
            title={t('events.bulkActions.delete')}
          >
            <Trash2 />
            <span className='sr-only'>{t('events.bulkActions.delete')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('events.bulkActions.delete')}</p>
        </TooltipContent>
      </Tooltip>
    </DataTableBulkActions>
  )
}
