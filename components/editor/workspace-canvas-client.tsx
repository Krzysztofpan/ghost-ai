"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { ClientSideSuspense, useCanRedo, useCanUndo, useErrorListener, useRedo, useUndo, useUpdateMyPresence } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { Background, BackgroundVariant, ConnectionMode, Panel, ReactFlow, type IsValidConnection, type ReactFlowInstance, type ReactFlowProps } from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { CanvasControlBar } from "@/components/editor/canvas-control-bar"
import { CanvasEdgeView } from "@/components/editor/canvas-edge"
import { CanvasNodeView } from "@/components/editor/canvas-node"
import { CanvasPresenceOverlay } from "@/components/editor/canvas-presence-overlay"
import { CanvasShapePanel } from "@/components/editor/canvas-shape-panel"
import { CanvasShapeSurface } from "@/components/editor/canvas-shape-surface"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { CANVAS_SHAPE_DRAG_MIME, DEFAULT_NODE_COLOR_PAIR, DEFAULT_SHAPE_DIMENSIONS, NODE_SHAPES, type CanvasEdge, type CanvasNode, type NodeShape, type ShapeDragPayload } from "@/types/canvas"
import { type CanvasAutosaveStatus, useCanvasAutosave } from "@/hooks/use-canvas-autosave"
import { CANVAS_ZOOM_ANIMATION_MS, useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { cn } from "@/lib/utils"

const CANVAS_NODE_TYPES = { canvasNode: CanvasNodeView }

/** `smoothstep` included so existing persisted edges render with the same label UI. */
const CANVAS_EDGE_TYPES = { canvasEdge: CanvasEdgeView, smoothstep: CanvasEdgeView }

function isNodeShape(value: unknown): value is NodeShape {
  return typeof value === "string" && (NODE_SHAPES as readonly string[]).includes(value)
}

const isValidCanvasConnection: IsValidConnection<CanvasEdge> = (connection) => connection.source !== connection.target

export type WorkspaceCanvasClientHandle = {
  openStarterTemplates: () => void
  saveCanvas: () => Promise<void>
}

interface WorkspaceCanvasClientProps {
  roomId: string
  className?: string
  onAutosaveStatusChange?: (status: CanvasAutosaveStatus) => void
}

function CanvasLoadingState() {
  return (
    <div className='flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-2 bg-base text-copy-muted'>
      <div className='h-6 w-6 animate-spin rounded-full border-2 border-surface-border border-t-brand' aria-hidden />
      <p className='text-sm'>Loading canvas…</p>
    </div>
  )
}

export function LiveblocksRoomShell({ children }: { children: React.ReactNode }) {
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

interface WorkspaceFlowCanvasProps {
  projectId: string
  onAutosaveStatusChange?: (status: CanvasAutosaveStatus) => void
}

const WorkspaceFlowCanvas = forwardRef<WorkspaceCanvasClientHandle, WorkspaceFlowCanvasProps>(function WorkspaceFlowCanvas({ projectId, onAutosaveStatusChange }, ref) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: { initial: [] },
    edges: { initial: [] },
  })

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)

  const rfRef = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null)
  const dropCounterRef = useRef(0)
  const cursorFrameRef = useRef<number | null>(null)
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null)

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const updateMyPresence = useUpdateMyPresence()

  const [starterTemplatesOpen, setStarterTemplatesOpen] = useState(false)

  const { flushSave } = useCanvasAutosave(projectId, nodes, edges, {
    onStatusChange: onAutosaveStatusChange,
  })

  const hydratedFromBlobRef = useRef(false)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      hydratedFromBlobRef.current = true
      return
    }

    if (hydratedFromBlobRef.current) {
      return
    }

    const ac = new AbortController()

    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`, { signal: ac.signal })
        if (ac.signal.aborted) {
          return
        }

        if (nodesRef.current.length > 0 || edgesRef.current.length > 0) {
          return
        }

        if (!res.ok) {
          return
        }

        const data = (await res.json()) as { nodes?: unknown; edges?: unknown }

        if (ac.signal.aborted) {
          return
        }

        if (nodesRef.current.length > 0 || edgesRef.current.length > 0) {
          return
        }

        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          return
        }

        const nodesPayload = data.nodes as CanvasNode[]
        const edgesPayload = data.edges as CanvasEdge[]

        const nodeAdds = nodesPayload.map((item) => ({ type: "add" as const, item }))
        const edgeAdds = edgesPayload.map((item) => ({ type: "add" as const, item }))
        onNodesChange(nodeAdds)
        onEdgesChange(edgeAdds)

        window.setTimeout(() => {
          void rfRef.current?.fitView({
            duration: CANVAS_ZOOM_ANIMATION_MS,
            padding: 0.18,
          })
        }, 0)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }
        console.error("[canvas blob hydrate]", error)
      } finally {
        if (!ac.signal.aborted) {
          hydratedFromBlobRef.current = true
        }
      }
    })()

    return () => {
      ac.abort()
    }
  }, [projectId, nodes.length, edges.length, onNodesChange, onEdgesChange])

  useImperativeHandle(ref, () => ({
    openStarterTemplates: () => setStarterTemplatesOpen(true),
    saveCanvas: flushSave,
  }))

  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      const edgeRemovals = edges.map((e) => ({ type: "remove" as const, id: e.id }))
      const nodeRemovals = nodes.map((n) => ({ type: "remove" as const, id: n.id }))
      onEdgesChange(edgeRemovals)
      onNodesChange(nodeRemovals)

      const nodeAdds = template.nodes.map((item) => ({ type: "add" as const, item }))
      const edgeAdds = template.edges.map((item) => ({ type: "add" as const, item }))
      onNodesChange(nodeAdds)
      onEdgesChange(edgeAdds)

      window.setTimeout(() => {
        void rfRef.current?.fitView({
          duration: CANVAS_ZOOM_ANIMATION_MS,
          padding: 0.18,
        })
      }, 0)
    },
    [edges, nodes, onEdgesChange, onNodesChange],
  )

  useKeyboardShortcuts(rfRef, undo, redo)

  const handleZoomOut = useCallback(() => {
    rfRef.current?.zoomOut({ duration: CANVAS_ZOOM_ANIMATION_MS })
  }, [])
  const handleZoomIn = useCallback(() => {
    rfRef.current?.zoomIn({ duration: CANVAS_ZOOM_ANIMATION_MS })
  }, [])
  const handleFitView = useCallback(() => {
    void rfRef.current?.fitView({ duration: CANVAS_ZOOM_ANIMATION_MS })
  }, [])

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const instance = rfRef.current
      if (!instance) return

      pendingCursorRef.current = instance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      if (cursorFrameRef.current !== null) return

      cursorFrameRef.current = window.requestAnimationFrame(() => {
        cursorFrameRef.current = null
        if (pendingCursorRef.current) {
          updateMyPresence({ cursor: pendingCursorRef.current })
        }
      })
    },
    [updateMyPresence],
  )

  const clearCanvasCursor = useCallback(() => {
    if (cursorFrameRef.current !== null) {
      window.cancelAnimationFrame(cursorFrameRef.current)
      cursorFrameRef.current = null
    }
    pendingCursorRef.current = null
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

  useEffect(() => clearCanvasCursor, [clearCanvasCursor])

  const [shapeDragPreview, setShapeDragPreview] = useState<ShapeDragPayload | null>(null)
  const [shapeDragPreviewScreen, setShapeDragPreviewScreen] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!shapeDragPreview) return

    const onDragOver = (event: DragEvent) => {
      event.preventDefault()
      setShapeDragPreviewScreen({ x: event.clientX, y: event.clientY })
    }

    const endPreview = () => {
      setShapeDragPreview(null)
      setShapeDragPreviewScreen(null)
    }

    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragend", endPreview)
    return () => {
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragend", endPreview)
    }
  }, [shapeDragPreview])

  const handleShapeDragPreviewStart = useCallback((payload: ShapeDragPayload, event: React.DragEvent<HTMLButtonElement>) => {
    setShapeDragPreview(payload)
    setShapeDragPreviewScreen({ x: event.clientX, y: event.clientY })
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setShapeDragPreview(null)
      setShapeDragPreviewScreen(null)
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
    /** Default is Backspace only; include Delete for standard desktop expectation. */
    deleteKeyCode: ["Delete", "Backspace"],
    onInit: (instance) => {
      rfRef.current = instance
    },
    nodeTypes: CANVAS_NODE_TYPES,
    edgeTypes: CANVAS_EDGE_TYPES,
    connectionMode: ConnectionMode.Loose,
    connectionRadius: 28,
    isValidConnection: isValidCanvasConnection,
    onMouseMove: handleCanvasMouseMove,
    onMouseLeave: clearCanvasCursor,
    fitView: true,
    defaultEdgeOptions: { type: "canvasEdge", data: { label: "" } },
    proOptions: { hideAttribution: true },
    className: "bg-base",
  }

  const previewStroke = "var(--border-default)"
  const previewStrokeW = 2

  return (
    <div className='relative h-full min-h-0 w-full' onDragOver={handleDragOver} onDragOverCapture={handleDragOver} onDrop={handleDrop}>
      {shapeDragPreview && shapeDragPreviewScreen ? (
        <div
          className='pointer-events-none fixed z-10000'
          style={{
            left: shapeDragPreviewScreen.x,
            top: shapeDragPreviewScreen.y,
            transform: "translate(-50%, -50%)",
            width: shapeDragPreview.width,
            height: shapeDragPreview.height,
            opacity: 0.72,
          }}
          aria-hidden
        >
          <CanvasShapeSurface shape={shapeDragPreview.shape} width={shapeDragPreview.width} height={shapeDragPreview.height} fill={DEFAULT_NODE_COLOR_PAIR.fill} stroke={previewStroke} strokeWidth={previewStrokeW} />
        </div>
      ) : null}
      <StarterTemplatesModal open={starterTemplatesOpen} onOpenChange={setStarterTemplatesOpen} onImport={handleImportTemplate} />
      <ReactFlow {...flowProps}>
        <Background color='var(--border-subtle)' gap={20} size={1.25} variant={BackgroundVariant.Dots} />
        <CanvasPresenceOverlay />
        <Panel position='bottom-left' className='mb-24 ml-4'>
          <CanvasControlBar onZoomOut={handleZoomOut} onFitView={handleFitView} onZoomIn={handleZoomIn} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />
        </Panel>
        <Panel position='bottom-center' className='mb-6'>
          <CanvasShapePanel onShapeDragPreviewStart={handleShapeDragPreviewStart} />
        </Panel>
      </ReactFlow>
    </div>
  )
})

export const WorkspaceCanvasClient = forwardRef<WorkspaceCanvasClientHandle, WorkspaceCanvasClientProps>(function WorkspaceCanvasClient({ roomId, className, onAutosaveStatusChange }, ref) {
  return (
    <div className={cn("relative h-full min-h-0 w-full overflow-hidden", className)}>
      <ClientSideSuspense fallback={<CanvasLoadingState />}>
        <WorkspaceFlowCanvas ref={ref} projectId={roomId} onAutosaveStatusChange={onAutosaveStatusChange} />
      </ClientSideSuspense>
    </div>
  )
})
