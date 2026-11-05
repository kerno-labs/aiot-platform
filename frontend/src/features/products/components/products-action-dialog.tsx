'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type {
  ProductCreateProductRequest as ProductV1CreateProductRequest,
  ProductUpdateProductRequest as ProductV1UpdateProductRequest,
} from '@/api/generated/model'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
import { useProductCategories } from '../api/categories'
import { useCreateProduct, useProduct, useUpdateProduct } from '../api/queries'
import {
  connectivityMethods,
  directGatewayProtocols,
  gatewaySubProtocols,
  nodeTypes,
} from '../data/data'
import { applicationProtocols, getProtocolLabel } from '../data/protocols'
import {
  type Product,
  createProductFormSchema,
  type ProductFormData,
} from '../data/schema'
import { CategoryCascader } from './category-cascader'

type ProductActionDialogProps = {
  currentRow?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductsActionDialog({
  currentRow,
  open,
  onOpenChange,
}: ProductActionDialogProps) {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const isEdit = !!currentRow

  // Create and update mutations
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const productQuery = useProduct(currentRow?.productKey || '')
  const categoryQuery = useProductCategories()
  const [applicationProtocol, setApplicationProtocol] = React.useState('json')

  React.useEffect(() => {
    if (!isEdit || !productQuery.data?.product) return
    setApplicationProtocol(
      productQuery.data.product.protocols?.[0]?.applicationProtocol || 'json'
    )
  }, [isEdit, productQuery.data])

  const form = useForm<ProductFormData>({
    resolver: zodResolver(createProductFormSchema(t)),
    defaultValues: isEdit
      ? {
          name: currentRow.name,
          description: currentRow.description || '',
          categoryId: currentRow.categoryId?.toString() || '',
          nodeType:
            (currentRow as Product & { nodeType?: string }).nodeType ||
            'direct',
          connectivityMethod: (
            currentRow as Product & { connectivityMethod?: string }
          ).connectivityMethod,
          accessProtocol:
            (currentRow as Product & { accessProtocol?: string })
              .accessProtocol || 'http',
        }
      : {
          name: '',
          description: '',
          categoryId: '',
          nodeType: 'direct',
          connectivityMethod: undefined,
          accessProtocol: 'http',
        },
  })

  // Watch nodeType to control connectivity method field visibility and protocol options
  // eslint-disable-next-line react-hooks/incompatible-library
  const nodeType = form.watch('nodeType')
  const showConnectivityMethod = nodeType === 'direct' || nodeType === 'gateway'

  // Determine which protocols to show based on node type
  const accessProtocolOptions =
    nodeType === 'gateway-sub' ? gatewaySubProtocols : directGatewayProtocols

  // Reset access protocol when node type changes to ensure valid protocol for the type
  const prevNodeType = React.useRef(nodeType)
  React.useEffect(() => {
    if (prevNodeType.current !== nodeType) {
      // Reset to first valid protocol for the new node type
      const defaultProtocol = nodeType === 'gateway-sub' ? 'custom' : 'http'
      form.setValue('accessProtocol', defaultProtocol)
      prevNodeType.current = nodeType
    }
  }, [nodeType, form])

  const onSubmit = async (values: ProductFormData) => {
    try {
      const protocols =
        values.accessProtocol === 'default'
          ? [
              { transportProtocol: 'http', applicationProtocol: 'json' },
              { transportProtocol: 'mqtt', applicationProtocol: 'json' },
            ]
          : [
              {
                transportProtocol:
                  values.accessProtocol === 'jt808' ||
                  values.accessProtocol === 'jt1078'
                    ? 'tcp'
                    : values.accessProtocol,
                applicationProtocol:
                  values.accessProtocol === 'jt808' ||
                  values.accessProtocol === 'jt1078'
                    ? values.accessProtocol
                    : applicationProtocol,
              },
            ]
      if (isEdit && currentRow) {
        // Update existing product
        await updateProduct.mutateAsync({
          productKey: currentRow.productKey,
          data: {
            name: values.name,
            description: values.description || undefined,
            ...(values.categoryId && { categoryId: Number(values.categoryId) }),
            ...(values.nodeType && { nodeType: values.nodeType }),
            ...(values.connectivityMethod && {
              connectivityMethod: values.connectivityMethod,
            }),
            ...(values.accessProtocol && {
              accessProtocol: values.accessProtocol,
            }),
            protocols,
          } as unknown as ProductV1UpdateProductRequest,
        })
        toast.success(t('common:updateSuccess'))
      } else {
        // Create new product
        await createProduct.mutateAsync({
          name: values.name,
          description: values.description || undefined,
          ...(values.categoryId && { categoryId: Number(values.categoryId) }),
          ...(values.nodeType && { nodeType: values.nodeType }),
          ...(values.connectivityMethod && {
            connectivityMethod: values.connectivityMethod,
          }),
          ...(values.accessProtocol && {
            accessProtocol: values.accessProtocol,
          }),
          protocols,
        } as unknown as ProductV1CreateProductRequest)
        toast.success(t('common:createSuccess'))
      }
      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          isEdit ? t('common:updateError') : t('common:createError')
        )
      )
    }
  }

  const isSubmitting = createProduct.isPending || updateProduct.isPending

  return (
    <Sheet
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <SheetContent className='flex flex-col'>
        <SheetHeader className='text-start'>
          <SheetTitle>
            {isEdit ? t('common:edit') : t('common:create')}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            id='product-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex-1 space-y-6 overflow-y-auto px-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('productDetail.info.fields.name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('productDetail.info.fields.name')}
                      className='w-full'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='nodeType'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('productDetail.info.fields.nodeType')}
                  </FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    className='w-full'
                    items={nodeTypes.map(({ value }) => ({
                      label: t(`productDetail.nodeTypes.${value}`),
                      value,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {showConnectivityMethod && (
              <FormField
                control={form.control}
                name='connectivityMethod'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('productDetail.info.fields.connectivityMethod')}
                    </FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      className='w-full'
                      items={connectivityMethods.map(({ value }) => ({
                        label: t(`productDetail.connectivityMethods.${value}`),
                        value,
                      }))}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name='accessProtocol'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {nodeType === 'gateway-sub'
                      ? t('productDetail.info.fields.gatewayAccessProtocol')
                      : t('productDetail.info.fields.accessProtocol')}
                  </FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    className='w-full'
                    items={accessProtocolOptions.map(({ value }) => ({
                      label: getProtocolLabel(value, t),
                      value,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid gap-2'>
              <FormLabel>{t('productDetail.protocols.application')}</FormLabel>
              <SelectDropdown
                defaultValue={applicationProtocol}
                onValueChange={setApplicationProtocol}
                isControlled
                className='w-full'
                items={applicationProtocols.map((protocol) => ({
                  label: getProtocolLabel(protocol, t),
                  value: protocol,
                }))}
              />
            </div>
            <FormField
              control={form.control}
              name='categoryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('productDetail.info.fields.category')}
                  </FormLabel>
                  <CategoryCascader
                    nodes={categoryQuery.data ?? []}
                    value={field.value}
                    onValueChange={field.onChange}
                    isLoading={categoryQuery.isLoading}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('common:description')}
                      className='w-full resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter>
          <Button type='submit' form='product-form' disabled={isSubmitting}>
            {isSubmitting && (
              <span className='mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent' />
            )}
            {t('common:save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
