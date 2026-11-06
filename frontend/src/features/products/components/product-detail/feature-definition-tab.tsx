import { useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import {
  Code,
  List,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Save,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  TSL_TEMPLATES,
  tslSchema,
  normalizeTSLModel,
  PropertyDialog,
  ServiceDialog,
  EventDialog,
  DeleteTslDialog,
  FeatureTable,
  JsonEditorTab,
  type Property,
  type Service,
  type Event,
  type TSLModel,
  type FeatureDefinitionTabProps,
} from './feature-definition'

type TslCheck =
  { valid: true; model: TSLModel } | { valid: false; message: string }

const formatModel = (model: TSLModel) =>
  JSON.stringify(normalizeTSLModel(model), null, 2)

const upsertAt = <T,>(list: T[], index: number, item: T): T[] => {
  const next = [...list]
  if (index >= 0) next[index] = item
  else next.push(item)
  return next
}

const removeAt = <T,>(list: T[], index: number): T[] =>
  list.filter((_, i) => i !== index)

const emptyModel = () => normalizeTSLModel(null)

const T_PREFIX = 'productDetail.featureDefinition'

// Parse and validate raw TSL text, mapping the first schema issue to a readable message.
function checkTsl(text: string, t: TFunction): TslCheck {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      valid: false,
      message: `${t(`${T_PREFIX}.errors.jsonSyntax`)}: ${message}`,
    }
  }
  const result = tslSchema.safeParse(parsed)
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue.path[issue.path.length - 1]
    let detail = `${issue.path.join('.')}: ${issue.message}`
    if (issue.code === 'too_small' && issue.minimum === 1) {
      if (field === 'identifier') {
        detail = t(`${T_PREFIX}.errors.identifierRequired`)
      } else if (field === 'name') {
        detail = t(`${T_PREFIX}.errors.nameRequired`)
      } else if (field === 'productKey') {
        detail = t(`${T_PREFIX}.errors.productKeyRequired`)
      }
    }
    return {
      valid: false,
      message: `${t(`${T_PREFIX}.errors.tslValidation`)}: ${detail}`,
    }
  }
  const duplicate = findDuplicateIdentifier(parsed as TSLModel)
  if (duplicate) {
    return {
      valid: false,
      message: `${t(`${T_PREFIX}.errors.identifierDuplicate`)}: ${duplicate}`,
    }
  }
  return { valid: true, model: normalizeTSLModel(parsed as TSLModel) }
}

// Identifiers must be unique within each category.
function findDuplicateIdentifier(model: Partial<TSLModel>): string | null {
  for (const list of [model.properties, model.services, model.events]) {
    const seen = new Set<string>()
    for (const item of list ?? []) {
      if (seen.has(item.identifier)) return item.identifier
      seen.add(item.identifier)
    }
  }
  return null
}

type PendingAction =
  | { kind: 'template'; key: keyof typeof TSL_TEMPLATES }
  | { kind: 'clear' }
  | { kind: 'delete' }
  | null

export function FeatureDefinitionTab({
  productKey,
}: FeatureDefinitionTabProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const queryClient = useQueryClient()
  const queryKey = getGetProductsProductKeyTslQueryKey(productKey)

  const {
    data: tslData,
    isLoading: isLoadingTSL,
    error: tslError,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const response = await getProductsProductKeyTsl(productKey)
        if (response.data?.productTsl?.tsl) {
          return normalizeTSLModel(JSON.parse(response.data.productTsl.tsl))
        }
        return null
      } catch (error: unknown) {
        // 404 means no TSL exists yet, which is fine
        if (error instanceof AxiosError && error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!productKey,
  })

  const savedModel = useMemo(() => normalizeTSLModel(tslData), [tslData])

  // `draft` holds unsaved edits; null means "show the saved model".
  const [draft, setDraft] = useState<TSLModel | null>(null)
  const model = draft ?? savedModel

  const [editMode, setEditMode] = useState<'visual' | 'json'>('visual')
  const [jsonText, setJsonText] = useState('')
  const jsonCheck = useMemo(
    () => (editMode === 'json' ? checkTsl(jsonText, t) : null),
    [editMode, jsonText, t]
  )

  const [pending, setPending] = useState<PendingAction>(null)

  const modelDirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(savedModel)
  const jsonDirty = editMode === 'json' && jsonText !== formatModel(model)
  const dirty = modelDirty || jsonDirty

  // Guard in-app navigation and tab close while edits are unsaved.
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  })

  const hasContent =
    model.properties.length + model.services.length + model.events.length > 0

  // Replace the whole edited model, keeping the JSON view in sync.
  const replaceModel = (next: TSLModel | null) => {
    setDraft(next)
    if (editMode === 'json') setJsonText(formatModel(next ?? savedModel))
  }

  const saveMutation = useMutation({
    mutationFn: async (target: TSLModel) => {
      await postProductsProductKeyTsl(productKey, {
        tsl: JSON.stringify(target),
      })
      return target
    },
    onSuccess: (target) => {
      queryClient.setQueryData(queryKey, target)
      queryClient.invalidateQueries({ queryKey })
      setDraft(null)
      if (editMode === 'json') setJsonText(formatModel(target))
      toast.success(t('common:updateSuccess'))
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, t('common:updateError')))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProductsProductKeyTsl(productKey),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, null)
      setDraft(null)
      if (editMode === 'json') setJsonText(formatModel(emptyModel()))
      toast.success(t('common:deleteSuccess'))
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, t('common:deleteError')))
    },
  })

  const handleSave = () => {
    const check = checkTsl(
      editMode === 'json' ? jsonText : JSON.stringify(model),
      t
    )
    if (!check.valid) {
      toast.error(check.message)
      return
    }
    saveMutation.mutate(check.model)
  }

  const handleDiscard = () => {
    setDraft(null)
    if (editMode === 'json') setJsonText(formatModel(savedModel))
  }

  const changeMode = (value: string) => {
    const next = value as 'visual' | 'json'
    if (next === editMode) return
    if (next === 'json') {
      setJsonText(formatModel(model))
      setEditMode('json')
      return
    }
    // Refuse to leave the JSON view while its content cannot be parsed.
    if (!jsonCheck?.valid) {
      toast.error(jsonCheck?.valid === false ? jsonCheck.message : '')
      return
    }
    setDraft(jsonCheck.model)
    setEditMode('visual')
  }

  const formatJson = () => {
    if (!jsonCheck?.valid) return
    setJsonText(formatModel(jsonCheck.model))
    toast.success(t(`${T_PREFIX}.status.jsonFormatted`))
  }

  const applyTemplate = (key: keyof typeof TSL_TEMPLATES) => {
    const template = TSL_TEMPLATES[key]
    replaceModel(normalizeTSLModel(template.value as unknown as TSLModel))
    toast.success(
      t(`${T_PREFIX}.status.templateLoaded`, { name: t(template.nameKey) })
    )
  }

  // Replacing content asks for confirmation only when there is something to lose.
  const requestReplace = (action: Exclude<PendingAction, null>) => {
    if (hasContent || dirty) setPending(action)
    else runPending(action)
  }

  const runPending = (action: Exclude<PendingAction, null>) => {
    if (action.kind === 'template') applyTemplate(action.key)
    else if (action.kind === 'clear') replaceModel(emptyModel())
    else deleteMutation.mutate()
  }

  // Deleting a row is local until saved, so offer undo instead of a confirm dialog.
  const removeWithUndo = (next: TSLModel, messageKey: string) => {
    const previous = draft
    setDraft(next)
    toast.success(t(messageKey), {
      action: {
        label: t(`${T_PREFIX}.buttons.undo`),
        onClick: () => setDraft(previous),
      },
    })
  }

  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [editingPropertyIndex, setEditingPropertyIndex] = useState(-1)

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingServiceIndex, setEditingServiceIndex] = useState(-1)

  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editingEventIndex, setEditingEventIndex] = useState(-1)

  const openPropertyDialog = (property?: Property, index?: number) => {
    if (property && index !== undefined) {
      setEditingProperty(property)
      setEditingPropertyIndex(index)
    } else {
      setEditingProperty({
        identifier: '',
        name: '',
        accessMode: 'r',
        required: false,
        dataType: { type: 'int', specs: {} },
      })
      setEditingPropertyIndex(-1)
    }
    setPropertyDialogOpen(true)
  }

  const saveProperty = (property: Property) => {
    setDraft({
      ...model,
      properties: upsertAt(model.properties, editingPropertyIndex, property),
    })
    setPropertyDialogOpen(false)
  }

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
    setDraft({
      ...model,
      services: upsertAt(model.services, editingServiceIndex, service),
    })
    setServiceDialogOpen(false)
  }

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
    setDraft({
      ...model,
      events: upsertAt(model.events, editingEventIndex, event),
    })
    setEventDialogOpen(false)
  }

  const takenIdentifiers = (
    list: { identifier: string }[],
    editingIndex: number
  ) => list.filter((_, i) => i !== editingIndex).map((item) => item.identifier)

  const tableCount = (count: number) => (
    <Badge variant='secondary' className='ml-2'>
      {count}
    </Badge>
  )

  return (
    <div className='w-full max-w-full min-w-0 space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Badge
          variant={dirty ? 'default' : 'outline'}
          className='h-6 text-xs font-normal'
        >
          {dirty
            ? t(`${T_PREFIX}.statusBadge.dirty`)
            : t(`${T_PREFIX}.statusBadge.saved`)}
        </Badge>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleDiscard}
            disabled={!dirty || saveMutation.isPending}
          >
            <RotateCcw className='mr-1 h-3.5 w-3.5' />
            {t(`${T_PREFIX}.buttons.discard`)}
          </Button>
          <Button
            size='sm'
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
            ) : (
              <Save className='mr-1 h-3.5 w-3.5' />
            )}
            {t('common:save')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                size='icon'
                className='size-8'
                aria-label={t(`${T_PREFIX}.buttons.more`)}
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel className='text-xs text-muted-foreground'>
                {t(`${T_PREFIX}.templates.label`)}
              </DropdownMenuLabel>
              {Object.entries(TSL_TEMPLATES).map(([key, template]) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() =>
                    requestReplace({
                      kind: 'template',
                      key: key as keyof typeof TSL_TEMPLATES,
                    })
                  }
                >
                  {t(template.nameKey)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => requestReplace({ kind: 'clear' })}
              >
                {t('common:clear')}
              </DropdownMenuItem>
              {tslData && (
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onSelect={() => setPending({ kind: 'delete' })}
                >
                  {t('common:delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoadingTSL && (
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='h-6 w-6 animate-spin' />
          <span className='ml-2 text-sm text-muted-foreground'>
            {t('common:loading')}
          </span>
        </div>
      )}
      {tslError && !isLoadingTSL && (
        <div className='rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive'>
          {t('common:loadError')}
        </div>
      )}

      {!isLoadingTSL && (
        <Tabs value={editMode} onValueChange={changeMode} className='min-w-0'>
          <TabsList>
            <TabsTrigger value='visual'>
              <List className='mr-2 h-4 w-4' />
              {t(`${T_PREFIX}.editMode.visual`)}
            </TabsTrigger>
            <TabsTrigger value='json'>
              <Code className='mr-2 h-4 w-4' />
              {t(`${T_PREFIX}.editMode.json`)}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='visual' className='min-w-0'>
            <Tabs defaultValue='properties'>
              <TabsList>
                <TabsTrigger value='properties'>
                  {t(`${T_PREFIX}.sections.propertiesOnly`)}
                  {tableCount(model.properties.length)}
                </TabsTrigger>
                <TabsTrigger value='services'>
                  {t(`${T_PREFIX}.sections.servicesOnly`)}
                  {tableCount(model.services.length)}
                </TabsTrigger>
                <TabsTrigger value='events'>
                  {t(`${T_PREFIX}.sections.eventsOnly`)}
                  {tableCount(model.events.length)}
                </TabsTrigger>
              </TabsList>

              <TabsContent value='properties'>
                <FeatureTable<Property>
                  items={model.properties}
                  addLabel={t(`${T_PREFIX}.buttons.addProperty`)}
                  emptyText={t(`${T_PREFIX}.empty.properties`)}
                  columns={[
                    {
                      header: t(`${T_PREFIX}.propertyDialog.dataType`),
                      cell: (p) => (
                        <Badge variant='outline' className='font-mono text-xs'>
                          {p.dataType.type}
                        </Badge>
                      ),
                    },
                    {
                      header: t(`${T_PREFIX}.propertyDialog.accessMode`),
                      cell: (p) => (
                        <Badge
                          variant='outline'
                          className='font-mono text-xs uppercase'
                        >
                          {p.accessMode}
                        </Badge>
                      ),
                    },
                  ]}
                  onAdd={() => openPropertyDialog()}
                  onEdit={openPropertyDialog}
                  onDelete={(index) =>
                    removeWithUndo(
                      {
                        ...model,
                        properties: removeAt(model.properties, index),
                      },
                      `${T_PREFIX}.status.propertyDeleted`
                    )
                  }
                />
              </TabsContent>

              <TabsContent value='services'>
                <FeatureTable<Service>
                  items={model.services}
                  addLabel={t(`${T_PREFIX}.buttons.addService`)}
                  emptyText={t(`${T_PREFIX}.empty.services`)}
                  columns={[
                    {
                      header: t(`${T_PREFIX}.serviceDialog.callType`),
                      cell: (s) => (
                        <Badge variant='outline' className='font-mono text-xs'>
                          {s.callType}
                        </Badge>
                      ),
                    },
                    {
                      header: t(`${T_PREFIX}.statusBadge.input`),
                      cell: (s) => s.inputData?.length ?? 0,
                    },
                    {
                      header: t(`${T_PREFIX}.statusBadge.output`),
                      cell: (s) => s.outputData?.length ?? 0,
                    },
                  ]}
                  onAdd={() => openServiceDialog()}
                  onEdit={openServiceDialog}
                  onDelete={(index) =>
                    removeWithUndo(
                      {
                        ...model,
                        services: removeAt(model.services, index),
                      },
                      `${T_PREFIX}.status.serviceDeleted`
                    )
                  }
                />
              </TabsContent>

              <TabsContent value='events'>
                <FeatureTable<Event>
                  items={model.events}
                  addLabel={t(`${T_PREFIX}.buttons.addEvent`)}
                  emptyText={t(`${T_PREFIX}.empty.events`)}
                  columns={[
                    {
                      header: t(`${T_PREFIX}.eventDialog.eventType`),
                      cell: (e) => (
                        <Badge
                          variant='outline'
                          className='font-mono text-xs uppercase'
                        >
                          {e.type}
                        </Badge>
                      ),
                    },
                    {
                      header: t(`${T_PREFIX}.statusBadge.output`),
                      cell: (e) => e.outputData?.length ?? 0,
                    },
                  ]}
                  onAdd={() => openEventDialog()}
                  onEdit={openEventDialog}
                  onDelete={(index) =>
                    removeWithUndo(
                      {
                        ...model,
                        events: removeAt(model.events, index),
                      },
                      `${T_PREFIX}.status.eventDeleted`
                    )
                  }
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value='json' className='min-w-0'>
            <JsonEditorTab
              tslText={jsonText}
              onChange={setJsonText}
              onFormat={formatJson}
              jsonValid={jsonCheck ? jsonCheck.valid : null}
              validationError={
                jsonCheck && !jsonCheck.valid ? jsonCheck.message : ''
              }
            />
          </TabsContent>
        </Tabs>
      )}

      <PropertyDialog
        open={propertyDialogOpen}
        onOpenChange={setPropertyDialogOpen}
        property={editingProperty}
        onSave={saveProperty}
        takenIdentifiers={takenIdentifiers(
          model.properties,
          editingPropertyIndex
        )}
      />
      <ServiceDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        service={editingService}
        onSave={saveService}
        takenIdentifiers={takenIdentifiers(model.services, editingServiceIndex)}
      />
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={editingEvent}
        onSave={saveEvent}
        takenIdentifiers={takenIdentifiers(model.events, editingEventIndex)}
      />

      <ConfirmDialog
        open={pending?.kind === 'template' || pending?.kind === 'clear'}
        onOpenChange={(open) => !open && setPending(null)}
        title={t(`${T_PREFIX}.confirm.replaceTitle`)}
        desc={t(`${T_PREFIX}.confirm.replaceDesc`)}
        handleConfirm={() => {
          if (pending) runPending(pending)
          setPending(null)
        }}
      />
      <DeleteTslDialog
        open={pending?.kind === 'delete'}
        onOpenChange={(open) => !open && setPending(null)}
        onConfirm={() => {
          deleteMutation.mutate()
          setPending(null)
        }}
        isPending={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title={t(`${T_PREFIX}.unsaved.title`)}
        desc={t(`${T_PREFIX}.unsaved.desc`)}
        confirmText={t(`${T_PREFIX}.unsaved.leave`)}
        cancelBtnText={t(`${T_PREFIX}.unsaved.stay`)}
        destructive
        handleConfirm={() => blocker.proceed?.()}
      />
    </div>
  )
}
