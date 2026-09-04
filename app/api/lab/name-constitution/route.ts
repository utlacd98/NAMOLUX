import { NextRequest, NextResponse } from "next/server"

import { compileNameConstitution, parseConstitutionInput } from "@/lib/name-sprint/constitution"
import { persistNameConstitution } from "@/lib/name-sprint/persistence"
import { consumeNameSprintBriefQuota, getNameSprintQuotaState, refundNameSprintBriefQuota } from "@/lib/name-sprint/access"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { checkBurstLimit, getQuotaSubject } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const blocked = getGeneratorLabApiBlockResponse(request)
  if (blocked) return blocked
  const subject = await getQuotaSubject(request)
  if (!subject.userId) return NextResponse.json({ error: "Sign in is required to use Name Sprint." }, { status: 401 })
  const quota = await getNameSprintQuotaState(subject)
  return NextResponse.json({ quota }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } })
}

export async function POST(request: NextRequest) {
  const blocked = getGeneratorLabApiBlockResponse(request)
  if (blocked) return blocked
  const subject = await getQuotaSubject(request)
  if (!subject.userId) return NextResponse.json({ error: "Sign in is required to use Name Sprint." }, { status: 401 })
  const quota = await getNameSprintQuotaState(subject)
  if (!quota.allowed) return NextResponse.json({ error: quota.message, quota }, { status: quota.statusCode })
  const burst = await checkBurstLimit(request, "name-sprint-constitution", 4, 60)
  if (!burst.allowed) return NextResponse.json({ error: "Please wait before compiling another naming brief.", retryAfter: burst.resetAt }, { status: burst.unavailable ? 503 : 429 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const input = parseConstitutionInput(body)
  if (!input) return NextResponse.json({ error: "Describe the business in at least 30 characters before compiling the brief." }, { status: 400 })
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : ""
  let briefQuota
  try {
    briefQuota = await consumeNameSprintBriefQuota(subject, idempotencyKey)
  } catch {
    return NextResponse.json({ error: "A valid brief request key is required." }, { status: 400 })
  }
  if (!briefQuota.allowed) return NextResponse.json({ error: briefQuota.message || "The brief compilation allowance has been used.", quota, briefQuota }, { status: briefQuota.statusCode })
  if (briefQuota.replayed) return NextResponse.json({ error: "This brief request was already used. Start a new request instead of replaying it.", quota, briefQuota }, { status: 409 })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 27_000)
  const started = Date.now()
  try {
    const result = await compileNameConstitution(input, controller.signal, subject.userId)
    const briefId = await persistNameConstitution({ userId: subject.userId, constitution: result.constitution, territories: result.territories })
    console.info("name-sprint-constitution-complete", {
      durationMs: Date.now() - started,
      territoryCount: result.territories.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      estimatedUsd: result.usage.estimatedUsd,
      webSearchCalls: result.usage.webSearchCalls,
    })
    return NextResponse.json({ constitution: result.constitution, territories: result.territories, briefId, quota })
  } catch (error) {
    await refundNameSprintBriefQuota(subject, idempotencyKey)
    console.error("name-sprint-constitution-failed", { code: error instanceof Error ? error.message : "unknown", durationMs: Date.now() - started })
    return NextResponse.json({ error: "The Name Constitution could not be compiled. Please retry; no generation run was used.", retryable: true }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}
