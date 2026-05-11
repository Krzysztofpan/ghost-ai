import { get } from "@vercel/blob"

import {
  forbiddenResponse,
  internalServerErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "@/lib/http-responses"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/specs/[specId]/download">,
) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    return unauthorizedResponse()
  }

  const { projectId, specId } = await context.params

  const access = await getProjectAccess(projectId, identity)
  if (!access.hasAccess) {
    return forbiddenResponse()
  }

  let spec: { filePath: string } | null
  try {
    spec = await prisma.projectSpec.findFirst({
      where: { id: specId, projectId },
      select: { filePath: true },
    })
  } catch (error) {
    console.error("[GET spec download] prisma lookup failed", { projectId, specId, error })
    return internalServerErrorResponse()
  }

  if (!spec) {
    return notFoundResponse("Spec not found")
  }

  try {
    const blobResult = await get(spec.filePath, { access: "private" })
    if (!blobResult || blobResult.statusCode !== 200 || blobResult.stream === null) {
      console.error("[GET spec download] blob read failed", { projectId, specId })
      return internalServerErrorResponse("Failed to read spec file")
    }

    const filename = `spec-${specId}.md`

    return new Response(blobResult.stream, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[GET spec download] failed", { projectId, specId, error })
    return internalServerErrorResponse()
  }
}
