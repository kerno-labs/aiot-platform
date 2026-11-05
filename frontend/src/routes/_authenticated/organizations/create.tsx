import { useState, type FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useLogto } from '@logto/react'
import { Building2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { setAuthToken } from '@/api/clients'
import { postOrganizations } from '@/api/generated'
import { useAuthStore } from '@/stores/auth-store'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/organizations/create')({
  component: CreateOrganizationPage,
})

function CreateOrganizationPage() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const { getAccessToken } = useLogto()
  const setAccessToken = useAuthStore((state) => state.auth.setAccessToken)
  const organizationID = useAuthStore((state) => state.auth.organizationID)
  const setOrganizationID = useAuthStore(
    (state) => state.auth.setOrganizationID
  )
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdId, setCreatedId] = useState('')
  const [tokenFailed, setTokenFailed] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || isSubmitting || createdId) return
    setIsSubmitting(true)
    let createdOrganizationId = ''
    try {
      const response = await postOrganizations({ name: trimmedName })
      const id = response.data?.organizationId
      if (!id) throw new Error(t('createOrganization.failed'))
      createdOrganizationId = id
      setCreatedId(id)

      const resource =
        import.meta.env.VITE_LOGTO_RESOURCE || 'http://localhost:8000'
      const token = await getAccessToken(resource, id)
      if (!token) throw new Error(t('createOrganization.tokenUnavailable'))
      setAuthToken(token)
      setAccessToken(token)
      setOrganizationID(id)
      toast.success(t('createOrganization.success'))
      await navigate({ to: '/', replace: true })
    } catch (error) {
      if (createdOrganizationId) setTokenFailed(true)
      toast.error(
        createdOrganizationId
          ? t('createOrganization.tokenUnavailable')
          : error instanceof Error
            ? error.message
            : t('createOrganization.failed')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-svh items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <Building2 className='mb-2 size-8 text-primary' />
          <CardTitle>{t('createOrganization.title')}</CardTitle>
        </CardHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='organization-name'>
                  {t('createOrganization.name')}
                </FieldLabel>
                <Input
                  id='organization-name'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  required
                  disabled={!!createdId}
                  autoFocus
                  placeholder={t('createOrganization.namePlaceholder')}
                />
              </Field>
            </FieldGroup>
            {tokenFailed && (
              <Alert variant='destructive' className='mt-6'>
                <AlertDescription>
                  {t('createOrganization.tokenUnavailable')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className='mt-6 flex justify-end gap-2'>
            {organizationID && (
              <Button
                type='button'
                variant='outline'
                onClick={() => navigate({ to: '/' })}
              >
                {t('common:cancel')}
              </Button>
            )}
            {tokenFailed ? (
              <Button
                type='button'
                onClick={() =>
                  navigate({ to: '/sign-in', search: { redirect: '/' } })
                }
              >
                {t('common:signInAgain')}
              </Button>
            ) : createdId ? (
              <Button type='button' disabled>
                <Loader2 data-icon='inline-start' className='animate-spin' />
                {t('createOrganization.opening')}
              </Button>
            ) : (
              <Button type='submit' disabled={!name.trim() || isSubmitting}>
                {isSubmitting && (
                  <Loader2 data-icon='inline-start' className='animate-spin' />
                )}
                {t('common:createOrg')}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
