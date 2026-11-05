import { z } from 'zod'

export const DEVICE_STATE = {
  OFFLINE: 0,
  ONLINE: 1,
  INACTIVE: 2,
} as const

// Device state schema (0=offline, 1=online, 2=inactive)
const deviceStateSchema = z.union([
  z.literal(DEVICE_STATE.OFFLINE),
  z.literal(DEVICE_STATE.ONLINE),
  z.literal(DEVICE_STATE.INACTIVE),
])
export type DeviceState = z.infer<typeof deviceStateSchema>

// Full device schema (from API)
export const deviceSchema = z.object({
  id: z.string(),
  deviceKey: z.string(),
  name: z.string(),
  productId: z.string(),
  productKey: z.string().optional(),
  productName: z.string().optional(),
  state: deviceStateSchema,
  enabled: z.boolean(),
  lastOnlineTime: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Device = z.infer<typeof deviceSchema>

// Schema for device form validation
export const deviceFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Device name is required')
    .max(100, 'Device name too long'),
  productId: z.string().min(1, 'Product is required'),
})

export type DeviceFormData = z.infer<typeof deviceFormSchema>
