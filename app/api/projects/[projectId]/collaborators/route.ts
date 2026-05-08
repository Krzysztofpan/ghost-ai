import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"

import {
  badRequestResponse,
  conflictResponse,
  forbiddenResponse,
  internalServerErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "@/lib/http-responses"
import { prisma } from "@/lib/prisma"

interface CollaboratorResponseItem {
  email: string
  name: string | null
  avatarUrl: string | null
  isOwner: boolean
}

interface InviteCollaboratorBody {
  email?: unknown
}

interface RemoveCollaboratorBody {
  email?: unknown
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getDisplayName(user: {
  firstName: string | null
  lastName: string | null
  username: string | null
}): string | null {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  if (fullName.length > 0) return fullName
  return user.username
}

async function getCurrentUserEmails(): Promise<string[]> {
  try {
    const user = await currentUser()
    if (!user) return []
    return Array.from(new Set(user.emailAddresses.map((entry) => entry.emailAddress.toLowerCase())))
  } catch (error) {
    const details =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { value: String(error) }
    console.error("[getCurrentUserEmails] Failed to fetch current user", details)
    return []
  }
}

async function getProject(projectId: string) {
  try {
    return prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true, name: true },
    })
  } catch (error) {
    console.error("[getProject] Failed to fetch project", { projectId, error })
    throw error
  }
}

async function isProjectCollaborator(projectId: string, emails: string[]) {
  if (emails.length === 0) return false

  let collaborator: { id: string } | null = null
  try {
    collaborator = await prisma.projectCollaborator.findFirst({
      where: {
        projectId,
        email: { in: emails },
      },
      select: { id: true },
    })
  } catch (error) {
    console.error("[isProjectCollaborator] Failed collaborator lookup", {
      projectId,
      emailCount: emails.length,
      error,
    })
    throw error
  }

  return Boolean(collaborator)
}

async function buildCollaboratorList(projectId: string, ownerId: string): Promise<CollaboratorResponseItem[]> {
  let collaborators: Array<{ email: string }> = []
  let client: Awaited<ReturnType<typeof clerkClient>>
  try {
    ;[collaborators, client] = await Promise.all([
      prisma.projectCollaborator.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        select: { email: true },
      }),
      clerkClient(),
    ])
  } catch (error) {
    console.error("[buildCollaboratorList] Failed to load collaborators", { projectId, ownerId, error })
    throw error
  }

  const collaboratorEmails = Array.from(new Set(collaborators.map((entry) => entry.email.toLowerCase())))
  const [ownerUser, matchedUsersResponse] = await Promise.all([
    client.users.getUser(ownerId),
    collaboratorEmails.length > 0
      ? client.users.getUserList({
          emailAddress: collaboratorEmails,
          limit: collaboratorEmails.length,
        })
      : Promise.resolve(null),
  ])
  const matchedUsers = matchedUsersResponse?.data ?? []

  const usersByEmail = new Map<string, { name: string | null; avatarUrl: string | null }>()
  for (const user of matchedUsers) {
    for (const address of user.emailAddresses) {
      usersByEmail.set(address.emailAddress.toLowerCase(), {
        name: getDisplayName(user),
        avatarUrl: user.imageUrl ?? null,
      })
    }
  }

  const ownerEmail =
    ownerUser.emailAddresses.find((entry) => entry.id === ownerUser.primaryEmailAddressId)?.emailAddress ??
    ownerUser.emailAddresses[0]?.emailAddress ??
    null

  const ownerItem: CollaboratorResponseItem | null = ownerEmail
    ? {
        email: ownerEmail.toLowerCase(),
        name: getDisplayName(ownerUser),
        avatarUrl: ownerUser.imageUrl ?? null,
        isOwner: true,
      }
    : null

  const collaboratorItems: CollaboratorResponseItem[] = collaboratorEmails.map((email) => {
    const user = usersByEmail.get(email)
    return {
      email,
      name: user?.name ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      isOwner: false,
    }
  })

  return ownerItem ? [ownerItem, ...collaboratorItems] : collaboratorItems
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">
) {
  const { userId } = await auth()
  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { projectId } = await context.params
    const project = await getProject(projectId)
    if (!project) {
      return notFoundResponse("Project not found")
    }

    const userEmails = await getCurrentUserEmails()
    const canView =
      project.ownerId === userId || (await isProjectCollaborator(projectId, userEmails))

    if (!canView) {
      return forbiddenResponse()
    }

    const collaborators = await buildCollaboratorList(projectId, project.ownerId)
    return Response.json({ collaborators, canManageAccess: project.ownerId === userId })
  } catch (error) {
    console.error("[GET /api/projects/[projectId]/collaborators] Unexpected error", { userId, error })
    return internalServerErrorResponse("Failed to load collaborators")
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">
) {
  const { userId } = await auth()
  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { projectId } = await context.params
    const project = await getProject(projectId)
    if (!project) {
      return notFoundResponse("Project not found")
    }

    if (project.ownerId !== userId) {
      return forbiddenResponse()
    }

    const body = (await request.json().catch(() => ({}))) as InviteCollaboratorBody
    const parsedEmail = typeof body.email === "string" ? normalizeEmail(body.email) : ""

    if (!isValidEmail(parsedEmail)) {
      return badRequestResponse("A valid collaborator email is required")
    }

    const ownerEmails = await getCurrentUserEmails()
    if (ownerEmails.includes(parsedEmail)) {
      return conflictResponse("Project owner already has access")
    }

    try {
      await prisma.projectCollaborator.create({
        data: {
          projectId,
          email: parsedEmail,
        },
      })
    } catch {
      return conflictResponse("Collaborator already has access")
    }

    const collaborators = await buildCollaboratorList(projectId, project.ownerId)
    return Response.json({ collaborators, canManageAccess: true }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/projects/[projectId]/collaborators] Unexpected error", { userId, error })
    return internalServerErrorResponse("Failed to add collaborator")
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">
) {
  const { userId } = await auth()
  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { projectId } = await context.params
    const project = await getProject(projectId)
    if (!project) {
      return notFoundResponse("Project not found")
    }

    if (project.ownerId !== userId) {
      return forbiddenResponse()
    }

    const body = (await request.json().catch(() => ({}))) as RemoveCollaboratorBody
    const parsedEmail = typeof body.email === "string" ? normalizeEmail(body.email) : ""
    if (!isValidEmail(parsedEmail)) {
      return badRequestResponse("A valid collaborator email is required")
    }

    const result = await prisma.projectCollaborator.deleteMany({
      where: {
        projectId,
        email: parsedEmail,
      },
    })

    if (result.count === 0) {
      return notFoundResponse("Collaborator not found")
    }

    const collaborators = await buildCollaboratorList(projectId, project.ownerId)
    return Response.json({ collaborators, canManageAccess: true })
  } catch (error) {
    console.error("[DELETE /api/projects/[projectId]/collaborators] Unexpected error", { userId, error })
    return internalServerErrorResponse("Failed to remove collaborator")
  }
}
