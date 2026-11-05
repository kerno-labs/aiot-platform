import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  getGetRuleChainsQueryKey,
  useDeleteRuleChainsUuid,
  useGetRuleChainsUuid,
} from '@/api/generated'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { RuleChainReadonlyCanvas } from './rule-chain-readonly-canvas'

interface RuleChainDetailPageProps {
  uuid: string
}

export function RuleChainDetailPage({ uuid }: RuleChainDetailPageProps) {
  const { t } = useTranslation(['ruleChain', 'common'])
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { data: response, isLoading, isError } = useGetRuleChainsUuid(uuid)
  const remove = useDeleteRuleChainsUuid({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetRuleChainsQueryKey(),
        })
        toast.success(t('common:deleteSuccess'))
        navigate({ to: '/rule-engine/rule-chains' })
      },
      onError: (err) =>
        toast.error(getApiErrorMessage(err, t('common:deleteError'))),
    },
  })

  const chain = response?.data?.ruleChain

  if (isLoading) {
    return (
      <Main fixed>
        <div className='space-y-4'>
          <Skeleton className='h-8 w-64' />
          <Skeleton className='h-5 w-96' />
          <Skeleton className='h-[calc(100vh-15rem)] w-full' />
        </div>
      </Main>
    )
  }

  if (isError || !chain) {
    return (
      <Main fixed>
        <div className='flex h-full flex-col items-center justify-center gap-4'>
          <p className='text-lg text-muted-foreground'>
            {t('detail.notFound')}
          </p>
          <Button onClick={() => navigate({ to: '/rule-engine/rule-chains' })}>
            {t('detail.backToList')}
          </Button>
        </div>
      </Main>
    )
  }

  const status = chain.status || '-'

  return (
    <Main fixed fluid className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-start justify-between gap-4 border-b pb-4'>
        <div className='flex min-w-0 items-start gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => router.history.back()}
            aria-label={t('common:back')}
          >
            <ArrowLeft className='size-4' />
          </Button>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-2xl font-bold'>{chain.name || '-'}</h1>
              <Badge variant='outline'>
                {t(`status.${status}`, { defaultValue: status })}
              </Badge>
            </div>
            <p className='mt-1 text-muted-foreground'>
              {chain.description || '-'}
            </p>
            <div className='mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground'>
              <span>
                {t('list.columns.version')}: {chain.version ?? '-'}
              </span>
              <span>
                {t('common:updatedAt')}: {chain.updatedAt || '-'}
              </span>
            </div>
          </div>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={() =>
              navigate({
                to: '/rule-engine/rule-chains/$uuid/edit',
                params: { uuid },
              })
            }
          >
            <Pencil data-icon='inline-start' />
            {t('common:edit')}
          </Button>
          <Button variant='destructive' onClick={() => setDeleteOpen(true)}>
            <Trash2 data-icon='inline-start' />
            {t('common:delete')}
          </Button>
        </div>
      </div>
      <div className='min-h-0 flex-1 overflow-hidden rounded-xl border bg-background'>
        <RuleChainReadonlyCanvas graph={chain.graph} />
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        handleConfirm={() => remove.mutate({ uuid })}
        isLoading={remove.isPending}
        title={t('common:delete')}
        desc={t('common:deleteConfirm')}
        confirmText={t('common:delete')}
        destructive
      />
    </Main>
  )
}
