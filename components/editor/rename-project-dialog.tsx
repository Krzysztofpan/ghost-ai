"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EditorDialogPattern } from "@/components/editor/editor-dialog-pattern"

interface RenameProjectDialogProps {
  open: boolean
  onClose: () => void
  currentName: string
  name: string
  onNameChange: (value: string) => void
  isSubmitting: boolean
  onSubmit: () => void
}

export function RenameProjectDialog({
  open,
  onClose,
  currentName,
  name,
  onNameChange,
  isSubmitting,
  onSubmit,
}: RenameProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <EditorDialogPattern
        title="Rename project"
        description={`Current name: ${currentName}`}
        footerActions={
          <div className="flex w-full items-center justify-end gap-2">
            <DialogClose
              render={<Button variant="outline" disabled={isSubmitting} />}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={onSubmit}
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Rename
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="rename-input"
            className="text-sm font-medium text-copy-primary"
          >
            New name
          </label>
          <Input
            id="rename-input"
            placeholder="Project name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onSubmit()
            }}
            autoFocus
            className="border-surface-border-subtle bg-surface text-copy-primary placeholder:text-copy-muted"
          />
        </div>
      </EditorDialogPattern>
    </Dialog>
  )
}
