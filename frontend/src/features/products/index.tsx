import { useTranslation } from 'react-i18next'
import { ProductsDialogs } from './components/products-dialogs'
import { ProductsPrimaryButtons } from './components/products-primary-buttons'
import { ProductsProvider } from './components/products-provider'
import { ProductsTable } from './components/products-table'

export function Products() {
  const { t } = useTranslation('deviceManagement')

  return (
    <ProductsProvider>
      <div className='flex flex-1 flex-col gap-4'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('tabs.products')}
            </h2>
          </div>
          <ProductsPrimaryButtons />
        </div>
        <ProductsTable />
      </div>

      <ProductsDialogs />
    </ProductsProvider>
  )
}
