import { useState } from 'react'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useLogto } from '@logto/react'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { setAuthToken } from '@/api/clients'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  useInvitation,
  useAcceptOrganizationInvitation,
} from '@/features/users/api/queries'

const searchSchema = z.object({
  invitationId: z.string().optional().catch(''),
  token: z.string().optional().catch(''),
  email: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/invitations/accept')({
  validateSearch: searchSchema,
  component: function AcceptInvitationPage() {
    const { t } = useTranslation(['users', 'common'])
    const { invitationId = '' } = Route.useSearch()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { getAccessToken } = useLogto()
    const setAccessToken = useAuthStore((state) => state.auth.setAccessToken)
    const setOrganizationID = useAuthStore(
      (state) => state.auth.setOrganizationID
    )
    const {
      data: invitation,
      isLoading: isFetching,
      isError,
    } = useInvitation(invitationId || '')
    const acceptMutation = useAcceptOrganizationInvitation()
    const [accepted, setAccepted] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)

    const handleAccept = async () => {
      if (!invitationId) return
      try {
        await acceptMutation.mutateAsync({ id: invitationId })
        setAccepted(true)
        toast.success(t('invitationAccepted'))
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, t('invitationAcceptFailed')))
        return
      }
      try {
        if (invitation?.organizationId) {
          const resource =
            import.meta.env.VITE_LOGTO_RESOURCE || 'http://localhost:8000'
          const token = await getAccessToken(
            resource,
            invitation.organizationId
          )
          if (!token) throw new Error(t('invitationTokenUnavailable'))
          setAuthToken(token)
          setAccessToken(token)
          setOrganizationID(invitation.organizationId)
          await queryClient.invalidateQueries()
        }
        setSessionReady(true)
        setTimeout(() => {
          navigate({ to: '/' })
        }, 1500)
      } catch {
        toast.error(t('invitationTokenUnavailable'))
      }
    }

    const canAccept =
      invitation?.status === 'Pending' &&
      !!invitation.expiresAt &&
      !invitation.isExpired

    if (!invitationId) {
      return (
        <div className='flex min-h-[60vh] items-center justify-center p-4'>
          <Card className='max-w-md text-center'>
            <CardHeader>
              <AlertCircle className='mx-auto h-12 w-12 text-destructive' />
              <CardTitle>{t('invitationInvalid')}</CardTitle>
              <CardDescription>{t('invitationInvalidDesc')}</CardDescription>
            </CardHeader>
            <CardFooter className='justify-center'>
              <Button onClick={() => navigate({ to: '/' })}>
                {t('goToDashboard')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    if (accepted) {
      return (
        <div className='flex min-h-[60vh] items-center justify-center p-4'>
          <Card className='max-w-md text-center'>
            <CardHeader>
              <CheckCircle2 className='mx-auto h-12 w-12 text-emerald-500' />
              <CardTitle>{t('invitationWelcome')}</CardTitle>
              <CardDescription>
                {sessionReady
                  ? t('invitationRedirecting')
                  : t('invitationSignInAgain')}
              </CardDescription>
            </CardHeader>
            <CardFooter className='justify-center'>
              <Button
                onClick={() =>
                  sessionReady
                    ? navigate({ to: '/' })
                    : navigate({ to: '/sign-in', search: { redirect: '/' } })
                }
              >
                {sessionReady
                  ? t('continueToConsole')
                  : t('common:signInAgain')}{' '}
                <ArrowRight className='ml-1.5 h-4 w-4' />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    if (isFetching) {
      return (
        <div className='flex min-h-[60vh] flex-col items-center justify-center gap-3 p-4'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
          <p className='text-sm text-muted-foreground'>
            {t('invitationLoading')}
          </p>
        </div>
      )
    }

    if (isError || !invitation || !canAccept) {
      return (
        <div className='flex min-h-[60vh] items-center justify-center p-4'>
          <Card className='max-w-md text-center'>
            <CardHeader>
              <AlertCircle className='mx-auto h-12 w-12 text-amber-500' />
              <CardTitle>{t('invitationUnavailable')}</CardTitle>
              <CardDescription>
                {t('invitationUnavailableDesc')}
              </CardDescription>
            </CardHeader>
            <CardFooter className='justify-center'>
              <Button onClick={() => navigate({ to: '/' })}>
                {t('goToDashboard')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return (
      <div className='flex min-h-[60vh] items-center justify-center p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <Building2 className='h-6 w-6' />
            </div>
            <CardTitle>{t('invitationTitle')}</CardTitle>
            <CardDescription>
              {t('invitationInvitee', { email: invitation.invitee })}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <div className='flex justify-between rounded-lg bg-muted/50 p-3'>
              <span className='text-muted-foreground'>
                {t('organizationId')}
              </span>
              <span className='font-mono font-medium'>
                {invitation.organizationId}
              </span>
            </div>
            <div className='flex justify-between rounded-lg bg-muted/50 p-3'>
              <span className='text-muted-foreground'>
                {t('common:status')}
              </span>
              <span className='text-emerald-600 capitalize dark:text-emerald-400'>
                {t('statusPending')}
              </span>
            </div>
          </CardContent>
          <CardFooter className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
            <Button
              className='w-full sm:w-auto'
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />{' '}
                  {t('invitationJoining')}
                </>
              ) : (
                t('invitationAccept')
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  },
})
