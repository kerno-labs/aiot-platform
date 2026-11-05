import { useState } from 'react'
import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { type Row } from '@tanstack/react-table'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  getGetRuleChainsQueryKey,
  useDeleteRuleChainsUuid,
} from '@/api/generated'
import type { RuleChain } from '@/api/generated/model'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface RuleChainsRowActionsProps {
  row: Row<RuleChain>
}

export function RuleChainsRowActions({ row }: RuleChainsRowActionsProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const uuid = row.original.uuid ?? ''
  const remove = useDeleteRuleChainsUuid({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetRuleChainsQueryKey(),
        })
        toast.success(t('deleteSuccess'))
      },
      onError: (err) => toast.error(getApiErrorMessage(err, t('deleteError'))),
    },
  })

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>{t('actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuItem asChild>
          <Link to='/rule-engine/rule-chains/$uuid' params={{ uuid }}>
            {t('view')}
            <DropdownMenuShortcut>
              <Eye size={16} />
            </DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to='/rule-engine/rule-chains/$uuid/edit' params={{ uuid }}>
            {t('edit')}
            <DropdownMenuShortcut>
              <Pencil size={16} />
            </DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='text-destructive focus:text-destructive'
          onClick={() => setDeleteOpen(true)}
        >
          {t('delete')}
          <DropdownMenuShortcut>
            <Trash2 size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        handleConfirm={() => remove.mutate({ uuid })}
        isLoading={remove.isPending}
        title={t('delete')}
        desc={t('deleteConfirm')}
        confirmText={t('delete')}
        destructive
      />
    </DropdownMenu>
  )
}
