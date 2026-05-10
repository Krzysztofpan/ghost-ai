"use client"

import { useMemo } from "react"

import { Handle, type NodeProps } from "@xyflow/react"

import { CanvasShapeSurface } from "@/components/editor/canvas-shape-surface"
import { anchorToHandleStyle, getCanvasHandleAnchors } from "@/lib/canvas-handle-layout"
import { DEFAULT_NODE_COLOR_PAIR, DEFAULT_SHAPE_DIMENSIONS, NODE_COLORS, type CanvasNode } from "@/types/canvas"
import { cn } from "@/lib/utils"

function textColorForFill(fill: string): string {
  const pair = NODE_COLORS.find((c) => c.fill === fill)
  return pair?.text ?? DEFAULT_NODE_COLOR_PAIR.text
}

export function CanvasNodeView({ data, selected, width, height }: NodeProps<CanvasNode>) {
  const labelColor = textColorForFill(data.color)
  const defaults = DEFAULT_SHAPE_DIMENSIONS[data.shape]
  const w = width ?? defaults.width
  const h = height ?? defaults.height
  const borderColor = selected ? "var(--accent-primary)" : "var(--border-default)"
  const borderW = selected ? 2.5 : 2

  const handleClass =
    "h-2.5! w-2.5! border-2! border-bg-base! bg-copy-primary! opacity-0 transition-opacity group-hover/node:opacity-100"

  const anchors = useMemo(() => getCanvasHandleAnchors(data.shape, w, h, borderW), [data.shape, w, h, borderW])

  return (
    <div
      className={cn(
        "group/node relative shadow-sm",
        selected && "drop-shadow-[0_0_10px_rgba(0,200,212,0.25)]",
      )}
      style={{ width: w, height: h }}
    >
      <CanvasShapeSurface
        shape={data.shape}
        width={w}
        height={h}
        fill={data.color}
        stroke={borderColor}
        strokeWidth={borderW}
        className='pointer-events-none'
      />
      {anchors.flatMap((a) => {
        const style = anchorToHandleStyle(a.x, a.y)
        return [
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
      })}
      <span
        className='pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center text-sm leading-tight select-none'
        style={{ color: labelColor }}
      >
        {data.label}
      </span>
    </div>
  )
}
