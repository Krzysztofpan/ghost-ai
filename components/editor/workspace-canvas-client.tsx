"use client"

import { useCallback, useRef, useState } from "react"
import { ClientSideSuspense, LiveblocksProvider, RoomProvider, useErrorListener } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  Panel,
  ReactFlow,
  type IsValidConnection,
  type ReactFlowInstance,
  type ReactFlowProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { CanvasNodeView } from "@/components/editor/canvas-node"
import { CanvasMiniMapNode } from "@/components/editor/canvas-minimap-node"
import { CanvasShapePanel } from "@/components/editor/canvas-shape-panel"
import {
  CANVAS_SHAPE_DRAG_MIME,
  DEFAULT_NODE_COLOR_PAIR,
  DEFAULT_SHAPE_DIMENSIONS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas"
import { cn } from "@/lib/utils"

const CANVAS_NODE_TYPES = { canvasNode: CanvasNodeView }

function isNodeShape(value: unknown): value is NodeShape {
  return typeof value === "string" && (NODE_SHAPES as readonly string[]).includes(value)
}

const isValidCanvasConnection: IsValidConnection<CanvasEdge> = (connection) =>
  connection.source !== connection.target

interface WorkspaceCanvasClientProps {
  roomId: string
  className?: string
}

function CanvasLoadingState() {
  return (
    <div className='flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-2 bg-base text-copy-muted'>
      <div className='h-6 w-6 animate-spin rounded-full border-2 border-surface-border border-t-brand' aria-hidden />
      <p className='text-sm'>Loading canvas…</p>
    </div>
  )
}

function LiveblocksRoomShell({ children }: { children: React.ReactNode }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useErrorListener(
    useCallback((error) => {
      console.error("[Liveblocks]", error)
      setErrorMessage(error.message)
    }, []),
  )

  if (errorMessage) {
    return (
      <div className='flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-2 bg-base px-6 text-center'>
        <p className='text-sm font-medium text-copy-primary'>Collaboration unavailable</p>
        <p className='max-w-md text-sm text-copy-muted'>{errorMessage}</p>
      </div>
    )
  }

  return children
}

function WorkspaceFlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: { initial: [] },
    edges: { initial: [] },
  })

  const rfRef = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const dropCounterRef = useRef(0)

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const instance = rfRef.current
      if (!instance) return

      const raw = event.dataTransfer.getData(CANVAS_SHAPE_DRAG_MIME)
      if (!raw) return

      let parsed: unknown
      try {
        parsed = JSON.parse(raw) as unknown
      } catch {
        return
      }

      if (!parsed || typeof parsed !== "object") return
      const record = parsed as Record<string, unknown>
      if (!isNodeShape(record.shape)) return

      const shape = record.shape
      const defaults = DEFAULT_SHAPE_DIMENSIONS[shape]
      const width = typeof record.width === "number" ? record.width : defaults.width
      const height = typeof record.height === "number" ? record.height : defaults.height

      const flowPoint = instance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const id = `${shape}-${Date.now()}-${dropCounterRef.current++}`
      const newNode: CanvasNode = {
        id,
        type: "canvasNode",
        position: {
          x: flowPoint.x - width / 2,
          y: flowPoint.y - height / 2,
        },
        width,
        height,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR_PAIR.fill,
          shape,
        },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [onNodesChange],
  )

  const flowProps: ReactFlowProps<CanvasNode, CanvasEdge> = {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
    onInit: (instance) => {
      rfRef.current = instance
    },
    nodeTypes: CANVAS_NODE_TYPES,
    connectionMode: ConnectionMode.Loose,
    connectionRadius: 28,
    isValidConnection: isValidCanvasConnection,
    fitView: true,
    defaultEdgeOptions: { type: "smoothstep" },
    proOptions: { hideAttribution: true },
    className: "bg-base",
  }

  return (
    <div
      className='relative h-full min-h-0 w-full'
      onDragOver={handleDragOver}
      onDragOverCapture={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow {...flowProps}>
        <Background color='var(--border-subtle)' gap={20} size={1.25} variant={BackgroundVariant.Dots} />
        <MiniMap
          className='border! border-surface-border! rounded-xl! bg-elevated/95!'
          maskColor='rgba(8, 8, 9, 0.65)'
          nodeBorderRadius={0}
          nodeStrokeWidth={2}
          nodeColor={(node) => {
            const n = node as CanvasNode
            return n.data?.color ?? DEFAULT_NODE_COLOR_PAIR.fill
          }}
          nodeStrokeColor={(node) => (node.selected ? "var(--accent-primary)" : "var(--border-default)")}
          nodeComponent={CanvasMiniMapNode}
        />
        <Panel position='bottom-center' className='mb-6'>
          <CanvasShapePanel />
        </Panel>
      </ReactFlow>
    </div>
  )
}

export function WorkspaceCanvasClient({ roomId, className }: WorkspaceCanvasClientProps) {
  return (
    <div className={cn("relative h-full min-h-0 w-full overflow-hidden", className)}>
      <LiveblocksProvider authEndpoint='/api/liveblocks-auth'>
        <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
          <LiveblocksRoomShell>
            <ClientSideSuspense fallback={<CanvasLoadingState />}>
              <WorkspaceFlowCanvas />
            </ClientSideSuspense>
          </LiveblocksRoomShell>
        </RoomProvider>
      </LiveblocksProvider>
    </div>
  )
}
