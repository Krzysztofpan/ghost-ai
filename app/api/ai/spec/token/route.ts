import { auth } from "@trigger.dev/sdk/v3"

import {
  badRequestResponse,
  forbiddenResponse,
  internalServerErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "@/lib/http-responses"
import { getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

interface TokenRequestBody {
  runId?: unknown
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return unauthorizedResponse()
  }

  let body: TokenRequestBody
  try {
    body = (await request.json()) as TokenRequestBody
  } catch {
    return badRequestResponse("Invalid JSON body")
  }

  if (!isNonEmptyString(body.runId)) {
    return badRequestResponse("runId is required")
  }

  const runId = body.runId.trim()

  let record
  try {
    record = await prisma.taskRun.findUnique({
      where: { runId },
      select: { userId: true },
    })
  } catch (error) {
    console.error("[POST /api/ai/spec/token] lookup failed", error)
    return internalServerErrorResponse()
  }

  if (!record) {
    return notFoundResponse("Run not found")
  }

  if (record.userId !== identity.userId) {
    return forbiddenResponse()
  }

  let token: string
  try {
    token = await auth.createPublicToken({
      expirationTime: "1h",
      scopes: {
        read: {
          runs: [runId],
        },
      },
    })
  } catch (error) {
    console.error("[POST /api/ai/spec/token] token creation failed", error)
    return internalServerErrorResponse("Failed to create access token")
  }

  return Response.json({ token })
}
