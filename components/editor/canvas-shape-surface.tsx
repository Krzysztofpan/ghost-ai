"use client"

import type { CSSProperties, MouseEvent } from "react"

import type { NodeShape } from "@/types/canvas"
import { cn } from "@/lib/utils"

type SurfaceProps = {
  shape: NodeShape
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  className?: string
}

const RECT_RADIUS_PX = 12

function cssShapeBox(
  className: string | undefined,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  borderRadius: number | string,
) {
  return (
    <div
      className={cn("box-border shrink-0 select-none", className)}
      style={{
        width: w,
        height: h,
        backgroundColor: fill,
        borderWidth: strokeWidth,
        borderStyle: "solid",
        borderColor: stroke,
        borderRadius,
      }}
      aria-hidden
    />
  )
}

/** Flat-top hexagon corners in unit space [0,1]×[0,1], scaled to width/height. */
function hexagonPointsFlatTop(w: number, h: number): string {
  const pts: [number, number][] = [
    [w * 0.25, 0],
    [w * 0.75, 0],
    [w, h * 0.5],
    [w * 0.75, h],
    [w * 0.25, h],
    [0, h * 0.5],
  ]
  return pts.map(([px, py]) => `${px},${py}`).join(" ")
}

function cylinderPathD(w: number, h: number): string {
  const x0 = w * 0.08
  const x1 = w * 0.92
  const yt = h * 0.22
  const yb = h * 0.78
  return [
    `M ${x0} ${yt}`,
    `Q ${w * 0.5} ${h * 0.06} ${x1} ${yt}`,
    `L ${x1} ${yb}`,
    `Q ${w * 0.5} ${h * 0.94} ${x0} ${yb}`,
    "Z",
  ].join(" ")
}

/**
 * Renders the filled shape for a canvas node (fills the given width × height box).
 */
export function CanvasShapeSurface({ shape, width: w, height: h, fill, stroke, strokeWidth, className }: SurfaceProps) {
  const strokeOpts = { stroke, strokeWidth, vectorEffect: "non-scaling-stroke" as const }
  const common = cn("block select-none", className)

  switch (shape) {
    case "rectangle":
      return cssShapeBox(common, w, h, fill, stroke, strokeWidth, RECT_RADIUS_PX)

    case "circle":
      return cssShapeBox(common, w, h, fill, stroke, strokeWidth, "50%")

    case "pill": {
      const r = Math.min(w / 2, h / 2)
      return cssShapeBox(common, w, h, fill, stroke, strokeWidth, Math.max(r, 0))
    }

    case "diamond": {
      const pad = strokeWidth / 2
      const midX = w / 2
      const midY = h / 2
      const points = `${midX},${pad} ${w - pad},${midY} ${midX},${h - pad} ${pad},${midY}`
      return (
        <svg width={w} height={h} className={common} aria-hidden>
          <polygon points={points} fill={fill} {...strokeOpts} />
        </svg>
      )
    }

    case "hexagon": {
      const pad = strokeWidth
      const iw = w - pad * 2
      const ih = h - pad * 2
      const points = hexagonPointsFlatTop(iw, ih)
        .split(" ")
        .map((pair) => {
          const [px, py] = pair.split(",").map(Number)
          return `${px + pad},${py + pad}`
        })
        .join(" ")
      return (
        <svg width={w} height={h} className={common} aria-hidden>
          <polygon points={points} fill={fill} {...strokeOpts} />
        </svg>
      )
    }

    case "cylinder":
      return (
        <svg width={w} height={h} className={common} aria-hidden>
          <path d={cylinderPathD(w, h)} fill={fill} {...strokeOpts} />
          <ellipse
            cx={w / 2}
            cy={h * 0.22}
            rx={w * 0.42}
            ry={h * 0.06}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect='non-scaling-stroke'
          />
        </svg>
      )

    default: {
      const _exhaustive: never = shape
      return _exhaustive
    }
  }
}

export type MiniMapShapeRenderArgs = {
  shape: NodeShape
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  shapeRendering: string
  onClick?: (event: MouseEvent, id: string) => void
  id: string
}

/** SVG fragments for React Flow MiniMap (flow-space coordinates). */
export function MiniMapShapeSvg({
  shape,
  x,
  y,
  width: w,
  height: h,
  fill,
  stroke,
  strokeWidth,
  shapeRendering,
  onClick,
  id,
}: MiniMapShapeRenderArgs) {
  const sw = Math.max(strokeWidth, 0.5)
  const strokeOpts: CSSProperties = { stroke, strokeWidth: sw, shapeRendering: shapeRendering as "auto" }

  const handleClick = onClick ? (e: MouseEvent) => onClick(e, id) : undefined

  switch (shape) {
    case "rectangle":
      return (
        <rect
          className='react-flow__minimap-node'
          x={x + sw / 2}
          y={y + sw / 2}
          width={Math.max(w - sw, 0)}
          height={Math.max(h - sw, 0)}
          rx={Math.min(10, w * 0.08, h * 0.15)}
          ry={Math.min(10, w * 0.08, h * 0.15)}
          fill={fill}
          style={strokeOpts}
          onClick={handleClick}
        />
      )

    case "circle":
      return (
        <ellipse
          className='react-flow__minimap-node'
          cx={x + w / 2}
          cy={y + h / 2}
          rx={Math.max(w / 2 - sw / 2, 0)}
          ry={Math.max(h / 2 - sw / 2, 0)}
          fill={fill}
          style={strokeOpts}
          onClick={handleClick}
        />
      )

    case "pill": {
      const r = Math.min(h / 2 - sw / 2, w / 2 - sw / 2)
      return (
        <rect
          className='react-flow__minimap-node'
          x={x + sw / 2}
          y={y + sw / 2}
          width={Math.max(w - sw, 0)}
          height={Math.max(h - sw, 0)}
          rx={Math.max(r, 0)}
          ry={Math.max(r, 0)}
          fill={fill}
          style={strokeOpts}
          onClick={handleClick}
        />
      )
    }

    case "diamond": {
      const midX = x + w / 2
      const midY = y + h / 2
      const pad = sw / 2
      const points = `${midX},${y + pad} ${x + w - pad},${midY} ${midX},${y + h - pad} ${x + pad},${midY}`
      return (
        <polygon className='react-flow__minimap-node' points={points} fill={fill} style={strokeOpts} onClick={handleClick} />
      )
    }

    case "hexagon": {
      const pad = sw
      const ix = x + pad
      const iy = y + pad
      const iw = w - pad * 2
      const ih = h - pad * 2
      const points = hexagonPointsFlatTop(iw, ih)
        .split(" ")
        .map((pair) => {
          const [px, py] = pair.split(",").map(Number)
          return `${ix + px},${iy + py}`
        })
        .join(" ")
      return (
        <polygon className='react-flow__minimap-node' points={points} fill={fill} style={strokeOpts} onClick={handleClick} />
      )
    }

    case "cylinder":
      return (
        <g className='react-flow__minimap-node' onClick={handleClick}>
          <path d={cylinderPathD(w, h)} transform={`translate(${x},${y})`} fill={fill} style={strokeOpts} />
          <ellipse
            cx={x + w / 2}
            cy={y + h * 0.22}
            rx={w * 0.42}
            ry={h * 0.06}
            fill={fill}
            style={strokeOpts}
          />
        </g>
      )

    default:
      return (
        <rect
          className='react-flow__minimap-node'
          x={x}
          y={y}
          width={w}
          height={h}
          rx={5}
          ry={5}
          fill={fill}
          style={strokeOpts}
          onClick={handleClick}
        />
      )
  }
}
