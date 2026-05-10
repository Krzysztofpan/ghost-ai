"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"
import { cn } from "@/lib/utils"

const LABEL_PLACEHOLDER = "Label"

/** Max label width in flow px (EdgeLabelRenderer is screen-projected; cap keeps long text readable). */
const LABEL_MAX_WIDTH_FLOW_PX = 280

/** Max height while editing (textarea scrolls inside). */
const LABEL_EDIT_MAX_HEIGHT_PX = 120

export function CanvasEdgeView(props: EdgeProps<CanvasEdge>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    markerStart,
    style,
    interactionWidth,
    selected,
    data,
  } = props

  const labelText = data?.label ?? ""
  const { updateEdgeData } = useReactFlow<CanvasNode, CanvasEdge>()

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(labelText)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isEditing) setDraft(labelText)
  }, [labelText, isEditing])

  const fitTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "0px"
    const next = Math.min(Math.max(el.scrollHeight, 28), LABEL_EDIT_MAX_HEIGHT_PX)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > LABEL_EDIT_MAX_HEIGHT_PX ? "auto" : "hidden"
  }, [])

  useLayoutEffect(() => {
    if (!isEditing) return
    fitTextareaHeight()
  }, [draft, fitTextareaHeight, isEditing])

  useEffect(() => {
    if (!isEditing) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    try {
      el.setSelectionRange(el.value.length, el.value.length)
    } catch {
      /* ignore */
    }
    fitTextareaHeight()
  }, [fitTextareaHeight, isEditing])

  const stopEditing = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraft(value)
      updateEdgeData(id, { label: value })
    },
    [id, updateEdgeData],
  )

  const beginEditing = useCallback(() => {
    setDraft(labelText)
    setIsEditing(true)
  }, [labelText])

  const handleLabelDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      beginEditing()
    },
    [beginEditing],
  )

  /** When the edge is already selected, one click opens the editor (double-click still works). */
  const handleReadOnlyClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      if (selected) beginEditing()
    },
    [beginEditing, selected],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      event.stopPropagation()
      if (event.key === "Escape") {
        event.preventDefault()
        stopEditing()
      }
    },
    [stopEditing],
  )

  const labelSurfaceClass =
    "rounded-md border border-surface-border bg-elevated/95 px-2 py-1 text-xs text-copy-primary shadow-md"

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={interactionWidth}
      />
      <EdgeLabelRenderer>
        <div
          className={cn(
            "nodrag nopan pointer-events-auto absolute max-w-[min(280px,calc(100vw-48px))]",
            (selected || isEditing) && "z-30",
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            maxWidth: LABEL_MAX_WIDTH_FLOW_PX,
          }}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              placeholder={LABEL_PLACEHOLDER}
              spellCheck={false}
              rows={1}
              className={cn(
                "nodrag nopan nowheel box-border w-full min-h-[28px] min-w-[120px] resize-none bg-transparent text-center outline-none",
                "wrap-break-word whitespace-pre-wrap",
                "focus-visible:ring-2 focus-visible:ring-brand/60",
                labelSurfaceClass,
              )}
              onChange={(e) => handleDraftChange(e.target.value)}
              onBlur={stopEditing}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : labelText.trim() ? (
            <button
              type='button'
              title={selected ? "Click or double-click to edit label" : "Select edge, then click or double-click to edit"}
              className={cn(
                "nodrag nopan block w-full cursor-text text-left transition-colors",
                "line-clamp-3 wrap-break-word whitespace-normal",
                labelSurfaceClass,
                selected ? "ring-1 ring-brand/35" : "hover:bg-elevated",
              )}
              onClick={handleReadOnlyClick}
              onDoubleClick={handleLabelDoubleClick}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {labelText}
            </button>
          ) : (
            <button
              type='button'
              title={selected ? "Click or double-click to add label" : "Select edge, then click or double-click"}
              aria-label='Add edge label'
              className={cn(
                "nodrag nopan h-7 min-w-16 rounded-md transition-colors",
                selected ? "bg-elevated/25 ring-1 ring-brand/35" : "hover:bg-elevated/35",
              )}
              onClick={handleReadOnlyClick}
              onDoubleClick={handleLabelDoubleClick}
              onPointerDown={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
