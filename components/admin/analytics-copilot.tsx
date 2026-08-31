"use client"

import { FormEvent, useMemo, useState } from "react"
import { BarChart3, Check, Copy, LoaderCircle, Send, Sparkles } from "lucide-react"
import type { AnalyticsCopilotScope } from "@/lib/analytics-copilot"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

const SCOPE_CONTENT: Record<AnalyticsCopilotScope, {
  description: string
  prompts: string[]
}> = {
  overview: {
    description: "Turn the selected period into a clear founder report using only the decision-workspace and engagement data already collected.",
    prompts: [
      "Create an executive performance report for this period.",
      "What changed versus the previous period, and what should I watch?",
      "What is the clearest next experiment from this overview?",
    ],
  },
  geo: {
    description: "Interpret country and device patterns carefully, separating event volume from identifiable visitor behaviour.",
    prompts: [
      "Explain the country and device mix for this period.",
      "Are there any data-quality concerns in the geographic or device data?",
      "What should I investigate before changing the mobile experience?",
    ],
  },
  events: {
    description: "Find meaningful engagement and product-action patterns without exposing individual visitor records.",
    prompts: [
      "Create an event activity report for this period.",
      "Which events show the strongest intent, and which are weak?",
      "What telemetry gap would make these insights more useful?",
    ],
  },
}

function renderReport(content: string) {
  return content.split("\n").map((line, index) => {
    const key = `${index}-${line.slice(0, 20)}`
    if (line.startsWith("## ")) {
      return <h4 key={key} className="mt-4 text-sm font-semibold text-foreground first:mt-0">{line.slice(3)}</h4>
    }
    if (line.startsWith("- ")) {
      return <li key={key} className="ml-4 list-disc pl-1 text-sm leading-6 text-muted-foreground">{line.slice(2)}</li>
    }
    if (!line.trim()) return <div key={key} className="h-2" aria-hidden="true" />
    return <p key={key} className="text-sm leading-6 text-muted-foreground">{line}</p>
  })
}

export function AnalyticsCopilot({
  scope,
  days,
  defaultOpen = false,
}: {
  scope: AnalyticsCopilotScope
  days: 7 | 30 | 90
  defaultOpen?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null)
  const content = useMemo(() => SCOPE_CONTENT[scope], [scope])

  const submit = async (prompt: string) => {
    const trimmed = prompt.trim().slice(0, 1_200)
    if (!trimmed || isSending) return

    const nextMessages: Message[] = [
      ...messages.slice(-8),
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ]
    setMessages(nextMessages)
    setInput("")
    setError(null)
    setIsSending(true)

    try {
      const response = await fetch("/api/admin/analytics-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          days,
          scope,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      })

      if (response.status === 401) {
        window.location.assign("/sign-in?next=/namo-metrics-x7k9")
        return
      }

      const body = await response.json().catch(() => ({}))
      if (!response.ok || typeof body.answer !== "string") {
        throw new Error(typeof body.error === "string" ? body.error : "Analytics Copilot could not complete that request.")
      }

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: body.answer },
      ])
      setLastGeneratedAt(typeof body.generatedAt === "string" ? body.generatedAt : null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analytics Copilot could not complete that request.")
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit(input)
  }

  const copyReport = async (message: Message) => {
    await navigator.clipboard.writeText(message.content)
    setCopiedId(message.id)
    window.setTimeout(() => setCopiedId(null), 1_600)
  }

  return (
    <section className="overflow-hidden rounded-xl border border-primary/20 bg-card/30">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Analytics Copilot</h3>
            <p className="text-xs text-muted-foreground">Read-only insight for the selected {days}-day period</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          aria-expanded={isOpen}
        >
          {isOpen ? "Hide copilot" : "Ask copilot"}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4 p-4">
          <div className="flex gap-3 rounded-lg border border-border/35 bg-background/25 p-3 text-sm text-muted-foreground">
            <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>{content.description}</p>
          </div>

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {content.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submit(prompt)}
                  disabled={isSending}
                  className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-left text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {messages.length > 0 && (
            <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
              {messages.map((message) => message.role === "user" ? (
                <div key={message.id} className="ml-auto max-w-2xl rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
                  {message.content}
                </div>
              ) : (
                <article key={message.id} className="relative max-w-3xl rounded-lg border border-border/40 bg-background/25 p-4">
                  <button
                    type="button"
                    onClick={() => void copyReport(message)}
                    className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    title="Copy report"
                  >
                    {copiedId === message.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <div className="pr-7">{renderReport(message.content)}</div>
                </article>
              ))}
              {isSending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  Reading the aggregate snapshot…
                </div>
              )}
            </div>
          )}

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <label className="sr-only" htmlFor={`analytics-copilot-${scope}`}>Ask Analytics Copilot</label>
            <textarea
              id={`analytics-copilot-${scope}`}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about this data…"
              maxLength={1_200}
              rows={2}
              disabled={isSending}
              className="min-h-[48px] flex-1 resize-y rounded-lg border border-border/50 bg-background/35 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>

          <p className="text-xs text-muted-foreground">
            {lastGeneratedAt ? `Snapshot generated ${new Date(lastGeneratedAt).toLocaleString()}. ` : ""}
            Answers use aggregate analytics only and are not saved.
          </p>
        </div>
      )}
    </section>
  )
}
