"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose } from "@/components/ui/dialog"
import { EditorDialogPattern } from "@/components/editor/editor-dialog-pattern"

interface DeleteProjectDialogProps {
  open: boolean
  onClose: () => void
  projectName: string
  isSubmitting: boolean
  onSubmit: () => void
}

export function DeleteProjectDialog({
  open,
  onClose,
  projectName,
  isSubmitting,
  onSubmit,
}: DeleteProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <EditorDialogPattern
        title="Delete project"
        description={`Are you sure you want to delete "${projectName}"? This action cannot be undone.`}
        footerActions={
          <div className="flex w-full items-center justify-end gap-2">
            <DialogClose
              render={<Button variant="outline" disabled={isSubmitting} />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        }
      />
    </Dialog>
  )
}
