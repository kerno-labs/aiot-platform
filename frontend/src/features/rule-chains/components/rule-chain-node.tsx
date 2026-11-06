import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { RuleFlowNode } from '../types/rule-chain-types'

export function RuleChainNode({ data, selected }: NodeProps<RuleFlowNode>) {
  const Icon = data.definition.icon
  return (
    <div
      className={cn(
        'min-w-44 rounded-lg border bg-card/95 p-3 text-card-foreground shadow-xl',
        selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-border'
      )}
    >
      {data.definition.inputs.length > 0 && (
        <Handle
          type='target'
          position={Position.Left}
          id='input'
          className='!size-2 !border-2 !border-background !bg-primary'
        />
      )}
      <div className='flex items-center gap-2'>
        <span className='flex size-7 items-center justify-center rounded-md bg-amber-400/15 text-amber-300'>
          <Icon className='size-4' />
        </span>
        <div className='min-w-0'>
          <p className='truncate text-xs font-semibold'>
            {data.definition.name}
          </p>
          <p className='text-[10px] text-muted-foreground'>
            {data.definition.category}
          </p>
        </div>
      </div>
      <p className='mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground'>
        {data.definition.description}
      </p>
      <div className='mt-3 flex flex-wrap gap-1.5'>
        {data.definition.outputs.map((output) => (
          <div key={output} className='relative'>
            <Badge className='border-border bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground'>
              {output}
            </Badge>
            <Handle
              type='source'
              position={Position.Right}
              id={output}
              className='!right-[-5px] !size-2 !border-2 !border-background !bg-primary'
            />
          </div>
        ))}
      </div>
    </div>
  )
}
