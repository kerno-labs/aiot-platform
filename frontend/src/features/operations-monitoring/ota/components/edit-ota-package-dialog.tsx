import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'

export interface EditOTAPackageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageName: string
  description: string
  onSubmit: (data: {
    packageName: string
    description: string
  }) => Promise<void>
}

/**
 * Dialog component for editing OTA package metadata
 * Allows users to modify:
 * - Package name
 * - Description/release notes
 *
 * Includes form validation and error handling
 */
export function EditOTAPackageDialog({
  open,
  onOpenChange,
  packageName: initialPackageName,
  description: initialDescription,
  onSubmit,
}: EditOTAPackageDialogProps) {
  const { t } = useTranslation('common')
  const [packageName, setPackageName] = useState(initialPackageName)
  const [description, setDescription] = useState(initialDescription)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!packageName.trim()) {
      alert('Package name cannot be empty')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        packageName: packageName.trim(),
        description: description.trim(),
      })

      onOpenChange(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update package')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      // Reset form when closing
      if (!newOpen) {
        setPackageName(initialPackageName)
        setDescription(initialDescription)
      }
      onOpenChange(newOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{t('edit')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Package Name *</label>
            <Input
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder='e.g., firmware-v1.2.0'
              disabled={isSubmitting}
              maxLength={100}
            />
            <p className='text-xs text-muted-foreground'>
              {packageName.length}/100 characters
            </p>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-medium'>Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Enter package description and release notes'
              disabled={isSubmitting}
              maxLength={1000}
              rows={6}
            />
            <p className='text-xs text-muted-foreground'>
              {description.length}/1000 characters
            </p>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
