"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { namecheapLink } from "@/lib/affiliateLink"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Copy,
  CheckCircle,
  Download,
  RefreshCw,
  Zap,
  ExternalLink,
  AlertCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Lock,
  Lightbulb,
  Swords,
  LayoutGrid,
  Palette,
  ThumbsDown,
  ThumbsUp,
  WandSparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildResultCardView } from "@/lib/domainGen/resultCard"
import { useNamePreferences } from "@/hooks/useNamePreferences"
import { getTrendAge } from "@/lib/nameCreativity"
import { setCachedBatch, clearExpired } from "@/lib/domainCache"
import { RefineResults, getRefinementOverrides, type RefinementMode } from "@/components/refine-results"
import { getSessionId, trackAffiliateClick, trackEvent } from "@/lib/analytics"
import { QUICK_GENERATE_TLDS } from "@/lib/domainGen/quickTlds"
import { AdBanner } from "@/components/ad-banner"
import { DomainStatusChip } from "@/components/domain-status-chip"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { getFounderSignalBand } from "@/lib/founderSignal/spec"
import type { ServerFounderSignal } from "@/components/founder-signal"
import { formatContentLabel, type GeneratorSource } from "@/lib/generator-attribution"
import { withPricingAttribution } from "@/lib/pricing-attribution"
import {
  GENERATOR_HISTORY_STORAGE_KEY,
  GENERATOR_PREFERENCE_STORAGE_KEY,
  applyCandidateDislikes,
  collectFailedAvailabilityTlds,
  createEmptyPreferenceProfile,
  getQuickStyleMinimumLength,
  isFounderSignalAllowanceExhaustedResponse,
  learnFromCandidate,
  markAvailabilityFailed,
  markAvailabilityTldsFailed,
  markFailedAvailabilityChecking,
  mergeAvailability,
  mergeFounderSignal,
  normalisePreferenceProfile,
  parseBlacklist,
  parseGeneratedCandidates,
  parseQuickGenerationShortfall,
  planAvailabilityTldChunks,
  orderCandidatesForDecision,
  resolveGeneratorResultsAdPosition,
  selectVerifiedAvailableDomain,
  sortCandidatesByFounderSignal,
  type AvailabilityState,
  type CreativityLevel,
  type GeneratedName,
  type GenerationPhase,
  type NameStyle,
  type NamingPreferenceProfile,
  type QuickGenerationShortfall,
} from "@/components/generator-exploration-model"
import type { DislikeReason, NameFeedbackType } from "@/lib/name-feedback"

const DeepSearch = dynamic(() => import("@/components/deep-search").then((module) => module.DeepSearch), { ssr: false })
const FounderSignalPanel = dynamic(() => import("@/components/founder-signal").then((module) => module.FounderSignalPanel), { ssr: false })
const SeoPotentialCheck = dynamic(() => import("@/components/seo-potential").then((module) => module.SeoPotentialCheck), { ssr: false })
const NamePronunciation = dynamic(() => import("@/components/name-pronunciation").then((module) => module.NamePronunciation), { ssr: false })
const NameStressTest = dynamic(() => import("@/components/name-stress-test").then((module) => module.NameStressTest), { ssr: false })
const NameBattleDialog = dynamic(() => import("@/components/name-battle-dialog").then((module) => module.NameBattleDialog), { ssr: false })
const NamesLikeSearch = dynamic(() => import("@/components/names-like-search").then((module) => module.NamesLikeSearch), { ssr: false })
const SavedNamesBoard = dynamic(() => import("@/components/saved-names-board").then((module) => module.SavedNamesBoard), { ssr: false })
const GenerationSplash = dynamic(() => import("@/components/generator-exploration").then((module) => module.GenerationSplash), { ssr: false })
const GeneratorExplorationResults = dynamic(() => import("@/components/generator-exploration").then((module) => module.GeneratorExplorationResults), { ssr: false })
const QuickExplorationControls = dynamic(() => import("@/components/generator-exploration").then((module) => module.QuickExplorationControls), { ssr: false })

// SEO micro-signal calculator (lightweight, inline)
function getSeoMicroSignal(name: string): { icon: string; text: string; type: "positive" | "warning" | "neutral" } | null {
  const lowerName = name.toLowerCase()
  const HIGH_COMPETITION = ["app", "software", "tech", "cloud", "digital", "online", "web", "smart", "pro", "shop", "store", "buy", "health", "fit", "learn", "home"]
  const NICHE_PATTERNS = [/^[a-z]{2,4}ly$/i, /^[a-z]{3,5}ify$/i, /^[a-z]{2,4}io$/i, /^[a-z]{4,8}hub$/i, /^[a-z]{4,8}lab$/i]

  // Check for strong niche pattern first (highest priority)
  if (NICHE_PATTERNS.some(p => p.test(lowerName))) {
    return { icon: "\u{1F525}", text: "Strong SEO", type: "positive" }
  }

  // Check for high competition keywords
  const matchedHigh = HIGH_COMPETITION.filter(kw => lowerName.includes(kw))
  if (matchedHigh.length >= 2) {
    return { icon: "\u26A0\uFE0F", text: "High competition", type: "warning" }
  }

  // Check for niche-friendly (no common keywords)
  if (matchedHigh.length === 0 && lowerName.length >= 5 && lowerName.length <= 10) {
    return { icon: "\u2705", text: "Niche-friendly", type: "positive" }
  }

  return null
}

const vibeOptions = [
  { id: "luxury", label: "Luxury", description: "Premium, elegant, sophisticated" },
  { id: "futuristic", label: "Futuristic", description: "Tech-forward, innovative" },
  { id: "playful", label: "Playful", description: "Fun, friendly, approachable" },
  { id: "trustworthy", label: "Trustworthy", description: "Reliable, professional" },
  { id: "minimal", label: "Minimal", description: "Clean, simple, modern" },
]

type GenerateMode = "quick" | "advanced" | "bulk"

const quickVibeOptions = [
  { id: "friendly", label: "Friendly" },
  { id: "playful", label: "Playful" },
  { id: "premium", label: "Premium" },
  { id: "tech", label: "Tech" },
  { id: "clean", label: "Clean" },
  { id: "bold", label: "Bold" },
] as const

type QuickVibeId = (typeof quickVibeOptions)[number]["id"]

const generatorExampleBriefs = [
  "A privacy-first fintech platform for independent consultants",
  "A premium sustainable skincare brand for sensitive skin",
  "An AI operations assistant for small logistics teams",
] as const

const DISLIKE_REASON_OPTIONS = [
  { id: "too_generic", label: "Too generic" },
  { id: "hard_to_pronounce", label: "Hard to pronounce" },
  { id: "does_not_fit_business", label: "Does not fit the business" },
  { id: "feels_ai_generated", label: "Feels AI-generated" },
  { id: "too_long", label: "Too long" },
  { id: "wrong_tone", label: "Wrong tone" },
  { id: "similar_to_another_brand", label: "Similar to another brand" },
  { id: "domain_problem", label: "Domain problem" },
  { id: "other", label: "Other" },
  { id: "skip", label: "Skip" },
] as const satisfies readonly { id: DislikeReason; label: string }[]

const industryOptions = [
  "Technology",
  "Health & Wellness",
  "Finance",
  "E-commerce",
  "Education",
  "Creative",
  "Real Estate",
  "Food & Beverage",
  "Fashion & Beauty",
  "Travel & Tourism",
  "Sports & Fitness",
  "Entertainment & Media",
  "Consulting & Services",
  "Marketing & Advertising",
  "Legal & Professional",
  "Automotive",
  "Home & Garden",
  "Pet Care",
  "Gaming & Esports",
  "Sustainability & Green Tech",
  "AI & Machine Learning",
  "Blockchain & Crypto",
  "SaaS & Software",
  "Manufacturing",
  "Nonprofit & Social Impact",
  "Other",
]

interface DomainResult {
  name: string
  tld: string
  fullDomain: string
  available: boolean
  score?: number
  pronounceable?: boolean
  memorability?: number
  founderSignal?: ServerFounderSignal
  length: number
  strategy?: string
  scoreBreakdown?: Record<string, number>
  roots?: string[]
  whyTag?: string
  qualityBand?: "high" | "medium" | "low"
  meaningScore?: number
  meaningBreakdown?: string
  whyItWorks?: string
  personalDescription?: string
  styleRationale?: string
  slogan?: string
  personality?: string
  registerUrl?: string
  brandableScore?: number
  pronounceabilityScore?: number
  meaning?: string
  /** From tiered checker — granular availability status */
  checkStatus?: "available" | "taken" | "likely_available" | "needs_verification" | "error"
  /** Confidence level from tiered checker */
  availabilityConfidence?: "high" | "medium" | "low"
}

type AutoFindMustIncludeKeyword = "exact" | "partial" | "none"
type AutoFindKeywordPosition = "prefix" | "suffix" | "anywhere"
type AutoFindStyle = "real_words" | "brandable_blends"

interface AutoFindControlsState {
  seed: string
  mustIncludeKeyword: AutoFindMustIncludeKeyword
  keywordPosition: AutoFindKeywordPosition
  style: AutoFindStyle
  blocklist: string
  allowlist: string
  allowHyphen: boolean
  allowNumbers: boolean
  meaningFirst: boolean
  preferTwoWordBrands: boolean
  allowVibeSuffix: boolean
  showAnyAvailable: boolean
}

interface AutoFindNearMiss {
  name: string
  availableTlds: string[]
}

interface AutoFindV2Summary {
  found: number
  target: number
  attempts: number
  maxAttempts: number
  generatedCandidates: number
  passedFilters: number
  checkedAvailability: number
  providerErrors: number
  availabilityHitRate: number
  qualityThreshold: number
  relaxationsApplied: string[]
  topRejectedReasons: Array<{ reason: string; count: number }>
  checkingProgress: string
  suggestions: string[]
  nearMisses: AutoFindNearMiss[]
  explanation: string
}

interface SocialResult {
  platform: string
  platformId: string
  handle: string
  available: boolean
  url: string
  color: string
}

interface DomainInsight {
  meaning?: string
  meaningShort?: string
  reasoning?: string
  personalDescription?: string
  styleRationale?: string
  slogan?: string
}

// TLD badge colors
const tldColors: Record<string, string> = {
  com: "bg-blue-500/20 text-blue-400",
  io: "bg-purple-500/20 text-purple-400",
  co: "bg-orange-500/20 text-orange-400",
  ai: "bg-green-500/20 text-green-400",
  app: "bg-pink-500/20 text-pink-400",
  dev: "bg-cyan-500/20 text-cyan-400",
}

// Social platform icons (emoji fallback)
const socialIcons: Record<string, string> = {
  twitter: "\u{1D54F}",
  instagram: "\u{1F4F7}",
  tiktok: "\u266A",
  github: "\u2328",
  youtube: "\u25B6",
}

// Available TLDs for filtering
const ALL_TLDS = ["com", "io", "co", "ai", "app", "dev"]
const TLD_PRIORITY = ["com", "io", "co", "ai", "app", "dev"]

// LocalStorage keys
const STORAGE_KEYS = {
  SHORTLIST: "namolux_shortlist",
  SEARCH_HISTORY: "namolux_search_history",
  WORKFLOW_DRAFT: "namolux_workflow_draft",
}

const LOADING_STEPS = [
  "Combining phonetics…",
  "Checking availability…",
  "Calculating Founder Signal™…",
]

const QUICK_LOADING_STEPS = [
  "Building word patterns...",
  "Checking multiple TLDs...",
  "Preparing Namecheap links...",
]

const QUICK_TLD_LABEL = QUICK_GENERATE_TLDS.map((tld) => `.${tld}`).join(" ")

function resultScore(result: DomainResult): number {
  return typeof result.score === "number" ? result.score : 0
}

function createPricingRedirectError() {
  const error = new Error("Redirecting to pricing")
  error.name = "PricingRedirect"
  return error
}

function LockedFounderSignalCard() {
  return (
    <div
      className="relative mt-3 overflow-hidden rounded-xl px-3 py-3 sm:px-4"
      style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(255,255,255,0.025))",
        border: "1px solid rgba(212,175,55,0.14)",
      }}
    >
      <div className="pointer-events-none select-none opacity-45 blur-[2px]" aria-hidden="true">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Founder Signal</span>
          <span className="h-5 w-14 rounded-full bg-white/12" />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-3">
          <div className="h-2 rounded-full bg-white/18" />
          <div className="h-2 rounded-full bg-white/12" />
          <div className="h-2 rounded-full bg-white/16" />
        </div>
        <div className="mt-2 h-3 w-4/5 rounded-full bg-white/10" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/42 px-4 text-center backdrop-blur-[1px]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F6E27A]">
          <Lock className="h-3.5 w-3.5" />
          Founder Signal locked
        </div>
        <p className="max-w-sm text-[11px] leading-relaxed text-white/62">
          Pro unlocks brand scores, ranked comparisons, score filters, stress tests, and scored exports.
        </p>
        <Link
          href="/pricing?reason=bulk-founder-signal#plans"
          className="rounded-lg bg-[#D4A843] px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-[#c49a3d]"
        >
          Unlock scoring
        </Link>
      </div>
    </div>
  )
}

const SAMPLE_KEYWORDS = ["luxury brand", "fintech", "wellness app"]

// Quick-start category pills shown below the CTA
const QUICK_CATEGORIES = [
  { label: "Inspire me", value: "inspire me" },
  { label: "Neo-Bank", value: "neobank fintech" },
  { label: "Eco-Luxe", value: "sustainable luxury" },
  { label: "Mindfulness App", value: "mindfulness meditation wellness" },
  { label: "Web3 Identity", value: "web3 crypto identity" },
]

const AUTO_FIND_TARGET_COM_COUNT = 5
const AUTO_FIND_MAX_ATTEMPTS = 8
const AUTO_FIND_TIME_CAP_MS = 20_000
const AUTO_FIND_BATCH_SIZE = 16
const AUTO_FIND_ATTEMPT_DELAY_MS = 180
const AUTO_FIND_V2_MAX_ATTEMPTS = 8
// Enabled by default. Set NEXT_PUBLIC_AUTO_FIND_V2=false to opt out.
const AUTO_FIND_V2_ENABLED = process.env.NEXT_PUBLIC_AUTO_FIND_V2 !== "false"
// Keep auto-find UI local-first: hidden in production unless explicitly enabled.
const AUTO_FIND_UI_ENABLED = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_AUTO_FIND_UI === "true"
// Social checks stay out of the public workflow until the endpoint exposes a
// reliable available / unavailable / unknown tri-state instead of treating
// provider errors as a confirmed collision.
const SOCIAL_HANDLE_CHECK_ENABLED = false

const AUTO_FIND_PREFIXES = ["get", "try", "go", "hq"]
const AUTO_FIND_SUFFIXES = ["labs", "kit", "hub", "forge"]

const VIBE_MODIFIERS: Record<string, string[]> = {
  luxury: ["studio", "atelier", "prime"],
  futuristic: ["nova", "next", "quantum"],
  playful: ["spark", "pop", "joy"],
  trustworthy: ["secure", "solid", "trust"],
  minimal: ["core", "base", "plain"],
}

function splitWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

function lightlyRemoveInnerVowel(word: string): string {
  if (word.length < 5) return word
  const first = word[0]
  const rest = word.slice(1).replace(/[aeiou]/, "")
  return `${first}${rest}`
}

function shortenWord(word: string): string {
  if (word.length <= 6) return word
  return word.slice(0, 6)
}

function getIndustryModifier(industry: string): string {
  if (!industry) return ""
  const words = splitWords(industry).filter((word) => !["and", "the", "services"].includes(word))
  return words[0] || ""
}

function createBlend(first: string, second: string): string {
  if (!first) return second
  if (!second) return first
  const left = shortenWord(lightlyRemoveInnerVowel(first)).slice(0, 4)
  const right = shortenWord(lightlyRemoveInnerVowel(second)).slice(-4)
  return `${left}${right}`.replace(/[^a-z0-9]/g, "")
}

function buildRemixSeed(baseKeyword: string, vibe: string, industry: string, attempt: number): string {
  const words = splitWords(baseKeyword)
  if (words.length === 0) return baseKeyword

  const first = words[0]
  const second = words[1] || ""
  const prefix = AUTO_FIND_PREFIXES[attempt % AUTO_FIND_PREFIXES.length]
  const suffix = AUTO_FIND_SUFFIXES[attempt % AUTO_FIND_SUFFIXES.length]
  const vibeWords = VIBE_MODIFIERS[vibe] || []
  const vibeWord = vibeWords.length ? vibeWords[attempt % vibeWords.length] : ""
  const industryWord = getIndustryModifier(industry)
  const base = words.join(" ")
  const reversed = [...words].reverse().join(" ")
  const blendWithIndustry = createBlend(first, second || industryWord || vibeWord || "brand")
  const shortBase = words.map((word) => shortenWord(lightlyRemoveInnerVowel(word))).join(" ")

  const candidates = [
    base,
    reversed,
    `${prefix} ${base}`,
    `${base} ${suffix}`,
    blendWithIndustry,
    `${prefix} ${blendWithIndustry}`,
    `${blendWithIndustry} ${suffix}`,
    shortBase,
    vibeWord ? `${base} ${vibeWord}` : "",
    industryWord ? `${base} ${industryWord}` : "",
  ]
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  return candidates[attempt % candidates.length] || baseKeyword
}

function normaliseDomainName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      window.clearTimeout(timeoutId)
      signal.removeEventListener("abort", onAbort)
      reject(new DOMException("Aborted", "AbortError"))
    }

    signal.addEventListener("abort", onAbort)
  })
}

interface GenerateNamesProps {
  initialBrief?: string
  initialMode?: GenerateMode
  initialNames?: string
  hasInitialMode?: boolean
  initialSource?: GeneratorSource | null
  initialContentSlug?: string | null
  redesignEnabled?: boolean
  generatorToolsEnabled?: boolean
}

export function GenerateNames({
  initialBrief = "",
  initialMode = "quick",
  initialNames = "",
  hasInitialMode = false,
  initialSource = null,
  initialContentSlug = null,
  redesignEnabled = false,
  generatorToolsEnabled = true,
}: GenerateNamesProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isTestEnvironment = pathname === "/preview-gen"
  const journeyContextLabel = initialSource ? formatContentLabel(initialSource, initialContentSlug) : null
  const journeyMetadata = {
    source: initialSource || "direct",
    ...(initialContentSlug ? { contentSlug: initialContentSlug } : {}),
  }
  const attributedCheckoutHref = withPricingAttribution(PRODUCT_OFFER.paidCheckoutHref, {
    source: initialSource || "generator",
    ...(initialContentSlug ? { content: initialContentSlug } : {}),
    returnPath: generatorToolsEnabled ? "/generate" : "/bulk-domain-check/workspace",
  })
  const [keyword, setKeyword] = useState(initialBrief.slice(0, 160))
  const [selectedVibe, setSelectedVibe] = useState("luxury")
  const [selectedIndustry, setSelectedIndustry] = useState("")
  const [maxLength, setMaxLength] = useState(10)
  const [results, setResults] = useState<DomainResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationId, setGenerationId] = useState(0)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [copiedName, setCopiedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoFindComMode, setAutoFindComMode] = useState(false)
  const [availableComPicks, setAvailableComPicks] = useState<DomainResult[]>([])
  const [isAutoFindingComs, setIsAutoFindingComs] = useState(false)
  const [autoFindAttempt, setAutoFindAttempt] = useState(0)
  const [autoFindStatus, setAutoFindStatus] = useState<string | null>(null)
  const [autoFindSummary, setAutoFindSummary] = useState<AutoFindV2Summary | null>(null)
  const [showAutoFindControls, setShowAutoFindControls] = useState(false)
  const [autoFindControls, setAutoFindControls] = useState<AutoFindControlsState>({
    seed: "",
    mustIncludeKeyword: "partial",
    keywordPosition: "anywhere",
    style: "real_words",
    blocklist: "",
    allowlist: "",
    allowHyphen: false,
    allowNumbers: false,
    meaningFirst: true,
    preferTwoWordBrands: true,
    allowVibeSuffix: false,
    showAnyAvailable: false,
  })
  const [hasCustomTwoWordPreference, setHasCustomTwoWordPreference] = useState(false)

  // New state for filters and history
  const [selectedTldFilter, setSelectedTldFilter] = useState<string | null>(null)
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Social handle checker state
  const [socialHandle, setSocialHandle] = useState("")
  const [socialResults, setSocialResults] = useState<SocialResult[]>([])
  const [isCheckingSocials, setIsCheckingSocials] = useState(false)

  // Workflow state
  const [generateMode, setGenerateMode] = useState<GenerateMode>(generatorToolsEnabled ? initialMode : "bulk")
  const isQuickMode = generateMode === "quick"
  const isAdvancedMode = generateMode === "advanced"
  const isBulkMode = generateMode === "bulk"
  const [quickRhymeWith, setQuickRhymeWith] = useState("")
  const [quickVibe, setQuickVibe] = useState<QuickVibeId>("friendly")
  const [quickStyle, setQuickStyle] = useState<NameStyle>("auto")
  const [quickCreativity, setQuickCreativity] = useState<CreativityLevel>("balanced")
  const [quickBlacklist, setQuickBlacklist] = useState("")
  const [preferenceProfile, setPreferenceProfile] = useState<NamingPreferenceProfile>(createEmptyPreferenceProfile)
  const [explorationResults, setExplorationResults] = useState<GeneratedName[]>([])
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>("idle")
  const [previousBatchCount, setPreviousBatchCount] = useState(0)
  const [dislikedCandidateIds, setDislikedCandidateIds] = useState<Set<string>>(() => new Set())
  const [likedCandidateIds, setLikedCandidateIds] = useState<Set<string>>(() => new Set())
  const [dislikeReasonTarget, setDislikeReasonTarget] = useState<string | null>(null)
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null)
  const [selectedExplorationCandidateId, setSelectedExplorationCandidateId] = useState<string | null>(null)
  const [advancedWorkflowToken, setAdvancedWorkflowToken] = useState<string | null>(null)
  const [explorationAvailabilityToken, setExplorationAvailabilityToken] = useState<string | null>(null)
  const [isScoringFounderSignal, setIsScoringFounderSignal] = useState(false)
  const [scoreAllowanceExhausted, setScoreAllowanceExhausted] = useState(false)
  const [scoringError, setScoringError] = useState<string | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [sortByFounderSignal, setSortByFounderSignal] = useState(false)
  const [generationUpgradeHref, setGenerationUpgradeHref] = useState<string | null>(null)
  const [advancedAllowanceRemaining, setAdvancedAllowanceRemaining] = useState<number | null>(null)
  const [quickGenerationShortfall, setQuickGenerationShortfall] = useState<QuickGenerationShortfall | null>(null)
  const [currentGenerationMeta, setCurrentGenerationMeta] = useState<{ provider?: string | null; model?: string | null; promptVersion?: string | null }>({})

  // Bulk check state
  const [bulkInput, setBulkInput] = useState(initialNames.slice(0, 5000))
  const [description, setDescription] = useState(initialBrief.slice(0, 1000))
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [bulkFounderSignalUnlocked, setBulkFounderSignalUnlocked] = useState(false)
  const [bulkFounderSignalRequested, setBulkFounderSignalRequested] = useState(false)
  const [isProUser, setIsProUser] = useState(false)

  // Mobile UI state
  const [isMobileShortlistOpen, setIsMobileShortlistOpen] = useState(false)

  // Luxury UX state
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)

  // Advanced result filters
  const [minScore, setMinScore] = useState(0)
  const [includeWord, setIncludeWord] = useState("")
  const [excludeWord, setExcludeWord] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Bulk sort state
  const [bulkSortKey, setBulkSortKey] = useState<"score" | "length" | "availability">("score")
  const founderSignalUnlockedForCurrentMode = isBulkMode ? bulkFounderSignalUnlocked : isProUser
  const canUseScoreControls = founderSignalUnlockedForCurrentMode
  const quickMinimumLength = getQuickStyleMinimumLength(quickStyle)

  const handleQuickStyleChange = (style: NameStyle) => {
    setQuickStyle(style)
    setMaxLength((current) => Math.max(current, getQuickStyleMinimumLength(style)))
  }

  // ── Creativity features state ────────────────────────────────────────────
  const [battleQueue, setBattleQueue] = useState<{ name: string; tld?: string }[]>([])
  const [showBattle, setShowBattle] = useState(false)
  const [namesLikeTarget, setNamesLikeTarget] = useState<string | null>(null)
  const [showSavedBoard, setShowSavedBoard] = useState(false)

  // ── Refine Results state ─────────────────────────────────────────────────
  const [activeRefinement, setActiveRefinement] = useState<RefinementMode | null>(null)
  const [isRefining, setIsRefining] = useState(false)

  // Refs for UX scroll behaviour
  const resultsRef = useRef<HTMLDivElement>(null)
  const generateButtonRef = useRef<HTMLButtonElement>(null)

  const restoreGenerateButtonFocus = () => {
    // React still has the primary action disabled in the event-handler frame.
    // Wait until the idle/error state has committed before restoring focus.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => generateButtonRef.current?.focus({ preventScroll: true }))
    })
  }

  // Preference memory hook
  const { recordSearch, recordLike, recordUnlike } = useNamePreferences()

  // SEO Potential Check modal state
  const [seoCheckDomain, setSeoCheckDomain] = useState<{ name: string; tld: string } | null>(null)
  const generationAbortRef = useRef<AbortController | null>(null)
  const scoringAbortRef = useRef<AbortController | null>(null)
  const advancedGenerationRetryRef = useRef<{ fingerprint: string; requestId: string } | null>(null)
  const activeGenerationRef = useRef(0)
  const explorationResultsRef = useRef<GeneratedName[]>([])
  const scoringInFlightRef = useRef(false)
  const preferenceLoadedRef = useRef(false)
  const preferenceSaveReadyRef = useRef(false)
  const positivePreferenceProfileRef = useRef<NamingPreferenceProfile>(createEmptyPreferenceProfile())
  const activeDislikedCandidatesRef = useRef<Map<string, GeneratedName>>(new Map())
  const draftRestoredRef = useRef(false)
  const draftSaveReadyRef = useRef(false)
  const shortlistSaveReadyRef = useRef(false)
  const generationStoppedRef = useRef(false)

  // Engagement impressions are deduplicated per generated batch. Keeping the
  // mutation inside the owning effects avoids writing refs from event handlers
  // while still allowing a fresh batch to emit the same impression once.
  const resultsSeenTrackedRef = useRef<number | null>(null)
  const partnerCtaSeenTrackedRef = useRef<number | null>(null)
  const proOfferSeenTrackedRef = useRef<number | null>(null)

  // Score threshold for high-quality domains.
  const PREMIUM_SCORE_THRESHOLD = 75

  const redirectToPricingForLimit = (source: "generate" | "bulk_check" | "availability_check" | "refine") => {
    const from = source === "bulk_check" || isBulkMode ? "bulk-check" : "generate"

    trackEvent({
      action: "rate_limit_seen",
      metadata: { source, mode: from === "bulk-check" ? "bulk_check" : "generate", redirect: "pricing" },
    })
    trackEvent({
      action: "upgrade_clicked",
      metadata: { source, reason: "monthly_limit_redirect", destination: "pricing" },
    })
    trackEvent({
      action: "decision_action",
      metadata: { ...journeyMetadata, decisionAction: "pricing", ctaId: "monthly-limit" },
    })

    setError(null)
    router.push(`/pricing?reason=monthly-limit&from=${from}#plans`)
  }

  const redirectToCheckoutForProFeature = (source: string) => {
    trackEvent({
      action: "upgrade_clicked",
      metadata: { source, reason: "pro_feature_locked", destination: "checkout" },
    })
    trackEvent({
      action: "decision_action",
      metadata: { ...journeyMetadata, decisionAction: "pricing", ctaId: source },
    })
    trackEvent({
      action: "checkout_intent",
      metadata: { ...journeyMetadata, ctaId: source },
    })
    router.push(attributedCheckoutHref)
  }

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort()
      scoringAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void fetch("/api/subscription", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() as Promise<{ isPro?: boolean }> : null)
      .then((entitlements) => {
        if (!controller.signal.aborted) {
          setIsProUser(entitlements?.isPro === true)
        }
      })
      .catch((failure: unknown) => {
        if (!(failure instanceof DOMException && failure.name === "AbortError")) {
          // Fail closed: uncertain billing state must never unlock paid tools.
          setIsProUser(false)
        }
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!redesignEnabled || preferenceLoadedRef.current) return
    preferenceLoadedRef.current = true
    try {
      const savedProfile = localStorage.getItem(GENERATOR_PREFERENCE_STORAGE_KEY)
      if (savedProfile) {
        const restoredProfile = normalisePreferenceProfile(JSON.parse(savedProfile))
        positivePreferenceProfileRef.current = restoredProfile
        setPreferenceProfile(restoredProfile)
      } else {
        positivePreferenceProfileRef.current = createEmptyPreferenceProfile()
      }

      const savedHistory = localStorage.getItem(GENERATOR_HISTORY_STORAGE_KEY)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as { candidates?: unknown[] }
        setPreviousBatchCount(Array.isArray(parsed.candidates) ? parsed.candidates.length : 0)
      }
    } catch {
      const emptyProfile = createEmptyPreferenceProfile()
      positivePreferenceProfileRef.current = emptyProfile
      setPreferenceProfile(emptyProfile)
    }
    const readyTimer = window.setTimeout(() => {
      preferenceSaveReadyRef.current = true
    }, 0)
    return () => window.clearTimeout(readyTimer)
  }, [redesignEnabled])

  useEffect(() => {
    if (!redesignEnabled || !preferenceSaveReadyRef.current) return
    try {
      localStorage.setItem(GENERATOR_PREFERENCE_STORAGE_KEY, JSON.stringify(preferenceProfile))
    } catch {
      // Storage can be unavailable in privacy modes; preferences stay in memory.
    }
  }, [preferenceProfile, redesignEnabled])

  useEffect(() => {
    explorationResultsRef.current = explorationResults
  }, [explorationResults])

  useEffect(() => {
    if (hasCustomTwoWordPreference) return

    const shouldPreferTwoWord =
      (selectedVibe === "luxury" || selectedVibe === "trustworthy") && maxLength >= 9

    const frame = window.requestAnimationFrame(() => {
      setAutoFindControls((prev) =>
        prev.preferTwoWordBrands === shouldPreferTwoWord
          ? prev
          : {
              ...prev,
              preferTwoWordBrands: shouldPreferTwoWord,
            },
      )
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedVibe, maxLength, hasCustomTwoWordPreference])

  // Clean expired domain cache entries on mount
  useEffect(() => { clearExpired() }, [])

  // Restore the shortlist and in-progress brief after auth or navigation.
  useEffect(() => {
    if (draftRestoredRef.current) return
    draftRestoredRef.current = true
    const restoreFrame = window.requestAnimationFrame(() => {
      try {
        const savedShortlist = localStorage.getItem(STORAGE_KEYS.SHORTLIST)
        if (savedShortlist) {
          setShortlist(JSON.parse(savedShortlist))
        }
        const savedHistory = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY)
        if (savedHistory) {
          setSearchHistory(JSON.parse(savedHistory))
        }
        const savedDraft = localStorage.getItem(STORAGE_KEYS.WORKFLOW_DRAFT)
        if (savedDraft) {
          const draft = JSON.parse(savedDraft) as {
            mode?: GenerateMode
            keyword?: string
            description?: string
            bulkInput?: string
          }
          const hasInitialBrief = Boolean(initialBrief)
          const hasInitialNames = Boolean(initialNames)
          if (
            generatorToolsEnabled
            && !hasInitialMode
            && (draft.mode === "quick" || draft.mode === "advanced" || draft.mode === "bulk")
          ) setGenerateMode(draft.mode)
          if (!hasInitialBrief && typeof draft.keyword === "string") setKeyword(draft.keyword.slice(0, 160))
          if (!hasInitialBrief && typeof draft.description === "string") setDescription(draft.description.slice(0, 1000))
          if (!hasInitialNames && typeof draft.bulkInput === "string") setBulkInput(draft.bulkInput.slice(0, 5000))
        }
      } catch (e) {
        console.error("Error loading from localStorage:", e)
      }
    })
    return () => window.cancelAnimationFrame(restoreFrame)
  }, [generatorToolsEnabled, hasInitialMode, initialBrief, initialNames])

  // Save shortlist to localStorage whenever it changes
  useEffect(() => {
    if (!shortlistSaveReadyRef.current) {
      shortlistSaveReadyRef.current = true
      return
    }
    try {
      localStorage.setItem(STORAGE_KEYS.SHORTLIST, JSON.stringify(shortlist))
    } catch (e) {
      console.error("Error saving shortlist:", e)
    }
  }, [shortlist])

  useEffect(() => {
    if (!draftSaveReadyRef.current) {
      draftSaveReadyRef.current = true
      return
    }
    try {
      localStorage.setItem(STORAGE_KEYS.WORKFLOW_DRAFT, JSON.stringify({
        mode: generateMode,
        keyword,
        description,
        bulkInput,
      }))
    } catch (e) {
      console.error("Error saving naming draft:", e)
    }
  }, [bulkInput, description, generateMode, keyword])

  // Input hint: debounced mode-aware hint while typing
  useEffect(() => {
    const hasEnoughInput = keyword.trim().length >= 3
    const t = window.setTimeout(
      () => setAiHint(
        hasEnoughInput
          ? isQuickMode
            ? redesignEnabled
              ? "Quick Generate is ready for free creative exploration."
              : "Quick Generate is ready and counts toward your monthly allowance."
            : "Analysing keyword structure..."
          : null,
      ),
      hasEnoughInput ? 600 : 0,
    )
    return () => window.clearTimeout(t)
  }, [keyword, isQuickMode, redesignEnabled])

  // Loading step cycle
  useEffect(() => {
    if (!isGenerating || (redesignEnabled && !isBulkMode)) return
    const reset = window.setTimeout(() => setLoadingStep(0), 0)
    const t = setInterval(() => setLoadingStep((s) => (s + 1) % LOADING_STEPS.length), 1200)
    return () => {
      window.clearTimeout(reset)
      clearInterval(t)
    }
  }, [isBulkMode, isGenerating, redesignEnabled])

  useEffect(() => {
    if (!isBulkMode || bulkFounderSignalUnlocked) return
    const frame = window.requestAnimationFrame(() => {
      if (bulkSortKey === "score") setBulkSortKey("availability")
      if (minScore > 0) setMinScore(0)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [bulkFounderSignalUnlocked, bulkSortKey, isBulkMode, minScore])

  // Save search history to localStorage
  const addToSearchHistory = (term: string) => {
    const newHistory = [term, ...searchHistory.filter((h) => h !== term)].slice(0, 5)
    setSearchHistory(newHistory)
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(newHistory))
    } catch (e) {
      console.error("Error saving search history:", e)
    }
  }

  const retainCurrentExplorationBatch = () => {
    if (!redesignEnabled || explorationResults.length === 0) return
    const candidates = explorationResults.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      rationale: candidate.rationale,
      style: candidate.style,
      generationRank: candidate.generationRank,
    }))
    try {
      localStorage.setItem(
        GENERATOR_HISTORY_STORAGE_KEY,
        JSON.stringify({ version: 2, savedAt: Date.now(), candidates }),
      )
    } catch {
      // Keep generation functional if local storage is unavailable.
    }
    setPreviousBatchCount(candidates.length)
  }

  const syncLegacyExplorationResults = (candidates: GeneratedName[]) => {
    const next: DomainResult[] = candidates.flatMap((candidate) =>
      Object.entries(candidate.availability).map(([tld, availability]) => ({
        name: candidate.name,
        tld,
        fullDomain: availability.fullDomain || `${candidate.name.toLowerCase()}.${tld}`,
        available: availability.available === true,
        score:
          candidate.founderSignal?.status === "ready" && typeof candidate.founderSignal.score === "number"
            ? candidate.founderSignal.score
            : 0,
        pronounceable: true,
        memorability: 0,
        length: candidate.name.length,
        personality: candidate.rationale,
        personalDescription: candidate.rationale,
        styleRationale: candidate.style,
        registerUrl: availability.registerUrl,
        availabilityConfidence: availability.confidence ?? undefined,
        checkStatus:
          availability.status === "checking"
            ? "needs_verification"
            : availability.status,
      })),
    )
    setResults(next)
  }

  const preferredExplorationDomain = (candidate: GeneratedName): string => {
    const entries = Object.entries(candidate.availability)
    const preferred =
      entries.find(([, state]) => state.status === "available") ||
      entries.find(([, state]) => state.status === "likely_available" || state.status === "needs_verification") ||
      entries.find(([tld]) => tld === "com") ||
      entries[0]
    return preferred?.[1].fullDomain || `${candidate.name.toLowerCase()}.com`
  }

  const focusExplorationResults = () => {
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      resultsRef.current?.focus({ preventScroll: true })
    }, 80)
  }

  const startExplorationRequest = () => {
    retainCurrentExplorationBatch()
    generationAbortRef.current?.abort()
    scoringAbortRef.current?.abort()
    const requestId = activeGenerationRef.current + 1
    activeGenerationRef.current = requestId
    const abortController = new AbortController()
    generationAbortRef.current = abortController

    setExplorationResults([])
    setResults([])
    setDislikedCandidateIds(new Set())
    setSelectedExplorationCandidateId(null)
    setAdvancedWorkflowToken(null)
    setExplorationAvailabilityToken(null)
    setGenerationPhase("generating_names")
    setIsGenerating(true)
    setIsScoringFounderSignal(false)
    scoringInFlightRef.current = false
    setSortByFounderSignal(false)
    setScoringError(null)
    setAvailabilityError(null)
    setQuickGenerationShortfall(null)
    setGenerationUpgradeHref(null)
    setError(null)
    setSelectedTldFilter(null)
    setShowOnlyAvailable(false)
    setAvailableComPicks([])
    setAutoFindSummary(null)
    setAutoFindStatus(null)
    return { requestId, abortController }
  }

  const requestExplorationAvailability = async (
    candidates: GeneratedName[],
    tlds: readonly string[],
    workflowToken: string | null,
    signal: AbortSignal,
  ) => {
    if (!workflowToken) {
      throw new Error("Availability continuation is unavailable for this batch")
    }
    // check-domain caps expanded checks at 75. Keep the exact signed name set
    // in every request and split only the TLD dimension (Quick is 16 x 6).
    const chunks = planAvailabilityTldChunks(candidates.length, tlds)

    const settled = await Promise.allSettled(
      chunks.map(async (tldChunk) => {
        const response = await fetch("/api/check-domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            domains: candidates.map((candidate) => candidate.name),
            tlds: tldChunk,
            vibe: selectedVibe,
            workflowToken,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || data.error || "Domain checks are temporarily unavailable")
        return { tldChunk, data }
      }),
    )

    const successful = settled.filter(
      (result): result is PromiseFulfilledResult<{ tldChunk: string[]; data: any }> => result.status === "fulfilled",
    )
    if (successful.length === 0) throw new Error("Domain checks are temporarily unavailable")
    const failedTlds = settled.flatMap((result, index) => result.status === "rejected" ? chunks[index] : [])
    return {
      payload: { results: successful.flatMap((result) => Array.isArray(result.value.data.results) ? result.value.data.results : []) },
      failedTlds,
    }
  }

  const selectGenerateMode = (mode: GenerateMode) => {
    if (!generatorToolsEnabled && mode !== "bulk") return
    if (mode === generateMode) return
    if (redesignEnabled) {
      retainCurrentExplorationBatch()
      activeGenerationRef.current += 1
      generationAbortRef.current?.abort()
      scoringAbortRef.current?.abort()
      generationAbortRef.current = null
      scoringAbortRef.current = null
      scoringInFlightRef.current = false
      explorationResultsRef.current = []
      setExplorationResults([])
      setResults([])
      setSelectedExplorationCandidateId(null)
      setAdvancedWorkflowToken(null)
      setExplorationAvailabilityToken(null)
      advancedGenerationRetryRef.current = null
      setGenerationPhase("idle")
      setIsGenerating(false)
      setIsScoringFounderSignal(false)
      setScoringError(null)
      setAvailabilityError(null)
      setQuickGenerationShortfall(null)
      setSortByFounderSignal(false)
      setError(null)
    }
    setMaxLength((current) => {
      const minimum = mode === "quick" ? getQuickStyleMinimumLength(quickStyle) : 6
      return Math.min(15, Math.max(minimum, current))
    })
    setGenerateMode(mode)
  }

  // Group all results by name — one card per name, all checked TLDs shown as badges
  const groupedResults = useMemo(() => {
    const includeTerms = includeWord
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const excludeTerms = excludeWord
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    const map = new Map<string, DomainResult[]>()
    for (const r of results) {
      const existing = map.get(r.name) ?? []
      map.set(r.name, [...existing, r])
    }
    return Array.from(map.entries())
      .filter(([name, tldList]) => {
        const lowerName = name.toLowerCase()
        // TLD filter
        if (selectedTldFilter && !tldList.some((r) => r.tld === selectedTldFilter && r.available)) return false
        // Availability filter
        if (showOnlyAvailable && !tldList.some((r) => r.available)) return false
        // Min score filter
        if (canUseScoreControls && minScore > 0) {
          const best = tldList.reduce((b, r) => (resultScore(r) > resultScore(b) ? r : b), tldList[0])
          if (resultScore(best) < minScore) return false
        }
        // Include word filter
        if (includeTerms.length > 0 && !includeTerms.some((t) => lowerName.includes(t))) return false
        // Exclude word filter
        if (excludeTerms.some((t) => lowerName.includes(t))) return false
        return true
      })
      .map(([name, tldList]) => {
        const sorted = [...tldList].sort((a, b) => {
          const ai = TLD_PRIORITY.indexOf(a.tld)
          const bi = TLD_PRIORITY.indexOf(b.tld)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        const available = sorted.filter((r) => r.available)
        const best =
          available.length > 0
            ? available.reduce((b, r) => (resultScore(r) > resultScore(b) ? r : b))
            : sorted[0]
        return { name, tlds: sorted, best, hasAvailable: available.length > 0 }
      })
  }, [results, selectedTldFilter, showOnlyAvailable, minScore, includeWord, excludeWord, canUseScoreControls])

  // "Founder Favourite" — name with highest score among groups that have an available TLD
  const topPickName = useMemo(() => {
    if (isBulkMode && !bulkFounderSignalUnlocked) return null
    const withAvail = groupedResults.filter((g) => g.hasAvailable)
    if (!withAvail.length) return null
    return withAvail.reduce((best, g) => (resultScore(g.best) > resultScore(best.best) ? g : best)).name
  }, [bulkFounderSignalUnlocked, groupedResults, isBulkMode])

  useEffect(() => {
    if (isGenerating || groupedResults.length === 0 || resultsSeenTrackedRef.current === generationId) return

    resultsSeenTrackedRef.current = generationId
    trackEvent({
      action: "results_seen",
      metadata: {
        mode: isBulkMode ? "bulk_check" : isQuickMode ? "quick_generate" : "advanced_generate",
        resultCount: groupedResults.length,
        vibe: selectedVibe,
        industry: selectedIndustry,
      },
    })
  }, [generationId, groupedResults.length, isBulkMode, isGenerating, isQuickMode, selectedIndustry, selectedVibe])

  const stopAutoFindSearch = () => {
    generationStoppedRef.current = true
    generationAbortRef.current?.abort()
    if (redesignEnabled && !isBulkMode) {
      activeGenerationRef.current += 1
      generationAbortRef.current = null
      setExplorationResults([])
      setResults([])
      setSelectedExplorationCandidateId(null)
      setQuickGenerationShortfall(null)
      setGenerationPhase("idle")
      setIsGenerating(false)
      restoreGenerateButtonFocus()
    }
  }

  const handleRerollFlair = () => {
    if (isGenerating || !keyword.trim()) return
    handleGenerate()
  }

  const applyAutoFindSuggestion = (suggestion: string) => {
    if (suggestion === "increase_length") {
      setMaxLength((prev) => Math.min(15, prev + 2))
      return
    }

    if (suggestion === "two_word_mode") {
      setHasCustomTwoWordPreference(true)
      setAutoFindControls((prev) => ({ ...prev, preferTwoWordBrands: true }))
      return
    }

    if (suggestion === "allow_suffix") {
      setAutoFindControls((prev) => ({ ...prev, allowVibeSuffix: true }))
      return
    }

    if (suggestion === "switch_tld_io_ai") {
      setSelectedTldFilter("io")
      setShowOnlyAvailable(true)
      return
    }

    if (suggestion === "show_any_available") {
      setAutoFindControls((prev) => ({ ...prev, showAnyAvailable: true }))
      return
    }
  }

  const getSuggestionLabel = (suggestion: string): string => {
    if (suggestion === "increase_length") return "+2 length"
    if (suggestion === "two_word_mode") return "2-word mode"
    if (suggestion === "allow_suffix") return "Allow suffix"
    if (suggestion === "switch_tld_io_ai") return "Switch TLD: .io/.ai"
    if (suggestion === "show_any_available") return "Show any available"
    if (suggestion === "retry") return "Retry"
    return suggestion
  }

  const extractDomainData = (domains: any[]): { names: string[]; insights: Record<string, DomainInsight> } => {
    const uniqueNames = new Set<string>()
    const insights: Record<string, DomainInsight> = {}
    for (const domain of domains || []) {
      const rawName = typeof domain?.name === "string" ? domain.name : ""
      const normalised = normaliseDomainName(rawName)
      if (normalised.length >= 3 && normalised.length <= 63) {
        uniqueNames.add(normalised)
        const insight: DomainInsight = {}
        if (typeof domain?.meaning === "string" && domain.meaning.trim().length > 0) {
          insight.meaning = domain.meaning.trim()
        } else if (typeof domain?.meaningShort === "string" && domain.meaningShort.trim().length > 0) {
          insight.meaning = domain.meaningShort.trim()
        } else if (typeof domain?.reasoning === "string" && domain.reasoning.trim().length > 0) {
          insight.meaning = domain.reasoning.trim()
        }

        if (typeof domain?.meaningShort === "string" && domain.meaningShort.trim().length > 0) {
          insight.meaningShort = domain.meaningShort.trim()
        }
        if (typeof domain?.reasoning === "string" && domain.reasoning.trim().length > 0) {
          insight.reasoning = domain.reasoning.trim()
        }
        if (typeof domain?.personalDescription === "string" && domain.personalDescription.trim().length > 0) {
          insight.personalDescription = domain.personalDescription.trim()
        }
        if (typeof domain?.styleRationale === "string" && domain.styleRationale.trim().length > 0) {
          insight.styleRationale = domain.styleRationale.trim()
        }
        if (typeof domain?.slogan === "string" && domain.slogan.trim().length > 0) {
          insight.slogan = domain.slogan.trim()
        }

        if (Object.keys(insight).length > 0) {
          insights[normalised] = insight
        }
      }
    }
    return { names: Array.from(uniqueNames), insights }
  }

  const requestGeneratedNames = async (
    seedKeyword: string,
    count: number | null,
    signal: AbortSignal,
  ): Promise<{ names: string[]; insights: Record<string, DomainInsight>; isPro: boolean; availabilityToken?: string }> => {
    const payload: Record<string, unknown> = {
      keyword: seedKeyword,
      vibe: selectedVibe,
      industry: selectedIndustry,
      maxLength,
      generatorV2: true,
      seed: `generate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      alreadySeen: results.map((result) => result.name),
    }

    if (isTestEnvironment) {
      payload.nameStyle = "mix"
      payload.meaningMode = true
    }

    if (typeof count === "number") {
      payload.count = count
    }

    const response = await fetch("/api/generate-domains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify(payload),
    })

    const responseData = await response.json()
    if (!response.ok) {
      if (response.status === 429) {
        redirectToPricingForLimit("generate")
        throw createPricingRedirectError()
      }
      throw new Error(responseData.error || "Failed to generate domain names")
    }
    setCurrentGenerationMeta({
      provider: typeof responseData.generation === "string" ? responseData.generation : null,
      model: typeof responseData.generationMeta?.model === "string" ? responseData.generationMeta.model : null,
      promptVersion: "generate-domains-v2",
    })

    return {
      ...extractDomainData(responseData.domains || []),
      isPro: Boolean(responseData.isPro),
      availabilityToken: typeof responseData.availabilityToken === "string" ? responseData.availabilityToken : undefined,
    }
  }

  const requestAvailability = async (
    domainNames: string[],
    tlds: string[] | undefined,
    signal: AbortSignal,
    workflowToken?: string,
  ): Promise<DomainResult[]> => {
    const response = await fetch("/api/check-domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ domains: domainNames, tlds, vibe: selectedVibe, workflowToken }),
    })

    const responseData = await response.json()
    if (!response.ok) {
      if (response.status === 429) {
        redirectToPricingForLimit("availability_check")
        throw createPricingRedirectError()
      }
      throw new Error("Failed to check domain availability")
    }

    const apiResults: DomainResult[] = responseData.results || []
    setIsProUser(Boolean(responseData.founderSignalUnlocked))

    setCachedBatch(
      apiResults.map((r) => ({
        domain: r.fullDomain,
        status: (r.checkStatus ?? (r.available ? "available" : "taken")) as Parameters<typeof setCachedBatch>[0][number]["status"],
        available: r.available,
      }))
    )

    return apiResults
  }

  const applyDomainInsight = (result: DomainResult, insights: Record<string, DomainInsight>): DomainResult => {
    const insight = insights[result.name]
    if (!insight) return result

    return {
      ...result,
      meaning: insight.meaning ?? result.meaning,
      meaningBreakdown: insight.meaningShort ?? result.meaningBreakdown,
      whyItWorks: insight.reasoning ?? result.whyItWorks,
      personalDescription: insight.personalDescription ?? result.personalDescription,
      styleRationale: insight.styleRationale ?? result.styleRationale,
      slogan: insight.slogan ?? result.slogan,
    }
  }

  const requestAutoFindV2 = async (
    baseKeyword: string,
    signal: AbortSignal,
  ): Promise<{ picks: DomainResult[]; summary: AutoFindV2Summary; isPro: boolean }> => {
    const resolvedSeed =
      autoFindControls.seed.trim() || `auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

    const response = await fetch("/api/generate-domains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        autoFindV2: true,
        keyword: baseKeyword,
        vibe: selectedVibe,
        industry: selectedIndustry,
        maxLength,
        tlds: ALL_TLDS,
        targetCount: AUTO_FIND_TARGET_COM_COUNT,
        controls: {
          seed: resolvedSeed,
          mustIncludeKeyword: autoFindControls.mustIncludeKeyword,
          keywordPosition: autoFindControls.keywordPosition,
          style: autoFindControls.style,
          blocklist: autoFindControls.blocklist
            .split(/[,\n]/)
            .map((entry) => entry.trim())
            .filter(Boolean),
          allowlist: autoFindControls.allowlist
            .split(/[,\n]/)
            .map((entry) => entry.trim())
            .filter(Boolean),
          allowHyphen: autoFindControls.allowHyphen,
          allowNumbers: autoFindControls.allowNumbers,
          meaningFirst: autoFindControls.meaningFirst,
          preferTwoWordBrands: autoFindControls.preferTwoWordBrands,
          allowVibeSuffix: autoFindControls.allowVibeSuffix,
          showAnyAvailable: autoFindControls.showAnyAvailable,
        },
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(responseData.message || responseData.error || "Failed to auto-find top domains")
    }

    return {
      picks: responseData.picks || [],
      summary: responseData.summary || {
        found: 0,
        target: AUTO_FIND_TARGET_COM_COUNT,
        attempts: 0,
        maxAttempts: AUTO_FIND_V2_MAX_ATTEMPTS,
        generatedCandidates: 0,
        passedFilters: 0,
        checkedAvailability: 0,
        providerErrors: 0,
        availabilityHitRate: 0,
        qualityThreshold: 0,
        relaxationsApplied: [],
        topRejectedReasons: [],
        checkingProgress: "Checking 0/0... Found 0/5",
        suggestions: [],
        nearMisses: [],
        explanation: "No summary available.",
      },
      isPro: responseData.isPro || false,
    }
  }

  const mergeAvailableComResults = (
    current: DomainResult[],
    next: DomainResult[],
  ): DomainResult[] => {
    const picked = new Map<string, DomainResult>()

    for (const result of [...current, ...next]) {
      if (result.tld !== "com" || !result.available) continue
      if (!picked.has(result.fullDomain)) {
        picked.set(result.fullDomain, result)
      }
    }

    return Array.from(picked.values())
      .sort((a, b) => resultScore(b) - resultScore(a) || a.length - b.length)
      .slice(0, AUTO_FIND_TARGET_COM_COUNT)
  }

  // Check social handles
  const checkSocialHandles = async (handle: string) => {
    if (!handle.trim()) return
    setIsCheckingSocials(true)
    setSocialResults([])

    try {
      const response = await fetch("/api/check-socials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim() }),
      })

      const data = await response.json()
      if (data.success) {
        setSocialResults(data.results)
      }
    } catch (error) {
      console.error("Error checking socials:", error)
    } finally {
      setIsCheckingSocials(false)
    }
  }

  const scoreBulkResults = async (availabilityResults: DomainResult[]) => {
    if (availabilityResults.length === 0) return availabilityResults
    setIsScoringFounderSignal(true)
    setScoringError(null)
    setGenerationUpgradeHref(null)

    try {
      const response = await fetch("/api/founder-signal/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domains: availabilityResults.map(({ name, tld }) => ({ name, tld })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setGenerationUpgradeHref(typeof data.upgradeUrl === "string" ? data.upgradeUrl : null)
        throw new Error(data.message || data.error || "Founder Signal could not score this shortlist")
      }

      const scores = new Map<string, DomainResult>(
        (Array.isArray(data.results) ? data.results : []).map((result: DomainResult) => [result.fullDomain, result]),
      )
      const scoredResults = availabilityResults.map((result) => ({
        ...result,
        ...(scores.get(result.fullDomain) || {}),
      }))
      setResults(scoredResults)
      setBulkFounderSignalUnlocked(true)
      setIsProUser(Boolean(data.isPro))
      setBulkSortKey("score")
      setError(null)
      return scoredResults
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "Founder Signal could not score this shortlist"
      setScoringError(message)
      setError(message)
      return availabilityResults
    } finally {
      setIsScoringFounderSignal(false)
    }
  }

  // Bulk check handler
  const handleBulkCheck = async () => {
    if (!bulkInput.trim()) return

    // Parse domains - split by newlines, commas, or spaces
    const domains = bulkInput
      .split(/[\n,\s]+/)
      .map((d) => d.trim().replace(/\.[a-z]+$/i, "")) // Remove TLD if included
      .filter((d) => d.length > 0 && d.length <= 63)
      .slice(0, 50) // Limit to 50 domains

    if (domains.length === 0) {
      setError("Please enter at least one valid domain name")
      return
    }

    setIsGenerating(true)
    setError(null)
    setSelectedTldFilter(null)
    setShowOnlyAvailable(false)
    setBulkFounderSignalUnlocked(false)
    setScoringError(null)
    setGenerationUpgradeHref(null)
    setGenerationId((value) => value + 1)
    trackEvent({
      action: "bulk_check",
      metadata: { source: "generate_page", count: domains.length },
    })

    try {
      const response = await fetch("/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains, includeFounderSignal: false }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          redirectToPricingForLimit("bulk_check")
          return
        }
        throw new Error("Failed to check domains")
      }

      setBulkFounderSignalUnlocked(false)
      setIsProUser(Boolean(data.isPro))
      const availabilityResults = Array.isArray(data.results) ? data.results as DomainResult[] : []
      setResults(availabilityResults)
      if (bulkFounderSignalRequested) await scoreBulkResults(availabilityResults)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300)
    } catch (error: any) {
      if (error?.name === "AbortError") return
      console.error("Error checking domains:", error)
      setError(error.message || "Failed to check domains")
    } finally {
      setIsGenerating(false)
    }
  }

  const completeCandidateGeneration = (
    candidates: GeneratedName[],
    requestId: number,
    isPro: boolean,
  ) => {
    if (activeGenerationRef.current !== requestId) return false
    explorationResultsRef.current = candidates
    setExplorationResults(candidates)
    setSelectedExplorationCandidateId(candidates[0]?.id ?? null)
    syncLegacyExplorationResults(candidates)
    setIsProUser(isPro)
    if (isPro) {
      setScoreAllowanceExhausted(false)
    }
    setGenerationPhase("names_ready")
    setIsGenerating(false)
    focusExplorationResults()
    trackEvent({
      action: "names_visible",
      metadata: { source: "generator", experiment: "generator_redesign_v2" },
    })
    window.setTimeout(() => {
      if (activeGenerationRef.current === requestId && !scoringInFlightRef.current) {
        setGenerationPhase("checking_domains")
      }
    }, 0)
    return true
  }

  const finishExplorationAvailability = (
    requestId: number,
    availabilityPayload: unknown,
    failedTlds: readonly string[] = [],
  ) => {
    if (activeGenerationRef.current !== requestId) return
    const withSuccessfulChecks = mergeAvailability(explorationResultsRef.current, availabilityPayload)
    const merged = failedTlds.length > 0
      ? markAvailabilityTldsFailed(withSuccessfulChecks, failedTlds)
      : withSuccessfulChecks
    explorationResultsRef.current = merged
    setExplorationResults(merged)
    syncLegacyExplorationResults(merged)
    if (failedTlds.length > 0) {
      setAvailabilityError(`Names are ready. Checks for ${failedTlds.map((tld) => `.${tld}`).join(", ")} could not finish; verify those favourites with the registrar.`)
    }
    if (!scoringInFlightRef.current) setGenerationPhase("ready")
    generationAbortRef.current = null
  }

  const failExplorationAvailability = (requestId: number) => {
    if (activeGenerationRef.current !== requestId) return
    const failed = markAvailabilityFailed(explorationResultsRef.current)
    explorationResultsRef.current = failed
    setExplorationResults(failed)
    syncLegacyExplorationResults(failed)
    setAvailabilityError("Names are ready, but live domain checks could not finish. Verify any favourite directly with the registrar.")
    if (!scoringInFlightRef.current) setGenerationPhase("ready")
    generationAbortRef.current = null
  }

  const handleRedesignedQuickGenerate = async () => {
    const resolvedDescription = description.trim() || keyword.trim()
    if (!resolvedDescription) return
    if (description.trim()) setKeyword(description.trim().slice(0, 160))

    const { requestId, abortController } = startExplorationRequest()
    setGenerationId((value) => value + 1)
    addToSearchHistory(resolvedDescription)
    trackEvent({
      action: "brief_submitted",
      metadata: { ...journeyMetadata, mode: "quick", ctaId: "generator-primary", experiment: "generator_redesign_v2" },
    })
    trackEvent({
      action: "quick_generate_started",
      metadata: { source: "generator", experiment: "generator_redesign_v2" },
    })

    try {
      const response = await fetch("/api/quick-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          description: resolvedDescription,
          rhymeWith: quickRhymeWith.trim() || undefined,
          vibe: quickVibe,
          style: quickStyle,
          creativity: quickCreativity,
          maxChars: maxLength,
          count: 16,
          blacklist: parseBlacklist(quickBlacklist),
          preferences: {
            likedStyles: preferenceProfile.likedStyles,
            dislikedStyles: preferenceProfile.dislikedStyles,
            preferredLength: preferenceProfile.preferredLength,
            preferredSounds: preferenceProfile.preferredSounds,
            avoidedSounds: preferenceProfile.avoidedSounds,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || "Could not generate names")
      setCurrentGenerationMeta({
        provider: typeof data.generation === "string" ? data.generation : null,
        model: typeof data.generationMeta?.model === "string" ? data.generationMeta.model : null,
        promptVersion: "quick-candidate-first-v2",
      })

      const candidates = parseGeneratedCandidates(data, QUICK_GENERATE_TLDS, 16)
      if (candidates.length === 0) throw new Error("No usable names came back. Please try another creative direction.")
      if (quickStyle === "auto" && candidates.length < 16) {
        throw new Error("We could not complete a full 16-name batch safely. Please retry or adjust the brief.")
      }
      const shortfall = parseQuickGenerationShortfall(data, quickStyle, candidates.length, 16)
      if (quickStyle !== "auto" && candidates.length < 16 && !shortfall) {
        throw new Error("The selected style returned an incomplete batch without a safe explanation. Please retry.")
      }
      const availabilityToken = typeof data.availabilityToken === "string" ? data.availabilityToken : null
      setExplorationAvailabilityToken(availabilityToken)
      if (!completeCandidateGeneration(candidates, requestId, Boolean(data.isPro))) return
      setQuickGenerationShortfall(shortfall)

      trackEvent({
        action: "quick_generate_results",
        metadata: { source: "generator", experiment: "generator_redesign_v2" },
      })

      try {
        const availability = await requestExplorationAvailability(
          candidates,
          QUICK_GENERATE_TLDS,
          availabilityToken,
          abortController.signal,
        )
        finishExplorationAvailability(requestId, availability.payload, availability.failedTlds)
      } catch (availabilityFailure: unknown) {
        if (availabilityFailure instanceof DOMException && availabilityFailure.name === "AbortError") return
        failExplorationAvailability(requestId)
      }

    } catch (failure: unknown) {
      if (failure instanceof DOMException && failure.name === "AbortError") return
      if (activeGenerationRef.current !== requestId) return
      setError(failure instanceof Error ? failure.message : "Could not generate names")
      setGenerationPhase("idle")
      setIsGenerating(false)
      generationAbortRef.current = null
      restoreGenerateButtonFocus()
    }
  }

  const handleRedesignedAdvancedGenerate = async () => {
    const resolvedKeyword = description.trim() || keyword.trim()
    if (!resolvedKeyword) return
    if (description.trim()) setKeyword(description.trim().slice(0, 160))

    // Keep the id only across a failed/lost response for the exact same in-memory
    // settings. A successful batch clears it so an intentional rerun consumes a
    // new Advanced allowance. The raw brief is never persisted.
    const requestFingerprint = JSON.stringify([resolvedKeyword, selectedVibe, selectedIndustry, maxLength])
    const priorRequest = advancedGenerationRetryRef.current
    const workflowRequestId = priorRequest?.fingerprint === requestFingerprint
      ? priorRequest.requestId
      : globalThis.crypto.randomUUID()
    advancedGenerationRetryRef.current = { fingerprint: requestFingerprint, requestId: workflowRequestId }

    const { requestId, abortController } = startExplorationRequest()
    setGenerationId((value) => value + 1)
    addToSearchHistory(resolvedKeyword)
    recordSearch(selectedVibe, selectedIndustry, maxLength)
    trackEvent({
      action: "brief_submitted",
      metadata: { ...journeyMetadata, mode: "advanced", ctaId: "generator-primary", experiment: "generator_redesign_v2" },
    })
    trackEvent({
      action: "advanced_started",
      metadata: { source: "generator", experiment: "generator_redesign_v2" },
    })

    try {
      const response = await fetch("/api/generate-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          keyword: resolvedKeyword,
          vibe: selectedVibe,
          industry: selectedIndustry,
          maxLength,
          count: 12,
          generatorV2: true,
          requestId: workflowRequestId,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 429 && typeof data.upgradeUrl === "string") {
          setGenerationUpgradeHref(data.upgradeUrl)
        }
        throw new Error(data.message || data.error || "Could not generate names")
      }
      setCurrentGenerationMeta({
        provider: typeof data.generation === "string" ? data.generation : null,
        model: typeof data.generationMeta?.model === "string" ? data.generationMeta.model : null,
        promptVersion: "advanced-candidate-first-v2",
      })

      const candidates = parseGeneratedCandidates(data, ALL_TLDS, 12)
      if (candidates.length === 0) throw new Error("No usable names came back. Please refine the brief and try again.")
      if (typeof data.advancedGenerationAllowance?.remaining === "number") {
        setAdvancedAllowanceRemaining(data.advancedGenerationAllowance.remaining)
      }
      setAdvancedWorkflowToken(typeof data.workflowToken === "string" ? data.workflowToken : null)
      const availabilityToken = typeof data.availabilityToken === "string" ? data.availabilityToken : null
      setExplorationAvailabilityToken(availabilityToken)
      if (!completeCandidateGeneration(candidates, requestId, Boolean(data.isPro))) return
      advancedGenerationRetryRef.current = null

      trackEvent({
        action: "name_generation",
        metadata: { source: "generator", experiment: "generator_redesign_v2" },
      })

      try {
        const availability = await requestExplorationAvailability(
          candidates,
          ALL_TLDS,
          availabilityToken,
          abortController.signal,
        )
        finishExplorationAvailability(requestId, availability.payload, availability.failedTlds)
      } catch (availabilityFailure: unknown) {
        if (availabilityFailure instanceof DOMException && availabilityFailure.name === "AbortError") return
        failExplorationAvailability(requestId)
      }

      if (autoFindComMode) {
        if (!Boolean(data.isPro)) {
          setAutoFindStatus("Auto-find is included with Pro. Your 12-name shortlist is ready above.")
        } else if (!AUTO_FIND_V2_ENABLED) {
          setAutoFindStatus("Auto-find is temporarily unavailable. Your 12-name shortlist is ready above.")
        } else {
          setIsAutoFindingComs(true)
          setAutoFindAttempt(1)
          setAutoFindStatus(`Scanning highest Founder Signal domains... (Attempt 1/${AUTO_FIND_V2_MAX_ATTEMPTS})`)
          try {
            const autoFindV2Result = await requestAutoFindV2(resolvedKeyword, abortController.signal)
            setIsProUser(autoFindV2Result.isPro)
            setAvailableComPicks(autoFindV2Result.picks)
            setAutoFindSummary(autoFindV2Result.summary)
            setAutoFindAttempt(Math.max(1, autoFindV2Result.summary.attempts))
            setAutoFindStatus(
              `${autoFindV2Result.summary.checkingProgress} (Attempt ${autoFindV2Result.summary.attempts}/${autoFindV2Result.summary.maxAttempts})`,
            )
          } catch (autoFindFailure: unknown) {
            if (autoFindFailure instanceof DOMException && autoFindFailure.name === "AbortError") return
            setAutoFindStatus(
              autoFindFailure instanceof Error
                ? `Auto-find paused: ${autoFindFailure.message}`
                : "Auto-find paused. Your 12-name shortlist is still ready above.",
            )
          } finally {
            setIsAutoFindingComs(false)
          }
        }
      }
    } catch (failure: unknown) {
      if (failure instanceof DOMException && failure.name === "AbortError") return
      if (activeGenerationRef.current !== requestId) return
      setError(failure instanceof Error ? failure.message : "Could not generate names")
      setGenerationPhase("idle")
      setIsGenerating(false)
      generationAbortRef.current = null
      restoreGenerateButtonFocus()
    }
  }

  const handleQuickGenerate = async () => {
    if (redesignEnabled) {
      await handleRedesignedQuickGenerate()
      return
    }
    const resolvedDescription = description.trim() || keyword.trim()
    if (!resolvedDescription) return

    generationAbortRef.current?.abort()
    const abortController = new AbortController()
    generationAbortRef.current = abortController

    if (description.trim()) setKeyword(description.trim().slice(0, 160))

    setIsGenerating(true)
    setError(null)
    setSelectedTldFilter(null)
    setShowOnlyAvailable(false)
    setGenerationId((n) => n + 1)
    // A failed or paused generation must never leave an earlier shortlist on
    // screen as if it belonged to the new brief. The redesigned flow already
    // clears both stores in startExplorationRequest; retain the same safety
    // guarantee if a rollout flag ever routes this page through legacy mode.
    setResults([])
    setAvailableComPicks([])
    setAutoFindSummary(null)
    setAutoFindStatus(null)

    trackEvent({
      action: "brief_submitted",
      metadata: { ...journeyMetadata, mode: "quick", ctaId: "generator-primary" },
    })
    trackEvent({
      action: "quick_generate_started",
      metadata: {
        ...journeyMetadata,
        vibe: quickVibe,
        maxLength,
        hasRhyme: Boolean(quickRhymeWith.trim()),
      },
    })

    addToSearchHistory(resolvedDescription)

    try {
      const response = await fetch("/api/quick-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          description: resolvedDescription,
          rhymeWith: quickRhymeWith.trim(),
          vibe: quickVibe,
          maxChars: maxLength,
          count: 12,
          preferences: {
            likedStyles: preferenceProfile.likedStyles,
            dislikedStyles: preferenceProfile.dislikedStyles,
            preferredLength: preferenceProfile.preferredLength,
            preferredSounds: preferenceProfile.preferredSounds,
            avoidedSounds: preferenceProfile.avoidedSounds,
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to generate free names")
      }
      setCurrentGenerationMeta({
        provider: typeof data.generation === "string" ? data.generation : null,
        model: typeof data.generationMeta?.model === "string" ? data.generationMeta.model : null,
        promptVersion: "quick-legacy",
      })

      const quickResults: DomainResult[] = (data.results || []).map((result: any) => ({
        name: result.name,
        tld: result.tld || "com",
        fullDomain: result.fullDomain,
        available: Boolean(result.available),
        score: result.available ? 1 : 0,
        pronounceable: true,
        memorability: 0,
        length: result.name.length,
        personality: result.personality,
        registerUrl: result.registerUrl,
        availabilityConfidence: result.availabilityConfidence || "low",
        checkStatus: result.checkStatus || (result.available ? "available" : "taken"),
      }))

      setIsProUser(Boolean(data.isPro))
      setResults(quickResults)
      trackEvent({
        action: "quick_generate_results",
        metadata: {
          ...journeyMetadata,
          resultCount: new Set(quickResults.map((result) => result.name)).size,
          availableCount: quickResults.filter((result) => result.available).length,
          vibe: quickVibe,
          modelCandidateCount: data.quality?.modelCandidateCount,
          fallbackCandidateCount: data.quality?.fallbackCandidateCount,
        },
      })
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300)
    } catch (error: any) {
      if (error?.name === "AbortError") return
      console.error("Error in quick generate:", error)
      setError(error.message || "Failed to generate free names")
    } finally {
      setIsGenerating(false)
      generationAbortRef.current = null
    }
  }

  const handleGenerate = async () => {
    if (redesignEnabled) {
      await handleRedesignedAdvancedGenerate()
      return
    }
    // Accept either keyword or description as the input
    const resolvedKeyword = description.trim() || keyword.trim()
    if (!resolvedKeyword) return
    generationAbortRef.current?.abort()
    const abortController = new AbortController()
    generationAbortRef.current = abortController
    generationStoppedRef.current = false

    // Ensure keyword state reflects what we're generating with
    if (description.trim()) setKeyword(description.trim().slice(0, 160))

    setIsGenerating(true)
    setIsAutoFindingComs(false)
    setAutoFindAttempt(0)
    setAutoFindStatus(null)
    setAutoFindSummary(null)
    setAvailableComPicks([])
    setError(null)
    setSelectedTldFilter(null) // Reset filters on new search
    setShowOnlyAvailable(false)
    setGenerationId((n) => n + 1) // Reset Deep Search on new generation
    trackEvent({
      action: "brief_submitted",
      metadata: { ...journeyMetadata, mode: "advanced", ctaId: "generator-primary" },
    })
    trackEvent({
      action: "generate_started",
      metadata: {
        ...journeyMetadata,
        vibe: selectedVibe,
        industry: selectedIndustry,
        maxLength,
      },
    })

    // Add to search history and record preference signal
    const baseKeyword = resolvedKeyword
    addToSearchHistory(baseKeyword)
    recordSearch(selectedVibe, selectedIndustry, maxLength)

    try {
      const { names: initialNames, insights: initialInsights, isPro, availabilityToken } = await requestGeneratedNames(baseKeyword, null, abortController.signal)
      setIsProUser(isPro)
      if (initialNames.length === 0) {
        throw new Error("No domain candidates were generated. Please try again.")
      }

      const initialResults = (await requestAvailability(initialNames, undefined, abortController.signal, availabilityToken))
        .map((result) => applyDomainInsight(result, initialInsights))
      const availableNames = new Set(initialResults.filter((r) => r.available).map((r) => r.name))
      setResults(initialResults)
      trackEvent({
        action: "name_generation",
        metadata: {
          ...journeyMetadata,
          resultCount: initialResults.length,
          availableCount: availableNames.size,
          vibe: selectedVibe,
          industry: selectedIndustry,
        },
      })
      // Smooth-scroll to results after first batch arrives
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300)

      if (autoFindComMode && isPro) {
        if (AUTO_FIND_V2_ENABLED) {
          setIsAutoFindingComs(true)
          setAutoFindAttempt(1)
          setAutoFindStatus(`Scanning highest Founder Signal domains... (Attempt 1/${AUTO_FIND_V2_MAX_ATTEMPTS})`)

          const autoFindV2Result = await requestAutoFindV2(baseKeyword, abortController.signal)
          setIsProUser(autoFindV2Result.isPro)
          setAvailableComPicks(autoFindV2Result.picks)
          setAutoFindSummary(autoFindV2Result.summary)
          setAutoFindAttempt(Math.max(1, autoFindV2Result.summary.attempts))
          setAutoFindStatus(
            `${autoFindV2Result.summary.checkingProgress} (Attempt ${autoFindV2Result.summary.attempts}/${autoFindV2Result.summary.maxAttempts})`,
          )
        } else {
          let comPicks = mergeAvailableComResults([], initialResults)
          setAvailableComPicks(comPicks)

          if (comPicks.length < AUTO_FIND_TARGET_COM_COUNT) {
            setIsAutoFindingComs(true)
            const startedAt = Date.now()
            let attempt = 1

            while (
              comPicks.length < AUTO_FIND_TARGET_COM_COUNT &&
              attempt <= AUTO_FIND_MAX_ATTEMPTS &&
              Date.now() - startedAt < AUTO_FIND_TIME_CAP_MS &&
              !generationStoppedRef.current
            ) {
              setAutoFindAttempt(attempt)
              setAutoFindStatus(`Searching for available .coms... (Attempt ${attempt}/${AUTO_FIND_MAX_ATTEMPTS})`)

              const remixSeed = buildRemixSeed(baseKeyword, selectedVibe, selectedIndustry, attempt)
              const { names: remixedNames, insights: remixInsights, isPro: remixIsPro, availabilityToken: remixAvailabilityToken } = await requestGeneratedNames(
                remixSeed,
                AUTO_FIND_BATCH_SIZE,
                abortController.signal,
              )
              setIsProUser(remixIsPro)

              if (remixedNames.length > 0) {
                const comResults = (await requestAvailability(remixedNames, ["com"], abortController.signal, remixAvailabilityToken))
                  .map((result) => applyDomainInsight(result, remixInsights))
                comPicks = mergeAvailableComResults(comPicks, comResults)
                setAvailableComPicks(comPicks)
              }

              attempt += 1

              if (
                comPicks.length < AUTO_FIND_TARGET_COM_COUNT &&
                attempt <= AUTO_FIND_MAX_ATTEMPTS &&
                Date.now() - startedAt < AUTO_FIND_TIME_CAP_MS &&
                !generationStoppedRef.current
              ) {
                await delay(AUTO_FIND_ATTEMPT_DELAY_MS, abortController.signal)
              }
            }
          }

          if (generationStoppedRef.current) {
            setAutoFindStatus("Search stopped.")
          } else if (comPicks.length >= AUTO_FIND_TARGET_COM_COUNT) {
            setAutoFindStatus(`Found ${AUTO_FIND_TARGET_COM_COUNT} available .com domains.`)
          } else {
            setAutoFindStatus(`Found ${comPicks.length} available .com domains within the attempt/time cap.`)
          }
        }
      } else if (autoFindComMode && !isPro) {
        setAutoFindStatus("Auto-find is included with Pro. Your initial name set is ready below.")
      }
    } catch (error: any) {
      if (error?.name === "PricingRedirect") {
        return
      }
      console.error("Error generating domains:", error)
      if (error?.name === "AbortError" && generationStoppedRef.current) {
        setAutoFindStatus("Search stopped.")
        return
      }
      // Handle network errors specifically
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError(error.message || "Failed to generate domains. Please try again.")
      }
    } finally {
      setIsGenerating(false)
      setIsAutoFindingComs(false)
      generationAbortRef.current = null
    }
  }

  const toggleShortlist = (fullDomain: string) => {
    const isAdding = !shortlist.includes(fullDomain)
    setShortlist((prev) => (prev.includes(fullDomain) ? prev.filter((n) => n !== fullDomain) : [...prev, fullDomain]))
    if (isAdding) {
      recordLike(fullDomain)
      if (shortlist.length === 0) {
        trackEvent({
          action: "shortlist_created",
          metadata: { ...journeyMetadata, ctaId: "result-shortlist" },
        })
      }
      trackEvent({
        action: "decision_action",
        metadata: { ...journeyMetadata, decisionAction: "shortlist", ctaId: "result-shortlist" },
      })
    } else {
      recordUnlike(fullDomain)
    }
  }

  const saveBestResultToShortlist = () => {
    const topGroup = topPickName
      ? groupedResults.find((group) => group.name === topPickName)
      : groupedResults[0]
    const bestDomain = topGroup?.best.fullDomain
    if (!bestDomain) return

    if (!shortlist.includes(bestDomain)) {
      toggleShortlist(bestDomain)
    }
    setShowSavedBoard(true)
  }

  const compareTopResults = () => {
    trackEvent({
      action: "decision_action",
      metadata: { ...journeyMetadata, decisionAction: "compare", ctaId: "results-action-row" },
    })

    if (!isProUser) {
      redirectToCheckoutForProFeature("results_compare")
      return
    }

    const comparison = groupedResults.slice(0, 2).map((group) => ({
      name: group.name,
      tld: group.best.tld,
    }))
    if (comparison.length < 2) return
    setBattleQueue(comparison)
    setShowBattle(true)
  }

  const handleResultsUpgradeClick = () => {
    trackEvent({
      action: "upgrade_clicked",
      metadata: { ...journeyMetadata, ctaId: "results-decision-panel", destination: "checkout" },
    })
    trackEvent({
      action: "decision_action",
      metadata: { ...journeyMetadata, decisionAction: "pricing", ctaId: "results-decision-panel" },
    })
    trackEvent({
      action: "checkout_intent",
      metadata: { ...journeyMetadata, ctaId: "results-decision-panel" },
    })
  }

  const handleNamecheapClick = (domain: string, source: string, metadata: Record<string, unknown> = {}) => {
    const candidateName = typeof metadata.name === "string" ? metadata.name : domain.split(".")[0]
    if (candidateName && metadata.skipFeedback !== true) {
      submitNameFeedback({
        candidateId: `${candidateName.toLowerCase()}:${generationId}`,
        candidateName,
        candidateDescription: null,
        namingStyle: typeof metadata.style === "string" ? metadata.style : null,
        domainAvailabilitySnapshot: { domain },
      }, "domain_check")
    }
    trackAffiliateClick(domain, { source, ...metadata })
    trackEvent({
      action: "domain_register_clicked",
      metadata: { source, ...metadata },
    })
    trackEvent({
      action: "decision_action",
      metadata: { ...journeyMetadata, decisionAction: "register", ctaId: source },
    })
  }

  const handleLaunchKitStarted = (source: string, _brandName?: string) => {
    void _brandName
    trackEvent({
      action: "launch_kit_started",
      metadata: { source, vibe: isQuickMode ? quickVibe : selectedVibe, industry: selectedIndustry },
    })
    trackEvent({
      action: "decision_action",
      metadata: { ...journeyMetadata, decisionAction: "brand_kit", ctaId: source },
    })
  }

  const copyToClipboard = (fullDomain: string) => {
    navigator.clipboard.writeText(fullDomain)
    setCopiedName(fullDomain)
    setTimeout(() => setCopiedName(null), 2000)
  }

  const currentBriefText = () => (description.trim() || keyword.trim()).slice(0, 1000)

  const currentBriefId = () => {
    const source = initialContentSlug || initialSource || "generator"
    const brief = currentBriefText().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
    return `${source}:${brief || "empty"}`
  }

  const availabilitySnapshotFromDomain = (result: DomainResult) => ({
    [result.tld]: {
      status: result.checkStatus || (result.available ? "available" : "taken"),
      available: result.available,
      confidence: result.availabilityConfidence || null,
      fullDomain: result.fullDomain,
    },
  })

  const availabilitySnapshotFromCandidate = (candidate: GeneratedName) =>
    Object.fromEntries(
      Object.entries(candidate.availability).map(([tld, state]) => [
        tld,
        {
          status: state.status,
          available: state.available,
          confidence: state.confidence,
          fullDomain: state.fullDomain,
        },
      ]),
    )

  const submitNameFeedback = async (
    input: {
      candidateId: string
      candidateName: string
      candidateDescription?: string | null
      candidatePosition?: number | null
      namingStyle?: string | null
      displayedScores?: Record<string, unknown> | null
      domainAvailabilitySnapshot?: Record<string, unknown> | null
    },
    feedbackType: NameFeedbackType,
    feedbackReason?: DislikeReason | null,
  ) => {
    const anonymousSessionId = getSessionId()
    if (!anonymousSessionId) return
    try {
      const response = await fetch("/api/name-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousSessionId,
          briefId: currentBriefId(),
          briefTextSnapshot: currentBriefText(),
          candidateId: input.candidateId,
          candidateName: input.candidateName,
          candidateDescription: input.candidateDescription,
          candidatePosition: input.candidatePosition,
          generationId: `generation-${generationId}`,
          modelProvider: currentGenerationMeta.provider || null,
          modelName: currentGenerationMeta.model || null,
          promptVersion: currentGenerationMeta.promptVersion || (redesignEnabled ? "generator_redesign_v2" : "legacy"),
          namingStyle: input.namingStyle || (isQuickMode ? quickStyle : "advanced"),
          vibe: isQuickMode ? quickVibe : selectedVibe,
          creativityLevel: isQuickMode ? quickCreativity : null,
          displayedScores: input.displayedScores,
          domainAvailabilitySnapshot: input.domainAvailabilitySnapshot,
          feedbackType,
          feedbackReason,
          isFounderFeedback: isTestEnvironment || pathname.includes("namo-curator"),
        }),
      })
      if (!response.ok) throw new Error("Feedback save failed")
    } catch {
      setFeedbackNotice("Feedback could not be saved. Your local preference still updated.")
      window.setTimeout(() => setFeedbackNotice(null), 3000)
    }
  }

  const removeNameFeedback = async (candidateId: string, feedbackType: NameFeedbackType) => {
    const anonymousSessionId = getSessionId()
    if (!anonymousSessionId) return
    await fetch("/api/name-feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousSessionId,
        candidateId,
        generationId: `generation-${generationId}`,
        feedbackType,
      }),
    }).catch(() => {})
  }

  const legacyFeedbackInput = (result: DomainResult, candidatePosition?: number) => ({
    candidateId: `${result.name.toLowerCase()}:${generationId}`,
    candidateName: result.name,
    candidateDescription: result.personalDescription || result.personality || result.whyItWorks || result.meaning || null,
    candidatePosition,
    namingStyle: result.strategy || null,
    displayedScores: typeof result.score === "number" ? { founderSignal: result.score } : null,
    domainAvailabilitySnapshot: availabilitySnapshotFromDomain(result),
  })

  const legacyPseudoCandidate = (result: DomainResult, candidatePosition?: number): GeneratedName => ({
    id: `${result.name.toLowerCase()}:${generationId}`,
    name: result.name,
    rationale: result.personalDescription || result.personality || result.whyItWorks || result.meaning || "A generated naming direction.",
    style: quickStyle === "auto" ? "brandable" : quickStyle,
    generationRank: candidatePosition || 1,
    availability: {
      [result.tld]: {
        status: result.checkStatus || (result.available ? "available" : "taken"),
        available: result.available,
        confidence: result.availabilityConfidence || null,
        fullDomain: result.fullDomain,
        registerUrl: result.registerUrl,
      },
    },
    founderSignal: null,
  })

  const handleLegacyLike = (result: DomainResult, candidatePosition?: number) => {
    const input = legacyFeedbackInput(result, candidatePosition)
    const isUndo = likedCandidateIds.has(input.candidateId)
    setLikedCandidateIds((current) => {
      const next = new Set(current)
      if (next.has(input.candidateId)) next.delete(input.candidateId)
      else next.add(input.candidateId)
      return next
    })
    if (isUndo) {
      removeNameFeedback(input.candidateId, "like")
      return
    }
    updateLocalPreference(legacyPseudoCandidate(result, candidatePosition), "save")
    submitNameFeedback(input, "like")
  }

  const handleLegacyDislike = (result: DomainResult, candidatePosition?: number, reason?: DislikeReason | null) => {
    const input = legacyFeedbackInput(result, candidatePosition)
    const isReasonUpdate = dislikedCandidateIds.has(input.candidateId) && Boolean(reason)
    const isUndo = dislikedCandidateIds.has(input.candidateId) && !reason
    if (!isReasonUpdate) {
      setDislikedCandidateIds((current) => {
        const next = new Set(current)
        if (next.has(input.candidateId)) next.delete(input.candidateId)
        else next.add(input.candidateId)
        return next
      })
    }
    if (isUndo) {
      activeDislikedCandidatesRef.current.delete(input.candidateId)
      setPreferenceProfile(applyActiveDislikes(positivePreferenceProfileRef.current))
      removeNameFeedback(input.candidateId, "dislike")
      setDislikeReasonTarget(null)
      return
    }
    activeDislikedCandidatesRef.current.set(input.candidateId, legacyPseudoCandidate(result, candidatePosition))
    setPreferenceProfile(applyActiveDislikes(positivePreferenceProfileRef.current))
    submitNameFeedback(input, "dislike", reason || "skip")
    setDislikeReasonTarget(input.candidateId)
    trackEvent({ action: "dislike", metadata: { source: "generator", ctaId: "legacy-result-dislike" } })
  }

  const handleLegacyMoreLikeThis = (result: DomainResult, candidatePosition?: number) => {
    const pseudo = legacyPseudoCandidate(result, candidatePosition)
    updateLocalPreference(pseudo, "more_like_this")
    submitNameFeedback(legacyFeedbackInput(result, candidatePosition), "more_like_this")
    setFeedbackNotice("Next generation will lean toward this direction without copying it.")
    window.setTimeout(() => setFeedbackNotice(null), 2800)
    trackEvent({ action: "more_like_this", metadata: { source: "generator", ctaId: "legacy-result-more-like-this" } })
  }

  const renderLegacyFeedbackControls = (result: DomainResult, candidatePosition?: number) => {
    const input = legacyFeedbackInput(result, candidatePosition)
    const liked = likedCandidateIds.has(input.candidateId)
    const disliked = dislikedCandidateIds.has(input.candidateId)
    return (
      <div className="mt-3 rounded-xl border border-white/8 bg-black/15 p-2">
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap">
          <button
            type="button"
            aria-pressed={liked}
            onClick={() => handleLegacyLike(result, candidatePosition)}
            className={cn(
              "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
              liked ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200" : "border-white/9 bg-white/[0.03] text-white/52 hover:text-white",
            )}
          >
            {liked ? <Check className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
            Good fit
          </button>
          <button
            type="button"
            aria-pressed={disliked}
            onClick={() => handleLegacyDislike(result, candidatePosition)}
            className={cn(
              "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
              disliked ? "border-red-300/20 bg-red-300/[0.07] text-red-200/75" : "border-white/9 bg-white/[0.03] text-white/52 hover:text-white",
            )}
          >
            {disliked ? <RefreshCw className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
            {disliked ? "Undo" : "Not right"}
          </button>
          <button
            type="button"
            onClick={() => handleLegacyMoreLikeThis(result, candidatePosition)}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-2 text-[11px] font-semibold text-[#F6E27A]/80 transition hover:bg-[#D4AF37]/10 hover:text-[#F6E27A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <WandSparkles className="h-3.5 w-3.5" />
            More like this
          </button>
        </div>
        {dislikeReasonTarget === input.candidateId && disliked ? (
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Optional dislike reason for ${result.name}`}>
            {DISLIKE_REASON_OPTIONS.map((reason) => (
              <button
                key={reason.id}
                type="button"
                onClick={() => {
                  handleLegacyDislike(result, candidatePosition, reason.id)
                  setDislikeReasonTarget(null)
                }}
                className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-white/48 transition hover:border-red-200/25 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              >
                {reason.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const applyActiveDislikes = (base: NamingPreferenceProfile): NamingPreferenceProfile =>
    applyCandidateDislikes(base, activeDislikedCandidatesRef.current.values())

  const updateLocalPreference = (
    candidate: GeneratedName,
    signal: "save" | "more_like_this",
  ) => {
    const positiveProfile = learnFromCandidate(positivePreferenceProfileRef.current, candidate, signal)
    positivePreferenceProfileRef.current = positiveProfile
    setPreferenceProfile(applyActiveDislikes(positiveProfile))
  }

  const resetLocalPreferences = () => {
    const emptyProfile = createEmptyPreferenceProfile()
    positivePreferenceProfileRef.current = emptyProfile
    activeDislikedCandidatesRef.current.clear()
    setDislikedCandidateIds(new Set())
    setPreferenceProfile(emptyProfile)
  }

  const handleExplorationSave = (candidate: GeneratedName) => {
    setSelectedExplorationCandidateId(candidate.id)
    const savedDomain = Object.values(candidate.availability)
      .map((state) => state.fullDomain)
      .find((domain): domain is string => Boolean(domain && shortlist.includes(domain)))
    if (savedDomain) {
      submitNameFeedback({
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateDescription: candidate.rationale,
        candidatePosition: candidate.generationRank,
        namingStyle: candidate.style,
        displayedScores: candidate.founderSignal?.status === "ready" ? { founderSignal: candidate.founderSignal.score, ...candidate.founderSignal.breakdown } : null,
        domainAvailabilitySnapshot: availabilitySnapshotFromCandidate(candidate),
      }, "unsave")
      toggleShortlist(savedDomain)
      return
    }
    const domain = selectVerifiedAvailableDomain(candidate)
    if (!domain) {
      const checksPending = Object.values(candidate.availability).some((state) => state.status === "checking")
      setAiHint(
        checksPending
          ? "Domain checks are still running. Save unlocks when an option is verified available."
          : "No verified available domain was saved. You can verify a favourite directly with the registrar.",
      )
      return
    }
    toggleShortlist(domain)
    submitNameFeedback({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDescription: candidate.rationale,
      candidatePosition: candidate.generationRank,
      namingStyle: candidate.style,
      displayedScores: candidate.founderSignal?.status === "ready" ? { founderSignal: candidate.founderSignal.score, ...candidate.founderSignal.breakdown } : null,
      domainAvailabilitySnapshot: availabilitySnapshotFromCandidate(candidate),
    }, "save")
    updateLocalPreference(candidate, "save")
    trackEvent({
      action: "save",
      metadata: { source: "generator", ctaId: "candidate-save", experiment: "generator_redesign_v2" },
    })
  }

  const handleExplorationLike = (candidate: GeneratedName) => {
    setSelectedExplorationCandidateId(candidate.id)
    const isUndo = likedCandidateIds.has(candidate.id)
    setLikedCandidateIds((current) => {
      const next = new Set(current)
      if (next.has(candidate.id)) next.delete(candidate.id)
      else next.add(candidate.id)
      return next
    })
    if (isUndo) {
      removeNameFeedback(candidate.id, "like")
      return
    }
    updateLocalPreference(candidate, "save")
    submitNameFeedback({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDescription: candidate.rationale,
      candidatePosition: candidate.generationRank,
      namingStyle: candidate.style,
      displayedScores: candidate.founderSignal?.status === "ready" ? { founderSignal: candidate.founderSignal.score, ...candidate.founderSignal.breakdown } : null,
      domainAvailabilitySnapshot: availabilitySnapshotFromCandidate(candidate),
    }, "like")
  }

  const handleExplorationDislike = (candidate: GeneratedName, reason?: DislikeReason | null) => {
    setSelectedExplorationCandidateId(candidate.id)
    const isReasonUpdate = dislikedCandidateIds.has(candidate.id) && Boolean(reason)
    const isUndo = dislikedCandidateIds.has(candidate.id) && !reason
    if (isUndo) activeDislikedCandidatesRef.current.delete(candidate.id)
    else if (!isReasonUpdate) activeDislikedCandidatesRef.current.set(candidate.id, candidate)
    if (!isReasonUpdate) {
      setDislikedCandidateIds((current) => {
        const next = new Set(current)
        if (next.has(candidate.id)) next.delete(candidate.id)
        else next.add(candidate.id)
        return next
      })
      setPreferenceProfile(applyActiveDislikes(positivePreferenceProfileRef.current))
    }
    if (isUndo) {
      removeNameFeedback(candidate.id, "dislike")
      return
    }
    submitNameFeedback({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDescription: candidate.rationale,
      candidatePosition: candidate.generationRank,
      namingStyle: candidate.style,
      displayedScores: candidate.founderSignal?.status === "ready" ? { founderSignal: candidate.founderSignal.score, ...candidate.founderSignal.breakdown } : null,
      domainAvailabilitySnapshot: availabilitySnapshotFromCandidate(candidate),
    }, "dislike", reason || "skip")
    if (!isUndo) {
      trackEvent({
        action: "dislike",
        metadata: { source: "generator", ctaId: "candidate-dislike", experiment: "generator_redesign_v2" },
      })
    }
  }

  const handleExplorationMoreLikeThis = (candidate: GeneratedName) => {
    setSelectedExplorationCandidateId(candidate.id)
    handleQuickStyleChange(candidate.style)
    setQuickCreativity("exploratory")
    updateLocalPreference(candidate, "more_like_this")
    setAiHint("Preference saved. The next batch will lean toward this shape without copying the name.")
    setFeedbackNotice("Next generation will lean toward this direction without copying it.")
    window.setTimeout(() => setFeedbackNotice(null), 2800)
    submitNameFeedback({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDescription: candidate.rationale,
      candidatePosition: candidate.generationRank,
      namingStyle: candidate.style,
      displayedScores: candidate.founderSignal?.status === "ready" ? { founderSignal: candidate.founderSignal.score, ...candidate.founderSignal.breakdown } : null,
      domainAvailabilitySnapshot: availabilitySnapshotFromCandidate(candidate),
    }, "more_like_this")
    trackEvent({
      action: "more_like_this",
      metadata: { source: "generator", ctaId: "candidate-more-like-this", experiment: "generator_redesign_v2" },
    })
  }

  const handleExplorationCopy = (candidate: GeneratedName) => {
    setSelectedExplorationCandidateId(candidate.id)
    copyToClipboard(preferredExplorationDomain(candidate))
    submitNameFeedback({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDescription: candidate.rationale,
      candidatePosition: candidate.generationRank,
      namingStyle: candidate.style,
      displayedScores: candidate.founderSignal?.status === "ready" ? { founderSignal: candidate.founderSignal.score, ...candidate.founderSignal.breakdown } : null,
      domainAvailabilitySnapshot: availabilitySnapshotFromCandidate(candidate),
    }, "copy")
  }

  const handleExplorationRegistrarClick = (
    candidate: GeneratedName,
    tld: string,
    availability: AvailabilityState,
  ) => {
    setSelectedExplorationCandidateId(candidate.id)
    submitNameFeedback({
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateDescription: candidate.rationale,
      candidatePosition: candidate.generationRank,
      namingStyle: candidate.style,
      displayedScores: candidate.founderSignal?.status === "ready" ? { founderSignal: candidate.founderSignal.score, ...candidate.founderSignal.breakdown } : null,
      domainAvailabilitySnapshot: availabilitySnapshotFromCandidate(candidate),
    }, "domain_check")
    handleNamecheapClick(
      availability.fullDomain || `${candidate.name.toLowerCase()}.${tld}`,
      "generator_v2_result",
      { tld, style: candidate.style, skipFeedback: true },
    )
  }

  const handleRetryExplorationAvailability = async () => {
    const token = explorationAvailabilityToken
    const current = explorationResultsRef.current
    if (!token || current.length === 0) {
      setAvailabilityError("This availability session has expired. Generate a fresh batch to check domains again.")
      return
    }
    const failedTlds = collectFailedAvailabilityTlds(current)
    if (failedTlds.length === 0) {
      setAvailabilityError(null)
      setGenerationPhase("ready")
      return
    }

    generationAbortRef.current?.abort()
    const abortController = new AbortController()
    generationAbortRef.current = abortController
    const requestId = activeGenerationRef.current
    const checking = markFailedAvailabilityChecking(current)
    explorationResultsRef.current = checking
    setExplorationResults(checking)
    syncLegacyExplorationResults(checking)
    setAvailabilityError(null)
    setGenerationPhase("checking_domains")

    try {
      const availability = await requestExplorationAvailability(
        checking,
        failedTlds,
        token,
        abortController.signal,
      )
      finishExplorationAvailability(requestId, availability.payload, availability.failedTlds)
    } catch (failure: unknown) {
      if (failure instanceof DOMException && failure.name === "AbortError") return
      failExplorationAvailability(requestId)
    }
  }

  const handleFounderSignalBatch = async () => {
    if (!advancedWorkflowToken || explorationResults.length === 0 || isScoringFounderSignal) {
      setScoringError("This scoring session has expired. Generate a fresh Advanced batch and try again.")
      return
    }

    const requestId = activeGenerationRef.current
    scoringAbortRef.current?.abort()
    const abortController = new AbortController()
    scoringAbortRef.current = abortController
    scoringInFlightRef.current = true
    setIsScoringFounderSignal(true)
    setGenerationPhase("scoring_founder_signal")
    setScoringError(null)
    trackEvent({
      action: "founder_signal_clicked",
      metadata: { source: "generator", ctaId: "score-advanced-batch", experiment: "generator_redesign_v2" },
    })

    try {
      const response = await fetch("/api/founder-signal/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          workflowToken: advancedWorkflowToken,
          candidates: explorationResults.map((candidate) => ({ id: candidate.id, name: candidate.name })),
          vibe: selectedVibe,
          tld: "com",
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (isFounderSignalAllowanceExhaustedResponse(response.status, data)) {
          setScoreAllowanceExhausted(true)
        }
        throw new Error(data.message || data.error || "Founder Signal could not score this batch")
      }
      if (activeGenerationRef.current !== requestId) return

      const scored = mergeFounderSignal(explorationResultsRef.current, data)
      explorationResultsRef.current = scored
      setExplorationResults(scored)
      syncLegacyExplorationResults(scored)
      if (!isProUser && data.allowance?.remaining === 0) {
        setScoreAllowanceExhausted(true)
      }
      trackEvent({
        action: "batch_scored",
        metadata: { source: "generator", experiment: "generator_redesign_v2" },
      })
    } catch (failure: unknown) {
      if (failure instanceof DOMException && failure.name === "AbortError") return
      if (activeGenerationRef.current !== requestId) return
      setScoringError(failure instanceof Error ? failure.message : "Founder Signal could not score this batch")
    } finally {
      if (activeGenerationRef.current === requestId) {
        scoringInFlightRef.current = false
        setIsScoringFounderSignal(false)
        setGenerationPhase("ready")
        scoringAbortRef.current = null
      }
    }
  }

  const handleFounderSignalSort = () => {
    const nextSort = !sortByFounderSignal
    setSortByFounderSignal(nextSort)
    const nextOrder = sortCandidatesByFounderSignal(explorationResultsRef.current, nextSort)
    setSelectedExplorationCandidateId(nextOrder[0]?.id ?? null)
    trackEvent({
      action: "score_sort_used",
      metadata: { source: "generator", ctaId: "score-sort", experiment: "generator_redesign_v2" },
    })
  }

  const handleFounderSignalUpgrade = () => {
    trackEvent({
      action: "pricing_clicked",
      metadata: { source: "generator", ctaId: "founder-signal-upgrade", experiment: "generator_redesign_v2" },
    })
    trackEvent({
      action: "decision_action",
      metadata: { ...journeyMetadata, decisionAction: "pricing", ctaId: "founder-signal-upgrade" },
    })
    router.push("/pricing?from=founder-signal-batch#plans")
  }

  const handleRefine = async (mode: RefinementMode) => {
    const resolvedKeyword = description.trim() || keyword.trim()
    if (!resolvedKeyword || isRefining || isGenerating) return

    setActiveRefinement(mode)
    setIsRefining(true)
    setError(null)

    generationAbortRef.current?.abort()
    const abortController = new AbortController()
    generationAbortRef.current = abortController

    const overrides = getRefinementOverrides(mode, maxLength)

    try {
      // Temporarily override payload with refinement parameters
      const response = await fetch("/api/generate-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          keyword: resolvedKeyword,
          vibe: overrides.vibe ?? selectedVibe,
          industry: selectedIndustry,
          maxLength: overrides.maxLength ?? maxLength,
          generatorV2: true,
          ...(isTestEnvironment ? { nameStyle: "mix", meaningMode: true } : {}),
          refinementInstruction: overrides.extraInstruction,
          alreadySeen: results.map((r) => r.name),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 429) {
          redirectToPricingForLimit("refine")
          throw createPricingRedirectError()
        }
        throw new Error(data.error ?? "Failed to refine")
      }

      const generatedData = extractDomainData(data.domains || [])
      const names: string[] = data.names ?? generatedData.names
      if (names.length === 0) throw new Error("No names generated. Try a different refinement.")

      setIsProUser(Boolean(data.isPro))
      const refined = (await requestAvailability(names, undefined, abortController.signal, data.availabilityToken))
        .map((result) => applyDomainInsight(result, generatedData.insights))
      // Merge: keep existing results, prepend refined ones that aren't duplicates
      const existingNames = new Set(results.map((r) => r.name))
      const newResults = refined
        .filter((r) => !existingNames.has(r.name))
      setResults((prev) => [...newResults, ...prev])

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "PricingRedirect") {
        return
      }
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message)
      }
    } finally {
      setIsRefining(false)
    }
  }

  const exportShortlist = () => {
    if (!isProUser) {
      redirectToCheckoutForProFeature("shortlist_export")
      return
    }
    const shortlistedDomains = results.filter((r) => shortlist.includes(r.fullDomain))
    if (shortlistedDomains.length === 0) return

    const text = shortlistedDomains.map((d) => d.fullDomain).join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "domain-shortlist.txt"
    a.click()
    trackEvent({
      action: "brand_export_clicked",
      metadata: { source: "shortlist_txt", count: shortlistedDomains.length },
    })
  }

  // CSV Export functionality
  const exportToCSV = () => {
    if (!isProUser) {
      redirectToCheckoutForProFeature("results_csv_export")
      return
    }
    if (results.length === 0) return

    // CSV headers
    const scoreLocked = isBulkMode && !bulkFounderSignalUnlocked
    const headers = ["Domain Name", "TLD", "Full Domain", "Available", "Score", "Pronounceable", "Memorability", "Length"]

    // CSV rows
    const rows = results.map((r) => [
      r.name,
      r.tld,
      r.fullDomain,
      r.available ? "Yes" : "No",
      scoreLocked ? "Locked" : String(r.score ?? ""),
      scoreLocked ? "Locked" : r.pronounceable ? "Yes" : "No",
      scoreLocked ? "Locked" : String(r.memorability ?? ""),
      r.length.toString(),
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const date = new Date().toISOString().split("T")[0]
    a.download = `namolux-domains-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)

    // Show success feedback
    setCopiedName("csv-exported")
    setTimeout(() => setCopiedName(null), 2000)
    trackEvent({
      action: "brand_export_clicked",
      metadata: { source: "results_csv", count: results.length },
    })
  }

  // Extract keywords from description via AI
  const handleExtractKeywords = async () => {
    const text = description.trim()
    if (text.length < 20 || isExtracting) return
    setIsExtracting(true)
    setExtractError(null)
    try {
      const res = await fetch("/api/analyze-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Analysis failed")
      const a = data.analysis
      setKeyword(a.keywords.join(" "))
      setSelectedIndustry(a.industry)
      setSelectedVibe(a.brandVibe)
      const analysedMaxLength = Number(a.maxLength)
      const minimum = isQuickMode ? quickMinimumLength : 6
      setMaxLength(Number.isFinite(analysedMaxLength)
        ? Math.min(15, Math.max(minimum, analysedMaxLength))
        : Math.max(minimum, 10))
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : "Could not analyze description")
    } finally {
      setIsExtracting(false)
    }
  }

  const bulkCandidates = bulkInput
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(".")[0])
    .filter(Boolean)
    .slice(0, 50)

  const descriptionCharacterCount = description.length
  const activeWorkflowStats = isBulkMode
    ? [
        { label: "Queued", value: `${bulkCandidates.length}/50` },
        { label: "Coverage", value: "6 TLDs" },
        { label: "Signal", value: bulkFounderSignalUnlocked ? "Scored" : bulkFounderSignalRequested ? "Requested" : "Optional" },
      ]
    : isQuickMode
      ? [
          {
            label: redesignEnabled ? "Access" : "Allowance",
            value: redesignEnabled ? "Free exploration" : `${PRODUCT_OFFER.freeMonthlyUses}/month`,
          },
          { label: redesignEnabled ? "Batch" : "Check", value: redesignEnabled ? "16 names" : `${QUICK_GENERATE_TLDS.length} TLDs` },
          {
            label: redesignEnabled ? "Style" : "Vibe",
            value: redesignEnabled
              ? quickStyle.replace(/_/g, " ")
              : quickVibeOptions.find((vibe) => vibe.id === quickVibe)?.label || "Friendly",
          },
        ]
      : [
          redesignEnabled
            ? {
                label: "Access",
                value: isProUser
                  ? "Pro fair use"
                  : advancedAllowanceRemaining === null
                    ? "3 free / month"
                    : `${advancedAllowanceRemaining} of 3 left`,
              }
            : {
                label: "Brief depth",
                value: descriptionCharacterCount > 120 ? "Rich" : descriptionCharacterCount > 20 ? "Ready" : "Open",
              },
          { label: "Length", value: `${maxLength} chars` },
          { label: "Vibe", value: vibeOptions.find((vibe) => vibe.id === selectedVibe)?.label || "Luxury" },
        ]

  const hasResultsReady = redesignEnabled && !isBulkMode
    ? explorationResults.length > 0 && !isGenerating
    : groupedResults.length > 0 && !isGenerating
  const topResultGroup = topPickName
    ? groupedResults.find((group) => group.name === topPickName)
    : groupedResults[0]
  const brandKitHref = topResultGroup
    ? `/dashboard?palette=${encodeURIComponent(topResultGroup.name)}&vibe=${encodeURIComponent(isQuickMode ? quickVibe : selectedVibe || "modern")}`
    : "/dashboard"
  const topRegisterDomain =
    topResultGroup?.tlds.find((result) => result.available)?.fullDomain || topResultGroup?.best.fullDomain || null
  const topFounderScore = topResultGroup ? resultScore(topResultGroup.best) : 0
  const topFounderBand = topFounderScore > 0 ? getFounderSignalBand(topFounderScore) : null
  const orderedExplorationResults = useMemo(
    () => sortCandidatesByFounderSignal(explorationResults, isAdvancedMode && sortByFounderSignal),
    [explorationResults, isAdvancedMode, sortByFounderSignal],
  )
  const explorationDecisionOrder = useMemo(
    () => orderCandidatesForDecision(
      explorationResults,
      isAdvancedMode && sortByFounderSignal,
      selectedExplorationCandidateId,
    ),
    [explorationResults, isAdvancedMode, selectedExplorationCandidateId, sortByFounderSignal],
  )
  const explorationDecisionCandidate = explorationDecisionOrder[0]
  const explorationDecisionDomain = explorationDecisionCandidate
    ? selectVerifiedAvailableDomain(explorationDecisionCandidate)
    : null
  const explorationDecisionSavedDomain = explorationDecisionCandidate
    ? Object.values(explorationDecisionCandidate.availability)
        .map((state) => state.fullDomain)
        .find((domain): domain is string => Boolean(domain && shortlist.includes(domain))) ?? null
    : null
  const explorationBrandKitHref = explorationDecisionCandidate
    ? `/dashboard?palette=${encodeURIComponent(explorationDecisionCandidate.name)}&vibe=${encodeURIComponent(isQuickMode ? quickVibe : selectedVibe || "modern")}`
    : "/dashboard"
  const generatorResultsAdPosition = resolveGeneratorResultsAdPosition({
    hasResultsReady,
    redesignEnabled,
    isQuickMode,
    isProUser,
  })

  const liveStatusMessage = redesignEnabled && !isBulkMode
    ? generationPhase === "generating_names"
      ? "Generating candidates."
      : generationPhase === "names_ready"
        ? `${explorationResults.length} candidates are ready.`
        : generationPhase === "checking_domains"
          ? `${explorationResults.length} candidates are ready. Checking domain availability.`
          : generationPhase === "scoring_founder_signal"
            ? `Scoring ${explorationResults.length} candidates across Founder Signal.`
            : generationPhase === "ready"
              ? `${explorationResults.length} candidates are ready. Domain availability status has been updated.`
              : ""
    : isGenerating
      ? "Generating and checking candidates."
      : results.length > 0
        ? `${groupedResults.length} candidate groups are ready.`
        : ""

  const compareExplorationResults = () => {
    trackEvent({
      action: "decision_action",
      metadata: { ...journeyMetadata, decisionAction: "compare", ctaId: "generator-v2-decision-rail" },
    })
    if (!isProUser) {
      redirectToCheckoutForProFeature("results_compare")
      return
    }
    const comparison = explorationDecisionOrder.slice(0, 2).map((candidate) => {
      const domain = preferredExplorationDomain(candidate)
      const tld = Object.entries(candidate.availability).find(([, state]) => state.fullDomain === domain)?.[0] || "com"
      return { name: candidate.name, tld }
    })
    if (comparison.length < 2) return
    setBattleQueue(comparison)
    setShowBattle(true)
  }

  useEffect(() => {
    if (!hasResultsReady || partnerCtaSeenTrackedRef.current === generationId) return
    partnerCtaSeenTrackedRef.current = generationId
    trackEvent({
      action: "partner_cta_seen",
      metadata: {
        source: isQuickMode ? "quick_generate_results" : "generate_results",
        topDomain: topRegisterDomain,
        resultCount: groupedResults.length,
        vibe: isQuickMode ? quickVibe : selectedVibe,
        industry: selectedIndustry,
      },
    })
  }, [generationId, groupedResults.length, hasResultsReady, isQuickMode, quickVibe, selectedIndustry, selectedVibe, topRegisterDomain])

  useEffect(() => {
    if (!hasResultsReady || isProUser || proOfferSeenTrackedRef.current === generationId) return
    proOfferSeenTrackedRef.current = generationId
    trackEvent({
      action: "upgrade_offer_seen",
      metadata: {
        source: isQuickMode ? "quick_results_decision_panel" : "advanced_results_decision_panel",
        resultCount: groupedResults.length,
      },
    })
  }, [generationId, groupedResults.length, hasResultsReady, isProUser, isQuickMode])

  return (
    <main id="main-content" className="namolux-generate-page noise-overlay relative min-h-screen overflow-clip text-white">
      {/* Luxury background – layered gold radial glows */}
      <div
        className="pointer-events-none absolute inset-0 hidden"
        style={{
          background: [
            "radial-gradient(circle at 18% 12%, rgba(212,175,55,0.18) 0%, transparent 38%)",
            "radial-gradient(circle at 82% 72%, rgba(212,175,55,0.13) 0%, transparent 42%)",
            "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 60%)",
          ].join(","),
        }}
        aria-hidden="true"
      />
      {/* Subtle dot-grid texture */}
      <div
        className="pointer-events-none absolute inset-0 hidden"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(212,175,55,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 80%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 80%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="namolux-signal-array pointer-events-none absolute right-0 top-16 hidden h-[520px] w-[620px] lg:block" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between sm:mb-6 md:mb-8">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55 transition-colors hover:border-[#D4AF37]/35 hover:text-white sm:gap-2 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {shortlist.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportShortlist} className="h-8 gap-1.5 bg-transparent px-2 text-xs sm:h-auto sm:gap-2 sm:px-3 sm:text-sm">
                  {isProUser ? <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  <span className="hidden sm:inline">{isProUser ? "Export" : "Export · Pro"}</span> ({shortlist.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSavedBoard(true)}
                  className="h-8 gap-1.5 bg-transparent px-2 text-xs sm:h-auto sm:gap-2 sm:px-3 sm:text-sm"
                  style={{ borderColor: "rgba(212,175,55,0.25)", color: "#D4AF37" }}
                >
                  <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Board</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,320px] lg:gap-8">
          {/* Main Content */}
          <div className="min-w-0">
            <div className="mb-5 grid gap-4 sm:mb-7 lg:grid-cols-[1fr_280px] lg:items-end">
              <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
                {generatorToolsEnabled ? "Discover a domain" : "Check every name"}{" "}
                <span
                  style={{
                    backgroundImage: "linear-gradient(90deg, #D4AF37 0%, #F6E27A 50%, #D4AF37 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  worth building on.
                </span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/55 sm:text-base">
                {isQuickMode
                  ? redesignEnabled
                    ? "Sixteen creative directions first, with domain checks continuing in the background."
                    : "Name ideas with multiple TLDs checked live."
                  : isBulkMode
                    ? "Paste names, check availability, and sort the strongest options."
                    : redesignEnabled
                      ? "Twelve creative candidates first. Run Founder Signal only when you are ready to evaluate."
                      : "AI-generated names, live availability checks, and Founder Signal scoring in seconds."}
              </p>
              </div>
              <div
                className="hidden rounded-lg border p-3 lg:block"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.025))",
                  borderColor: "rgba(212,175,55,0.16)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-white/72">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-live-ping rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  Workspace ready
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {["DNS", "RDAP", "Signal"].map((label) => (
                    <div key={label} className="rounded-md border border-white/8 bg-black/20 px-2 py-2">
                      <div className="text-[10px] font-bold uppercase text-[#D4AF37]/75">{label}</div>
                      <div className="mt-0.5 text-[10px] text-white/35">ready</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {journeyContextLabel ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/[0.07] px-3 py-2 text-xs text-white/60 sm:mb-5 sm:px-4">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#D4AF37]" aria-hidden="true" />
                <span>{journeyContextLabel}</span>
                <span className="text-white/35">Your brief is ready to edit; generation starts only when you choose it.</span>
              </div>
            ) : null}

            <>
            <div
              className="premium-workbench relative mb-6 overflow-hidden rounded-lg border p-4 backdrop-blur-xl sm:mb-8 sm:p-5 md:p-6"
              aria-busy={redesignEnabled && !isBulkMode ? isGenerating : undefined}
              style={{
                background: "linear-gradient(145deg, rgba(22,22,18,0.88), rgba(7,8,8,0.94) 48%, rgba(4,5,6,0.96))",
                borderColor: "rgba(212,175,55,0.2)",
                boxShadow: "0 44px 100px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.055) inset",
              }}
            >
              {/* Mode Toggle */}
              <div className={cn("mb-4 grid gap-1 rounded-lg p-1 sm:mb-5", generatorToolsEnabled && "sm:grid-cols-3")} style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(212,175,55,0.14)" }}>
                {(generatorToolsEnabled
                  ? [
                      { label: "Quick Generate", icon: Zap, active: isQuickMode, mode: "quick" as const },
                      { label: "Advanced Generate", icon: Sparkles, active: isAdvancedMode, mode: "advanced" as const },
                      { label: "Bulk Check", icon: LayoutGrid, active: isBulkMode, mode: "bulk" as const },
                    ]
                  : [{ label: "Bulk Check + Founder Signal", icon: LayoutGrid, active: true, mode: "bulk" as const }]
                ).map(({ label, icon: Icon, active, mode }) => (
                  <button
                    key={label}
                    onClick={() => selectGenerateMode(mode)}
                    aria-pressed={active}
                    className={cn(
                      "relative flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-md px-3 py-2 text-xs font-semibold transition-all sm:text-sm",
                      active ? "text-[#0A0800] shadow-[0_10px_24px_rgba(212,175,55,0.18)]" : "text-white/45 hover:bg-white/[0.035] hover:text-white/78",
                    )}
                    style={{
                      background: active ? "linear-gradient(135deg, #C99A2E 0%, #F5DD77 52%, #B8841F 100%)" : "transparent",
                      border: active ? "1px solid rgba(255,230,160,0.45)" : "1px solid transparent",
                    }}
                  >
                    {active && <span className="absolute inset-x-0 top-0 h-px bg-white/60" />}
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mb-5 grid gap-2 sm:grid-cols-3">
                {activeWorkflowStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border px-3 py-2"
                    style={{
                      background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))",
                      borderColor: "rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/28">{item.label}</div>
                    <div className="mt-1 text-sm font-semibold capitalize text-white/82">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Bulk Mode */}
              {isBulkMode ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div>
                    <label htmlFor="bulk-input" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/65">
                      Paste domain names (one per line, max 50)
                    </label>
                    <textarea
                      id="bulk-input"
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder={"mybrand\ncoolstartup\nawesomeapp\ngreatidea"}
                      rows={6}
                      className="min-h-[208px] w-full resize-none rounded-lg p-4 font-mono text-sm leading-6 text-white/90 placeholder:text-white/23 focus:outline-none"
                      style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
                        border: "1px solid rgba(255,255,255,0.105)",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(212,175,55,0.55)"
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.2)"
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ALL_TLDS.map((tld) => (
                        <span
                          key={tld}
                          className="rounded-md border px-2.5 py-1 text-[11px] font-semibold text-[#D4AF37]/80"
                          style={{ background: "rgba(212,175,55,0.055)", borderColor: "rgba(212,175,55,0.18)" }}
                        >
                          .{tld}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-lg border p-4"
                    style={{
                      background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
                      borderColor: "rgba(212,175,55,0.14)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Queue</div>
                        <div className="mt-1 text-2xl font-semibold tabular-nums text-white">{bulkCandidates.length}</div>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">
                        <LayoutGrid className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {(bulkCandidates.length ? bulkCandidates.slice(0, 4) : ["mybrand", "coolstartup", "awesomeapp"]).map((name, index) => (
                        <div key={`${name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-white/7 bg-black/20 px-3 py-2">
                          <span className={cn("truncate text-xs font-medium", bulkCandidates.length ? "text-white/75" : "text-white/22")}>{name}</span>
                          <span className={cn("text-[10px] font-semibold", bulkCandidates.length ? "text-emerald-300/80" : "text-white/20")}>
                            {bulkCandidates.length ? "6x" : "--"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 h-px bg-white/8" />
                    <label htmlFor="bulk-founder-signal" className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-[#D4AF37]/18 bg-[#D4AF37]/[0.055] p-3">
                      <input
                        id="bulk-founder-signal"
                        type="checkbox"
                        checked={bulkFounderSignalRequested}
                        onChange={(event) => setBulkFounderSignalRequested(event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#D4AF37]"
                      />
                      <span>
                        <strong className="block text-xs font-semibold text-[#D4AF37]">Add Founder Signal</strong>
                        <span className="mt-1 block text-[10px] leading-4 text-white/38">One free scored batch each month. Pro is unlimited under fair use.</span>
                      </span>
                    </label>
                  </div>
                </div>
              ) : isQuickMode ? (
                <div className="grid gap-4">
                  <div>
                    <label
                      htmlFor="quick-description"
                      className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "rgba(212,175,55,0.55)" }}
                    >
                      Keywords or description
                    </label>
                    <textarea
                      id="quick-description"
                      value={description}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 1000)
                        setDescription(val)
                        setKeyword(val.trim().slice(0, 160))
                      }}
                      placeholder="e.g. A friendly invoicing tool for freelancers..."
                      rows={4}
                      className="min-h-[138px] w-full resize-none rounded-lg p-4 text-sm leading-6 text-white/90 placeholder:text-white/25 focus:outline-none"
                      style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035))",
                        border: "1px solid rgba(255,255,255,0.105)",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.12)"
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                    {!description.trim() ? (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Try an example brief</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {generatorExampleBriefs.map((brief) => (
                            <button
                              key={brief}
                              type="button"
                              onClick={() => {
                                setDescription(brief)
                                setKeyword(brief.slice(0, 160))
                              }}
                              className="min-h-9 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-[11px] leading-4 text-white/48 transition hover:border-[#D4AF37]/35 hover:text-white/78"
                            >
                              {brief}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-3 text-[10px] tabular-nums text-white/25">
                      <span>{redesignEnabled ? "Free creative exploration" : PRODUCT_OFFER.freeUsageLabel}; checks {QUICK_TLD_LABEL}.</span>
                      <span>{descriptionCharacterCount} / 1000</span>
                    </div>
                    {searchHistory.length > 0 && (
                      <div className="mt-2 flex max-w-full flex-wrap items-center gap-1.5">
                        <span className="flex shrink-0 items-center gap-1 text-[10px] text-white/25">
                          <Clock className="h-2.5 w-2.5" /> Recent:
                        </span>
                        {searchHistory.slice(0, 3).map((term) => (
                          <button
                            key={term}
                            onClick={() => { setKeyword(term); setDescription(term) }}
                            className="max-w-[120px] truncate rounded-full px-2 py-0.5 text-[10px] text-white/35 transition-colors hover:text-white/70"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                          >
                            {term}
                          </button>
                        ))}
                        {aiHint && (
                          <span className="ml-auto text-[11px] text-[#D4AF37]/60 animate-fade-up">{aiHint}</span>
                        )}
                      </div>
                    )}
                    {!searchHistory.length && aiHint && (
                      <p className="mt-1.5 text-[11px] text-[#D4AF37]/60 animate-fade-up">{aiHint}</p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                    <div>
                      <label
                        htmlFor="quick-rhyme"
                        className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Rhyme or sound like
                      </label>
                      <input
                        id="quick-rhyme"
                        value={quickRhymeWith}
                        onChange={(e) => setQuickRhymeWith(e.target.value.slice(0, 80))}
                        placeholder="Optional, e.g. Spotify or Uber Eats"
                        className="h-12 w-full rounded-lg px-4 text-sm text-white/85 placeholder:text-white/25 focus:outline-none"
                        style={{
                          background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
                          border: "1px solid rgba(255,255,255,0.09)",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Max chars - <span style={{ color: "#D4AF37" }}>{maxLength}</span>
                      </label>
                      <div className="flex h-12 items-center gap-3 rounded-lg px-4" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))", border: "1px solid rgba(255,255,255,0.09)" }}>
                        <input
                          type="range"
                          aria-label="Maximum quick-generate name length"
                          aria-describedby={quickStyle === "non_english" ? "quick-max-length-help" : undefined}
                          min={quickMinimumLength}
                          max={15}
                          value={maxLength}
                          onChange={(e) => setMaxLength(Math.max(quickMinimumLength, Number(e.target.value)))}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#D4AF37]"
                          style={{ background: "rgba(255,255,255,0.08)" }}
                        />
                        <span className="w-6 shrink-0 text-center text-sm font-bold" style={{ color: "#D4AF37" }}>{maxLength}</span>
                      </div>
                      {quickStyle === "non_english" ? (
                        <p id="quick-max-length-help" className="mt-1.5 text-[10px] leading-4 text-white/38">
                          Reviewed French (Québec) and Welsh forms need 12–15 characters.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <fieldset>
                    <legend
                      className="mb-2.5 block text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      Vibe
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {quickVibeOptions.map((vibe) => (
                        <button
                          key={vibe.id}
                          type="button"
                          aria-pressed={quickVibe === vibe.id}
                          onClick={() => setQuickVibe(vibe.id)}
                          className={cn(
                            "min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-4",
                            quickVibe === vibe.id
                              ? "text-black shadow-[0_10px_24px_rgba(212,175,55,0.22)] hover:-translate-y-0.5"
                              : "text-white/45 hover:text-white/80 hover:-translate-y-0.5",
                          )}
                          style={quickVibe === vibe.id ? {
                            background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                          } : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {vibe.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {redesignEnabled ? (
                    <QuickExplorationControls
                      style={quickStyle}
                      creativity={quickCreativity}
                      blacklist={quickBlacklist}
                      preferences={preferenceProfile}
                      onStyleChange={handleQuickStyleChange}
                      onCreativityChange={setQuickCreativity}
                      onBlacklistChange={setQuickBlacklist}
                      onResetPreferences={resetLocalPreferences}
                    />
                  ) : null}

                  <div className="grid gap-2 border-t border-white/8 pt-4 sm:grid-cols-4">
                    {[
                      { label: redesignEnabled ? "Access" : "Allowance", value: redesignEnabled ? "Free" : `${PRODUCT_OFFER.freeMonthlyUses} uses / month` },
                      { label: "Method", value: redesignEnabled ? "16 creative candidates" : "AI + quality filters" },
                      { label: "Check", value: "Google DNS + RDAP" },
                      { label: "Register", value: "Namecheap links" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-white/7 bg-black/18 px-3 py-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/55">{item.label}</div>
                        <div className="mt-1 truncate text-xs text-white/55">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
              <>
              {/* ── STARTUP DESCRIPTION & KEYWORDS ── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="description"
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(212,175,55,0.55)" }}
                  >
                    Startup Description &amp; Keywords
                  </label>
                  {description.trim().length >= 20 && (
                    <button
                      type="button"
                      onClick={handleExtractKeywords}
                      disabled={isExtracting}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 disabled:opacity-50"
                      style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37" }}
                    >
                      {isExtracting ? (
                        <><RefreshCw className="h-3 w-3 animate-spin" /> Refining…</>
                      ) : (
                        <><Sparkles className="h-3 w-3" /> Refine It</>
                      )}
                    </button>
                  )}
                </div>

                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 1000)
                    setDescription(val)
                    // Keep keyword state in sync so old searches cannot leak into a new generation.
                    setKeyword(val.trim().slice(0, 160))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleExtractKeywords()
                  }}
                  placeholder="e.g. A sustainable skincare brand focusing on high-altitude botanical ingredients…"
                  rows={4}
                  className="min-h-[146px] w-full resize-none rounded-lg p-4 text-sm leading-6 text-white/90 placeholder:text-white/25 focus:outline-none"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035))",
                    border: "1px solid rgba(255,255,255,0.105)",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.12)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />

                <div className="mt-2 flex items-center justify-end text-[10px] tabular-nums text-white/25">
                  {descriptionCharacterCount} / 1000
                </div>

                {extractError && (
                  <p className="mt-1.5 text-[11px] text-red-400">{extractError}</p>
                )}

                {/* Search history pills */}
                {searchHistory.length > 0 && (
                  <div className="mt-2 flex max-w-full flex-wrap items-center gap-1.5">
                    <span className="flex shrink-0 items-center gap-1 text-[10px] text-white/25">
                      <Clock className="h-2.5 w-2.5" /> Recent:
                    </span>
                    {searchHistory.slice(0, 3).map((term) => (
                      <button
                        key={term}
                        onClick={() => { setKeyword(term); setDescription(term) }}
                        className="max-w-[100px] truncate rounded-full px-2 py-0.5 text-[10px] text-white/35 transition-colors hover:text-white/70"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        {term}
                      </button>
                    ))}
                    {aiHint && (
                      <span className="ml-auto text-[11px] text-[#D4AF37]/60 animate-fade-up">{aiHint}</span>
                    )}
                  </div>
                )}
                {!searchHistory.length && aiHint && (
                  <p className="mt-1.5 text-[11px] text-[#D4AF37]/60 animate-fade-up">{aiHint}</p>
                )}
              </div>

              {/* ── INDUSTRY FOCUS  +  MAX NAME LENGTH ── */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="industry"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Industry Focus
                  </label>
                  <select
                    id="industry"
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="h-12 w-full rounded-lg px-4 text-sm text-white/80 focus:outline-none [&>option]:bg-[#0d0b07] [&>option]:text-white"
                    style={{
                      background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
                      border: "1px solid rgba(255,255,255,0.09)",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.1)"
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    <option value="" className="bg-[#0d0b07] text-white/40">Select industry…</option>
                    {industryOptions.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Max Name Length &mdash; <span style={{ color: "#D4AF37" }}>{maxLength} chars</span>
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-lg px-4" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <input
                      type="range"
                      aria-label="Maximum advanced-generate name length"
                      min={6}
                      max={15}
                      value={maxLength}
                      onChange={(e) => setMaxLength(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#D4AF37]"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    />
                    <span className="w-6 shrink-0 text-center text-sm font-bold" style={{ color: "#D4AF37" }}>{maxLength}</span>
                  </div>
                </div>
              </div>

              {/* ── BRAND VIBE ── */}
              <fieldset className="mt-4">
                <legend
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Brand Vibe
                </legend>
                <div className="flex flex-wrap gap-2">
                  {vibeOptions.map((vibe) => (
                    <button
                      key={vibe.id}
                      type="button"
                      aria-pressed={selectedVibe === vibe.id}
                      onClick={() => setSelectedVibe(vibe.id)}
                      className={cn(
                        "min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-4",
                        selectedVibe === vibe.id
                          ? "text-black shadow-[0_10px_24px_rgba(212,175,55,0.22)] hover:-translate-y-0.5"
                          : "text-white/45 hover:text-white/80 hover:-translate-y-0.5",
                      )}
                      style={selectedVibe === vibe.id ? {
                        background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      {vibe.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5 grid gap-2 border-t border-white/8 pt-4 sm:grid-cols-4">
                {[
                  { label: "Live availability", value: "DNS + RDAP" },
                  { label: "Founder Signal", value: redesignEnabled ? "Run when ready" : "Quality model" },
                  { label: "TLD sweep", value: ALL_TLDS.map((tld) => `.${tld}`).join(" ") },
                  { label: "Shortlist", value: `${shortlist.length} saved` },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-white/7 bg-black/18 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/55">{item.label}</div>
                    <div className="mt-1 truncate text-xs text-white/55">{item.value}</div>
                  </div>
                ))}
              </div>

              {AUTO_FIND_UI_ENABLED && (
              <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3 sm:mt-5 sm:rounded-xl sm:p-4">
                <label className={cn("flex items-start gap-3", isProUser ? "cursor-pointer" : "cursor-not-allowed opacity-70")}>
                  <input
                    type="checkbox"
                    checked={autoFindComMode}
                    onChange={(e) => setAutoFindComMode(e.target.checked)}
                    disabled={!isProUser}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      Auto-find premium domains across all TLDs{isProUser ? "" : " · Pro"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      We only show premium names (score &gt;= 80). If fewer are found, we won't show low-quality results.
                    </span>
                  </span>
                </label>
                {autoFindComMode && AUTO_FIND_V2_ENABLED && (
                  <div className="mt-3 border-t border-border/40 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAutoFindControls((prev) => !prev)}
                      className="text-xs font-medium text-primary hover:text-primary/80"
                    >
                      {showAutoFindControls ? "Hide advanced auto-find controls" : "Show advanced auto-find controls"}
                    </button>
                    {showAutoFindControls && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-foreground sm:text-xs">Deterministic seed (optional)</label>
                          <input
                            type="text"
                            value={autoFindControls.seed}
                            onChange={(e) => setAutoFindControls((prev) => ({ ...prev, seed: e.target.value }))}
                            placeholder="e.g., jan-launch-01"
                            className="h-9 w-full rounded-md border border-border/50 bg-background/60 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-foreground sm:text-xs">Must include keyword</label>
                          <select
                            value={autoFindControls.mustIncludeKeyword}
                            onChange={(e) =>
                              setAutoFindControls((prev) => ({
                                ...prev,
                                mustIncludeKeyword: e.target.value as AutoFindMustIncludeKeyword,
                              }))
                            }
                            className="h-9 w-full rounded-md border border-border/50 bg-background/60 px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="exact">Exact</option>
                            <option value="partial">Partial</option>
                            <option value="none">None</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-foreground sm:text-xs">Keyword position</label>
                          <select
                            value={autoFindControls.keywordPosition}
                            onChange={(e) =>
                              setAutoFindControls((prev) => ({
                                ...prev,
                                keywordPosition: e.target.value as AutoFindKeywordPosition,
                              }))
                            }
                            className="h-9 w-full rounded-md border border-border/50 bg-background/60 px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="prefix">Prefix</option>
                            <option value="suffix">Suffix</option>
                            <option value="anywhere">Anywhere</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-foreground sm:text-xs">Style</label>
                          <select
                            value={autoFindControls.style}
                            onChange={(e) =>
                              setAutoFindControls((prev) => ({
                                ...prev,
                                style: e.target.value as AutoFindStyle,
                              }))
                            }
                            className="h-9 w-full rounded-md border border-border/50 bg-background/60 px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="real_words">Real words</option>
                            <option value="brandable_blends">Brandable blends</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium text-foreground sm:text-xs">
                            Blocklist terms (comma separated)
                          </label>
                          <input
                            type="text"
                            value={autoFindControls.blocklist}
                            onChange={(e) => setAutoFindControls((prev) => ({ ...prev, blocklist: e.target.value }))}
                            placeholder="lux, pro, hub"
                            className="h-9 w-full rounded-md border border-border/50 bg-background/60 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium text-foreground sm:text-xs">
                            Allowlist roots (comma separated)
                          </label>
                          <input
                            type="text"
                            value={autoFindControls.allowlist}
                            onChange={(e) => setAutoFindControls((prev) => ({ ...prev, allowlist: e.target.value }))}
                            placeholder="fit, motion"
                            className="h-9 w-full rounded-md border border-border/50 bg-background/60 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={autoFindControls.allowHyphen}
                            onChange={(e) => setAutoFindControls((prev) => ({ ...prev, allowHyphen: e.target.checked }))}
                            className="h-4 w-4 rounded border-border bg-background accent-primary"
                          />
                          Allow hyphens
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={autoFindControls.allowNumbers}
                            onChange={(e) => setAutoFindControls((prev) => ({ ...prev, allowNumbers: e.target.checked }))}
                            className="h-4 w-4 rounded border-border bg-background accent-primary"
                          />
                          Allow numbers
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={autoFindControls.meaningFirst}
                            onChange={(e) => setAutoFindControls((prev) => ({ ...prev, meaningFirst: e.target.checked }))}
                            className="h-4 w-4 rounded border-border bg-background accent-primary"
                          />
                          Meaning-first mode
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={autoFindControls.preferTwoWordBrands}
                            onChange={(e) => {
                              setHasCustomTwoWordPreference(true)
                              setAutoFindControls((prev) => ({ ...prev, preferTwoWordBrands: e.target.checked }))
                            }}
                            className="h-4 w-4 rounded border-border bg-background accent-primary"
                          />
                          Prefer 2-word brands
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={autoFindControls.allowVibeSuffix}
                            onChange={(e) => setAutoFindControls((prev) => ({ ...prev, allowVibeSuffix: e.target.checked }))}
                            className="h-4 w-4 rounded border-border bg-background accent-primary"
                          />
                          Allow tasteful suffixes
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={autoFindControls.showAnyAvailable}
                            onChange={(e) => setAutoFindControls((prev) => ({ ...prev, showAnyAvailable: e.target.checked }))}
                            className="h-4 w-4 rounded border-border bg-background accent-primary"
                          />
                          Show any available (skip strict quality threshold)
                        </label>
                      </div>
                    )}
                  </div>
                )}
                {autoFindComMode && !AUTO_FIND_V2_ENABLED && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Auto-find V2 is disabled. Set <code>NEXT_PUBLIC_AUTO_FIND_V2=true</code> to enable stronger relevance controls.
                  </p>
                )}
              </div>
              )}
              </>
              )}

              {/* Generate / Bulk Check Button */}
              <button
                ref={generateButtonRef}
                onClick={isBulkMode ? handleBulkCheck : isQuickMode ? handleQuickGenerate : handleGenerate}
                disabled={isBulkMode ? (!bulkInput.trim() || isGenerating) : ((!keyword.trim() && !description.trim()) || isGenerating)}
                className={cn(
                  "mt-5 h-[52px] w-full rounded-lg text-sm font-bold tracking-wide transition-all duration-200 sm:mt-7 sm:h-14 sm:text-base",
                  "flex items-center justify-center gap-2",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                  !isGenerating && "hover:-translate-y-0.5"
                )}
                style={{
                  background: "linear-gradient(135deg, #B8841F 0%, #F5DD77 48%, #C99A2E 100%)",
                  color: "#0a0800",
                  boxShadow: isGenerating
                    ? "0 10px 26px rgba(212,175,55,0.16)"
                    : "0 16px 38px rgba(212,175,55,0.28), inset 0 1px 0 rgba(255,255,255,0.55)",
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                    {isBulkMode ? "Checking..." : isQuickMode ? "Generating free names..." : "Generating..."}
                  </>
                ) : isBulkMode ? (
                  <>
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                    Check Domains
                  </>
                ) : isQuickMode ? (
                  <>
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                    Generate candidates
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                    Discover Names
                  </>
                )}
              </button>

              {feedbackNotice ? (
                <p className="mt-3 rounded-lg border border-[#D4AF37]/18 bg-[#D4AF37]/[0.055] px-3 py-2 text-center text-xs text-[#F6E27A]/75" role="status" aria-live="polite">
                  {feedbackNotice}
                </p>
              ) : null}

              {/* Cinematic loading steps */}
              {isGenerating && !(redesignEnabled && !isBulkMode) && (
                <div className="mt-4 flex flex-col items-center gap-1.5" role="status" aria-live="polite">
                  {(isQuickMode ? QUICK_LOADING_STEPS : LOADING_STEPS).map((step, i) => (
                    <div
                      key={step}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-all duration-500",
                        i === loadingStep ? "text-[#D4AF37]" : i < loadingStep ? "text-white/30 line-through" : "text-white/20"
                      )}
                    >
                      {i < loadingStep ? (
                        <Check className="h-3 w-3 shrink-0 text-[#D4AF37]/50" />
                      ) : i === loadingStep ? (
                        <span className="relative inline-flex h-2 w-2 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4AF37] opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D4AF37]" />
                        </span>
                      ) : (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-white/10" />
                      )}
                      {step}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={stopAutoFindSearch}
                    className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-4 text-xs font-semibold text-white/62 transition hover:border-white/30 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {redesignEnabled && !isBulkMode && isGenerating && generationPhase === "generating_names" ? (
                <GenerationSplash
                  mode={isQuickMode ? "quick" : "advanced"}
                  phase={generationPhase}
                  brief={(description.trim() || keyword.trim()).slice(0, 240)}
                  style={isQuickMode ? quickStyle : "auto"}
                  creativity={isQuickMode ? quickCreativity : "balanced"}
                  maxLength={maxLength}
                  previousBatchCount={previousBatchCount}
                  onCancel={stopAutoFindSearch}
                />
              ) : null}

              {/* Error Message */}
              {error && (
                <div role="alert" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl p-4 text-red-400"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="min-w-0 flex-1 text-xs sm:text-sm">{error}</p>
                  <button
                    type="button"
                    onClick={generationUpgradeHref
                      ? () => router.push(generationUpgradeHref)
                    : isBulkMode
                        ? results.length > 0 && bulkFounderSignalRequested
                          ? () => { void scoreBulkResults(results) }
                          : handleBulkCheck
                        : isQuickMode
                          ? handleQuickGenerate
                          : handleGenerate}
                    className="min-h-10 rounded-md border border-red-300/30 px-3 text-xs font-semibold text-red-100 hover:bg-red-300/10"
                  >
                    {generationUpgradeHref ? "View Pro" : "Retry"}
                  </button>
                </div>
              )}

              <p className="sr-only" aria-live="polite" aria-atomic="true">
                {liveStatusMessage}
              </p>

              {/* Quick category pills — shown when no input yet and not generating */}
              {!isBulkMode && !description.trim() && !isGenerating && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-white/25">Try:</span>
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => {
                        setDescription(cat.value)
                        setKeyword(cat.value)
                      }}
                      className="rounded-full px-3 py-1 text-[10px] font-medium transition-all hover:-translate-y-0.5 hover:opacity-90"
                      style={{
                        background: "rgba(212,175,55,0.07)",
                        border: "1px solid rgba(212,175,55,0.18)",
                        color: "rgba(212,175,55,0.7)",
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {AUTO_FIND_UI_ENABLED && autoFindComMode && isAdvancedMode && (isAutoFindingComs || availableComPicks.length > 0 || autoFindStatus) && (
              <div className="mb-4 rounded-xl border border-border/40 bg-card/60 p-3 sm:mb-6 sm:rounded-2xl sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground sm:text-base">Top Founder Signal picks</h2>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      {isAutoFindingComs
                        ? `Scanning highest Founder Signal domains... (Attempt ${Math.max(autoFindAttempt, 1)}/${AUTO_FIND_V2_ENABLED ? AUTO_FIND_V2_MAX_ATTEMPTS : AUTO_FIND_MAX_ATTEMPTS})`
                        : autoFindStatus || "Ready"}
                    </p>
                    {autoFindSummary && (
                      <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{autoFindSummary.explanation}</p>
                    )}
                  </div>
                  {isAutoFindingComs && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopAutoFindSearch}
                      className="h-9 w-full bg-transparent sm:w-auto"
                    >
                      Stop
                    </Button>
                  )}
                  {!isAutoFindingComs && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRerollFlair}
                      className="h-9 w-full bg-transparent sm:w-auto"
                    >
                      Reroll flair
                    </Button>
                  )}
                </div>

                {availableComPicks.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {availableComPicks.map((result) => {
                      const resultCardView = buildResultCardView({
                        fullDomain: result.fullDomain,
                        whyItWorks: result.whyItWorks,
                        meaningBreakdown: result.meaningBreakdown,
                        meaningScore: result.meaningScore,
                        brandableScore: result.brandableScore ?? resultScore(result),
                        pronounceable: result.pronounceable,
                        available: result.available,
                      })

                      const isPremiumDomain = resultScore(result) >= PREMIUM_SCORE_THRESHOLD
                      const isBlurred = false

                      return (
                        <div
                          key={result.fullDomain}
                          className={cn(
                            "relative rounded-lg border p-3 transition-all",
                            isBlurred
                              ? "border-amber-500/30 bg-amber-500/5 cursor-pointer hover:border-amber-400/50"
                              : "border-green-500/20 bg-green-500/5"
                          )}
                        >
                          {/* Premium badge for high-scoring domains */}
                          {isPremiumDomain && (
                            <div className="absolute -top-2 right-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-md">
                              ⭐ PREMIUM
                            </div>
                          )}

                          <div className={cn("flex items-start justify-between gap-2", isBlurred && "select-none")}>
                            <div className="min-w-0">
                              <p className={cn("truncate font-display text-base font-semibold tracking-tight text-foreground", isBlurred && "blur-sm")}>{resultCardView.title}</p>
                              <p className={cn("mt-1 text-xs text-muted-foreground", isBlurred && "blur-sm")}>
                                {resultScore(result)} · {getFounderSignalBand(resultScore(result))} | {result.pronounceable ? "Pronounceable" : "Brandable"}
                              </p>
                              <p className={cn("mt-1 text-[11px] text-muted-foreground", isBlurred && "blur-sm")}>{resultCardView.whyItWorks}</p>
                              <p className={cn("mt-1 text-[11px] text-primary/90", isBlurred && "blur-sm")}>{resultCardView.meaningBreakdown}</p>
                              {result.whyTag && (
                                <p className={cn("mt-1 text-[11px] text-primary/90", isBlurred && "blur-sm")}>
                                  {result.whyTag}
                                </p>
                              )}
                              {result.personalDescription && (
                                <p className={cn("mt-2 text-[11px] leading-relaxed text-muted-foreground", isBlurred && "blur-sm")}>
                                  {result.personalDescription}
                                </p>
                              )}
                              {result.slogan && (
                                <p className={cn("mt-1 text-[11px] font-semibold text-primary", isBlurred && "blur-sm")}>
                                  Slogan: {result.slogan}
                                </p>
                              )}
                              <div className={cn("mt-1.5 flex flex-wrap gap-1.5", isBlurred && "blur-sm")}>
                                {resultCardView.badges.map((badge) => (
                                  <span
                                    key={`${result.fullDomain}-${badge}`}
                                    className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary"
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {isPremiumDomain ? (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                Premium
                              </span>
                            ) : result.checkStatus === "available" ? (
                              <span
                                className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400"
                                title="Confirmed unregistered via RDAP registry lookup"
                              >
                                Verified free
                              </span>
                            ) : result.checkStatus === "likely_available" ? (
                              <span
                                className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
                                title="DNS says available — no RDAP endpoint for this TLD"
                              >
                                Likely free
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
                                Available
                              </span>
                            )}
                          </div>
                          <div className={cn("mt-2 flex items-center gap-1.5", isBlurred && "blur-sm pointer-events-none")}>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(result.fullDomain); }}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="Copy domain"
                              disabled={isBlurred}
                            >
                              {copiedName === result.fullDomain ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleShortlist(result.fullDomain); }}
                              className={cn(
                                "rounded-md p-1.5 transition-colors hover:bg-muted",
                                shortlist.includes(result.fullDomain)
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              title={shortlist.includes(result.fullDomain) ? "Remove from shortlist" : "Add to shortlist"}
                              disabled={isBlurred}
                            >
                              {shortlist.includes(result.fullDomain) ? (
                                <BookmarkCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Bookmark className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <a
                              href={namecheapLink(result.fullDomain, { source: "top_pick", content: result.fullDomain })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 rounded-md bg-pink-500/15 px-2 py-1 text-[11px] font-medium text-pink-400 transition-colors hover:bg-pink-500/25"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNamecheapClick(result.fullDomain, "top_pick", { score: resultScore(result) })
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Register
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {autoFindSummary && autoFindSummary.found < autoFindSummary.target && (
                  <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-100/90">
                      Premium-domain scarcity at this length. Try: +2 chars, 2-word mode, or allow suffix.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {autoFindSummary.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => applyAutoFindSuggestion(suggestion)}
                          className="rounded-full border border-amber-400/40 px-2.5 py-1 text-[11px] font-medium text-amber-100 transition-colors hover:bg-amber-400/15"
                        >
                          {getSuggestionLabel(suggestion)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTldFilter("ai")
                          setShowOnlyAvailable(true)
                        }}
                        className="rounded-full border border-amber-400/40 px-2.5 py-1 text-[11px] font-medium text-amber-100 transition-colors hover:bg-amber-400/15"
                      >
                        Switch TLD: .ai
                      </button>
                    </div>
                  </div>
                )}

                {autoFindSummary && autoFindSummary.nearMisses.length > 0 && (
                  <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                    <p className="text-xs font-medium text-foreground">Near-misses (top names available on alternate TLDs)</p>
                    <div className="mt-2 space-y-1.5">
                      {autoFindSummary.nearMisses.map((nearMiss) => (
                        <div key={nearMiss.name} className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{nearMiss.name}</span>
                          {nearMiss.availableTlds.map((tld) => (
                            <button
                              key={`${nearMiss.name}-${tld}`}
                              type="button"
                              onClick={() => {
                                setSelectedTldFilter(tld)
                                setShowOnlyAvailable(true)
                              }}
                              className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary transition-colors hover:bg-primary/25"
                            >
                              .{tld} available
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {AUTO_FIND_V2_ENABLED && autoFindSummary && (
                  <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3 sm:mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-foreground sm:text-sm">Details</summary>
                    <div className="mt-2 space-y-2 text-[11px] text-muted-foreground sm:text-xs">
                      <p>
                        Found {autoFindSummary.found}/{autoFindSummary.target} premium domains. Generated{" "}
                        {autoFindSummary.generatedCandidates} candidates, filtered to {autoFindSummary.passedFilters}, checked{" "}
                        {autoFindSummary.checkedAvailability} domains.
                      </p>
                      <p>
                        {autoFindSummary.checkingProgress} | Quality threshold: {autoFindSummary.qualityThreshold}
                      </p>
                      <p>
                        Availability hit rate: {autoFindSummary.availabilityHitRate}% | Provider errors:{" "}
                        {autoFindSummary.providerErrors}
                      </p>
                      <div>
                        <p className="font-medium text-foreground">Applied relaxations</p>
                        {autoFindSummary.relaxationsApplied.length > 0 ? (
                          <ul className="mt-1 list-disc pl-4">
                            {autoFindSummary.relaxationsApplied.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1">None</p>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Top rejected reasons</p>
                        {autoFindSummary.topRejectedReasons.length > 0 ? (
                          <ul className="mt-1 list-disc pl-4">
                            {autoFindSummary.topRejectedReasons.map((reason) => (
                              <li key={reason.reason}>
                                {reason.reason}: {reason.count}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1">No rejected reasons captured.</p>
                        )}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Results */}
            {(results.length > 0 || (redesignEnabled && explorationResults.length > 0)) && (
              <div ref={resultsRef} tabIndex={-1} className="min-w-0 scroll-mt-4 outline-none">
                {redesignEnabled && !isBulkMode ? (
                  <>
                    {isQuickMode && quickGenerationShortfall ? (
                      <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-amber-50"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
                          Partial style batch · {quickGenerationShortfall.resultCount} of {quickGenerationShortfall.requestedCount} names
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-50/75 sm:text-sm">
                          {quickGenerationShortfall.reason}
                        </p>
                      </div>
                    ) : null}
                    <GeneratorExplorationResults
                      mode={isQuickMode ? "quick" : "advanced"}
                      candidates={orderedExplorationResults}
                      phase={isScoringFounderSignal ? "scoring_founder_signal" : generationPhase}
                      isPro={isProUser}
                      shortlist={shortlist}
                      dislikedIds={dislikedCandidateIds}
                      likedIds={likedCandidateIds}
                      copiedValue={copiedName}
                      selectedCandidateId={selectedExplorationCandidateId}
                      scoreAllowanceExhausted={scoreAllowanceExhausted}
                      scoringError={scoringError}
                      availabilityError={availabilityError}
                      sortByScore={sortByFounderSignal}
                      onSave={handleExplorationSave}
                      onLike={handleExplorationLike}
                      onDislike={handleExplorationDislike}
                      onMoreLikeThis={handleExplorationMoreLikeThis}
                      onCopy={handleExplorationCopy}
                      onSelectCandidate={(candidate) => setSelectedExplorationCandidateId(candidate.id)}
                      onRegistrarClick={handleExplorationRegistrarClick}
                      onRetryAvailability={handleRetryExplorationAvailability}
                      onRunFounderSignal={handleFounderSignalBatch}
                      onToggleSort={handleFounderSignalSort}
                      onUpgradeScoring={handleFounderSignalUpgrade}
                    />

                    {generatorResultsAdPosition === "inline_after_quick_results" ? (
                      <>
                        <AdBanner placement="generator-after-results" className="mt-7" />
                        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-white/36">
                          Domain checks are advisory until registration. Save only a verified option, or keep exploring before choosing your next step.
                        </p>
                      </>
                    ) : null}

                    {explorationDecisionCandidate ? (
                      <section
                        aria-label="Shortlist decision actions"
                        className="sticky bottom-3 z-20 mt-5 rounded-xl border border-[#D4AF37]/20 bg-[#090909]/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="mr-auto min-w-full text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]/70 sm:min-w-0">
                            Next actions for <span className="text-[#F6E27A]">{explorationDecisionCandidate.name}</span>
                          </p>
                          <button
                            type="button"
                            disabled={!explorationDecisionSavedDomain && !explorationDecisionDomain}
                            onClick={() => handleExplorationSave(explorationDecisionCandidate)}
                            title={!explorationDecisionSavedDomain && !explorationDecisionDomain
                              ? "Save unlocks when a domain is verified available"
                              : undefined}
                            className={cn(
                              "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold",
                              !explorationDecisionSavedDomain && !explorationDecisionDomain
                                ? "cursor-not-allowed border-white/6 text-white/25"
                                : "border-white/10 text-white/65 hover:text-white",
                            )}
                          >
                            {explorationDecisionSavedDomain ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                            {explorationDecisionSavedDomain
                              ? `Saved ${explorationDecisionCandidate.name}`
                              : explorationDecisionDomain
                                ? `Save ${explorationDecisionCandidate.name}`
                                : `Checking ${explorationDecisionCandidate.name}…`}
                          </button>
                          <button
                            type="button"
                            onClick={compareExplorationResults}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/65 hover:text-white"
                          >
                            {isProUser ? <Swords className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            {isProUser ? "Compare two" : "Compare two · Pro"}
                          </button>
                          {explorationDecisionDomain ? (
                            <a
                              href={namecheapLink(explorationDecisionDomain, { source: "generator_v2_decision_rail" })}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleNamecheapClick(explorationDecisionDomain, "generator_v2_decision_rail")}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 text-xs font-semibold text-emerald-200/80 hover:text-emerald-100"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Check / register
                            </a>
                          ) : null}
                          {isProUser ? (
                            <Link
                              href={explorationBrandKitHref}
                              onClick={() => handleLaunchKitStarted("generator_v2_decision_rail", explorationDecisionCandidate.name)}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 text-xs font-bold text-black"
                            >
                              <Palette className="h-3.5 w-3.5" /> Brand tools
                            </Link>
                          ) : (
                            <Link
                              href={attributedCheckoutHref}
                              onClick={handleResultsUpgradeClick}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 text-xs font-bold text-black"
                            >
                              <Sparkles className="h-3.5 w-3.5" /> View Pro
                            </Link>
                          )}
                        </div>
                        {!isQuickMode && isProUser && explorationDecisionCandidate.founderSignal?.status === "ready" ? (
                          <NameStressTest
                            name={explorationDecisionCandidate.name}
                            founderScore={explorationDecisionCandidate.founderSignal.score ?? undefined}
                          />
                        ) : null}
                      </section>
                    ) : null}
                  </>
                ) : (
                <>
                {/* Results summary strip */}
                {(() => {
                  const allNames = Array.from(new Map(results.map(r => [r.name, r])).values())
                  const comFreeCount = results.filter(r => r.tld === "com" && r.checkStatus === "available").length
                  const likelyFreeCount = results.filter(r => r.checkStatus === "likely_available").length
                  const topScore = results.reduce((m, r) => Math.max(m, resultScore(r)), 0)
                  const showTopScore = !isQuickMode && founderSignalUnlockedForCurrentMode
                  return (
                    <div
                      className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl px-4 py-2.5"
                      style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}
                    >
                      <span className="text-xs font-bold text-white/70">{allNames.length} names generated</span>
                      {comFreeCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          {comFreeCount} .com free
                        </span>
                      )}
                      {likelyFreeCount > 0 && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "rgba(52,211,153,0.7)" }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "rgba(52,211,153,0.7)" }} />
                          {likelyFreeCount} likely free · confirm with registrar
                        </span>
                      )}
                      <span className="ml-auto text-xs" style={{ color: "#D4AF37" }}>
                        {isQuickMode
                          ? `${QUICK_GENERATE_TLDS.length} TLDs checked`
                          : showTopScore
                            ? `Top score: ${topScore}`
                            : "Founder Signal locked"}
                      </span>
                    </div>
                  )
                })()}

                <div className="mb-3 space-y-2 sm:mb-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
                  <h2 className="text-sm font-semibold text-foreground sm:text-lg">
                    Results <span className="text-xs text-muted-foreground sm:text-base">({groupedResults.length} name{groupedResults.length !== 1 ? "s" : ""})</span>
                  </h2>
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    {/* CSV Export Button */}
                    {!isQuickMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToCSV}
                        className="flex h-8 min-h-0 items-center gap-1.5 px-2 text-xs sm:h-10 sm:min-h-[40px] sm:gap-2 sm:px-3"
                      >
                        {copiedName === "csv-exported" ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-green-400 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Exported!</span>
                          </>
                        ) : (
                          <>
                            {isProUser ? <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            <span className="hidden sm:inline">{isProUser ? "Export CSV" : "Export · Pro"}</span>
                          </>
                        )}
                      </Button>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:gap-2 sm:text-sm">
                      <span className="flex items-center gap-1" title="Confirmed unregistered via RDAP">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 sm:h-2 sm:w-2" />
                        Verified free
                      </span>
                      <span className="flex items-center gap-1" title="DNS says available — RDAP not available for this TLD">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 sm:h-2 sm:w-2" />
                        Likely free
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground sm:h-2 sm:w-2" />
                        Taken
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filter Bar */}
                {!isQuickMode && (
                <div className="-mx-3 mb-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-hide sm:mx-0 sm:mb-4 sm:gap-2 sm:px-0">
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    Filter:
                  </span>
                  {/* TLD Filters */}
                  <button
                    onClick={() => setSelectedTldFilter(null)}
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 text-[10px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs",
                      selectedTldFilter === null
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    All
                  </button>
                  {ALL_TLDS.map((tld) => (
                    <button
                      key={tld}
                      onClick={() => setSelectedTldFilter(tld)}
                      className={cn(
                        "shrink-0 rounded-full px-2 py-1 text-[10px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs",
                        selectedTldFilter === tld
                          ? tldColors[tld]?.replace("/20", "") || "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      .{tld}
                    </button>
                  ))}
                  {/* Availability Filter */}
                  <span className="shrink-0 text-xs text-muted-foreground">|</span>
                  <button
                    onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs",
                      showOnlyAvailable
                        ? "bg-green-500/20 text-green-400"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {showOnlyAvailable ? "✓ Avail." : "Avail. Only"}
                  </button>
                </div>

                )}

                {/* Advanced filters — min score, include/exclude words */}
                {!isQuickMode && (
                <div className="mb-3">
                  <button
                    onClick={() => setShowAdvancedFilters((p) => !p)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold transition-all hover:opacity-80 sm:text-xs"
                    style={{ color: showAdvancedFilters ? "#D4AF37" : "rgba(255,255,255,0.3)" }}
                  >
                    <Filter className="h-3 w-3" />
                    {showAdvancedFilters ? "Hide" : "More"} filters
                    {(minScore > 0 || includeWord.trim() || excludeWord.trim()) && (
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37" }}>
                        active
                      </span>
                    )}
                  </button>

                  {showAdvancedFilters && (
                    <div
                      className="mt-2 grid gap-3 rounded-xl p-3 sm:grid-cols-3"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      {/* Min Founder Signal score */}
                      {canUseScoreControls ? (
                        <div>
                          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(212,175,55,0.6)" }}>
                            Min Score {minScore > 0 ? `(≥ ${minScore})` : "(off)"}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              aria-label="Minimum Founder Signal score"
                              min={0}
                              max={90}
                              step={5}
                              value={minScore}
                              onChange={(e) => setMinScore(Number(e.target.value))}
                              className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#D4AF37]"
                              style={{ background: "rgba(255,255,255,0.08)" }}
                            />
                            <span className="w-7 shrink-0 text-center text-[11px] font-bold" style={{ color: minScore > 0 ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>
                              {minScore || "—"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-2">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#D4AF37]">
                            <Lock className="h-3 w-3" />
                            Founder Signal filter locked
                          </div>
                          <p className="mt-1 text-[11px] text-white/35">Upgrade to filter bulk checks by brand score.</p>
                        </div>
                      )}

                      {/* Include word */}
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
                          Include word
                        </label>
                        <input
                          type="text"
                          value={includeWord}
                          onChange={(e) => setIncludeWord(e.target.value)}
                          placeholder="e.g. flux, nova"
                          className="h-8 w-full rounded-lg px-3 text-xs text-white/80 placeholder:text-white/20 focus:outline-none"
                          style={{
                            background: "rgba(255,255,255,0.07)",
                            border: includeWord.trim() ? "1px solid rgba(212,175,55,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          }}
                        />
                      </div>

                      {/* Exclude word */}
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
                          Exclude word
                        </label>
                        <input
                          type="text"
                          value={excludeWord}
                          onChange={(e) => setExcludeWord(e.target.value)}
                          placeholder="e.g. hub, zone"
                          className="h-8 w-full rounded-lg px-3 text-xs text-white/80 placeholder:text-white/20 focus:outline-none"
                          style={{
                            background: "rgba(255,255,255,0.07)",
                            border: excludeWord.trim() ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.08)",
                          }}
                        />
                      </div>

                      {/* Reset filters shortcut */}
                      {(minScore > 0 || includeWord.trim() || excludeWord.trim()) && (
                        <button
                          onClick={() => { setMinScore(0); setIncludeWord(""); setExcludeWord("") }}
                          className="col-span-full text-left text-[10px] underline"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          Reset advanced filters
                        </button>
                      )}
                    </div>
                  )}
                </div>

                )}

                {/* Deep Search for .com — only shown in keyword-driven mode */}
                {isAdvancedMode && founderSignalUnlockedForCurrentMode && !redesignEnabled && (
                  <DeepSearch
                    key={generationId}
                    keyword={keyword}
                    vibe={selectedVibe}
                    industry={selectedIndustry}
                    maxLength={maxLength}
                  />
                )}

                {/* Bulk sort controls — shown in bulk mode */}
                {isBulkMode && groupedResults.length > 1 && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>Sort:</span>
                    {(canUseScoreControls
                      ? (["score", "length", "availability"] as const)
                      : (["length", "availability"] as const)
                    ).map((key) => (
                      <button
                        key={key}
                        onClick={() => setBulkSortKey(key)}
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all"
                        style={bulkSortKey === key ? {
                          background: "rgba(212,175,55,0.15)",
                          border: "1px solid rgba(212,175,55,0.35)",
                          color: "#D4AF37",
                        } : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.35)",
                        }}
                      >
                        {key === "score" ? "Founder Signal" : key === "length" ? "Shortest name" : "Availability"}
                      </button>
                    ))}
                  </div>
                )}

                {hasResultsReady && !(redesignEnabled && !isBulkMode) && (
                  <div
                    className="mb-4 rounded-2xl p-4 sm:p-5"
                    style={{
                      background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(255,255,255,0.035) 44%, rgba(5,5,5,0.72))",
                      border: "1px solid rgba(212,175,55,0.24)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "rgba(212,175,55,0.78)" }}>
                          {isQuickMode
                            ? "Top brief-fit recommendation"
                            : founderSignalUnlockedForCurrentMode
                              ? "Top Founder Signal recommendation"
                              : "Top available recommendation"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2.5">
                          <h3 className="truncate font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                            {topResultGroup?.name}
                          </h3>
                          {isQuickMode ? (
                            <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-bold text-[#F6E27A]">
                              Brief-fit lead
                            </span>
                          ) : founderSignalUnlockedForCurrentMode && topFounderBand ? (
                            <span
                              aria-label={`Founder Signal score ${topFounderScore} out of 100, ${topFounderBand}`}
                              className="rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums"
                              style={{
                                background: "rgba(212,175,55,0.1)",
                                borderColor: "rgba(212,175,55,0.28)",
                                color: "#F6E27A",
                              }}
                            >
                              {topFounderScore}/100 · {topFounderBand}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-white/45">
                              <Lock className="h-3 w-3" />
                              Founder Signal locked
                            </span>
                          )}
                        </div>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/45 sm:text-sm">
                          {isQuickMode && topResultGroup?.best.personality
                            ? topResultGroup.best.personality
                            : topRegisterDomain
                              ? generatorToolsEnabled
                                ? `${topRegisterDomain} leads this batch. Save it, build its brand palette, or verify its current status with the registrar.`
                                : `${topRegisterDomain} leads this batch. Save it or verify its current status with the registrar.`
                              : generatorToolsEnabled
                                ? "This name leads the current shortlist. Save it or build its brand palette before choosing your next step."
                                : "This name leads the current shortlist. Save it while you review the rest of the batch."}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "grid gap-2 sm:grid-cols-2",
                          generatorToolsEnabled ? "lg:min-w-[560px] lg:grid-cols-4" : "lg:min-w-[360px]",
                        )}
                      >
                        <button
                          type="button"
                          onClick={saveBestResultToShortlist}
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-semibold text-white/78 transition-all hover:-translate-y-0.5 hover:border-[#D4AF37]/35 hover:text-white"
                        >
                          <Bookmark className="h-4 w-4" />
                          Save shortlist
                        </button>
                        {generatorToolsEnabled ? (
                          <button
                            type="button"
                            onClick={compareTopResults}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-semibold text-white/78 transition-all hover:-translate-y-0.5 hover:border-[#D4AF37]/35 hover:text-white"
                          >
                            {isProUser ? <Swords className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {isProUser ? "Compare" : "Compare · Pro"}
                          </button>
                        ) : null}
                        {generatorToolsEnabled ? (
                          <Link
                            href={isProUser ? brandKitHref : "/pricing?from=generate-results&feature=brand-palette#plans"}
                            onClick={() => handleLaunchKitStarted("generate_results_action_row", topResultGroup?.name)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-2 text-sm font-semibold text-[#F6E27A] transition-all hover:-translate-y-0.5 hover:bg-[#D4AF37]/15"
                          >
                            <Palette className="h-4 w-4" />
                            {isProUser ? "Brand palette" : "Unlock palette"}
                          </Link>
                        ) : null}
                        {topRegisterDomain ? (
                          <a
                            href={namecheapLink(topRegisterDomain, { source: "generate_results_action_row", content: "top_domain" })}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleNamecheapClick(topRegisterDomain, "generate_results_action_row", { name: topResultGroup?.name })}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#0a0800] transition-all hover:-translate-y-0.5"
                            style={{
                              background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                              boxShadow: "0 14px 30px rgba(212,175,55,0.2)",
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Register top pick
                          </a>
                        ) : generatorToolsEnabled ? (
                          <Link
                            href={brandKitHref}
                            onClick={() => handleLaunchKitStarted("generate_results_action_row_no_available", topResultGroup?.name)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#0a0800] transition-all hover:-translate-y-0.5"
                            style={{
                              background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                              boxShadow: "0 14px 30px rgba(212,175,55,0.2)",
                            }}
                          >
                            <Sparkles className="h-4 w-4" />
                            Open brand palette
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/38">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                        {PRODUCT_OFFER.freeUsageLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                        Domain availability checked live
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {(isBulkMode
                    ? [...groupedResults].sort((a, b) => {
                        if (bulkSortKey === "score" && canUseScoreControls) return resultScore(b.best) - resultScore(a.best)
                        if (bulkSortKey === "length") return a.name.length - b.name.length
                        // availability: available first, then by score when unlocked
                        if (a.hasAvailable !== b.hasAvailable) return a.hasAvailable ? -1 : 1
                        return canUseScoreControls ? resultScore(b.best) - resultScore(a.best) : a.name.localeCompare(b.name)
                      })
                    : groupedResults
                  ).map(({ name, tlds, best, hasAvailable }, index) => {
                    const isTopPick = name === topPickName
                    const availableTlds = tlds.filter((r) => r.available)
                    if (isQuickMode) {
                      const registerHref = best.registerUrl || namecheapLink(best.fullDomain, { source: "quick_generate_result", content: best.tld })
                      return (
                        <div
                          key={name}
                          className={cn(
                            "group rounded-2xl transition-all duration-200",
                            "animate-fade-up opacity-0",
                            "hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.45)]",
                            !hasAvailable && "opacity-70",
                          )}
                          style={{
                            background: hasAvailable ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
                            border: hasAvailable ? "1px solid rgba(212,175,55,0.16)" : "1px solid rgba(255,255,255,0.07)",
                            animationDelay: `${Math.min(index * 0.02, 0.5)}s`,
                            animationFillMode: "forwards",
                          }}
                        >
                          <div className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                    style={{
                                      background: hasAvailable ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
                                      border: hasAvailable ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.06)",
                                      color: hasAvailable ? "#34d399" : "rgba(255,255,255,0.3)",
                                    }}
                                  >
                                    {hasAvailable ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="truncate font-display text-lg font-semibold tracking-tight text-white sm:text-xl">{name}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      {tlds.map((r) => (
                                        <DomainStatusChip
                                          key={r.tld}
                                          tld={r.tld}
                                          status={r.checkStatus}
                                          available={r.available}
                                          href={r.registerUrl || namecheapLink(r.fullDomain, { source: "quick_generate_tld_badge", content: r.tld })}
                                          onClick={() => handleNamecheapClick(r.fullDomain, "quick_generate_tld_badge", { tld: r.tld, name })}
                                        />
                                      ))}
                                      <span className="text-[10px] text-white/25">
                                        Best: .{best.tld} ({best.availabilityConfidence || "low"} confidence)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    copyToClipboard(best.fullDomain)
                                    submitNameFeedback(legacyFeedbackInput(best, index + 1), "copy")
                                  }}
                                  className="flex h-11 w-11 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5"
                                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                                  title="Copy domain"
                                  aria-label={`Copy ${best.fullDomain}`}
                                >
                                  {copiedName === best.fullDomain ? (
                                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    submitNameFeedback(legacyFeedbackInput(best, index + 1), shortlist.includes(best.fullDomain) ? "unsave" : "save")
                                    toggleShortlist(best.fullDomain)
                                  }}
                                  className="flex h-11 w-11 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5"
                                  style={{
                                    background: shortlist.includes(best.fullDomain) ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)",
                                    color: shortlist.includes(best.fullDomain) ? "#D4AF37" : "rgba(255,255,255,0.5)",
                                  }}
                                  title={shortlist.includes(best.fullDomain) ? "Remove from shortlist" : "Add to shortlist"}
                                  aria-label={shortlist.includes(best.fullDomain) ? `Remove ${best.fullDomain} from shortlist` : `Add ${best.fullDomain} to shortlist`}
                                >
                                  {shortlist.includes(best.fullDomain) ? (
                                    <BookmarkCheck className="h-4 w-4" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {best.personality && (
                              <div
                                className="mt-3 rounded-xl px-3 py-3 sm:px-4"
                                style={{
                                  background: "linear-gradient(135deg, rgba(212,175,55,0.075), rgba(255,255,255,0.025))",
                                  border: "1px solid rgba(212,175,55,0.12)",
                                }}
                              >
                                <div className="mb-1 flex items-center gap-1.5">
                                  <Lightbulb className="h-3 w-3 shrink-0" style={{ color: "#D4AF37" }} />
                               <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#D4AF37" }}>
                                     Why it fits your brief
                                  </span>
                                </div>
                                <p className="text-[12px] leading-relaxed text-white/62">{best.personality}</p>
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <a
                                href={registerHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  handleNamecheapClick(best.fullDomain, "quick_generate_result_button", {
                                    name,
                                    status: best.checkStatus,
                                  })
                                }
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
                                style={{
                                  background: hasAvailable
                                    ? "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)"
                                    : "rgba(255,255,255,0.055)",
                                  color: hasAvailable ? "#0a0800" : "rgba(255,255,255,0.52)",
                                  border: hasAvailable ? "none" : "1px solid rgba(255,255,255,0.08)",
                                  boxShadow: hasAvailable ? "0 4px 20px rgba(212,175,55,0.25)" : undefined,
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {hasAvailable ? `Verify .${best.tld} at registrar` : "Check with registrar"}
                              </a>
                            </div>
                            {renderLegacyFeedbackControls(best, index + 1)}
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div
                        key={name}
                        className={cn(
                          "group rounded-2xl transition-all duration-200",
                          "animate-fade-up opacity-0",
                          "hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.45)]",
                          !hasAvailable && "opacity-60"
                        )}
                        style={{
                          background: isTopPick
                            ? "linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(212,175,55,0.05) 100%)"
                            : hasAvailable ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                          border: isTopPick
                            ? "1px solid rgba(212,175,55,0.4)"
                            : hasAvailable ? "1px solid rgba(212,175,55,0.15)" : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isTopPick ? "0 0 32px rgba(212,175,55,0.1), 0 8px 32px rgba(0,0,0,0.4)" : undefined,
                          animationDelay: `${Math.min(index * 0.02, 0.5)}s`,
                          animationFillMode: "forwards",
                        }}
                      >
                        {/* Recommendation banner */}
                        {isTopPick && (
                          <div
                            className="flex items-center gap-2 rounded-t-2xl px-4 py-2"
                            style={{ borderBottom: "1px solid rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.07)" }}
                          >
                            <span className="text-sm">⭐</span>
                            <span className="text-[11px] font-bold tracking-wide" style={{ color: "#D4AF37" }}>
                              {founderSignalUnlockedForCurrentMode ? "Founder Favourite" : "Top available recommendation"}
                            </span>
                            <span className="text-[10px] text-white/30">
                              {founderSignalUnlockedForCurrentMode ? "— highest Founder Signal™ in this batch" : "— first quality-ordered available name"}
                            </span>
                          </div>
                        )}

                        <div className={cn("p-4 sm:p-5", isTopPick && "pt-3.5")}>
                          {/* Top row: availability icon + name + copy/bookmark */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-2">
                              {/* Name + availability dot */}
                              <div className="flex items-center gap-3">
                                <span
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                  style={{
                                    background: hasAvailable ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
                                    border: hasAvailable ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.06)",
                                    color: hasAvailable ? "#34d399" : "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  {hasAvailable ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                </span>
                                <span className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">{name}</span>
                              </div>

                              {/* TLD badges — green (verified) or emerald (likely free) if available, gray + strikethrough if taken */}
                              <div className="ml-11 flex flex-wrap gap-1.5">
                                {tlds.map((r) => (
                                  <DomainStatusChip
                                    key={r.tld}
                                    tld={r.tld}
                                    status={r.checkStatus}
                                    available={r.available}
                                    href={namecheapLink(r.fullDomain, { source: "result_tld_badge", content: r.tld })}
                                    onClick={() => handleNamecheapClick(r.fullDomain, "result_tld_badge", { tld: r.tld, name })}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Copy + Bookmark */}
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                  onClick={() => {
                                    copyToClipboard(best.fullDomain)
                                    submitNameFeedback(legacyFeedbackInput(best, index + 1), "copy")
                                  }}
                                className="flex h-11 w-11 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5"
                                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                                title="Copy best domain"
                                aria-label={`Copy ${best.fullDomain}`}
                              >
                                {copiedName === best.fullDomain ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  submitNameFeedback(legacyFeedbackInput(best, index + 1), shortlist.includes(best.fullDomain) ? "unsave" : "save")
                                  toggleShortlist(best.fullDomain)
                                }}
                                className="flex h-11 w-11 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5"
                                style={{
                                  background: shortlist.includes(best.fullDomain) ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)",
                                  color: shortlist.includes(best.fullDomain) ? "#D4AF37" : "rgba(255,255,255,0.5)",
                                }}
                                title={shortlist.includes(best.fullDomain) ? "Remove from shortlist" : "Add to shortlist"}
                                aria-label={shortlist.includes(best.fullDomain) ? `Remove ${best.fullDomain} from shortlist` : `Add ${best.fullDomain} to shortlist`}
                              >
                                {shortlist.includes(best.fullDomain) ? (
                                  <BookmarkCheck className="h-4 w-4" />
                                ) : (
                                  <Bookmark className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Name Meaning — shown once per name */}
                          {(best.personalDescription || best.styleRationale || best.slogan || best.meaning) && (
                            <div
                              className="mt-3 rounded-xl px-3 py-3 sm:px-4"
                              style={{
                                background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(255,255,255,0.025))",
                                border: "1px solid rgba(212,175,55,0.12)",
                              }}
                            >
                              <div className="mb-1 flex items-center gap-1.5">
                                <Lightbulb className="h-3 w-3 shrink-0" style={{ color: "#D4AF37" }} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#D4AF37" }}>
                                  Why this fits your brief
                                </span>
                              </div>
                              <p className="text-[12px] leading-relaxed text-white/62">{best.personalDescription || best.meaning}</p>
                              {best.styleRationale && (
                                <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                                  {best.styleRationale}
                                </p>
                              )}
                              {best.slogan && (
                                <div
                                  className="mt-3 rounded-lg px-3 py-2 text-[12px] font-semibold"
                                  style={{ background: "rgba(0,0,0,0.22)", color: "#F6E27A", border: "1px solid rgba(212,175,55,0.16)" }}
                                >
                                  Slogan: {best.slogan}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Founder Signal Panel — shown once per name */}
                          {founderSignalUnlockedForCurrentMode && typeof best.score === "number" ? (
                            <FounderSignalPanel signal={best.founderSignal ?? { score: best.score }} />
                          ) : (
                            <LockedFounderSignalCard />
                          )}

                          {/* Register buttons — curated fallback framing */}
                          {hasAvailable && (() => {
                            const comAvailable = availableTlds.some((r) => r.tld === "com")
                            const bestTld = availableTlds[0]
                            return (
                              <div className="mt-3 space-y-2">
                                {/* .com not available — curated alternative framing */}
                                {!comAvailable && availableTlds.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-white/25">
                                      .com highly competitive —
                                    </span>
                                    <span className="text-[10px] font-semibold" style={{ color: "#60a5fa" }}>
                                      Best available: {bestTld.fullDomain}
                                    </span>
                                    {founderSignalUnlockedForCurrentMode && resultScore(bestTld) > 0 && (
                                      <span
                                        className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                                        style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
                                      >
                                        {resultScore(bestTld)} · {getFounderSignalBand(resultScore(bestTld))}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                  {availableTlds.map((r, i) => (
                                    <a
                                      key={r.tld}
                                      href={namecheapLink(r.fullDomain, { source: isTopPick ? "top_pick_register_button" : "result_register_button", content: r.tld })}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() =>
                                        handleNamecheapClick(
                                          r.fullDomain,
                                          isTopPick ? "top_pick_register_button" : "result_register_button",
                                          { tld: r.tld, name, rank: i + 1 },
                                        )
                                      }
                                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
                                      style={{
                                        background:
                                          i === 0 && isTopPick
                                            ? "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)"
                                            : i === 0 && !comAvailable
                                            ? "rgba(96,165,250,0.12)"
                                            : i === 0
                                            ? "rgba(212,175,55,0.12)"
                                            : "rgba(255,255,255,0.05)",
                                        color:
                                          i === 0 && isTopPick
                                            ? "#0a0800"
                                            : i === 0 && !comAvailable
                                            ? "#60a5fa"
                                            : i === 0
                                            ? "#D4AF37"
                                            : "rgba(255,255,255,0.45)",
                                        border:
                                          i === 0 && isTopPick
                                            ? "none"
                                            : i === 0 && !comAvailable
                                            ? "1px solid rgba(96,165,250,0.25)"
                                            : i === 0
                                            ? "1px solid rgba(212,175,55,0.25)"
                                            : "1px solid rgba(255,255,255,0.08)",
                                        boxShadow: i === 0 && isTopPick ? "0 4px 20px rgba(212,175,55,0.3)" : undefined,
                                      }}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Verify .{r.tld} at registrar
                                    </a>
                                  ))}
                                  {availableTlds.length === 1 && comAvailable && (
                                    <p className="text-[10px] text-white/20">Available now — domains sell fast</p>
                                  )}
                                </div>
                              </div>
                            )
                          })()}

                          {/* Metrics */}
                          {founderSignalUnlockedForCurrentMode && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/30 sm:gap-3 sm:text-xs">
                              <span>Memorability: {best.memorability ?? "—"}</span>
                              {best.pronounceable && (
                                <span className="flex items-center gap-1 text-emerald-400/80">
                                  <CheckCircle className="h-3 w-3" /> <span className="hidden sm:inline">Pronounceable</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Secondary analysis and creative tools stay inside the generator lab. */}
                          {generatorToolsEnabled ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {(() => {
                              const signal = getSeoMicroSignal(name)
                              return signal ? (
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                    signal.type === "positive"
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : signal.type === "warning"
                                      ? "bg-orange-500/15 text-orange-400"
                                      : "bg-white/5 text-white/40"
                                  )}
                                >
                                  {signal.icon} {signal.text}
                                </span>
                              ) : null
                            })()}
                            {/* Trend Age badge */}
                            {(() => {
                              const ta = getTrendAge(name)
                              return (
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                  style={{ background: `${ta.color}18`, color: ta.color }}
                                  title={ta.flags.length ? ta.flags.join(" · ") : "No dating patterns detected"}
                                >
                                  ⏳ {ta.label}
                                </span>
                              )
                            })()}
                            <button
                              onClick={() => setSeoCheckDomain({ name: best.name, tld: best.tld })}
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                              style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}
                            >
                              <Search className="h-2.5 w-2.5" />
                              SEO Potential
                            </button>
                            {/* Pronunciation */}
                            <NamePronunciation name={name} />
                            {/* Names Like */}
                            <button
                              onClick={() => setNamesLikeTarget(name)}
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                              style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}
                              title="Find names with the same feel"
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              Names Like
                            </button>
                            {/* Battle */}
                            {founderSignalUnlockedForCurrentMode ? <button
                              onClick={() => {
                                const entry = { name, tld: best.tld }
                                setBattleQueue((q) => {
                                  // Toggle: remove if already queued
                                  if (q.some((e) => e.name === name)) return q.filter((e) => e.name !== name)
                                  const next = [...q.filter((e) => e.name !== name), entry].slice(-2)
                                  if (next.length === 2) setShowBattle(true)
                                  return next
                                })
                              }}
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                              style={{
                                background: battleQueue.some((e) => e.name === name)
                                  ? "rgba(248,113,113,0.15)"
                                  : "rgba(255,255,255,0.06)",
                                color: battleQueue.some((e) => e.name === name)
                                  ? "#f87171"
                                  : "rgba(255,255,255,0.35)",
                              }}
                              title={
                                battleQueue.some((e) => e.name === name)
                                  ? "Remove from battle"
                                  : battleQueue.length === 0
                                  ? "Select for battle (pick 2 names)"
                                  : "Battle this name!"
                              }
                            >
                              <Swords className="h-2.5 w-2.5" />
                              {battleQueue.some((e) => e.name === name) ? "In Battle" : "Battle"}
                            </button> : (
                              <button
                                type="button"
                                onClick={() => redirectToCheckoutForProFeature("name_battle")}
                                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                                style={{ background: "rgba(212,175,55,0.08)", color: "rgba(212,175,55,0.72)" }}
                                title="Unlock side-by-side name comparison with Pro"
                              >
                                <Lock className="h-2.5 w-2.5" />
                                Compare · Pro
                              </button>
                            )}
                            {/* Brand Palette — link to Brand Studio */}
                            <a
                              href={isProUser
                                ? `/dashboard?palette=${encodeURIComponent(name)}&vibe=${encodeURIComponent(isQuickMode ? quickVibe : selectedVibe || "modern")}`
                                : attributedCheckoutHref}
                              onClick={() => handleLaunchKitStarted("result_palette_link", name)}
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                              style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}
                              title="Generate a brand colour palette for this name"
                            >
                              {isProUser ? <Palette className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                              {isProUser ? "Palette" : "Palette · Pro"}
                            </a>
                          </div>
                          ) : null}

                          {generatorToolsEnabled ? renderLegacyFeedbackControls(best, index + 1) : null}

                          {/* Stress Test */}
                          {generatorToolsEnabled && founderSignalUnlockedForCurrentMode ? (
                            <NameStressTest name={name} founderScore={resultScore(best)} />
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
                </>
                )}
              </div>
            )}

            {generatorResultsAdPosition === "after_results" ? (
              <AdBanner
                placement={isQuickMode ? "generator-after-results" : "founder-result-after-primary"}
                className="mt-6"
              />
            ) : null}

            {hasResultsReady && !isProUser && !redesignEnabled ? (
              <section
                aria-labelledby="results-pro-heading"
                className="mt-6 overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-[linear-gradient(135deg,rgba(212,175,55,0.11),rgba(255,255,255,0.025)_52%,rgba(5,5,5,0.72))] p-5 sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#D4AF37]/75">Turn the list into a decision</p>
                    <h3 id="results-pro-heading" className="mt-2 font-display text-xl font-semibold text-white sm:text-2xl">
                      See which name is strongest, not just available.
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/52">
                      {generatorToolsEnabled
                        ? "Pro unlocks unlimited fair-use bulk checks and Founder Signal scoring, plus complete ranking, comparison, stress-test and export tools in an ad-free workspace."
                        : "Pro unlocks unlimited fair-use bulk checks and Founder Signal scoring in an ad-free workspace."}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={attributedCheckoutHref}
                      onClick={handleResultsUpgradeClick}
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#D4AF37,#F6E27A,#D4AF37)] px-5 py-3 text-sm font-bold text-[#0a0800] shadow-[0_14px_35px_rgba(212,175,55,0.2)] transition-transform hover:-translate-y-0.5"
                    >
                      <Sparkles className="h-4 w-4" />
                      Upgrade for {PRODUCT_OFFER.paidPrice}/month
                    </Link>
                    <p className="mt-2 text-center text-[10px] text-white/30">Cancel through the billing portal.</p>
                  </div>
                </div>
              </section>
            ) : null}

            {/* ── Refine Results — keyword-driven generation only ── */}
            {results.length > 0 && !isGenerating && isAdvancedMode && !redesignEnabled && (
              <RefineResults
                onRefine={handleRefine}
                isRefining={isRefining}
                activeMode={activeRefinement}
              />
            )}

            {/* Social Handle Checker */}
            {generatorToolsEnabled && SOCIAL_HANDLE_CHECK_ENABLED && results.length > 0 && !isQuickMode && (
              <div
                className="mt-6 rounded-2xl p-5 backdrop-blur-xl sm:mt-8 sm:p-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <h3 className="mb-2 text-base font-semibold text-white sm:text-lg">
                  🔍 Check Social Handle
                </h3>
                <p className="mb-4 text-xs text-white/35 sm:text-sm">
                  Check if your brand name is available across social platforms.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={socialHandle}
                    onChange={(e) => setSocialHandle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && checkSocialHandles(socialHandle)}
                    placeholder="e.g., yourbrand"
                    className="h-11 flex-1 rounded-xl px-4 text-sm text-white/90 placeholder:text-white/25 focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(212,175,55,0.55)"
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.2)"
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  />
                  <button
                    onClick={() => checkSocialHandles(socialHandle)}
                    disabled={isCheckingSocials || !socialHandle.trim()}
                    className="h-11 min-w-[80px] rounded-xl px-4 text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)", color: "#0a0800" }}
                  >
                    {isCheckingSocials ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin sm:mr-2" />
                        <span className="hidden sm:inline">Checking...</span>
                      </>
                    ) : (
                      "Check"
                    )}
                  </button>
                </div>

                {/* Social Results */}
                {socialResults.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {socialResults.map((social) => (
                      <a
                        key={social.platformId}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors active:scale-95 sm:p-3 sm:hover:scale-105",
                          social.available
                            ? "bg-green-500/10 hover:bg-green-500/20"
                            : "bg-muted/50 hover:bg-muted"
                        )}
                      >
                        <span className="text-base sm:text-lg">{socialIcons[social.platformId] || "🔗"}</span>
                        <span className="text-[10px] font-medium text-foreground sm:text-xs">{social.platform}</span>
                        <span
                          className={cn(
                            "text-[10px] sm:text-xs",
                            social.available ? "text-green-400" : "text-muted-foreground"
                          )}
                        >
                          {social.available ? "Available" : "Taken"}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Skeleton loading cards — shown while generating with no results yet */}
            {isGenerating && results.length === 0 && !(redesignEnabled && !isBulkMode) && (
              <div className="space-y-2.5" aria-label="Loading results…">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 sm:p-5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      opacity: 1 - i * 0.15,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
                      <div className="h-5 w-32 animate-pulse rounded-lg" style={{ background: "rgba(255,255,255,0.07)" }} />
                      <div className="ml-auto flex gap-1.5">
                        {["w-10", "w-10", "w-12"].map((w, j) => (
                          <div key={j} className={`h-5 ${w} animate-pulse rounded-md`} style={{ background: "rgba(255,255,255,0.05)", animationDelay: `${j * 0.1}s` }} />
                        ))}
                      </div>
                    </div>
                    <div className="ml-11 mt-2.5 flex gap-1.5">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="h-3 w-12 animate-pulse rounded" style={{ background: "rgba(212,175,55,0.08)", animationDelay: `${j * 0.08}s` }} />
                      ))}
                    </div>
                    <div className="mt-3 h-1 animate-pulse rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {results.length === 0 && !isGenerating && (
              <div
                className="flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center sm:py-20"
                style={{ border: "1px dashed rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.03)" }}
              >
                {/* Gold glow icon */}
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl sm:h-20 sm:w-20"
                  style={{
                    background: "radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 70%)",
                    border: "1px solid rgba(212,175,55,0.25)",
                    boxShadow: "0 0 40px rgba(212,175,55,0.15)",
                  }}
                >
                  {isQuickMode ? (
                    <Zap className="h-7 w-7 text-[#D4AF37] sm:h-9 sm:w-9" />
                  ) : (
                    <Sparkles className="h-7 w-7 text-[#D4AF37] sm:h-9 sm:w-9" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-white sm:text-xl">Your results will appear here</h3>
                <p className="mt-2 max-w-[260px] text-xs text-white/40 sm:max-w-sm sm:text-sm">
                  {isQuickMode
                    ? redesignEnabled
                      ? "Describe the business to explore 16 free creative directions with domain checks that never block the names."
                      : "Enter keywords above to generate free multi-TLD ideas with live availability and Namecheap links."
                    : redesignEnabled
                      ? "Build a 12-name creative shortlist, then run Founder Signal only when you want decision support."
                      : "Enter a keyword above and let AI surface brandable domains with live availability and Founder Signal scores."}
                </p>
                {/* Sample keyword pills */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs text-white/30">Try:</span>
                  {SAMPLE_KEYWORDS.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => { setKeyword(kw); setDescription(kw) }}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-[#D4AF37]/80 transition-all hover:text-[#D4AF37] hover:-translate-y-0.5"
                      style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
          </div>

          {/* Shortlist Sidebar - Hidden on mobile, shown on lg+ */}
          <div className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
            <div
              className="rounded-2xl p-6 backdrop-blur-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(212,175,55,0.15)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-white">Shortlist</h3>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
                >
                  {shortlist.length} saved
                </span>
              </div>

              {shortlist.length > 0 ? (
                <div className="space-y-2">
                  {shortlist.map((fullDomain) => (
                    <div
                      key={fullDomain}
                      className="flex items-center justify-between gap-2 rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span className="truncate text-sm font-medium text-white/80">{fullDomain}</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={namecheapLink(fullDomain, { source: "shortlist_sidebar", content: fullDomain })}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleNamecheapClick(fullDomain, "shortlist_sidebar")}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all hover:-translate-y-0.5"
                          style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Register
                        </a>
                        <button
                          onClick={() => toggleShortlist(fullDomain)}
                          className="p-1 text-white/30 transition-colors hover:text-white/70"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={exportShortlist}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white/50 transition-all hover:text-white/80"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {isProUser ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {isProUser ? "Export List" : "Export List · Pro"}
                  </button>
                </div>
              ) : (
                <p className="text-center text-sm text-white/30">
                  Click the bookmark icon on any result to save it here.
                </p>
              )}
            </div>

            {/* Tips Card */}
            <div
              className="mt-4 rounded-2xl p-5"
              style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.12)" }}
            >
              <h4 className="mb-3 text-sm font-semibold text-[#D4AF37]">
                {isQuickMode ? "Quick Generate Tips" : "Founder Signal Tips"}
              </h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                {(isQuickMode
                  ? [
                      "Use 2-4 specific words for sharper names",
                      "Add a rhyme reference when you want a familiar sound",
                      "Use Advanced Generate for scoring and more TLDs",
                    ]
                  : [
                      "Shorter names score higher for memorability",
                      "Avoid hyphens and numbers",
                      ".com scores highest for trust signals",
                    ]
                ).map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]/60" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Mobile Shortlist - Collapsible at bottom */}
        <div className="mt-6 lg:hidden">
          <button
            onClick={() => setIsMobileShortlistOpen(!isMobileShortlistOpen)}
            className="flex w-full items-center justify-between rounded-2xl p-4 backdrop-blur-sm transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.15)" }}
          >
            <div className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-[#D4AF37]" />
              <span className="font-semibold text-white">Shortlist</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
              >
                {shortlist.length} saved
              </span>
            </div>
            {isMobileShortlistOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {isMobileShortlistOpen && (
            <div
              className="mt-2 rounded-2xl p-4 backdrop-blur-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}
            >
              {shortlist.length > 0 ? (
                <div className="space-y-2">
                  {shortlist.map((fullDomain) => (
                    <div
                      key={fullDomain}
                      className="flex items-center justify-between gap-2 rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span className="truncate text-sm font-medium text-white/80">{fullDomain}</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={namecheapLink(fullDomain, { source: "mobile_shortlist", content: fullDomain })}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleNamecheapClick(fullDomain, "mobile_shortlist")}
                          className="flex min-h-[40px] items-center gap-1 rounded-lg px-3 text-xs font-semibold"
                          style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Register
                        </a>
                        <button
                          onClick={() => toggleShortlist(fullDomain)}
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center text-white/30 hover:text-white/70"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={exportShortlist}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white/50 transition-all hover:text-white/80"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {isProUser ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {isProUser ? "Export List" : "Export List · Pro"}
                  </button>
                </div>
              ) : (
                <p className="text-center text-sm text-white/30">
                  Click the bookmark icon on any result to save it here.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SEO Potential Check Modal */}
      {generatorToolsEnabled && seoCheckDomain && (
        <SeoPotentialCheck
          domainName={seoCheckDomain.name}
          tld={seoCheckDomain.tld}
          industry={selectedIndustry}
          onClose={() => setSeoCheckDomain(null)}
        />
      )}

      {/* ── Creativity Feature Modals ─────────────────────────────────── */}

      {/* Name Battle */}
      {generatorToolsEnabled && founderSignalUnlockedForCurrentMode && showBattle && battleQueue.length === 2 && (
        <NameBattleDialog
          names={battleQueue}
          onClose={() => { setShowBattle(false); setBattleQueue([]) }}
        />
      )}

      {/* Names Like */}
      {generatorToolsEnabled && namesLikeTarget !== null && (
        <NamesLikeSearch
          defaultInspiration={namesLikeTarget}
          onClose={() => setNamesLikeTarget(null)}
          onCheckName={(name) => {
            setKeyword(name)
            setNamesLikeTarget(null)
          }}
        />
      )}

      {/* Saved Names Board */}
      {showSavedBoard && (
        <SavedNamesBoard
          legacyShortlist={shortlist}
          onClose={() => setShowSavedBoard(false)}
        />
      )}
    </main>
  )
}
