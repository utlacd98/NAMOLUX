import { BALANCED_60_PROMPTS } from "../tests/generator-quality/balanced-60"

const fixtureId = process.env.QUICK_DIAGNOSTIC_ID || "family-budgeting"
const fixture = BALANCED_60_PROMPTS.find((prompt) => prompt.id === fixtureId)
if (!fixture) throw new Error(`Unknown QUICK_DIAGNOSTIC_ID: ${fixtureId}`)

const originalFetch = globalThis.fetch
globalThis.fetch = async (...args) => {
  const response = await originalFetch(...args)
  try {
    const payload = await response.clone().json() as { choices?: Array<{ message?: { content?: unknown } }> }
    const content = payload.choices?.[0]?.message?.content
    let parsed: unknown = null
    if (typeof content === "string") {
      try {
        parsed = JSON.parse(content)
      } catch {
        console.log(JSON.stringify({
          providerPayloadParseFailure: {
            contentType: typeof content,
            contentLength: content.length,
            contentPreview: content.slice(0, 300),
          },
        }))
      }
    }
    // This local-only fixture tool prints generated candidate records, never
    // request headers, credentials, provider errors or the outbound prompt.
    console.log(JSON.stringify({ providerPayload: parsed }))
  } catch {
    console.log(JSON.stringify({ providerPayload: null }))
  }
  return response
}

async function main() {
  const { generateGroqQuickCandidates } = await import("../lib/domainGen/quickGenerateGroq")
  const generated = await generateGroqQuickCandidates({
    description: fixture.description,
    rhymeWith: fixture.rhymeWith,
    vibe: fixture.quickVibe,
    maxChars: fixture.maxLength,
    count: 16,
    seed: `provider-diagnostic:${fixture.id}`,
    requireEditorialReview: process.env.QUICK_DIAGNOSTIC_EDITORIAL === "1",
  })

  console.log(JSON.stringify({
    result: {
      provider: generated.provider,
      model: generated.model,
      modelCandidateCount: generated.modelCandidateCount,
      fallbackCandidateCount: generated.fallbackCandidateCount,
      attempts: generated.providerAttempts,
      names: generated.candidates.map((candidate) => candidate.name),
    },
  }))
}

void main()
