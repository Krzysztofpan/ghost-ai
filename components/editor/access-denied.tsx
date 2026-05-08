import Link from "next/link"
import { Lock } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6 text-copy-primary">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-surface-border bg-surface p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-subtle text-copy-secondary">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold">You cannot access this workspace.</h1>
        <p className="text-sm text-copy-muted">
          The project does not exist or you do not have permission to view it.
        </p>
        <Link href="/editor" className={buttonVariants({ className: "mt-2" })}>
          Back to editor home
        </Link>
      </div>
    </main>
  )
}
