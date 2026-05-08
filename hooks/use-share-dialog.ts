"use client"

import { useCallback, useMemo, useState } from "react"

export interface CollaboratorListItem {
  email: string
  name: string | null
  avatarUrl: string | null
  isOwner: boolean
}

interface ListCollaboratorsResponse {
  collaborators?: CollaboratorListItem[]
  canManageAccess?: boolean
}

export function useShareDialog(projectId: string, canManageAccessByRole: boolean) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [collaborators, setCollaborators] = useState<CollaboratorListItem[]>([])
  const [canManageAccess, setCanManageAccess] = useState(canManageAccessByRole)
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied">("idle")
  const [error, setError] = useState<string | null>(null)

  const resetError = useCallback(() => setError(null), [])

  const fetchCollaborators = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/collaborators`, {
        method: "GET",
      })

      if (!response.ok) {
        setError("Failed to load collaborators")
        return
      }

      const data = (await response.json()) as ListCollaboratorsResponse
      setCollaborators(data.collaborators ?? [])
      setCanManageAccess(Boolean(data.canManageAccess))
    } catch {
      setError("Failed to load collaborators")
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const openDialog = useCallback(() => {
    setIsOpen(true)
    setCopyFeedback("idle")
    setError(null)
    void fetchCollaborators()
  }, [fetchCollaborators])

  const closeDialog = useCallback(() => {
    setIsOpen(false)
    setInviteEmail("")
    setError(null)
  }, [])

  const inviteCollaborator = useCallback(async () => {
    if (!canManageAccess || isSubmitting) return
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const message = "Failed to invite collaborator"
        setError(message)
        return
      }

      const data = (await response.json()) as ListCollaboratorsResponse
      setCollaborators(data.collaborators ?? [])
      setInviteEmail("")
    } catch {
      setError("Failed to invite collaborator")
    } finally {
      setIsSubmitting(false)
    }
  }, [canManageAccess, inviteEmail, isSubmitting, projectId])

  const removeCollaborator = useCallback(
    async (email: string) => {
      if (!canManageAccess || isSubmitting) return

      setIsSubmitting(true)
      setError(null)

      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/collaborators`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })

        if (!response.ok) {
          setError("Failed to remove collaborator")
          return
        }

        const data = (await response.json()) as ListCollaboratorsResponse
        setCollaborators(data.collaborators ?? [])
      } catch {
        setError("Failed to remove collaborator")
      } finally {
        setIsSubmitting(false)
      }
    },
    [canManageAccess, isSubmitting, projectId]
  )

  const copyProjectLink = useCallback(async () => {
    if (!canManageAccess) return

    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyFeedback("copied")
      setTimeout(() => setCopyFeedback("idle"), 1200)
    } catch {
      setError("Could not copy project link")
    }
  }, [canManageAccess])

  const hasCollaborators = useMemo(() => collaborators.length > 0, [collaborators])

  return {
    isOpen,
    isLoading,
    isSubmitting,
    inviteEmail,
    setInviteEmail,
    collaborators,
    hasCollaborators,
    canManageAccess,
    copyFeedback,
    error,
    openDialog,
    closeDialog,
    resetError,
    inviteCollaborator,
    removeCollaborator,
    copyProjectLink,
  }
}
