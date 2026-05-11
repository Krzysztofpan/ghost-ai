import { LiveblocksError, type Liveblocks } from "@liveblocks/node"
import { logger, metadata, task } from "@trigger.dev/sdk/v3"

import { applyDesignActions } from "@/lib/design-agent/apply-design-plan"
import { DESIGN_AGENT_FEED_ID, DESIGN_AGENT_USER_ID } from "@/lib/design-agent/constants"
import { generateDesignPlan } from "@/lib/design-agent/generate-design-plan"
import { readFlowSnapshot } from "@/lib/design-agent/read-flow-snapshot"
import type { DesignAction } from "@/lib/design-agent/schema"
import { validateActionsAgainstSnapshot } from "@/lib/design-agent/validate-actions"
import { getLiveblocks } from "@/lib/liveblocks"

function cursorFromActions(actions: DesignAction[]): { x: number; y: number } {
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i]
    if (action.op === "add_node") {
      return { x: action.x + 48, y: action.y + 28 }
    }
    if (action.op === "move_node") {
      return { x: action.x + 48, y: action.y + 28 }
    }
  }
  return { x: 420, y: 280 }
}

async function ensureDesignFeed(liveblocks: Liveblocks, roomId: string): Promise<void> {
  try {
    await liveblocks.createFeed({ roomId, feedId: DESIGN_AGENT_FEED_ID })
  } catch (error) {
    if (error instanceof LiveblocksError && (error.status === 409 || error.status === 400)) {
      return
    }
    throw error
  }
}

async function postFeedMessage(
  liveblocks: Liveblocks,
  roomId: string,
  data: { phase: "start" | "processing" | "complete" | "error"; text: string },
): Promise<void> {
  await liveblocks.createFeedMessage({
    roomId,
    feedId: DESIGN_AGENT_FEED_ID,
    data: {
      phase: data.phase,
      text: data.text,
      kind: "design" as const,
      at: Date.now(),
    },
  })
}

async function setAgentPresence(
  liveblocks: Liveblocks,
  roomId: string,
  cursor: { x: number; y: number } | null,
  thinking: boolean,
  ttlSeconds?: number,
): Promise<void> {
  await liveblocks.setPresence(roomId, {
    userId: DESIGN_AGENT_USER_ID,
    data: {
      cursor,
      thinking,
    },
    userInfo: {
      name: "Ghost AI",
      avatar: "",
      color: "#6457f9",
    },
    ttl: ttlSeconds ?? 600,
  })
}

export const designAgentTask = task({
  id: "design-agent",
  maxDuration: 300,
  run: async (payload: { prompt: string; roomId: string }) => {
    const liveblocks = getLiveblocks()

    await ensureDesignFeed(liveblocks, payload.roomId)
    await postFeedMessage(liveblocks, payload.roomId, { phase: "start", text: "Starting Ghost AI design agent…" })
    metadata.set("phase", "start")

    await setAgentPresence(liveblocks, payload.roomId, { x: 400, y: 260 }, true)

    try {
      const snapshot = await readFlowSnapshot(liveblocks, payload.roomId)
      const canvasJson = JSON.stringify(snapshot)

      await postFeedMessage(liveblocks, payload.roomId, { phase: "processing", text: "Interpreting your prompt and current diagram…" })
      metadata.set("phase", "processing")

      const plan = await generateDesignPlan(payload.prompt, canvasJson)

      await postFeedMessage(liveblocks, payload.roomId, {
        phase: "processing",
        text: plan.summary ? `Plan: ${plan.summary}` : "Applying updates to the canvas…",
      })

      const existingIds = new Set(snapshot.nodes.map((n) => n.id))
      const safeActions = validateActionsAgainstSnapshot(plan.actions, existingIds)

      await applyDesignActions(liveblocks, payload.roomId, safeActions)

      const cursor = cursorFromActions(safeActions)
      await setAgentPresence(liveblocks, payload.roomId, cursor, true)

      await postFeedMessage(liveblocks, payload.roomId, { phase: "complete", text: "Design update applied to the canvas." })
      metadata.set("phase", "complete")

      await setAgentPresence(liveblocks, payload.roomId, null, false, 12)

      return { ok: true as const, summary: plan.summary }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Design agent failed"
      logger.error("design-agent failed", { message, error })

      try {
        await postFeedMessage(liveblocks, payload.roomId, { phase: "error", text: message })
        metadata.set("phase", "error")
        await setAgentPresence(liveblocks, payload.roomId, null, false, 12)
      } catch (secondary) {
        logger.error("design-agent cleanup failed", { error: secondary })
      }

      throw error
    }
  },
})
