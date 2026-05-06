import { FileText, Sparkles, Users } from "lucide-react"

export interface AuthLeftFeature {
  title: string
  description: string
  icon: "sparkles" | "users" | "file-text"
}

interface AuthLeftPanelProps {
  heading: string
  description: string
  features: AuthLeftFeature[]
  iconSize?: "sm" | "md"
}

function FeatureIcon({
  icon,
  className,
}: {
  icon: AuthLeftFeature["icon"]
  className: string
}) {
  if (icon === "sparkles") {
    return <Sparkles className={`${className} text-brand`} />
  }

  if (icon === "users") {
    return <Users className={`${className} text-brand`} />
  }

  return <FileText className={`${className} text-brand`} />
}

export function AuthLeftPanel({
  heading,
  description,
  features,
  iconSize = "md",
}: AuthLeftPanelProps) {
  const iconClass = iconSize === "sm" ? "h-4 w-4" : "h-5 w-5"

  return (
    <section className="hidden border-r border-surface-border bg-surface lg:flex">
      <div className="flex h-full w-full flex-col justify-between px-12 py-10 text-left lg:pl-14 lg:pr-8">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-brand" />
          <p className="text-xs font-semibold tracking-[0.2em] text-copy-primary uppercase">
            Ghost AI
          </p>
        </div>

        <div className="max-w-md">
          <p className="max-w-sm text-[2.3rem] font-semibold leading-tight tracking-tight">
            {heading}
          </p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-copy-muted">
            {description}
          </p>

          <ul className="mt-10 space-y-5">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch gap-x-5 gap-y-0"
              >
                <span className="flex shrink-0 self-stretch">
                  <span className="flex aspect-square h-full min-h-[2.75rem] w-auto items-center justify-center rounded-2xl bg-accent-dim/70">
                    <FeatureIcon icon={feature.icon} className={iconClass} />
                  </span>
                </span>
                <div className="flex min-w-0 flex-col justify-center whitespace-nowrap">
                  <p className="truncate text-base leading-tight font-medium text-copy-primary">
                    {feature.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-copy-faint">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-faint">© 2026 Ghost AI. All rights reserved.</p>
      </div>
    </section>
  )
}
