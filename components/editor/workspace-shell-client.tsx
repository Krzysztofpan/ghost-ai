"use client"

import { useState } from "react"
import { Bot, Compass, Share2 } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { ShareDialog } from "@/components/editor/share-dialog"
import { Button } from "@/components/ui/button"
import type { ProjectSidebarData } from "@/lib/project-data"
import { cn } from "@/lib/utils"
import { useProjectActions } from "@/hooks/use-project-actions"
import { useShareDialog } from "@/hooks/use-share-dialog"

interface WorkspaceShellClientProps {
  roomId: string
  projectName: string
  canManageAccess: boolean
  ownedProjects: ProjectSidebarData[]
  sharedProjects: ProjectSidebarData[]
}

export function WorkspaceShellClient({
  roomId,
  projectName,
  canManageAccess,
  ownedProjects,
  sharedProjects,
}: WorkspaceShellClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const { dialog, formName, setFormName, roomId: nextRoomId, isSubmitting, openCreate, openRename, openDelete, close, submitCreate, submitRename, submitDelete } = useProjectActions()
  const shareDialog = useShareDialog(roomId, canManageAccess)

  return (
    <main className='flex min-h-screen flex-col bg-base text-copy-primary'>
      <header className='flex h-14 items-center justify-between border-b border-surface-border bg-surface px-3'>
        <div className='min-w-0 flex-1'>
          <h1 className='truncate text-sm font-semibold text-copy-primary'>{projectName}</h1>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5'
            onClick={shareDialog.openDialog}
          >
            <Share2 className='h-3.5 w-3.5' />
            Share
          </Button>
          <Button aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"} onClick={() => setIsAiSidebarOpen((prev) => !prev)} className='gap-1 border border-brand/40 bg-accent-dim text-brand shadow-[0_0_0_1px_rgba(0,200,212,0.18)] hover:bg-accent-dim/80 hover:text-copy-primary'>
            <Bot className='h-4 w-4' /> <span>AI</span>
          </Button>
          <UserButton />
        </div>
      </header>

      <div className={cn("relative flex h-[calc(100vh-3.5rem)] overflow-hidden transition-[padding] duration-300 ease-out", isSidebarOpen ? "md:pl-80" : "md:pl-0")}>
        <ProjectSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeProjectId={roomId} ownedProjects={ownedProjects} sharedProjects={sharedProjects} onCreateProject={openCreate} onRenameProject={openRename} onDeleteProject={openDelete} />

        {!isSidebarOpen && (
          <Button type='button' size='sm' onClick={() => setIsSidebarOpen(true)} className='absolute top-4 left-4 z-10 h-9 rounded-xl border border-brand/40 bg-accent-dim px-3 text-brand shadow-[0_0_0_1px_rgba(0,200,212,0.2),0_10px_24px_rgba(0,0,0,0.45)] hover:bg-accent-dim/80 hover:text-copy-primary'>
            <span className='mr-1 inline-block h-1.5 w-1.5 rounded-full bg-brand' aria-hidden='true' />
            Open Projects
          </Button>
        )}

        <section className='flex flex-1 items-center justify-center bg-base px-6 py-6 transition-all duration-300 ease-out'>
          <div className='relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-surface-border bg-surface/40'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100,87,249,0.16),transparent_58%)]' />
            <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(58,58,66,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(58,58,66,0.22)_1px,transparent_1px)] bg-size-[42px_42px]' />
            <div className='relative z-10 max-w-xl px-8 text-center'>
              <div className='mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-surface-border-subtle bg-elevated text-brand'>
                <Compass className='h-6 w-6' />
              </div>
              <p className='text-xs font-semibold tracking-[0.24em] text-copy-faint uppercase'>Workspace Shell</p>
              <h2 className='mt-4 text-3xl font-semibold text-copy-primary'>Canvas and collaboration tooling land here next.</h2>
              <p className='mt-4 text-sm leading-6 text-copy-muted'>This room is ready for shared architecture editing and AI workflows. For now, the shell is wired with project context and navigation only.</p>
              <p className='mt-4 font-mono text-xs text-copy-secondary'>{roomId}</p>
            </div>
          </div>
        </section>

        {isAiSidebarOpen && (
          <aside className='hidden w-80 border-l border-surface-border bg-elevated/95 p-4 md:block'>
            <div className='mb-4 flex items-center gap-2 text-copy-primary'>
              <Bot className='h-4 w-4 text-brand' />
              <h2 className='text-sm font-semibold'>AI Workspace</h2>
            </div>
            <div className='flex h-[calc(100%-2rem)] items-center justify-center rounded-2xl border border-dashed border-surface-border-subtle bg-surface px-4 text-center text-sm text-copy-muted'>AI chat tools will be added in a later feature unit.</div>
          </aside>
        )}
      </div>

      <CreateProjectDialog open={dialog.type === "create"} onClose={close} name={formName} onNameChange={setFormName} roomId={nextRoomId} isSubmitting={isSubmitting} onSubmit={submitCreate} />

      <RenameProjectDialog open={dialog.type === "rename"} onClose={close} currentName={dialog.targetProject?.name ?? ""} name={formName} onNameChange={setFormName} isSubmitting={isSubmitting} onSubmit={submitRename} />

      <DeleteProjectDialog open={dialog.type === "delete"} onClose={close} projectName={dialog.targetProject?.name ?? ""} isSubmitting={isSubmitting} onSubmit={submitDelete} />

      <ShareDialog
        open={shareDialog.isOpen}
        canManageAccess={shareDialog.canManageAccess}
        isLoading={shareDialog.isLoading}
        isSubmitting={shareDialog.isSubmitting}
        inviteEmail={shareDialog.inviteEmail}
        collaborators={shareDialog.collaborators}
        copyFeedback={shareDialog.copyFeedback}
        error={shareDialog.error}
        onOpenChange={(open) => {
          if (open) {
            shareDialog.openDialog()
            return
          }
          shareDialog.closeDialog()
        }}
        onInviteEmailChange={(value) => {
          shareDialog.resetError()
          shareDialog.setInviteEmail(value)
        }}
        onInvite={shareDialog.inviteCollaborator}
        onRemove={shareDialog.removeCollaborator}
        onCopyLink={shareDialog.copyProjectLink}
      />
    </main>
  )
}
