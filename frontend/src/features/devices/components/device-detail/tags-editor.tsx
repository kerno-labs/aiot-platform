import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useDeviceTags,
  useAddTags,
  useRemoveTags,
} from '@/features/devices/api/tags'

type Props = { deviceKey: string }

export function TagsEditor({ deviceKey }: Props) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const { data: tags = [], isLoading } = useDeviceTags(deviceKey)
  const add = useAddTags(deviceKey)
  const remove = useRemoveTags(deviceKey)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const handleAdd = async () => {
    if (!newKey.trim()) return
    if (/^\d+$/.test(newKey.trim())) {
      toast.error(t('deviceDetail.tags.invalidKey'))
      return
    }
    try {
      await add.mutateAsync({ [newKey.trim()]: newValue })
      setNewKey('')
      setNewValue('')
      toast.success(t('deviceDetail.tags.added'))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2'>
        {isLoading ? (
          <span className='text-sm text-muted-foreground'>
            {t('common:loading')}
          </span>
        ) : tags.length === 0 ? (
          <span className='text-sm text-muted-foreground italic'>
            {t('deviceDetail.tags.empty')}
          </span>
        ) : (
          tags.map((tag) => (
            <Badge key={tag.key} variant='secondary' className='gap-1 pr-1'>
              <span>
                {tag.key}={tag.value}
              </span>
              {tag.key && (
                <button
                  aria-label={`Remove ${tag.key}`}
                  onClick={() => remove.mutate([tag.key!])}
                  className='ml-1 rounded hover:bg-destructive/20'
                >
                  <X className='size-3' />
                </button>
              )}
            </Badge>
          ))
        )}
      </div>
      <div className='flex gap-2'>
        <Input
          placeholder={t('deviceDetail.tags.keyPlaceholder')}
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className='max-w-[180px]'
        />
        <Input
          placeholder={t('deviceDetail.tags.valuePlaceholder')}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className='max-w-[240px]'
        />
        <Button
          size='sm'
          onClick={handleAdd}
          disabled={!newKey.trim() || add.isPending}
        >
          <Plus className='size-4' /> {t('deviceDetail.tags.add')}
        </Button>
      </div>
    </div>
  )
}
