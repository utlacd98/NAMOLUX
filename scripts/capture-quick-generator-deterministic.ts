import { generateQuickCandidates } from "../lib/domainGen/quickGenerate"
import { BALANCED_60_PROMPTS } from "../tests/generator-quality/balanced-60"

const seedPrefix = process.env.QUICK_CAPTURE_SEED_PREFIX || "release-review"

for (const prompt of BALANCED_60_PROMPTS) {
  const candidates = generateQuickCandidates({
    description: prompt.description,
    rhymeWith: prompt.rhymeWith,
    vibe: prompt.quickVibe,
    style: "auto",
    creativity: "balanced",
    maxChars: prompt.maxLength,
    count: 16,
    seed: `${seedPrefix}:${prompt.id}`,
  })

  console.log(JSON.stringify({
    id: prompt.id,
    brief: prompt.description,
    vibe: prompt.auditVibe,
    candidates: candidates.map((candidate) => ({
      name: candidate.name,
      style: candidate.style,
      rationale: candidate.personality,
      fitRoots: candidate.fitRoots || [],
      fitCues: candidate.fitCues || [],
      constructionParts: candidate.constructionParts || [],
      evidence: candidate.evidence || null,
    })),
  }))
}
