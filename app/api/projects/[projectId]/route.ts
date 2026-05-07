import { auth } from "@clerk/nextjs/server"
import {
  badRequestResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/http-responses"
import { prisma } from "@/lib/prisma"

interface PatchProjectBody {
  name?: unknown
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]">
) {
  const { userId } = await auth()

  if (!userId) {
    return unauthorizedResponse()
  }

  const { projectId } = await context.params
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })

  if (!project || project.ownerId !== userId) {
    return forbiddenResponse()
  }

  const body = (await request.json().catch(() => ({}))) as PatchProjectBody

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return badRequestResponse("Project name is required")
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { name: body.name.trim() },
  })

  return Response.json({ project: updatedProject })
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]">
) {
  const { userId } = await auth()

  if (!userId) {
    return unauthorizedResponse()
  }

  const { projectId } = await context.params
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })

  if (!project || project.ownerId !== userId) {
    return forbiddenResponse()
  }

  await prisma.project.delete({ where: { id: projectId } })

  return Response.json({ success: true })
}
