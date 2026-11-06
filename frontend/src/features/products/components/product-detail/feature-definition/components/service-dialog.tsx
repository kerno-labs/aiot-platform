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
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Service } from '../types'

interface ServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  onSave: (service: Service) => void
}

export function ServiceDialog({
  open,
  onOpenChange,
  service,
  onSave,
}: ServiceDialogProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const [formData, setFormData] = useState<Service | null>(null)

  // Re-initialize the form only when the dialog opens or the target changes.
  const [prevInput, setPrevInput] = useState({
    open: false,
    service: null as Service | null,
  })
  if (prevInput.open !== open || prevInput.service !== service) {
    setPrevInput({ open, service })
    if (open && service) setFormData(JSON.parse(JSON.stringify(service)))
  }

  const handleSave = () => {
    if (formData && formData.identifier && formData.name) {
      onSave(formData)
    }
  }

  if (!formData) return null

  const isEdit = Boolean(service && service.identifier)

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
                disabled
                className='cursor-not-allowed px-3.5 text-muted-foreground/50'
              >
                {t('productDetail.featureDefinition.sections.propertiesOnly')}
              </button>
              <button
                type='button'
                className='rounded-xs border border-primary bg-primary/5 px-3.5 font-medium text-primary shadow-2xs'
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
                      'productDetail.featureDefinition.serviceDialog.nameTooltip'
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
                'productDetail.featureDefinition.placeholders.serviceName'
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
                      'productDetail.featureDefinition.serviceDialog.identifierTooltip'
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
                'productDetail.featureDefinition.placeholders.serviceId'
              )}
            />
          </div>

          {/* 调用方式 */}
          <div className='space-y-1.5'>
            <Label className='flex items-center gap-1 text-xs font-medium'>
              <span className='text-destructive'>*</span>
              {t('productDetail.featureDefinition.serviceDialog.callType')}
            </Label>
            <RadioGroup
              value={formData.callType}
              onValueChange={(val: 'async' | 'sync') =>
                setFormData({ ...formData, callType: val })
              }
              className='flex items-center gap-6 pt-0.5'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='async' id='service-calltype-async' />
                <Label
                  htmlFor='service-calltype-async'
                  className='cursor-pointer text-xs font-normal'
                >
                  {t('productDetail.featureDefinition.serviceDialog.async')}
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='sync' id='service-calltype-sync' />
                <Label
                  htmlFor='service-calltype-sync'
                  className='cursor-pointer text-xs font-normal'
                >
                  {t('productDetail.featureDefinition.serviceDialog.sync')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 输入参数 */}
          <div className='space-y-1.5'>
            <div className='flex items-center gap-1.5'>
              <Label className='text-xs font-medium'>
                {t('productDetail.featureDefinition.serviceDialog.inputParams')}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className='size-3.5 cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground' />
                </TooltipTrigger>
                <TooltipContent side='top'>
                  <span>
                    {t(
                      'productDetail.featureDefinition.serviceDialog.inputParamsTooltip'
                    )}
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              placeholder='[{"identifier": "speed", "name": "Speed", "dataType": {"type": "int"}}]'
              value={JSON.stringify(formData.inputData || [], null, 2)}
              onChange={(e) => {
                try {
                  const inputData = JSON.parse(e.target.value)
                  setFormData({ ...formData, inputData })
                } catch {
                  // 忽略 JSON 解析错误，用户可能还在输入
                }
              }}
              className='min-h-[64px] font-mono text-xs'
            />
          </div>

          {/* 输出参数 */}
          <div className='space-y-1.5'>
            <div className='flex items-center gap-1.5'>
              <Label className='text-xs font-medium'>
                {t('productDetail.featureDefinition.dialog.outputParams')}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className='size-3.5 cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground' />
                </TooltipTrigger>
                <TooltipContent side='top'>
                  <span>
                    {t(
                      'productDetail.featureDefinition.serviceDialog.outputParamsTooltip'
                    )}
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              placeholder='[{"identifier": "result", "name": "Result", "dataType": {"type": "bool"}}]'
              value={JSON.stringify(formData.outputData || [], null, 2)}
              onChange={(e) => {
                try {
                  const outputData = JSON.parse(e.target.value)
                  setFormData({ ...formData, outputData })
                } catch {
                  // 忽略 JSON 解析错误，用户可能还在输入
                }
              }}
              className='min-h-[64px] font-mono text-xs'
            />
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
