import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { putDeviceGroupsGroupUuid } from '@/api/generated'
import type { AiotBackendApiV1DeviceGroup as DeviceGroupV1Group } from '@/api/generated/model'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface EditGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: DeviceGroupV1Group
}

export function EditGroupDialog({
  open,
  onOpenChange,
  group,
}: EditGroupDialogProps) {
  const { t } = useTranslation(['deviceGroup', 'common'])
  const queryClient = useQueryClient()
  const [name, setName] = useState(group.name || '')
  const [description, setDescription] = useState(group.description || '')
  const [rule, setRule] = useState(group.rule || '')

  // 打开编辑面板时重置表单，避免沿用上一次编辑内容。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setName(group.name || '')
      setDescription(group.description || '')
      setRule(group.rule || '')
    }
  }, [open, group]) // 表单需要在打开编辑时同步当前分组数据
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateMutation = useMutation({
    mutationFn: () =>
      putDeviceGroupsGroupUuid(group.groupUuid || '', {
        name,
        description,
        rule: group.type === 'dynamic' ? rule : undefined,
      }),
    onSuccess: () => {
      toast.success(t('common:updateSuccess'))
      queryClient.invalidateQueries({
        queryKey: ['device-group', group.groupUuid],
      })
      queryClient.invalidateQueries({ queryKey: ['device-groups'] })
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, t('common:updateError')))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    updateMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('common:edit')}</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-group-name'>{t('name')} *</Label>
              <Input
                id='edit-group-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('name')}
                required
              />
            </div>

            {group.type === 'dynamic' && (
              <div className='grid gap-2'>
                <Label htmlFor='edit-group-rule'>{t('rule')}</Label>
                <Input
                  id='edit-group-rule'
                  value={rule}
                  onChange={(e) => setRule(e.target.value)}
                  placeholder={t('rulePlaceholder')}
                />
              </div>
            )}

            <div className='grid gap-2'>
              <Label htmlFor='edit-group-desc'>{t('descriptionLabel')}</Label>
              <Textarea
                id='edit-group-desc'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('common:cancel')}
            </Button>
            <Button
              type='submit'
              disabled={updateMutation.isPending || !name.trim()}
            >
              {updateMutation.isPending
                ? t('common:loading')
                : t('common:save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
