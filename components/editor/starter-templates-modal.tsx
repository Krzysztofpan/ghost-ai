"use client"

import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { CANVAS_TEMPLATES } from "@/components/editor/starter-templates"
import { CanvasShapeSurface } from "@/components/editor/canvas-shape-surface"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { DEFAULT_SHAPE_DIMENSIONS, type CanvasEdge, type CanvasNode } from "@/types/canvas"

const PREVIEW_WIDTH = 280
const PREVIEW_HEIGHT = 140
const PREVIEW_PAD_FLOW = 36

function nodeBox(node: CanvasNode): { x: number; y: number; width: number; height: number } {
  const width = node.width ?? DEFAULT_SHAPE_DIMENSIONS[node.data.shape].width
  const height = node.height ?? DEFAULT_SHAPE_DIMENSIONS[node.data.shape].height
  return { x: node.position.x, y: node.position.y, width, height }
}

function nodeCenter(node: CanvasNode): { cx: number; cy: number } {
  const box = nodeBox(node)
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 }
}

function diagramBounds(nodes: CanvasNode[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const b = nodeBox(n)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: PREVIEW_WIDTH, maxY: PREVIEW_HEIGHT }
  }
  return { minX, minY, maxX, maxY }
}

function TemplateDiagramPreview({ nodes, edges }: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  const { minX, minY, maxX, maxY } = diagramBounds(nodes)
  const bw = maxX - minX + 2 * PREVIEW_PAD_FLOW
  const bh = maxY - minY + 2 * PREVIEW_PAD_FLOW
  const scale = Math.min(PREVIEW_WIDTH / bw, PREVIEW_HEIGHT / bh)
  const marginX = (PREVIEW_WIDTH - bw * scale) / 2
  const marginY = (PREVIEW_HEIGHT - bh * scale) / 2

  const mapX = (fx: number) => marginX + (fx - minX + PREVIEW_PAD_FLOW) * scale
  const mapY = (fy: number) => marginY + (fy - minY + PREVIEW_PAD_FLOW) * scale

  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const strokeLine = "rgba(148, 163, 184, 0.55)"

  return (
    <div
      className='relative mx-auto overflow-hidden rounded-xl border border-surface-border bg-base/60'
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
      aria-hidden
    >
      <svg width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} className='absolute inset-0'>
        {edges.map((edge) => {
          const from = nodeById.get(edge.source)
          const to = nodeById.get(edge.target)
          if (!from || !to) return null
          const a = nodeCenter(from)
          const b = nodeCenter(to)
          return (
            <line
              key={edge.id}
              x1={mapX(a.cx)}
              y1={mapY(a.cy)}
              x2={mapX(b.cx)}
              y2={mapY(b.cy)}
              stroke={strokeLine}
              strokeWidth={1.75}
            />
          )
        })}
      </svg>
      {nodes.map((node) => {
        const box = nodeBox(node)
        const w = box.width * scale
        const h = box.height * scale
        return (
          <div
            key={node.id}
            className='pointer-events-none absolute'
            style={{
              left: mapX(box.x),
              top: mapY(box.y),
              width: w,
              height: h,
            }}
          >
            <CanvasShapeSurface
              shape={node.data.shape}
              width={w}
              height={h}
              fill={node.data.color}
              stroke='var(--border-default)'
              strokeWidth={1}
            />
          </div>
        )
      })}
    </div>
  )
}

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

export function StarterTemplatesModal({ open, onOpenChange, onImport }: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "max-h-[min(640px,90vh)] gap-0 rounded-3xl border border-surface-border bg-elevated p-6 text-copy-primary shadow-2xl sm:max-w-4xl",
        )}
      >
        <DialogHeader className='gap-1 pb-4'>
          <DialogTitle className='text-xl font-semibold text-copy-primary'>Starter templates</DialogTitle>
          <DialogDescription className='text-copy-secondary'>
            Replace the current canvas with a predefined diagram. Your existing nodes and edges will be cleared.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='max-h-[min(440px,calc(90vh-11rem))] pr-3'>
          <div className='grid gap-4 pb-2 md:grid-cols-2'>
            {CANVAS_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className='flex flex-col border-surface-border bg-surface/40 text-copy-primary shadow-none'
              >
                <CardHeader className='gap-2 pb-3'>
                  <CardTitle className='text-base font-semibold text-white'>{template.name}</CardTitle>
                  <CardDescription className='text-copy-secondary'>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className='flex flex-1 flex-col pb-4'>
                  <TemplateDiagramPreview nodes={template.nodes} edges={template.edges} />
                </CardContent>
                <CardFooter className='mt-auto border-t border-surface-border pt-4'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='w-full border-brand/35 text-copy-primary hover:bg-accent-dim hover:text-brand'
                    onClick={() => {
                      onImport(template)
                      onOpenChange(false)
                    }}
                  >
                    Import template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
