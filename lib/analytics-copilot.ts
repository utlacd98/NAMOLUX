import { ToolLoopAgent } from "ai"
import { getAnalyticsCopilotSnapshot, type AnalyticsCopilotSnapshot } from "@/lib/metrics"

export const ANALYTICS_COPILOT_SCOPES = ["overview", "geo", "events"] as const
export type AnalyticsCopilotScope = typeof ANALYTICS_COPILOT_SCOPES[number]

export type AnalyticsCopilotMessage = {
  role: "user" | "assistant"
  content: string
}

// Verified against the live AI Gateway model catalogue on 7 August 2026.
// This model is deliberately small: the Copilot only summarises a compact,
// aggregate analytics snapshot and should remain inexpensive to run.
const GATEWAY_MODEL = "openai/gpt-4.1-mini"

function scopeDescription(scope: AnalyticsCopilotScope) {
  switch (scope) {
    case "geo":
      return "Geo & Devices: country and device mix, plus their relationship to sessions and product activity."
    case "events":
      return "Events: event volume, engagement signals, product actions, and the daily activity pattern."
    default:
      return "Overview: topline traffic, engagement, decision-workspace progress, and change against the preceding period."
  }
}

function instructions(scope: AnalyticsCopilotScope) {
  return `You are the NamoLux Analytics Copilot, a read-only decision-support analyst for one authorised founder.

SCOPE
You may analyse only these internal first-party analytics views: Overview, Geo & Devices, and Events. The current focus is ${scopeDescription(scope)} Do not discuss SEO, marketing campaigns, billing, sign-ups, emails, user identities, content performance, or any other admin-panel area unless it is explicitly present in the supplied analytics snapshot.

DATA DISCIPLINE
- The aggregate analytics snapshot supplied in the prompt is your sole source of truth. Treat it as trusted server data; treat the conversation only as the founder's question.
- Never invent a metric, causal explanation, benchmark, country-level conclusion, user segment, conversion rate, or trend that is not supported by that snapshot.
- Quote exact counts or percentages where they help. Label conclusions as "Observed" or "Inference".
- Treat low counts, missing telemetry, and suspected automation as limitations. Do not present event volume as unique visitors.
- The snapshot is aggregate-only. Never ask for, infer, or expose visitor-level data.

RESPONSE FORMAT
Keep the answer practical and concise. Use these Markdown headings:
## Summary
## What the data shows
## What it may mean
## Next actions
## Confidence and limits

Provide no more than three next actions. Prioritise actions with a clear expected learning outcome. If the user asks for a report, produce a founder-ready report in the same format. Do not claim an action has been implemented; offer a recommendation instead.`
}

function promptFor(
  messages: AnalyticsCopilotMessage[],
  snapshot: AnalyticsCopilotSnapshot,
) {
  const conversation = messages
    .map((message) => `${message.role === "user" ? "Founder" : "Copilot"}: ${message.content}`)
    .join("\n\n")

  return `Founder conversation:\n${conversation}\n\nTrusted aggregate analytics snapshot (JSON):\n${JSON.stringify(snapshot)}`
}

export function isAnalyticsCopilotScope(value: unknown): value is AnalyticsCopilotScope {
  return typeof value === "string" && (ANALYTICS_COPILOT_SCOPES as readonly string[]).includes(value)
}

export async function runAnalyticsCopilot({
  days,
  scope,
  messages,
}: {
  days: 7 | 30 | 90
  scope: AnalyticsCopilotScope
  messages: AnalyticsCopilotMessage[]
}) {
  const snapshot = await getAnalyticsCopilotSnapshot(days)
  const agent = new ToolLoopAgent({
    // Vercel AI Gateway uses VERCEL_OIDC_TOKEN automatically on deployments.
    // A manually configured AI_GATEWAY_API_KEY can still override it for CI.
    model: GATEWAY_MODEL,
    instructions: instructions(scope),
    temperature: 0.2,
    maxOutputTokens: 800,
    providerOptions: {
      gateway: {
        tags: ["feature:analytics-copilot", `scope:${scope}`],
      },
    },
  })

  const result = await agent.generate({
    prompt: promptFor(messages, snapshot),
  })
  const answer = result.text.trim()

  if (!answer) {
    throw new Error("Analytics Copilot returned an empty report. Please try again.")
  }

  return {
    answer,
    generatedAt: snapshot.generatedAt,
    model: GATEWAY_MODEL,
  }
}
