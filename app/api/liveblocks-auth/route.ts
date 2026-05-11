import { auth, currentUser } from "@clerk/nextjs/server"

import {
  badRequestResponse,
  forbiddenResponse,
  internalServerErrorResponse,
  unauthorizedResponse,
} from "@/lib/http-responses"
import { cursorColorForUserId, getLiveblocks } from "@/lib/liveblocks"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"

type AuthBody = {
  room?: unknown
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return unauthorizedResponse()
  }

  const parsed = (await request.json().catch(() => null)) as AuthBody | null
  const roomId = typeof parsed?.room === "string" ? parsed.room.trim() : ""
  if (!roomId) {
    return badRequestResponse("Missing room")
  }

  const identity = await getCurrentIdentity()
  if (!identity) {
    return unauthorizedResponse()
  }

  const access = await getProjectAccess(roomId, identity)
  if (!access.hasAccess) {
    return forbiddenResponse()
  }

  let liveblocks
  try {
    liveblocks = getLiveblocks()
  } catch (error) {
    console.error("[liveblocks-auth] Liveblocks client unavailable:", error)
    return internalServerErrorResponse("Liveblocks is not configured")
  }

  try {
    await liveblocks.getOrCreateRoom(roomId, {
      defaultAccesses: [],
    })
  } catch (error) {
    console.error(`[liveblocks-auth] getOrCreateRoom failed for ${roomId}:`, error)
    return internalServerErrorResponse("Could not prepare collaboration room")
  }

  const user = await currentUser()
  const displayName =
    user?.fullName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "Anonymous"
  const avatar = user?.imageUrl ?? ""
  const color = cursorColorForUserId(userId)

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name: displayName,
      avatar,
      color,
    },
  })

  session.allow(roomId, session.FULL_ACCESS)
  session.allow(roomId, ["feeds:write"])

  const { status, body } = await session.authorize()
  return new Response(body, { status })
}
