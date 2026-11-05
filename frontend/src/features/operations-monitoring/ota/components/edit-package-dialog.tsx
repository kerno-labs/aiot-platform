import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateOTAPackage } from '../api/queries'
import { packageTypes } from '../data/data'
import {
  editPackageFormSchema,
  otaPackageFileExtensions,
  type EditPackageFormData,
} from '../data/schema'
import { useOTAPackagesContext } from '../hooks/use-ota-packages-context'
import { OTAFormMessage as FormMessage } from './ota-form-message'

export function EditPackageDialog() {
  const { t } = useTranslation(['ota', 'common'])
  const { openDialog, setOpenDialog, selectedPackage } = useOTAPackagesContext()
  const updatePackage = useUpdateOTAPackage()

  const form = useForm<EditPackageFormData>({
    resolver: zodResolver(editPackageFormSchema),
    defaultValues: {
      packageName: '',
      version: '',
      packageType: 'upgrade',
      productId: '',
      description: '',
      file: undefined,
    },
  })

  useEffect(() => {
    if (selectedPackage && openDialog === 'edit') {
      form.reset({
        packageName: selectedPackage.packageName,
        version: selectedPackage.version,
        packageType: selectedPackage.packageType,
        productId: selectedPackage.productId || '',
        description: selectedPackage.description || '',
        file: undefined,
      })
    }
  }, [selectedPackage, openDialog, form])

  const onSubmit = async (data: EditPackageFormData) => {
    if (!selectedPackage?.uuid) return

    try {
      // Prepare update data
      const updateData: {
        packageName: string
        description?: string
        fileUrl?: string
        fileSize?: number
        checksum?: string
      } = {
        packageName: selectedPackage.packageName,
      }

      // Always include description
      if (data.description !== undefined) {
        updateData.description = data.description
      }

      // TODO: Handle file upload if a new file is provided
      // If data.file exists, you would need to:
      // 1. Upload the file to storage (e.g., S3, MinIO)
      // 2. Get the fileUrl, fileSize, and checksum
      // 3. Include them in updateData
      if (data.file) {
        // Example:
        // const uploadResult = await uploadFile(data.file)
        // updateData.fileUrl = uploadResult.url
        // updateData.fileSize = uploadResult.size.toString()
        // updateData.checksum = uploadResult.checksum
      }

      await updatePackage.mutateAsync({
        id: selectedPackage.uuid,
        data: updateData,
      })

      setOpenDialog(null)
      form.reset()
    } catch {
      // Error handling is done in the mutation hook
    }
  }

  return (
    <Sheet
      open={openDialog === 'edit'}
      onOpenChange={(open) => !open && setOpenDialog(null)}
    >
      <SheetContent className='flex w-full flex-col gap-0 p-0 sm:max-w-[480px] lg:max-w-[560px]'>
        <SheetHeader className='px-6 pt-6'>
          <SheetTitle>{t('common:edit')}</SheetTitle>
        </SheetHeader>
        <div className='flex-1 overflow-y-auto px-6 pb-6'>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 pt-4'
            >
              <FormField
                control={form.control}
                name='packageName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('packageForm.fields.packageName')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='version'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('packageForm.fields.version')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='packageType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('packageForm.fields.packageType')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packageTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {t(`packageList.packageTypes.${type.value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='productId'
                render={() => (
                  <FormItem>
                    <FormLabel>{t('packageForm.fields.productName')}</FormLabel>
                    <FormControl>
                      <Input
                        value={selectedPackage?.productName || ''}
                        disabled
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('packageForm.fields.description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='file'
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>{t('packageForm.fields.file')}</FormLabel>
                    <FormControl>
                      <Input
                        type='file'
                        accept={otaPackageFileExtensions.join(',')}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          onChange(file)
                        }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='sticky bottom-0 flex gap-2 bg-background pt-4 pb-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setOpenDialog(null)}
                  className='flex-1'
                  disabled={updatePackage.isPending}
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type='submit'
                  className='flex-1'
                  disabled={updatePackage.isPending}
                >
                  {updatePackage.isPending
                    ? t('common:saving', { defaultValue: 'Saving...' })
                    : t('common:save')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
