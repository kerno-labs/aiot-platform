import { useMemo } from 'react'
import { Route } from '@/routes/_authenticated/device-management/products/$productKey'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProduct } from '@/features/products/api/queries'
import {
  basicTopics,
  thingModelTopics,
  replaceProductKey,
  type BasicTopic,
  type ThingModelTopic,
} from '../../data/topics'

export function TopicListTab() {
  const { t } = useTranslation('deviceManagement')
  const { productKey } = Route.useParams()
  const { data: productResponse } = useProduct(productKey)
  const product = productResponse?.product

  // 替换 Topic 中的 productKey
  const processedBasicTopics = useMemo(() => {
    if (!product?.productKey) return []
    return basicTopics.map((topic) => ({
      ...topic,
      topic: replaceProductKey(topic.topic, product.productKey!),
    }))
  }, [product])

  const processedThingModelTopics = useMemo(() => {
    if (!product?.productKey) return []
    return thingModelTopics.map((topic) => ({
      ...topic,
      topic: replaceProductKey(topic.topic, product.productKey!),
    }))
  }, [product])

  return (
    <div className='space-y-4'>
      <Tabs defaultValue='basic' className='w-full'>
        <TabsList>
          <TabsTrigger value='basic'>
            {t('productDetail.topics.tabs.basic')}
          </TabsTrigger>
          <TabsTrigger value='thing-model'>
            {t('productDetail.topics.tabs.thingModel')}
          </TabsTrigger>
          <TabsTrigger value='custom'>
            {t('productDetail.topics.tabs.custom')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='basic' className='mt-4'>
          <TopicsTable topics={processedBasicTopics} descPrefix='basicTopics' />
        </TabsContent>

        <TabsContent value='thing-model' className='mt-4'>
          <TopicsTable
            topics={processedThingModelTopics}
            descPrefix='thingModelTopics'
          />
        </TabsContent>

        <TabsContent value='custom' className='mt-4'>
          <CustomTopicsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TopicsTable({
  topics,
  descPrefix,
}: {
  topics: Array<BasicTopic | ThingModelTopic>
  descPrefix: 'basicTopics' | 'thingModelTopics'
}) {
  const { t } = useTranslation(['deviceManagement', 'common'])

  // 按分类分组
  const groupedTopics = useMemo(() => {
    const groups: Record<string, Array<BasicTopic | ThingModelTopic>> = {}
    topics.forEach((topic) => {
      if (!groups[topic.category]) {
        groups[topic.category] = []
      }
      groups[topic.category].push(topic)
    })
    return groups
  }, [topics])

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-32'>
              {t('productDetail.topics.table.function')}
            </TableHead>
            <TableHead>{t('productDetail.topics.table.topicClass')}</TableHead>
            <TableHead className='w-32'>
              {t('productDetail.topics.table.permission')}
            </TableHead>
            <TableHead>{t('common:description')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedTopics).map(([category, categoryTopics]) =>
            categoryTopics.map((topic, index) => (
              <TableRow key={`${category}-${index}`}>
                {index === 0 && (
                  <TableCell
                    rowSpan={categoryTopics.length}
                    className='align-top font-medium'
                  >
                    {t(`productDetail.topics.categories.${category}`)}
                  </TableCell>
                )}
                <TableCell className='font-mono text-xs'>
                  {topic.topic}
                </TableCell>
                <TableCell>
                  {t(`productDetail.topics.permissions.${topic.permission}`)}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {t(`productDetail.topics.${descPrefix}.${topic.description}`)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// 自定义 Topic 表格（待实现）
function CustomTopicsTable() {
  const { t } = useTranslation(['deviceManagement', 'common'])

  return (
    <div className='flex h-64 flex-col items-center justify-center space-y-4 rounded-md border'>
      <p className='text-lg text-muted-foreground'>{t('common:comingSoon')}</p>
      <p className='text-sm text-muted-foreground'>
        {t('productDetail.topics.custom.description')}
      </p>
    </div>
  )
}
