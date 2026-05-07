"use client"

import { useState, useCallback, useMemo, useRef } from "react"

export interface MockProject {
  id: string
  name: string
  slug: string
  isOwner: boolean
}

const MOCK_PROJECTS: MockProject[] = [
  { id: "p1", name: "E-Commerce Platform", slug: "e-commerce-platform", isOwner: true },
  { id: "p2", name: "Chat Service", slug: "chat-service", isOwner: true },
  { id: "p3", name: "Analytics Dashboard", slug: "analytics-dashboard", isOwner: false },
]

type DialogType = "create" | "rename" | "delete" | null

interface DialogState {
  type: DialogType
  targetProject: MockProject | null
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

export function useProjectDialogs() {
  const [projects, setProjects] = useState<MockProject[]>(MOCK_PROJECTS)
  const [dialog, setDialog] = useState<DialogState>({ type: null, targetProject: null })
  const [formName, setFormName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const cancelled = useRef(false)

  const slug = useMemo(() => toSlug(formName), [formName])

  const openCreate = useCallback(() => {
    cancelled.current = false
    setFormName("")
    setDialog({ type: "create", targetProject: null })
  }, [])

  const openRename = useCallback((project: MockProject) => {
    cancelled.current = false
    setFormName(project.name)
    setDialog({ type: "rename", targetProject: project })
  }, [])

  const openDelete = useCallback((project: MockProject) => {
    cancelled.current = false
    setDialog({ type: "delete", targetProject: project })
  }, [])

  const close = useCallback(() => {
    cancelled.current = true
    setDialog({ type: null, targetProject: null })
    setFormName("")
    setIsSubmitting(false)
  }, [])

  const submitCreate = useCallback(async () => {
    if (isSubmitting) return
    const trimmedName = formName.trim()
    const nextSlug = toSlug(formName)
    if (!trimmedName || !nextSlug) return
    cancelled.current = false
    setIsSubmitting(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled.current) return
      const newProject: MockProject = {
        id: `p${Date.now()}`,
        name: trimmedName,
        slug: nextSlug,
        isOwner: true,
      }
      setProjects((prev) => [...prev, newProject])
      close()
    } finally {
      if (!cancelled.current) {
        setIsSubmitting(false)
      }
    }
  }, [isSubmitting, formName, close])

  const submitRename = useCallback(async () => {
    if (isSubmitting) return
    if (!formName.trim() || !dialog.targetProject) return
    cancelled.current = false
    setIsSubmitting(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled.current) return
      setProjects((prev) =>
        prev.map((p) =>
          p.id === dialog.targetProject!.id
            ? { ...p, name: formName.trim(), slug: toSlug(formName) }
            : p
        )
      )
      close()
    } finally {
      if (!cancelled.current) {
        setIsSubmitting(false)
      }
    }
  }, [isSubmitting, formName, dialog.targetProject, close])

  const submitDelete = useCallback(async () => {
    if (isSubmitting) return
    if (!dialog.targetProject) return
    cancelled.current = false
    setIsSubmitting(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled.current) return
      setProjects((prev) => prev.filter((p) => p.id !== dialog.targetProject!.id))
      close()
    } finally {
      if (!cancelled.current) {
        setIsSubmitting(false)
      }
    }
  }, [isSubmitting, dialog.targetProject, close])

  const ownedProjects = useMemo(() => projects.filter((p) => p.isOwner), [projects])
  const sharedProjects = useMemo(() => projects.filter((p) => !p.isOwner), [projects])

  return {
    projects,
    ownedProjects,
    sharedProjects,
    dialog,
    formName,
    setFormName,
    slug,
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
