import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailPlus, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { useCreateOrganizationInvitation } from '../api/queries'

const formSchema = z.object({
  email: z.string().email(),
})

type UserInviteForm = z.infer<typeof formSchema>

type UserInviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersInviteDialog({
  open,
  onOpenChange,
}: UserInviteDialogProps) {
  const { t } = useTranslation(['users', 'common'])
  const createMutation = useCreateOrganizationInvitation()
  const form = useForm<UserInviteForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: UserInviteForm) => {
    try {
      await createMutation.mutateAsync({
        data: { invitee: values.email },
      })
      toast.success(t('inviteSuccess'))
      form.reset()
      onOpenChange(false)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : t('inviteFailed')
      toast.error(errMsg)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-start'>
          <DialogTitle className='flex items-center gap-2'>
            <MailPlus /> {t('inviteUser')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id='user-invite-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:email')}</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder={t('emailPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className='gap-y-2'>
          <DialogClose asChild>
            <Button variant='outline'>{t('common:cancel')}</Button>
          </DialogClose>
          <Button
            type='submit'
            form='user-invite-form'
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? t('sending') : t('sendInvite')}{' '}
            <Send className='ml-1.5 h-4 w-4' />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
