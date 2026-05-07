"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"

export default function EditorPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const {
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
  } = useProjectDialogs()

  return (
    <main className="relative min-h-screen bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((prev) => !prev)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        onCreateProject={openCreate}
        onRenameProject={openRename}
        onDeleteProject={openDelete}
      />

      <section className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the sidebar.
        </p>
        <Button className="mt-2 gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </section>

      <CreateProjectDialog
        open={dialog.type === "create"}
        onClose={close}
        name={formName}
        onNameChange={setFormName}
        slug={slug}
        isSubmitting={isSubmitting}
        onSubmit={submitCreate}
      />

      <RenameProjectDialog
        open={dialog.type === "rename"}
        onClose={close}
        currentName={dialog.targetProject?.name ?? ""}
        name={formName}
        onNameChange={setFormName}
        isSubmitting={isSubmitting}
        onSubmit={submitRename}
      />

      <DeleteProjectDialog
        open={dialog.type === "delete"}
        onClose={close}
        projectName={dialog.targetProject?.name ?? ""}
        isSubmitting={isSubmitting}
        onSubmit={submitDelete}
      />
    </main>
  )
}
