import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteOTAPackage } from '../api/queries'
import { useOTAPackagesContext } from '../hooks/use-ota-packages-context'
import { CreatePackageDialog } from './create-package-dialog'
import { DeployPackageDialog } from './deploy-package-dialog'
import { EditPackageDialog } from './edit-package-dialog'

export function OTAPackagesDialogs() {
  const { t } = useTranslation('common')
  const { openDialog, setOpenDialog, selectedPackage } = useOTAPackagesContext()
  const deleteMutation = useDeleteOTAPackage()

  const handleDelete = async () => {
    if (!selectedPackage?.uuid) return

    await deleteMutation.mutateAsync(selectedPackage.uuid, {
      onSuccess: () => {
        setOpenDialog(null)
      },
    })
  }

  return (
    <>
      <CreatePackageDialog />
      <EditPackageDialog />
      <DeployPackageDialog />
      <ConfirmDialog
        open={openDialog === 'delete'}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        handleConfirm={() => void handleDelete()}
        isLoading={deleteMutation.isPending}
        title={t('delete')}
        desc={t('deleteConfirm')}
        confirmText={t('delete')}
        destructive
      />
    </>
  )
}
