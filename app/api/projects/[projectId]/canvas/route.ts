import { get, put } from "@vercel/blob"

import {
  badRequestResponse,
  forbiddenResponse,
  internalServerErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "@/lib/http-responses"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

interface CanvasPersistBody {
  nodes?: unknown
  edges?: unknown
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/canvas">,
) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return unauthorizedResponse()
  }

  const { projectId } = await context.params
  const access = await getProjectAccess(projectId, identity)
  if (!access.hasAccess) {
    return forbiddenResponse()
  }

  let canvasJsonPath: string | null = null
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { canvasJsonPath: true },
    })
    canvasJsonPath = project?.canvasJsonPath ?? null
  } catch (error) {
    console.error("[GET canvas] prisma lookup failed", { projectId, error })
    return internalServerErrorResponse()
  }

  if (!canvasJsonPath) {
    return notFoundResponse("No saved canvas")
  }

  try {
    const blobResult = await get(canvasJsonPath, { access: "private" })
    if (!blobResult || blobResult.statusCode !== 200 || blobResult.stream === null) {
      console.error("[GET canvas] blob read failed", { projectId })
      return internalServerErrorResponse("Failed to read canvas snapshot")
    }

    const raw = await new Response(blobResult.stream).text()
    const snapshot = JSON.parse(raw) as unknown
    return Response.json(snapshot)
  } catch (error) {
    console.error("[GET canvas] failed", { projectId, error })
    return internalServerErrorResponse()
  }
}

export async function PUT(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]/canvas">,
) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return unauthorizedResponse()
  }

  const { projectId } = await context.params
  const access = await getProjectAccess(projectId, identity)
  if (!access.hasAccess) {
    return forbiddenResponse()
  }

  const rawBody = (await request.json().catch(() => null)) as CanvasPersistBody | null
  if (!rawBody || typeof rawBody !== "object") {
    return badRequestResponse("Invalid JSON body")
  }

  if (!Array.isArray(rawBody.nodes) || !Array.isArray(rawBody.edges)) {
    return badRequestResponse("Canvas payload must include nodes and edges arrays")
  }

  const payload = JSON.stringify({
    nodes: rawBody.nodes,
    edges: rawBody.edges,
  })

  let url: string
  try {
    const blob = await put(`canvas/${projectId}.json`, payload, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    })
    url = blob.url
  } catch (error) {
    console.error("[PUT canvas] blob upload failed", { projectId, error })
    return internalServerErrorResponse()
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { canvasJsonPath: url },
    })
  } catch (error) {
    console.error("[PUT canvas] prisma update failed", { projectId, error })
    return internalServerErrorResponse()
  }

  return Response.json({ canvasJsonPath: url })
}
