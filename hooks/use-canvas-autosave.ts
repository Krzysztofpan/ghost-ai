"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

export type CanvasAutosaveStatus = "idle" | "saving" | "saved" | "error"

const DEFAULT_DEBOUNCE_MS = 1500

export function useCanvasAutosave(
  projectId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  options?: {
    debounceMs?: number
    onStatusChange?: (status: CanvasAutosaveStatus) => void
  },
) {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const onStatusChange = options?.onStatusChange

  const [status, setStatus] = useState<CanvasAutosaveStatus>("idle")
  const setStatusBoth = useCallback(
    (next: CanvasAutosaveStatus) => {
      setStatus(next)
      onStatusChange?.(next)
    },
    [onStatusChange],
  )

  const lastSavedPayloadRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  const persist = useCallback(
    async (opts?: { force?: boolean }) => {
      const currentNodes = nodesRef.current
      const currentEdges = edgesRef.current
      const payload = JSON.stringify({ nodes: currentNodes, edges: currentEdges })

      if (
        !opts?.force &&
        currentNodes.length === 0 &&
        currentEdges.length === 0 &&
        lastSavedPayloadRef.current === null
      ) {
        return
      }

      if (payload === lastSavedPayloadRef.current && !opts?.force) {
        setStatusBoth("saved")
        return
      }

      setStatusBoth("saving")
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payload,
        })
        if (!res.ok) {
          throw new Error(`canvas save failed: ${res.status}`)
        }
        lastSavedPayloadRef.current = payload
        setStatusBoth("saved")
      } catch {
        setStatusBoth("error")
      }
    },
    [projectId, setStatusBoth],
  )

  useEffect(() => {
    const payload = JSON.stringify({ nodes, edges })
    if (payload === lastSavedPayloadRef.current) {
      return
    }

    if (nodes.length === 0 && edges.length === 0 && lastSavedPayloadRef.current === null) {
      return
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void persist()
    }, debounceMs)

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [nodes, edges, debounceMs, persist])

  const flushSave = useCallback(async () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await persist({ force: true })
  }, [persist])

  return { status, flushSave }
}
