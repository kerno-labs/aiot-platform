import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DEVICE_SERVICE_BASE_URL } from '@/api/config'
import type { DeviceBatchUploadError as DeviceV1BatchUploadError } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBatchUploadDevices } from '../api/queries'

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls']
const SUPPORTED_MIME_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

function isValidFileType(file: File): boolean {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  return (
    SUPPORTED_EXTENSIONS.includes(extension) ||
    SUPPORTED_MIME_TYPES.includes(file.type)
  )
}

type DevicesBatchUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DevicesBatchUploadDialog({
  open,
  onOpenChange,
}: DevicesBatchUploadDialogProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])

  const formSchema = z.object({
    file: z
      .instanceof(FileList)
      .refine((files) => files.length > 0, {
        message: t('dialog.batchUpload.validation.selectFile'),
      })
      .refine(
        (files) => isValidFileType(files[0]),
        t('dialog.batchUpload.validation.invalidFileType')
      ),
  })

  const [uploadResult, setUploadResult] = useState<{
    successCount: number
    failureCount: number
    errors: DeviceV1BatchUploadError[]
  } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { file: undefined },
  })

  const fileRef = form.register('file')

  const batchUpload = useBatchUploadDevices()

  const handleDownloadTemplate = () => {
    window.open(
      `${DEVICE_SERVICE_BASE_URL}/v1/devices/batch/template`,
      '_blank'
    )
  }

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const file = data.file[0]
    if (!file) return

    try {
      const result = await batchUpload.mutateAsync(file)

      setUploadResult({
        successCount: result.successCount || 0,
        failureCount: result.failureCount || 0,
        errors: result.errors || [],
      })

      if (result.successCount && result.successCount > 0) {
        toast.success(
          t('dialog.batchUpload.successMessage', { count: result.successCount })
        )
      }

      if (!result.failureCount || result.failureCount === 0) {
        // Close dialog if all succeeded
        handleClose()
      }
    } catch {
      toast.error(t('dialog.batchUpload.errorMessage'))
    }
  }

  const handleClose = () => {
    setUploadResult(null)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          handleClose()
        } else {
          onOpenChange(val)
        }
      }}
    >
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('dialog.batchUpload.title')}</DialogTitle>
        </DialogHeader>

        {!uploadResult ? (
          <Form {...form}>
            <form
              id='batch-upload-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleDownloadTemplate}
                >
                  <Download className='mr-2 size-4' />
                  {t('dialog.batchUpload.downloadTemplate')}
                </Button>
              </div>

              <FormField
                control={form.control}
                name='file'
                render={() => (
                  <FormItem>
                    <FormLabel>{t('dialog.batchUpload.fileLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type='file'
                        accept='.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
                        {...fileRef}
                        disabled={batchUpload.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        ) : (
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='flex items-center justify-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950'>
                <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                  {uploadResult.successCount}
                </div>
                <div className='text-sm font-medium text-green-600 dark:text-green-400'>
                  {t('common:success')}
                </div>
              </div>
              <div className='flex items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950'>
                <div className='text-2xl font-bold text-red-600 dark:text-red-400'>
                  {uploadResult.failureCount}
                </div>
                <div className='text-sm font-medium text-red-600 dark:text-red-400'>
                  {t('dialog.batchUpload.failed')}
                </div>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <div className='space-y-2'>
                <h4 className='font-medium'>
                  {t('dialog.batchUpload.errorDetails')}
                </h4>
                <div className='max-h-60 overflow-auto rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-16'>
                          {t('dialog.batchUpload.errorColumns.row')}
                        </TableHead>
                        <TableHead>
                          {t('dialog.batchUpload.errorColumns.deviceName')}
                        </TableHead>
                        <TableHead>
                          {t('dialog.batchUpload.errorColumns.productKey')}
                        </TableHead>
                        <TableHead>{t('common:error')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadResult.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>{error.deviceName || '-'}</TableCell>
                          <TableCell>{error.productKey || '-'}</TableCell>
                          <TableCell className='text-red-600'>
                            {error.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline'>
              {uploadResult ? t('common:close') : t('common:cancel')}
            </Button>
          </DialogClose>
          {!uploadResult && (
            <Button
              type='submit'
              form='batch-upload-form'
              disabled={batchUpload.isPending}
            >
              {batchUpload.isPending ? (
                t('dialog.batchUpload.uploading')
              ) : (
                <>
                  <Upload className='mr-2 size-4' />
                  {t('common:upload')}
                </>
              )}
            </Button>
          )}
          {uploadResult && uploadResult.failureCount > 0 && (
            <Button
              onClick={() => {
                setUploadResult(null)
                form.reset()
              }}
            >
              {t('dialog.batchUpload.uploadAgainButton')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
