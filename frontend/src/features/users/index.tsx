import { useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Users as UsersIcon, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  useOrganizationMembers,
  useOrganizationInvitations,
} from './api/queries'
import { InvitationsTable } from './components/invitations-table'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { type User, mapMemberToUser } from './data/schema'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const { t } = useTranslation('users')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users')
  const [username, setUsername] = useState('')
  const [appliedUsername, setAppliedUsername] = useState('')
  const page = search.page ?? 1
  const pageSize = search.pageSize ?? 10
  const membersQuery = useOrganizationMembers({
    page,
    pageSize,
    q: appliedUsername || undefined,
  })
  const { data: membersResponse } = membersQuery
  const { data: invitationsResponse, isLoading: invitationsLoading } =
    useOrganizationInvitations({ page, pageSize })
  const invitations = invitationsResponse?.items ?? []

  const actualUsers: User[] = useMemo(() => {
    const selectedStatuses = search.status as string[] | undefined
    return (membersResponse?.items ?? [])
      .map(mapMemberToUser)
      .filter(
        (user) =>
          selectedStatuses?.length === 0 ||
          !selectedStatuses ||
          selectedStatuses.includes(user.status)
      )
  }, [membersResponse?.items, search.status])

  const pendingInvitationsCount = invitationsResponse?.pendingCount ?? 0

  return (
    <UsersProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{t('title')}</h2>
          </div>
          <UsersPrimaryButtons />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as 'users' | 'invitations')
            navigate({
              search: (previous) => ({
                ...(previous as Record<string, unknown>),
                page: undefined,
              }),
            })
          }}
          className='min-h-0 w-full flex-1 space-y-4'
        >
          <TabsList>
            <TabsTrigger value='users' className='gap-2'>
              <UsersIcon className='h-4 w-4' />
              {t('membersTab')}
            </TabsTrigger>
            <TabsTrigger value='invitations' className='gap-2'>
              <Mail className='h-4 w-4' />
              {t('invitationsTab')}
              {pendingInvitationsCount > 0 && (
                <Badge
                  variant='secondary'
                  className='ml-1.5 h-5 px-1.5 text-xs'
                >
                  {pendingInvitationsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='users'
            className='flex min-h-0 flex-1 flex-col gap-4'
          >
            <UsersTable
              data={actualUsers}
              hasNext={membersResponse?.hasNext ?? false}
              username={username}
              onUsernameChange={setUsername}
              onSearch={(value) => {
                const nextUsername = value?.trim() ?? ''
                setUsername(value ?? '')
                if (nextUsername === appliedUsername) {
                  void membersQuery.refetch()
                } else {
                  setAppliedUsername(nextUsername)
                }
                navigate({
                  search: (previous) => ({
                    ...(previous as Record<string, unknown>),
                    page: undefined,
                  }),
                })
              }}
              onRefresh={() => {
                void membersQuery.refetch()
              }}
              search={search}
              navigate={navigate}
            />
          </TabsContent>

          <TabsContent
            value='invitations'
            className='flex min-h-0 flex-1 flex-col gap-4'
          >
            <InvitationsTable
              data={invitations}
              page={page}
              pageSize={pageSize}
              total={invitationsResponse?.total ?? 0}
              navigate={navigate}
              isLoading={invitationsLoading}
            />
          </TabsContent>
        </Tabs>
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
