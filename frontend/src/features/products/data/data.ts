import type { ProductStatus } from './schema'

export const productStatusStyles = new Map<ProductStatus, string>([
  ['active', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['inactive', 'bg-neutral-300/40 border-neutral-300'],
  ['archived', 'bg-sky-200/40 text-sky-900 dark:text-sky-100 border-sky-300'],
])

export const statuses = [
  {
    value: 'active',
    variant: 'success' as const,
  },
  {
    value: 'inactive',
    variant: 'secondary' as const,
  },
  {
    value: 'archived',
    variant: 'outline' as const,
  },
]

export const categories = [
  {
    value: 'sensor',
    label: 'Sensor',
  },
  {
    value: 'actuator',
    label: 'Actuator',
  },
  {
    value: 'gateway',
    label: 'Gateway',
  },
  {
    value: 'controller',
    label: 'Controller',
  },
  {
    value: 'display',
    label: 'Display',
  },
  {
    value: 'camera',
    label: 'Camera',
  },
  {
    value: 'other',
    label: 'Other',
  },
]

export const nodeTypes = [
  {
    value: 'direct',
  },
  {
    value: 'gateway',
  },
  {
    value: 'gateway-sub',
  },
]

export const connectivityMethods = [
  {
    value: 'wifi',
  },
  {
    value: 'cellular',
  },
  {
    value: 'ethernet',
  },
  {
    value: 'other',
  },
]

// Access protocols for direct and gateway devices
export const directGatewayProtocols = [
  { value: 'default' },
  { value: 'http' },
  { value: 'mqtt' },
  { value: 'coap' },
  { value: 'tcp' },
  { value: 'udp' },
  { value: 'gb28181' },
]

// Access protocols for gateway sub-devices
export const gatewaySubProtocols = [
  { value: 'custom' },
  { value: 'modbus' },
  { value: 'opc-ua' },
  { value: 'zigbee' },
  { value: 'ble' },
  { value: 'jt808' },
  { value: 'jt1078' },
]
