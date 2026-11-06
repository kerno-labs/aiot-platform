import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { COMMON_UNITS } from '../constants'
import type { Property } from '../types'

interface PropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: Property | null
  onSave: (property: Property) => void
}

export function PropertyDialog({
  open,
  onOpenChange,
  property,
  onSave,
}: PropertyDialogProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const [formData, setFormData] = useState<Property | null>(null)
  const [isCustomUnit, setIsCustomUnit] = useState(false)

  // Re-initialize the form only when the dialog opens or the target changes.
  const [prevInput, setPrevInput] = useState({
    open: false,
    property: null as Property | null,
  })
  if (prevInput.open !== open || prevInput.property !== property) {
    setPrevInput({ open, property })
    if (open && property) {
      const cloned = JSON.parse(JSON.stringify(property))
      setFormData(cloned)
      const currentUnit = cloned.dataType?.specs?.unit
      const isInList = COMMON_UNITS.some(
        (u) => u === currentUnit || (u === 'none' && !currentUnit)
      )
      setIsCustomUnit(Boolean(currentUnit && !isInList))
    }
  }

  const handleSave = () => {
    if (formData && formData.identifier && formData.name) {
      onSave(formData)
    }
  }

  if (!formData) return null

  const isEdit = Boolean(property && property.identifier)
  const currentUnitValue = isCustomUnit
    ? 'custom'
    : formData.dataType?.specs?.unit || 'none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-lg overflow-y-auto p-5'>
        <DialogHeader className='pb-1'>
          <DialogTitle className='text-base font-semibold'>
            {isEdit ? t('common:edit') : t('common:create')}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-3 py-1 text-xs'>
          {/* 功能类型 */}
          <div className='space-y-1.5'>
            <div className='flex items-center gap-1.5'>
              <Label className='flex items-center gap-1 text-xs font-medium'>
                <span className='text-destructive'>*</span>
                {t('productDetail.featureDefinition.dialog.featureType')}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className='size-3.5 cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground' />
                </TooltipTrigger>
                <TooltipContent side='top'>
                  <span>
                    {t(
                      'productDetail.featureDefinition.dialog.featureTypeTooltip'
                    )}
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className='inline-flex h-8 rounded-sm border border-input bg-muted/20 p-0.5 text-xs'>
              <button
                type='button'
                className='rounded-xs border border-primary bg-primary/5 px-3.5 font-medium text-primary shadow-2xs'
              >
                {t('productDetail.featureDefinition.sections.propertiesOnly')}
              </button>
              <button
                type='button'
                disabled
                className='cursor-not-allowed px-3.5 text-muted-foreground/50'
              >
                {t('productDetail.featureDefinition.sections.servicesOnly')}
              </button>
              <button
                type='button'
                disabled
                className='cursor-not-allowed px-3.5 text-muted-foreground/50'
              >
                {t('productDetail.featureDefinition.sections.eventsOnly')}
              </button>
            </div>
          </div>

          {/* 功能名称 */}
          <div className='space-y-1.5'>
            <div className='flex items-center gap-1.5'>
              <Label className='flex items-center gap-1 text-xs font-medium'>
                <span className='text-destructive'>*</span>
                {t('productDetail.featureDefinition.dialog.name')}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className='size-3.5 cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground' />
                </TooltipTrigger>
                <TooltipContent side='top'>
                  <span>
                    {t(
                      'productDetail.featureDefinition.propertyDialog.nameTooltip'
                    )}
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              className='h-8 text-xs'
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t(
                'productDetail.featureDefinition.placeholders.propertyName'
              )}
            />
          </div>

          {/* 标识符 */}
          <div className='space-y-1.5'>
            <div className='flex items-center gap-1.5'>
              <Label className='flex items-center gap-1 text-xs font-medium'>
                <span className='text-destructive'>*</span>
                {t('productDetail.featureDefinition.dialog.identifier')}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className='size-3.5 cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground' />
                </TooltipTrigger>
                <TooltipContent side='top'>
                  <span>
                    {t(
                      'productDetail.featureDefinition.propertyDialog.identifierTooltip'
                    )}
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              className='h-8 font-mono text-xs'
              value={formData.identifier}
              onChange={(e) =>
                setFormData({ ...formData, identifier: e.target.value })
              }
              placeholder={t(
                'productDetail.featureDefinition.placeholders.propertyId'
              )}
            />
          </div>

          {/* 数据类型 */}
          <div className='space-y-1.5'>
            <Label className='flex items-center gap-1 text-xs font-medium'>
              <span className='text-destructive'>*</span>
              {t('productDetail.featureDefinition.propertyDialog.dataType')}
            </Label>
            <Select
              value={formData.dataType.type}
              onValueChange={(
                value:
                  | 'int'
                  | 'float'
                  | 'double'
                  | 'bool'
                  | 'string'
                  | 'enum'
                  | 'struct'
                  | 'array'
              ) =>
                setFormData({
                  ...formData,
                  dataType: { ...formData.dataType, type: value },
                })
              }
            >
              <SelectTrigger className='h-8 w-full text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='int'>int32</SelectItem>
                <SelectItem value='float'>float</SelectItem>
                <SelectItem value='double'>double</SelectItem>
                <SelectItem value='bool'>bool</SelectItem>
                <SelectItem value='string'>text</SelectItem>
                <SelectItem value='enum'>enum</SelectItem>
                <SelectItem value='struct'>struct</SelectItem>
                <SelectItem value='array'>array</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 数值类型的规格：取值范围、步长、单位 */}
          {['int', 'float', 'double'].includes(formData.dataType.type) && (
            <>
              {/* 取值范围 */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>
                  {t('productDetail.featureDefinition.propertyDialog.range')}
                </Label>
                <div className='flex items-center gap-2'>
                  <Input
                    className='h-8 text-xs'
                    placeholder={t(
                      'productDetail.featureDefinition.propertyDialog.min'
                    )}
                    value={formData.dataType.specs?.min ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dataType: {
                          ...formData.dataType,
                          specs: {
                            ...formData.dataType.specs,
                            min: e.target.value,
                          },
                        },
                      })
                    }
                  />
                  <span className='text-xs text-muted-foreground select-none'>
                    ~
                  </span>
                  <Input
                    className='h-8 text-xs'
                    placeholder={t(
                      'productDetail.featureDefinition.propertyDialog.max'
                    )}
                    value={formData.dataType.specs?.max ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dataType: {
                          ...formData.dataType,
                          specs: {
                            ...formData.dataType.specs,
                            max: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* 步长 */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>
                  {t('productDetail.featureDefinition.propertyDialog.step')}
                </Label>
                <Input
                  className='h-8 text-xs'
                  placeholder={t(
                    'productDetail.featureDefinition.placeholders.step'
                  )}
                  value={formData.dataType.specs?.step ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dataType: {
                        ...formData.dataType,
                        specs: {
                          ...formData.dataType.specs,
                          step: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>

              {/* 单位 */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium'>
                  {t('productDetail.featureDefinition.propertyDialog.unit')}
                </Label>
                <Select
                  value={currentUnitValue}
                  onValueChange={(val) => {
                    if (val === 'custom') {
                      setIsCustomUnit(true)
                    } else {
                      setIsCustomUnit(false)
                      setFormData({
                        ...formData,
                        dataType: {
                          ...formData.dataType,
                          specs: {
                            ...formData.dataType.specs,
                            unit: val === 'none' ? '' : val,
                          },
                        },
                      })
                    }
                  }}
                >
                  <SelectTrigger className='h-8 w-full text-xs'>
                    <SelectValue
                      placeholder={t(
                        'productDetail.featureDefinition.placeholders.unit'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent className='max-h-56'>
                    {COMMON_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit === 'none'
                          ? '-'
                          : unit === 'custom'
                            ? t('common:custom')
                            : unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCustomUnit && (
                  <div className='flex gap-1.5 pt-1'>
                    <Input
                      placeholder={t(
                        'productDetail.featureDefinition.placeholders.customUnit'
                      )}
                      value={formData.dataType.specs?.unit ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dataType: {
                            ...formData.dataType,
                            specs: {
                              ...formData.dataType.specs,
                              unit: e.target.value,
                            },
                          },
                        })
                      }
                      className='h-8 flex-1 text-xs'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8 px-2 text-xs text-muted-foreground'
                      onClick={() => {
                        setIsCustomUnit(false)
                        setFormData({
                          ...formData,
                          dataType: {
                            ...formData.dataType,
                            specs: {
                              ...formData.dataType.specs,
                              unit: '',
                            },
                          },
                        })
                      }}
                    >
                      {t('common:cancel')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 枚举类型规格 */}
          {formData.dataType.type === 'enum' && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium'>
                {t('productDetail.featureDefinition.propertyDialog.enumValues')}
              </Label>
              <Textarea
                placeholder='{"0": "Off", "1": "On"}'
                value={JSON.stringify(formData.dataType.specs || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const specs = JSON.parse(e.target.value)
                    setFormData({
                      ...formData,
                      dataType: { ...formData.dataType, specs },
                    })
                  } catch {
                    // 允许输入过程中的临时非标准JSON
                  }
                }}
                className='min-h-[64px] font-mono text-xs'
              />
            </div>
          )}

          {/* 结构体规格 */}
          {formData.dataType.type === 'struct' && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium'>
                {t('productDetail.featureDefinition.propertyDialog.structDef')}
              </Label>
              <Textarea
                placeholder='{"lng": {"type": "double"}, "lat": {"type": "double"}}'
                value={JSON.stringify(formData.dataType.specs || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const specs = JSON.parse(e.target.value)
                    setFormData({
                      ...formData,
                      dataType: { ...formData.dataType, specs },
                    })
                  } catch {
                    // 忽略 JSON 解析错误
                  }
                }}
                className='min-h-[72px] font-mono text-xs'
              />
              <p className='text-[11px] text-muted-foreground'>
                {t(
                  'productDetail.featureDefinition.propertyDialog.structDefDesc'
                )}
              </p>
            </div>
          )}

          {/* 数组规格 */}
          {formData.dataType.type === 'array' && (
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium'>
                {t(
                  'productDetail.featureDefinition.propertyDialog.arrayElemType'
                )}
              </Label>
              <Textarea
                placeholder='{"type": "int", "size": 128}'
                value={JSON.stringify(formData.dataType.specs || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const specs = JSON.parse(e.target.value)
                    setFormData({
                      ...formData,
                      dataType: { ...formData.dataType, specs },
                    })
                  } catch {
                    // 忽略 JSON 解析错误
                  }
                }}
                className='min-h-[72px] font-mono text-xs'
              />
              <p className='text-[11px] text-muted-foreground'>
                {t(
                  'productDetail.featureDefinition.propertyDialog.arrayElemDesc'
                )}
              </p>
            </div>
          )}

          {/* 读写类型 */}
          <div className='space-y-1.5'>
            <Label className='flex items-center gap-1 text-xs font-medium'>
              <span className='text-destructive'>*</span>
              {t('productDetail.featureDefinition.propertyDialog.accessMode')}
            </Label>
            <RadioGroup
              value={formData.accessMode}
              onValueChange={(value: 'r' | 'rw') =>
                setFormData({ ...formData, accessMode: value })
              }
              className='flex items-center gap-8 pt-0.5'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='rw' id='access-rw' />
                <Label
                  htmlFor='access-rw'
                  className='cursor-pointer text-xs font-normal'
                >
                  {t('productDetail.featureDefinition.accessMode.rw')}
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='r' id='access-r' />
                <Label
                  htmlFor='access-r'
                  className='cursor-pointer text-xs font-normal'
                >
                  {t('productDetail.featureDefinition.accessMode.r')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 描述 */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium'>
              {t('common:description')}
            </Label>
            <div className='relative'>
              <Textarea
                placeholder={t(
                  'productDetail.featureDefinition.placeholders.desc'
                )}
                maxLength={100}
                rows={2}
                value={formData.desc || formData.description || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    desc: e.target.value,
                    description: e.target.value,
                  })
                }
                className='h-[56px] min-h-[56px] resize-none pb-5 text-xs'
              />
              <div className='pointer-events-none absolute right-2.5 bottom-1 text-[11px] text-muted-foreground select-none'>
                {(formData.desc || formData.description || '').length}/100
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className='flex justify-end gap-2 pt-1'>
          <Button size='sm' onClick={handleSave} className='h-8 text-xs'>
            {t('common:confirm')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='h-8 text-xs'
          >
            {t('common:cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
