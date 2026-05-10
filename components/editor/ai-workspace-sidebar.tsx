"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { Bot, Download, FileText, SendHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ChatRole = "user" | "assistant"

interface ChatLine {
  id: string
  role: ChatRole
  body: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const

interface AiWorkspaceSidebarProps {
  open: boolean
  onClose: () => void
}

export function AiWorkspaceSidebar({ open, onClose }: AiWorkspaceSidebarProps) {
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<ChatLine[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const next = Math.min(Math.max(el.scrollHeight, 72), 160)
    el.style.height = `${next}px`
  }, [])

  useLayoutEffect(() => {
    adjustTextareaHeight()
  }, [draft, adjustTextareaHeight])

  const send = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    setMessages((prev) => [...prev, { id: `${Date.now()}-user`, role: "user", body: trimmed }])
    setDraft("")
    requestAnimationFrame(() => adjustTextareaHeight())
  }

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return
    e.preventDefault()
    send()
  }

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed top-18 right-4 bottom-4 z-20 hidden min-h-0 w-80 flex-col overflow-hidden rounded-2xl border border-surface-border bg-base/95 shadow-[0_0_0_1px_rgba(0,200,212,0.12),0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-transform duration-300 ease-out md:flex",
        open ? "translate-x-0" : "pointer-events-none translate-x-full",
      )}
    >
      <header className='flex shrink-0 items-start gap-3 border-b border-surface-border px-4 py-3'>
        <div className='mt-0.5 shrink-0'>
          <Bot className='h-4 w-4 text-brand' aria-hidden />
        </div>
        <div className='min-w-0 flex-1'>
          <h2 className='text-sm font-semibold text-primary-text'>AI Workspace</h2>
          <p className='text-xs text-muted-text'>Collaborate with Ghost AI</p>
        </div>
        <Button type='button' variant='ghost' size='icon-sm' onClick={onClose} aria-label='Close AI sidebar' className='shrink-0 text-muted-text hover:bg-subtle hover:text-primary-text'>
          <X className='h-4 w-4' />
        </Button>
      </header>

      <Tabs defaultValue='architect' className='flex min-h-0 flex-1 flex-col'>
        <div className='shrink-0 px-4 pt-3'>
          <TabsList className='grid w-full grid-cols-2 gap-1 rounded-xl bg-subtle p-1 group-data-horizontal/tabs:h-auto group-data-horizontal/tabs:min-h-0'>
            <TabsTrigger
              value='architect'
              className='h-auto min-h-10 w-full min-w-0 rounded-lg px-3 py-2.5 text-center text-sm text-muted-text shadow-none transition-colors hover:text-primary-text data-active:bg-accent data-active:text-accent data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-accent dark:data-active:text-accent'
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value='specs'
              className='h-auto min-h-10 w-full min-w-0 rounded-lg px-3 py-2.5 text-center text-sm text-muted-text shadow-none transition-colors hover:text-primary-text data-active:bg-accent data-active:text-accent data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-accent dark:data-active:text-accent'
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='architect' className='mt-0 flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3'>
          <ScrollArea className='min-h-0 flex-1 rounded-xl'>
            <div className='pr-3 pb-3'>
              {messages.length === 0 ? (
                <div className='flex flex-col items-center gap-4 px-1 pt-2 pb-4 text-center'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-elevated'>
                    <Bot className='h-7 w-7 text-brand-ai-text' aria-hidden />
                  </div>
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-primary-text'>Describe what you want to build</p>
                    <p className='text-xs text-muted-text'>Ghost AI helps you shape architecture and specs right inside your workspace.</p>
                  </div>
                  <div className='flex w-full flex-col gap-2'>
                    {STARTER_PROMPTS.map((label) => (
                      <button
                        key={label}
                        type='button'
                        onClick={() => setDraft(label)}
                        className='rounded-full bg-subtle px-3 py-2 text-left text-xs font-medium text-accent-text transition-colors hover:bg-subtle/80'
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ul className='flex flex-col gap-3'>
                  {messages.map((m) => (
                    <li key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed wrap-break-word",
                          m.role === "user"
                            ? "border-2 border-brand/50 bg-brand-dim text-copy-primary"
                            : "border border-surface-border bg-elevated text-accent-text",
                        )}
                      >
                        {m.body}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ScrollArea>

          <div className='mt-3 shrink-0 space-y-2 border-t border-surface-border pt-3'>
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder='Ask Ghost AI…'
              rows={1}
              className='min-h-[72px] max-h-[160px] resize-none overflow-y-auto rounded-xl border-surface-border bg-elevated/80 py-2.5 text-copy-primary placeholder:text-muted-text'
            />
            <div className='flex justify-end'>
              <Button type='button' size='sm' onClick={send} disabled={!draft.trim()} className='gap-1.5 bg-brand text-white hover:bg-brand/90 disabled:bg-muted disabled:text-muted-text'>
                Send
                <SendHorizontal className='h-3.5 w-3.5' />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value='specs' className='mt-0 flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 pt-3'>
          <Button type='button' className='w-full bg-brand text-white hover:bg-brand/90'>
            Generate Spec
          </Button>
          <div className='rounded-2xl border border-surface-border bg-elevated p-4'>
            <div className='flex gap-3'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-border-subtle bg-subtle'>
                <FileText className='h-5 w-5 text-accent-text' aria-hidden />
              </div>
              <div className='min-w-0 flex-1 space-y-1'>
                <p className='text-sm font-semibold text-primary-text'>API Gateway specification</p>
                <p className='text-xs leading-relaxed text-muted-text'>Defines routing, auth middleware, rate limits, and upstream service map for the public edge layer.</p>
              </div>
            </div>
            <div className='mt-4 flex justify-end border-t border-surface-border-subtle pt-3'>
              <Button type='button' variant='outline' size='sm' disabled className='gap-1.5 border-surface-border text-muted-text'>
                <Download className='h-3.5 w-3.5' />
                Download
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
