import { auth } from "@clerk/nextjs/server"
import { unauthorizedResponse } from "@/lib/http-responses"
import { prisma } from "@/lib/prisma"

interface CreateProjectBody {
  id?: unknown
  name?: unknown
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return unauthorizedResponse()
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ projects })
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return unauthorizedResponse()
  }

  const body = (await request.json().catch(() => ({}))) as CreateProjectBody
  const id = typeof body.id === "string" ? body.id.trim() : ""
  const parsedName =
    typeof body.name === "string" ? body.name.trim() : "Untitled Project"
  const name = parsedName.length > 0 ? parsedName : "Untitled Project"

  const project = await prisma.project.create({
    data: {
      ...(id ? { id } : {}),
      ownerId: userId,
      name,
    },
  })

  return Response.json({ project }, { status: 201 })
}
