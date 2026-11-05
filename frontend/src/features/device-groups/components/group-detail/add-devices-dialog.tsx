import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  getDevices,
  getProducts,
  postDeviceGroupsGroupUuidDevices,
} from '@/api/generated'
import type { Device as DeviceV1Device } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { DataTablePagination } from '@/components/data-table'
import { deviceStateKey } from '@/features/devices/data/data'
import { DEVICE_STATE } from '@/features/devices/data/schema'

interface AddDevicesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupUuid: string
  existingDeviceKeys: string[]
}

export function AddDevicesDialog({
  open,
  onOpenChange,
  groupUuid,
  existingDeviceKeys,
}: AddDevicesDialogProps) {
  const { t } = useTranslation('deviceGroup')
  const queryClient = useQueryClient()
  const [selectedProduct, setSelectedProduct] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // 获取所有设备列表
  const { data: devicesData, isLoading: isDevicesLoading } = useQuery({
    queryKey: ['available-devices-for-group', groupUuid],
    queryFn: () => getDevices({ page: 1, pageSize: 100 }),
    enabled: open,
  })

  // 获取所有产品列表供筛选
  const { data: productsData } = useQuery({
    queryKey: ['products-for-group-filter'],
    queryFn: () => getProducts({ page: 1, pageSize: 100 }),
    enabled: open,
  })

  const products = useMemo(
    () => productsData?.data?.products || [],
    [productsData]
  )
  const allDevices: DeviceV1Device[] = useMemo(
    () => devicesData?.data?.devices || [],
    [devicesData]
  )

  // 过滤未加入该分组的设备
  const availableDevices = useMemo(() => {
    const existingSet = new Set(existingDeviceKeys)
    return allDevices.filter((d) => {
      if (!d.deviceKey || existingSet.has(d.deviceKey)) return false
      if (selectedProduct !== 'all') {
        const prod = products.find(
          (p) =>
            String(p.id) === selectedProduct || p.productKey === selectedProduct
        )
        if (prod && d.productKey && d.productKey !== prod.productKey)
          return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchKey = d.deviceKey.toLowerCase().includes(q)
        const matchName = d.name?.toLowerCase().includes(q)
        if (!matchKey && !matchName) return false
      }
      return true
    })
  }, [allDevices, existingDeviceKeys, selectedProduct, search, products])

  const paginationTable = useReactTable({
    data: availableDevices,
    columns: [],
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const paginatedDevices = paginationTable
    .getRowModel()
    .rows.map((row) => row.original)

  const addMutation = useMutation({
    mutationFn: () =>
      postDeviceGroupsGroupUuidDevices(groupUuid, {
        deviceKeys: selectedKeys,
      }),
    onSuccess: () => {
      toast.success(t('addSuccess'))
      queryClient.invalidateQueries({
        queryKey: ['device-group', groupUuid, 'devices'],
      })
      queryClient.invalidateQueries({ queryKey: ['device-group', groupUuid] })
      setSelectedKeys([])
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('addError'))
    },
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const keys = availableDevices
        .map((d) => d.deviceKey)
        .filter(Boolean) as string[]
      setSelectedKeys(Array.from(new Set([...selectedKeys, ...keys])))
    } else {
      const availableSet = new Set(availableDevices.map((d) => d.deviceKey))
      setSelectedKeys(selectedKeys.filter((k) => !availableSet.has(k)))
    }
  }

  const handleToggleDevice = (deviceKey: string) => {
    setSelectedKeys((prev) =>
      prev.includes(deviceKey)
        ? prev.filter((k) => k !== deviceKey)
        : [...prev, deviceKey]
    )
  }

  const isAllSelected =
    availableDevices.length > 0 &&
    availableDevices.every(
      (d) => d.deviceKey && selectedKeys.includes(d.deviceKey)
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[85vh] flex-col sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('addDeviceDialogTitle')}</DialogTitle>
          <DialogDescription>{t('addDeviceDialogDesc')}</DialogDescription>
        </DialogHeader>

        {/* 筛选与搜索工具栏 */}
        <div className='flex flex-wrap items-center gap-3 py-2'>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className='w-[160px]'>
              <SelectValue placeholder={t('allProducts')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('allProducts')}</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.productKey || String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className='relative min-w-[200px] flex-1'>
            <Search className='absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchDevicePlaceholder')}
              className='pl-8'
            />
          </div>
        </div>

        {/* 可选设备表格 */}
        <div className='min-h-[260px] flex-1 overflow-auto rounded-md border'>
          <Table>
            <TableHeader className='sticky top-0 bg-muted/50'>
              <TableRow>
                <TableHead className='w-12 text-center'>
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label='Select all'
                  />
                </TableHead>
                <TableHead>{t('deviceName')}</TableHead>
                <TableHead>{t('productName')}</TableHead>
                <TableHead>{t('statusAndState')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDevicesLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='h-24 text-center text-muted-foreground'
                  >
                    {t('common:loading')}
                  </TableCell>
                </TableRow>
              ) : availableDevices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='h-24 text-center text-muted-foreground'
                  >
                    {t('noDevicesFound')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((device) => {
                  const isChecked = device.deviceKey
                    ? selectedKeys.includes(device.deviceKey)
                    : false
                  return (
                    <TableRow
                      key={device.deviceKey}
                      className='cursor-pointer hover:bg-muted/50'
                      onClick={() =>
                        device.deviceKey && handleToggleDevice(device.deviceKey)
                      }
                    >
                      <TableCell
                        className='text-center'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() =>
                            device.deviceKey &&
                            handleToggleDevice(device.deviceKey)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span className='font-medium'>
                            {device.name || '-'}
                          </span>
                          <span className='font-mono text-xs text-muted-foreground'>
                            {device.deviceKey}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className='text-sm'>
                          {device.productName || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            device.state === DEVICE_STATE.ONLINE
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {t(
                            `deviceManagement:devices.state.${deviceStateKey(device.state)}`
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination table={paginationTable} className='mt-2' />

        <DialogFooter className='flex items-center justify-between pt-2 sm:justify-between'>
          <div className='text-sm text-muted-foreground'>
            {t('selectedDevicesCount', { count: selectedKeys.length })}
          </div>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('common:cancel')}
            </Button>
            <Button
              type='button'
              disabled={selectedKeys.length === 0 || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? t('common:loading') : t('common:save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
