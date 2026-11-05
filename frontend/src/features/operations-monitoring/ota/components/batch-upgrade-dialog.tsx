import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useBatchUpgrade } from '../api/detail-queries'
import { getAllEnabledDevices } from '../api/device-queries'

interface BatchUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId?: string
  packageUuid?: string
}

export function BatchUpgradeDialog({
  open,
  onOpenChange,
  productId,
  packageUuid,
}: BatchUpgradeDialogProps) {
  const { t } = useTranslation('ota')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const batchUpgrade = useBatchUpgrade(packageUuid)

  const devicesQuery = useQuery({
    queryKey: ['batch-upgrade-devices', productId],
    queryFn: () => getAllEnabledDevices(productId!),
    enabled: open && !!productId,
  })

  const filteredDevices = useMemo(() => {
    const all = devicesQuery.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter((d) => {
      const key = (d.deviceKey ?? '').toLowerCase()
      const name = (d.name ?? '').toLowerCase()
      return key.includes(q) || name.includes(q)
    })
  }, [devicesQuery.data, search])

  const toggleDevice = (deviceKey: string, checked: boolean) => {
    setSelectedKeys((current) =>
      checked
        ? current.includes(deviceKey)
          ? current
          : [...current, deviceKey]
        : current.filter((k) => k !== deviceKey)
    )
  }

  const allSelected =
    filteredDevices.length > 0 &&
    filteredDevices.every((d) => selectedKeys.includes(d.deviceKey ?? ''))

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const keys = filteredDevices
        .map((d) => d.deviceKey ?? '')
        .filter((k): k is string => !!k)
      setSelectedKeys(Array.from(new Set([...selectedKeys, ...keys])))
    } else {
      const filteredKeys = new Set(
        filteredDevices.map((d) => d.deviceKey ?? '')
      )
      setSelectedKeys(selectedKeys.filter((k) => !filteredKeys.has(k)))
    }
  }

  const handleClose = () => {
    setSelectedKeys([])
    setSearch('')
    onOpenChange(false)
  }

  const handleConfirm = () => {
    if (selectedKeys.length === 0) {
      toast.error(t('packageDetail.batchUpgrade.selectAtLeastOne'))
      return
    }
    batchUpgrade.mutate(selectedKeys, {
      onSuccess: () => {
        toast.success(
          t('packageDetail.batchUpgrade.success', {
            count: selectedKeys.length,
          })
        )
        handleClose()
      },
      onError: (error) => {
        toast.error(
          getApiErrorMessage(error, t('packageDetail.batchUpgrade.failed'))
        )
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side='right' className='w-full sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>{t('packageDetail.batchUpgrade.title')}</SheetTitle>
        </SheetHeader>

        <div className='flex flex-1 flex-col gap-4 overflow-hidden px-4'>
          <div className='flex items-center justify-between gap-2'>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('packageDetail.batchUpgrade.searchDevices')}
              className='flex-1'
            />
            <span className='text-sm whitespace-nowrap text-muted-foreground'>
              {t('packageDetail.batchUpgrade.selected', {
                count: selectedKeys.length,
              })}
            </span>
          </div>

          <div className='flex flex-1 flex-col overflow-hidden rounded-lg border'>
            <div className='flex items-center gap-3 border-b px-3 py-2'>
              <Checkbox
                checked={allSelected}
                onCheckedChange={(value) => toggleAll(Boolean(value))}
              />
              <span className='text-sm font-medium'>
                {t('common:selectAll')}
              </span>
            </div>
            <ScrollArea className='flex-1'>
              <div className='space-y-1 p-2'>
                {devicesQuery.isLoading && (
                  <div className='p-4 text-sm text-muted-foreground'>
                    {t('common:loading', { defaultValue: 'Loading...' })}
                  </div>
                )}
                {!devicesQuery.isLoading && filteredDevices.length === 0 && (
                  <div className='p-4 text-sm text-muted-foreground'>
                    {t('packageDetail.batchUpgrade.empty')}
                  </div>
                )}
                {filteredDevices.map((device) => {
                  const deviceKey = device.deviceKey ?? ''
                  const checked = selectedKeys.includes(deviceKey)
                  return (
                    <label
                      key={deviceKey}
                      className='flex cursor-pointer items-start gap-3 rounded-md border p-3'
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleDevice(deviceKey, Boolean(value))
                        }
                      />
                      <div className='min-w-0 text-sm'>
                        <div className='font-medium'>
                          {device.name || device.deviceKey}
                        </div>
                        <div className='font-mono text-xs text-muted-foreground'>
                          {device.deviceKey}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <SheetFooter>
          <Button variant='outline' onClick={handleClose}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={batchUpgrade.isPending}>
            {batchUpgrade.isPending
              ? t('packageDetail.batchUpgrade.submitting')
              : t('common:confirm')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
