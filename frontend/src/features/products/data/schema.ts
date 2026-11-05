import { z } from 'zod'
import type { TFunction } from 'i18next'

// Product status schema
const productStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('archived'),
])
export type ProductStatus = z.infer<typeof productStatusSchema>

// Node type schema
const nodeTypeSchema = z.union([
  z.literal('direct'),
  z.literal('gateway'),
  z.literal('gateway-sub'),
])
export type NodeType = z.infer<typeof nodeTypeSchema>

// Connectivity method schema
const connectivityMethodSchema = z.union([
  z.literal('wifi'),
  z.literal('cellular'),
  z.literal('ethernet'),
  z.literal('other'),
])
export type ConnectivityMethod = z.infer<typeof connectivityMethodSchema>

// Access protocol schemas - different protocols for different node types
// For direct and gateway devices
const directGatewayProtocolSchema = z.union([
  z.literal('default'),
  z.literal('http'),
  z.literal('mqtt'),
  z.literal('coap'),
  z.literal('tcp'),
  z.literal('udp'),
  z.literal('gb28181'),
])

// For gateway sub-devices
const gatewaySubProtocolSchema = z.union([
  z.literal('custom'),
  z.literal('modbus'),
  z.literal('opc-ua'),
  z.literal('zigbee'),
  z.literal('ble'),
  z.literal('jt808'),
  z.literal('jt1078'),
])

// Combined access protocol schema (union of all protocols)
const accessProtocolSchema = z.union([
  directGatewayProtocolSchema,
  gatewaySubProtocolSchema,
])
export type AccessProtocol = z.infer<typeof accessProtocolSchema>
export type DirectGatewayProtocol = z.infer<typeof directGatewayProtocolSchema>
export type GatewaySubProtocol = z.infer<typeof gatewaySubProtocolSchema>

// Full product schema (from API)
export const productSchema = z.object({
  id: z.string(),
  productKey: z.string(),
  name: z.string(),
  description: z.string().optional(),
  categoryId: z.number().optional(),
  categoryName: z.string().optional(),
  status: productStatusSchema,
  nodeType: nodeTypeSchema.optional(),
  connectivityMethod: connectivityMethodSchema.optional(),
  accessProtocol: accessProtocolSchema.optional(),
  deviceCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Product = z.infer<typeof productSchema>

// Schema for product form validation
export const createProductFormSchema = (t: TFunction) =>
  z
    .object({
      name: z
        .string()
        .min(1, t('common:required'))
        .max(100, t('common:maxLength', { max: 100 })),
      description: z
        .string()
        .max(500, t('common:maxLength', { max: 500 }))
        .optional(),
      categoryId: z.string().min(1, t('common:required')),
      nodeType: nodeTypeSchema,
      connectivityMethod: connectivityMethodSchema.optional(),
      accessProtocol: accessProtocolSchema,
    })
    .superRefine((data, ctx) => {
      // Connectivity method is required for direct and gateway devices
      if (
        (data.nodeType === 'direct' || data.nodeType === 'gateway') &&
        !data.connectivityMethod
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('common:required'),
          path: ['connectivityMethod'],
        })
      }

      // Validate access protocol matches node type
      const isDirectOrGatewayProtocol = directGatewayProtocolSchema.safeParse(
        data.accessProtocol
      ).success
      if (
        (data.nodeType === 'direct' || data.nodeType === 'gateway') &&
        !isDirectOrGatewayProtocol
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('common:required'),
          path: ['accessProtocol'],
        })
      } else if (data.nodeType === 'gateway-sub' && isDirectOrGatewayProtocol) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('common:required'),
          path: ['accessProtocol'],
        })
      }
    })

export type ProductFormData = z.infer<
  ReturnType<typeof createProductFormSchema>
>
