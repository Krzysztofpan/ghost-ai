import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShellClient } from "@/components/editor/workspace-shell-client"
import { getEditorProjectsData } from "@/lib/project-data"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"

interface WorkspacePageProps {
  params: Promise<{ roomId: string }>
}

interface RetryOptions {
  maxRetries?: number
  backoffMs?: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  backoffMs: 150,
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
) {
  const { maxRetries, backoffMs } = { ...DEFAULT_RETRY_OPTIONS, ...options }

  let attempt = 0
  let lastError: unknown

  while (attempt <= maxRetries) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries) {
        break
      }

      await sleep(backoffMs * 2 ** attempt)
      attempt += 1
    }
  }

  throw lastError
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  let identity: Awaited<ReturnType<typeof getCurrentIdentity>>

  try {
    identity = await withRetry(() => getCurrentIdentity())
  } catch (error) {
    console.error("[WorkspacePage] Failed to resolve current identity", error)
    redirect("/sign-in")
  }

  if (!identity) {
    redirect("/sign-in")
  }

  const { roomId } = await params
  let hasAccess = false
  let projectName: string | null = null
  let isOwner = false

  try {
    const projectAccess = await withRetry(() => getProjectAccess(roomId, identity))
    hasAccess = projectAccess.hasAccess
    projectName = projectAccess.projectName
    isOwner = projectAccess.isOwner
  } catch (error) {
    console.error("[WorkspacePage] Failed to resolve project access", {
      roomId,
      userId: identity.userId,
      error,
    })
  }

  if (!hasAccess || !projectName) {
    return <AccessDenied />
  }

  let ownedProjects: Awaited<ReturnType<typeof getEditorProjectsData>>["ownedProjects"] = []
  let sharedProjects: Awaited<ReturnType<typeof getEditorProjectsData>>["sharedProjects"] = []

  try {
    const projectData = await withRetry(() => getEditorProjectsData())
    ownedProjects = projectData.ownedProjects
    sharedProjects = projectData.sharedProjects
  } catch (error) {
    console.error("[WorkspacePage] Failed to load editor projects data", {
      roomId,
      userId: identity.userId,
      error,
    })
  }

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
