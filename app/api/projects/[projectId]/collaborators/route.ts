import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"

import {
  badRequestResponse,
  conflictResponse,
  forbiddenResponse,
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
  const user = await currentUser()
  if (!user) return []
  return Array.from(new Set(user.emailAddresses.map((entry) => entry.emailAddress.toLowerCase())))
}

async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, name: true },
  })
}

async function isProjectCollaborator(projectId: string, emails: string[]) {
  if (emails.length === 0) return false

  const collaborator = await prisma.projectCollaborator.findFirst({
    where: {
      projectId,
      email: { in: emails },
    },
    select: { id: true },
  })

  return Boolean(collaborator)
}

async function buildCollaboratorList(projectId: string, ownerId: string): Promise<CollaboratorResponseItem[]> {
  const [collaborators, client] = await Promise.all([
    prisma.projectCollaborator.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: { email: true },
    }),
    clerkClient(),
  ])

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
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">
) {
  const { userId } = await auth()
  if (!userId) {
    return unauthorizedResponse()
  }

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
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">
) {
  const { userId } = await auth()
  if (!userId) {
    return unauthorizedResponse()
  }

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
}
