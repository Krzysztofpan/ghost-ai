import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export interface ProjectSidebarData {
  id: string
  name: string
}

export interface EditorProjectsData {
  ownedProjects: ProjectSidebarData[]
  sharedProjects: ProjectSidebarData[]
}

export async function getEditorProjectsData(): Promise<EditorProjectsData> {
  const { userId } = await auth()
  if (!userId) {
    return { ownedProjects: [], sharedProjects: [] }
  }

  const user = await currentUser()
  const userEmails = user?.emailAddresses.map((entry) => entry.emailAddress.toLowerCase()) ?? []

  const [ownedProjects, collaboratorRows] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    userEmails.length === 0
      ? Promise.resolve([])
      : prisma.projectCollaborator.findMany({
          where: {
            email: { in: userEmails },
          },
          select: { projectId: true },
          distinct: ["projectId"],
        }),
  ])

  const sharedProjectIds = collaboratorRows.map((row) => row.projectId)
  const sharedProjects =
    sharedProjectIds.length === 0
      ? []
      : await prisma.project.findMany({
          where: { id: { in: sharedProjectIds } },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true },
        })

  return { ownedProjects, sharedProjects }
}
