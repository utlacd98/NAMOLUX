import { createStructuredResponse } from "./openai"
import {
  NAMING_MODES,
  NAME_SPRINT_STRATEGIES,
  type NameConstitution,
  type NamingMode,
  type NameSprintStrategy,
  type SemanticTerritory,
} from "./types"

export interface ConstitutionInput {
  description: string
  category?: string
  audience?: string
  markets?: string[]
  languages?: string[]
  namingMode?: NamingMode
  tone?: string[]
  include?: string[]
  avoid?: string[]
  competitors?: string[]
  likedNames?: string[]
  preferredTlds?: string[]
  preferredLength?: { min: number; max: number }
}

const CONSTITUTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["constitution", "territories"],
  properties: {
    constitution: {
      type: "object",
      additionalProperties: false,
      required: [
        "category", "audience", "problem", "promise", "personality", "geographicMarkets", "languages",
        "futureExpansion", "competitors", "likedNames", "namingMode", "preferredLength", "include", "avoid", "preferredTlds",
      ],
      properties: {
        category: { type: "string" },
        audience: { type: "array", items: { type: "string" } },
        problem: { type: "string" },
        promise: { type: "array", items: { type: "string" } },
        personality: { type: "array", items: { type: "string" } },
        geographicMarkets: { type: "array", items: { type: "string" } },
        languages: { type: "array", items: { type: "string" } },
        futureExpansion: { type: "array", items: { type: "string" } },
        competitors: { type: "array", items: { type: "string" } },
        likedNames: { type: "array", items: { type: "string" } },
        namingMode: { type: "string", enum: [...NAMING_MODES] },
        preferredLength: {
          type: "object",
          additionalProperties: false,
          required: ["min", "max"],
          properties: { min: { type: "integer" }, max: { type: "integer" } },
        },
        include: { type: "array", items: { type: "string" } },
        avoid: { type: "array", items: { type: "string" } },
        preferredTlds: { type: "array", items: { type: "string" } },
      },
    },
    territories: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "meaning", "tone", "roots", "avoidRoots", "strategies", "phoneticCharacter"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          meaning: { type: "string" },
          tone: { type: "string" },
          roots: { type: "array", items: { type: "string" } },
          avoidRoots: { type: "array", items: { type: "string" } },
          strategies: { type: "array", items: { type: "string", enum: [...NAME_SPRINT_STRATEGIES] } },
          phoneticCharacter: { type: "string" },
        },
      },
    },
  },
} as const

const CONSTITUTION_INSTRUCTIONS = `You compile an editable Name Constitution before any names are generated.
Interpret the founder's business brief precisely. Do not create business names. Return four to six genuinely different semantic territories before wordplay.
Each territory needs strategic meaning, tone, useful roots, roots to avoid, suitable naming strategies, and a restrained phonetic character.
At least half of the territories must come from lateral source domains rather than restating the product's functions or benefits. Draw coherent source domains from areas such as craft, material behaviour, ecology, music, choreography, architecture, language, natural phenomena or culture only when the strategic bridge is defensible.
Use no more than one territory about navigation or direction, one about signals or visibility, and one about safety, continuity or readiness. Do not create several labels that are synonyms for foresight, clarity, guidance, resilience or action.
Territory roots must be specific enough to open distinct lexical material. Put the obvious category words, direct benefit words and crowded metaphor words into avoidRoots instead of recycling them across territories.
Default to distinctive_startup unless the brief clearly describes a local service or another explicit mode.
Treat supplied include, avoid, competitor, language, market, length and TLD preferences as hard facts. Do not invent market claims or etymologies.
Avoid generic startup territories built around AI, quantum, smart, solutions, digital, labs, nexus, nova, forge, flow, gen or verse unless the founder explicitly requires them.`

function text(value: unknown, fallback: string, max = 300) {
  const result = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""
  return result || fallback
}

function list(value: unknown, fallback: readonly string[] = [], max = 12, itemMax = 80) {
  const input = Array.isArray(value) ? value : []
  const output = input
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\s+/g, " ").trim().slice(0, itemMax))
    .filter(Boolean)
  return Array.from(new Set(output.length ? output : fallback)).slice(0, max)
}

function tlds(value: unknown, fallback: readonly string[] = ["com", "co"]) {
  const output = list(value, fallback, 6).map((item) => item.toLowerCase().replace(/[^a-z]/g, "")).filter(Boolean)
  return output.length ? output : [...fallback]
}

export function parseConstitutionInput(value: unknown): ConstitutionInput | null {
  if (!value || typeof value !== "object") return null
  const source = value as Record<string, unknown>
  const description = typeof source.description === "string" ? source.description.replace(/\s+/g, " ").trim() : ""
  if (description.length < 30 || description.length > 2_000) return null
  const namingMode = typeof source.namingMode === "string" && (NAMING_MODES as readonly string[]).includes(source.namingMode)
    ? source.namingMode as NamingMode
    : undefined
  const preferredLength = source.preferredLength && typeof source.preferredLength === "object"
    ? source.preferredLength as Record<string, unknown>
    : null
  return {
    description,
    category: typeof source.category === "string" ? source.category.slice(0, 120) : undefined,
    audience: typeof source.audience === "string" ? source.audience.slice(0, 240) : undefined,
    markets: list(source.markets, [], 6),
    languages: list(source.languages, [], 6),
    namingMode,
    tone: list(source.tone, [], 6),
    include: list(source.include, [], 10),
    avoid: list(source.avoid, [], 20),
    competitors: list(source.competitors, [], 12),
    likedNames: list(source.likedNames, [], 12),
    preferredTlds: tlds(source.preferredTlds),
    preferredLength: preferredLength && Number.isInteger(preferredLength.min) && Number.isInteger(preferredLength.max)
      ? { min: Number(preferredLength.min), max: Number(preferredLength.max) }
      : undefined,
  }
}

function sanitizeConstitution(raw: Record<string, unknown>, input: ConstitutionInput): NameConstitution {
  const rawLength = raw.preferredLength && typeof raw.preferredLength === "object"
    ? raw.preferredLength as Record<string, unknown>
    : {}
  const preferredMin = input.preferredLength?.min ?? Number(rawLength.min)
  const preferredMax = input.preferredLength?.max ?? Number(rawLength.max)
  const namingMode = input.namingMode || ((NAMING_MODES as readonly string[]).includes(String(raw.namingMode)) ? raw.namingMode as NamingMode : "distinctive_startup")
  const avoid = list([...(input.avoid || []), ...list(raw.avoid)], [], 20)
  const include = list([...(input.include || []), ...list(raw.include)], [], 10).filter((item) => !avoid.includes(item))
  return {
    description: input.description,
    category: text(input.category || raw.category, "Unspecified business category", 120),
    audience: list(input.audience ? [input.audience] : raw.audience, ["the intended customer"], 8),
    problem: text(raw.problem, "The customer needs a clearer and more reliable way to make progress.", 300),
    promise: list(raw.promise, ["clearer decisions"], 8),
    personality: list(input.tone?.length ? input.tone : raw.personality, ["credible", "clear"], 8),
    geographicMarkets: list(input.markets?.length ? input.markets : raw.geographicMarkets, ["Global"], 6),
    languages: list(input.languages?.length ? input.languages : raw.languages, ["English"], 6),
    futureExpansion: list(raw.futureExpansion, ["adjacent products and markets"], 6, 180),
    competitors: list([...(input.competitors || []), ...list(raw.competitors)], [], 12),
    likedNames: list([...(input.likedNames || []), ...list(raw.likedNames)], [], 12),
    namingMode,
    preferredLength: {
      min: Math.max(4, Math.min(12, Number.isFinite(preferredMin) ? preferredMin : 5)),
      max: Math.max(6, Math.min(15, Number.isFinite(preferredMax) ? preferredMax : 12)),
    },
    include,
    avoid,
    preferredTlds: tlds(input.preferredTlds?.length ? input.preferredTlds : raw.preferredTlds),
  }
}

function sanitizeTerritories(raw: unknown): SemanticTerritory[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  return raw.flatMap((item, index) => {
    const source = item && typeof item === "object" ? item as Record<string, unknown> : {}
    const label = text(source.label, `Territory ${index + 1}`, 80)
    const id = text(source.id, label, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    if (!id || seen.has(id)) return []
    seen.add(id)
    const strategies = list(source.strategies, ["suggestive"], 4)
      .filter((strategy): strategy is NameSprintStrategy => (NAME_SPRINT_STRATEGIES as readonly string[]).includes(strategy))
    const safeStrategies: NameSprintStrategy[] = strategies.length ? strategies : ["suggestive"]
    return [{
      id,
      label,
      meaning: text(source.meaning, "A distinctive strategic route for the brief.", 240),
      tone: text(source.tone, "credible", 80),
      roots: list(source.roots, [], 12),
      avoidRoots: list(source.avoidRoots, [], 12),
      strategies: safeStrategies,
      phoneticCharacter: text(source.phoneticCharacter, "clear, balanced and easy to repeat", 160),
    }]
  }).slice(0, 6)
}

export function parseCompiledNameSprintPayload(value: unknown): {
  constitution: NameConstitution
  territories: SemanticTerritory[]
} | null {
  if (!value || typeof value !== "object") return null
  const source = value as Record<string, unknown>
  const rawConstitution = source.constitution && typeof source.constitution === "object"
    ? source.constitution as Record<string, unknown>
    : null
  if (!rawConstitution) return null
  const description = typeof rawConstitution.description === "string"
    ? rawConstitution.description.replace(/\s+/g, " ").trim()
    : ""
  if (description.length < 30 || description.length > 2_000) return null
  const rawLength = rawConstitution.preferredLength && typeof rawConstitution.preferredLength === "object"
    ? rawConstitution.preferredLength as Record<string, unknown>
    : {}
  const input: ConstitutionInput = {
    description,
    category: typeof rawConstitution.category === "string" ? rawConstitution.category : undefined,
    markets: list(rawConstitution.geographicMarkets, [], 6),
    languages: list(rawConstitution.languages, [], 6),
    namingMode: typeof rawConstitution.namingMode === "string" && (NAMING_MODES as readonly string[]).includes(rawConstitution.namingMode)
      ? rawConstitution.namingMode as NamingMode
      : undefined,
    tone: list(rawConstitution.personality, [], 8),
    include: list(rawConstitution.include, [], 10),
    avoid: list(rawConstitution.avoid, [], 20),
    competitors: list(rawConstitution.competitors, [], 12),
    likedNames: list(rawConstitution.likedNames, [], 12),
    preferredTlds: tlds(rawConstitution.preferredTlds),
    preferredLength: Number.isInteger(rawLength.min) && Number.isInteger(rawLength.max)
      ? { min: Number(rawLength.min), max: Number(rawLength.max) }
      : undefined,
  }
  const constitution = sanitizeConstitution(rawConstitution, input)
  constitution.audience = list(rawConstitution.audience, constitution.audience, 8)
  constitution.problem = text(rawConstitution.problem, constitution.problem, 300)
  constitution.promise = list(rawConstitution.promise, constitution.promise, 8)
  constitution.futureExpansion = list(rawConstitution.futureExpansion, constitution.futureExpansion, 6, 180)
  const territories = sanitizeTerritories(source.territories)
  return territories.length >= 4 ? { constitution, territories } : null
}

export async function compileNameConstitution(
  input: ConstitutionInput,
  signal: AbortSignal,
  userIdentifier: string,
) {
  const response = await createStructuredResponse<{
    constitution: Record<string, unknown>
    territories: unknown[]
  }>({
    schemaName: "name_constitution",
    schema: CONSTITUTION_SCHEMA as unknown as Record<string, unknown>,
    instructions: CONSTITUTION_INSTRUCTIONS,
    input: `Founder input:\n${JSON.stringify(input)}`,
    maxOutputTokens: 1_800,
    promptCacheKey: "namolux-name-constitution-v2",
    userIdentifier,
    signal,
  })
  const constitution = sanitizeConstitution(response.data.constitution, input)
  const territories = sanitizeTerritories(response.data.territories)
  if (territories.length < 4) throw new Error("constitution_territories_incomplete")
  return { constitution, territories, usage: response }
}
