import { createHash } from "node:crypto"
import OpenAI from "openai"

export const DEFAULT_NAME_SPRINT_MODEL = "gpt-5.6-luna"
export const DEFAULT_NAME_SPRINT_REPAIR_MODEL = "gpt-5.6-luna"

let openai: OpenAI | null = null

export interface StructuredResponseResult<T> {
  data: T
  model: string
  inputTokens: number
  outputTokens: number
  estimatedUsd: number
  webSearchCalls: number
}

export function getNameSprintModel() {
  return process.env.OPENAI_NAME_SPRINT_MODEL?.trim()
    || process.env.OPENAI_NAMING_MODEL?.trim()
    || DEFAULT_NAME_SPRINT_MODEL
}

export function getNameSprintRepairModel() {
  return process.env.OPENAI_NAME_SPRINT_REPAIR_MODEL?.trim()
    || DEFAULT_NAME_SPRINT_REPAIR_MODEL
}

function client() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")
    openai = new OpenAI({ apiKey })
  }
  return openai
}

function estimateUsd(model: string, inputTokens: number, outputTokens: number) {
  if (model === "gpt-5.6-luna") return (inputTokens * 0.2 + outputTokens * 1.2) / 1_000_000
  if (model === "gpt-5.6-terra") return (inputTokens * 2 + outputTokens * 12) / 1_000_000
  return 0
}

const WEB_SEARCH_USD_PER_CALL = 0.01

function safetyIdentifier(value: string) {
  return `namolux-${createHash("sha256").update(value).digest("hex").slice(0, 32)}`
}

export async function createStructuredResponse<T>({
  schemaName,
  schema,
  instructions,
  input,
  maxOutputTokens,
  promptCacheKey,
  userIdentifier,
  signal,
  model = getNameSprintModel(),
  webSearch = false,
  maxToolCalls = 1,
  reasoningEffort = "none",
}: {
  schemaName: string
  schema: Record<string, unknown>
  instructions: string
  input: string
  maxOutputTokens: number
  promptCacheKey: string
  userIdentifier: string
  signal: AbortSignal
  model?: string
  webSearch?: boolean
  maxToolCalls?: number
  reasoningEffort?: "none" | "low"
}): Promise<StructuredResponseResult<T>> {
  const response = await client().responses.create({
    model,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
    reasoning: { effort: reasoningEffort },
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
    store: false,
    prompt_cache_key: promptCacheKey,
    safety_identifier: safetyIdentifier(userIdentifier),
    ...(webSearch ? {
      tools: [{ type: "web_search" }],
      tool_choice: { type: "web_search" },
      max_tool_calls: Math.max(1, Math.min(2, maxToolCalls)),
    } : {}),
  } as never, { signal })

  if (!response.output_text) throw new Error(`${schemaName}_empty_response`)
  let data: T
  try {
    data = JSON.parse(response.output_text) as T
  } catch {
    throw new Error(`${schemaName}_invalid_json`)
  }
  const inputTokens = response.usage?.input_tokens || 0
  const outputTokens = response.usage?.output_tokens || 0
  const webSearchCalls = response.output.filter((item) => item.type === "web_search_call").length
  return {
    data,
    model,
    inputTokens,
    outputTokens,
    estimatedUsd: estimateUsd(model, inputTokens, outputTokens) + webSearchCalls * WEB_SEARCH_USD_PER_CALL,
    webSearchCalls,
  }
}
