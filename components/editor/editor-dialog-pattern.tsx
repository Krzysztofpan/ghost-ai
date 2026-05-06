import type { ReactNode } from "react"

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EditorDialogPatternProps {
  title: string
  description: string
  footerActions: ReactNode
  children?: ReactNode
}

export function EditorDialogPattern({
  title,
  description,
  footerActions,
  children,
}: EditorDialogPatternProps) {
  return (
    <DialogContent className="rounded-3xl border border-surface-border bg-elevated p-6 text-copy-primary sm:max-w-md">
      <DialogHeader className="gap-1">
        <DialogTitle className="text-base text-copy-primary">{title}</DialogTitle>
        <DialogDescription className="text-copy-muted">
          {description}
        </DialogDescription>
      </DialogHeader>
      {children}
      <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl border-surface-border bg-subtle/70 px-6 py-4">
        {footerActions}
      </DialogFooter>
    </DialogContent>
  )
}
