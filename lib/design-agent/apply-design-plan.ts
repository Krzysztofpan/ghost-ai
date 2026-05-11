import type { Liveblocks } from "@liveblocks/node"
import { mutateFlow } from "@liveblocks/react-flow/node"

import type { DesignAction } from "@/lib/design-agent/schema"
import {
  CANVAS_NODE_MIN_HEIGHT,
  CANVAS_NODE_MIN_WIDTH,
  DEFAULT_SHAPE_DIMENSIONS,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
} from "@/types/canvas"

function clampSize(w: number, h: number): { width: number; height: number } {
  return {
    width: Math.max(CANVAS_NODE_MIN_WIDTH, w),
    height: Math.max(CANVAS_NODE_MIN_HEIGHT, h),
  }
}

/** Applies design actions using the collaborative Liveblocks React Flow mutation API. */
export async function applyDesignActions(liveblocks: Liveblocks, roomId: string, actions: DesignAction[]): Promise<void> {
  await mutateFlow<CanvasNode, CanvasEdge>({ client: liveblocks, roomId }, (flow) => {
    for (const action of actions) {
      switch (action.op) {
        case "add_node": {
          const dims = DEFAULT_SHAPE_DIMENSIONS[action.shape]
          const width = action.width ?? dims.width
          const height = action.height ?? dims.height
          const { width: cw, height: ch } = clampSize(width, height)
          const fill = NODE_COLORS[action.paletteIndex].fill
          flow.addNode({
            id: action.id,
            type: "canvasNode",
            position: { x: action.x, y: action.y },
            width: cw,
            height: ch,
            data: {
              label: action.label,
              color: fill,
              shape: action.shape,
            },
          })
          break
        }
        case "move_node": {
          flow.updateNode(action.id, (node) => ({
            ...node,
            position: { x: action.x, y: action.y },
          }))
          break
        }
        case "resize_node": {
          const { width, height } = clampSize(action.width, action.height)
          flow.updateNode(action.id, (node) => ({
            ...node,
            width,
            height,
          }))
          break
        }
        case "update_node_data": {
          flow.updateNodeData(action.id, (data) => {
            let next = { ...data }
            if (action.label !== undefined) {
              next = { ...next, label: action.label }
            }
            if (action.paletteIndex !== undefined) {
              next = { ...next, color: NODE_COLORS[action.paletteIndex].fill }
            }
            if (action.shape !== undefined) {
              next = { ...next, shape: action.shape }
            }
            return next
          })
          break
        }
        case "delete_node": {
          const orphanEdges = flow.edges.filter((e) => e.source === action.id || e.target === action.id).map((e) => e.id)
          if (orphanEdges.length > 0) {
            flow.removeEdges(orphanEdges)
          }
          flow.removeNode(action.id)
          break
        }
        case "add_edge": {
          flow.addEdge({
            id: action.id,
            type: "canvasEdge",
            source: action.source,
            target: action.target,
            data: { label: action.label ?? "" },
          })
          break
        }
        case "delete_edge": {
          flow.removeEdge(action.id)
          break
        }
      }
    }
  })
}
