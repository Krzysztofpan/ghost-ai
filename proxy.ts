import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

function getRoutePattern(urlValue: string | undefined, fallback: string): string {
  if (!urlValue) {
    return `${fallback}(.*)`
  }

  try {
    const pathname = new URL(urlValue).pathname
    return `${pathname}(.*)`
  } catch {
    return `${urlValue}(.*)`
  }
}

const signInRoute = getRoutePattern(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  "/sign-in"
)
const signUpRoute = getRoutePattern(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  "/sign-up"
)

const isPublicRoute = createRouteMatcher(["/", signInRoute, signUpRoute])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
    })
  }
})

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
}
