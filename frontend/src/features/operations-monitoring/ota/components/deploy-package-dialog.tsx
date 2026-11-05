import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useBatchUpgrade } from '../api/detail-queries'
import { getAllEnabledDevices } from '../api/device-queries'
import { useOTAPackagesContext } from '../hooks/use-ota-packages-context'

export function DeployPackageDialog() {
  const { t } = useTranslation('ota')
  const { openDialog, setOpenDialog, selectedPackage } = useOTAPackagesContext()
  const batchUpgrade = useBatchUpgrade(selectedPackage?.uuid)
  const [targetDevices, setTargetDevices] = useState<'all' | 'specific'>('all')
  const [selectedDeviceKeys, setSelectedDeviceKeys] = useState<string[]>([])
  const [isDeploying, setIsDeploying] = useState(false)

  const productId = selectedPackage?.productId
    ? String(selectedPackage.productId)
    : undefined

  const devicesQuery = useQuery({
    queryKey: ['ota-deploy-devices', productId],
    queryFn: () => getAllEnabledDevices(productId!),
    enabled: !!productId && openDialog === 'deploy',
  })

  const allDeviceKeys = useMemo(() => {
    return (devicesQuery.data ?? [])
      .map((d) => d.deviceKey)
      .filter((k): k is string => !!k)
  }, [devicesQuery.data])

  const handleClose = () => {
    setTargetDevices('all')
    setSelectedDeviceKeys([])
    setOpenDialog(null)
  }

  const estimatedDeviceCount = useMemo(() => {
    if (targetDevices === 'all') {
      return allDeviceKeys.length
    }
    return selectedDeviceKeys.length
  }, [allDeviceKeys.length, selectedDeviceKeys.length, targetDevices])

  const toggleDeviceSelection = (deviceKey: string, checked: boolean) => {
    setSelectedDeviceKeys((current) => {
      if (checked) {
        return current.includes(deviceKey) ? current : [...current, deviceKey]
      }
      return current.filter((key) => key !== deviceKey)
    })
  }

  const handleDeploy = async () => {
    if (!selectedPackage?.uuid) return
    const deviceKeys =
      targetDevices === 'all' ? allDeviceKeys : selectedDeviceKeys
    if (deviceKeys.length === 0) {
      toast.error(
        t('deviceManagement:selectDevice', {
          defaultValue: 'Select at least one device',
        })
      )
      return
    }

    setIsDeploying(true)

    try {
      await batchUpgrade.mutateAsync(deviceKeys)

      toast.success(t('notifications.deploymentStarted'))
      setOpenDialog(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('notifications.error')))
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <Dialog
      open={openDialog === 'deploy'}
      onOpenChange={(open) => !open && handleClose()}
    >
      <DialogContent className='sm:max-w-[560px]'>
        <DialogHeader>
          <DialogTitle>{t('deployForm.title')}</DialogTitle>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          <div className='space-y-3'>
            <Label className='text-base font-semibold'>
              {t('deployForm.fields.targetDevices')}
            </Label>
            <RadioGroup
              value={targetDevices}
              onValueChange={(value) =>
                setTargetDevices(value as 'all' | 'specific')
              }
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='all' id='all-devices' />
                <Label
                  htmlFor='all-devices'
                  className='cursor-pointer font-normal'
                >
                  {t('deployForm.fields.allDevices')}
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='specific' id='specific-devices' />
                <Label
                  htmlFor='specific-devices'
                  className='cursor-pointer font-normal'
                >
                  {t('deployForm.fields.specificDevices')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {targetDevices === 'specific' && (
            <div className='space-y-3'>
              <Label className='text-base font-semibold'>Devices</Label>
              <div className='rounded-lg border'>
                <ScrollArea className='h-56'>
                  <div className='space-y-2 p-3'>
                    {devicesQuery.isLoading && (
                      <div className='text-sm text-muted-foreground'>
                        Loading devices...
                      </div>
                    )}
                    {!devicesQuery.isLoading &&
                      devicesQuery.data?.length === 0 && (
                        <div className='text-sm text-muted-foreground'>
                          No enabled devices available for this product.
                        </div>
                      )}
                    {devicesQuery.data?.map((device) => {
                      const deviceKey = device.deviceKey ?? ''
                      const checked = selectedDeviceKeys.includes(deviceKey)
                      return (
                        <label
                          key={deviceKey}
                          className='flex cursor-pointer items-start gap-3 rounded-md border p-3'
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              toggleDeviceSelection(deviceKey, Boolean(value))
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
          )}

          {selectedPackage && (
            <div className='space-y-2 rounded-lg border p-4'>
              <div className='text-sm font-medium'>Package Details</div>
              <div className='space-y-1 text-sm text-muted-foreground'>
                <div>
                  <span className='font-medium'>Name:</span>{' '}
                  {selectedPackage.packageName}
                </div>
                <div>
                  <span className='font-medium'>Version:</span>{' '}
                  {selectedPackage.version}
                </div>
                <div>
                  <span className='font-medium'>Target Product:</span>{' '}
                  {selectedPackage.productName}
                </div>
                <div>
                  <span className='font-medium'>
                    {t('deployForm.fields.estimatedDevices')}:
                  </span>{' '}
                  {estimatedDeviceCount} devices
                </div>
              </div>
            </div>
          )}

          <div className='rounded-lg bg-muted p-4'>
            <p className='text-sm'>
              {t('deployForm.confirmation.message', {
                count: estimatedDeviceCount,
              })}
            </p>
            <p className='mt-2 text-sm font-medium text-destructive'>
              {t('deployForm.confirmation.warning')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleClose()}
            disabled={isDeploying}
          >
            {t('common:cancel')}
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={
              isDeploying ||
              (targetDevices === 'specific' && selectedDeviceKeys.length === 0)
            }
          >
            {isDeploying
              ? t('common:deploying', { defaultValue: 'Deploying...' })
              : t('deployForm.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
