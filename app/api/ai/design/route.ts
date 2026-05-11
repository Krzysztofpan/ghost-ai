import { tasks } from "@trigger.dev/sdk/v3"

import {
  badRequestResponse,
  forbiddenResponse,
  internalServerErrorResponse,
  unauthorizedResponse,
} from "@/lib/http-responses"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import type { designAgentTask } from "@/src/trigger/design-agent"

interface DesignRequestBody {
  prompt?: unknown
  roomId?: unknown
  projectId?: unknown
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return unauthorizedResponse()
  }

  let body: DesignRequestBody
  try {
    body = (await request.json()) as DesignRequestBody
  } catch {
    return badRequestResponse("Invalid JSON body")
  }

  if (!isNonEmptyString(body.prompt) || !isNonEmptyString(body.roomId) || !isNonEmptyString(body.projectId)) {
    return badRequestResponse("prompt, roomId, and projectId are required")
  }

  if (body.roomId !== body.projectId) {
    return badRequestResponse("roomId must match projectId")
  }

  const access = await getProjectAccess(body.projectId, identity)
  if (!access.hasAccess) {
    return forbiddenResponse()
  }

  let handle: { id: string }
  try {
    handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
      prompt: body.prompt.trim(),
      roomId: body.roomId,
    })
  } catch (error) {
    console.error("[POST /api/ai/design] trigger failed", error)
    return internalServerErrorResponse("Failed to start design task")
  }

  try {
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: body.projectId,
        userId: identity.userId,
      },
    })
  } catch (error) {
    console.error("[POST /api/ai/design] task run persist failed", error)
    return internalServerErrorResponse("Failed to record task run")
  }

  return Response.json({ runId: handle.id })
}
