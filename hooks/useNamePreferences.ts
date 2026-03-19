"use client"

import { useState, useEffect, useCallback } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NamePreferences {
  /** How many times each vibe has been used in searches */
  vibes: Record<string, number>
  /** How many times each industry has been used */
  industries: Record<string, number>
  /** Last 5 preferred max-lengths */
  lengths: number[]
  /** Shortlisted / liked full domains (max 50) */
  likedDomains: string[]
  /** 3-char phonetic ngrams extracted from liked names (max 80) */
  likedPatterns: string[]
}

const STORAGE_KEY = "namolux_preferences_v1"

const DEFAULT_PREFS: NamePreferences = {
  vibes: {},
  industries: {},
  lengths: [],
  likedDomains: [],
  likedPatterns: [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPhoneticPatterns(name: string): string[] {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  const patterns: string[] = []
  for (let i = 0; i <= clean.length - 3; i++) {
    patterns.push(clean.slice(i, i + 3))
  }
  return patterns
}

function stripTld(domain: string): string {
  return domain.replace(/\.[a-z]{2,6}$/, "")
}

function readFromStorage(): NamePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

function writeToStorage(prefs: NamePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // quota exceeded or SSR — silently ignore
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNamePreferences() {
  const [preferences, setPreferences] = useState<NamePreferences>(DEFAULT_PREFS)

  // Hydrate from localStorage on mount
  useEffect(() => {
    setPreferences(readFromStorage())
  }, [])

  // ── Signals ─────────────────────────────────────────────────────────────────

  /** Call when user runs a generation search to record vibe/industry/length preferences */
  const recordSearch = useCallback((vibe: string, industry: string, maxLength: number) => {
    setPreferences((prev) => {
      const next: NamePreferences = {
        ...prev,
        vibes: { ...prev.vibes, [vibe]: (prev.vibes[vibe] ?? 0) + 1 },
        industries: industry
          ? { ...prev.industries, [industry]: (prev.industries[industry] ?? 0) + 1 }
          : prev.industries,
        lengths: [maxLength, ...prev.lengths].slice(0, 5),
      }
      writeToStorage(next)
      return next
    })
  }, [])

  /** Call when user shortlists / bookmarks a domain (positive signal) */
  const recordLike = useCallback((fullDomain: string) => {
    setPreferences((prev) => {
      if (prev.likedDomains.includes(fullDomain)) return prev
      const name = stripTld(fullDomain)
      const patterns = extractPhoneticPatterns(name)
      const next: NamePreferences = {
        ...prev,
        likedDomains: [...prev.likedDomains, fullDomain].slice(-50),
        likedPatterns: [...new Set([...prev.likedPatterns, ...patterns])].slice(-80),
      }
      writeToStorage(next)
      return next
    })
  }, [])

  /** Call when user removes a domain from shortlist (negative signal) */
  const recordUnlike = useCallback((fullDomain: string) => {
    setPreferences((prev) => {
      if (!prev.likedDomains.includes(fullDomain)) return prev
      const next: NamePreferences = {
        ...prev,
        likedDomains: prev.likedDomains.filter((d) => d !== fullDomain),
      }
      writeToStorage(next)
      return next
    })
  }, [])

  // ── Derived signals (for biasing future generation) ──────────────────────────

  /** The vibe the user has used most, or null if no history */
  const favoriteVibe = (): string | null => {
    const entries = Object.entries(preferences.vibes)
    if (!entries.length) return null
    return entries.sort((a, b) => b[1] - a[1])[0][0]
  }

  /** The industry used most, or null */
  const favoriteIndustry = (): string | null => {
    const entries = Object.entries(preferences.industries)
    if (!entries.length) return null
    return entries.sort((a, b) => b[1] - a[1])[0][0]
  }

  /** The average of the user's recent preferred lengths, or null */
  const preferredLength = (): number | null => {
    if (!preferences.lengths.length) return null
    const sum = preferences.lengths.reduce((a, b) => a + b, 0)
    return Math.round(sum / preferences.lengths.length)
  }

  /** True if the user has previously liked domains with these phonetic patterns */
  const matchesLikedPatterns = (name: string): boolean => {
    if (!preferences.likedPatterns.length) return false
    const patterns = extractPhoneticPatterns(name)
    return patterns.some((p) => preferences.likedPatterns.includes(p))
  }

  return {
    preferences,
    recordSearch,
    recordLike,
    recordUnlike,
    favoriteVibe,
    favoriteIndustry,
    preferredLength,
    matchesLikedPatterns,
  }
}
