"use client"

import { PanelLeftClose, Pencil, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { ProjectListItem } from "@/hooks/use-project-actions"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  ownedProjects: ProjectListItem[]
  sharedProjects: ProjectListItem[]
  activeProjectId?: string
  onCreateProject: () => void
  onRenameProject: (project: ProjectListItem) => void
  onDeleteProject: (project: ProjectListItem) => void
}

function ProjectItem({ project, isActive, showActions, onRename, onDelete }: { project: ProjectListItem; isActive: boolean; showActions: boolean; onRename: () => void; onDelete: () => void }) {
  const router = useRouter()
  const openProject = () => router.push(`/editor/${encodeURIComponent(project.id)}`)

  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={`Open project ${project.name}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-elevated",
        isActive ? "bg-accent-dim text-copy-primary" : "text-copy-secondary hover:bg-subtle hover:text-copy-primary",
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return
        openProject()
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        if ((e.target as HTMLElement).closest("button")) return
        openProject()
      }}
    >
      <span className='min-w-0 flex-1 truncate text-left'>{project.name}</span>
      {showActions && (
        <div className='flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
          <Button type='button' variant='ghost' size='icon-xs' onClick={onRename} aria-label={`Rename ${project.name}`} className='text-copy-muted hover:text-copy-primary'>
            <Pencil className='h-3 w-3' />
          </Button>
          <Button type='button' variant='ghost' size='icon-xs' onClick={onDelete} aria-label={`Delete ${project.name}`} className='text-copy-muted hover:text-destructive'>
            <Trash2 className='h-3 w-3' />
          </Button>
        </div>
      )}
    </div>
  )
}

export function ProjectSidebar({ isOpen, onClose, ownedProjects, sharedProjects, activeProjectId, onCreateProject, onRenameProject, onDeleteProject }: ProjectSidebarProps) {
  return (
    <>
      {/* Mobile backdrop scrim */}
      <div className={cn("fixed inset-0 z-10 bg-black/50 transition-opacity duration-300 md:hidden", isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")} onClick={onClose} aria-hidden='true' />

      <aside className={cn("fixed top-14 bottom-0 left-0 z-20 flex w-80 flex-col border-r border-surface-border bg-elevated/95 backdrop-blur-sm transition-transform duration-300 ease-out", isOpen ? "translate-x-0" : "-translate-x-full")} aria-hidden={!isOpen}>
        <div className='flex items-center justify-between border-b border-surface-border px-4 py-3'>
          <h2 className='text-sm font-semibold tracking-wide text-copy-primary uppercase'>Projects</h2>
          <Button type='button' variant='ghost' size='icon-sm' onClick={onClose} aria-label='Close project sidebar' className='text-copy-secondary hover:bg-subtle hover:text-copy-primary'>
            <PanelLeftClose className='h-4 w-4' />
          </Button>
        </div>

        <Tabs defaultValue='my-projects' className='flex min-h-0 flex-1 flex-col p-4'>
          <TabsList className='w-full bg-subtle'>
            <TabsTrigger value='my-projects'>My Projects</TabsTrigger>
            <TabsTrigger value='shared'>Shared</TabsTrigger>
          </TabsList>

          <TabsContent value='my-projects' className='mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto'>
            {ownedProjects.length === 0 ? (
              <div className='flex flex-1 items-center justify-center rounded-2xl border border-dashed border-surface-border-subtle bg-surface px-4 text-center text-sm text-copy-muted'>No projects yet. Create one to start designing.</div>
            ) : (
              <div className='flex flex-col gap-0.5'>
                {ownedProjects.map((project) => (
                  <ProjectItem key={project.id} project={project} isActive={project.id === activeProjectId} showActions={true} onRename={() => onRenameProject(project)} onDelete={() => onDeleteProject(project)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value='shared' className='mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto'>
            {sharedProjects.length === 0 ? (
              <div className='flex flex-1 items-center justify-center rounded-2xl border border-dashed border-surface-border-subtle bg-surface px-4 text-center text-sm text-copy-muted'>Shared projects will appear here.</div>
            ) : (
              <div className='flex flex-col gap-0.5'>
                {sharedProjects.map((project) => (
                  <ProjectItem key={project.id} project={project} isActive={project.id === activeProjectId} showActions={false} onRename={() => {}} onDelete={() => {}} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className='border-t border-surface-border p-4'>
          <Button type='button' className='w-full gap-2' variant='default' onClick={onCreateProject}>
            <Plus className='h-4 w-4' />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}
