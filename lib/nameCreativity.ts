/**
 * Name creativity utilities
 * Pure computation — no API calls, no imports from heavy libs
 */

// ── Trend Age Predictor ──────────────────────────────────────────────────────

export interface TrendAgeResult {
  score: number          // 0–100, higher = will age better
  label: "Timeless" | "Safe" | "Slightly Dated Risk" | "Trend-Chasing"
  color: string
  flags: string[]        // specific patterns that age badly
}

const DATED_PATTERNS: { pattern: RegExp | ((n: string) => boolean); flag: string; penalty: number }[] = [
  { pattern: /gpt$/i,                    flag: "Ends in '-gpt' — will date to 2023",              penalty: 30 },
  { pattern: /ai$/i,                     flag: "Ends in '-ai' — currently peaking, will date",    penalty: 18 },
  { pattern: /blockchain|crypto|defi/i,  flag: "Crypto/blockchain keyword — already dated",       penalty: 25 },
  { pattern: /hub$/i,                    flag: "'-hub' suffix — peaked 2013-2015",                penalty: 20 },
  { pattern: /ify$/i,                    flag: "'-ify' suffix — peaked 2010-2014",                penalty: 15 },
  { pattern: /^i[A-Z]/,                  flag: "'i' prefix — feels pre-2015",                     penalty: 22 },
  { pattern: /^e[A-Z]/,                  flag: "'e' prefix — late 90s/2000s feel",                penalty: 25 },
  { pattern: /^my[A-Z]/i,               flag: "'My-' prefix — MySpace era pattern",              penalty: 20 },
  { pattern: /[0-9]/,                    flag: "Numbers in name — lowers trust & ages poorly",    penalty: 18 },
  { pattern: /nft/i,                     flag: "'NFT' keyword — highly dated",                    penalty: 35 },
  { pattern: /metaverse/i,              flag: "'Metaverse' — already feels dated",               penalty: 30 },
  { pattern: /tech$/i,                   flag: "'-Tech' suffix — corporate 2000s feel",           penalty: 12 },
  { pattern: /soft$/i,                   flag: "'-Soft' suffix — 1990s software naming",          penalty: 18 },
  { pattern: /ware$/i,                   flag: "'-Ware' suffix — legacy software feel",           penalty: 15 },
  { pattern: /[a-z][4][a-z]/,           flag: "Number substitution ('4' for 'for') — 2000s",     penalty: 20 },
  { pattern: (n) => /[bcdfghjklmnpqrstvwxyz]{2}r$/i.test(n) && n.length <= 6,
                                         flag: "Vowel-dropped style ('Flickr' pattern) — 2010 era", penalty: 12 },
]

export function getTrendAge(name: string): TrendAgeResult {
  const lower = name.toLowerCase()
  const flags: string[] = []
  let penalty = 0

  for (const { pattern, flag, penalty: p } of DATED_PATTERNS) {
    const matched = typeof pattern === "function" ? pattern(lower) : pattern.test(lower)
    if (matched) {
      flags.push(flag)
      penalty += p
    }
  }

  const score = Math.max(0, Math.min(100, 100 - penalty))

  let label: TrendAgeResult["label"]
  let color: string
  if (score >= 80) { label = "Timeless"; color = "#34d399" }
  else if (score >= 60) { label = "Safe"; color = "#60a5fa" }
  else if (score >= 40) { label = "Slightly Dated Risk"; color = "#f59e0b" }
  else { label = "Trend-Chasing"; color = "#f87171" }

  return { score, label, color, flags }
}


// ── Name Stress Test ─────────────────────────────────────────────────────────

export interface StressScenario {
  id: string
  label: string
  icon: string
  passed: boolean
  reason: string
}

export interface StressTestResult {
  scenarios: StressScenario[]
  passCount: number
  failCount: number
  verdict: string
}

// Letters commonly confused over audio/phone
const AMBIGUOUS_LETTERS = /[cksaevbdpt]/i
const CONFUSABLE_PAIRS = [["c", "s", "k"], ["b", "d"], ["a", "e"], ["p", "t", "d"], ["f", "s", "x"]]

function hasAmbiguousPhonetics(name: string): boolean {
  // Check for letters that sound similar (c/s/k, b/p, a/e)
  const lower = name.toLowerCase()
  return (
    lower.includes("x") && !lower.startsWith("ex") ||
    /[ck].*[ck]/.test(lower) ||        // two k-sounds → confusing to spell
    /ph/.test(lower) ||                 // ph vs f confusion
    /ae|ei|ie/.test(lower) ||          // vowel combos confusing to spell
    /[sz][sz]/.test(lower)             // sz confusion
  )
}

function getSyllableCount(name: string): number {
  return (name.toLowerCase().match(/[aeiou]+/g) || []).length
}

function isPronounceableEnough(name: string): boolean {
  const lower = name.toLowerCase()
  const vowels = (lower.match(/[aeiou]/g) || []).length
  const ratio = vowels / lower.length
  return ratio >= 0.25 && ratio <= 0.65
}

export function runStressTest(name: string, founderScore?: number): StressTestResult {
  const lower = name.toLowerCase()
  const len = name.length
  const syllables = getSyllableCount(name)
  const pronounceable = isPronounceableEnough(name)

  const scenarios: StressScenario[] = [
    {
      id: "phone-spell",
      label: "Spell it over the phone",
      icon: "📞",
      passed: len <= 9 && !hasAmbiguousPhonetics(name) && !/[-_]/.test(name),
      reason: len > 9
        ? `${len} characters is long to spell aloud — ideal is ≤ 9`
        : hasAmbiguousPhonetics(name)
        ? "Contains letters easily confused over audio (c/k/s, ph, ae)"
        : /-/.test(name)
        ? "Hyphens add complexity when spelling aloud"
        : "Clean and easy to spell phonetically",
    },
    {
      id: "hear-once",
      label: "Remember it after hearing once",
      icon: "👂",
      passed: pronounceable && syllables <= 4 && syllables >= 1,
      reason: !pronounceable
        ? "Unusual vowel-to-consonant ratio makes it hard to retain"
        : syllables > 4
        ? `${syllables} syllables is too long to remember from a single hearing`
        : syllables === 0
        ? "No vowel sounds — hard to pronounce and retain"
        : `${syllables} syllable${syllables > 1 ? "s" : ""} — easy to hold in short-term memory`,
    },
    {
      id: "email-subject",
      label: "Works in an email subject line",
      icon: "✉️",
      passed: len <= 10 && !/[0-9]/.test(name) && !/[-_]/.test(name),
      reason: len > 10
        ? `${len} chars will feel verbose in subject lines`
        : /[0-9]/.test(name)
        ? "Numbers in names look cluttered in text contexts"
        : /-/.test(name)
        ? "Hyphens look awkward in email subjects"
        : "Concise and clean for email contexts",
    },
    {
      id: "google-search",
      label: "Easy to Google and find your site",
      icon: "🔍",
      passed: len >= 5 && !/^(get|try|use|go|my|we|the)/i.test(name) && !/[0-9]/.test(name),
      reason: len < 5
        ? "Very short names are dominated by unrelated search results"
        : /^(get|try|use|go|my|we|the)/i.test(name)
        ? "Generic prefix makes brand search results competitive"
        : /[0-9]/.test(name)
        ? "Numbers in brand names confuse search intent"
        : "Distinctive enough to own its search result page",
    },
    {
      id: "social-handle",
      label: "Works as a social handle",
      icon: "🐦",
      passed: len <= 15 && !/[-_]/.test(name) && !/[^a-zA-Z0-9]/.test(name),
      reason: len > 15
        ? "Twitter/X handles max at 15 characters"
        : /-/.test(name)
        ? "Hyphens aren't allowed in most social handles"
        : /[^a-zA-Z0-9]/.test(name)
        ? "Special characters break social handle formats"
        : "Valid format for all major social platforms",
    },
    {
      id: "conference",
      label: "Cuts through noise at a conference",
      icon: "🎤",
      passed: pronounceable && syllables >= 2 && syllables <= 3 && len >= 5,
      reason: syllables < 2
        ? "Single-syllable names can get lost in noisy environments"
        : syllables > 3
        ? "More than 3 syllables becomes hard to catch in a crowd"
        : !pronounceable
        ? "Unusual phonetics make it hard to catch aurally"
        : len < 5
        ? "Very short names blend into surrounding speech"
        : "Strong audio profile — stands out clearly",
    },
    {
      id: "business-card",
      label: "Looks clean on a business card",
      icon: "💼",
      passed: len <= 12 && !/[0-9]/.test(name) && !/[-_]/.test(name) && /^[a-zA-Z]+$/.test(name),
      reason: len > 12
        ? `${len} characters needs a smaller font on print materials`
        : !/^[a-zA-Z]+$/.test(name)
        ? "Non-letter characters look awkward in print design"
        : "Clean letterform — will typeset well at any size",
    },
    {
      id: "investor-pitch",
      label: "Lands well in an investor pitch",
      icon: "📊",
      passed: (founderScore ?? 0) >= 65 && len <= 10 && pronounceable,
      reason: (founderScore ?? 0) < 65
        ? `Founder Signal™ score of ${founderScore ?? "??"} is below the 65+ threshold investors expect`
        : len > 10
        ? "Long names feel unpolished in formal pitch contexts"
        : !pronounceable
        ? "Investors need to say the name confidently — pronunciation matters"
        : "Strong score + clean form — pitch-deck ready",
    },
    {
      id: "podcast",
      label: "Flows naturally in a podcast mention",
      icon: "🎙️",
      passed: pronounceable && syllables <= 4 && !hasAmbiguousPhonetics(name),
      reason: !pronounceable
        ? "Hosts will stumble over unusual phonetics — awkward on air"
        : syllables > 4
        ? "Too long to drop naturally into conversation"
        : hasAmbiguousPhonetics(name)
        ? "Hosts may mispronounce or misspell in show notes"
        : "Easy to say naturally — podcast-friendly",
    },
    {
      id: "five-years",
      label: "Still feels fresh in 5 years",
      icon: "⏳",
      passed: getTrendAge(name).score >= 60,
      reason: (() => {
        const ta = getTrendAge(name)
        return ta.score >= 60
          ? `Trend Age score: ${ta.score}/100 — no major dating patterns detected`
          : `Trend Age score: ${ta.score}/100 — ${ta.flags[0] ?? "contains patterns that may date it"}`
      })(),
    },
  ]

  const passCount = scenarios.filter((s) => s.passed).length
  const failCount = scenarios.length - passCount

  let verdict: string
  if (passCount >= 9) verdict = "Production-ready. This name holds up across every real-world context."
  else if (passCount >= 7) verdict = "Strong overall. A couple of edge cases to consider, but nothing critical."
  else if (passCount >= 5) verdict = "Usable but watch the failures — they'll create friction at scale."
  else verdict = "Several real-world weaknesses. Consider a stronger candidate."

  return { scenarios, passCount, failCount, verdict }
}
