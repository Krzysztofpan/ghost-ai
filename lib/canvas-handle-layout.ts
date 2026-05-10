import type { CSSProperties } from "react"

import { Position } from "@xyflow/react"

import type { CanvasEdge, CanvasNode, NodeShape } from "@/types/canvas"
import { DEFAULT_SHAPE_DIMENSIONS } from "@/types/canvas"

export type CardinalSide = "top" | "right" | "bottom" | "left"

export function positionToCardinalSide(p: Position): CardinalSide {
  switch (p) {
    case Position.Top:
      return "top"
    case Position.Right:
      return "right"
    case Position.Bottom:
      return "bottom"
    case Position.Left:
      return "left"
    default:
      return "bottom"
  }
}

export type CanvasHandleAnchor = {
  side: CardinalSide
  /** Used by React Flow for edge routing relative to the handle */
  position: Position
  /** Handle center in node-local pixels (origin top-left of the node box) */
  x: number
  y: number
}

function nodeFlowRect(n: CanvasNode): { x: number; y: number; w: number; h: number } {
  const w = n.width ?? DEFAULT_SHAPE_DIMENSIONS[n.data.shape].width
  const h = n.height ?? DEFAULT_SHAPE_DIMENSIONS[n.data.shape].height
  return { x: n.position.x, y: n.position.y, w, h }
}

/**
 * Fallback when React Flow internals are not ready: first face hit by a ray from this node's center
 * toward the peer's center (better than dominant-axis center deltas for diagonal graphs).
 */
export function inferEdgeAttachmentSide(nodeId: string, edge: CanvasEdge, nodes: CanvasNode[]): CardinalSide | null {
  const peerId = edge.source === nodeId ? edge.target : edge.target === nodeId ? edge.source : null
  if (!peerId || peerId === nodeId) return null

  const map = new Map(nodes.map((n) => [n.id, n]))
  const self = map.get(nodeId)
  const peer = map.get(peerId)
  if (!self || !peer) return null

  const sr = nodeFlowRect(self)
  const pr = nodeFlowRect(peer)

  const scx = sr.x + sr.w / 2
  const scy = sr.y + sr.h / 2
  const pcx = pr.x + pr.w / 2
  const pcy = pr.y + pr.h / 2

  const dx = pcx - scx
  const dy = pcy - scy
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return null

  const nx = dx / len
  const ny = dy / len

  const left = sr.x
  const right = sr.x + sr.w
  const top = sr.y
  const bottom = sr.y + sr.h

  type Cand = { t: number; side: CardinalSide }
  const cands: Cand[] = []
  const EPS = 1e-9

  if (nx > EPS) {
    const t = (right - scx) / nx
    const yHit = scy + t * ny
    if (t > EPS && yHit >= top - EPS && yHit <= bottom + EPS) cands.push({ t, side: "right" })
  }
  if (nx < -EPS) {
    const t = (left - scx) / nx
    const yHit = scy + t * ny
    if (t > EPS && yHit >= top - EPS && yHit <= bottom + EPS) cands.push({ t, side: "left" })
  }
  if (ny > EPS) {
    const t = (bottom - scy) / ny
    const xHit = scx + t * nx
    if (t > EPS && xHit >= left - EPS && xHit <= right + EPS) cands.push({ t, side: "bottom" })
  }
  if (ny < -EPS) {
    const t = (top - scy) / ny
    const xHit = scx + t * nx
    if (t > EPS && xHit >= left - EPS && xHit <= right + EPS) cands.push({ t, side: "top" })
  }

  if (cands.length === 0) return null
  return cands.reduce((a, b) => (a.t <= b.t ? a : b)).side
}

export function anchorToHandleStyle(x: number, y: number): CSSProperties {
  return {
    left: `${x}px`,
    top: `${y}px`,
    right: "auto",
    bottom: "auto",
    transform: "translate(-50%, -50%)",
  }
}

/**
 * Cardinal connection dots placed on the visible outline for each shape so edges meet the silhouette.
 */
export function getCanvasHandleAnchors(shape: NodeShape, w: number, h: number, strokePx: number): CanvasHandleAnchor[] {
  const sw = strokePx
  const cx = w / 2
  const cy = h / 2

  switch (shape) {
    case "rectangle":
    case "pill":
      return [
        { side: "top", position: Position.Top, x: cx, y: sw / 2 },
        { side: "right", position: Position.Right, x: w - sw / 2, y: cy },
        { side: "bottom", position: Position.Bottom, x: cx, y: h - sw / 2 },
        { side: "left", position: Position.Left, x: sw / 2, y: cy },
      ]

    case "circle": {
      const rx = Math.max(w / 2 - sw / 2, 1)
      const ry = Math.max(h / 2 - sw / 2, 1)
      return [
        { side: "top", position: Position.Top, x: cx, y: cy - ry },
        { side: "right", position: Position.Right, x: cx + rx, y: cy },
        { side: "bottom", position: Position.Bottom, x: cx, y: cy + ry },
        { side: "left", position: Position.Left, x: cx - rx, y: cy },
      ]
    }

    case "diamond":
      return [
        { side: "top", position: Position.Top, x: cx, y: sw / 2 },
        { side: "right", position: Position.Right, x: w - sw / 2, y: cy },
        { side: "bottom", position: Position.Bottom, x: cx, y: h - sw / 2 },
        { side: "left", position: Position.Left, x: sw / 2, y: cy },
      ]

    case "hexagon": {
      const pad = sw
      const iw = w - 2 * pad
      const ih = h - 2 * pad
      return [
        { side: "top", position: Position.Top, x: pad + iw / 2, y: pad },
        { side: "right", position: Position.Right, x: pad + iw, y: pad + ih / 2 },
        { side: "bottom", position: Position.Bottom, x: pad + iw / 2, y: pad + ih },
        { side: "left", position: Position.Left, x: pad, y: pad + ih / 2 },
      ]
    }

    case "cylinder":
      return [
        { side: "top", position: Position.Top, x: cx, y: h * 0.16 },
        { side: "right", position: Position.Right, x: w * 0.92, y: cy },
        { side: "bottom", position: Position.Bottom, x: cx, y: h * 0.9 },
        { side: "left", position: Position.Left, x: w * 0.08, y: cy },
      ]

    default: {
      const _exhaustive: never = shape
      return _exhaustive
    }
  }
}
