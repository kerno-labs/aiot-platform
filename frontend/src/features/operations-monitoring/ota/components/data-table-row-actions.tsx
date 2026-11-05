import { useNavigate } from '@tanstack/react-router'
import { type Row } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type OTAPackage } from '../data/schema'
import { useOTAPackagesContext } from '../hooks/use-ota-packages-context'

interface DataTableRowActionsProps {
  row: Row<OTAPackage>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { t } = useTranslation('ota')
  const navigate = useNavigate()
  const { setOpenDialog, setSelectedPackage } = useOTAPackagesContext()
  const pkg = row.original

  const canEdit = pkg.status === 'draft'
  const canDelete = pkg.status === 'draft'

  const handleAction = (action: 'edit' | 'delete') => {
    setSelectedPackage(pkg)
    setOpenDialog(action)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuItem
          onSelect={() =>
            navigate({
              to: '/operations-monitoring/ota/packages/$id',
              params: { id: pkg.uuid },
            })
          }
        >
          <Eye className='me-2 h-4 w-4' />
          {t('common:view')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canEdit}
          onSelect={() => canEdit && handleAction('edit')}
        >
          <Pencil className='me-2 h-4 w-4' />
          {t('common:edit')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canDelete}
          onSelect={() => canDelete && handleAction('delete')}
          className='text-destructive'
        >
          <Trash2 className='me-2 h-4 w-4' />
          {t('common:delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
