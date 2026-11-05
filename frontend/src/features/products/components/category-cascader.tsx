import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CategoryNode } from '../api/categories'

type CategoryCascaderProps = {
  nodes: CategoryNode[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
}

function findLabel(
  nodes: CategoryNode[],
  value?: string,
  parent = ''
): string | undefined {
  for (const node of nodes) {
    const label = parent ? `${parent} / ${node.name ?? ''}` : (node.name ?? '')
    if (String(node.id) === value) return label
    const child = findLabel(node.children ?? [], value, label)
    if (child) return child
  }
  return undefined
}

function CategoryItems({
  nodes,
  value,
  onValueChange,
}: Pick<CategoryCascaderProps, 'nodes' | 'value' | 'onValueChange'>) {
  return nodes.map((node) => {
    const children = node.children ?? []
    const nodeValue = String(node.id)
    if (children.length > 0) {
      return (
        <DropdownMenuSub key={nodeValue}>
          <DropdownMenuSubTrigger>{node.name}</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <CategoryItems
                nodes={children}
                value={value}
                onValueChange={onValueChange}
              />
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      )
    }
    return (
      <DropdownMenuItem
        key={nodeValue}
        className='relative'
        onSelect={() => onValueChange(nodeValue)}
      >
        <Check
          className={cn(
            'absolute right-2 size-4',
            value === nodeValue ? 'opacity-100' : 'opacity-0'
          )}
        />
        {node.name}
      </DropdownMenuItem>
    )
  })
}

export function CategoryCascader({
  nodes,
  value,
  onValueChange,
  placeholder,
  disabled,
  isLoading,
}: CategoryCascaderProps) {
  const { t } = useTranslation('common')
  const selectedLabel = findLabel(nodes, value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='outline'
          disabled={disabled || isLoading}
          className='w-full justify-between font-normal'
        >
          <span
            className={cn(
              'truncate',
              !selectedLabel && 'text-muted-foreground'
            )}
          >
            {isLoading
              ? t('loading')
              : selectedLabel || placeholder || t('select')}
          </span>
          <ChevronsUpDown className='size-4 shrink-0 text-muted-foreground' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='min-w-56'>
        <DropdownMenuGroup>
          <CategoryItems
            nodes={nodes}
            value={value}
            onValueChange={onValueChange}
          />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
