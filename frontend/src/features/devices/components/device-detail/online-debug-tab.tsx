import { useEffect, useRef, useState } from 'react'
import { Route } from '@/routes/_authenticated/device-management/devices/$deviceKey'
import {
  CheckCircle2,
  Code2,
  Loader2,
  Play,
  Radio,
  Send,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { usePutDevicesDeviceKeyShadowDesired } from '@/api/generated'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useSimulatePush } from '../../api'

interface DebugLogEntry {
  id: string
  timestamp: Date
  type: 'telemetry_push' | 'command_send'
  title: string
  request: string
  response?: string
  success: boolean
  durationMs: number
}

const SAMPLE_TELEMETRY = `{
  "power": true,
  "mode": "auto",
  "temperature": 26.5,
  "humidity": 58.2,
  "voltage": 220.5,
  "report_interval": 300,
  "battery": 82,
  "signal": -67
}`

const SAMPLE_COMMAND = `{
  "power": true,
  "mode": "auto",
  "temperature": 24,
  "report_interval": 300
}`

export function OnlineDebugTab() {
  const { deviceKey } = Route.useParams()
  const { t } = useTranslation('deviceManagement')
  const [telemetryPayload, setTelemetryPayload] = useState(SAMPLE_TELEMETRY)
  const [commandPayload, setCommandPayload] = useState(SAMPLE_COMMAND)
  const [logs, setLogs] = useState<DebugLogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  const { mutate: simulatePush, isPending: isPushing } = useSimulatePush()
  const { mutate: updateShadowDesired, isPending: isCommandSending } =
    usePutDevicesDeviceKeyShadowDesired()

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Send simulated telemetry data.
  const handlePushTelemetry = () => {
    try {
      JSON.parse(telemetryPayload)
    } catch (e) {
      toast.error(
        t('deviceDetail.onlineDebugTab.invalidJson', {
          error: (e as Error).message,
        })
      )
      return
    }

    const start = Date.now()
    simulatePush(
      {
        deviceKey,
        payload: telemetryPayload,
      },
      {
        onSuccess: (resp) => {
          const duration = Date.now() - start
          setLogs((prev) => [
            ...prev,
            {
              id: `log-${Date.now()}`,
              timestamp: new Date(),
              type: 'telemetry_push',
              title: t('deviceDetail.onlineDebugTab.telemetrySuccessTitle'),
              request: telemetryPayload,
              response: JSON.stringify(resp, null, 2),
              success: true,
              durationMs: duration,
            },
          ])
          toast.success(t('deviceDetail.onlineDebugTab.telemetrySuccess'))
        },
        onError: (err) => {
          const duration = Date.now() - start
          const errMsg = getApiErrorMessage(err, t('common:error'))
          setLogs((prev) => [
            ...prev,
            {
              id: `log-${Date.now()}`,
              timestamp: new Date(),
              type: 'telemetry_push',
              title: t('deviceDetail.onlineDebugTab.telemetryFailureTitle'),
              request: telemetryPayload,
              response: errMsg,
              success: false,
              durationMs: duration,
            },
          ])
          toast.error(
            t('deviceDetail.onlineDebugTab.telemetryFailure', {
              error: errMsg,
            })
          )
        },
      }
    )
  }

  // Send a remote control command by updating the device shadow desired state.
  const handleSendCommand = () => {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(commandPayload)
    } catch (e) {
      toast.error(
        t('deviceDetail.onlineDebugTab.invalidCommandJson', {
          error: (e as Error).message,
        })
      )
      return
    }

    const start = Date.now()
    updateShadowDesired(
      {
        deviceKey,
        data: {
          desired: parsed,
        },
      },
      {
        onSuccess: (resp) => {
          const duration = Date.now() - start
          setLogs((prev) => [
            ...prev,
            {
              id: `log-${Date.now()}`,
              timestamp: new Date(),
              type: 'command_send',
              title: t('deviceDetail.onlineDebugTab.commandSuccessTitle'),
              request: commandPayload,
              response: JSON.stringify(resp, null, 2),
              success: true,
              durationMs: duration,
            },
          ])
          toast.success(t('deviceDetail.onlineDebugTab.commandSuccess'))
        },
        onError: (err) => {
          const duration = Date.now() - start
          const errMsg = getApiErrorMessage(err, t('common:error'))
          setLogs((prev) => [
            ...prev,
            {
              id: `log-${Date.now()}`,
              timestamp: new Date(),
              type: 'command_send',
              title: t('deviceDetail.onlineDebugTab.commandFailureTitle'),
              request: commandPayload,
              response: errMsg,
              success: false,
              durationMs: duration,
            },
          ])
          toast.error(
            t('deviceDetail.onlineDebugTab.commandFailure', {
              error: errMsg,
            })
          )
        },
      }
    )
  }

  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
      {/* Control panel. */}
      <div className='lg:col-span-6'>
        <Card className='shadow-xs'>
          <CardHeader className='pb-4'>
            <div className='flex items-center gap-2'>
              <Terminal className='size-5 text-primary' />
              <CardTitle className='text-lg font-semibold'>
                {t('deviceDetail.onlineDebugTab.title')}
              </CardTitle>
            </div>
            <CardDescription>
              {t('deviceDetail.onlineDebugTab.description')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue='telemetry' className='w-full'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger
                  value='telemetry'
                  className='flex items-center gap-1.5 text-xs'
                >
                  <Radio className='size-3.5' />
                  {t('deviceDetail.onlineDebugTab.telemetryTab')}
                </TabsTrigger>
                <TabsTrigger
                  value='command'
                  className='flex items-center gap-1.5 text-xs'
                >
                  <Send className='size-3.5' />
                  {t('deviceDetail.onlineDebugTab.commandTab')}
                </TabsTrigger>
              </TabsList>

              {/* Telemetry upload panel. */}
              <TabsContent value='telemetry' className='space-y-4 pt-4'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    {t('deviceDetail.onlineDebugTab.telemetryPayload')}
                  </Label>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => setTelemetryPayload(SAMPLE_TELEMETRY)}
                    className='h-6 px-2 text-xs text-muted-foreground hover:text-foreground'
                  >
                    {t('deviceDetail.onlineDebugTab.resetSample')}
                  </Button>
                </div>

                <Textarea
                  value={telemetryPayload}
                  onChange={(e) => setTelemetryPayload(e.target.value)}
                  className='h-52 font-mono text-xs'
                  placeholder='{ "temperature": 25.5 }'
                />

                <Button
                  onClick={handlePushTelemetry}
                  disabled={isPushing}
                  className='w-full text-xs'
                >
                  {isPushing ? (
                    <Loader2 className='mr-2 size-3.5 animate-spin' />
                  ) : (
                    <Play className='mr-2 size-3.5' />
                  )}
                  {t('deviceDetail.onlineDebugTab.sendTelemetry')}
                </Button>
              </TabsContent>

              {/* Remote command panel. */}
              <TabsContent value='command' className='space-y-4 pt-4'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    {t('deviceDetail.onlineDebugTab.commandPayload')}
                  </Label>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => setCommandPayload(SAMPLE_COMMAND)}
                    className='h-6 px-2 text-xs text-muted-foreground hover:text-foreground'
                  >
                    {t('deviceDetail.onlineDebugTab.resetSample')}
                  </Button>
                </div>

                <Textarea
                  value={commandPayload}
                  onChange={(e) => setCommandPayload(e.target.value)}
                  className='h-52 font-mono text-xs'
                  placeholder='{ "command": "set_state", "params": { "power": true } }'
                />

                <Button
                  onClick={handleSendCommand}
                  disabled={isCommandSending}
                  variant='default'
                  className='w-full text-xs'
                >
                  {isCommandSending ? (
                    <Loader2 className='mr-2 size-3.5 animate-spin' />
                  ) : (
                    <Send className='mr-2 size-3.5' />
                  )}
                  {t('deviceDetail.onlineDebugTab.sendCommand')}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Live debug log stream. */}
      <div className='lg:col-span-6'>
        <Card className='flex h-full flex-col shadow-xs'>
          <CardHeader className='flex flex-row items-center justify-between pb-3'>
            <div>
              <CardTitle className='text-base font-semibold'>
                {t('deviceDetail.onlineDebugTab.logTitle')}
              </CardTitle>
              <CardDescription className='text-xs'>
                {t('deviceDetail.onlineDebugTab.logDescription', {
                  count: logs.length,
                })}
              </CardDescription>
            </div>
            {logs.length > 0 && (
              <Button
                size='sm'
                variant='outline'
                onClick={() => setLogs([])}
                className='h-7 text-xs'
              >
                <Trash2 className='mr-1.5 size-3' />
                {t('deviceDetail.onlineDebugTab.clearLogs')}
              </Button>
            )}
          </CardHeader>

          <CardContent className='flex-1 overflow-auto p-4'>
            {logs.length === 0 ? (
              <div className='flex h-72 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
                <Code2 className='size-8 text-muted-foreground/40' />
                <p className='mt-2 text-xs font-medium'>
                  {t('deviceDetail.onlineDebugTab.emptyLogs')}
                </p>
                <p className='mt-0.5 text-[11px] text-muted-foreground/70'>
                  {t('deviceDetail.onlineDebugTab.emptyLogsDescription')}
                </p>
              </div>
            ) : (
              <div className='space-y-3 font-mono text-xs'>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      log.success
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-red-500/20 bg-red-500/5'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1.5 font-sans font-medium'>
                        {log.success ? (
                          <CheckCircle2 className='size-3.5 text-emerald-500' />
                        ) : (
                          <XCircle className='size-3.5 text-red-500' />
                        )}
                        <span>{log.title}</span>
                      </div>
                      <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
                        <span>{log.durationMs}ms</span>
                        <span>{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className='mt-2 space-y-1.5'>
                      <div>
                        <div className='text-[10px] text-muted-foreground uppercase'>
                          {t('deviceDetail.onlineDebugTab.request')}
                        </div>
                        <pre className='max-h-24 overflow-auto rounded bg-background/80 p-1.5 text-[11px]'>
                          <code>{log.request}</code>
                        </pre>
                      </div>

                      {log.response && (
                        <div>
                          <div className='text-[10px] text-muted-foreground uppercase'>
                            {t('deviceDetail.onlineDebugTab.response')}
                          </div>
                          <pre className='max-h-28 overflow-auto rounded bg-background/80 p-1.5 text-[11px] text-muted-foreground'>
                            <code>{log.response}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
