import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/ui/themes"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Ghost AI",
  description: "Real-time collaborative system design workspace",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='min-h-full flex flex-col'>
        <ClerkProvider
          signInUrl='/sign-in'
          signUpUrl='/sign-up'
          signInForceRedirectUrl='/editor'
          signInFallbackRedirectUrl='/editor'
          signUpForceRedirectUrl='/editor'
          signUpFallbackRedirectUrl='/editor'
          afterSignOutUrl='/sign-in'
          appearance={{
            theme: dark,
            variables: {
              colorBackground: "var(--bg-surface)",
              colorInput: "var(--bg-elevated)",
              colorInputForeground: "var(--text-primary)",
              colorForeground: "var(--text-primary)",
              colorMutedForeground: "var(--text-secondary)",
              colorNeutral: "var(--text-muted)",
              colorBorder: "var(--border-default)",
              colorPrimary: "var(--accent-primary)",
              colorDanger: "var(--state-error)",
              colorSuccess: "var(--state-success)",
              borderRadius: "0.875rem",
            },
            elements: {
              cardBox: {
                boxShadow: "0 0 0 1px rgba(0,200,212,0.2), 0 0 42px rgba(0,200,212,0.35)",
                borderRadius: "0.875rem",
              },
              card: {
                backgroundColor: "var(--bg-base)",
                borderColor: "var(--border-subtle)",
                borderWidth: "1px",
                boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.5), 0 14px 24px -18px rgba(255,255,255,0.4)",
              },
              formFieldInput: {
                borderColor: "var(--border-subtle)",
                borderWidth: "1px",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.22)",
              },
              socialButtonsBlockButton: {
                borderColor: "var(--border-subtle)",
                borderWidth: "1px",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.22)",
              },
              socialButtonsIconButton: {
                borderColor: "var(--border-subtle)",
                borderWidth: "1px",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.22)",
              },
              dividerLine: {
                backgroundColor: "var(--border-subtle)",
              },
              formButtonPrimary: {
                backgroundColor: "var(--accent-primary)",
                color: "var(--bg-base)",
              },
              footerActionLink: {
                color: "var(--accent-primary)",
              },
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
