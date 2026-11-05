'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProductOptions } from '@/features/products/api/queries'
import { useCreateDevice, useUpdateDevice } from '../api/queries'
import {
  type Device,
  createDeviceFormSchema,
  type DeviceFormData,
} from '../data/schema'

type DeviceActionDialogProps = {
  currentRow?: Device
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DevicesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: DeviceActionDialogProps) {
  const isEdit = !!currentRow
  const { t } = useTranslation(['deviceManagement', 'common'])

  // Fetch product options
  const { data: products = [], isLoading: isLoadingProducts } =
    useProductOptions()

  // Create and update mutations
  const createDevice = useCreateDevice()
  const updateDevice = useUpdateDevice()

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(createDeviceFormSchema(t)),
    defaultValues: {
      name: '',
      productId: '',
    },
  })

  // Reset form when dialog opens or currentRow changes
  React.useEffect(() => {
    if (open) {
      if (isEdit && currentRow) {
        form.reset({
          name: currentRow.name,
          productId: currentRow.productId,
        })
      } else {
        form.reset({
          name: '',
          productId: '',
        })
      }
    }
  }, [open, isEdit, currentRow, products, form])

  const onSubmit = async (values: DeviceFormData) => {
    try {
      if (isEdit && currentRow) {
        // Update existing device
        await updateDevice.mutateAsync({
          id: currentRow.id,
          data: {
            name: values.name,
          },
        })
        toast.success(t('common:updateSuccess'))
      } else {
        // Create new device
        await createDevice.mutateAsync({
          name: values.name,
          productId: Number(values.productId),
        })
        toast.success(t('common:createSuccess'))
      }
      onOpenChange(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to submit device form:', error)
      toast.error(
        getApiErrorMessage(
          error,
          isEdit ? t('common:updateError') : t('common:createError')
        )
      )
    }
  }

  const isSubmitting = createDevice.isPending || updateDevice.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isEdit ? t('common:edit') : t('common:create')}
          </DialogTitle>
        </DialogHeader>
        <div className='w-[calc(100%+0.75rem)] py-1 pe-3'>
          <Form {...form}>
            <form
              id='device-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('devices.columns.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('dialog.form.placeholder.name')}
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='productId'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      {t('devices.columns.product')}
                    </FormLabel>
                    {isEdit ? (
                      <FormControl>
                        <Input
                          value={currentRow?.productName || ''}
                          disabled
                          className='col-span-4'
                        />
                      </FormControl>
                    ) : (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingProducts}
                      >
                        <FormControl>
                          <SelectTrigger className='col-span-4'>
                            <SelectValue placeholder={t('common:select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={
                                product.id != null ? String(product.id) : ''
                              }
                            >
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='device-form' disabled={isSubmitting}>
            {isSubmitting && (
              <span className='mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent' />
            )}
            {t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
