import { SignIn } from "@clerk/nextjs"

import { AuthPageShell } from "@/components/auth/auth-page-shell"

export default function SignInPage() {
  return (
    <AuthPageShell
      heading="Design systems at the speed of thought."
      description="Describe your architecture in plain English. Ghost AI maps it to a shared canvas your whole team can refine in real time."
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
      <SignIn />
    </AuthPageShell>
  )
}
