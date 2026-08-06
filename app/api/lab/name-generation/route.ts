import { NextRequest, NextResponse } from "next/server"

import { ADVANCED_SCORING_TOKEN_TTL_MS, issueGenerationWorkflowToken } from "@/lib/generation-workflow-token"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { generateLabCandidates, parseLabBrief } from "@/lib/lab-name-generator"
import { checkBurstLimit, getEntitlementState } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const blocked = getGeneratorLabApiBlockResponse(request)
  if (blocked) return blocked
  const entitlement = await getEntitlementState(request)
  if (!entitlement.userId) return NextResponse.json({ error: "Sign in is required for the generator lab." }, { status: 401 })
  const burst = await checkBurstLimit(request, "lab-name-generation", 3, 60)
  if (!burst.allowed) return NextResponse.json({ error: "Please wait a moment before starting another lab generation.", retryAfter: burst.resetAt }, { status: burst.unavailable ? 503 : 429 })
  const brief = parseLabBrief(await request.json().catch(() => null))
  if (!brief) return NextResponse.json({ error: "Complete all five naming questions before generating." }, { status: 400 })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 27_000)
  const started = Date.now()
  try {
    const candidates = await generateLabCandidates(brief, controller.signal)
    const workflowToken = issueGenerationWorkflowToken(candidates.map((item) => item.name), `lab-v3:${entitlement.userId}`, Date.now(), ADVANCED_SCORING_TOKEN_TTL_MS, { binding: "ordered" })
    if (!workflowToken) throw new Error("workflow_token_unavailable")
    console.info("lab-generation-complete", { count: candidates.length, durationMs: Date.now() - started })
    return NextResponse.json({ candidates, workflowToken })
  } catch (error) {
    console.error("lab-generation-failed", { code: error instanceof Error ? error.message : "unknown", durationMs: Date.now() - started })
    return NextResponse.json({ error: "The quality pass could not complete. Please retry; no public allowance was used.", retryable: true }, { status: 503 })
  } finally { clearTimeout(timer) }
}
