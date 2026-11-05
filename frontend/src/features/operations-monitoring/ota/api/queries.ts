import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  deleteOtaPackagesUuid,
  getGetOtaPackagesQueryKey,
  getGetOtaPackagesUuidQueryKey,
  postFilesOta,
  postOtaPackages,
  putOtaPackagesUuid,
  useGetOtaPackages,
  useGetOtaPackagesUuid,
} from '@/api/generated'
import type {
  GetOtaPackagesParams,
  OtaCreateOTAPackageRequest,
  OtaOTAPackageRequest as OtaV1UpdateOTAPackageRequest,
} from '@/api/generated/model'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import type { OTAPackage } from '../data/schema'

export type { GetOtaPackagesParams }

type CreateOTAPackagePayload = Omit<OtaCreateOTAPackageRequest, 'productId'> & {
  product_key: string
}

/**
 * Query key factory for OTA packages
 */
export const otaPackageKeys = {
  all: ['ota-packages'] as const,
  lists: () => [...otaPackageKeys.all, 'list'] as const,
  list: (
    filters?: GetOtaPackagesParams & {
      productId?: string
      status?: string
      packageType?: string
      uploadType?: string
      searchText?: string
    }
  ) => getGetOtaPackagesQueryKey(filters),
  details: () => [...otaPackageKeys.all, 'detail'] as const,
  detail: (uuid: string) => getGetOtaPackagesUuidQueryKey(uuid),
}

/**
 * Hook to fetch OTA packages list
 */
export function useOTAPackages(filters?: {
  page?: number
  pageSize?: number
  productId?: string
  status?: string
  packageType?: string
  uploadType?: string
  searchText?: string
}) {
  return useGetOtaPackages(
    { page: filters?.page, pageSize: filters?.pageSize },
    {
      query: {
        select: (res) => {
          const response = res?.data ?? {}
          const packages: OTAPackage[] = (response.otaPackages || []).map(
            (pkg) => ({
              id: String(pkg.id || ''),
              uuid: pkg.uuid || '',
              packageName: pkg.packageName || '',
              version: pkg.version || '',
              packageType: (pkg.packageType ||
                'upgrade') as OTAPackage['packageType'],
              productId: pkg.productId?.toString(),
              productName: pkg.productName || '',
              description: pkg.description,
              fileSize: parseInt(String(pkg.fileSize || '0'), 10),
              fileUrl: pkg.fileUrl || '',
              checksum: pkg.checksum || '',
              status: (pkg.status || 'draft') as OTAPackage['status'],
              deploymentProgress: 0,
              targetDeviceCount: 0,
              successCount: 0,
              failureCount: 0,
              createdAt: pkg.createdAt || '',
              updatedAt: pkg.updatedAt || '',
              deployedAt: pkg.releasedAt,
              createdBy: '',
            })
          )
          return { packages, total: response.total || 0 }
        },
        staleTime: 5 * 60 * 1000,
      },
    }
  )
}

/**
 * Hook to fetch a single OTA package by UUID
 */
export function useOTAPackage(uuid: string) {
  return useGetOtaPackagesUuid(uuid, {
    query: {
      select: (res) => res?.data,
      enabled: !!uuid,
    },
  })
}

/**
 * Hook to create an OTA package
 */
export function useCreateOTAPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOTAPackagePayload) => {
      return postOtaPackages(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: otaPackageKeys.lists() })
      toast.success('OTA package created successfully')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to create OTA package'))
    },
  })
}

export function useUploadOTAFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const response = await postFilesOta({ file })
      if (!response.data?.fileUrl) {
        throw new Error('The upload response did not include a file URL')
      }
      return response.data
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Failed to upload OTA package file')
      )
    },
  })
}

/**
 * Hook to update an OTA package
 */
export function useUpdateOTAPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: OtaV1UpdateOTAPackageRequest
    }) => {
      return putOtaPackagesUuid(id, data as never)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: otaPackageKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: otaPackageKeys.detail(variables.id),
      })
      toast.success('OTA package updated successfully')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to update OTA package'))
    },
  })
}

/**
 * Hook to delete an OTA package
 */
export function useDeleteOTAPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteOtaPackagesUuid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: otaPackageKeys.lists() })
      toast.success('OTA package deleted successfully')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete OTA package'))
    },
  })
}

/**
 * Hook to delete multiple OTA packages
 */
export function useDeleteOTAPackages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete packages in parallel
      const deletePromises = ids.map((id) => deleteOtaPackagesUuid(id))
      await Promise.all(deletePromises)
      return { deletedCount: ids.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: otaPackageKeys.lists() })
      toast.success(`${data.deletedCount} OTA packages deleted successfully`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete OTA packages'))
    },
  })
}
