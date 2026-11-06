import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useHandleSignInCallback } from '@logto/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/(auth)/callback')({
  component: function LogtoCallback() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const { auth } = useAuthStore()
    const redirected = useRef(false)
    // Wait for the SDK to finish exchanging the code before restoring the invitation route.
    const { error } = useHandleSignInCallback(() => {
      if (redirected.current) return
      redirected.current = true
      const redirect = sessionStorage.getItem('logto_redirect') || '/'
      sessionStorage.removeItem('logto_redirect')
      const url = new URL(redirect, window.location.origin)
      void navigate({
        to: `${url.pathname}${url.search}${url.hash}`,
        replace: true,
      })
    })

    useEffect(() => {
      if (!error) return
      auth.reset()
      toast.error(error.message)
      void navigate({ to: '/sign-in', replace: true })
    }, [auth, error, navigate])

    return (
      <div className='flex min-h-svh items-center justify-center'>
        {t('signIn.loading', { defaultValue: 'Signing in…' })}
      </div>
    )
  },
})
