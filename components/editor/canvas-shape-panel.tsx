"use client"

import type { DragEvent } from "react"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
} from "lucide-react"

import {
  CANVAS_SHAPE_DRAG_MIME,
  DEFAULT_SHAPE_DIMENSIONS,
  NODE_SHAPES,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"
import { cn } from "@/lib/utils"

const SHAPE_ICONS: Record<NodeShape, typeof RectangleHorizontal> = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
}

function payloadForShape(shape: NodeShape): ShapeDragPayload {
  const { width, height } = DEFAULT_SHAPE_DIMENSIONS[shape]
  return { shape, width, height }
}

export function CanvasShapePanel({ className }: { className?: string }) {
  function handleDragStart(shape: NodeShape, event: DragEvent<HTMLButtonElement>) {
    const payload = payloadForShape(shape)
    event.dataTransfer.setData(CANVAS_SHAPE_DRAG_MIME, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div
      className={cn(
        "nopan nodrag pointer-events-auto flex items-center gap-0.5 rounded-full border border-surface-border bg-elevated/95 px-2 py-2 shadow-lg backdrop-blur-sm",
        className,
      )}
    >
      {NODE_SHAPES.map((shape) => {
        const Icon = SHAPE_ICONS[shape]
        const label = shape.charAt(0).toUpperCase() + shape.slice(1)
        return (
          <button
            key={shape}
            type='button'
            draggable
            title={`Add ${label}`}
            aria-label={`Drag ${label} onto the canvas`}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-copy-secondary transition-colors",
              "hover:bg-accent-dim hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
            )}
            onDragStart={(e) => handleDragStart(shape, e)}
          >
            <Icon className='h-5 w-5' aria-hidden strokeWidth={1.75} />
          </button>
        )
      })}
    </div>
  )
}
