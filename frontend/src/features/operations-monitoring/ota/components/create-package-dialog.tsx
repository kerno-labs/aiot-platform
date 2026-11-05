import { useForm, useWatch } from 'react-hook-form'
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
import { SearchableSelect } from '@/components/searchable-select'
import { useProductOptions } from '@/features/products/api/queries'
import { useCreateOTAPackage, useUploadOTAFile } from '../api/queries'
import { packageTypes } from '../data/data'
import {
  createPackageFormSchema,
  otaPackageFileExtensions,
  type CreatePackageFormData,
} from '../data/schema'
import { useOTAPackagesContext } from '../hooks/use-ota-packages-context'
import { OTAFormMessage as FormMessage } from './ota-form-message'

export function CreatePackageDialog() {
  const { t } = useTranslation(['ota', 'common'])
  const { openDialog, setOpenDialog } = useOTAPackagesContext()
  const createMutation = useCreateOTAPackage()
  const uploadMutation = useUploadOTAFile()
  const { data: products = [], isLoading: isLoadingProducts } =
    useProductOptions()

  const form = useForm<CreatePackageFormData>({
    resolver: zodResolver(createPackageFormSchema),
    defaultValues: {
      packageName: '',
      version: '',
      packageType: 'upgrade',
      productKey: '',
      description: '',
      uploadMethod: 'file',
      file: undefined,
      fileUrl: '',
    },
  })
  const uploadMethod = useWatch({
    control: form.control,
    name: 'uploadMethod',
  })

  const onSubmit = async (data: CreatePackageFormData) => {
    const upload =
      data.uploadMethod === 'file'
        ? await uploadMutation.mutateAsync(data.file!)
        : undefined

    await createMutation.mutateAsync(
      {
        packageName: data.packageName,
        version: data.version,
        packageType: data.packageType,
        product_key: data.productKey,
        description: data.description,
        uploadType: data.uploadMethod,
        fileUrl: upload?.fileUrl ?? data.fileUrl,
        fileSize: upload?.fileSize,
        checksum: upload?.checksum,
      },
      {
        onSuccess: () => {
          setOpenDialog(null)
          form.reset()
        },
      }
    )
  }

  return (
    <Sheet
      open={openDialog === 'create'}
      onOpenChange={(open) => !open && setOpenDialog(null)}
    >
      <SheetContent className='flex w-full flex-col gap-0 p-0 sm:max-w-[480px] lg:max-w-[560px]'>
        <SheetHeader className='px-6 pt-6'>
          <SheetTitle>{t('common:create')}</SheetTitle>
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
                      <Input
                        placeholder={t(
                          'packageForm.fields.packageNamePlaceholder'
                        )}
                        {...field}
                      />
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
                      <Input
                        placeholder={t('packageForm.fields.versionPlaceholder')}
                        {...field}
                      />
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
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              'packageForm.fields.packageTypePlaceholder'
                            )}
                          />
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
                name='productKey'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('packageForm.fields.productName')}</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={
                          products
                            .filter((product) => product.productKey)
                            .map((product) => ({
                              label: product.name || product.productKey!,
                              value: product.productKey!,
                            })) || []
                        }
                        placeholder={t(
                          'packageForm.fields.productNamePlaceholder'
                        )}
                        searchPlaceholder={t('common:search')}
                        emptyText={t('common:noData', {
                          defaultValue: 'No products available',
                        })}
                        isLoading={isLoadingProducts}
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
                      <Textarea
                        rows={3}
                        placeholder={t(
                          'packageForm.fields.descriptionPlaceholder'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='uploadMethod'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('packageForm.fields.uploadMethod')}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='file'>
                          {t('packageForm.fields.uploadBinaryFile')}
                        </SelectItem>
                        <SelectItem value='url'>
                          {t('packageForm.fields.useExternalUrl')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {uploadMethod === 'file' ? (
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
                          aria-label={t('packageForm.fields.file')}
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
              ) : (
                <FormField
                  control={form.control}
                  name='fileUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('packageForm.fields.externalUrl')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='url'
                          placeholder={t(
                            'packageForm.fields.externalUrlPlaceholder'
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className='sticky bottom-0 flex gap-2 bg-background pt-4 pb-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setOpenDialog(null)}
                  className='flex-1'
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type='submit'
                  className='flex-1'
                  disabled={
                    createMutation.isPending || uploadMutation.isPending
                  }
                >
                  {createMutation.isPending || uploadMutation.isPending
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
