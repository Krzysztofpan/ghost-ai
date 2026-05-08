import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShellClient } from "@/components/editor/workspace-shell-client"
import { getEditorProjectsData } from "@/lib/project-data"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"

interface WorkspacePageProps {
  params: Promise<{ roomId: string }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const identity = await getCurrentIdentity()
  if (!identity) {
    redirect("/sign-in")
  }

  const { roomId } = await params
  const { hasAccess, projectName, isOwner } = await getProjectAccess(roomId, identity)

  if (!hasAccess || !projectName) {
    return <AccessDenied />
  }

  const { ownedProjects, sharedProjects } = await getEditorProjectsData()

  return (
    <WorkspaceShellClient
      roomId={roomId}
      projectName={projectName}
      canManageAccess={isOwner}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}
