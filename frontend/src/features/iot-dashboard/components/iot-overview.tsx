import {
  ArrowDown,
  ArrowUp,
  Battery,
  Cpu,
  HardDrive,
  Radio,
  Router,
  Wifi,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const kpis = [
  {
    key: 'totalDevices',
    value: '13,728',
    delta: '+248',
    trend: 'up' as const,
    note: '+1.8% 较上周',
    icon: Radio,
  },
  {
    key: 'onlineNow',
    value: '11,847',
    delta: '86.3%',
    trend: 'up' as const,
    note: '▲ 0.4% 较 24 小时前',
    icon: Wifi,
  },
  {
    key: 'activeAlerts',
    value: '23',
    delta: '-5',
    trend: 'down' as const,
    note: '▼ 17.8% 较 24 小时前',
    icon: Cpu,
  },
  {
    key: 'messagesPerSec',
    value: '24.9K',
    delta: '+8.2%',
    trend: 'up' as const,
    note: 'P99 延迟 142ms',
    icon: HardDrive,
  },
]

const productHealth = [
  {
    name: '温湿度传感器 v3',
    uptime: 99.8,
    devices: 3_412,
    status: 'healthy' as const,
  },
  {
    name: '智能网关 Pro',
    uptime: 99.4,
    devices: 1_204,
    status: 'healthy' as const,
  },
  { name: '能源表', uptime: 97.6, devices: 2_811, status: 'healthy' as const },
  {
    name: '资产追踪器',
    uptime: 94.1,
    devices: 1_988,
    status: 'warning' as const,
  },
  {
    name: '空气质量节点',
    uptime: 98.9,
    devices: 2_204,
    status: 'healthy' as const,
  },
  {
    name: '压力传感器',
    uptime: 88.2,
    devices: 1_109,
    status: 'critical' as const,
  },
]

const recentEvents = [
  {
    type: 'success' as const,
    title: '固件 4.2.1 升级完成',
    description: '248 台设备已更新 · 0 台失败',
    time: '2 分钟前',
  },
  {
    type: 'warning' as const,
    title: '电量过低：temp-sensor-2287',
    description: '电量剩余 14% · 最近上报 4 分钟前',
    time: '14 分钟前',
  },
  {
    type: 'destructive' as const,
    title: '连接断开：gateway-prod-04',
    description: '412 台下游设备无法访问',
    time: '38 分钟前',
  },
  {
    type: 'info' as const,
    title: '新设备已注册',
    description: 'asset-tracker-2A91 已在 ap-southeast-2 完成激活',
    time: '1 小时前',
  },
  {
    type: 'success' as const,
    title: '规则执行批次',
    description: '最近 60 秒内触发 18 次自动化动作',
    time: '1 小时前',
  },
]

const regionStats = [
  { code: 'us-east-1', name: '弗吉尼亚', count: 4_812, health: 99.2 },
  { code: 'eu-west-1', name: '爱尔兰', count: 3_209, health: 98.7 },
  { code: 'ap-southeast-2', name: '悉尼', count: 1_984, health: 94.4 },
  { code: 'ap-northeast-1', name: '东京', count: 1_602, health: 99.1 },
  { code: 'sa-east-1', name: '圣保罗', count: 1_121, health: 87.2 },
]

export function IotOverview() {
  const { t } = useTranslation(['iotDashboard', 'common'])

  function eventBadge(type: 'success' | 'warning' | 'destructive' | 'info') {
    if (type === 'success')
      return (
        <Badge className='bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'>
          {t('status.healthy')}
        </Badge>
      )
    if (type === 'warning')
      return (
        <Badge className='bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300'>
          {t('status.warning')}
        </Badge>
      )
    if (type === 'destructive')
      return <Badge variant='destructive'>{t('status.critical')}</Badge>
    return <Badge variant='secondary'>{t('status.info')}</Badge>
  }

  function healthBadge(status: 'healthy' | 'warning' | 'critical') {
    if (status === 'healthy')
      return (
        <Badge className='bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'>
          {t('status.healthy')}
        </Badge>
      )
    if (status === 'warning')
      return (
        <Badge className='bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300'>
          {t('status.warning')}
        </Badge>
      )
    return <Badge variant='destructive'>{t('status.critical')}</Badge>
  }

  return (
    <div className='space-y-4'>
      {/* ───────── 页面标题 ───────── */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='space-y-1'>
          <p className='text-xs tracking-wider text-muted-foreground uppercase'>
            {t('eyebrow')}
          </p>
          <h1 className='text-2xl font-bold tracking-tight'>{t('title')}</h1>
        </div>
        <div className='flex items-center gap-2'>
          <Tabs defaultValue='24h'>
            <TabsList>
              <TabsTrigger value='1h'>{t('timeRange.1h')}</TabsTrigger>
              <TabsTrigger value='24h'>{t('timeRange.24h')}</TabsTrigger>
              <TabsTrigger value='7d'>{t('timeRange.7d')}</TabsTrigger>
              <TabsTrigger value='30d'>{t('timeRange.30d')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant='outline' size='sm'>
            {t('common:export')}
          </Button>
          <Button size='sm'>{t('common:refresh')}</Button>
        </div>
      </div>

      <Separator />

      {/* ───────── KPI 卡片 ───────── */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          const TrendIcon = kpi.trend === 'up' ? ArrowUp : ArrowDown
          return (
            <Card key={kpi.key}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  {t(`kpis.${kpi.key}`)}
                </CardTitle>
                <Icon className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{kpi.value}</div>
                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <span
                    className={
                      kpi.trend === 'up'
                        ? 'inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400'
                        : 'inline-flex items-center gap-0.5 text-red-600 dark:text-red-400'
                    }
                  >
                    <TrendIcon className='h-3 w-3' />
                    {kpi.delta}
                  </span>
                  <span className='text-muted-foreground'>{kpi.note}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ───────── 图表 + 侧栏 ───────── */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div>
                <CardTitle>{t('throughput.title')}</CardTitle>
                <CardDescription>{t('throughput.description')}</CardDescription>
              </div>
              <Badge variant='secondary' className='gap-1.5'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
                {t('throughput.live')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <OverviewChart />
          </CardContent>
        </Card>

        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>{t('fleet.title')}</CardTitle>
            <CardDescription>{t('fleet.description')}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <StatusRow
              label={t('fleet.online')}
              value={11847}
              total={13728}
              color='bg-emerald-500'
            />
            <StatusRow
              label={t('fleet.idle')}
              value={1302}
              total={13728}
              color='bg-slate-400'
            />
            <StatusRow
              label={t('fleet.degraded')}
              value={412}
              total={13728}
              color='bg-amber-500'
            />
            <StatusRow
              label={t('fleet.offline')}
              value={167}
              total={13728}
              color='bg-red-500'
            />
            <Separator />
            <div className='grid grid-cols-2 gap-4 pt-2'>
              <div>
                <p className='text-xs text-muted-foreground'>
                  {t('fleet.p99Latency')}
                </p>
                <p className='text-lg font-semibold'>142ms</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>
                  {t('fleet.avgBattery')}
                </p>
                <p className='text-lg font-semibold'>78%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───────── 产品健康度 + 区域分布 ───────── */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div>
                <CardTitle>{t('products.title')}</CardTitle>
                <CardDescription>{t('products.description')}</CardDescription>
              </div>
              <Button variant='ghost' size='sm'>
                {t('actions.viewAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {productHealth.map((product) => {
                const barColor =
                  product.status === 'critical'
                    ? 'bg-red-500'
                    : product.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                return (
                  <div key={product.name} className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{product.name}</span>
                        {healthBadge(product.status)}
                      </div>
                      <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                        <span>
                          {t('products.devices', { count: product.devices })}
                        </span>
                        <span className='font-mono'>{product.uptime}%</span>
                      </div>
                    </div>
                    <div className='relative h-1.5 overflow-hidden rounded-full bg-muted'>
                      <div
                        className={`h-full ${barColor} transition-all`}
                        style={{ width: `${product.uptime}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>{t('regions.title')}</CardTitle>
            <CardDescription>{t('regions.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {regionStats.map((region) => (
                <div
                  key={region.code}
                  className='flex items-center justify-between'
                >
                  <div className='flex items-center gap-3'>
                    <Router className='h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='text-sm leading-none font-medium'>
                        {region.name}
                      </p>
                      <p className='mt-1 font-mono text-xs text-muted-foreground'>
                        {region.code}
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm leading-none font-semibold'>
                      {region.count.toLocaleString()}
                    </p>
                    <p
                      className={
                        region.health < 90
                          ? 'mt-1 text-xs text-red-600 dark:text-red-400'
                          : region.health < 96
                            ? 'mt-1 text-xs text-amber-600 dark:text-amber-400'
                            : 'mt-1 text-xs text-muted-foreground'
                      }
                    >
                      {region.health}% {t('regions.healthy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───────── 最近事件 ───────── */}
      <Card>
        <CardHeader>
          <div className='flex items-start justify-between'>
            <div>
              <CardTitle>{t('events.title')}</CardTitle>
              <CardDescription>{t('events.description')}</CardDescription>
            </div>
            <Button variant='outline' size='sm'>
              {t('actions.viewAll')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {recentEvents.map((event, idx) => (
              <div
                key={idx}
                className='flex items-start gap-4 rounded-md border p-3'
              >
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted'>
                  <Battery className='h-4 w-4 text-muted-foreground' />
                </div>
                <div className='flex-1 space-y-1'>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm leading-none font-medium'>
                      {event.title}
                    </p>
                    {eventBadge(event.type)}
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    {event.description}
                  </p>
                </div>
                <span className='shrink-0 text-xs text-muted-foreground'>
                  {event.time}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ───────── 小型内联组件 ───────── */

function StatusRow({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = (value / total) * 100
  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between text-sm'>
        <div className='flex items-center gap-2'>
          <span className={`h-2 w-2 rounded-full ${color}`} />
          <span>{label}</span>
        </div>
        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
          <span className='font-mono'>{value.toLocaleString()}</span>
          <span className='w-10 text-right'>{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div className='relative h-1.5 overflow-hidden rounded-full bg-muted'>
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function OverviewChart() {
  // 模拟吞吐量数据 —— 真实的昼夜曲线，不是随机噪声
  const points = [
    { hour: '00:00', value: 18_400 },
    { hour: '03:00', value: 14_200 },
    { hour: '06:00', value: 16_800 },
    { hour: '09:00', value: 22_100 },
    { hour: '12:00', value: 24_900 },
    { hour: '15:00', value: 23_400 },
    { hour: '18:00', value: 21_800 },
    { hour: '21:00', value: 19_600 },
    { hour: '23:59', value: 17_200 },
  ]
  const max = Math.max(...points.map((p) => p.value))
  return (
    <div className='space-y-3'>
      <div className='flex h-32 items-end gap-2'>
        {points.map((p) => (
          <div
            key={p.hour}
            className='flex-1 rounded-t bg-primary/80 transition-colors hover:bg-primary'
            style={{ height: `${(p.value / max) * 100}%` }}
            title={`${p.hour} · ${p.value.toLocaleString()} msg/s`}
          />
        ))}
      </div>
      <div className='flex justify-between text-xs text-muted-foreground'>
        {points.map((p) => (
          <span key={p.hour} className='font-mono'>
            {p.hour}
          </span>
        ))}
      </div>
    </div>
  )
}
