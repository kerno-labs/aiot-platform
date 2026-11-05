import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { postDeviceGroups, putDeviceGroupsGroupUuid } from '@/api/generated'
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
import { Textarea } from '@/components/ui/textarea'
import { groupTypes } from '../data/data'
import {
  groupFormSchema,
  type DeviceGroup,
  type GroupFormData,
} from '../data/schema'

interface GroupsActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: DeviceGroup | null
}

export function GroupsActionDialog({
  open,
  onOpenChange,
  currentRow,
}: GroupsActionDialogProps) {
  const { t } = useTranslation('deviceGroup')
  const { t: tCommon } = useTranslation('common')
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: '',
      type: 'manual',
      rule: '',
      description: '',
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        name: currentRow.name || '',
        type: currentRow.type || 'manual',
        rule: currentRow.rule || '',
        description: currentRow.description || '',
      })
    } else {
      form.reset({
        name: '',
        type: 'manual',
        rule: '',
        description: '',
      })
    }
  }, [currentRow, form, open])

  const createMutation = useMutation({
    mutationFn: (values: GroupFormData) =>
      postDeviceGroups({
        name: values.name,
        type: values.type,
        rule: values.type === 'dynamic' ? values.rule : undefined,
        description: values.description,
      }),
    onSuccess: () => {
      toast.success(tCommon('success'))
      queryClient.invalidateQueries({ queryKey: ['device-groups'] })
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        'Operation failed'
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: GroupFormData) =>
      putDeviceGroupsGroupUuid(currentRow?.groupUuid || '', {
        name: values.name,
        rule: currentRow?.type === 'dynamic' ? values.rule : undefined,
        description: values.description,
      }),
    onSuccess: () => {
      toast.success(t('editSuccess'))
      queryClient.invalidateQueries({ queryKey: ['device-groups'] })
      queryClient.invalidateQueries({
        queryKey: ['device-group', currentRow?.groupUuid],
      })
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        'Operation failed'
      toast.error(msg)
    },
  })

  const onSubmit = (values: GroupFormData) => {
    if (isEdit) {
      updateMutation.mutate(values)
    } else {
      createMutation.mutate(values)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const currentType = form.watch('type')

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle>
            {isEdit ? tCommon('edit') : tCommon('create')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            id='group-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('name')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('type.label')} *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('type.label')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groupTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.value === 'dynamic'
                              ? t('type.dynamic')
                              : t('type.manual')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {currentType === 'dynamic' && (
              <FormField
                control={form.control}
                name='rule'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('rule')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('rulePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('descriptionPlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            {tCommon('cancel')}
          </Button>
          <Button type='submit' form='group-form' disabled={isLoading}>
            {isLoading ? tCommon('loading') : tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
