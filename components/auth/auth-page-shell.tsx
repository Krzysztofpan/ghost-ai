import type { ReactNode } from "react"

import { AuthLeftPanel, type AuthLeftFeature } from "@/components/auth/auth-left-panel"

interface AuthPageShellProps {
  heading: string
  description: string
  features: AuthLeftFeature[]
  children: ReactNode
}

export function AuthPageShell({
  heading,
  description,
  features,
  children,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-base font-sans antialiased text-copy-primary">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        <AuthLeftPanel
          heading={heading}
          description={description}
          features={features}
        />

        <section className="flex items-center justify-center bg-base px-6 py-10 lg:px-10">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  )
}
