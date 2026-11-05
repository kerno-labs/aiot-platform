import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Link } from '@tanstack/react-router'
import { type Row } from '@tanstack/react-table'
import { Pencil, Trash2, Smartphone, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Product } from '../data/schema'
import { useProducts } from './products-provider'

type DataTableRowActionsProps = {
  row: Row<Product>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const { setOpen, setCurrentRow } = useProducts()
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
          >
            <DotsHorizontalIcon className='h-4 w-4' />
            <span className='sr-only'>{t('common:openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[180px]'>
          <DropdownMenuItem asChild>
            <Link
              to='/device-management/products/$productKey'
              params={{ productKey: row.original.productKey || '' }}
              className='cursor-pointer'
            >
              <span>{t('common:view')}</span>
              <DropdownMenuShortcut>
                <Eye size={16} />
              </DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('edit')
            }}
          >
            {t('common:edit')}
            <DropdownMenuShortcut>
              <Pencil size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/device-management/devices' className='cursor-pointer'>
              <span>{t('tabs.devices')}</span>
              <DropdownMenuShortcut>
                <Smartphone size={16} />
              </DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('delete')
            }}
            className='text-red-500!'
          >
            {t('common:delete')}
            <DropdownMenuShortcut>
              <Trash2 size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
