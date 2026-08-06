import type { QuickGenerateVibe } from "@/lib/domainGen/quickGenerate"
import {
  GENERATABLE_QUALITY_PROMPTS,
  type GeneratorQualityPrompt,
} from "@/tests/generator-quality/corpus"

/** The exact six-by-ten production audit agreed for the generator redesign. */
export const BALANCED_60_IDS = {
  friendly: [
    "family-budgeting",
    "teen-therapy",
    "urban-cat-sitting",
    "postpartum-fitness",
    "nurse-recruitment",
    "mortgage-comparison",
    "childcare-network",
    "nonprofit-donor-crm",
    "multilingual-french",
    "welsh-farm-market",
  ],
  playful: [
    "student-meal-delivery",
    "cozy-puzzle-studio",
    "wedding-planner",
    "restaurant-booking",
    "indie-music-discovery",
    "language-learning",
    "artisan-gift-market",
    "community-volunteers",
    "curly-hair-beauty",
    "balcony-gardening",
  ],
  premium: [
    "alpine-skincare",
    "coastal-coffee",
    "family-business-consulting",
    "lisbon-real-estate",
    "solo-women-travel",
    "kenya-eco-safari",
    "japan-ryokan",
    "interior-design",
    "adaptive-architecture",
    "recycled-gold-jewellery",
  ],
  tech: [
    "ai-scheduling-founders",
    "biotech-diagnostics",
    "india-solar-marketplace",
    "remote-onboarding",
    "ev-charging",
    "developer-observability",
    "privacy-saas",
    "research-data-collab",
    "self-custody-wallet",
    "berlin-renter-proptech",
  ],
  clean: [
    "freelance-accounting",
    "contract-review-smb",
    "rural-telehealth",
    "exam-prep",
    "carbon-accounting",
    "kenya-irrigation",
    "ngo-water-quality",
    "finance-newsletter",
    "insurance-claims",
    "public-procurement",
  ],
  bold: [
    "cyber-threat-analytics",
    "working-dog-treats",
    "athlete-recovery",
    "climate-marketing-agency",
    "cold-chain-logistics",
    "esports-analytics",
    "investigative-podcast",
    "warehouse-robotics",
    "factory-quality",
    "rural-auto-repair",
  ],
} as const satisfies Record<QuickGenerateVibe, readonly string[]>

const promptById = new Map(GENERATABLE_QUALITY_PROMPTS.map((prompt) => [prompt.id, prompt]))

export type BalancedGeneratorQualityPrompt = GeneratorQualityPrompt & {
  auditVibe: QuickGenerateVibe
}

export const BALANCED_60_PROMPTS: readonly BalancedGeneratorQualityPrompt[] = Object.entries(BALANCED_60_IDS)
  .flatMap(([auditVibe, ids]) => ids.map((id) => {
    const prompt = promptById.get(id)
    if (!prompt) throw new Error(`Balanced generator audit references missing prompt: ${id}`)
    return { ...prompt, quickVibe: auditVibe as QuickGenerateVibe, auditVibe: auditVibe as QuickGenerateVibe }
  }))
