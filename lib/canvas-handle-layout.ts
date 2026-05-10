import type { CSSProperties } from "react"

import { Position } from "@xyflow/react"

import type { NodeShape } from "@/types/canvas"

export type CardinalSide = "top" | "right" | "bottom" | "left"

export type CanvasHandleAnchor = {
  side: CardinalSide
  /** Used by React Flow for edge routing relative to the handle */
  position: Position
  /** Handle center in node-local pixels (origin top-left of the node box) */
  x: number
  y: number
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
