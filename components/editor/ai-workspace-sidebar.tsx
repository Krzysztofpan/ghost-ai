"use client"

import { useUser } from "@clerk/nextjs"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useCreateFeed, useCreateFeedMessage, useFeedMessages } from "@liveblocks/react"
import { Bot, Download, Loader2, SendHorizontal, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { designAgentTask } from "@/src/trigger/design-agent"
import type { generateSpecTask } from "@/src/trigger/generate-spec"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  parseAiChatFeedPayload,
  parseAiStatusFeedPayload,
  type AiChatFeedPayload,
  type AiStatusFeedPayload,
} from "@/types/tasks"
import { cn } from "@/lib/utils"

const STARTER_PROMPTS = ["Design an e-commerce backend", "Create a chat app architecture", "Build a CI/CD pipeline"] as const

/** Trigger run statuses that mean the job has finished (success or failure). */
const TERMINAL_RUN_STATUSES = new Set([
  "COMPLETED",
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
])

function isTerminalRunStatus(status: string): boolean {
  return TERMINAL_RUN_STATUSES.has(status)
}

function formatChatTime(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  } catch {
    return ""
  }
}

function formatSpecCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return iso
  }
}

function statusLineForPayload(p: AiStatusFeedPayload): string {
  if (p.text) return p.text
  switch (p.phase) {
    case "start":
      return "Starting…"
    case "processing":
      return "Working…"
    case "complete":
      return "Complete"
    case "error":
      return "Something went wrong"
    default:
      return ""
  }
}

async function readApiErrorMessage(response: Response): Promise<string> {
  const raw = await response.text()
  try {
    const data: unknown = JSON.parse(raw)
    if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
      return (data as { error: string }).error
    }
  } catch {
    /* not JSON */
  }
  const trimmed = raw.trim()
  if (trimmed) return trimmed.slice(0, 280)
  return `Request failed (${response.status})`
}

interface AiWorkspaceSidebarProps {
  roomId: string
  open: boolean
  onClose: () => void
}

export function AiWorkspaceSidebar({ roomId, open, onClose }: AiWorkspaceSidebarProps) {
  const { user } = useUser()
  const [workspaceTab, setWorkspaceTab] = useState<"architect" | "specs">("architect")
  const [draft, setDraft] = useState("")
  const [isStartingDesign, setIsStartingDesign] = useState(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [runPublicToken, setRunPublicToken] = useState<string | null>(null)

  const [specs, setSpecs] = useState<{ id: string; createdAt: string; filename: string }[]>([])
  const [specsLoading, setSpecsLoading] = useState(false)
  const [specsError, setSpecsError] = useState<string | null>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSpecId, setPreviewSpecId] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewMarkdown, setPreviewMarkdown] = useState("")

  const [specActiveRunId, setSpecActiveRunId] = useState<string | null>(null)
  const [specRunToken, setSpecRunToken] = useState<string | null>(null)
  const [isStartingSpec, setIsStartingSpec] = useState(false)
  const [specGenError, setSpecGenError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const finalizedRunIdRef = useRef<string | null>(null)
  const hookErrorHandledRunIdRef = useRef<string | null>(null)
  const finalizedSpecRunIdRef = useRef<string | null>(null)
  const specHookErrorHandledRunIdRef = useRef<string | null>(null)

  const {
    nodes: flowNodes,
    edges: flowEdges,
    isLoading: flowStorageLoading,
  } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: false,
    nodes: { initial: [] },
    edges: { initial: [] },
  })

  const createFeed = useCreateFeed()
  const createFeedMessage = useCreateFeedMessage()
  const statusFeedState = useFeedMessages(AI_STATUS_FEED_ID)
  const chatFeedState = useFeedMessages(AI_CHAT_FEED_ID)

  const { run, error: realtimeError } = useRealtimeRun<typeof designAgentTask>(activeRunId ?? undefined, {
    accessToken: runPublicToken ?? undefined,
    enabled: Boolean(activeRunId && runPublicToken),
    id: activeRunId ?? "idle",
  })

  const { run: specRun, error: specRealtimeError } = useRealtimeRun<typeof generateSpecTask>(specActiveRunId ?? undefined, {
    accessToken: specRunToken ?? undefined,
    enabled: Boolean(specActiveRunId && specRunToken),
    id: specActiveRunId ?? "spec-idle",
  })

  useEffect(() => {
    void Promise.all([
      createFeed(AI_STATUS_FEED_ID, { metadata: { name: "AI status" } }),
      createFeed(AI_CHAT_FEED_ID, { metadata: { name: "AI chat" } }),
    ]).catch(() => undefined)
  }, [createFeed])

  const refreshSpecsList = useCallback(async () => {
    if (!roomId.trim()) return
    setSpecsLoading(true)
    setSpecsError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(roomId)}/specs`)
      if (!res.ok) {
        setSpecsError(await readApiErrorMessage(res))
        setSpecs([])
        return
      }
      const data: unknown = await res.json()
      const list =
        data && typeof data === "object" && "specs" in data && Array.isArray((data as { specs: unknown }).specs)
          ? (data as { specs: { id: string; createdAt: string; filename: string }[] }).specs
          : []
      setSpecs(list)
    } catch {
      setSpecsError("Could not load specs.")
      setSpecs([])
    } finally {
      setSpecsLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    if (!open || workspaceTab !== "specs" || !roomId.trim()) {
      return
    }
    void refreshSpecsList()
  }, [open, workspaceTab, roomId, refreshSpecsList])

  useEffect(() => {
    if (!previewOpen || !previewSpecId || !roomId.trim()) {
      return
    }
    const ac = new AbortController()
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewMarkdown("")
    void (async () => {
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(roomId)}/specs/${encodeURIComponent(previewSpecId)}/download`,
          { signal: ac.signal },
        )
        if (!res.ok) {
          setPreviewError(await readApiErrorMessage(res))
          return
        }
        const text = await res.text()
        setPreviewMarkdown(text)
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        setPreviewError("Could not load spec content.")
      } finally {
        setPreviewLoading(false)
      }
    })()
    return () => ac.abort()
  }, [previewOpen, previewSpecId, roomId])

  const closeSpecPreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewSpecId(null)
    setPreviewMarkdown("")
    setPreviewError(null)
    setPreviewLoading(false)
  }, [])

  const downloadSpecFile = useCallback(
    async (specId: string) => {
      if (!roomId.trim()) return
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(roomId)}/specs/${encodeURIComponent(specId)}/download`,
        )
        if (!res.ok) {
          const msg = await readApiErrorMessage(res)
          console.error("[downloadSpec]", msg)
          return
        }
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = objectUrl
        a.download = `spec-${specId}.md`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(objectUrl)
      } catch {
        console.error("[downloadSpec] failed")
      }
    },
    [roomId],
  )

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

  const latestAiStatus = useMemo((): AiStatusFeedPayload | null => {
    if (statusFeedState.isLoading || statusFeedState.error || !statusFeedState.messages?.length) {
      return null
    }
    const valid: AiStatusFeedPayload[] = []
    for (const m of statusFeedState.messages) {
      const parsed = parseAiStatusFeedPayload(m.data)
      if (parsed) valid.push(parsed)
    }
    if (valid.length === 0) return null
    valid.sort((a, b) => b.at - a.at)
    return valid[0] ?? null
  }, [statusFeedState])

  const chatMessages = useMemo((): { id: string; payload: AiChatFeedPayload }[] => {
    if (chatFeedState.isLoading || chatFeedState.error || !chatFeedState.messages?.length) {
      return []
    }
    const out: { id: string; payload: AiChatFeedPayload }[] = []
    for (const m of chatFeedState.messages) {
      const parsed = parseAiChatFeedPayload(m.data)
      if (parsed) out.push({ id: m.id, payload: parsed })
    }
    out.sort((a, b) => a.payload.timestamp - b.payload.timestamp)
    return out
  }, [chatFeedState])

  const senderLabel = useMemo(() => {
    const name = user?.fullName?.trim()
    if (name) return name
    const email = user?.primaryEmailAddress?.emailAddress?.trim()
    if (email) return email
    return "You"
  }, [user])

  const pushAssistantMessage = useCallback(
    async (content: string) => {
      await createFeedMessage(AI_CHAT_FEED_ID, {
        sender: "Ghost AI",
        role: "assistant",
        content,
        timestamp: Date.now(),
      })
    },
    [createFeedMessage],
  )

  /** Subscribe errors: surface in chat and release the composer. */
  useEffect(() => {
    if (!realtimeError || !activeRunId) return
    if (hookErrorHandledRunIdRef.current === activeRunId) return
    hookErrorHandledRunIdRef.current = activeRunId
    void (async () => {
      try {
        await pushAssistantMessage(`Could not track run status: ${realtimeError.message}`)
      } finally {
        setActiveRunId(null)
        setRunPublicToken(null)
      }
    })()
  }, [realtimeError, activeRunId, pushAssistantMessage])

  /** Terminal run: final assistant line + reset local run state. */
  useEffect(() => {
    if (!activeRunId || !run?.id || run.id !== activeRunId) return
    if (!run.status || !run.finishedAt) return
    if (!isTerminalRunStatus(run.status)) return
    if (finalizedRunIdRef.current === run.id) return
    finalizedRunIdRef.current = run.id

    void (async () => {
      try {
        if (run.status === "COMPLETED") {
          const output = run.output as { ok?: boolean; summary?: string } | undefined
          const summary = typeof output?.summary === "string" ? output.summary.trim() : ""
          const line = summary ? `Design applied: ${summary}` : "Design update applied to the canvas."
          await pushAssistantMessage(line)
        } else {
          const errMsg =
            run.error && typeof run.error === "object" && "message" in run.error && typeof (run.error as { message?: unknown }).message === "string"
              ? (run.error as { message: string }).message
              : `Design run ended with status ${run.status}.`
          await pushAssistantMessage(errMsg)
        }
      } finally {
        setActiveRunId(null)
        setRunPublicToken(null)
      }
    })()
  }, [activeRunId, run, pushAssistantMessage])

  /** Spec generation: realtime subscription errors. */
  useEffect(() => {
    if (!specRealtimeError || !specActiveRunId) return
    if (specHookErrorHandledRunIdRef.current === specActiveRunId) return
    specHookErrorHandledRunIdRef.current = specActiveRunId
    setSpecGenError(`Could not track run: ${specRealtimeError.message}`)
    setSpecActiveRunId(null)
    setSpecRunToken(null)
  }, [specRealtimeError, specActiveRunId])

  /** Spec generation: terminal run → refresh list + assistant line. */
  useEffect(() => {
    if (!specActiveRunId || !specRun?.id || specRun.id !== specActiveRunId) return
    if (!specRun.status || !specRun.finishedAt) return
    if (!isTerminalRunStatus(specRun.status)) return
    if (finalizedSpecRunIdRef.current === specRun.id) return
    finalizedSpecRunIdRef.current = specRun.id

    void (async () => {
      try {
        if (specRun.status === "COMPLETED") {
          const output = specRun.output as { specId?: string } | undefined
          const sid = typeof output?.specId === "string" ? output.specId.trim() : ""
          await pushAssistantMessage(sid ? `Specification saved (${sid.slice(0, 8)}…). Open Specs to preview or download.` : "Specification generated and saved.")
          await refreshSpecsList()
        } else {
          const errMsg =
            specRun.error && typeof specRun.error === "object" && "message" in specRun.error && typeof (specRun.error as { message?: unknown }).message === "string"
              ? (specRun.error as { message: string }).message
              : `Spec generation ended with status ${specRun.status}.`
          setSpecGenError(errMsg)
          await pushAssistantMessage(errMsg)
        }
      } finally {
        setSpecActiveRunId(null)
        setSpecRunToken(null)
      }
    })()
  }, [specActiveRunId, specRun, pushAssistantMessage, refreshSpecsList])

  const submitGenerateSpec = async () => {
    if (!roomId.trim() || flowStorageLoading) return

    setSpecGenError(null)
    setIsStartingSpec(true)
    try {
      const nodesPayload = JSON.parse(JSON.stringify(flowNodes ?? [])) as Record<string, unknown>[]
      const edgesPayload = JSON.parse(JSON.stringify(flowEdges ?? [])) as Record<string, unknown>[]
      const chatHistory = chatMessages.map((m) => m.payload)

      const specRes = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          chatHistory,
          nodes: nodesPayload,
          edges: edgesPayload,
        }),
      })

      if (!specRes.ok) {
        const msg = await readApiErrorMessage(specRes)
        setSpecGenError(msg)
        return
      }

      const specJson: unknown = await specRes.json()
      const runId =
        specJson && typeof specJson === "object" && "runId" in specJson && typeof (specJson as { runId: unknown }).runId === "string"
          ? (specJson as { runId: string }).runId
          : null

      if (!runId) {
        setSpecGenError("Invalid response from spec API (missing runId).")
        return
      }

      const tokenRes = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })

      if (!tokenRes.ok) {
        const msg = await readApiErrorMessage(tokenRes)
        setSpecGenError(msg)
        return
      }

      const tokenJson: unknown = await tokenRes.json()
      const token =
        tokenJson && typeof tokenJson === "object" && "token" in tokenJson && typeof (tokenJson as { token: unknown }).token === "string"
          ? (tokenJson as { token: string }).token
          : null

      if (!token) {
        setSpecGenError("Could not obtain a realtime token for this run.")
        return
      }

      finalizedSpecRunIdRef.current = null
      specHookErrorHandledRunIdRef.current = null
      setSpecActiveRunId(runId)
      setSpecRunToken(token)
    } catch {
      setSpecGenError("Something went wrong while starting spec generation.")
    } finally {
      setIsStartingSpec(false)
    }
  }

  const submitDesignPrompt = async () => {
    const trimmed = draft.trim()
    if (!trimmed || !roomId.trim()) return

    setIsStartingDesign(true)
    try {
      await createFeedMessage(AI_CHAT_FEED_ID, {
        sender: senderLabel,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      })
      setDraft("")
      requestAnimationFrame(() => adjustTextareaHeight())

      const designRes = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          roomId,
          projectId: roomId,
        }),
      })

      if (!designRes.ok) {
        const msg = await readApiErrorMessage(designRes)
        await pushAssistantMessage(msg)
        return
      }

      const designJson: unknown = await designRes.json()
      const runId =
        designJson && typeof designJson === "object" && "runId" in designJson && typeof (designJson as { runId: unknown }).runId === "string"
          ? (designJson as { runId: string }).runId
          : null

      if (!runId) {
        await pushAssistantMessage("Invalid response from design API (missing runId).")
        return
      }

      const tokenRes = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })

      if (!tokenRes.ok) {
        const msg = await readApiErrorMessage(tokenRes)
        await pushAssistantMessage(msg)
        return
      }

      const tokenJson: unknown = await tokenRes.json()
      const token =
        tokenJson && typeof tokenJson === "object" && "token" in tokenJson && typeof (tokenJson as { token: unknown }).token === "string"
          ? (tokenJson as { token: string }).token
          : null

      if (!token) {
        await pushAssistantMessage("Could not obtain a realtime token for this run.")
        return
      }

      finalizedRunIdRef.current = null
      hookErrorHandledRunIdRef.current = null
      setActiveRunId(runId)
      setRunPublicToken(token)
    } catch {
      await pushAssistantMessage("Something went wrong while starting the design run.")
    } finally {
      setIsStartingDesign(false)
    }
  }

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return
    e.preventDefault()
    void submitDesignPrompt()
  }

  const designRunBusy = Boolean(activeRunId)
  const runInFlight =
    isStartingDesign ||
    designRunBusy ||
    Boolean(run && run.status && !isTerminalRunStatus(run.status))

  const showStatusStrip = isStartingDesign || designRunBusy
  const statusStripLine = latestAiStatus
    ? statusLineForPayload(latestAiStatus)
    : isStartingDesign
      ? "Starting…"
      : designRunBusy
        ? "Working…"
        : ""

  const composerDisabled = !draft.trim() || runInFlight || !roomId.trim()

  const specRunBusy = Boolean(specActiveRunId)
  const specRunInFlight =
    isStartingSpec ||
    specRunBusy ||
    Boolean(specRun && specRun.status && !isTerminalRunStatus(specRun.status))

  const showSpecsStatusStrip = workspaceTab === "specs" && specRunInFlight
  const specsStatusLine = isStartingSpec
    ? "Starting…"
    : typeof specRun?.metadata?.status === "string"
      ? String(specRun.metadata.status)
      : specRunBusy
        ? "Generating specification…"
        : ""

  const generateSpecDisabled =
    !roomId.trim() || flowStorageLoading || specRunInFlight || flowNodes == null || flowEdges == null

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
          <div className='flex items-center gap-2'>
            <h2 className='text-sm font-semibold text-primary-text'>AI Workspace</h2>
          </div>
          <p className='text-xs text-muted-text'>Collaborate with Ghost AI</p>
        </div>
        <Button type='button' variant='ghost' size='icon-sm' onClick={onClose} aria-label='Close AI sidebar' className='shrink-0 text-muted-text hover:bg-subtle hover:text-primary-text'>
          <X className='h-4 w-4' />
        </Button>
      </header>

      <Tabs value={workspaceTab} onValueChange={(v) => setWorkspaceTab(v as "architect" | "specs")} className='flex min-h-0 flex-1 flex-col'>
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
          {statusFeedState.isLoading ? <p className='mb-2 text-xs text-muted-text'>Loading activity…</p> : null}
          {statusFeedState.error ? <p className='mb-2 text-xs text-red-400'>Could not load activity feed.</p> : null}
          {chatFeedState.error ? <p className='mb-2 text-xs text-red-400'>Could not load chat.</p> : null}

          <ScrollArea className='min-h-0 flex-1 rounded-xl'>
            <div className='pr-3 pb-3'>
              {chatFeedState.isLoading ? (
                <p className='py-6 text-center text-xs text-muted-text'>Loading chat…</p>
              ) : chatMessages.length === 0 ? (
                <div className='flex flex-col items-center gap-4 px-1 pt-2 pb-4 text-center'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-elevated'>
                    <Bot className='h-7 w-7 text-brand-ai-text' aria-hidden />
                  </div>
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-primary-text'>Describe what you want to build</p>
                    <p className='text-xs text-muted-text'>Submit a prompt to run the design agent. Messages sync for everyone with access.</p>
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
                  {chatMessages.map(({ id, payload }) => {
                    const isUserRole = payload.role === "user"
                    const isAssistant = payload.role === "assistant"
                    return (
                      <li key={id} className={cn("flex", isUserRole ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "w-full max-w-[95%] rounded-2xl border px-3 py-2 text-sm leading-relaxed wrap-break-word sm:max-w-[85%]",
                            isAssistant
                              ? "border-surface-border bg-elevated text-copy-primary"
                              : isUserRole
                                ? "border border-[#062822]/40 bg-[#62C073] text-[#080809]"
                                : "border border-surface-border bg-subtle/80 text-copy-primary",
                          )}
                        >
                          <div className='mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-text'>
                            <span
                              className={cn(
                                "font-medium",
                                isUserRole ? "text-[#062822]/90" : isAssistant ? "text-secondary-text" : "text-secondary-text",
                              )}
                            >
                              {payload.sender}
                            </span>
                            <time className='shrink-0 tabular-nums' dateTime={new Date(payload.timestamp).toISOString()}>
                              {formatChatTime(payload.timestamp)}
                            </time>
                          </div>
                          <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", isUserRole ? "text-[#080809]" : undefined)}>{payload.content}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </ScrollArea>

          <div className='mt-3 shrink-0 space-y-2 border-t border-surface-border pt-3'>
            {showStatusStrip ? (
              <div
                className='flex items-center gap-2 rounded-xl border border-[#62C073]/35 bg-elevated px-3 py-2 shadow-[inset_0_0_0_1px_rgba(98,192,115,0.12)]'
                aria-live='polite'
              >
                <span className='relative flex h-2 w-2 shrink-0'>
                  <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-[#62C073]/45 opacity-60' />
                  <span className='relative inline-flex h-2 w-2 rounded-full bg-[#62C073]' />
                </span>
                <p className='min-w-0 flex-1 text-xs leading-snug text-copy-secondary'>{statusStripLine}</p>
                <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin text-[#62C073]' aria-hidden />
              </div>
            ) : null}

            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder='Describe what to design…'
              rows={1}
              disabled={runInFlight}
              className='min-h-[72px] max-h-[160px] resize-none overflow-y-auto rounded-xl border-surface-border bg-elevated/80 py-2.5 text-copy-primary placeholder:text-muted-text disabled:opacity-60'
            />
            <div className='flex justify-end'>
              <Button
                type='button'
                size='sm'
                onClick={() => void submitDesignPrompt()}
                disabled={composerDisabled}
                className={cn(
                  "gap-1.5 bg-[#62C073] text-[#080809] hover:bg-[#62C073]/90",
                  "disabled:bg-muted disabled:text-muted-text disabled:opacity-70",
                )}
              >
                {runInFlight ? <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden /> : null}
                Send
                {!runInFlight ? <SendHorizontal className='h-3.5 w-3.5' /> : null}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value='specs' className='mt-0 flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-3'>
          <Button
            type='button'
            className='w-full shrink-0 bg-brand text-white hover:bg-brand/90 disabled:opacity-60'
            disabled={generateSpecDisabled}
            onClick={() => void submitGenerateSpec()}
          >
            {specRunInFlight ? <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden /> : null}
            Generate Spec
          </Button>

          {flowStorageLoading ? <p className='shrink-0 text-xs text-muted-text'>Syncing canvas…</p> : null}

          {showSpecsStatusStrip ? (
            <div
              className='flex items-center gap-2 rounded-xl border border-brand/35 bg-elevated px-3 py-2 shadow-[inset_0_0_0_1px_rgba(0,200,212,0.12)]'
              aria-live='polite'
            >
              <span className='relative flex h-2 w-2 shrink-0'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/45 opacity-60' />
                <span className='relative inline-flex h-2 w-2 rounded-full bg-brand' />
              </span>
              <p className='min-w-0 flex-1 text-xs leading-snug text-copy-secondary'>{specsStatusLine}</p>
              <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin text-brand' aria-hidden />
            </div>
          ) : null}

          {specGenError ? <p className='shrink-0 text-xs text-red-400'>{specGenError}</p> : null}

          {specsError ? <p className='shrink-0 text-xs text-red-400'>{specsError}</p> : null}

          <ScrollArea className='min-h-0 flex-1 rounded-xl border border-surface-border'>
            <div className='p-1 pr-2'>
              {specsLoading ? (
                <div className='flex items-center justify-center gap-2 py-8 text-xs text-muted-text'>
                  <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                  Loading specs…
                </div>
              ) : specs.length === 0 ? (
                <p className='px-2 py-6 text-center text-xs text-muted-text'>No specs for this project yet.</p>
              ) : (
                <ul className='flex flex-col gap-0.5'>
                  {specs.map((s) => (
                    <li key={s.id}>
                      <div className='flex items-stretch gap-0.5 rounded-lg hover:bg-subtle/80'>
                        <button
                          type='button'
                          onClick={() => {
                            setPreviewSpecId(s.id)
                            setPreviewOpen(true)
                          }}
                          className='min-w-0 flex-1 px-2.5 py-2 text-left transition-colors'
                        >
                          <div className='truncate text-xs font-medium text-primary-text'>{s.filename}</div>
                          <div className='mt-0.5 text-[11px] tabular-nums text-muted-text'>{formatSpecCreatedAt(s.createdAt)}</div>
                        </button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon-sm'
                          className='shrink-0 self-center text-muted-text hover:text-primary-text'
                          aria-label={`Download ${s.filename}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            void downloadSpecFile(s.id)
                          }}
                        >
                          <Download className='h-3.5 w-3.5' />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog
        open={previewOpen}
        onOpenChange={(next) => {
          if (!next) closeSpecPreview()
        }}
      >
        <DialogContent
          showCloseButton
          className='max-h-[85vh] w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl'
        >
          <DialogHeader className='border-b border-surface-border px-4 pt-4 pb-3'>
            <DialogTitle className='pr-8 font-mono text-sm text-primary-text'>
              {previewSpecId ? `spec-${previewSpecId}.md` : "Spec preview"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className='max-h-[min(60vh,520px)] px-4'>
            <div className='pb-4'>
              {previewLoading ? (
                <div className='flex items-center gap-2 py-10 text-sm text-muted-text'>
                  <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                  Loading…
                </div>
              ) : previewError ? (
                <p className='py-6 text-sm text-red-400'>{previewError}</p>
              ) : (
                <div
                  className={cn(
                    "markdown-preview max-w-none pb-2 text-sm leading-relaxed text-copy-primary",
                    "[&_a]:text-brand [&_blockquote]:border-l-2 [&_blockquote]:border-surface-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]",
                    "[&_h1]:mt-4 [&_h1]:first:mt-0 [&_h1]:text-base [&_h1]:font-semibold",
                    "[&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-primary-text",
                    "[&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-primary-text",
                    "[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
                    "[&_pre]:my-3 [&_pre]:max-h-[320px] [&_pre]:overflow-x-auto [&_pre]:overflow-y-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-surface-border [&_pre]:bg-subtle [&_pre]:p-3",
                    "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
                    "[&_td]:border [&_td]:border-surface-border [&_td]:px-2 [&_td]:py-1.5",
                    "[&_th]:border [&_th]:border-surface-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left",
                  )}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewMarkdown}</ReactMarkdown>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className='flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-surface-border bg-elevated/50 px-4 py-3'>
            <DialogClose render={<Button type='button' variant='outline' size='sm' className='border-surface-border' />}>Close</DialogClose>
            <Button
              type='button'
              size='sm'
              className='gap-1.5 bg-brand text-white hover:bg-brand/90'
              disabled={!previewSpecId || previewLoading || Boolean(previewError)}
              onClick={() => {
                if (previewSpecId) void downloadSpecFile(previewSpecId)
              }}
            >
              <Download className='h-3.5 w-3.5' />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
