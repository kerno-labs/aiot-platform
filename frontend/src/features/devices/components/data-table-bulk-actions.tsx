import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { DevicesMultiDeleteDialog } from './devices-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
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
              aria-label='Delete selected devices'
              title='Delete selected devices'
            >
              <Trash2 />
              <span className='sr-only'>Delete selected devices</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete selected devices</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <DevicesMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
