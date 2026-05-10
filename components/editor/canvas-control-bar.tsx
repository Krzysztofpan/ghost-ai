"use client"

import { Expand, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CanvasControlBar({
  className,
  onZoomOut,
  onFitView,
  onZoomIn,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  className?: string
  onZoomOut: () => void
  onFitView: () => void
  onZoomIn: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}) {
  return (
    <div
      className={cn(
        "nopan nodrag pointer-events-auto flex items-center gap-2 rounded-full border border-surface-border bg-elevated/95 px-2 py-2 shadow-lg backdrop-blur-sm",
        className,
      )}
      role='toolbar'
      aria-label='Canvas zoom and history'
    >
      <div className='flex items-center gap-0.5'>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          className='text-copy-secondary hover:bg-accent-dim hover:text-brand'
          aria-label='Zoom out'
          onClick={onZoomOut}
        >
          <ZoomOut className='size-4' aria-hidden strokeWidth={1.75} />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          className='text-copy-secondary hover:bg-accent-dim hover:text-brand'
          aria-label='Fit view'
          onClick={onFitView}
        >
          <Expand className='size-4' aria-hidden strokeWidth={1.75} />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          className='text-copy-secondary hover:bg-accent-dim hover:text-brand'
          aria-label='Zoom in'
          onClick={onZoomIn}
        >
          <ZoomIn className='size-4' aria-hidden strokeWidth={1.75} />
        </Button>
      </div>
      <div className='h-6 w-px shrink-0 bg-surface-border' aria-hidden />
      <div className='flex items-center gap-0.5'>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          disabled={!canUndo}
          className='text-copy-secondary hover:bg-accent-dim hover:text-brand disabled:text-copy-muted disabled:hover:bg-transparent disabled:hover:text-copy-muted'
          aria-label='Undo'
          onClick={onUndo}
        >
          <Undo2 className='size-4' aria-hidden strokeWidth={1.75} />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          disabled={!canRedo}
          className='text-copy-secondary hover:bg-accent-dim hover:text-brand disabled:text-copy-muted disabled:hover:bg-transparent disabled:hover:text-copy-muted'
          aria-label='Redo'
          onClick={onRedo}
        >
          <Redo2 className='size-4' aria-hidden strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  )
}
