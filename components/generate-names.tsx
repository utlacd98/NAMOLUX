"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { namecheapLink } from "@/lib/affiliateLink"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
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
  Eye,
  Lock,
  Lightbulb,
  Swords,
  LayoutGrid,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FounderSignalPanel } from "@/components/founder-signal"
import { SeoPotentialCheck } from "@/components/seo-potential"
import { buildResultCardView } from "@/lib/domainGen/resultCard"
import { DeepSearch } from "@/components/deep-search"
import { AiNameChat } from "@/components/ai-name-chat"
import { useNamePreferences } from "@/hooks/useNamePreferences"
import { NamePronunciation } from "@/components/name-pronunciation"
import { NameStressTest } from "@/components/name-stress-test"
import { NameInsightsPanel } from "@/components/name-insights-panel"
import { NameBattleDialog } from "@/components/name-battle-dialog"
import { NamesLikeSearch } from "@/components/names-like-search"
import { SavedNamesBoard } from "@/components/saved-names-board"
import { getTrendAge } from "@/lib/nameCreativity"
import { getCached, setCachedBatch, clearExpired } from "@/lib/domainCache"
import { RefineResults, getRefinementOverrides, type RefinementMode } from "@/components/refine-results"

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
  score: number
  pronounceable: boolean
  memorability: number
  length: number
  strategy?: string
  scoreBreakdown?: Record<string, number>
  roots?: string[]
  whyTag?: string
  qualityBand?: "high" | "medium" | "low"
  meaningScore?: number
  meaningBreakdown?: string
  whyItWorks?: string
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

const generateMockResults = (keyword: string): DomainResult[] => {
  const prefixes = ["", "go", "get", "try", "my", "use"]
  const suffixes = ["ly", "io", "ify", "hub", "lab", "ware", "base", "spot", "zone", ""]
  const results: DomainResult[] = []

  const baseNames = [
    keyword.slice(0, 4) + "ora",
    keyword.slice(0, 3) + "evo",
    keyword.slice(0, 4) + "ix",
    keyword.slice(0, 3) + "ova",
    keyword.slice(0, 4) + "ify",
    keyword.slice(0, 3) + "well",
    keyword.slice(0, 4) + "mint",
    keyword.slice(0, 3) + "nest",
  ]

  baseNames.forEach((name, i) => {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    const fullName = prefix + name.charAt(0).toUpperCase() + name.slice(1) + suffix

    results.push({
      name: fullName.length > 12 ? fullName.slice(0, 10) : fullName,
      available: Math.random() > 0.35,
      score: Number((7 + Math.random() * 2.5).toFixed(1)),
      pronounceable: Math.random() > 0.2,
      memorability: Number((7 + Math.random() * 2.5).toFixed(1)),
      length: fullName.length,
    })
  })

  return results.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0) || b.score - a.score)
}

// Available TLDs for filtering
const ALL_TLDS = ["com", "io", "co", "ai", "app", "dev"]
const TLD_PRIORITY = ["com", "io", "co", "ai", "app", "dev"]

// LocalStorage keys
const STORAGE_KEYS = {
  SHORTLIST: "namolux_shortlist",
  SEARCH_HISTORY: "namolux_search_history",
}

const LOADING_STEPS = [
  "Combining phonetics…",
  "Checking availability…",
  "Calculating Founder Signal™…",
]

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

export function GenerateNames() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [keyword, setKeyword] = useState("")
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

  // Bulk check state
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)
  const [bulkInput, setBulkInput] = useState("")
  const [description, setDescription] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

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

  // Preference memory hook
  const { recordSearch, recordLike, recordUnlike } = useNamePreferences()

  // SEO Potential Check modal state
  const [seoCheckDomain, setSeoCheckDomain] = useState<{ name: string; tld: string } | null>(null)
  const generationAbortRef = useRef<AbortController | null>(null)
  const generationStoppedRef = useRef(false)

  // Freemium state: track if user is pro and which premium domain they've revealed
  const [isPro, setIsPro] = useState(false)
  const [revealedPremiumDomain, setRevealedPremiumDomain] = useState<string | null>(null)

  // Score threshold for premium domains (75+)
  const PREMIUM_SCORE_THRESHOLD = 75

  // Initialise keyword from query string for schema.org SearchAction support.
  useEffect(() => {
    const query = (searchParams.get("q") || searchParams.get("keyword") || "").trim()
    if (query && !keyword) {
      setKeyword(query)
    }
  }, [searchParams, keyword])

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (hasCustomTwoWordPreference) return

    const shouldPreferTwoWord =
      (selectedVibe === "luxury" || selectedVibe === "trustworthy") && maxLength >= 9

    setAutoFindControls((prev) =>
      prev.preferTwoWordBrands === shouldPreferTwoWord
        ? prev
        : {
            ...prev,
            preferTwoWordBrands: shouldPreferTwoWord,
          },
    )
  }, [selectedVibe, maxLength, hasCustomTwoWordPreference])

  // Clean expired domain cache entries on mount
  useEffect(() => { clearExpired() }, [])

  // Load shortlist and search history from localStorage on mount
  useEffect(() => {
    try {
      const savedShortlist = localStorage.getItem(STORAGE_KEYS.SHORTLIST)
      if (savedShortlist) {
        setShortlist(JSON.parse(savedShortlist))
      }
      const savedHistory = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY)
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory))
      }
    } catch (e) {
      console.error("Error loading from localStorage:", e)
    }
  }, [])

  // Save shortlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHORTLIST, JSON.stringify(shortlist))
    } catch (e) {
      console.error("Error saving shortlist:", e)
    }
  }, [shortlist])

  // AI hint: debounced "analyzing…" hint while typing
  useEffect(() => {
    if (!keyword.trim() || keyword.length < 3) { setAiHint(null); return }
    const t = setTimeout(() => setAiHint("⚡ AI analyzing keyword structure…"), 600)
    return () => { clearTimeout(t); setAiHint(null) }
  }, [keyword])

  // Loading step cycle
  useEffect(() => {
    if (!isGenerating) { setLoadingStep(0); return }
    const t = setInterval(() => setLoadingStep((s) => (s + 1) % LOADING_STEPS.length), 1200)
    return () => clearInterval(t)
  }, [isGenerating])

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

  // Filtered results based on TLD and availability filters
  const filteredResults = results.filter((result) => {
    if (selectedTldFilter && result.tld !== selectedTldFilter) return false
    if (showOnlyAvailable && !result.available) return false
    return true
  })

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
        if (minScore > 0) {
          const best = tldList.reduce((b, r) => (r.score > b.score ? r : b), tldList[0])
          if (best.score < minScore) return false
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
            ? available.reduce((b, r) => (r.score > b.score ? r : b))
            : sorted[0]
        return { name, tlds: sorted, best, hasAvailable: available.length > 0 }
      })
  }, [results, selectedTldFilter, showOnlyAvailable, minScore, includeWord, excludeWord])

  // "Founder Favourite" — name with highest score among groups that have an available TLD
  const topPickName = useMemo(() => {
    const withAvail = groupedResults.filter((g) => g.hasAvailable)
    if (!withAvail.length) return null
    return withAvail.reduce((best, g) => (g.best.score > best.best.score ? g : best)).name
  }, [groupedResults])

  const stopAutoFindSearch = () => {
    generationStoppedRef.current = true
    generationAbortRef.current?.abort()
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

  const extractDomainNames = (domains: any[]): string[] => {
    const uniqueNames = new Set<string>()
    for (const domain of domains || []) {
      const rawName = typeof domain?.name === "string" ? domain.name : ""
      const normalised = normaliseDomainName(rawName)
      if (normalised.length >= 3 && normalised.length <= 63) {
        uniqueNames.add(normalised)
      }
    }
    return Array.from(uniqueNames)
  }

  const extractDomainData = (domains: any[]): { names: string[]; meanings: Record<string, string> } => {
    const uniqueNames = new Set<string>()
    const meanings: Record<string, string> = {}
    for (const domain of domains || []) {
      const rawName = typeof domain?.name === "string" ? domain.name : ""
      const normalised = normaliseDomainName(rawName)
      if (normalised.length >= 3 && normalised.length <= 63) {
        uniqueNames.add(normalised)
        if (typeof domain?.meaning === "string" && domain.meaning.trim().length > 0) {
          meanings[normalised] = domain.meaning.trim()
        }
      }
    }
    return { names: Array.from(uniqueNames), meanings }
  }

  const requestGeneratedNames = async (
    seedKeyword: string,
    count: number | null,
    signal: AbortSignal,
  ): Promise<{ names: string[]; meanings: Record<string, string> }> => {
    const payload: Record<string, unknown> = {
      keyword: seedKeyword,
      vibe: selectedVibe,
      industry: selectedIndustry,
      maxLength,
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
      if (response.status === 429 && (responseData.error === "rate_limit_exceeded" || responseData.error === "token_limit_reached")) {
        router.push("/pricing?reason=limit_exceeded")
        throw new Error("Rate limit exceeded. Redirecting to upgrade page...")
      }
      throw new Error(responseData.error || "Failed to generate domain names")
    }

    return extractDomainData(responseData.domains || [])
  }

  const requestAvailability = async (
    domainNames: string[],
    tlds: string[] | undefined,
    signal: AbortSignal,
  ): Promise<DomainResult[]> => {
    const effectiveTlds = tlds ?? ["com", "io", "co", "ai", "app", "dev"]

    // ── Cache check: build full domain list and separate hits from misses ──
    const allDomains = domainNames.flatMap((n) => effectiveTlds.map((t) => `${n}.${t}`))
    const cachedHits: Map<string, { available: boolean; checkStatus: string }> = new Map()
    const uncachedDomains: string[] = []

    for (const domain of allDomains) {
      const hit = getCached(domain)
      if (hit) {
        cachedHits.set(domain, { available: hit.available, checkStatus: hit.status })
      } else {
        uncachedDomains.push(domain)
      }
    }

    // Extract just the names that have at least one uncached TLD
    const uncachedNames = Array.from(
      new Set(uncachedDomains.map((d) => d.split(".")[0]))
    )

    let apiResults: DomainResult[] = []

    if (uncachedNames.length > 0) {
      const response = await fetch("/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({ domains: uncachedNames, tlds }),
      })

      const responseData = await response.json()
      if (!response.ok) {
        if (response.status === 429 && (responseData.error === "rate_limit_exceeded" || responseData.error === "token_limit_reached")) {
          router.push("/pricing?reason=limit_exceeded")
          throw new Error("Rate limit exceeded. Redirecting to upgrade page...")
        }
        throw new Error("Failed to check domain availability")
      }

      apiResults = responseData.results || []

      // ── Write fresh results to cache ──
      setCachedBatch(
        apiResults.map((r) => ({
          domain: r.fullDomain,
          status: (r.checkStatus ?? (r.available ? "available" : "taken")) as Parameters<typeof setCachedBatch>[0][number]["status"],
          available: r.available,
        }))
      )
    }

    // ── Merge cache hits back into results for cached names ──
    // For domains in cache but not re-fetched, reconstruct minimal DomainResult
    const cachedResults: DomainResult[] = []
    for (const [fullDomain, hit] of cachedHits) {
      const parts = fullDomain.split(".")
      const name = parts[0]
      const tld = parts.slice(1).join(".")
      // Only add if this name isn't already in apiResults
      if (!apiResults.some((r) => r.fullDomain === fullDomain)) {
        cachedResults.push({
          name,
          tld,
          fullDomain,
          available: hit.available,
          score: 0,
          pronounceable: true,
          memorability: 7,
          length: name.length,
          checkStatus: hit.checkStatus as DomainResult["checkStatus"],
        })
      }
    }

    return [...apiResults, ...cachedResults]
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
      throw new Error(responseData.error || "Failed to auto-find top domains")
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
      .sort((a, b) => b.score - a.score || a.length - b.length)
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

    try {
      const response = await fetch("/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429 && (data.error === "rate_limit_exceeded" || data.error === "token_limit_reached")) {
          router.push("/pricing?reason=limit_exceeded")
          return
        }
        throw new Error("Failed to check domains")
      }

      setResults(data.results)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300)
    } catch (error: any) {
      console.error("Error checking domains:", error)
      setError(error.message || "Failed to check domains")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    // Accept either keyword or description as the input
    const resolvedKeyword = keyword.trim() || description.trim()
    if (!resolvedKeyword) return
    generationAbortRef.current?.abort()
    const abortController = new AbortController()
    generationAbortRef.current = abortController
    generationStoppedRef.current = false

    // Ensure keyword state reflects what we're generating with
    if (!keyword.trim() && description.trim()) setKeyword(description.trim().slice(0, 60))

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

    // Add to search history and record preference signal
    const baseKeyword = resolvedKeyword
    addToSearchHistory(baseKeyword)
    recordSearch(selectedVibe, selectedIndustry, maxLength)

    try {
      const { names: initialNames, meanings: initialMeanings } = await requestGeneratedNames(baseKeyword, null, abortController.signal)
      if (initialNames.length === 0) {
        throw new Error("No domain candidates were generated. Please try again.")
      }

      const initialResults = (await requestAvailability(initialNames, undefined, abortController.signal))
        .map(r => ({ ...r, meaning: initialMeanings[r.name] ?? r.meaning }))
      setResults(initialResults)
      // Smooth-scroll to results after first batch arrives
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300)

      if (autoFindComMode) {
        if (AUTO_FIND_V2_ENABLED) {
          setIsAutoFindingComs(true)
          setAutoFindAttempt(1)
          setAutoFindStatus(`Scanning highest Founder Signal domains... (Attempt 1/${AUTO_FIND_V2_MAX_ATTEMPTS})`)

          const autoFindV2Result = await requestAutoFindV2(baseKeyword, abortController.signal)
          setIsPro(autoFindV2Result.isPro)
          setRevealedPremiumDomain(null) // Reset reveal state on new generation
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
              const { names: remixedNames, meanings: remixMeanings } = await requestGeneratedNames(
                remixSeed,
                AUTO_FIND_BATCH_SIZE,
                abortController.signal,
              )

              if (remixedNames.length > 0) {
                const comResults = (await requestAvailability(remixedNames, ["com"], abortController.signal))
                  .map(r => ({ ...r, meaning: remixMeanings[r.name] ?? r.meaning }))
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
      }
    } catch (error: any) {
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
    if (isAdding) recordLike(fullDomain)
    else recordUnlike(fullDomain)
  }

  const copyToClipboard = (fullDomain: string) => {
    navigator.clipboard.writeText(fullDomain)
    setCopiedName(fullDomain)
    setTimeout(() => setCopiedName(null), 2000)
  }

  const handleRefine = async (mode: RefinementMode) => {
    const resolvedKeyword = keyword.trim() || description.trim()
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
          refinementInstruction: overrides.extraInstruction,
          alreadySeen: results.map((r) => r.name),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Failed to refine")

      const names: string[] = data.names ?? []
      if (names.length === 0) throw new Error("No names generated. Try a different refinement.")

      const refined = await requestAvailability(names, undefined, abortController.signal)
      // Merge: keep existing results, prepend refined ones that aren't duplicates
      const existingNames = new Set(results.map((r) => r.name))
      const newResults = refined.filter((r) => !existingNames.has(r.name))
      setResults((prev) => [...newResults, ...prev])

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200)
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message)
      }
    } finally {
      setIsRefining(false)
    }
  }

  const exportShortlist = () => {
    const shortlistedDomains = results.filter((r) => shortlist.includes(r.fullDomain))
    if (shortlistedDomains.length === 0) return

    const text = shortlistedDomains.map((d) => d.fullDomain).join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "domain-shortlist.txt"
    a.click()
  }

  // CSV Export functionality
  const exportToCSV = () => {
    if (results.length === 0) return

    // CSV headers
    const headers = ["Domain Name", "TLD", "Full Domain", "Available", "Score", "Pronounceable", "Memorability", "Length"]

    // CSV rows
    const rows = results.map((r) => [
      r.name,
      r.tld,
      r.fullDomain,
      r.available ? "Yes" : "No",
      r.score.toString(),
      r.pronounceable ? "Yes" : "No",
      r.memorability.toString(),
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
      setMaxLength(a.maxLength)
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : "Could not analyze description")
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-clip" style={{ background: "#050505" }}>
      {/* Luxury background – layered gold radial glows */}
      <div
        className="pointer-events-none absolute inset-0"
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
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(212,175,55,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 80%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 80%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between sm:mb-6 md:mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-white/80 sm:gap-2 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {shortlist.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportShortlist} className="h-8 gap-1.5 bg-transparent px-2 text-xs sm:h-auto sm:gap-2 sm:px-3 sm:text-sm">
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Export</span> ({shortlist.length})
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
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
                Discover a domain{" "}
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
              <p className="mt-2 text-sm text-white/50 sm:text-base">
                AI-generated names, live availability checks, and Founder Signal™ scoring in seconds.
              </p>
            </div>

            <>
            <div
              className="mb-6 rounded-2xl border p-4 backdrop-blur-xl sm:mb-8 sm:p-5 md:p-7"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(212,175,55,0.18)",
                boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.08) inset",
              }}
            >
              {/* Mode Toggle */}
              <div
                className="mb-5 grid grid-cols-3 gap-1 rounded-xl p-1 sm:mb-7"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  onClick={() => { setIsBulkMode(false); setShowAiChat(false) }}
                  className={cn(
                    "min-h-[42px] rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm",
                    !isBulkMode && !showAiChat
                      ? "text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)]"
                      : "text-white/60 hover:text-white/90"
                  )}
                  style={!isBulkMode && !showAiChat ? { background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)" } : {}}
                >
                  ✦ Generate
                </button>
                <button
                  onClick={() => { setIsBulkMode(false); setShowAiChat(true) }}
                  className={cn(
                    "min-h-[42px] rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm",
                    showAiChat
                      ? "text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)]"
                      : "text-white/60 hover:text-white/90"
                  )}
                  style={showAiChat ? { background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)" } : {}}
                >
                  ✦ AI Chat
                </button>
                <button
                  onClick={() => { setIsBulkMode(true); setShowAiChat(false) }}
                  className={cn(
                    "min-h-[42px] rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-200 sm:px-4 sm:text-sm",
                    isBulkMode
                      ? "text-black shadow-[0_4px_16px_rgba(212,175,55,0.35)]"
                      : "text-white/60 hover:text-white/90"
                  )}
                  style={isBulkMode ? { background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)" } : {}}
                >
                  📋 Bulk Check
                </button>
              </div>

              {/* AI Chat Mode */}
              {showAiChat && <AiNameChat />}

              {/* Bulk Mode */}
              {!showAiChat && isBulkMode ? (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label htmlFor="bulk-input" className="mb-2 block text-xs font-medium text-white/70 sm:text-sm">
                      Paste domain names (one per line, max 50)
                    </label>
                    <textarea
                      id="bulk-input"
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder={"mybrand\ncoolstartup\nawesomeapp\ngreatidea"}
                      rows={6}
                      className="w-full rounded-xl p-4 text-sm text-white/90 placeholder:text-white/25 focus:outline-none"
                      style={{
                        background: "rgba(255,255,255,0.09)",
                        border: "1px solid rgba(255,255,255,0.1)",
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
                    <p className="mt-2 text-[10px] text-white/30 sm:text-xs">
                      Enter domain names without TLD. We&apos;ll check all 6 TLDs for each name.
                    </p>
                  </div>
                </div>
              ) : !showAiChat ? (
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
                    // Mirror short inputs directly into keyword so Generate works instantly
                    if (val.trim().length < 80) setKeyword(val.trim())
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleExtractKeywords()
                  }}
                  placeholder="e.g. A sustainable skincare brand focusing on high-altitude botanical ingredients…"
                  rows={4}
                  className="w-full rounded-xl p-4 text-sm text-white/90 placeholder:text-white/25 focus:outline-none resize-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
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
                    className="h-11 w-full rounded-xl px-4 text-sm text-white/80 focus:outline-none [&>option]:bg-[#0d0b07] [&>option]:text-white"
                    style={{
                      background: "rgba(255,255,255,0.07)",
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
                  <div className="flex h-11 items-center gap-3 rounded-xl px-4" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <input
                      type="range"
                      min={5}
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
              <div className="mt-4">
                <label
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Brand Vibe
                </label>
                <div className="flex flex-wrap gap-2">
                  {vibeOptions.map((vibe) => (
                    <button
                      key={vibe.id}
                      onClick={() => setSelectedVibe(vibe.id)}
                      className={cn(
                        "min-h-[34px] rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-4",
                        selectedVibe === vibe.id
                          ? "text-black shadow-[0_4px_16px_rgba(212,175,55,0.3)] hover:-translate-y-0.5"
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
              </div>

              {AUTO_FIND_UI_ENABLED && (
              <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3 sm:mt-5 sm:rounded-xl sm:p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={autoFindComMode}
                    onChange={(e) => setAutoFindComMode(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">Auto-find premium domains across all TLDs</span>
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
              ) : null}

              {/* Generate / Bulk Check Button — hidden when AI Chat is active */}
              <button
                onClick={isBulkMode ? handleBulkCheck : handleGenerate}
                disabled={isBulkMode ? (!bulkInput.trim() || isGenerating) : ((!keyword.trim() && !description.trim()) || isGenerating)}
                className={cn(
                  "mt-5 h-13 w-full rounded-xl text-sm font-bold tracking-wide transition-all duration-200 sm:mt-7 sm:h-14 sm:text-base",
                  "flex items-center justify-center gap-2",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                  !isGenerating && "hover:-translate-y-0.5"
                )}
                style={{
                  display: showAiChat ? "none" : undefined,
                  background: "linear-gradient(135deg, #D4AF37 0%, #F6E27A 50%, #D4AF37 100%)",
                  color: "#0a0800",
                  boxShadow: isGenerating
                    ? "0 4px 20px rgba(212,175,55,0.2)"
                    : "0 6px 28px rgba(212,175,55,0.4), 0 2px 8px rgba(212,175,55,0.2)",
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                    {isBulkMode ? "Checking…" : "Generating…"}
                  </>
                ) : isBulkMode ? (
                  <>
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                    Check Domains
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                    Discover Names
                  </>
                )}
              </button>

              {/* Cinematic loading steps */}
              {isGenerating && (
                <div className="mt-4 flex flex-col items-center gap-1.5">
                  {LOADING_STEPS.map((step, i) => (
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
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl p-4 text-red-400"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-xs sm:text-sm">{error}</p>
                </div>
              )}

              {/* Quick category pills — shown when no input yet and not generating */}
              {!showAiChat && !isBulkMode && !description.trim() && !isGenerating && (
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

            {AUTO_FIND_UI_ENABLED && autoFindComMode && !isBulkMode && (isAutoFindingComs || availableComPicks.length > 0 || autoFindStatus) && (
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
                        brandableScore: result.brandableScore ?? result.score,
                        pronounceable: result.pronounceable,
                        available: result.available,
                      })

                      // Freemium blur logic: premium domains (score >= 75) are blurred for free users
                      const isPremiumDomain = result.score >= PREMIUM_SCORE_THRESHOLD
                      const isRevealed = result.fullDomain === revealedPremiumDomain
                      const canReveal = isPremiumDomain && !isPro && revealedPremiumDomain === null
                      const isBlurred = isPremiumDomain && !isPro && !isRevealed
                      const showUpgradeCTA = isPremiumDomain && !isPro && revealedPremiumDomain !== null && !isRevealed

                      // Handle click to reveal premium domain
                      const handleRevealClick = () => {
                        if (canReveal) {
                          setRevealedPremiumDomain(result.fullDomain)
                        }
                      }

                      return (
                        <div
                          key={result.fullDomain}
                          className={cn(
                            "relative rounded-lg border p-3 transition-all",
                            isBlurred
                              ? "border-amber-500/30 bg-amber-500/5 cursor-pointer hover:border-amber-400/50"
                              : "border-green-500/20 bg-green-500/5"
                          )}
                          onClick={canReveal ? handleRevealClick : undefined}
                        >
                          {/* Premium badge for high-scoring domains */}
                          {isPremiumDomain && (
                            <div className="absolute -top-2 right-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-md">
                              ⭐ PREMIUM
                            </div>
                          )}

                          {/* Blur overlay for locked premium domains */}
                          {isBlurred && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
                              {canReveal ? (
                                <>
                                  <div className="mb-2 rounded-full bg-amber-500/20 p-2">
                                    <Eye className="h-5 w-5 text-amber-400" />
                                  </div>
                                  <p className="text-sm font-medium text-amber-400">Click to Reveal</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">Score: {result.score}/100</p>
                                  <p className="mt-0.5 text-[10px] text-amber-500/80">1 free reveal available</p>
                                </>
                              ) : showUpgradeCTA ? (
                                <>
                                  <div className="mb-2 rounded-full bg-primary/20 p-2">
                                    <Lock className="h-5 w-5 text-primary" />
                                  </div>
                                  <p className="text-sm font-medium text-foreground">Premium Domain</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">Score: {result.score}/100</p>
                                  <a
                                    href="/pricing"
                                    className="mt-2 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Unlock All Premium
                                  </a>
                                </>
                              ) : null}
                            </div>
                          )}

                          <div className={cn("flex items-start justify-between gap-2", isBlurred && "select-none")}>
                            <div className="min-w-0">
                              <p className={cn("truncate text-sm font-semibold text-foreground", isBlurred && "blur-sm")}>{resultCardView.title}</p>
                              <p className={cn("mt-1 text-xs text-muted-foreground", isBlurred && "blur-sm")}>
                                Score {result.score} | {result.pronounceable ? "Pronounceable" : "Brandable"}
                              </p>
                              <p className={cn("mt-1 text-[11px] text-muted-foreground", isBlurred && "blur-sm")}>{resultCardView.whyItWorks}</p>
                              <p className={cn("mt-1 text-[11px] text-primary/90", isBlurred && "blur-sm")}>{resultCardView.meaningBreakdown}</p>
                              {result.whyTag && (
                                <p className={cn("mt-1 text-[11px] text-primary/90", isBlurred && "blur-sm")}>
                                  {result.whyTag}
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
                              href={namecheapLink(result.fullDomain)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 rounded-md bg-pink-500/15 px-2 py-1 text-[11px] font-medium text-pink-400 transition-colors hover:bg-pink-500/25"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Buy
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
            {results.length > 0 && (
              <div ref={resultsRef} className="min-w-0 scroll-mt-4">
                {/* Results summary strip */}
                {(() => {
                  const allNames = Array.from(new Map(results.map(r => [r.name, r])).values())
                  const comFreeCount = results.filter(r => r.tld === "com" && r.available).length
                  const anyFreeCount = results.filter(r => r.available).length
                  const topScore = results.reduce((m, r) => Math.max(m, r.score), 0)
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
                      {anyFreeCount > comFreeCount && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "rgba(52,211,153,0.7)" }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "rgba(52,211,153,0.7)" }} />
                          {anyFreeCount} any TLD free
                        </span>
                      )}
                      <span className="ml-auto text-xs" style={{ color: "#D4AF37" }}>
                        Top score: {topScore}
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
                          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Export CSV</span>
                        </>
                      )}
                    </Button>
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

                {/* Advanced filters — min score, include/exclude words */}
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
                      <div>
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(212,175,55,0.6)" }}>
                          Min Score {minScore > 0 ? `(≥ ${minScore})` : "(off)"}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
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

                {/* Deep Search for .com — sits between filter bar and results */}
                <DeepSearch
                  key={generationId}
                  keyword={keyword}
                  vibe={selectedVibe}
                  industry={selectedIndustry}
                  maxLength={maxLength}
                />

                {/* Bulk sort controls — shown in bulk mode */}
                {isBulkMode && groupedResults.length > 1 && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>Sort:</span>
                    {(["score", "length", "availability"] as const).map((key) => (
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

                <div className="space-y-2.5">
                  {(isBulkMode
                    ? [...groupedResults].sort((a, b) => {
                        if (bulkSortKey === "score") return b.best.score - a.best.score
                        if (bulkSortKey === "length") return a.name.length - b.name.length
                        // availability: available first, then by score
                        if (a.hasAvailable !== b.hasAvailable) return a.hasAvailable ? -1 : 1
                        return b.best.score - a.best.score
                      })
                    : groupedResults
                  ).map(({ name, tlds, best, hasAvailable }, index) => {
                    const isTopPick = name === topPickName
                    const availableTlds = tlds.filter((r) => r.available)
                    return (
                      <div
                        key={name}
                        className={cn(
                          "group rounded-2xl transition-all duration-200",
                          "animate-fade-up opacity-0",
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
                        {/* Founder Favourite banner */}
                        {isTopPick && (
                          <div
                            className="flex items-center gap-2 rounded-t-2xl px-4 py-2"
                            style={{ borderBottom: "1px solid rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.07)" }}
                          >
                            <span className="text-sm">⭐</span>
                            <span className="text-[11px] font-bold tracking-wide" style={{ color: "#D4AF37" }}>
                              Founder Favourite
                            </span>
                            <span className="text-[10px] text-white/30">— highest Founder Signal™ in this batch</span>
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
                                <span className="text-base font-bold text-white sm:text-lg">{name}</span>
                              </div>

                              {/* TLD badges — green (verified) or emerald (likely free) if available, gray + strikethrough if taken */}
                              <div className="ml-11 flex flex-wrap gap-1.5">
                                {tlds.map((r) =>
                                  r.available ? (
                                    <a
                                      key={r.tld}
                                      href={namecheapLink(r.fullDomain)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-all hover:-translate-y-0.5 sm:text-xs"
                                      style={r.checkStatus === "likely_available" ? {
                                        background: "rgba(16,185,129,0.08)",
                                        color: "#6ee7b7",
                                        border: "1px solid rgba(16,185,129,0.18)",
                                      } : {
                                        background: "rgba(52,211,153,0.1)",
                                        color: "#34d399",
                                        border: "1px solid rgba(52,211,153,0.2)",
                                      }}
                                      title={r.checkStatus === "available"
                                        ? `Confirmed free via RDAP — register ${r.fullDomain}`
                                        : r.checkStatus === "likely_available"
                                        ? `DNS says available (RDAP not available for this TLD) — register ${r.fullDomain}`
                                        : `Register ${r.fullDomain}`}
                                    >
                                      .{r.tld} {r.checkStatus === "likely_available" ? "~" : "✓"}
                                    </a>
                                  ) : (
                                    <span
                                      key={r.tld}
                                      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs"
                                      style={{
                                        background: "rgba(255,255,255,0.03)",
                                        color: "rgba(255,255,255,0.18)",
                                        border: "1px solid rgba(255,255,255,0.05)",
                                        textDecoration: "line-through",
                                      }}
                                    >
                                      .{r.tld}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Copy + Bookmark */}
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                onClick={() => copyToClipboard(best.fullDomain)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5"
                                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                                title="Copy best domain"
                              >
                                {copiedName === best.fullDomain ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => toggleShortlist(best.fullDomain)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5"
                                style={{
                                  background: shortlist.includes(best.fullDomain) ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)",
                                  color: shortlist.includes(best.fullDomain) ? "#D4AF37" : "rgba(255,255,255,0.5)",
                                }}
                                title={shortlist.includes(best.fullDomain) ? "Remove from shortlist" : "Add to shortlist"}
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
                          {best.meaning && (
                            <div
                              className="mt-3 rounded-lg px-3 py-2.5"
                              style={{ background: "rgba(255,255,255,0.025)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                            >
                              <div className="mb-1 flex items-center gap-1.5">
                                <Lightbulb className="h-3 w-3 shrink-0" style={{ color: "#D4AF37" }} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#D4AF37" }}>
                                  Name Origin
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-white/45">{best.meaning}</p>
                            </div>
                          )}

                          {/* Founder Signal Panel — shown once per name */}
                          <FounderSignalPanel
                            name={best.name}
                            tld={best.tld}
                            vibe={selectedVibe as "luxury" | "futuristic" | "playful" | "trustworthy" | "minimal" | ""}
                          />

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
                                    {bestTld.score > 0 && (
                                      <span
                                        className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                                        style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
                                      >
                                        Score {bestTld.score}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                  {availableTlds.map((r, i) => (
                                    <a
                                      key={r.tld}
                                      href={namecheapLink(r.fullDomain)}
                                      target="_blank"
                                      rel="noopener noreferrer"
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
                                      Register .{r.tld}
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
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/30 sm:gap-3 sm:text-xs">
                            <span>Memorability: {best.memorability}</span>
                            {best.pronounceable && (
                              <span className="flex items-center gap-1 text-emerald-400/80">
                                <CheckCircle className="h-3 w-3" /> <span className="hidden sm:inline">Pronounceable</span>
                              </span>
                            )}
                          </div>

                          {/* SEO Micro-Signal & Action Bar */}
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
                            <button
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
                            </button>
                            {/* Brand Palette — link to Brand Studio */}
                            <a
                              href={`/dashboard?palette=${encodeURIComponent(name)}&vibe=${encodeURIComponent(selectedVibe || "modern")}`}
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all hover:opacity-80"
                              style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}
                              title="Generate a brand colour palette for this name"
                            >
                              <Palette className="h-2.5 w-2.5" />
                              Palette
                            </a>
                          </div>

                          {/* Brand Story + Taglines */}
                          <NameInsightsPanel name={name} vibe={selectedVibe} />

                          {/* Stress Test */}
                          <NameStressTest name={name} founderScore={best.score} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Refine Results ── */}
            {results.length > 0 && !isGenerating && (
              <RefineResults
                onRefine={handleRefine}
                isRefining={isRefining}
                activeMode={activeRefinement}
              />
            )}

            {/* Social Handle Checker */}
            {results.length > 0 && (
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
            {isGenerating && results.length === 0 && (
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
                  <Sparkles className="h-7 w-7 text-[#D4AF37] sm:h-9 sm:w-9" />
                </div>
                <h3 className="text-base font-semibold text-white sm:text-xl">Your results will appear here</h3>
                <p className="mt-2 max-w-[260px] text-xs text-white/40 sm:max-w-sm sm:text-sm">
                  Enter a keyword above and let AI surface brandable domains with live availability and Founder Signal™ scores.
                </p>
                {/* Sample keyword pills */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs text-white/30">Try:</span>
                  {SAMPLE_KEYWORDS.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => setKeyword(kw)}
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
                          href={namecheapLink(fullDomain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all hover:-translate-y-0.5"
                          style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Buy
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
                    <Download className="h-4 w-4" />
                    Export List
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
              <h4 className="mb-3 text-sm font-semibold text-[#D4AF37]">Founder Signal™ Tips</h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]/60" />
                  Shorter names score higher for memorability
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]/60" />
                  Avoid hyphens and numbers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]/60" />
                  .com scores highest for trust signals
                </li>
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
                          href={namecheapLink(fullDomain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-[40px] items-center gap-1 rounded-lg px-3 text-xs font-semibold"
                          style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Buy
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
                    <Download className="h-4 w-4" />
                    Export List
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
      {seoCheckDomain && (
        <SeoPotentialCheck
          domainName={seoCheckDomain.name}
          tld={seoCheckDomain.tld}
          industry={selectedIndustry}
          onClose={() => setSeoCheckDomain(null)}
        />
      )}

      {/* ── Creativity Feature Modals ─────────────────────────────────── */}

      {/* Name Battle */}
      {showBattle && battleQueue.length === 2 && (
        <NameBattleDialog
          names={battleQueue}
          onClose={() => { setShowBattle(false); setBattleQueue([]) }}
        />
      )}

      {/* Names Like */}
      {namesLikeTarget !== null && (
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
    </div>
  )
}


