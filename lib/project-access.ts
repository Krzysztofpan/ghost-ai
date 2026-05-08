import { auth, currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

export interface CurrentIdentity {
  userId: string
  primaryEmail: string | null
}

export interface ProjectAccessResult {
  hasAccess: boolean
  projectName: string | null
  isOwner: boolean
}

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return null
    }

    const user = await currentUser()
    const primaryEmail = user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null

    return {
      userId,
      primaryEmail: primaryEmail?.toLowerCase() ?? null,
    }
  } catch (error) {
    console.error("Failed to get current identity:", error)
    return null
  }
}
export async function getProjectAccess(
  roomId: string,
  identity: CurrentIdentity
): Promise<ProjectAccessResult> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: roomId },
      select: { id: true, ownerId: true, name: true },
    })

    if (!project) {
      return { hasAccess: false, projectName: null, isOwner: false }
    }

    if (project.ownerId === identity.userId) {
      return { hasAccess: true, projectName: project.name, isOwner: true }
    }

    if (!identity.primaryEmail) {
      return { hasAccess: false, projectName: null, isOwner: false }
    }

    const collaborator = await prisma.projectCollaborator.findUnique({
      where: {
        projectId_email: {
          projectId: roomId,
          email: identity.primaryEmail,
        },
      },
      select: { id: true },
    })

    return {
      hasAccess: Boolean(collaborator),
      projectName: collaborator ? project.name : null,
      isOwner: false,
    }
  } catch (error) {
    console.error("Failed to check project access:", error)
    return { hasAccess: false, projectName: null, isOwner: false }
  }
}