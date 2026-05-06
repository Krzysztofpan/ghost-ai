"use client"

import { PanelLeftClose, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed top-14 bottom-0 left-0 z-20 flex w-80 flex-col border-r border-surface-border bg-elevated/95 backdrop-blur-sm transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      aria-hidden={!isOpen}
    >
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-copy-primary uppercase">
          Projects
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close project sidebar"
          className="text-copy-secondary hover:bg-subtle hover:text-copy-primary"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="my-projects" className="flex min-h-0 flex-1 flex-col p-4">
        <TabsList className="w-full bg-subtle">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>

        <TabsContent
          value="my-projects"
          className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-surface-border-subtle bg-surface px-4 text-center text-sm text-copy-muted"
        >
          No projects yet. Create one to start designing.
        </TabsContent>

        <TabsContent
          value="shared"
          className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-surface-border-subtle bg-surface px-4 text-center text-sm text-copy-muted"
        >
          Shared projects will appear here.
        </TabsContent>
      </Tabs>

      <div className="border-t border-surface-border p-4">
        <Button type="button" className="w-full gap-2" variant="default">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  )
}
