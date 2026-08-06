import { generateQuickCandidates } from "../lib/domainGen/quickGenerate"
import { BALANCED_60_PROMPTS } from "../tests/generator-quality/balanced-60"

const prefixes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["release-guard", "release-review", "variance-a", "variance-b", "variance-c"]

for (const prefix of prefixes) {
  const nameBriefs = new Map<string, Set<string>>()
  const styleCounts = new Map<string, number>()
  let total = 0
  let incompleteBatches = 0
  const incomplete: Array<{ id: string; count: number }> = []

  for (const prompt of BALANCED_60_PROMPTS) {
    const candidates = generateQuickCandidates({
      description: prompt.description,
      rhymeWith: prompt.rhymeWith,
      vibe: prompt.quickVibe,
      style: "auto",
      creativity: "balanced",
      maxChars: prompt.maxLength,
      count: 16,
      seed: `${prefix}:${prompt.id}`,
    })
    if (candidates.length !== 16) {
      incompleteBatches += 1
      incomplete.push({ id: prompt.id, count: candidates.length })
    }

    for (const candidate of candidates) {
      total += 1
      styleCounts.set(candidate.style, (styleCounts.get(candidate.style) || 0) + 1)
      const briefs = nameBriefs.get(candidate.name) || new Set<string>()
      briefs.add(prompt.id)
      nameBriefs.set(candidate.name, briefs)
    }
  }

  const duplicateOccurrences = Array.from(nameBriefs.values())
    .reduce((sum, briefs) => sum + Math.max(0, briefs.size - 1), 0)

  console.log(JSON.stringify({
    prefix,
    total,
    incompleteBatches,
    duplicateOccurrences,
    duplicateRate: total ? Number((duplicateOccurrences / total).toFixed(6)) : 0,
    incomplete,
    duplicateSurfaces: Array.from(nameBriefs.entries())
      .filter(([, briefs]) => briefs.size > 1)
      .map(([name, briefs]) => ({ name, briefs: Array.from(briefs).sort() })),
    styles: Object.fromEntries(styleCounts),
  }))
}
