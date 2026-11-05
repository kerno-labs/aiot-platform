import { useState, useEffect } from 'react'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle,
  Code,
  List,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  deleteProductsProductKeyTsl,
  getGetProductsProductKeyTslQueryKey,
  getProductsProductKeyTsl,
  postProductsProductKeyTsl,
} from '@/api/generated'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  TSL_TEMPLATES,
  tslSchema,
  normalizeTSLModel,
  PropertyDialog,
  ServiceDialog,
  EventDialog,
  DeleteTslDialog,
  PropertyList,
  ServiceList,
  EventList,
  TslHeader,
  TslInstructions,
  JsonEditorTab,
  type Property,
  type Service,
  type Event,
  type TSLModel,
  type FeatureDefinitionTabProps,
} from './feature-definition'

export function FeatureDefinitionTab({
  productKey,
}: FeatureDefinitionTabProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const queryClient = useQueryClient()

  // Query for fetching TSL data
  const {
    data: tslData,
    isLoading: isLoadingTSL,
    error: tslError,
  } = useQuery({
    queryKey: getGetProductsProductKeyTslQueryKey(productKey),
    queryFn: async () => {
      try {
        const response = await getProductsProductKeyTsl(productKey)
        // Parse the TSL string from API into TSLModel
        if (response.data?.productTsl?.tsl) {
          const parsed = JSON.parse(response.data.productTsl.tsl)
          return normalizeTSLModel(parsed)
        }
        return null
      } catch (error: unknown) {
        // If 404, it means no TSL exists, which is fine
        if (error instanceof AxiosError && error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!productKey,
  })

  // Mutation for saving/updating TSL
  const saveTSLMutation = useMutation({
    mutationFn: async (tsl: TSLModel) => {
      const tslJsonString = JSON.stringify(tsl)
      return postProductsProductKeyTsl(productKey, { tsl: tslJsonString })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tsl', productKey] })
      toast.success(t('common:updateSuccess'))
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, t('common:updateError')))
    },
  })

  // Mutation for deleting TSL
  const deleteTSLMutation = useMutation({
    mutationFn: async () => {
      return deleteProductsProductKeyTsl(productKey)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tsl', productKey] })
      toast.success(t('common:deleteSuccess'))
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, t('common:deleteError')))
    },
  })

  const [tslModel, setTslModel] = useState<TSLModel>(
    normalizeTSLModel(TSL_TEMPLATES.empty.value as unknown as TSLModel)
  )
  const [tslText, setTslText] = useState<string>(
    JSON.stringify(TSL_TEMPLATES.empty.value, null, 2)
  )
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [currentTemplate, setCurrentTemplate] = useState<string>('empty')
  const [editMode, setEditMode] = useState<'visual' | 'json'>('visual')
  const [jsonValid, setJsonValid] = useState<boolean | null>(true)
  const [validationError, setValidationError] = useState<string>('')

  // 属性编辑对话框状态
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [editingPropertyIndex, setEditingPropertyIndex] = useState<number>(-1)

  // 服务编辑对话框状态
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingServiceIndex, setEditingServiceIndex] = useState<number>(-1)

  // 事件编辑对话框状态
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editingEventIndex, setEditingEventIndex] = useState<number>(-1)

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Sync fetched TSL data to editor state.
  useEffect(() => {
    let cancelled = false
    const id = setTimeout(() => {
      if (cancelled) return
      if (tslData) {
        const normalized = normalizeTSLModel(tslData)
        setTslModel(normalized)
        setTslText(JSON.stringify(normalized, null, 2))
        setError('')
        setSuccess('')
        setCurrentTemplate('empty')
      } else if (!isLoadingTSL && !tslError) {
        const emptyModel = normalizeTSLModel(
          TSL_TEMPLATES.empty.value as unknown as TSLModel
        )
        setTslModel(emptyModel)
        setTslText(JSON.stringify(emptyModel, null, 2))
        setCurrentTemplate('empty')
      }
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [tslData, isLoadingTSL, tslError])

  // 从 JSON 更新模型
  const syncFromJson = (text: string) => {
    try {
      const parsed = JSON.parse(text)
      const normalized = normalizeTSLModel(parsed)
      setTslModel(normalized)
      setError('')
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(
        `${t('productDetail.featureDefinition.errors.jsonParse')}: ${message}`
      )
      return false
    }
  }

  // 从模型更新 JSON
  const syncToJson = (model: TSLModel) => {
    const normalized = normalizeTSLModel(model)
    const formatted = JSON.stringify(normalized, null, 2)
    setTslText(formatted)
  }

  // 验证TSL JSON格式
  const validateTSL = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text)
      tslSchema.parse(parsed)
      setJsonValid(true)
      setValidationError('')
      return true
    } catch (e) {
      if (e instanceof z.ZodError) {
        const firstError = e.issues[0]
        let errorMessage = ''
        if (firstError.code === 'too_small' && firstError.minimum === 1) {
          const field = firstError.path[firstError.path.length - 1]
          if (field === 'identifier') {
            errorMessage = t(
              'productDetail.featureDefinition.errors.identifierRequired'
            )
          } else if (field === 'name') {
            errorMessage = t(
              'productDetail.featureDefinition.errors.nameRequired'
            )
          } else if (field === 'productKey') {
            errorMessage = t(
              'productDetail.featureDefinition.errors.productKeyRequired'
            )
          } else {
            errorMessage = `${firstError.path.join('.')}: ${firstError.message}`
          }
        } else {
          errorMessage = `${firstError.path.join('.')}: ${firstError.message}`
        }
        setValidationError(errorMessage)
        setError(
          `${t('productDetail.featureDefinition.errors.tslValidation')}: ${errorMessage}`
        )
      } else if (e instanceof SyntaxError) {
        setValidationError(
          t('productDetail.featureDefinition.errors.jsonSyntax')
        )
        setError(
          `${t('productDetail.featureDefinition.errors.jsonSyntax')}: ${e.message}`
        )
      } else {
        const message = e instanceof Error ? e.message : String(e)
        setValidationError(message)
        setError(message)
      }
      setJsonValid(false)
      return false
    }
  }

  // 实时验证 JSON
  const validateJsonSyntax = (text: string): void => {
    if (!text.trim()) {
      setJsonValid(null)
      setValidationError('')
      return
    }

    try {
      const parsed = JSON.parse(text)
      tslSchema.parse(parsed)
      setJsonValid(true)
      setValidationError('')
    } catch (e) {
      setJsonValid(false)
      if (e instanceof z.ZodError) {
        const firstError = e.issues[0]
        setValidationError(
          `${firstError.path.join('.')}: ${firstError.message}`
        )
      } else if (e instanceof SyntaxError) {
        setValidationError(
          t('productDetail.featureDefinition.errors.jsonSyntax')
        )
      } else {
        setValidationError(e instanceof Error ? e.message : String(e))
      }
    }
  }

  // 加载模板
  const loadTemplate = (templateKey: string) => {
    const template = TSL_TEMPLATES[templateKey as keyof typeof TSL_TEMPLATES]
    if (template) {
      const newModel = normalizeTSLModel(template.value as unknown as TSLModel)
      setTslModel(newModel)
      syncToJson(newModel)
      setCurrentTemplate(templateKey)
      setError('')
      setSuccess(
        t('productDetail.featureDefinition.status.templateLoaded', {
          name: t(template.nameKey),
        })
      )
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  // 格式化JSON
  const formatTSL = () => {
    try {
      const parsed = JSON.parse(tslText)
      tslSchema.parse(parsed)
      const normalized = normalizeTSLModel(parsed)
      const formatted = JSON.stringify(normalized, null, 2)
      setTslText(formatted)
      setTslModel(normalized)
      setJsonValid(true)
      setValidationError('')
      setError('')
      setSuccess(t('productDetail.featureDefinition.status.jsonFormatted'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      if (e instanceof z.ZodError) {
        const firstError = e.issues[0]
        let errorMessage = ''
        if (firstError.code === 'too_small' && firstError.minimum === 1) {
          const field = firstError.path[firstError.path.length - 1]
          if (field === 'identifier') {
            errorMessage = t(
              'productDetail.featureDefinition.errors.identifierRequired'
            )
          } else if (field === 'name') {
            errorMessage = t(
              'productDetail.featureDefinition.errors.nameRequired'
            )
          } else if (field === 'productKey') {
            errorMessage = t(
              'productDetail.featureDefinition.errors.productKeyRequired'
            )
          } else {
            errorMessage = `${firstError.path.join('.')}: ${firstError.message}`
          }
        } else {
          errorMessage = `${firstError.path.join('.')}: ${firstError.message}`
        }
        setError(
          `${t('productDetail.featureDefinition.status.validationFailed')}: ${errorMessage}`
        )
        setValidationError(errorMessage)
      } else if (e instanceof SyntaxError) {
        setError(
          `${t('productDetail.featureDefinition.errors.jsonSyntax')} ${t('productDetail.featureDefinition.status.validationFailed')}: ${e.message}`
        )
        setValidationError(
          t('productDetail.featureDefinition.errors.jsonSyntax')
        )
      } else {
        const message = e instanceof Error ? e.message : String(e)
        setError(
          `${t('productDetail.featureDefinition.buttons.format')} ${t('productDetail.featureDefinition.status.validationFailed')}: ${message}`
        )
        setValidationError(message)
      }
      setJsonValid(false)
    }
  }

  // 保存TSL
  const saveTSL = () => {
    const jsonToValidate =
      editMode === 'json' ? tslText : JSON.stringify(tslModel)
    if (validateTSL(jsonToValidate)) {
      const modelToSave =
        editMode === 'json' ? normalizeTSLModel(JSON.parse(tslText)) : tslModel
      saveTSLMutation.mutate(modelToSave)
    }
  }

  // 清空编辑器
  const clearTSL = () => {
    const emptyModel = normalizeTSLModel(
      TSL_TEMPLATES.empty.value as unknown as TSLModel
    )
    setTslModel(emptyModel)
    syncToJson(emptyModel)
    setError('')
    setSuccess('')
  }

  // 添加/编辑属性
  const openPropertyDialog = (property?: Property, index?: number) => {
    if (property && index !== undefined) {
      setEditingProperty(property)
      setEditingPropertyIndex(index)
    } else {
      setEditingProperty({
        identifier: '',
        name: '',
        accessMode: 'rw',
        required: false,
        dataType: {
          type: 'int',
          specs: {},
        },
      })
      setEditingPropertyIndex(-1)
    }
    setPropertyDialogOpen(true)
  }

  const saveProperty = (property: Property) => {
    const properties = [...(tslModel.properties || [])]
    if (editingPropertyIndex >= 0) {
      properties[editingPropertyIndex] = property
    } else {
      properties.push(property)
    }
    const newModel = { ...tslModel, properties }
    setTslModel(newModel)
    syncToJson(newModel)
    setPropertyDialogOpen(false)
    setSuccess(
      editingPropertyIndex >= 0
        ? t('productDetail.featureDefinition.status.propertyUpdated')
        : t('productDetail.featureDefinition.status.propertyAdded')
    )
    setTimeout(() => setSuccess(''), 3000)
  }

  const deleteProperty = (index: number) => {
    const properties = [...(tslModel.properties || [])]
    properties.splice(index, 1)
    const newModel = { ...tslModel, properties }
    setTslModel(newModel)
    syncToJson(newModel)
    setSuccess(t('productDetail.featureDefinition.status.propertyDeleted'))
    setTimeout(() => setSuccess(''), 3000)
  }

  // 添加/编辑服务
  const openServiceDialog = (service?: Service, index?: number) => {
    if (service && index !== undefined) {
      setEditingService(service)
      setEditingServiceIndex(index)
    } else {
      setEditingService({
        identifier: '',
        name: '',
        required: false,
        callType: 'async',
        inputData: [],
        outputData: [],
      })
      setEditingServiceIndex(-1)
    }
    setServiceDialogOpen(true)
  }

  const saveService = (service: Service) => {
    const services = [...(tslModel.services || [])]
    if (editingServiceIndex >= 0) {
      services[editingServiceIndex] = service
    } else {
      services.push(service)
    }
    const newModel = { ...tslModel, services }
    setTslModel(newModel)
    syncToJson(newModel)
    setServiceDialogOpen(false)
    setSuccess(
      editingServiceIndex >= 0
        ? t('productDetail.featureDefinition.status.serviceUpdated')
        : t('productDetail.featureDefinition.status.serviceAdded')
    )
    setTimeout(() => setSuccess(''), 3000)
  }

  const deleteService = (index: number) => {
    const services = [...(tslModel.services || [])]
    services.splice(index, 1)
    const newModel = { ...tslModel, services }
    setTslModel(newModel)
    syncToJson(newModel)
    setSuccess(t('productDetail.featureDefinition.status.serviceDeleted'))
    setTimeout(() => setSuccess(''), 3000)
  }

  // 添加/编辑事件
  const openEventDialog = (event?: Event, index?: number) => {
    if (event && index !== undefined) {
      setEditingEvent(event)
      setEditingEventIndex(index)
    } else {
      setEditingEvent({
        identifier: '',
        name: '',
        type: 'info',
        required: false,
        outputData: [],
      })
      setEditingEventIndex(-1)
    }
    setEventDialogOpen(true)
  }

  const saveEvent = (event: Event) => {
    const events = [...(tslModel.events || [])]
    if (editingEventIndex >= 0) {
      events[editingEventIndex] = event
    } else {
      events.push(event)
    }
    const newModel = { ...tslModel, events }
    setTslModel(newModel)
    syncToJson(newModel)
    setEventDialogOpen(false)
    setSuccess(
      editingEventIndex >= 0
        ? t('productDetail.featureDefinition.status.eventUpdated')
        : t('productDetail.featureDefinition.status.eventAdded')
    )
    setTimeout(() => setSuccess(''), 3000)
  }

  const deleteEvent = (index: number) => {
    const events = [...(tslModel.events || [])]
    events.splice(index, 1)
    const newModel = { ...tslModel, events }
    setTslModel(newModel)
    syncToJson(newModel)
    setSuccess(t('productDetail.featureDefinition.status.eventDeleted'))
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className='w-full max-w-full min-w-0 space-y-4'>
      {/* 头部说明 */}
      <TslHeader />

      {/* 模板选择 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <span className='text-sm font-medium text-muted-foreground'>
            {t('productDetail.featureDefinition.templates.label')}
          </span>
          <div className='flex gap-2'>
            {Object.entries(TSL_TEMPLATES).map(([key, template]) => (
              <Button
                key={key}
                variant={currentTemplate === key ? 'default' : 'outline'}
                size='sm'
                onClick={() => loadTemplate(key)}
                className='h-7 text-xs'
              >
                {t(template.nameKey)}
              </Button>
            ))}
          </div>
        </div>

        <div className='flex gap-2'>
          {editMode === 'json' && (
            <Button
              variant='outline'
              size='sm'
              onClick={formatTSL}
              className='h-7 text-xs'
            >
              <RefreshCw className='mr-1 h-3 w-3' />
              {t('productDetail.featureDefinition.buttons.format')}
            </Button>
          )}
          <Button
            variant='outline'
            size='sm'
            onClick={clearTSL}
            className='h-7 text-xs'
          >
            {t('common:clear')}
          </Button>
        </div>
      </div>

      {/* 状态提示 */}
      {error && (
        <div className='flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3'>
          <AlertCircle className='h-4 w-4 text-destructive' />
          <span className='text-sm text-destructive'>{error}</span>
        </div>
      )}

      {success && (
        <div className='flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 p-3'>
          <CheckCircle className='h-4 w-4 text-green-500' />
          <span className='text-sm text-green-600'>{success}</span>
        </div>
      )}

      {/* 编辑器 */}
      <Tabs
        value={editMode}
        onValueChange={(value) => {
          const next = value as 'visual' | 'json'
          setEditMode(next)
          if (next === 'json') {
            syncToJson(tslModel)
          } else {
            syncFromJson(tslText)
          }
        }}
        className='min-w-0'
      >
        <TabsList>
          <TabsTrigger value='visual'>
            <List className='mr-2 h-4 w-4' />
            {t('productDetail.featureDefinition.editMode.visual')}
          </TabsTrigger>
          <TabsTrigger value='json'>
            <Code className='mr-2 h-4 w-4' />
            {t('productDetail.featureDefinition.editMode.json')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='visual' className='min-w-0 space-y-4'>
          {isLoadingTSL && (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <span className='ml-2 text-sm text-muted-foreground'>
                {t('common:loading')}
              </span>
            </div>
          )}

          {tslError && !isLoadingTSL && (
            <div className='flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3'>
              <AlertCircle className='h-4 w-4 text-destructive' />
              <span className='text-sm text-destructive'>
                {t('common:loadError')}
              </span>
            </div>
          )}

          {/* 属性列表 */}
          <PropertyList
            properties={tslModel?.properties || []}
            onAdd={() => openPropertyDialog()}
            onEdit={openPropertyDialog}
            onDelete={deleteProperty}
          />

          {/* 服务列表 */}
          <ServiceList
            services={tslModel?.services || []}
            onAdd={() => openServiceDialog()}
            onEdit={openServiceDialog}
            onDelete={deleteService}
          />

          {/* 事件列表 */}
          <EventList
            events={tslModel?.events || []}
            onAdd={() => openEventDialog()}
            onEdit={openEventDialog}
            onDelete={deleteEvent}
          />
        </TabsContent>

        <TabsContent value='json' className='min-w-0'>
          <JsonEditorTab
            tslText={tslText}
            onChange={(newValue) => {
              setTslText(newValue)
              setError('')
              setSuccess('')
              validateJsonSyntax(newValue)
            }}
            onFormat={formatTSL}
            jsonValid={jsonValid}
            validationError={validationError}
          />
        </TabsContent>
      </Tabs>

      {/* 保存按钮 */}
      <div className='flex justify-end gap-2'>
        {tslData && (
          <Button
            variant='outline'
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteTSLMutation.isPending}
            className='min-w-[100px]'
          >
            {deleteTSLMutation.isPending ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            {t('common:delete')}
          </Button>
        )}
        <Button
          onClick={saveTSL}
          disabled={saveTSLMutation.isPending}
          className='min-w-[100px]'
        >
          {saveTSLMutation.isPending ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : null}
          {t('common:save')}
        </Button>
      </div>

      {/* 使用说明 */}
      <TslInstructions />

      {/* 属性编辑对话框 */}
      <PropertyDialog
        open={propertyDialogOpen}
        onOpenChange={setPropertyDialogOpen}
        property={editingProperty}
        onSave={saveProperty}
      />

      {/* 服务编辑对话框 */}
      <ServiceDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        service={editingService}
        onSave={saveService}
      />

      {/* 事件编辑对话框 */}
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={editingEvent}
        onSave={saveEvent}
      />

      {/* 删除确认对话框 */}
      <DeleteTslDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          deleteTSLMutation.mutate()
          setDeleteDialogOpen(false)
        }}
        isPending={deleteTSLMutation.isPending}
      />
    </div>
  )
}

export * from './feature-definition'
