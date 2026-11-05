import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useSetDeviceEnabled } from '../api/queries'
import { type Device } from '../data/schema'

export function DeviceEnabledSwitch({ device }: { device: Device }) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const setDeviceEnabled = useSetDeviceEnabled()

  return (
    <div className='flex justify-center'>
      <Switch
        checked={device.enabled}
        disabled={setDeviceEnabled.isPending}
        onCheckedChange={async (checked) => {
          try {
            await setDeviceEnabled.mutateAsync({
              deviceKey: device.deviceKey,
              data: { enabled: checked },
            })
            toast.success(t('common:updateSuccess'))
          } catch {
            toast.error(t('common:updateError'))
          }
        }}
        aria-label={t('devices.columns.enabled')}
      />
    </div>
  )
}
