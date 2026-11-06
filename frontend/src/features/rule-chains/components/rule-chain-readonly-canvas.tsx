import { useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTranslation } from 'react-i18next'
import { useGetRuleNodeDefinitions } from '@/api/generated'
import { useTheme } from '@/context/theme-provider'
import { defaultConfig, toDefinition } from '../data/rule-chain-definitions'
import type { RuleFlowNode } from '../types/rule-chain-types'
import { nodeTypes } from './rule-chain-node-types'

interface RuleChainReadonlyCanvasProps {
  graph?: Record<string, unknown>
}

function RuleChainReadonlyCanvasInner({ graph }: RuleChainReadonlyCanvasProps) {
  const { t } = useTranslation('ruleChain')
  const { resolvedTheme } = useTheme()
  const catalog = useGetRuleNodeDefinitions({
    query: { select: (response) => response.data?.items ?? [] },
  })
  const definitions = useMemo(
    () => catalog.data?.map(toDefinition) ?? [],
    [catalog.data]
  )

  const { nodes, edges } = useMemo(() => {
    const rawNodes = Array.isArray(graph?.nodes) ? graph.nodes : []
    const nodes = rawNodes.flatMap((raw) => {
      const item = raw as {
        id?: string
        type?: string
        position?: { x?: number; y?: number }
        data?: { definitionKey?: string; config?: Record<string, unknown> }
      }
      const definition = definitions.find(
        (candidate) => candidate.key === item.data?.definitionKey
      )
      return definition && item.id
        ? [
            {
              id: item.id,
              type: item.type ?? 'ruleNode',
              position: {
                x: item.position?.x ?? 0,
                y: item.position?.y ?? 0,
              },
              data: {
                definition,
                config: item.data?.config ?? defaultConfig(definition),
              },
            } satisfies RuleFlowNode,
          ]
        : []
    })
    const edges = Array.isArray(graph?.edges) ? (graph.edges as Edge[]) : []
    return { nodes, edges }
  }, [definitions, graph])

  if (catalog.isLoading) {
    return (
      <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
        {t('detail.loading')}
      </div>
    )
  }

  return (
    <ReactFlow
      colorMode={resolvedTheme}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
      fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        color='var(--muted-foreground)'
        gap={22}
        variant={BackgroundVariant.Dots}
      />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor='var(--primary)' />
    </ReactFlow>
  )
}

export function RuleChainReadonlyCanvas(props: RuleChainReadonlyCanvasProps) {
  return (
    <ReactFlowProvider>
      <RuleChainReadonlyCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
