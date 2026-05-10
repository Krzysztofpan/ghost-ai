"use client"

import { useEffect, useRef } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

/** Duration (ms) for React Flow zoom / fit transitions — shared with canvas toolbar buttons. */
export const CANVAS_ZOOM_ANIMATION_MS = 280

function isEditableFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA") return true
  if (target.isContentEditable) return true
  if (target.closest("[contenteditable='true']")) return true
  return false
}

export function useKeyboardShortcuts(
  reactFlowRef: React.RefObject<ReactFlowInstance<CanvasNode, CanvasEdge> | null>,
  onUndo: () => void,
  onRedo: () => void,
): void {
  const undoRef = useRef(onUndo)
  const redoRef = useRef(onRedo)
  undoRef.current = onUndo
  redoRef.current = onRedo

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableFieldTarget(event.target)) return

      const rf = reactFlowRef.current
      const mod = event.metaKey || event.ctrlKey

      if (!mod && (event.key === "+" || event.key === "=")) {
        event.preventDefault()
        rf?.zoomIn({ duration: CANVAS_ZOOM_ANIMATION_MS })
        return
      }
      if (!mod && event.key === "-") {
        event.preventDefault()
        rf?.zoomOut({ duration: CANVAS_ZOOM_ANIMATION_MS })
        return
      }

      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault()
        undoRef.current()
        return
      }
      if (mod && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault()
        redoRef.current()
        return
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault()
        redoRef.current()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [reactFlowRef])
}
