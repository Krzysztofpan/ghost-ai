"use client"

import { memo, useCallback } from "react"
import { useStore } from "@xyflow/react"
import type { MiniMapNodeProps } from "@xyflow/react"

import { MiniMapShapeSvg } from "@/components/editor/canvas-shape-surface"
import type { CanvasNode, NodeShape } from "@/types/canvas"

function CanvasMiniMapNodeImpl(props: MiniMapNodeProps) {
  const { id, x, y, width, height, color, strokeColor, strokeWidth = 2, shapeRendering, selected, onClick } = props

  const shape = useStore(
    useCallback((state) => {
      const internal = state.nodeLookup.get(id)
      const user = internal?.internals.userNode as CanvasNode | undefined
      return (user?.data?.shape ?? "rectangle") as NodeShape
    }, [id]),
  )

  const fill = color ?? "#1F1F1F"
  const stroke = selected ? "var(--accent-primary)" : (strokeColor ?? "var(--border-subtle)")
  const sw = selected ? Math.max(strokeWidth, 2.5) : Math.min(strokeWidth, 1.5)

  return (
    <g>
      <MiniMapShapeSvg
        id={id}
        shape={shape}
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        shapeRendering={shapeRendering}
        onClick={onClick}
      />
    </g>
  )
}

export const CanvasMiniMapNode = memo(CanvasMiniMapNodeImpl)
