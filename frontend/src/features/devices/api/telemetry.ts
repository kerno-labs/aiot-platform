import { useState } from 'react'
import { keepPreviousData, useQueries } from '@tanstack/react-query'
import {
  getDevicesDeviceKeyTelemetryHistory,
  getGetDevicesDeviceKeyTelemetryHistoryQueryKey,
  getGetDevicesDeviceKeyThingModelPropertiesQueryKey,
  useGetDevicesDeviceKeyThingModelProperties,
} from '@/api/generated'
import type {
  GetDevicesDeviceKeyTelemetryHistoryParams,
  TelemetryPoint,
  ThingModelProperty,
} from '@/api/generated/model'

export type { TelemetryPoint }

export interface TelemetryHistorySeriesQueryParams {
  deviceKey: string
  properties: string[]
  durationMs?: number
  startTime?: number
  endTime?: number
  limit?: number
}

export const telemetryKeys = {
  all: ['device-telemetry'] as const,
  properties: (deviceKey: string) =>
    getGetDevicesDeviceKeyThingModelPropertiesQueryKey(deviceKey),
  history: (
    deviceKey: string,
    params?: GetDevicesDeviceKeyTelemetryHistoryParams
  ) => getGetDevicesDeviceKeyTelemetryHistoryQueryKey(deviceKey, params),
}

/**
 * Fetch the device's latest reported property values.
 */
export function useThingModelProperties(deviceKey: string, enabled = true) {
  return useGetDevicesDeviceKeyThingModelProperties(deviceKey, {
    query: {
      select: (res) => (res?.data?.items || []) as ThingModelProperty[],
      enabled: Boolean(deviceKey) && enabled,
      placeholderData: keepPreviousData,
    },
  })
}

/** Query telemetry history for multiple properties in parallel. */
export function useTelemetryHistorySeries(
  params: TelemetryHistorySeriesQueryParams,
  enabled = true
) {
  const [initialEndTime] = useState(() => Date.now())
  const endTime = params.endTime ?? initialEndTime
  const startTime = params.durationMs
    ? endTime - params.durationMs
    : params.startTime

  return useQueries({
    queries: params.properties.map((property) => {
      const queryParams: GetDevicesDeviceKeyTelemetryHistoryParams = {
        property,
        limit: params.limit || 100,
        ...(startTime ? { start_time: startTime } : {}),
        ...(endTime ? { end_time: endTime } : {}),
      }

      return {
        queryKey: telemetryKeys.history(params.deviceKey, queryParams),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getDevicesDeviceKeyTelemetryHistory(
            params.deviceKey,
            queryParams,
            signal
          ),
        enabled: Boolean(params.deviceKey && property) && enabled,
        select: (res: { data?: TelemetryPoint[] }) => res.data || [],
        staleTime: 5000,
      }
    }),
  })
}
