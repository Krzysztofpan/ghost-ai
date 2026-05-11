import { tasks } from "@trigger.dev/sdk/v3"

import {
  badRequestResponse,
  forbiddenResponse,
  internalServerErrorResponse,
  unauthorizedResponse,
  unprocessableEntityResponse,
} from "@/lib/http-responses"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { specGenerationRequestSchema } from "@/lib/spec-agent/schema"
import type { generateSpecTask } from "@/src/trigger/generate-spec"

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return unauthorizedResponse()
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return badRequestResponse("Invalid JSON body")
  }

  const parsed = specGenerationRequestSchema.safeParse(json)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const detail =
      [...flat.formErrors, ...Object.values(flat.fieldErrors).flat()].join("; ") ||
      parsed.error.message
    return unprocessableEntityResponse(detail)
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data

  const access = await getProjectAccess(roomId, identity)
  if (!access.hasAccess) {
    return forbiddenResponse()
  }

  const projectId = roomId

  let handle: { id: string }
  try {
    handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
      projectId,
      roomId,
      chatHistory,
      nodes,
      edges,
    })
  } catch (error) {
    console.error("[POST /api/ai/spec] trigger failed", error)
    return internalServerErrorResponse("Failed to start spec generation task")
  }

  try {
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId,
        userId: identity.userId,
      },
    })
  } catch (error) {
    console.error("[POST /api/ai/spec] task run persist failed", error)
    return internalServerErrorResponse("Failed to record task run")
  }

  return Response.json({ runId: handle.id })
}
