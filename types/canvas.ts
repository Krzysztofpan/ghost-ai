import type { Edge, Node } from "@xyflow/react"

/**
 * Eight node fill / label color pairs for the canvas (see context/ui-context.md).
 */
export const NODE_COLORS = [
  { fill: "#1F1F1F", text: "#EDEDED", label: "Neutral" },
  { fill: "#10233D", text: "#52A8FF", label: "Blue" },
  { fill: "#2E1938", text: "#BF7AF0", label: "Purple" },
  { fill: "#331B00", text: "#FF990A", label: "Orange" },
  { fill: "#3C1618", text: "#FF6166", label: "Red" },
  { fill: "#3A1726", text: "#F75F8F", label: "Pink" },
  { fill: "#0F2E18", text: "#62C073", label: "Green" },
  { fill: "#062822", text: "#0AC7B4", label: "Teal" },
] as const

export type NodeColorPair = (typeof NODE_COLORS)[number]

export const DEFAULT_NODE_COLOR_PAIR = NODE_COLORS[0]

export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

export type NodeShape = (typeof NODE_SHAPES)[number]

/** MIME type for HTML drag payloads from the shape toolbar (`ShapeDragPayload` JSON). */
export const CANVAS_SHAPE_DRAG_MIME = "application/x-ghost-canvas-shape"

export type ShapeDragPayload = {
  shape: NodeShape
  width: number
  height: number
}

/**
 * Default node dimensions when dropping a shape (flow coordinates).
 * Rectangles are wider than tall; circles square; diamonds slightly larger for labels.
 */
export const DEFAULT_SHAPE_DIMENSIONS: Record<NodeShape, { width: number; height: number }> = {
  rectangle: { width: 168, height: 96 },
  diamond: { width: 152, height: 152 },
  circle: { width: 112, height: 112 },
  pill: { width: 200, height: 64 },
  cylinder: { width: 128, height: 104 },
  hexagon: { width: 144, height: 124 },
}

/** Minimum node size enforced while resizing (flow coordinates). */
export const CANVAS_NODE_MIN_WIDTH = 80
export const CANVAS_NODE_MIN_HEIGHT = 52

export type CanvasNodeData = {
  label: string
  /** Node fill color (hex), typically one of `NODE_COLORS` fills */
  color: string
  shape: NodeShape
}

export type CanvasEdgeData = {
  /** Text shown on the connection between nodes */
  label?: string
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">
export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">
