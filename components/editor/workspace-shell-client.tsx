"use client"

import { useRef, useState } from "react"
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react"
import { AlertCircle, Bot, Check, LayoutTemplate, Loader2, Save, Share2 } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { AiWorkspaceSidebar } from "@/components/editor/ai-workspace-sidebar"
import { CreateProjectDialog } from "@/components/editor/create-project-dialog"
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { RenameProjectDialog } from "@/components/editor/rename-project-dialog"
import { ShareDialog } from "@/components/editor/share-dialog"
import { LiveblocksRoomShell, WorkspaceCanvasClient, type WorkspaceCanvasClientHandle } from "@/components/editor/workspace-canvas-client"
import { Button } from "@/components/ui/button"
import type { ProjectSidebarData } from "@/lib/project-data"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { CanvasAutosaveStatus } from "@/hooks/use-canvas-autosave"
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
  const canvasRef = useRef<WorkspaceCanvasClientHandle>(null)
  const [canvasSaveStatus, setCanvasSaveStatus] = useState<CanvasAutosaveStatus>("idle")
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
            aria-label='Save canvas now'
            onClick={() => void canvasRef.current?.saveCanvas()}
          >
            <Save className='h-3.5 w-3.5' />
            Save
            {canvasSaveStatus === "saving" ? (
              <span className='inline-flex items-center gap-1 border-l border-surface-border pl-1.5 text-[11px] font-normal text-copy-muted'>
                <Loader2 className='h-3 w-3 animate-spin' aria-hidden />
                Saving
              </span>
            ) : null}
            {canvasSaveStatus === "saved" ? (
              <span className='inline-flex items-center gap-1 border-l border-surface-border pl-1.5 text-[11px] font-normal text-copy-muted'>
                <Check className='h-3 w-3 text-emerald-400' aria-hidden />
                Saved
              </span>
            ) : null}
            {canvasSaveStatus === "error" ? (
              <span className='inline-flex items-center gap-1 border-l border-surface-border pl-1.5 text-[11px] font-normal text-red-400'>
                <AlertCircle className='h-3 w-3 shrink-0' aria-hidden />
                Error
              </span>
            ) : null}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5'
            aria-label='Open starter templates'
            onClick={() => canvasRef.current?.openStarterTemplates()}
          >
            <LayoutTemplate className='h-3.5 w-3.5' />
            Templates
          </Button>
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

      <LiveblocksProvider authEndpoint='/api/liveblocks-auth'>
        <RoomProvider id={roomId} initialPresence={{ cursor: null, thinking: false }}>
          <LiveblocksRoomShell>
            <div className='relative flex min-h-0 flex-1 overflow-hidden'>
              <ProjectSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} activeProjectId={roomId} ownedProjects={ownedProjects} sharedProjects={sharedProjects} onCreateProject={openCreate} onRenameProject={openRename} onDeleteProject={openDelete} />

              {!isSidebarOpen && (
                <Button type='button' size='sm' onClick={() => setIsSidebarOpen(true)} className='absolute top-4 left-4 z-30 h-9 rounded-xl border border-brand/40 bg-accent-dim px-3 text-brand shadow-[0_0_0_1px_rgba(0,200,212,0.2),0_10px_24px_rgba(0,0,0,0.45)] hover:bg-accent-dim/80 hover:text-copy-primary'>
                  <span className='mr-1 inline-block h-1.5 w-1.5 rounded-full bg-brand' aria-hidden='true' />
                  Open Projects
                </Button>
              )}

              <section className='relative flex min-h-0 min-w-0 flex-1 bg-base'>
                <WorkspaceCanvasClient ref={canvasRef} roomId={roomId} className='h-full min-h-0 w-full' onAutosaveStatusChange={setCanvasSaveStatus} />
              </section>

              <AiWorkspaceSidebar roomId={roomId} open={isAiSidebarOpen} onClose={() => setIsAiSidebarOpen(false)} />
            </div>
          </LiveblocksRoomShell>
        </RoomProvider>
      </LiveblocksProvider>

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
