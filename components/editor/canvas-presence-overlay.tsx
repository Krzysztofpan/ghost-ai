"use client"

import { UserButton, useUser } from "@clerk/nextjs"
import { useOther, useOthersConnectionIds, useOthersMapped } from "@liveblocks/react"
import { ViewportPortal } from "@xyflow/react"

import { cn } from "@/lib/utils"

const MAX_VISIBLE_COLLABORATORS = 5

interface CollaboratorPresence {
  id: string
  name: string
  avatar: string
  color: string
}

interface CursorPresence extends CollaboratorPresence {
  cursor: { x: number; y: number } | null
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

function sanitizeAvatarUrl(value: string): string | null {
  if (!value) return null

  try {
    const parsedUrl = new URL(value)
    const isHttpProtocol = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
    return isHttpProtocol ? parsedUrl.toString() : null
  } catch {
    return null
  }
}

function collaboratorPresenceEqual(prev: CollaboratorPresence, next: CollaboratorPresence): boolean {
  return (
    prev.id === next.id &&
    prev.name === next.name &&
    prev.avatar === next.avatar &&
    prev.color === next.color
  )
}

function cursorPresenceEqual(prev: CursorPresence, next: CursorPresence): boolean {
  return (
    collaboratorPresenceEqual(prev, next) &&
    prev.cursor?.x === next.cursor?.x &&
    prev.cursor?.y === next.cursor?.y
  )
}

function CollaboratorAvatar({ collaborator, className }: { collaborator: CollaboratorPresence; className?: string }) {
  const sanitizedAvatar = sanitizeAvatarUrl(collaborator.avatar)
  const label = collaborator.name || "Collaborator"

  return (
    <div
      aria-label={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-subtle text-xs font-semibold text-copy-secondary ring-2 ring-surface shadow-[0_8px_18px_rgba(0,0,0,0.32)]",
        className,
      )}
      title={label}
    >
      {sanitizedAvatar ? (
        <img src={sanitizedAvatar} alt='' className='h-full w-full object-cover' draggable={false} />
      ) : (
        initialsForName(label)
      )}
    </div>
  )
}

function ParticipantAvatarGroup({ currentUserId }: { currentUserId: string | null }) {
  const mappedCollaborators = useOthersMapped(
    (other) => ({
      id: other.id,
      name: other.info.name,
      avatar: other.info.avatar,
      color: other.info.color,
    }),
    collaboratorPresenceEqual,
  )

  const collaborators = mappedCollaborators.filter(([, collaborator]) => collaborator.id !== currentUserId)

  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_COLLABORATORS)
  const overflowCount = collaborators.length - visibleCollaborators.length
  const hasCollaborators = collaborators.length > 0

  return (
    <div className='nodrag nopan nowheel absolute top-4 right-4 z-20 flex items-center rounded-2xl border border-surface-border bg-surface/90 px-2.5 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.42)] backdrop-blur'>
      {hasCollaborators ? (
        <>
          <div className='flex -space-x-2 pr-1' aria-label='Active collaborators'>
            {visibleCollaborators.map(([connectionId, collaborator]) => (
              <CollaboratorAvatar key={connectionId} collaborator={collaborator} />
            ))}
            {overflowCount > 0 ? (
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-surface-border bg-elevated text-xs font-semibold text-copy-secondary ring-2 ring-surface'>
                +{overflowCount}
              </div>
            ) : null}
          </div>
          <div className='mx-2 h-6 w-px bg-surface-border' aria-hidden='true' />
        </>
      ) : null}
      <div className='flex h-8 w-8 items-center justify-center [&_.cl-avatarBox]:h-8 [&_.cl-avatarBox]:w-8'>
        <UserButton />
      </div>
    </div>
  )
}

function LiveCursor({ connectionId, currentUserId }: { connectionId: number; currentUserId: string | null }) {
  const participant = useOther(
    connectionId,
    (other) => ({
      id: other.id,
      name: other.info.name,
      avatar: other.info.avatar,
      color: other.info.color,
      cursor: other.presence.cursor,
    }),
    cursorPresenceEqual,
  )

  if (participant.id === currentUserId || !participant.cursor) {
    return null
  }

  const name = participant.name || "Collaborator"

  return (
    <div
      className='pointer-events-none absolute top-0 left-0 z-50'
      style={{
        transform: `translate(${participant.cursor.x}px, ${participant.cursor.y}px)`,
      }}
    >
      <svg
        width='18'
        height='18'
        viewBox='0 0 18 18'
        fill='none'
        className='drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]'
        aria-hidden='true'
      >
        <path
          d='M2.5 1.75 15.5 8.2 9.9 10.45 7.65 16.05 2.5 1.75Z'
          fill={participant.color}
          stroke='var(--bg-base)'
          strokeWidth='1.25'
          strokeLinejoin='round'
        />
      </svg>
      <div
        className='ml-4 -mt-1 rounded-xl px-2 py-1 text-xs font-medium text-background shadow-[0_8px_18px_rgba(0,0,0,0.35)]'
        style={{ backgroundColor: participant.color }}
      >
        {name}
      </div>
    </div>
  )
}

function LiveCursors({ currentUserId }: { currentUserId: string | null }) {
  const connectionIds = useOthersConnectionIds()

  return (
    <ViewportPortal>
      {connectionIds.map((connectionId) => (
        <LiveCursor key={connectionId} connectionId={connectionId} currentUserId={currentUserId} />
      ))}
    </ViewportPortal>
  )
}

export function CanvasPresenceOverlay() {
  const { user } = useUser()
  const currentUserId = user?.id ?? null

  return (
    <>
      <ParticipantAvatarGroup currentUserId={currentUserId} />
      <LiveCursors currentUserId={currentUserId} />
    </>
  )
}
