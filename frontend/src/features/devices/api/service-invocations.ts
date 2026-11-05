import { useQueryClient } from '@tanstack/react-query'
import {
  getGetDevicesDeviceKeyThingModelServiceInvocationsQueryKey,
  useGetDevicesDeviceKeyThingModelServiceInvocations,
  usePostDevicesDeviceKeyThingModelServicesServiceIdentifierInvoke,
} from '@/api/generated'
import type {
  DeviceInvokeServiceResponse,
  DeviceListServiceInvocationsResponse,
  DeviceServiceInvocation,
  GetDevicesDeviceKeyThingModelServiceInvocationsParams,
  InvokeDeviceServiceRequest,
} from '@/api/generated/model'

export type {
  DeviceInvokeServiceResponse,
  DeviceServiceInvocation,
  GetDevicesDeviceKeyThingModelServiceInvocationsParams,
  InvokeDeviceServiceRequest,
}

export const serviceInvocationKeys = {
  all: ['thing-model', 'service-invocations'] as const,
  list: (
    deviceKey: string,
    params?: GetDevicesDeviceKeyThingModelServiceInvocationsParams
  ) =>
    getGetDevicesDeviceKeyThingModelServiceInvocationsQueryKey(
      deviceKey,
      params
    ),
}

export function useServiceInvocations(
  deviceKey: string,
  params: GetDevicesDeviceKeyThingModelServiceInvocationsParams
) {
  return useGetDevicesDeviceKeyThingModelServiceInvocations(deviceKey, params, {
    query: {
      select: (res) =>
        res?.data as DeviceListServiceInvocationsResponse | undefined,
    },
  })
}

export function useInvokeDeviceService(deviceKey: string) {
  const queryClient = useQueryClient()
  return usePostDevicesDeviceKeyThingModelServicesServiceIdentifierInvoke({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            getGetDevicesDeviceKeyThingModelServiceInvocationsQueryKey(
              deviceKey
            ),
        })
        queryClient.invalidateQueries({
          queryKey: serviceInvocationKeys.all,
        })
      },
    },
  })
}
