"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FounderSignalBadge } from "@/components/founder-signal"
import { SeoPotentialCheck } from "@/components/seo-potential"
import { buildResultCardView } from "@/lib/domainGen/resultCard"

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

// LocalStorage keys
const STORAGE_KEYS = {
  SHORTLIST: "namolux_shortlist",
  SEARCH_HISTORY: "namolux_search_history",
}

const AUTO_FIND_TARGET_COM_COUNT = 5
const AUTO_FIND_MAX_ATTEMPTS = 8
const AUTO_FIND_TIME_CAP_MS = 20_000
const AUTO_FIND_BATCH_SIZE = 16
const AUTO_FIND_ATTEMPT_DELAY_MS = 180
const AUTO_FIND_V2_MAX_ATTEMPTS = 8
const AUTO_FIND_V2_ENABLED = process.env.NEXT_PUBLIC_AUTO_FIND_V2 === "true"

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
  const [keyword, setKeyword] = useState("")
  const [selectedVibe, setSelectedVibe] = useState("luxury")
  const [selectedIndustry, setSelectedIndustry] = useState("")
  const [maxLength, setMaxLength] = useState(10)
  const [results, setResults] = useState<DomainResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
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
  const [bulkInput, setBulkInput] = useState("")

  // Mobile UI state
  const [isMobileShortlistOpen, setIsMobileShortlistOpen] = useState(false)

  // SEO Potential Check modal state
  const [seoCheckDomain, setSeoCheckDomain] = useState<{ name: string; tld: string } | null>(null)
  const generationAbortRef = useRef<AbortController | null>(null)
  const generationStoppedRef = useRef(false)

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

  const requestGeneratedNames = async (
    seedKeyword: string,
    count: number | null,
    signal: AbortSignal,
  ): Promise<string[]> => {
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
      throw new Error(responseData.error || "Failed to generate domain names")
    }

    return extractDomainNames(responseData.domains || [])
  }

  const requestAvailability = async (
    domainNames: string[],
    tlds: string[] | undefined,
    signal: AbortSignal,
  ): Promise<DomainResult[]> => {
    const response = await fetch("/api/check-domain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        domains: domainNames,
        tlds,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to check domain availability")
    }

    const responseData = await response.json()
    return responseData.results || []
  }

  const requestAutoFindV2 = async (
    baseKeyword: string,
    signal: AbortSignal,
  ): Promise<{ picks: DomainResult[]; summary: AutoFindV2Summary }> => {
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
      throw new Error(responseData.error || "Failed to auto-find .com domains")
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

      if (!response.ok) {
        throw new Error("Failed to check domains")
      }

      const data = await response.json()
      setResults(data.results)
    } catch (error: any) {
      console.error("Error checking domains:", error)
      setError(error.message || "Failed to check domains")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!keyword.trim()) return
    generationAbortRef.current?.abort()
    const abortController = new AbortController()
    generationAbortRef.current = abortController
    generationStoppedRef.current = false

    setIsGenerating(true)
    setIsAutoFindingComs(false)
    setAutoFindAttempt(0)
    setAutoFindStatus(null)
    setAutoFindSummary(null)
    setAvailableComPicks([])
    setError(null)
    setSelectedTldFilter(null) // Reset filters on new search
    setShowOnlyAvailable(false)

    // Add to search history
    const baseKeyword = keyword.trim()
    addToSearchHistory(baseKeyword)

    try {
      const initialNames = await requestGeneratedNames(baseKeyword, null, abortController.signal)
      if (initialNames.length === 0) {
        throw new Error("No domain candidates were generated. Please try again.")
      }

      const initialResults = await requestAvailability(initialNames, undefined, abortController.signal)
      setResults(initialResults)

      if (autoFindComMode) {
        if (AUTO_FIND_V2_ENABLED) {
          setIsAutoFindingComs(true)
          setAutoFindAttempt(1)
          setAutoFindStatus(`Crafting expressive .com picks... (Attempt 1/${AUTO_FIND_V2_MAX_ATTEMPTS})`)

          const autoFindV2Result = await requestAutoFindV2(baseKeyword, abortController.signal)
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
              const remixedNames = await requestGeneratedNames(
                remixSeed,
                AUTO_FIND_BATCH_SIZE,
                abortController.signal,
              )

              if (remixedNames.length > 0) {
                const comResults = await requestAvailability(remixedNames, ["com"], abortController.signal)
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
    setShortlist((prev) => (prev.includes(fullDomain) ? prev.filter((n) => n !== fullDomain) : [...prev, fullDomain]))
  }

  const copyToClipboard = (fullDomain: string) => {
    navigator.clipboard.writeText(fullDomain)
    setCopiedName(fullDomain)
    setTimeout(() => setCopiedName(null), 2000)
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

  return (
    <div className="noise-overlay relative min-h-screen overflow-clip bg-background">
      {/* Background - subtle, contained within viewport */}
      <div className="pointer-events-none absolute inset-0 overflow-clip" aria-hidden="true">
        <div className="animate-luxury-aura absolute top-0 left-[10%] h-[30vh] w-[30vh] max-h-[300px] max-w-[300px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent blur-[80px] sm:h-[40vh] sm:w-[40vh] sm:max-h-[400px] sm:max-w-[400px] sm:blur-[100px] md:left-1/4" />
        <div
          className="animate-luxury-aura absolute right-[5%] bottom-0 h-[25vh] w-[25vh] max-h-[250px] max-w-[250px] rounded-full bg-gradient-to-tl from-secondary/8 via-primary/3 to-transparent blur-[70px] sm:h-[35vh] sm:w-[35vh] sm:max-h-[350px] sm:max-w-[350px] sm:blur-[90px]"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between sm:mb-6 md:mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:gap-2 sm:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {shortlist.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportShortlist} className="h-8 gap-1.5 bg-transparent px-2 text-xs sm:h-auto sm:gap-2 sm:px-3 sm:text-sm">
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Export</span> ({shortlist.length})
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,320px] lg:gap-8">
          {/* Main Content */}
          <div className="min-w-0">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">Generate Domain Names</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Enter a keyword and let AI generate creative, available domain names for your brand.
              </p>
            </div>

            <>
            <div className="mb-6 rounded-xl border border-border bg-card/80 p-3 backdrop-blur-sm sm:mb-8 sm:rounded-2xl sm:p-4 md:p-6">
              {/* Mode Toggle */}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:flex sm:gap-2">
                <button
                  onClick={() => setIsBulkMode(false)}
                  className={cn(
                    "min-h-[44px] rounded-lg px-3 py-2.5 text-xs font-medium transition-all sm:px-4 sm:text-sm",
                    !isBulkMode ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  ✨ AI Generate
                </button>
                <button
                  onClick={() => setIsBulkMode(true)}
                  className={cn(
                    "min-h-[44px] rounded-lg px-3 py-2.5 text-xs font-medium transition-all sm:px-4 sm:text-sm",
                    isBulkMode ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  📋 Bulk Check
                </button>
              </div>

              {/* Bulk Mode */}
              {isBulkMode ? (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label htmlFor="bulk-input" className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
                      Paste domain names (one per line, max 50)
                    </label>
                    <textarea
                      id="bulk-input"
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder={"mybrand\ncoolstartup\nawesomeapp\ngreatidea"}
                      rows={5}
                      className="w-full rounded-lg border border-border/50 bg-background/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:rounded-xl sm:p-4"
                    />
                    <p className="mt-1.5 text-[10px] text-muted-foreground sm:mt-2 sm:text-xs">
                      Enter domain names without TLD. We&apos;ll check all 6 TLDs for each name.
                    </p>
                  </div>
                </div>
              ) : (
              <>
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
                {/* Keyword Input */}
                <div className="sm:col-span-2">
                  <label htmlFor="keyword" className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
                    Keyword or concept
                  </label>
                  <input
                    id="keyword"
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="e.g., fitness, finance, creative..."
                    className="h-10 w-full rounded-lg border border-border/50 bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-12 sm:rounded-xl sm:px-4"
                  />
                  {/* Search History */}
                  {searchHistory.length > 0 && (
                    <div className="mt-2 flex max-w-full flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        Recent:
                      </span>
                      {searchHistory.slice(0, 3).map((term) => (
                        <button
                          key={term}
                          onClick={() => setKeyword(term)}
                          className="max-w-[80px] truncate rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:max-w-none sm:px-2.5 sm:py-1 sm:text-xs"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Industry Select */}
                <div>
                  <label htmlFor="industry" className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">
                    Industry (optional)
                  </label>
                  <select
                    id="industry"
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border/50 bg-background/50 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-12 sm:rounded-xl sm:px-4 [&>option]:bg-background [&>option]:text-foreground"
                  >
                    <option value="" className="bg-background text-muted-foreground">
                      Select industry...
                    </option>
                    {industryOptions.map((industry) => (
                      <option key={industry} value={industry} className="bg-background text-foreground">
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name Length */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground sm:mb-2 sm:text-sm">Max name length</label>
                  <div className="flex h-10 items-center gap-2 sm:h-12">
                    <input
                      type="range"
                      min={5}
                      max={15}
                      value={maxLength}
                      onChange={(e) => setMaxLength(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    />
                    <span className="w-6 text-xs text-muted-foreground sm:w-8 sm:text-sm">{maxLength}</span>
                  </div>
                </div>
              </div>

              {/* Vibe Selection */}
              <div className="mt-3 sm:mt-6">
                <label className="mb-1.5 block text-xs font-medium text-foreground sm:mb-3 sm:text-sm">Brand vibe</label>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {vibeOptions.map((vibe) => (
                    <button
                      key={vibe.id}
                      onClick={() => setSelectedVibe(vibe.id)}
                      className={cn(
                        "min-h-[36px] rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all sm:min-h-[40px] sm:px-4 sm:py-2 sm:text-sm",
                        selectedVibe === vibe.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {vibe.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3 sm:mt-5 sm:rounded-xl sm:p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={autoFindComMode}
                    onChange={(e) => setAutoFindComMode(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      Smart .com Finder (Beta)
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Meaning-first search for up to 5 available .com domains (within attempts/time cap).
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
              </>
              )}

              {/* Generate / Bulk Check Button */}
              <Button
                onClick={isBulkMode ? handleBulkCheck : handleGenerate}
                disabled={isBulkMode ? (!bulkInput.trim() || isGenerating) : (!keyword.trim() || isGenerating)}
                className="mt-4 h-11 w-full gap-1.5 text-sm font-semibold sm:mt-6 sm:h-12 sm:gap-2 sm:text-base"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                    {isBulkMode ? "Checking..." : "Generating..."}
                  </>
                ) : isBulkMode ? (
                  <>
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                    Check Domains
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                    Generate Names
                  </>
                )}
              </Button>

              {/* Error Message */}
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-400 sm:mt-4 sm:gap-3 sm:rounded-xl sm:p-4">
                  <AlertCircle className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  <p className="text-xs sm:text-sm">{error}</p>
                </div>
              )}
            </div>

            {autoFindComMode && !isBulkMode && (isAutoFindingComs || availableComPicks.length > 0 || autoFindStatus) && (
              <div className="mb-4 rounded-xl border border-border/40 bg-card/60 p-3 sm:mb-6 sm:rounded-2xl sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground sm:text-base">Available .com picks</h2>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      {isAutoFindingComs
                        ? `Crafting expressive .com picks... (Attempt ${Math.max(autoFindAttempt, 1)}/${AUTO_FIND_V2_ENABLED ? AUTO_FIND_V2_MAX_ATTEMPTS : AUTO_FIND_MAX_ATTEMPTS})`
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
                    {availableComPicks.map((result) => (
                      (() => {
                        const resultCardView = buildResultCardView({
                          fullDomain: result.fullDomain,
                          whyItWorks: result.whyItWorks,
                          meaningBreakdown: result.meaningBreakdown,
                          meaningScore: result.meaningScore,
                          brandableScore: result.brandableScore ?? result.score,
                          pronounceable: result.pronounceable,
                          available: result.available,
                        })

                        return (
                      <div
                        key={result.fullDomain}
                        className="rounded-lg border border-green-500/20 bg-green-500/5 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{resultCardView.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Score {result.score} | {result.pronounceable ? "Pronounceable" : "Brandable"}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{resultCardView.whyItWorks}</p>
                            <p className="mt-1 text-[11px] text-primary/90">{resultCardView.meaningBreakdown}</p>
                            {result.whyTag && (
                              <p className="mt-1 text-[11px] text-primary/90">
                                {result.whyTag}
                              </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
                            Available
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            onClick={() => copyToClipboard(result.fullDomain)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Copy domain"
                          >
                            {copiedName === result.fullDomain ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleShortlist(result.fullDomain)}
                            className={cn(
                              "rounded-md p-1.5 transition-colors hover:bg-muted",
                              shortlist.includes(result.fullDomain)
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            title={shortlist.includes(result.fullDomain) ? "Remove from shortlist" : "Add to shortlist"}
                          >
                            {shortlist.includes(result.fullDomain) ? (
                              <BookmarkCheck className="h-3.5 w-3.5" />
                            ) : (
                              <Bookmark className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <a
                            href={`https://porkbun.com/checkout/search?q=${result.fullDomain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto flex items-center gap-1 rounded-md bg-pink-500/15 px-2 py-1 text-[11px] font-medium text-pink-400 transition-colors hover:bg-pink-500/25"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Buy
                          </a>
                        </div>
                      </div>
                        )
                      })()
                    ))}
                  </div>
                )}

                {autoFindSummary && autoFindSummary.found < autoFindSummary.target && (
                  <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-100/90">
                      .com scarcity at this length. Try: +2 chars, 2-word mode, or allow suffix.
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
                    <p className="text-xs font-medium text-foreground">Near-misses (best .com taken)</p>
                    <div className="mt-2 space-y-1.5">
                      {autoFindSummary.nearMisses.map((nearMiss) => (
                        <div key={nearMiss.name} className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{nearMiss.name}.com</span>
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
                        Found {autoFindSummary.found}/{autoFindSummary.target} .coms. Generated{" "}
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
              <div className="min-w-0">
                <div className="mb-3 space-y-2 sm:mb-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
                  <h2 className="text-sm font-semibold text-foreground sm:text-lg">
                    Results <span className="text-xs text-muted-foreground sm:text-base">({filteredResults.length} of {results.length})</span>
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
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 sm:h-2 sm:w-2" />
                        Available
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

                <div className="space-y-2">
                  {filteredResults.map((result, index) => (
                    <div
                      key={result.fullDomain}
                      className={cn(
                        "group rounded-xl border border-border/30 bg-card/50 p-3 transition-all hover:border-primary/20 hover:bg-card sm:p-4",
                        "animate-fade-up opacity-0",
                      )}
                      style={{
                        animationDelay: `${Math.min(index * 0.02, 0.5)}s`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 sm:items-center">
                        <div className="flex items-start gap-2 sm:items-center sm:gap-4">
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8",
                              result.available ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {result.available ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="truncate text-base font-semibold text-foreground sm:text-lg">{result.name}</span>
                              <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:text-xs", tldColors[result.tld] || "bg-muted text-muted-foreground")}>
                                .{result.tld}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground sm:gap-3 sm:text-xs">
                              <span>Score: {result.score}</span>
                              <span className="hidden sm:inline">Memorability: {result.memorability}</span>
                              {result.pronounceable && (
                                <span className="flex items-center gap-1 text-green-400">
                                  <CheckCircle className="h-3 w-3" /> <span className="hidden sm:inline">Pronounceable</span>
                                </span>
                              )}
                            </div>
                            {/* Founder Signal Badge */}
                            <FounderSignalBadge
                              name={result.name}
                              tld={result.tld}
                              pronounceable={result.pronounceable}
                              memorability={result.memorability}
                            />

                            {/* SEO Micro-Signal & Check Button */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {(() => {
                                const signal = getSeoMicroSignal(result.name)
                                return signal ? (
                                  <span className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                    signal.type === "positive" ? "bg-green-500/15 text-green-400" :
                                    signal.type === "warning" ? "bg-orange-500/15 text-orange-400" : "bg-muted text-muted-foreground"
                                  )}>
                                    {signal.icon} {signal.text}
                                  </span>
                                ) : null
                              })()}
                              <button
                                onClick={() => setSeoCheckDomain({ name: result.name, tld: result.tld })}
                                className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
                              >
                                <Search className="h-2.5 w-2.5" />
                                Check SEO Potential
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons - always visible on mobile */}
                        <div className="flex shrink-0 items-center gap-1 sm:gap-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                          <button
                            onClick={() => copyToClipboard(result.fullDomain)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-auto sm:w-auto sm:p-2"
                            title="Copy domain"
                          >
                            {copiedName === result.fullDomain ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleShortlist(result.fullDomain)}
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted sm:h-auto sm:w-auto sm:p-2",
                              shortlist.includes(result.fullDomain)
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            title={shortlist.includes(result.fullDomain) ? "Remove from shortlist" : "Add to shortlist"}
                          >
                            {shortlist.includes(result.fullDomain) ? (
                              <BookmarkCheck className="h-4 w-4" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </button>
                          {result.available && (
                            <a
                              href={`https://porkbun.com/checkout/search?q=${result.fullDomain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-9 items-center gap-1.5 rounded-lg bg-pink-500/15 px-2.5 text-xs font-semibold text-pink-400 transition-all hover:bg-pink-500/25 hover:scale-105 sm:h-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                              title="Buy this domain on Porkbun"
                            >
                              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden xs:inline">Buy Domain</span>
                              <span className="xs:hidden">Buy</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Handle Checker */}
            {results.length > 0 && (
              <div className="mt-6 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm sm:mt-8 sm:p-6">
                <h3 className="mb-3 text-base font-semibold text-foreground sm:mb-4 sm:text-lg">
                  🔍 Check Social Handle
                </h3>
                <p className="mb-3 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
                  Check if your brand name is available as a username on social platforms.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={socialHandle}
                    onChange={(e) => setSocialHandle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && checkSocialHandles(socialHandle)}
                    placeholder="e.g., yourbrand"
                    className="h-11 flex-1 rounded-lg border border-border/50 bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-10 sm:px-4"
                  />
                  <Button
                    onClick={() => checkSocialHandles(socialHandle)}
                    disabled={isCheckingSocials || !socialHandle.trim()}
                    size="sm"
                    className="h-11 min-w-[80px] sm:h-10"
                  >
                    {isCheckingSocials ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin sm:mr-2" />
                        <span className="hidden sm:inline">Checking...</span>
                      </>
                    ) : (
                      "Check"
                    )}
                  </Button>
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

            {/* Empty State */}
            {results.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-10 text-center sm:rounded-2xl sm:py-16">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 sm:mb-4 sm:h-16 sm:w-16 sm:rounded-2xl">
                  <Zap className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
                </div>
                <h3 className="text-base font-semibold text-foreground sm:text-lg">Ready to generate</h3>
                <p className="mt-1 max-w-[280px] text-xs text-muted-foreground sm:max-w-sm sm:text-sm">
                  Enter a keyword above and click generate to discover available domain names.
                </p>
              </div>
            )}
            </>
          </div>

          {/* Shortlist Sidebar - Hidden on mobile, shown on lg+ */}
          <div className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Shortlist</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {shortlist.length} saved
                </span>
              </div>

              {shortlist.length > 0 ? (
                <div className="space-y-2">
                  {shortlist.map((fullDomain) => (
                    <div key={fullDomain} className="flex items-center justify-between gap-2 rounded-lg bg-background/50 p-3">
                      <span className="font-medium text-foreground truncate">{fullDomain}</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://porkbun.com/checkout/search?q=${fullDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-md bg-pink-500/15 px-2 py-1 text-xs font-medium text-pink-400 transition-colors hover:bg-pink-500/25"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Buy
                        </a>
                        <button
                          onClick={() => toggleShortlist(fullDomain)}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <Button onClick={exportShortlist} variant="outline" className="mt-4 w-full gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Export List
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Click the bookmark icon to save domains to your shortlist.
                </p>
              )}
            </div>

            {/* Tips Card */}
            <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-6">
              <h4 className="mb-2 font-semibold text-accent">Pro Tips</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  Shorter names are more memorable
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  Avoid hyphens and numbers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  Test pronunciation with others
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mobile Shortlist - Collapsible at bottom */}
        <div className="mt-6 lg:hidden">
          <button
            onClick={() => setIsMobileShortlistOpen(!isMobileShortlistOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Shortlist</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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
            <div className="mt-2 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
              {shortlist.length > 0 ? (
                <div className="space-y-2">
                  {shortlist.map((fullDomain) => (
                    <div key={fullDomain} className="flex items-center justify-between gap-2 rounded-lg bg-background/50 p-3">
                      <span className="text-sm font-medium text-foreground truncate">{fullDomain}</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://porkbun.com/checkout/search?q=${fullDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md bg-pink-500/15 px-3 text-xs font-medium text-pink-400 transition-colors hover:bg-pink-500/25"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Buy
                        </a>
                        <button
                          onClick={() => toggleShortlist(fullDomain)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <Button onClick={exportShortlist} variant="outline" className="mt-4 w-full gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Export List
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Click the bookmark icon to save domains to your shortlist.
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
    </div>
  )
}

