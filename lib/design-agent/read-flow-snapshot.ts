import type { Liveblocks } from "@liveblocks/node"
import { mutateFlow } from "@liveblocks/react-flow/node"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

export async function readFlowSnapshot(liveblocks: Liveblocks, roomId: string): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  let snapshot: { nodes: CanvasNode[]; edges: CanvasEdge[] } = { nodes: [], edges: [] }

  await mutateFlow<CanvasNode, CanvasEdge>({ client: liveblocks, roomId }, (flow) => {
    snapshot = flow.toJSON() as { nodes: CanvasNode[]; edges: CanvasEdge[] }
  })

  return snapshot
}
