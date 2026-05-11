import {
  forbiddenResponse,
  internalServerErrorResponse,
  unauthorizedResponse,
} from "@/lib/http-responses"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/specs">,
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

  try {
    const rows = await prisma.projectSpec.findMany({
      where: { projectId },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({
      specs: rows.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        filename: `spec-${s.id}.md`,
      })),
    })
  } catch (error) {
    console.error("[GET project specs] failed", { projectId, error })
    return internalServerErrorResponse()
  }
}
