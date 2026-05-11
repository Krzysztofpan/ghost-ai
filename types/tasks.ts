import { z } from "zod"

/** Liveblocks room feed id for shared AI activity (design, spec, etc.). */
export const AI_STATUS_FEED_ID = "ai-status-feed"

/** Liveblocks room feed id for collaborative sidebar chat (human messages only in this phase). */
export const AI_CHAT_FEED_ID = "ai-chat"

export const aiChatFeedPayloadSchema = z.object({
  sender: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(),
})

export type AiChatFeedPayload = z.infer<typeof aiChatFeedPayloadSchema>

export function parseAiChatFeedPayload(data: unknown): AiChatFeedPayload | null {
  const result = aiChatFeedPayloadSchema.safeParse(data)
  return result.success ? result.data : null
}

const aiStatusPhaseSchema = z.enum(["start", "processing", "complete", "error"])

export const aiStatusFeedPayloadSchema = z.object({
  phase: aiStatusPhaseSchema,
  at: z.number(),
  /** Primary human-readable status line; optional when only phase matters. */
  text: z.string().optional(),
  /** Legacy field from older server messages; treated like `text` when present. */
  message: z.string().optional(),
  /** Distinguishes agent kinds for future spec vs design flows. */
  kind: z.enum(["design", "spec"]).optional(),
})

export type AiStatusFeedPayload = {
  phase: z.infer<typeof aiStatusPhaseSchema>
  at: number
  text?: string
  kind?: "design" | "spec"
}

export function parseAiStatusFeedPayload(data: unknown): AiStatusFeedPayload | null {
  const result = aiStatusFeedPayloadSchema.safeParse(data)
  if (!result.success) return null
  const d = result.data
  const text = d.text ?? d.message
  return {
    phase: d.phase,
    at: d.at,
    ...(text !== undefined && text !== "" ? { text } : {}),
    ...(d.kind !== undefined ? { kind: d.kind } : {}),
  }
}

export function isAiGenerationPhaseActive(phase: AiStatusFeedPayload["phase"]): boolean {
  return phase === "start" || phase === "processing"
}
