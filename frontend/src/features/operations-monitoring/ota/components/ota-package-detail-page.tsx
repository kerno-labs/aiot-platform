import { useState, useMemo } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, AlertCircle, RotateCw, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn, getPageNumbers } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useOTAPackageDetail,
  useUpgradeStatistics,
  useDeviceDeployments,
  useUpgradeBatches,
  type UpgradeBatch,
} from '../api/detail-queries'
import { BatchUpgradeDialog } from './batch-upgrade-dialog'

/**
 * Type definitions for API response data
 */
interface DeviceDeployment {
  deviceId: string
  deviceKey: string
  deviceName: string
  productId: string
  productKey: string
  currentVersion: string
  status: string
  upgradeBatchId: string
  lastStatusChangeTime: string | number
  createdAt: string
}

function ErrorAlert({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry?: () => void
}) {
  const { t } = useTranslation('ota')

  return (
    <div className='flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4'>
      <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-red-600' />
      <div className='flex-1'>
        <h3 className='font-medium text-red-900'>{title}</h3>
        <p className='mt-1 text-sm text-red-700'>{message}</p>
      </div>
      {onRetry && (
        <Button
          variant='outline'
          size='sm'
          onClick={onRetry}
          className='flex-shrink-0'
        >
          <RotateCw className='mr-1 h-4 w-4' />
          {t('common:retry')}
        </Button>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className='animate-pulse rounded-lg border bg-card p-4'>
      <div className='mb-3 h-4 w-24 rounded bg-muted' />
      <div className='h-8 w-16 rounded bg-muted' />
    </div>
  )
}

function DeviceRow({ d }: { d: DeviceDeployment }) {
  const { t } = useTranslation('ota')
  return (
    <TableRow>
      <TableCell className='font-mono text-xs sm:text-sm'>
        {d.deviceName}
      </TableCell>
      <TableCell className='text-xs sm:text-sm'>{d.productKey}</TableCell>
      <TableCell className='text-xs sm:text-sm'>{d.currentVersion}</TableCell>
      <TableCell>
        <Badge
          className='text-xs capitalize'
          variant={
            d.status === 'success'
              ? 'default'
              : d.status === 'failed'
                ? 'destructive'
                : 'outline'
          }
        >
          {t(`packageDetail.statuses.${d.status}`, {
            defaultValue: d.status,
          })}
        </Badge>
      </TableCell>
      <TableCell className='text-xs text-muted-foreground sm:text-sm'>
        {d.lastStatusChangeTime || '-'}
      </TableCell>
      <TableCell className='font-mono text-xs sm:text-sm'>
        {d.upgradeBatchId || '-'}
      </TableCell>
    </TableRow>
  )
}

function DeploymentPagination({
  currentPage,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageNumbers = getPageNumbers(currentPage, totalPages)
  const canPrevious = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <div
      className={cn(
        'flex items-center justify-between overflow-clip px-2',
        '@max-2xl/content:flex-col-reverse @max-2xl/content:gap-4'
      )}
      style={{ overflowClipMargin: 1 }}
    >
      <div className='flex w-full items-center justify-between'>
        <div className='flex w-[100px] items-center justify-center text-sm font-medium @2xl/content:hidden'>
          Page {currentPage} of {totalPages}
        </div>
        <div className='flex items-center gap-2 @max-2xl/content:flex-row-reverse'>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className='h-8 w-[70px]'>
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side='top'>
              {[10, 20, 30, 40, 50, pageSize]
                .filter((size, index, arr) => arr.indexOf(size) === index)
                .sort((a, b) => a - b)
                .map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className='hidden text-sm font-medium sm:block'>Rows per page</p>
        </div>
      </div>

      <div className='flex items-center sm:space-x-6 lg:space-x-8'>
        <div className='flex w-[100px] items-center justify-center text-sm font-medium @max-3xl/content:hidden'>
          Page {currentPage} of {totalPages}
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            className='size-8 p-0 @max-md/content:hidden'
            onClick={() => onPageChange(1)}
            disabled={!canPrevious}
          >
            <span className='sr-only'>Go to first page</span>
            <DoubleArrowLeftIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 p-0'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrevious}
          >
            <span className='sr-only'>Go to previous page</span>
            <ChevronLeftIcon className='h-4 w-4' />
          </Button>

          {pageNumbers.map((pageNumber, index) => (
            <div key={`${pageNumber}-${index}`} className='flex items-center'>
              {pageNumber === '...' ? (
                <span className='px-1 text-sm text-muted-foreground'>...</span>
              ) : (
                <Button
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  className='h-8 min-w-8 px-2'
                  onClick={() => onPageChange(pageNumber as number)}
                >
                  <span className='sr-only'>Go to page {pageNumber}</span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          <Button
            variant='outline'
            className='size-8 p-0'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
          >
            <span className='sr-only'>Go to next page</span>
            <ChevronRightIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='size-8 p-0 @max-md/content:hidden'
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
          >
            <span className='sr-only'>Go to last page</span>
            <DoubleArrowRightIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * OTA Package Detail Page
 * Displays comprehensive details of an OTA package including:
 * - Package metadata
 * - Upgrade statistics (target devices, success/fail counts)
 * - Device deployment status
 *
 * Responsive design:
 * - Mobile (< 640px): Single column layout, stacked cards
 * - Tablet (640px - 1024px): 2-column layout for statistics
 * - Desktop (> 1024px): 4-column layout for statistics
 */
export function OTAPackageDetailPage() {
  const { t } = useTranslation(['ota', 'common'])
  const navigate = useNavigate()
  const params = useParams({
    from: '/_authenticated/operations-monitoring/ota/packages/$id/',
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState<string>()
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<string>()
  const [batchSearch, setBatchSearch] = useState('')
  const [deviceNameFilter, setDeviceNameFilter] = useState('')
  const [appliedDeviceNameFilter, setAppliedDeviceNameFilter] = useState('')
  const [batchIdFilter, setBatchIdFilter] = useState('')
  const [deviceSearchKey, setDeviceSearchKey] = useState(0)
  const [batchUpgradeOpen, setBatchUpgradeOpen] = useState(false)

  // Data fetching hooks
  const packageQuery = useOTAPackageDetail(params.id)
  const packageUuid = params.id

  const statisticsQuery = useUpgradeStatistics(packageUuid)
  const deploymentsQuery = useDeviceDeployments(
    packageUuid,
    currentPage,
    pageSize,
    appliedStatusFilter,
    deviceSearchKey
  )
  const batchesQuery = useUpgradeBatches(packageUuid)

  const batches = useMemo(() => {
    const all = batchesQuery.data ?? []
    const q = batchSearch.trim().toLowerCase()
    if (!q) return all
    return all.filter((b) => b.batchId.toLowerCase().includes(q))
  }, [batchesQuery.data, batchSearch])

  const filteredDeployments = useMemo(() => {
    const all = deploymentsQuery.data?.deployments ?? []
    const nameQ = appliedDeviceNameFilter.trim().toLowerCase()
    const batchQ = batchIdFilter.trim().toLowerCase()
    return all.filter((d) => {
      if (nameQ && !d.deviceName.toLowerCase().includes(nameQ)) return false
      if (batchQ && !d.upgradeBatchId.toLowerCase().includes(batchQ))
        return false
      return true
    })
  }, [deploymentsQuery.data, appliedDeviceNameFilter, batchIdFilter])

  const handleDeviceSearch = () => {
    setAppliedDeviceNameFilter(deviceNameFilter)
    setAppliedStatusFilter(statusFilter)
    setCurrentPage(1)
    setDeviceSearchKey((key) => key + 1)
  }

  const handleBack = () => {
    navigate({
      to: '/operations-monitoring/ota/packages',
    })
  }

  // Main error state
  if (packageQuery.isError) {
    return (
      <div className='flex flex-1 flex-col gap-4 p-6'>
        <Button
          variant='ghost'
          size='sm'
          onClick={handleBack}
          className='mb-2 w-fit'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          {t('common:back')}
        </Button>
        <ErrorAlert
          title={t('packageDetail.errors.loadPackage.title')}
          message={t('packageDetail.errors.loadPackage.description')}
          onRetry={() => {
            void packageQuery.refetch()
          }}
        />
      </div>
    )
  }

  const pkg = packageQuery.data
  const stats = statisticsQuery.data

  return (
    <div className='flex flex-1 flex-col gap-4 px-2 py-2 sm:px-4'>
      {/* Header with back button */}
      <div className='flex items-center justify-between gap-2'>
        <Button variant='ghost' size='sm' onClick={handleBack} className='mb-2'>
          <ArrowLeft className='mr-2 h-4 w-4' />
          {t('common:back')}
        </Button>
      </div>

      {/* Main content */}
      <div className='flex flex-col gap-6'>
        {/* Package basics */}
        <div className='border-b pb-5'>
          <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
            {packageQuery.isLoading ? (
              <span className='animate-pulse'>{t('common:loading')}</span>
            ) : (
              pkg?.packageName || t('packageDetail.unknownPackage')
            )}
          </h1>
          {!packageQuery.isLoading && (
            <dl className='mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground sm:text-base'>
              <div className='flex items-center gap-2'>
                <dt>{t('packageForm.fields.version')}:</dt>
                <dd className='font-medium text-foreground'>{pkg?.version}</dd>
              </div>
              <div className='flex items-center gap-2'>
                <dt>{t('packageDetail.type')}:</dt>
                <dd>
                  <Badge className='text-xs sm:text-sm'>
                    {t(`packageList.packageTypes.${pkg?.packageType}`, {
                      defaultValue: pkg?.packageType,
                    })}
                  </Badge>
                </dd>
              </div>
              <div className='flex items-center gap-2'>
                <dt>{t('common:status')}:</dt>
                <dd>
                  <Badge variant='secondary' className='text-xs sm:text-sm'>
                    {t(`packageList.statuses.${pkg?.status}`, {
                      defaultValue: pkg?.status,
                    })}
                  </Badge>
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* Statistics cards section */}
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4'>
          <div className='rounded-lg border bg-card p-3 sm:p-4'>
            <div className='text-xs font-medium text-muted-foreground sm:text-sm'>
              {t('packageDetail.statistics.targetDevices')}
            </div>
            <div className='mt-2 text-xl font-bold sm:text-2xl'>
              {statisticsQuery.isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : statisticsQuery.isError ? (
                <span className='text-sm text-red-600'>
                  {t('common:error')}
                </span>
              ) : (
                (stats?.totalTargetDevices ?? '-')
              )}
            </div>
          </div>
          <div className='rounded-lg border bg-card p-3 sm:p-4'>
            <div className='text-xs font-medium text-muted-foreground sm:text-sm'>
              {t('packageDetail.statistics.successful')}
            </div>
            <div className='mt-2 text-xl font-bold text-green-600 sm:text-2xl'>
              {statisticsQuery.isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : statisticsQuery.isError ? (
                <span className='text-sm text-red-600'>
                  {t('common:error')}
                </span>
              ) : (
                (stats?.successfulUpgrades ?? '-')
              )}
            </div>
          </div>
          <div className='rounded-lg border bg-card p-3 sm:p-4'>
            <div className='text-xs font-medium text-muted-foreground sm:text-sm'>
              {t('packageDetail.statistics.failed')}
            </div>
            <div className='mt-2 text-xl font-bold text-red-600 sm:text-2xl'>
              {statisticsQuery.isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : statisticsQuery.isError ? (
                <span className='text-sm text-red-600'>
                  {t('common:error')}
                </span>
              ) : (
                (stats?.failedUpgrades ?? '-')
              )}
            </div>
          </div>
          <div className='rounded-lg border bg-card p-3 sm:p-4'>
            <div className='text-xs font-medium text-muted-foreground sm:text-sm'>
              {t('packageDetail.statistics.inProgress')}
            </div>
            <div className='mt-2 text-xl font-bold text-blue-600 sm:text-2xl'>
              {statisticsQuery.isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : statisticsQuery.isError ? (
                <span className='text-sm text-red-600'>
                  {t('common:error')}
                </span>
              ) : (
                (stats?.inProgressUpgrades ?? '-')
              )}
            </div>
          </div>
        </div>

        {/* Tabs section */}
        <Tabs defaultValue='batches' className='w-full'>
          <TabsList>
            <TabsTrigger value='batches'>
              {t('packageDetail.tabs.batches')}
            </TabsTrigger>
            <TabsTrigger value='devices'>
              {t('packageDetail.tabs.devices')}
            </TabsTrigger>
            <TabsTrigger value='info'>
              {t('packageDetail.tabs.info')}
            </TabsTrigger>
          </TabsList>

          {/* Batch Management Tab */}
          <TabsContent value='batches' className='space-y-4'>
            {batchesQuery.isError && (
              <ErrorAlert
                title={t('packageDetail.errors.loadBatches.title')}
                message={t('packageDetail.errors.loadBatches.description')}
                onRetry={() => {
                  void batchesQuery.refetch()
                }}
              />
            )}
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <Input
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                placeholder={t('common:searchPlaceholder')}
                className='sm:max-w-xs'
              />
              <Button
                variant='default'
                onClick={() => setBatchUpgradeOpen(true)}
              >
                {t('packageList.actions.bulkUpgrade')}
              </Button>
            </div>
            <div className='overflow-x-auto rounded-lg border bg-card'>
              <Table className='text-sm sm:text-base'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('packageDetail.columns.batchId')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('packageDetail.columns.strategy')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('common:status')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('packageDetail.columns.devices')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('common:createdAt')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchesQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className='py-8 text-center'>
                        <Loader2 className='mx-auto h-4 w-4 animate-spin' />
                      </TableCell>
                    </TableRow>
                  ) : batches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='py-8 text-center text-xs text-muted-foreground sm:text-sm'
                      >
                        {t('packageDetail.emptyBatches')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches.map((b: UpgradeBatch) => (
                      <TableRow key={b.batchId}>
                        <TableCell className='font-mono text-xs sm:text-sm'>
                          {b.batchId}
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm'>
                          {b.upgradeStrategy
                            ? t(`packageDetail.strategies.${b.upgradeStrategy}`)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline' className='capitalize'>
                            {t(`packageDetail.statuses.${b.status}`, {
                              defaultValue: b.status,
                            })}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm'>
                          {b.targetDeviceCount}
                        </TableCell>
                        <TableCell className='text-xs sm:text-sm'>
                          {b.createdAt || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Device List Tab */}
          <TabsContent value='devices' className='space-y-4'>
            {deploymentsQuery.isError && (
              <ErrorAlert
                title={t('packageDetail.errors.loadDevices.title')}
                message={t('packageDetail.errors.loadDevices.description')}
                onRetry={() => {
                  void deploymentsQuery.refetch()
                }}
              />
            )}
            <div className='mb-4 flex flex-col gap-2 sm:flex-row'>
              <Select
                value={statusFilter ?? 'all'}
                onValueChange={(value) => {
                  setStatusFilter(value === 'all' ? undefined : value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className='w-full sm:w-[200px]'>
                  <SelectValue
                    placeholder={t('packageDetail.filters.allStatus')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>
                    {t('packageDetail.filters.allStatus')}
                  </SelectItem>
                  <SelectItem value='pending'>
                    {t('packageDetail.statuses.pending')}
                  </SelectItem>
                  <SelectItem value='in_progress'>
                    {t('packageDetail.statuses.in_progress')}
                  </SelectItem>
                  <SelectItem value='success'>
                    {t('packageDetail.statuses.success')}
                  </SelectItem>
                  <SelectItem value='failed'>
                    {t('packageDetail.statuses.failed')}
                  </SelectItem>
                  <SelectItem value='cancelled'>
                    {t('packageDetail.statuses.cancelled')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={deviceNameFilter}
                onChange={(e) => setDeviceNameFilter(e.target.value)}
                placeholder={t('packageDetail.columns.device')}
                className='w-full sm:w-[200px]'
              />
              <Input
                value={batchIdFilter}
                onChange={(e) => setBatchIdFilter(e.target.value)}
                placeholder={t('packageDetail.columns.batchId')}
                className='w-full sm:w-[200px]'
              />
              <Button
                type='button'
                onClick={handleDeviceSearch}
                className='w-full sm:w-auto'
              >
                <Search className='mr-2 h-4 w-4' />
                {t('common:search')}
              </Button>
            </div>

            <div className='overflow-x-auto rounded-lg border bg-card'>
              <Table className='text-sm sm:text-base'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('packageDetail.columns.device')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('packageDetail.columns.product')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('packageDetail.columns.version')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('common:status')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('packageDetail.columns.lastUpdated')}
                    </TableHead>
                    <TableHead className='text-xs sm:text-sm'>
                      {t('packageDetail.columns.batchId')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deploymentsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className='py-8 text-center'>
                        <Loader2 className='mx-auto h-4 w-4 animate-spin' />
                      </TableCell>
                    </TableRow>
                  ) : filteredDeployments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='py-8 text-center text-xs text-muted-foreground sm:text-sm'
                      >
                        {t('packageDetail.emptyDevices')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDeployments.map((d) => (
                      <DeviceRow key={d.deviceId} d={d} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <DeploymentPagination
              currentPage={currentPage}
              pageSize={pageSize}
              total={deploymentsQuery.data?.total || 0}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </TabsContent>

          {/* Package Info Tab */}
          <TabsContent value='info' className='space-y-4'>
            {packageQuery.isLoading ? (
              <div className='space-y-4 rounded-lg border bg-card p-6'>
                <div className='grid grid-cols-2 gap-4'>
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            ) : (
              <div className='space-y-4'>
                {/* File Information Section */}
                <div className='overflow-hidden rounded-lg border bg-card'>
                  <div className='border-b bg-muted px-6 py-3'>
                    <h3 className='text-sm font-semibold'>
                      {t('packageDetail.sections.fileInformation')}
                    </h3>
                  </div>
                  <div className='space-y-4 p-6'>
                    <div>
                      <label className='mb-2 block text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                        {t('viewDialog.fields.fileUrl')}
                      </label>
                      <p className='rounded bg-muted p-3 font-mono text-sm break-all'>
                        {pkg?.fileUrl || '-'}
                      </p>
                    </div>
                    <div>
                      <label className='mb-2 block text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                        {t('packageDetail.fields.checksum')}
                      </label>
                      <p className='rounded bg-muted p-3 font-mono text-sm break-all'>
                        {pkg?.checksum || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className='overflow-hidden rounded-lg border bg-card'>
                  <div className='border-b bg-muted px-6 py-3'>
                    <h3 className='text-sm font-semibold'>
                      {t('packageDetail.sections.descriptionAndNotes')}
                    </h3>
                  </div>
                  <div className='p-6'>
                    <p className='text-sm leading-relaxed whitespace-pre-wrap'>
                      {pkg?.description || (
                        <span className='text-muted-foreground italic'>
                          {t('packageDetail.emptyDescription')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <BatchUpgradeDialog
          open={batchUpgradeOpen}
          onOpenChange={setBatchUpgradeOpen}
          productId={pkg?.productId}
          packageUuid={pkg?.uuid ?? packageUuid}
        />
      </div>
    </div>
  )
}
