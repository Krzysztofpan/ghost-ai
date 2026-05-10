import { Liveblocks } from "@liveblocks/node"

const CURSOR_COLOR_PALETTE = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#2dd4bf",
  "#fb923c",
  "#f87171",
  "#4ade80",
  "#38bdf8",
  "#c084fc",
  "#facc15",
] as const

const globalForLiveblocks = globalThis as typeof globalThis & {
  liveblocks?: Liveblocks
}

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY
  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set")
  }
  return new Liveblocks({ secret })
}

/**
 * Cached Liveblocks Node client for server-side room and session APIs.
 */
export function getLiveblocks(): Liveblocks {
  return process.env.NODE_ENV === "production"
    ? createLiveblocksClientOnce()
    : (globalForLiveblocks.liveblocks ??= createLiveblocksClient())
}

let productionClient: Liveblocks | undefined

function createLiveblocksClientOnce(): Liveblocks {
  return (productionClient ??= createLiveblocksClient())
}

/**
 * Maps a Clerk user id to a stable accent color from a fixed palette.
 */
export function cursorColorForUserId(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return CURSOR_COLOR_PALETTE[hash % CURSOR_COLOR_PALETTE.length]
}
