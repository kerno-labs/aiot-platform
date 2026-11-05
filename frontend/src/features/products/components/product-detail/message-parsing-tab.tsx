import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { javascript } from '@codemirror/lang-javascript'
import CodeMirror from '@uiw/react-codemirror'
import { Play, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  getGetProductsKeyProductKeyMessageParserQueryKey,
  useGetProductsKeyProductKeyMessageParser,
  usePostProductsKeyProductKeyMessageParserExecute,
  usePutProductsKeyProductKeyMessageParser,
} from '@/api/generated'
import type { MessageParserExecuteProductMessageParserRequest } from '@/api/generated/model'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type ParserMode = 'device_report' | 'device_receive' | 'custom'
type Panel = 'input' | 'result'

const javascriptExtensions = [javascript()]

type MessageParsingTabProps = { productKey: string }

export function MessageParsingTab({ productKey }: MessageParsingTabProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const queryClient = useQueryClient()
  const parserQuery = useGetProductsKeyProductKeyMessageParser(productKey)
  const saveParser = usePutProductsKeyProductKeyMessageParser()
  const executeParser = usePostProductsKeyProductKeyMessageParserExecute()
  const [draft, setDraft] = useState<{ productKey: string; script: string }>()
  const [mode, setMode] = useState<ParserMode>('device_report')
  const [activePanel, setActivePanel] = useState<Panel>('input')
  const [rawData, setRawData] = useState('')
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState('')
  const [executionError, setExecutionError] = useState('')
  const parser = parserQuery.data?.data
  const script =
    draft?.productKey === productKey ? draft.script : parser?.script || ''

  const save = async () => {
    try {
      await saveParser.mutateAsync({
        productKey,
        data: { language: 'javascript-es5', script },
      })
      await queryClient.invalidateQueries({
        queryKey: getGetProductsKeyProductKeyMessageParserQueryKey(productKey),
      })
      toast.success(t('common:updateSuccess'))
    } catch (error) {
      toast.error(
        t('productDetail.messageParsing.saveError', {
          error: getApiErrorMessage(error, t('common:updateError')),
        })
      )
    }
  }

  const execute = async () => {
    const data: MessageParserExecuteProductMessageParserRequest = {
      mode,
      rawData,
    }
    if (mode === 'custom') data.topic = topic
    setExecutionError('')
    setResult('')
    try {
      const response = await executeParser.mutateAsync({ productKey, data })
      const output = response.data
      setResult(output?.jsonOutput || output?.rawData || '')
    } catch (error) {
      setExecutionError(getApiErrorMessage(error, t('common:error')))
    } finally {
      setActivePanel('result')
    }
  }

  if (parserQuery.isLoading)
    return <div className='h-96 animate-pulse border bg-muted/30' />

  if (parserQuery.isError) {
    return (
      <Alert variant='destructive'>
        <AlertTitle>
          {t('productDetail.messageParsing.loadErrorTitle')}
        </AlertTitle>
        <AlertDescription>
          {getApiErrorMessage(parserQuery.error, t('common:loadError'))}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border bg-background'>
      <section>
        <div className='flex min-h-20 flex-wrap items-center justify-between gap-4 border-b bg-muted/25 px-5 py-4'>
          <div>
            <h2 className='text-base font-medium'>
              {t('productDetail.messageParsing.editor.title')}
            </h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              {t('productDetail.messageParsing.editor.description')}
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <Label className='text-sm font-normal text-muted-foreground'>
              {t('productDetail.messageParsing.language')}
            </Label>
            <Select value='javascript-es5' disabled>
              <SelectTrigger className='h-10 w-64'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='javascript-es5'>
                  JavaScript (ECMAScript 5)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <CodeMirror
          value={script}
          onChange={(value) => setDraft({ productKey, script: value })}
          extensions={javascriptExtensions}
          height='500px'
          className='text-xs [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-gutters]:border-r [&_.cm-gutters]:bg-muted/20 [&_.cm-scroller]:font-mono [&_.cm-scroller]:leading-6'
        />
      </section>

      <Tabs
        value={activePanel}
        onValueChange={(value) => setActivePanel(value as Panel)}
        className='gap-0'
      >
        <div className='flex h-12 items-center border-b bg-muted/10 px-5'>
          <TabsList>
            <TabsTrigger value='input'>
              {t('productDetail.messageParsing.simulator.input')}
            </TabsTrigger>
            <TabsTrigger value='result'>
              {t('productDetail.messageParsing.simulator.result')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='input' className='mt-0'>
          <div className='space-y-5 bg-muted/10 px-6 py-6'>
            <div className='space-y-2'>
              <Label>{t('productDetail.messageParsing.simulator.mode')}</Label>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as ParserMode)}
              >
                <SelectTrigger className='h-11 w-full sm:w-80'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='device_report'>
                    {t('productDetail.messageParsing.modes.deviceReport')}
                  </SelectItem>
                  <SelectItem value='device_receive'>
                    {t('productDetail.messageParsing.modes.deviceReceive')}
                  </SelectItem>
                  <SelectItem value='custom'>{t('common:custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === 'custom' && (
              <div className='space-y-2'>
                <Label htmlFor='message-parser-topic'>
                  {t('productDetail.messageParsing.simulator.topic')}
                </Label>
                <Input
                  id='message-parser-topic'
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder={t(
                    'productDetail.messageParsing.simulator.topicPlaceholder'
                  )}
                  className='h-11 max-w-2xl'
                />
              </div>
            )}
            <Textarea
              id='message-parser-raw'
              value={rawData}
              onChange={(event) => setRawData(event.target.value)}
              placeholder={t(
                'productDetail.messageParsing.simulator.hexPlaceholder'
              )}
              className='min-h-36 max-w-4xl font-mono text-xs leading-6'
            />
          </div>
        </TabsContent>

        <TabsContent value='result' className='mt-0'>
          <div className='bg-muted/10 px-6 py-6'>
            {executionError ? (
              <Alert variant='destructive' className='max-w-4xl'>
                <AlertTitle>
                  {t('productDetail.messageParsing.simulator.executionError')}
                </AlertTitle>
                <AlertDescription className='break-all'>
                  {executionError}
                </AlertDescription>
              </Alert>
            ) : result ? (
              <pre className='max-h-96 max-w-4xl overflow-auto rounded-md border bg-background p-4 font-mono text-xs leading-6 whitespace-pre-wrap'>
                {result}
              </pre>
            ) : (
              <p className='py-12 text-sm text-muted-foreground'>
                {t('productDetail.messageParsing.simulator.emptyResult')}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className='flex h-16 items-center gap-3 border-t bg-background px-5'>
        <Button
          onClick={execute}
          disabled={executeParser.isPending}
          className='rounded-md'
        >
          <Play />
          {t('productDetail.messageParsing.simulator.execute')}
        </Button>
        <Button
          variant='outline'
          onClick={save}
          disabled={!script.trim() || saveParser.isPending}
          className='rounded-md'
        >
          <Save />
          {t('common:save')}
        </Button>
      </div>
    </div>
  )
}
