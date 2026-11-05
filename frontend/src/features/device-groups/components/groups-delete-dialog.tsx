import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { deleteDeviceGroupsGroupUuid } from '@/api/generated'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type DeviceGroup } from '../data/schema'

interface GroupsDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: DeviceGroup | null
}

export function GroupsDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: GroupsDeleteDialogProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteDeviceGroupsGroupUuid(currentRow?.groupUuid || ''),
    onSuccess: () => {
      toast.success(t('deleteSuccess'))
      queryClient.invalidateQueries({ queryKey: ['device-groups'] })
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, t('deleteError')))
    },
  })

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={() => deleteMutation.mutate()}
      isLoading={deleteMutation.isPending}
      title={t('delete')}
      desc={t('deleteConfirm')}
      confirmText={t('delete')}
      destructive
    />
  )
}
