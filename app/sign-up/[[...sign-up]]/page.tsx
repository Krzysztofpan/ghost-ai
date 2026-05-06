import { SignUp } from "@clerk/nextjs"

import { AuthPageShell } from "@/components/auth/auth-page-shell"

export default function SignUpPage() {
  return (
    <AuthPageShell
      heading="Build architecture specs with your team, in one place."
      description="Move from rough idea to a structured system design with shared editing and AI-assisted generation."
      features={[
        {
          icon: "sparkles",
          title: "AI Architecture Generation",
          description:
            "Describe your system, AI maps it to nodes and edges on a live canvas.",
        },
        {
          icon: "users",
          title: "Real-time Collaboration",
          description:
            "Live cursors, presence indicators, and shared editing across your team.",
        },
        {
          icon: "file-text",
          title: "Instant Spec Generation",
          description:
            "Export a complete Markdown technical spec directly from the canvas graph.",
        },
      ]}
    >
      <SignUp />
    </AuthPageShell>
  )
}
