import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/_authenticated/device-management/products/$productKey'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Main } from '@/components/layout/main'
import { useProduct } from '@/features/products/api/queries'
import { DeviceDevelopmentTab } from './device-development-tab'
import { FeatureDefinitionTab } from './feature-definition-tab'
import { FileUploadConfigTab } from './file-upload-config-tab'
import { MessageParsingTab } from './message-parsing-tab'
import { ProductHeader } from './product-header'
import { ProductInfoTab } from './product-info-tab'
import { ServerSubscriptionTab } from './server-subscription-tab'
import { TopicListTab } from './topic-list-tab'

export function ProductDetailPage() {
  const { t } = useTranslation(['deviceManagement', 'common'])
  const { productKey } = Route.useParams()
  const navigate = useNavigate()
  const { data: productResponse, isLoading, error } = useProduct(productKey)

  const handleBack = () => {
    navigate({ to: '/device-management/products' })
  }

  if (isLoading) {
    return (
      <Main fixed>
        <div className='flex h-full flex-col'>
          <div className='animate-pulse space-y-4'>
            <div className='h-8 w-48 rounded bg-muted'></div>
            <div className='h-16 rounded bg-muted'></div>
            <div className='h-96 rounded bg-muted'></div>
          </div>
        </div>
      </Main>
    )
  }

  if (error || !productResponse?.product) {
    return (
      <Main fixed>
        <div className='flex h-full flex-col items-center justify-center space-y-4'>
          <p className='text-lg text-muted-foreground'>
            {t('productDetail.notFound')}
          </p>
          <Button onClick={handleBack}>{t('common:back')}</Button>
        </div>
      </Main>
    )
  }

  const product = productResponse.product

  return (
    <Main fixed>
      <div className='flex h-full min-w-0 flex-col'>
        <ProductHeader product={product} onBack={handleBack} />

        <Tabs defaultValue='info' className='flex min-w-0 flex-1 flex-col'>
          <TabsList className='mb-4 max-w-full overflow-x-auto'>
            <TabsTrigger value='info' className='px-3.5'>
              {t('productDetail.tabs.info')}
            </TabsTrigger>
            <TabsTrigger value='topics' className='px-3.5'>
              {t('productDetail.tabs.topics')}
            </TabsTrigger>
            <TabsTrigger value='features' className='px-3.5'>
              {t('productDetail.tabs.features')}
            </TabsTrigger>
            <TabsTrigger value='parsing' className='px-3.5'>
              {t('productDetail.tabs.parsing')}
            </TabsTrigger>
            <TabsTrigger value='subscription' className='px-3.5'>
              {t('productDetail.tabs.subscription')}
            </TabsTrigger>
            <TabsTrigger value='development' className='px-3.5'>
              {t('productDetail.tabs.development')}
            </TabsTrigger>
            <TabsTrigger value='upload' className='px-3.5'>
              {t('productDetail.tabs.upload')}
            </TabsTrigger>
          </TabsList>

          <div className='min-w-0 flex-1 overflow-x-hidden overflow-y-auto'>
            <TabsContent value='info' className='mt-0'>
              <ProductInfoTab product={product} />
            </TabsContent>

            <TabsContent value='topics' className='mt-0'>
              <TopicListTab />
            </TabsContent>

            <TabsContent value='features' className='mt-0'>
              <FeatureDefinitionTab productKey={productKey} />
            </TabsContent>

            <TabsContent value='parsing' className='mt-0'>
              <MessageParsingTab productKey={productKey} />
            </TabsContent>

            <TabsContent value='subscription' className='mt-0'>
              <ServerSubscriptionTab />
            </TabsContent>

            <TabsContent value='development' className='mt-0'>
              <DeviceDevelopmentTab
                productId={product.id != null ? String(product.id) : ''}
              />
            </TabsContent>

            <TabsContent value='upload' className='mt-0'>
              <FileUploadConfigTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Main>
  )
}
