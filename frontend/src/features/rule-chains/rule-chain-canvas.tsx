import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Save, Waypoints } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  useGetRuleChainsUuid,
  useGetRuleNodeDefinitions,
  usePostRuleChains,
  usePutRuleChainsUuid,
} from '@/api/generated'
import { getApiErrorMessage } from '@/lib/handle-server-error'
import { useTheme } from '@/context/theme-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { RuleChainInspector } from './components/rule-chain-inspector'
import { nodeTypes } from './components/rule-chain-node-types'
import { RuleChainPalette } from './components/rule-chain-palette'
import {
  defaultConfig,
  entryNode,
  serializeGraph,
  toDefinition,
} from './data/rule-chain-definitions'
import type { RuleFlowNode, RuleNodeDefinition } from './types/rule-chain-types'

interface RuleChainCanvasPageProps {
  uuid?: string
}

interface RuleChainCanvasInnerProps {
  initialUuid?: string
}

function RuleChainCanvasInner({ initialUuid = '' }: RuleChainCanvasInnerProps) {
  const { t } = useTranslation(['ruleChain', 'common'])
  const { resolvedTheme } = useTheme()
  const catalog = useGetRuleNodeDefinitions({
    query: { select: (response) => response.data?.items ?? [] },
  })
  const navigate = useNavigate()
  const router = useRouter()
  const [uuid, setUuid] = useState(initialUuid)
  const savedQuery = useGetRuleChainsUuid(uuid, { query: { enabled: !!uuid } })
  const [nodes, setNodes, onNodesChange] = useNodesState<RuleFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [nameDraft, setName] = useState<string | null>(null)
  const [descriptionDraft, setDescription] = useState<string | null>(null)
  const { screenToFlowPosition } = useReactFlow()
  const definitions = useMemo(
    () => catalog.data?.map(toDefinition) ?? [],
    [catalog.data]
  )
  // Fall back to the first node until the user picks one explicitly.
  const activeId = selectedId ?? nodes[0]?.id
  const selected = nodes.find((node) => node.id === activeId)
  // Drafts override the saved values only after the user edits them.
  const saved = savedQuery.data?.data?.ruleChain
  const name = nameDraft ?? (saved?.name || t('title'))
  const description = descriptionDraft ?? (saved?.description || '')
  const create = usePostRuleChains()
  const update = usePutRuleChainsUuid()
  const saving = create.isPending || update.isPending

  useEffect(() => {
    if (uuid || nodes.length) return
    const definition = definitions.find((item) => item.isSystem)
    if (!definition) return
    setNodes([entryNode(definition)])
  }, [definitions, nodes.length, setNodes, uuid])

  useEffect(() => {
    const graph = savedQuery.data?.data?.ruleChain?.graph
    if (!graph || !Array.isArray(graph.nodes) || !definitions.length) return
    const loaded = graph.nodes.flatMap((raw) => {
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
              position: { x: item.position?.x ?? 0, y: item.position?.y ?? 0 },
              data: {
                definition,
                config: item.data?.config ?? defaultConfig(definition),
              },
            },
          ]
        : []
    })
    if (loaded.length) {
      setNodes(loaded)
      setEdges(Array.isArray(graph.edges) ? (graph.edges as Edge[]) : [])
    }
  }, [definitions, savedQuery.data, setEdges, setNodes])

  const groups = useMemo(
    () =>
      definitions
        .filter((item) => !item.isSystem)
        .filter((item) => {
          const query = search.trim().toLowerCase()
          return (
            !query ||
            [item.name, item.description, item.category].some((value) =>
              value.toLowerCase().includes(query)
            )
          )
        })
        .reduce<Record<string, RuleNodeDefinition[]>>((result, item) => {
          ;(result[item.category] ??= []).push(item)
          return result
        }, {}),
    [definitions, search]
  )

  const addNode = useCallback(
    (definition: RuleNodeDefinition, position = { x: 320, y: 220 }) => {
      const id = crypto.randomUUID()
      setNodes((current) => [
        ...current,
        {
          id,
          type: 'ruleNode',
          position,
          data: { definition, config: defaultConfig(definition) },
        },
      ])
      setSelectedId(id)
      setInspectorOpen(true)
    },
    [setNodes]
  )

  const drop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const definition = definitions.find(
        (item) =>
          item.key === event.dataTransfer.getData('application/rule-node')
      )
      if (definition)
        addNode(
          definition,
          screenToFlowPosition({ x: event.clientX, y: event.clientY })
        )
    },
    [addNode, definitions, screenToFlowPosition]
  )

  const updateConfig = useCallback(
    (key: string, value: unknown) =>
      setNodes((current) =>
        current.map((node) =>
          node.id === activeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: { ...node.data.config, [key]: value },
                },
              }
            : node
        )
      ),
    [activeId, setNodes]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((current) => current.filter((node) => node.id !== nodeId))
      setEdges((current) =>
        current.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        )
      )
      setSelectedId('entry')
    },
    [setEdges, setNodes]
  )

  const save = useCallback(() => {
    if (!name.trim()) {
      toast.error(t('validation.nameRequired'))
      return
    }
    const data = {
      name: name.trim(),
      description,
      graph: serializeGraph(nodes, edges),
    }
    const done = (savedUuid?: string) => {
      const targetUuid = savedUuid || uuid
      if (targetUuid) {
        setUuid(targetUuid)
        navigate({
          to: '/rule-engine/rule-chains/$uuid',
          params: { uuid: targetUuid },
        })
      }
      toast.success(t('common:saveSuccess'))
    }
    const options = {
      onSuccess: (response: { data?: { ruleChain?: { uuid?: string } } }) =>
        done(response.data?.ruleChain?.uuid),
      onError: (err: unknown) =>
        toast.error(getApiErrorMessage(err, t('common:saveError'))),
    }
    if (uuid) update.mutate({ uuid, data }, options)
    else create.mutate({ data }, options)
  }, [create, description, edges, name, navigate, nodes, t, update, uuid])

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main fixed fluid className='flex min-h-0 flex-1 flex-col gap-3 py-3'>
        <div className='flex flex-wrap items-end justify-between gap-3 border-b pb-3'>
          <div className='flex min-w-0 flex-1 items-end gap-3'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => router.history.back()}
              aria-label={t('common:back')}
            >
              <ArrowLeft className='size-4' />
            </Button>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500'>
              <Waypoints className='size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className='h-8 max-w-md border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0'
                aria-label={t('nameLabel')}
              />
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('descriptionPlaceholder')}
                className='mt-1 h-6 max-w-lg border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0'
                aria-label={t('descriptionLabel')}
              />
            </div>
            <Badge variant='secondary'>{uuid ? t('saved') : t('draft')}</Badge>
          </div>
          <Button size='sm' onClick={save} disabled={saving}>
            <Save data-icon='inline-start' />
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
        <div className='flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-background'>
          <RuleChainPalette
            open={paletteOpen}
            search={search}
            groups={groups}
            onSearchChange={setSearch}
            onOpenChange={setPaletteOpen}
            onAddNode={addNode}
          />
          <div
            className='relative min-w-0 flex-1'
            onDrop={drop}
            onDragOver={(event) => event.preventDefault()}
          >
            <ReactFlow
              colorMode={resolvedTheme}
              style={{ backgroundColor: 'var(--muted)' }}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={(connection: Connection) =>
                setEdges((current) =>
                  addEdge(
                    {
                      ...connection,
                      type: 'smoothstep',
                      label: connection.sourceHandle ?? 'Success',
                    },
                    current
                  )
                )
              }
              onNodeClick={(_, node) => {
                setSelectedId(node.id)
                setInspectorOpen(true)
              }}
              fitView
              fitViewOptions={{ maxZoom: 1, padding: 0.3 }}
              proOptions={{ hideAttribution: true }}
              deleteKeyCode={['Backspace', 'Delete']}
              defaultEdgeOptions={{ type: 'smoothstep' }}
            >
              <Background
                color='var(--muted-foreground)'
                gap={22}
                variant={BackgroundVariant.Dots}
              />
              <Controls
                showInteractive={false}
                className='!border-border !bg-card'
              />
              <MiniMap
                pannable
                zoomable
                nodeColor='var(--primary)'
                className='!border-border !bg-card'
              />
            </ReactFlow>
          </div>
        </div>
      </Main>
      <RuleChainInspector
        open={inspectorOpen}
        selected={selected}
        onOpenChange={setInspectorOpen}
        onDeleteNode={deleteNode}
        onConfigChange={updateConfig}
      />
    </>
  )
}

export function RuleChainCanvasPage(props: RuleChainCanvasPageProps) {
  return (
    <ReactFlowProvider>
      <RuleChainCanvasInner initialUuid={props.uuid} />
    </ReactFlowProvider>
  )
}
