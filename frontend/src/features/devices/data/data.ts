import { DEVICE_STATE, type DeviceState } from './schema'

export const deviceStateStyles = new Map<DeviceState, string>([
  [
    DEVICE_STATE.ONLINE,
    'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200',
  ],
  [DEVICE_STATE.OFFLINE, 'bg-neutral-300/40 border-neutral-300'],
  [
    DEVICE_STATE.INACTIVE,
    'bg-amber-100/40 text-amber-900 dark:text-amber-200 border-amber-300',
  ],
])

export const deviceStateKey = (state?: number): string => {
  if (state === DEVICE_STATE.ONLINE) return 'online'
  if (state === DEVICE_STATE.OFFLINE) return 'offline'
  return 'inactive'
}

export const states = [
  {
    value: String(DEVICE_STATE.ONLINE),
    key: 'online',
    variant: 'success' as const,
  },
  {
    value: String(DEVICE_STATE.OFFLINE),
    key: 'offline',
    variant: 'secondary' as const,
  },
  {
    value: String(DEVICE_STATE.INACTIVE),
    key: 'inactive',
    variant: 'outline' as const,
  },
]
