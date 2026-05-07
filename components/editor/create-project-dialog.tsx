"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EditorDialogPattern } from "@/components/editor/editor-dialog-pattern"

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
  name: string
  onNameChange: (value: string) => void
  roomId: string
  isSubmitting: boolean
  onSubmit: () => void
}

export function CreateProjectDialog({
  open,
  onClose,
  name,
  onNameChange,
  roomId,
  isSubmitting,
  onSubmit,
}: CreateProjectDialogProps) {
  const trimmedName = name.trim()
  const canSubmit = Boolean(trimmedName) && Boolean(roomId) && !isSubmitting

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <EditorDialogPattern
        title="Create project"
        description="Start a new architecture workspace."
        footerActions={
          <div className="flex w-full items-center justify-end gap-2">
            <DialogClose
              render={<Button variant="outline" disabled={isSubmitting} />}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={onSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-name"
              className="text-sm font-medium text-copy-primary"
            >
              Project name
            </label>
            <Input
              id="project-name"
              placeholder="My Architecture"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) onSubmit()
              }}
              autoFocus
              className="border-surface-border-subtle bg-surface text-copy-primary placeholder:text-copy-muted"
            />
          </div>
          {roomId && (
            <p className="text-xs text-copy-secondary">
              Room ID:{" "}
              <span className="font-mono text-brand">{roomId}</span>
            </p>
          )}
          {trimmedName && !roomId && (
            <p className="text-xs text-destructive">
              Project name must contain at least one letter or number to generate a room ID.
            </p>
          )}
        </div>
      </EditorDialogPattern>
    </Dialog>
  )
}
