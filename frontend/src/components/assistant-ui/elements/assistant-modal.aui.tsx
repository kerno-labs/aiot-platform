import { type FC, forwardRef } from 'react'
import { AssistantModalPrimitive, useAuiState } from '@assistant-ui/react'
import { BorderBeam } from 'border-beam'
import { ChevronDownIcon } from 'lucide-react'
import { MetalFx } from 'metal-fx'
import { useTranslation } from 'react-i18next'
import { ThinkingOrb } from 'thinking-orbs'
import { Thread } from '@/components/assistant-ui/elements/thread.aui'
import { TooltipIconButton } from '@/components/assistant-ui/elements/tooltip-icon-button'

export const AssistantModal: FC = () => {
  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Anchor className='aui-root aui-modal-anchor fixed end-4 bottom-4 size-11'>
        <MetalFx
          preset='chromatic'
          variant='circle'
          strength={0.85}
          className='size-full'
        >
          <AssistantModalPrimitive.Trigger asChild>
            <AssistantModalButton />
          </AssistantModalPrimitive.Trigger>
        </MetalFx>
      </AssistantModalPrimitive.Anchor>
      <AssistantModalPrimitive.Content
        sideOffset={16}
        className='aui-root aui-modal-content z-50 h-125 max-h-(--radix-popover-content-available-height) w-100 max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) overflow-visible p-0 text-popover-foreground antialiased ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 motion-reduce:animate-none motion-reduce:[&_.aui-thread-viewport-footer]:animate-none [&_[data-slot=aui\_thread-viewport]]:[scrollbar-gutter:stable_both-edges] [&[data-state=open]_.aui-thread-viewport-footer]:animate-in [&[data-state=open]_.aui-thread-viewport-footer]:delay-100 [&[data-state=open]_.aui-thread-viewport-footer]:duration-300 [&[data-state=open]_.aui-thread-viewport-footer]:ease-[cubic-bezier(0.32,0.72,0,1)] [&[data-state=open]_.aui-thread-viewport-footer]:fade-in-0 [&[data-state=open]_.aui-thread-viewport-footer]:slide-in-from-bottom-2'
      >
        <BorderBeam
          colorVariant='colorful'
          size='pulse-inner'
          strength={0.8}
          borderRadius={40}
          className='relative h-full w-full overflow-hidden rounded-[2.5rem] border border-border/80 bg-gradient-to-b from-background/95 via-background/90 to-background/95 backdrop-blur-2xl dark:border-border/40 dark:from-card/95 dark:via-card/90 dark:to-card/95'
        >
          {/* Subtle top ambient light effect */}
          <div className='pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-cyan-500/15 blur-3xl dark:from-indigo-500/25 dark:via-purple-500/20 dark:to-cyan-500/25' />
          <Thread />
        </BorderBeam>
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  )
}

type AssistantModalButtonProps = { 'data-state'?: 'open' | 'closed' }

const AssistantModalButton = forwardRef<
  HTMLButtonElement,
  AssistantModalButtonProps
>(({ 'data-state': state, ...rest }, ref) => {
  const { t } = useTranslation(['aiCopilot', 'common'])
  const tooltip =
    state === 'open'
      ? t('common:close')
      : t('openCopilot', { defaultValue: 'Open AI Copilot' })
  const isRunning = useAuiState((s) => s.thread.isRunning)

  return (
    <TooltipIconButton
      variant='default'
      tooltip={tooltip}
      side='left'
      {...rest}
      className='aui-modal-button size-full rounded-full transition-transform duration-150 ease-out hover:scale-105 active:scale-96 motion-reduce:transition-none'
      ref={ref}
    >
      <div
        data-state={state}
        className='aui-modal-button-closed-icon absolute flex size-5 items-center justify-center transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=closed]:scale-100 data-[state=closed]:opacity-100 data-[state=closed]:blur-[0px] data-[state=open]:scale-25 data-[state=open]:opacity-0 data-[state=open]:blur-[4px] motion-reduce:transition-none'
      >
        <ThinkingOrb size={20} state={isRunning ? 'working' : 'breathing'} />
      </div>

      <ChevronDownIcon
        data-state={state}
        className='aui-modal-button-open-icon absolute size-6 transition-[scale,opacity,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[state=closed]:scale-25 data-[state=closed]:opacity-0 data-[state=closed]:blur-[4px] data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=open]:blur-[0px] motion-reduce:transition-none'
      />
      <span className='aui-sr-only sr-only'>{tooltip}</span>
    </TooltipIconButton>
  )
})

AssistantModalButton.displayName = 'AssistantModalButton'
