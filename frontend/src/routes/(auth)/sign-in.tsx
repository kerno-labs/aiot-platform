import { useEffect, useRef } from 'react'
import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { useLogto } from '@logto/react'
import { useTranslation } from 'react-i18next'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  component: function LogtoSignInRedirect() {
    const { t } = useTranslation('auth')
    const { signIn } = useLogto()
    const { redirect } = Route.useSearch()
    const started = useRef(false)

    const redirectPath = (() => {
      if (!redirect) return sessionStorage.getItem('logto_redirect') || '/'
      try {
        const url = new URL(redirect, window.location.origin)
        return `${url.pathname}${url.search}${url.hash}`
      } catch {
        return '/'
      }
    })()

    useEffect(() => {
      if (started.current) return
      started.current = true

      sessionStorage.setItem('logto_redirect', redirectPath)
      void signIn(`${window.location.origin}/callback`).catch(() => {
        started.current = false
      })
    }, [redirectPath, signIn])

    return (
      <div className='flex min-h-svh items-center justify-center'>
        {t('signIn.redirecting', { defaultValue: 'Redirecting to Logto...' })}
      </div>
    )
  },
  validateSearch: searchSchema,
})
