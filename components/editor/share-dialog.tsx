"use client"

import { Copy, Loader2, Trash2, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EditorDialogPattern } from "@/components/editor/editor-dialog-pattern"
import type { CollaboratorListItem } from "@/hooks/use-share-dialog"

interface ShareDialogProps {
  open: boolean
  canManageAccess: boolean
  isLoading: boolean
  isSubmitting: boolean
  inviteEmail: string
  collaborators: CollaboratorListItem[]
  copyFeedback: "idle" | "copied"
  error: string | null
  onOpenChange: (open: boolean) => void
  onInviteEmailChange: (value: string) => void
  onInvite: () => void
  onRemove: (email: string) => void
  onCopyLink: () => void
}

function AvatarFallback({ name, email }: { name: string | null; email: string }) {
  const initial = (name ?? email).charAt(0).toUpperCase()
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border bg-subtle text-xs font-semibold text-copy-secondary">
      {initial || <UserRound className="h-4 w-4" />}
    </div>
  )
}

function AvatarImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="h-8 w-8 rounded-full border border-surface-border bg-cover bg-center"
      style={{ backgroundImage: `url("${src}")` }}
    />
  )
}

export function ShareDialog({
  open,
  canManageAccess,
  isLoading,
  isSubmitting,
  inviteEmail,
  collaborators,
  copyFeedback,
  error,
  onOpenChange,
  onInviteEmailChange,
  onInvite,
  onRemove,
  onCopyLink,
}: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditorDialogPattern
        title="Share project"
        description={
          canManageAccess
            ? "Invite collaborators by email and manage access."
            : "You have read-only access to collaborators for this project."
        }
        footerActions={
          <div className="flex w-full items-center justify-end gap-2">
            {canManageAccess && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCopyLink}
                disabled={isLoading || isSubmitting}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                {copyFeedback === "copied" ? "Copied!" : "Copy link"}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {canManageAccess && (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-copy-secondary uppercase">
                Invite collaborator
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => onInviteEmailChange(event.target.value)}
                  placeholder="name@company.com"
                  disabled={isSubmitting}
                  className="bg-surface text-copy-primary"
                />
                <Button type="button" onClick={onInvite} disabled={isSubmitting || inviteEmail.trim().length === 0}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-copy-secondary uppercase">
              Collaborators
            </p>

            {isLoading ? (
              <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-surface-border-subtle bg-surface text-copy-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : collaborators.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border-subtle bg-surface px-4 py-6 text-sm text-copy-muted">
                No collaborators yet.
              </div>
            ) : (
              <div className="max-h-60 space-y-2 overflow-auto pr-1">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.email}
                    className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {collaborator.avatarUrl ? (
                        <AvatarImage
                          src={collaborator.avatarUrl}
                          alt={collaborator.name ?? collaborator.email}
                        />
                      ) : (
                        <AvatarFallback name={collaborator.name} email={collaborator.email} />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm text-copy-primary">
                          {collaborator.name ?? collaborator.email}
                        </p>
                        {collaborator.name && (
                          <p className="truncate text-xs text-copy-muted">{collaborator.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {collaborator.isOwner && (
                        <span className="rounded-lg bg-accent-dim px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">
                          Owner
                        </span>
                      )}
                      {canManageAccess && !collaborator.isOwner && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Remove ${collaborator.email}`}
                          onClick={() => onRemove(collaborator.email)}
                          disabled={isSubmitting}
                          className="text-copy-muted hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </EditorDialogPattern>
    </Dialog>
  )
}
