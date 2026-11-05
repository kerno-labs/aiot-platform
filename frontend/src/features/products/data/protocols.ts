import type { TFunction } from 'i18next'

// Standard protocol names are language-neutral and centrally managed here.
export const protocolLabels = {
  http: 'HTTP',
  mqtt: 'MQTT',
  coap: 'CoAP',
  tcp: 'TCP',
  udp: 'UDP',
  gb28181: 'GB28181',
  modbus: 'Modbus',
  'opc-ua': 'OPC UA',
  zigbee: 'ZigBee',
  ble: 'BLE',
  json: 'JSON',
  protobuf: 'Protobuf',
  jt808: 'JT808',
  jt1078: 'JT1078',
} as const

export type ProtocolCode = keyof typeof protocolLabels | 'default' | 'custom'

export function getProtocolLabel(protocol: string, t: TFunction): string {
  if (protocol === 'default') {
    return `${t('common:default')} (HTTP, MQTT)`
  }
  if (protocol === 'custom') {
    return t('common:custom')
  }
  return protocolLabels[protocol as keyof typeof protocolLabels] ?? protocol
}

export const transportProtocols = [
  'mqtt',
  'http',
  'coap',
  'tcp',
  'udp',
  'gb28181',
] as const

export const applicationProtocols = [
  'json',
  'protobuf',
  'modbus',
  'gb28181',
  'jt808',
  'jt1078',
  'custom',
] as const
