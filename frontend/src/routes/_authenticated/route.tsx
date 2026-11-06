import { useEffect, useRef, useState } from 'react'
import {
  Outlet,
  createFileRoute,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import { useLogto } from '@logto/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { setAuthToken } from '@/api/clients'
import { getAuthMe } from '@/api/generated'
import { useAuthStore } from '@/stores/auth-store'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  component: function AuthenticatedRoute() {
    const { t } = useTranslation('auth')
    const location = useLocation()
    const navigate = useNavigate()
    const {
      isAuthenticated,
      isLoading,
      signIn,
      getAccessToken,
      fetchUserInfo,
      getIdTokenClaims,
    } = useLogto()
    const accessToken = useAuthStore((state) => state.auth.accessToken)
    const setAccessToken = useAuthStore((state) => state.auth.setAccessToken)
    const organizationID = useAuthStore((state) => state.auth.organizationID)
    const setOrganizationID = useAuthStore(
      (state) => state.auth.setOrganizationID
    )
    const resetAuth = useAuthStore((state) => state.auth.reset)
    const bootstrapping = useRef(false)
    const invitationSignInStarted = useRef(false)
    const [bootstrapError, setBootstrapError] = useState<Error | null>(null)

    const isBypassed = isTenancyBypassedRoute(location.pathname)

    useEffect(() => {
      if (isLoading) return
      const isInvitationPage = location.pathname === '/invitations/accept'
      const searchParams = new URLSearchParams(window.location.search)
      const oneTimeToken = searchParams.get('token')
      const email = searchParams.get('email')

      if (isInvitationPage && oneTimeToken && email) {
        if (invitationSignInStarted.current) return
        invitationSignInStarted.current = true
        const cleanUrl = new URL(window.location.href)
        cleanUrl.searchParams.delete('token')
        cleanUrl.searchParams.delete('email')
        sessionStorage.setItem(
          'logto_redirect',
          `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
        )
        resetAuth()
        void signIn({
          redirectUri: `${window.location.origin}/callback`,
          clearTokens: false,
          extraParams: { one_time_token: oneTimeToken, login_hint: email },
        }).catch((error: unknown) => {
          invitationSignInStarted.current = false
          toast.error(
            error instanceof Error ? error.message : t('signIn.failed')
          )
        })
        return
      }
      if (!isAuthenticated) {
        sessionStorage.setItem('logto_redirect', location.href)
        void signIn(`${window.location.origin}/callback`).catch(
          (error: unknown) => {
            toast.error(
              error instanceof Error ? error.message : t('signIn.failed')
            )
          }
        )
        return
      }
      if (organizationID && accessToken) return
      if (bootstrapError || bootstrapping.current) return
      bootstrapping.current = true

      const resource =
        import.meta.env.VITE_LOGTO_RESOURCE || 'http://localhost:8000'

      async function bootstrapTenancy() {
        if (isBypassed) {
          // These pages must work before the user belongs to any organization.
          const identityToken = await getAccessToken(resource)
          if (!identityToken) {
            throw new Error('Logto access token is unavailable')
          }
          setAuthToken(identityToken)
          setAccessToken(identityToken)
          return
        }

        // Resolve membership through Logto and the active organization through the API.
        // The API verifies the saved token before returning its organization context.
        const [userInfo, claims, authMe] = await Promise.all([
          fetchUserInfo(),
          getIdTokenClaims().catch(() => null),
          accessToken
            ? getAuthMe()
                .then((response) => response.data?.organization_id ?? '')
                .catch(() => '')
            : Promise.resolve(''),
        ])

        const availableOrgs = extractAvailableOrganizations(userInfo, claims)
        let targetOrgId = authMe || organizationID

        if (availableOrgs.length > 0) {
          if (!targetOrgId || !availableOrgs.includes(targetOrgId)) {
            targetOrgId = availableOrgs[0]
          }
        } else {
          // A user without organizations may create one explicitly on the next page.
          const identityToken = await getAccessToken(resource)
          if (!identityToken) {
            throw new Error('Logto access token is unavailable')
          }
          setAuthToken(identityToken)
          setAccessToken(identityToken)
          await navigate({ to: '/organizations/create', replace: true })
          return
        }

        if (!targetOrgId) {
          throw new Error('Failed to resolve organization identity')
        }

        // 3. Acquire organization-scoped access token from Logto
        const organizationToken = await getAccessToken(resource, targetOrgId)
        if (!organizationToken) {
          throw new Error('Logto organization token is unavailable')
        }

        setAuthToken(organizationToken)
        setAccessToken(organizationToken)
        setOrganizationID(targetOrgId)
      }

      void bootstrapTenancy().catch((error: unknown) => {
        bootstrapping.current = false
        const normalizedError =
          error instanceof Error
            ? error
            : new Error('Organization initialization failed')
        resetAuth()
        setBootstrapError(normalizedError)
        toast.error(normalizedError.message)
      })
    }, [
      accessToken,
      bootstrapError,
      fetchUserInfo,
      getAccessToken,
      getIdTokenClaims,
      isAuthenticated,
      isBypassed,
      isLoading,
      location.href,
      location.pathname,
      navigate,
      organizationID,
      resetAuth,
      setAccessToken,
      setOrganizationID,
      signIn,
      t,
    ])

    if (bootstrapError) {
      return (
        <div className='flex min-h-svh items-center justify-center'>
          {bootstrapError.message}
        </div>
      )
    }

    if ((isLoading && !isAuthenticated) || !isAuthenticated || !accessToken) {
      return (
        <div className='flex min-h-svh items-center justify-center'>
          {t('signIn.loading')}
        </div>
      )
    }

    return isBypassed ? <Outlet /> : <AuthenticatedLayout />
  },
})

const TENANCY_BYPASS_PATHS = [
  '/invitations/accept',
  '/organizations/create',
] as const

function isTenancyBypassedRoute(pathname: string): boolean {
  return TENANCY_BYPASS_PATHS.includes(
    pathname as (typeof TENANCY_BYPASS_PATHS)[number]
  )
}

function extractAvailableOrganizations(
  userInfo: unknown,
  claims: unknown
): string[] {
  const info = userInfo as {
    organization_data?: Array<{ id?: string }>
    organizations?: string[]
  } | null
  const cl = claims as { organizations?: string[] } | null

  const orgsFromInfo = Array.isArray(info?.organization_data)
    ? info.organization_data
        .map((org) => org?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    : Array.isArray(info?.organizations)
      ? info.organizations.filter(
          (id): id is string => typeof id === 'string' && id.length > 0
        )
      : []

  const orgsFromClaims = Array.isArray(cl?.organizations)
    ? cl.organizations.filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    : []

  return Array.from(new Set([...orgsFromInfo, ...orgsFromClaims]))
}
