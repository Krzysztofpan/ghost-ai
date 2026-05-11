import { z } from "zod"

import { aiChatFeedPayloadSchema } from "@/types/tasks"

/** Loose JSON object for serialized React Flow nodes/edges from the client. */
const flowJsonRecord = z.record(z.string(), z.unknown())

const specContextSchema = z.object({
  roomId: z.string().trim().min(1),
  chatHistory: z.array(aiChatFeedPayloadSchema).max(2000),
  nodes: z.array(flowJsonRecord).max(5000),
  edges: z.array(flowJsonRecord).max(5000),
})

/** Body for `POST /api/ai/spec` — project id is resolved server-side from `roomId`. */
export const specGenerationRequestSchema = specContextSchema

export type SpecGenerationRequest = z.infer<typeof specGenerationRequestSchema>

export const generateSpecPayloadSchema = specContextSchema
  .extend({
    projectId: z.string().trim().min(1),
  })
  .refine((data) => data.projectId === data.roomId, {
    message: "projectId must match roomId",
    path: ["projectId"],
  })

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>
