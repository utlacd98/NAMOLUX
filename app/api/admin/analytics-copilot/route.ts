import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  isAnalyticsCopilotScope,
  runAnalyticsCopilot,
  type AnalyticsCopilotMessage,
} from "@/lib/analytics-copilot"
import { requireAdminRequest } from "@/lib/admin-auth"
import { checkBurstLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const requestSchema = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  scope: z.enum(["overview", "geo", "events"]),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1_200),
  })).min(1).max(10),
})

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request)
  if (unauthorized) return unauthorized

  const burst = await checkBurstLimit(request, "analytics-copilot", 12, 60 * 60)
  if (!burst.allowed) {
    return noStoreJson(
      { error: "Analytics Copilot is limited to 12 reports per hour. Please try again after the current window resets." },
      burst.unavailable ? 503 : 429,
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noStoreJson({ error: "Invalid Analytics Copilot request." }, 400)
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success || !isAnalyticsCopilotScope(parsed.data?.scope)) {
    return noStoreJson({ error: "Invalid Analytics Copilot request." }, 400)
  }

  try {
    const result = await runAnalyticsCopilot({
      days: parsed.data.days,
      scope: parsed.data.scope,
      messages: parsed.data.messages as AnalyticsCopilotMessage[],
    })

    return noStoreJson(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics Copilot could not complete that request."
    console.error("Analytics Copilot failed:", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message,
    })

    if (/not configured/i.test(message)) {
      return noStoreJson({ error: message }, 503)
    }
    return noStoreJson({ error: "Analytics Copilot could not complete that request. Please try again." }, 502)
  }
}
