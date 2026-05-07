"use client"

import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

export interface ProjectListItem {
  id: string
  name: string
}

type DialogType = "create" | "rename" | "delete" | null

interface DialogState {
  type: DialogType
  targetProject: ProjectListItem | null
}

interface CreateProjectResponse {
  project?: {
    id: string
    name: string
  }
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function createSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

export function useProjectActions() {
  const router = useRouter()
  const pathname = usePathname()

  const [dialog, setDialog] = useState<DialogState>({ type: null, targetProject: null })
  const [formName, setFormName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createSuffixValue, setCreateSuffixValue] = useState(createSuffix)

  const slug = useMemo(() => toSlug(formName), [formName])
  const roomId = useMemo(
    () => (slug ? `${slug}-${createSuffixValue}` : ""),
    [slug, createSuffixValue]
  )

  const openCreate = useCallback(() => {
    setFormName("")
    setCreateSuffixValue(createSuffix())
    setDialog({ type: "create", targetProject: null })
  }, [])

  const openRename = useCallback((project: ProjectListItem) => {
    setFormName(project.name)
    setDialog({ type: "rename", targetProject: project })
  }, [])

  const openDelete = useCallback((project: ProjectListItem) => {
    setDialog({ type: "delete", targetProject: project })
  }, [])

  const close = useCallback(() => {
    setDialog({ type: null, targetProject: null })
    setFormName("")
    setIsSubmitting(false)
  }, [])

  const submitCreate = useCallback(async () => {
    if (isSubmitting) return
    const trimmedName = formName.trim()
    if (!trimmedName || !roomId) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roomId, name: trimmedName }),
      })

      if (!response.ok) return

      const data = (await response.json()) as CreateProjectResponse
      const createdProjectId = data.project?.id ?? roomId

      close()
      router.push(`/editor/${encodeURIComponent(createdProjectId)}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [close, formName, isSubmitting, roomId, router])

  const submitRename = useCallback(async () => {
    if (isSubmitting) return
    const targetProject = dialog.targetProject
    if (!targetProject) return

    const nextName = formName.trim()
    if (!nextName) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(targetProject.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      })

      if (!response.ok) return

      close()
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }, [close, dialog.targetProject, formName, isSubmitting, router])

  const submitDelete = useCallback(async () => {
    if (isSubmitting) return
    const targetProject = dialog.targetProject
    if (!targetProject) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(targetProject.id)}`, {
        method: "DELETE",
      })

      if (!response.ok) return

      close()

      if (pathname === `/editor/${targetProject.id}`) {
        router.push("/editor")
        return
      }

      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }, [close, dialog.targetProject, isSubmitting, pathname, router])

  return {
    dialog,
    formName,
    setFormName,
    roomId,
    isSubmitting,
    openCreate,
    openRename,
    openDelete,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  }
}
