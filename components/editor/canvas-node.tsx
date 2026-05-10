"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import {
  ConnectionMode,
  Handle,
  NodeResizer,
  type InternalNode,
  type NodeProps,
  useEdges,
  useNodes,
  useReactFlow,
  useStore,
} from "@xyflow/react"
import { getEdgePosition } from "@xyflow/system"
import { Trash2 } from "lucide-react"

import { CanvasShapeSurface } from "@/components/editor/canvas-shape-surface"
import {
  anchorToHandleStyle,
  getCanvasHandleAnchors,
  inferEdgeAttachmentSide,
  positionToCardinalSide,
  type CardinalSide,
} from "@/lib/canvas-handle-layout"
import {
  CANVAS_NODE_MIN_HEIGHT,
  CANVAS_NODE_MIN_WIDTH,
  DEFAULT_NODE_COLOR_PAIR,
  DEFAULT_SHAPE_DIMENSIONS,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas"
import { cn } from "@/lib/utils"

const LABEL_PLACEHOLDER = "Label"

/** Vertical breathing room inside the shape so the fitted textarea centers like the view label. */
const LABEL_EDIT_VERTICAL_GUTTER = 14

function textColorForFill(fill: string): string {
  const pair = NODE_COLORS.find((c) => c.fill === fill)
  return pair?.text ?? DEFAULT_NODE_COLOR_PAIR.text
}

const CARDINAL_SIDES: CardinalSide[] = ["top", "right", "bottom", "left"]

function dedupeEdgesById(list: CanvasEdge[]): CanvasEdge[] {
  const seen = new Set<string>()
  const out: CanvasEdge[] = []
  for (const e of list) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
  }
  return out
}

/** Maps `top-source` / `bottom-target` / loose-mode variants onto the cardinal side for UI placement. */
function sideFromHandleId(handle: string | null | undefined): CardinalSide | null {
  if (!handle) return null
  const m = /^(top|right|bottom|left)-(source|target)$/.exec(handle)
  return m ? (m[1] as CardinalSide) : null
}

/**
 * Groups edges by silhouette side using React Flow's connection lookup (not raw edge strings).
 * Loose-mode connections can attach a `-source` handle on the target side of the edge record (and vice versa),
 * so matching only `sourceHandle===*-source` misses disconnect controls.
 * Edges without handle ids use `getEdgePosition` (same as edge rendering) then geometric fallback.
 */
function bucketConnectionsBySide(
  edges: CanvasEdge[],
  nodeId: string,
  nodes: CanvasNode[],
  getNodeConnections: ReturnType<typeof useReactFlow<CanvasNode, CanvasEdge>>["getNodeConnections"],
  getInternalNode: (id: string) => InternalNode<CanvasNode> | undefined,
  connectionMode: ConnectionMode,
): { edgesBySide: Record<CardinalSide, CanvasEdge[]>; orphanEdges: CanvasEdge[] } {
  const edgeById = new Map(edges.map((e) => [e.id, e]))
  const map: Record<CardinalSide, CanvasEdge[]> = {
    top: [],
    right: [],
    bottom: [],
    left: [],
  }
  const ambiguous: CanvasEdge[] = []

  const conns = getNodeConnections({ nodeId })

  for (const c of conns) {
    const edge = edgeById.get(c.edgeId)
    if (!edge) continue

    const localHandle = c.source === nodeId ? c.sourceHandle : c.target === nodeId ? c.targetHandle : null
    let side = sideFromHandleId(localHandle)
    if (!side) {
      const src = getInternalNode(edge.source)
      const tgt = getInternalNode(edge.target)
      if (src && tgt) {
        const ep = getEdgePosition({
          id: edge.id,
          sourceNode: src,
          targetNode: tgt,
          sourceHandle: edge.sourceHandle ?? null,
          targetHandle: edge.targetHandle ?? null,
          connectionMode,
        })
        if (ep) {
          side = positionToCardinalSide(nodeId === edge.source ? ep.sourcePosition : ep.targetPosition)
        }
      }
      side ??= inferEdgeAttachmentSide(nodeId, edge, nodes)
    }
    if (side) map[side].push(edge)
    else ambiguous.push(edge)
  }

  for (const side of CARDINAL_SIDES) {
    map[side] = dedupeEdgesById(map[side])
  }

  return { edgesBySide: map, orphanEdges: dedupeEdgesById(ambiguous) }
}

const disconnectHandleBtnClass = cn(
  "nodrag nopan pointer-events-auto absolute z-[45] flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
  "border border-surface-border bg-elevated/95 shadow-md backdrop-blur-sm",
  "text-copy-muted transition-colors hover:border-destructive/40 hover:text-destructive",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
)

const disconnectFallbackBtnClass = cn(
  "nodrag nopan pointer-events-auto absolute left-1/2 z-[45] flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
  "top-[calc(100%+18px)]",
  "border border-surface-border bg-elevated/95 shadow-md backdrop-blur-sm",
  "text-copy-muted transition-colors hover:border-destructive/40 hover:text-destructive",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
)

/** Offset disconnect control from handle center (node-local px). */
function disconnectIconOffset(side: CardinalSide): { dx: number; dy: number } {
  /** Outside the node box so the control reads as chrome between nodes, not on the fill. */
  const gap = 22
  switch (side) {
    case "top":
      return { dx: 0, dy: -gap }
    case "bottom":
      return { dx: 0, dy: gap }
    case "left":
      return { dx: -gap, dy: 0 }
    case "right":
      return { dx: gap, dy: 0 }
    default: {
      const _ex: never = side
      return _ex
    }
  }
}

export function CanvasNodeView({ id, data, selected, width, height }: NodeProps<CanvasNode>) {
  const { updateNodeData, deleteElements, getNodeConnections, getInternalNode } = useReactFlow<CanvasNode, CanvasEdge>()
  const connectionMode = useStore((s) => s.connectionMode)
  const edges = useEdges<CanvasEdge>()
  const nodes = useNodes<CanvasNode>()
  const labelColor = textColorForFill(data.color)
  const defaults = DEFAULT_SHAPE_DIMENSIONS[data.shape]
  const w = width ?? defaults.width
  const h = height ?? defaults.height
  const borderColor = selected ? "var(--accent-primary)" : "var(--border-subtle)"
  const borderW = selected ? 2.5 : 1.5

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const [colorSwatchHoverFill, setColorSwatchHoverFill] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fitLabelTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const maxPx = Math.max(h - LABEL_EDIT_VERTICAL_GUTTER * 2, 28)
    el.style.maxHeight = `${maxPx}px`
    el.style.overflowY = "hidden"
    el.style.height = "0px"
    const next = Math.min(el.scrollHeight, maxPx)
    el.style.height = `${next}px`
    if (el.scrollHeight > maxPx) {
      el.style.overflowY = "auto"
    }
  }, [h])

  useLayoutEffect(() => {
    if (!isEditing) return
    fitLabelTextareaHeight()
  }, [draft, fitLabelTextareaHeight, h, isEditing, w])

  useEffect(() => {
    if (!isEditing) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.select()
    fitLabelTextareaHeight()
  }, [fitLabelTextareaHeight, isEditing])

  const handleLabelDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      setDraft(data.label)
      setIsEditing(true)
    },
    [data.label],
  )

  const stopEditing = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value)
      updateNodeData(id, { label: value })
    },
    [id, updateNodeData],
  )

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        stopEditing()
      }
    },
    [stopEditing],
  )

  const anchors = useMemo(() => getCanvasHandleAnchors(data.shape, w, h, borderW), [data.shape, w, h, borderW])

  const labelTypography = "text-sm leading-tight text-center"

  const { edgesBySide, orphanEdges } = useMemo(
    () => bucketConnectionsBySide(edges, id, nodes, getNodeConnections, getInternalNode, connectionMode),
    [edges, id, nodes, getNodeConnections, getInternalNode, connectionMode],
  )

  const disconnectEdges = useCallback(
    (toRemove: CanvasEdge[]) => {
      if (toRemove.length === 0) return
      void deleteElements({ edges: toRemove })
    },
    [deleteElements],
  )

  const disconnectSide = useCallback(
    (side: CardinalSide) => disconnectEdges(edgesBySide[side]),
    [disconnectEdges, edgesBySide],
  )

  const disconnectOrphans = useCallback(() => disconnectEdges(orphanEdges), [disconnectEdges, orphanEdges])

  const handlePairs = anchors.flatMap((a) => {
    const connectedHere = edgesBySide[a.side].length > 0
    const handleVisibility =
      connectedHere && selected
        ? "opacity-100"
        : "opacity-0 group-hover/node:opacity-100"
    const handleClass = cn(
      "z-10 h-2.5! w-2.5! border-2! border-bg-base! bg-copy-primary! transition-opacity",
      handleVisibility,
    )
    const style = anchorToHandleStyle(a.x, a.y)
    const { dx, dy } = disconnectIconOffset(a.side)
    const disconnectBtn =
      selected && connectedHere ? (
        <button
          key={`${a.side}-disconnect`}
          type='button'
          title='Remove connection'
          aria-label={`Remove connection on ${a.side}`}
          className={disconnectHandleBtnClass}
          style={{ left: `${a.x + dx}px`, top: `${a.y + dy}px` }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            disconnectSide(a.side)
          }}
        >
          <Trash2 className='h-3.5 w-3.5' aria-hidden strokeWidth={2} />
        </button>
      ) : null

    return [
      disconnectBtn,
      <Handle
        key={`${a.side}-target`}
        id={`${a.side}-target`}
        type='target'
        position={a.position}
        style={style}
        className={handleClass}
      />,
      <Handle
        key={`${a.side}-source`}
        id={`${a.side}-source`}
        type='source'
        position={a.position}
        style={style}
        className={handleClass}
      />,
    ]
  })

  return (
    <div
      className={cn(
        "group/node relative overflow-visible shadow-sm",
        selected && "drop-shadow-[0_0_10px_rgba(0,200,212,0.25)]",
      )}
      style={{ width: w, height: h }}
    >
      {selected ? (
        <div
          role='toolbar'
          aria-label='Node colors'
          className={cn(
            "nodrag nopan pointer-events-auto absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-elevated/95 px-1.5 py-1 shadow-lg backdrop-blur-sm",
          )}
          style={{ bottom: "calc(100% + 10px)" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {NODE_COLORS.map((pair) => {
            const isActive = data.color === pair.fill
            const isHoverGlow = selected && !isActive && colorSwatchHoverFill === pair.fill
            return (
              <button
                key={pair.fill}
                type='button'
                title={pair.label}
                aria-label={`${pair.label} fill`}
                aria-pressed={isActive}
                className={cn(
                  "relative h-6 w-6 shrink-0 rounded-full border border-white/15 transition-[box-shadow] duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
                )}
                style={{
                  backgroundColor: pair.fill,
                  boxShadow: isActive
                    ? `0 0 0 2px var(--bg-elevated), 0 0 0 4px ${pair.text}`
                    : isHoverGlow
                      ? `0 0 6px 1px color-mix(in srgb, ${pair.text} 58%, transparent)`
                      : undefined,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  updateNodeData(id, { color: pair.fill })
                }}
                onMouseEnter={() => {
                  if (!isActive) setColorSwatchHoverFill(pair.fill)
                }}
                onMouseLeave={() => {
                  setColorSwatchHoverFill((h) => (h === pair.fill ? null : h))
                }}
              />
            )
          })}
        </div>
      ) : null}
      <NodeResizer
        isVisible={selected}
        minWidth={CANVAS_NODE_MIN_WIDTH}
        minHeight={CANVAS_NODE_MIN_HEIGHT}
        color='var(--border-subtle)'
        handleClassName='!h-2 !w-2 !min-h-2 !min-w-2 !rounded-sm !border !border-white/15 !bg-elevated/90 !shadow-none'
        lineClassName='!border-white/10'
        lineStyle={{ borderWidth: 1 }}
      />
      <div className='pointer-events-none absolute inset-0 z-0' aria-hidden>
        <CanvasShapeSurface
          shape={data.shape}
          width={w}
          height={h}
          fill={data.color}
          stroke={borderColor}
          strokeWidth={borderW}
          className='pointer-events-none'
        />
      </div>
      {isEditing ? (
        <div
          className={cn(
            "nodrag nopan nowheel absolute inset-0 z-2 flex items-center justify-center px-3",
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            id={`canvas-node-label-${id}`}
            name={`canvas-node-label-${id}`}
            value={draft}
            placeholder={LABEL_PLACEHOLDER}
            rows={1}
            spellCheck={false}
            className={cn(
              "nodrag nopan nowheel box-border max-h-full min-h-0 w-full resize-none bg-transparent text-center break-words whitespace-pre-wrap outline-none",
              labelTypography,
            )}
            style={{ color: labelColor, caretColor: labelColor }}
            onChange={(e) => handleDraftChange(e.target.value)}
            onBlur={stopEditing}
            onKeyDown={handleTextareaKeyDown}
          />
        </div>
      ) : (
        <div
          className={cn(
            "absolute inset-0 z-1 flex cursor-default items-center justify-center px-3",
            labelTypography,
          )}
          onDoubleClick={handleLabelDoubleClick}
        >
          <span
            className={cn(
              "pointer-events-none line-clamp-4 max-h-full w-full overflow-hidden",
              !data.label.trim() && "text-copy-muted/75",
            )}
            style={data.label.trim() ? { color: labelColor } : undefined}
          >
            {data.label.trim() ? data.label : LABEL_PLACEHOLDER}
          </span>
        </div>
      )}
      {handlePairs}
      {selected && orphanEdges.length > 0 ? (
        <button
          type='button'
          title='Remove connections'
          aria-label={`Remove ${orphanEdges.length} connection${orphanEdges.length === 1 ? "" : "s"}`}
          className={disconnectFallbackBtnClass}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            disconnectOrphans()
          }}
        >
          <Trash2 className='h-3.5 w-3.5' aria-hidden strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}
