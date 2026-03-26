"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Send, RefreshCw, ExternalLink, Copy, CheckCircle, Sparkles, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { namecheapLink } from "@/lib/affiliateLink"

// ─── Types ────────────────────────────────────────────────────────────────────

const ALL_TLDS = ["com", "io", "co", "ai", "app", "dev"] as const
type Tld = (typeof ALL_TLDS)[number]

interface ChatResult {
  name: string
  tld: string
  fullDomain: string
  available: boolean
  anyAvailable: boolean
  bestTld: string | null
  tlds: Partial<Record<Tld, boolean | null>>
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
  choices?: { label: string; value: string; emoji?: string }[]
  answered?: boolean
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: StepId[] = ["description", "vibe", "industry", "length", "keywords"]

const BOT_QUESTIONS: Record<
  StepId,
  { text: string; choices?: { label: string; value: string; emoji?: string }[] }
> = {
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
    text: "Which industry? Type it or skip — I'll figure it out from your description.",
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
    text: "Any specific words you'd like woven in? Type them or skip.",
  },
}

// Loading steps shown while generating
const GEN_STEPS = [
  "Analysing your description…",
  "Generating name candidates…",
  "Checking live availability…",
  "Scoring with Founder Signal™…",
]

// ─── Score colour helpers ─────────────────────────────────────────────────────

const scoreColor = (s: number) =>
  s >= 80 ? "#22c55e" : s >= 65 ? "#D4AF37" : s >= 50 ? "#f97316" : "rgba(255,255,255,0.4)"

const scoreBand = (s: number) =>
  s >= 80 ? "Elite" : s >= 65 ? "Strong" : s >= 50 ? "Good" : "Fair"

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ r }: { r: ChatResult }) {
  const [copied, setCopied] = useState(false)
  const color = scoreColor(r.score)
  const registerTld = r.bestTld
  const registerDomain = registerTld ? `${r.name}.${registerTld}` : r.fullDomain

  function copy() {
    navigator.clipboard.writeText(registerDomain).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const availableCount = ALL_TLDS.filter((t) => r.tlds[t] === true).length

  return (
    <div
      className="rounded-xl p-3 transition-all duration-200"
      style={{
        background: r.anyAvailable ? "rgba(52,211,153,0.04)" : "rgba(255,255,255,0.03)",
        border: r.anyAvailable
          ? "1px solid rgba(52,211,153,0.18)"
          : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Name row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{
              background: r.anyAvailable ? "rgba(52,211,153,0.15)" : "rgba(255,80,80,0.08)",
              border: r.anyAvailable
                ? "1px solid rgba(52,211,153,0.25)"
                : "1px solid rgba(255,80,80,0.12)",
            }}
          >
            {r.anyAvailable ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "rgba(255,80,80,0.5)" }}
              />
            )}
          </span>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-white">{r.name}</span>
            {availableCount > 0 && (
              <span className="text-[9px] text-green-400/60">
                {availableCount} TLD{availableCount !== 1 ? "s" : ""} free
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
            {r.score}
          </span>
          <button
            onClick={copy}
            className="flex h-6 w-6 items-center justify-center rounded transition-all hover:-translate-y-0.5"
            style={{ background: "rgba(255,255,255,0.05)" }}
            title={`Copy ${registerDomain}`}
          >
            {copied ? (
              <CheckCircle className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3 text-white/40" />
            )}
          </button>
          {r.anyAvailable && registerTld && (
            <a
              href={namecheapLink(registerDomain)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold text-black transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              .{registerTld}
            </a>
          )}
        </div>
      </div>

      {/* TLD availability grid */}
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
        {ALL_TLDS.map((tld) => {
          const av = r.tlds[tld]
          const isAvail = av === true
          const isTaken = av === false
          return (
            <div key={tld} className="flex items-center gap-0.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: isAvail
                    ? "#34d399"
                    : isTaken
                    ? "rgba(255,80,80,0.5)"
                    : "rgba(255,255,255,0.15)",
                }}
              />
              {isAvail ? (
                <a
                  href={namecheapLink(`${r.name}.${tld}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-semibold transition-opacity hover:opacity-80"
                  style={{ color: "#34d399" }}
                >
                  .{tld}
                </a>
              ) : (
                <span
                  className="text-[9px]"
                  style={{
                    color: isTaken
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.28)",
                    textDecoration: isTaken ? "line-through" : undefined,
                  }}
                >
                  .{tld}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Founder Signal bar */}
      <div className="mt-2.5 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${r.score}%`, background: color }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          Founder Signal™
        </span>
        <span className="text-[9px] font-semibold" style={{ color }}>
          {scoreBand(r.score)}
        </span>
      </div>
    </div>
  )
}

// ─── Premium loading animation ────────────────────────────────────────────────

function GeneratingState({ step }: { step: number }) {
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[280px] rounded-2xl px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{
                background: "#D4AF37",
                animationDelay: `${i * 0.15}s`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        <div className="space-y-1">
          {GEN_STEPS.map((s, i) => (
            <div
              key={s}
              className="flex items-center gap-1.5 text-[10px] transition-all duration-500"
              style={{
                color:
                  i < step
                    ? "rgba(212,175,55,0.4)"
                    : i === step
                    ? "rgba(212,175,55,0.9)"
                    : "rgba(255,255,255,0.2)",
              }}
            >
              {i < step ? (
                <Check className="h-2.5 w-2.5 shrink-0" style={{ color: "#D4AF37" }} />
              ) : i === step ? (
                <span
                  className="relative inline-flex h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "#D4AF37" }}
                >
                  <span
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{ background: "#D4AF37", opacity: 0.6 }}
                  />
                </span>
              ) : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
              )}
              {s}
            </div>
          ))}
        </div>
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
  const [genStep, setGenStep] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll the chat area to the very bottom whenever messages or results change
  const scrollToBottom = useCallback((instant = false) => {
    const el = scrollAreaRef.current
    if (!el) return
    setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: instant ? "auto" : "smooth" })
    }, 80)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, results, isGenerating, scrollToBottom])

  // Focus text input when a new text-entry step appears
  useEffect(() => {
    if (currentStep !== "generating" && currentStep !== "done") {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [currentStep])

  // Cycle loading steps during generation
  useEffect(() => {
    if (!isGenerating) { setGenStep(0); return }
    const interval = setInterval(() => setGenStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)), 2200)
    return () => clearInterval(interval)
  }, [isGenerating])

  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: String(Date.now() + Math.random()) }])
  }, [])

  /** Mark the last bot message's choices as answered */
  const markAnswered = useCallback(() => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === prev.length - 1 && m.role === "bot" ? { ...m, answered: true } : m
      )
    )
  }, [])

  const advanceStep = useCallback(
    (stepAnswers: Record<StepId, string>, completedStep: StepId) => {
      const idx = STEPS.indexOf(completedStep)
      const nextStep = STEPS[idx + 1] as StepId | undefined

      if (!nextStep) {
        generateNames(stepAnswers)
        return
      }

      const q = BOT_QUESTIONS[nextStep]
      setTimeout(() => {
        addMessage({ role: "bot", text: q.text, choices: q.choices })
        setCurrentStep(nextStep)
      }, 380)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addMessage]
  )

  const handleAnswer = useCallback(
    (value: string, displayValue?: string) => {
      // Required steps must have a value; optional steps (industry, keywords) can be empty
      if (!value.trim() && currentStep !== "industry" && currentStep !== "keywords") return
      const step = currentStep as StepId

      addMessage({ role: "user", text: displayValue || value.trim() || "Skip" })
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
      setGenStep(0)

      setTimeout(() => {
        addMessage({
          role: "bot",
          text: `Generating names for: "${finalAnswers.description}" — checking live availability across 6 TLDs…`,
        })
      }, 280)

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

        if (!res.ok || !data.success) throw new Error(data.error || "Generation failed")

        const resultList = data.results as ChatResult[]
        setResults(resultList)
        setCurrentStep("done")

        const comAvail = resultList.filter((r) => r.tlds["com"] === true).length
        const anyAvail = resultList.filter((r) => r.anyAvailable).length

        setTimeout(() => {
          addMessage({
            role: "bot",
            text:
              anyAvail > 0
                ? `Found ${anyAvail} name${anyAvail !== 1 ? "s" : ""} with at least one available TLD (${comAvail} with free .com) — scored with Founder Signal™ and sorted by best availability.`
                : `Checked ${resultList.length} candidates — none had a free TLD right now. Try 'Start Over' with different keywords or a shorter name length.`,
          })
        }, 300)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong"
        setGenError(msg)
        setCurrentStep("done")
        addMessage({ role: "bot", text: `Sorry — something went wrong: ${msg}` })
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
    setGenStep(0)
    setAnswers({ description: "", vibe: "modern", industry: "", length: "9", keywords: "" })
  }, [])

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const showTextInput =
    currentStep === "description" || currentStep === "industry" || currentStep === "keywords"
  const isSkippable = currentStep === "industry" || currentStep === "keywords"

  // Summary stats for the results header
  const comAvailCount = results.filter((r) => r.tlds["com"] === true).length
  const anyAvailCount = results.filter((r) => r.anyAvailable).length
  const topScore = results.length ? Math.max(...results.map((r) => r.score)) : 0

  return (
    <div className="flex flex-col" style={{ minHeight: 440 }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "#D4AF37" }} />
          <span className="text-sm font-semibold text-white">AI Name Assistant</span>
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
          >
            BETA
          </span>
        </div>
        {(currentStep === "done" || results.length > 0) && (
          <button
            onClick={restart}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all hover:-translate-y-0.5"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Start Over
          </button>
        )}
      </div>

      {/* Scroll area — messages + results */}
      <div
        ref={scrollAreaRef}
        className="flex-1 space-y-3 overflow-y-auto pr-1"
        style={{
          maxHeight: 560,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(212,175,55,0.2) transparent",
        }}
      >
        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div style={{ maxWidth: "88%" }}>
              {/* Bubble */}
              <div
                className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={
                  msg.role === "bot"
                    ? {
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.85)",
                      }
                    : {
                        background: "rgba(212,175,55,0.13)",
                        border: "1px solid rgba(212,175,55,0.22)",
                        color: "rgba(255,255,255,0.9)",
                      }
                }
              >
                {msg.text}
              </div>

              {/* Active choice buttons */}
              {msg.choices && !msg.answered && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.choices.map((c) => (
                    <button
                      key={c.value}
                      onClick={() =>
                        handleAnswer(c.value, `${c.emoji ? c.emoji + " " : ""}${c.label}`)
                      }
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5 active:scale-95"
                      style={{
                        background: "rgba(212,175,55,0.1)",
                        border: "1px solid rgba(212,175,55,0.28)",
                        color: "#D4AF37",
                      }}
                    >
                      {c.emoji && <span className="mr-1">{c.emoji}</span>}
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Greyed-out answered choices */}
              {msg.choices && msg.answered && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {msg.choices.map((c) => (
                    <span
                      key={c.value}
                      className="rounded-xl px-2.5 py-1 text-[10px]"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(255,255,255,0.14)",
                      }}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Premium loading state */}
        {isGenerating && <GeneratingState step={genStep} />}

        {/* Error */}
        {genError && !isGenerating && (
          <div
            className="rounded-xl p-3 text-xs text-red-400"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {genError} —{" "}
            <button onClick={restart} className="underline">
              Start over
            </button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div ref={resultsRef} className="mt-3 space-y-2.5">
            {/* Results summary strip */}
            <div
              className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2"
              style={{
                background: "rgba(212,175,55,0.06)",
                border: "1px solid rgba(212,175,55,0.14)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "rgba(212,175,55,0.6)" }}
              >
                Results
              </span>
              <span className="text-[10px] text-white/40">
                {results.length} generated
              </span>
              {anyAvailCount > 0 && (
                <span className="text-[10px] text-green-400/80">
                  {anyAvailCount} available
                </span>
              )}
              {comAvailCount > 0 && (
                <span className="text-[10px] text-green-400">
                  {comAvailCount} .com free
                </span>
              )}
              <span className="ml-auto text-[10px]" style={{ color: "#D4AF37" }}>
                Top score: {topScore}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {results.map((r) => (
                <ResultCard key={r.fullDomain} r={r} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* "View results" scroll anchor — shown when done and results exist */}
      {currentStep === "done" && results.length > 0 && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={scrollToResults}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5"
            style={{
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.25)",
              color: "#D4AF37",
            }}
          >
            <ChevronDown className="h-3 w-3" />
            Jump to results
          </button>
        </div>
      )}

      {/* Text input area — showTextInput is already false when generating/done */}
      {showTextInput && (
        <div className="mt-4 space-y-2">
          {/* Context hint for optional steps */}
          {isSkippable && (
            <p className="text-[10px] text-white/30 px-1">
              {currentStep === "industry"
                ? "Type an industry or press Enter / Skip to continue."
                : "Type keywords or press Enter / Skip to continue."}
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (textInput.trim()) {
                    handleAnswer(textInput.trim())
                  } else if (isSkippable) {
                    handleAnswer("")
                  }
                }
              }}
              placeholder={
                currentStep === "description"
                  ? "e.g. A platform for freelance designers to find clients…"
                  : currentStep === "industry"
                  ? "e.g. SaaS, Fintech, Health…"
                  : "e.g. flow, sync, pulse…"
              }
              className="flex-1 rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.5)"
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.12)"
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                e.currentTarget.style.boxShadow = "none"
              }}
            />

            {/* Send — always enabled for skippable steps */}
            <button
              onClick={() => {
                if (textInput.trim()) {
                  handleAnswer(textInput.trim())
                } else if (isSkippable) {
                  handleAnswer("")
                }
              }}
              disabled={!textInput.trim() && !isSkippable}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-35"
              style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
              title={isSkippable ? "Send or skip" : "Send"}
            >
              <Send className="h-4 w-4 text-black" />
            </button>

            {/* Explicit skip button for optional steps */}
            {isSkippable && (
              <button
                onClick={() => handleAnswer("")}
                className="rounded-xl px-3 py-2.5 text-xs font-medium transition-all hover:text-white/70"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.38)",
                }}
              >
                Skip
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
