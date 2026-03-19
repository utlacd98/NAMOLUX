"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Send, RefreshCw, ExternalLink, Copy, CheckCircle, Sparkles, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatResult {
  name: string
  tld: string
  fullDomain: string
  available: boolean
  confidence: string
  score: number
  label: string
  reasons: string[]
}

type StepId = "description" | "vibe" | "industry" | "length" | "keywords"

interface ChatMessage {
  id: string
  role: "bot" | "user"
  text: string
  /** Optional button choices shown below the message */
  choices?: { label: string; value: string; emoji?: string }[]
  /** If true the choices have been answered and should be greyed out */
  answered?: boolean
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: StepId[] = ["description", "vibe", "industry", "length", "keywords"]

const BOT_QUESTIONS: Record<StepId, { text: string; choices?: { label: string; value: string; emoji?: string }[] }> = {
  description: {
    text: "Let's find your perfect brand name. What does your startup do? Give me a quick one-liner.",
  },
  vibe: {
    text: "What vibe should the name have?",
    choices: [
      { label: "Luxury", value: "luxury", emoji: "✦" },
      { label: "Playful", value: "playful", emoji: "🎨" },
      { label: "Futuristic", value: "futuristic", emoji: "⚡" },
      { label: "Trustworthy", value: "trustworthy", emoji: "🛡" },
      { label: "Minimal", value: "minimal", emoji: "◻" },
    ],
  },
  industry: {
    text: "Which industry? (type it or skip — I'll figure it out from your description)",
  },
  length: {
    text: "How long should the name be?",
    choices: [
      { label: "Short  ≤7 chars", value: "7", emoji: "⚡" },
      { label: "Medium  ≤9 chars", value: "9", emoji: "●" },
      { label: "Any  ≤12 chars", value: "12", emoji: "○" },
    ],
  },
  keywords: {
    text: "Any specific words you'd like in the name? (type them or skip)",
  },
}

// ─── Score colour helper ──────────────────────────────────────────────────────

const scoreColor = (s: number) =>
  s >= 80 ? "#22c55e" : s >= 65 ? "#D4AF37" : s >= 50 ? "#f97316" : "rgba(255,255,255,0.4)"

const scoreBand = (s: number) =>
  s >= 80 ? "Elite" : s >= 65 ? "Strong" : s >= 50 ? "Good" : "Fair"

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ r }: { r: ChatResult }) {
  const [copied, setCopied] = useState(false)
  const color = scoreColor(r.score)

  function copy() {
    navigator.clipboard.writeText(r.fullDomain).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: r.available ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.03)",
        border: r.available ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{
              background: r.available ? "rgba(52,211,153,0.15)" : "rgba(255,100,100,0.1)",
              border: r.available ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(255,100,100,0.15)",
            }}
          >
            {r.available ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-red-400/50" />
            )}
          </span>
          <span className="truncate text-sm font-bold text-white">{r.name}</span>
          <span
            className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold"
            style={{
              background: r.available ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
              color: r.available ? "#34d399" : "rgba(255,255,255,0.3)",
            }}
          >
            .com
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Score badge */}
          <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
            {r.score}
          </span>
          <button
            onClick={copy}
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ background: "rgba(255,255,255,0.05)" }}
            title="Copy"
          >
            {copied ? <CheckCircle className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-white/40" />}
          </button>
          {r.available && (
            <a
              href={`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(r.fullDomain)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold text-black"
              style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Register
            </a>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-2 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${r.score}%`, background: color, transition: "width 0.6s ease" }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          Founder Signal™
        </span>
        <span className="text-[9px] font-semibold" style={{ color }}>
          {scoreBand(r.score)}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiNameChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "0",
      role: "bot",
      text: BOT_QUESTIONS.description.text,
    },
  ])
  const [currentStep, setCurrentStep] = useState<StepId | "generating" | "done">("description")
  const [textInput, setTextInput] = useState("")
  const [answers, setAnswers] = useState<Record<StepId, string>>({
    description: "",
    vibe: "modern",
    industry: "",
    length: "9",
    keywords: "",
  })
  const [results, setResults] = useState<ChatResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60)
  }, [messages])

  useEffect(() => {
    if (currentStep !== "generating" && currentStep !== "done") {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [currentStep])

  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: String(Date.now() + Math.random()) }])
  }, [])

  /** Mark the last bot message's choices as answered */
  const markAnswered = useCallback(() => {
    setMessages((prev) =>
      prev.map((m, i) => (i === prev.length - 1 && m.role === "bot" ? { ...m, answered: true } : m))
    )
  }, [])

  const advanceStep = useCallback(
    (stepAnswers: Record<StepId, string>, completedStep: StepId) => {
      const idx = STEPS.indexOf(completedStep)
      const nextStep = STEPS[idx + 1] as StepId | undefined

      if (!nextStep) {
        // All questions answered — generate
        generateNames(stepAnswers)
        return
      }

      const q = BOT_QUESTIONS[nextStep]
      setTimeout(() => {
        addMessage({ role: "bot", text: q.text, choices: q.choices })
        setCurrentStep(nextStep)
      }, 400)
    },
    [addMessage]
  )

  const handleAnswer = useCallback(
    (value: string, displayValue?: string) => {
      if (!value.trim() && currentStep !== "industry" && currentStep !== "keywords") return
      const step = currentStep as StepId

      // Show user bubble
      addMessage({ role: "user", text: displayValue || value || "Skip" })
      markAnswered()

      const newAnswers = { ...answers, [step]: value.trim() }
      setAnswers(newAnswers)
      setTextInput("")

      advanceStep(newAnswers, step)
    },
    [currentStep, answers, addMessage, markAnswered, advanceStep]
  )

  const generateNames = useCallback(
    async (finalAnswers: Record<StepId, string>) => {
      setCurrentStep("generating")
      setIsGenerating(true)
      setGenError(null)

      setTimeout(() => {
        addMessage({
          role: "bot",
          text: `Generating names based on: "${finalAnswers.description}" — checking live .com availability with Founder Signal™ scoring…`,
        })
      }, 300)

      try {
        const res = await fetch("/api/ai-name-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: finalAnswers.description,
            vibe: finalAnswers.vibe || "modern",
            industry: finalAnswers.industry || "",
            maxLength: parseInt(finalAnswers.length || "9", 10),
            keywords: finalAnswers.keywords || "",
          }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Generation failed")
        }

        setResults(data.results)
        setCurrentStep("done")

        const available = (data.results as ChatResult[]).filter((r) => r.available).length
        setTimeout(() => {
          addMessage({
            role: "bot",
            text:
              available > 0
                ? `Found ${available} available .com domain${available !== 1 ? "s" : ""} out of ${data.results.length} candidates — all pre-scored with Founder Signal™. Available names are shown first.`
                : `Checked ${data.results.length} name candidates — none had their .com free right now. Try 'Start Over' with different keywords.`,
          })
        }, 300)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong"
        setGenError(msg)
        setCurrentStep("done")
        addMessage({ role: "bot", text: `Sorry, something went wrong: ${msg}` })
      } finally {
        setIsGenerating(false)
      }
    },
    [addMessage]
  )

  const restart = useCallback(() => {
    setMessages([{ id: "0", role: "bot", text: BOT_QUESTIONS.description.text }])
    setCurrentStep("description")
    setTextInput("")
    setResults([])
    setGenError(null)
    setAnswers({ description: "", vibe: "modern", industry: "", length: "9", keywords: "" })
  }, [])

  const showTextInput = currentStep === "description" || currentStep === "industry" || currentStep === "keywords"
  const isSkippable = currentStep === "industry" || currentStep === "keywords"

  return (
    <div className="flex flex-col" style={{ minHeight: 420 }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "#D4AF37" }} />
          <span className="text-sm font-semibold text-white">AI Name Assistant</span>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>
            BETA
          </span>
        </div>
        {(currentStep === "done" || results.length > 0) && (
          <button
            onClick={restart}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          >
            <RefreshCw className="h-3 w-3" />
            Start Over
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 520 }}>
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div style={{ maxWidth: "85%" }}>
              {/* Bubble */}
              <div
                className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={
                  msg.role === "bot"
                    ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }
                    : { background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.25)", color: "rgba(255,255,255,0.9)" }
                }
              >
                {msg.text}
              </div>

              {/* Choice buttons (bot messages with choices) */}
              {msg.choices && !msg.answered && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.choices.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => handleAnswer(c.value, `${c.emoji ? c.emoji + " " : ""}${c.label}`)}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5"
                      style={{
                        background: "rgba(212,175,55,0.1)",
                        border: "1px solid rgba(212,175,55,0.25)",
                        color: "#D4AF37",
                      }}
                    >
                      {c.emoji && <span className="mr-1">{c.emoji}</span>}
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Greyed out answered choices */}
              {msg.choices && msg.answered && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {msg.choices.map((c) => (
                    <span
                      key={c.value}
                      className="rounded-xl px-2.5 py-1 text-[10px]"
                      style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.15)" }}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {isGenerating && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1.5 rounded-2xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: "#D4AF37", animationDelay: `${i * 0.2}s`, opacity: 0.7 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results grid */}
        {results.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(212,175,55,0.5)" }}>
              — Results —
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {results.map((r) => (
                <ResultCard key={r.fullDomain} r={r} />
              ))}
            </div>
          </div>
        )}

        {genError && !isGenerating && (
          <div className="rounded-xl p-3 text-xs text-red-400" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {genError} — <button onClick={restart} className="underline">Start over</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text input area (shown only for free-text steps) */}
      {showTextInput && currentStep !== "generating" && currentStep !== "done" && (
        <div className="mt-4 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && textInput.trim()) handleAnswer(textInput.trim())
              if (e.key === "Enter" && !textInput.trim() && isSkippable) handleAnswer("")
            }}
            placeholder={
              currentStep === "description"
                ? "e.g. A platform for freelance designers to find clients…"
                : currentStep === "industry"
                ? "e.g. SaaS, Fintech, Health… or press Enter to skip"
                : "e.g. flow, sync… or press Enter to skip"
            }
            className="flex-1 rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.5)"
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.15)"
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
              e.currentTarget.style.boxShadow = "none"
            }}
          />
          <button
            onClick={() => (textInput.trim() || isSkippable) && handleAnswer(textInput.trim())}
            disabled={!textInput.trim() && !isSkippable}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
          >
            <Send className="h-4 w-4 text-black" />
          </button>
          {isSkippable && (
            <button
              onClick={() => handleAnswer("")}
              className="rounded-xl px-3 py-2.5 text-xs text-white/40 hover:text-white/70"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  )
}
