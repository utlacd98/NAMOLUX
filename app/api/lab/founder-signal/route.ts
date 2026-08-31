import { NextRequest, NextResponse } from "next/server"

import { ADVANCED_SCORING_TOKEN_TTL_MS, verifyGenerationWorkflowToken } from "@/lib/generation-workflow-token"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { LAB_TLDS, LAB_TONES, type LabCandidate } from "@/lib/lab-name-generator"
import { scoreName } from "@/lib/founderSignal/scoreName"
import { checkBurstLimit, getEntitlementState } from "@/lib/rate-limit"
import { hasSystemReservedName, systemReservedNameError } from "@/lib/reserved-names"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const blocked = getGeneratorLabApiBlockResponse(request)
  if (blocked) return blocked
  const entitlement = await getEntitlementState(request)
  if (!entitlement.userId) return NextResponse.json({ error: "Sign in is required for the generator lab." }, { status: 401 })
  const burst = await checkBurstLimit(request, "lab-founder-signal", 6, 60)
  if (!burst.allowed) return NextResponse.json({ error: "Please wait a moment before scoring again." }, { status: burst.unavailable ? 503 : 429 })
  const body = await request.json().catch(() => null) as { candidates?: LabCandidate[]; workflowToken?: string; tld?: string; tone?: string } | null
  const candidates = Array.isArray(body?.candidates) ? body.candidates.slice(0, 12) : []
  if (hasSystemReservedName(candidates.map((candidate) => candidate?.name))) {
    return NextResponse.json(systemReservedNameError(), { status: 400 })
  }
  const names = candidates.map((candidate) => String(candidate?.name || "").toLowerCase().replace(/[^a-z]/g, ""))
  const tld = typeof body?.tld === "string" && (LAB_TLDS as readonly string[]).includes(body.tld) ? body.tld : null
  const tone = typeof body?.tone === "string" && (LAB_TONES as readonly string[]).includes(body.tone) ? body.tone : ""
  if (candidates.length !== 12 || names.some((name, index) => !name || !candidates[index]?.id)) return NextResponse.json({ error: "Use the exact 12-name generation batch." }, { status: 400 })
  if (!tld || !verifyGenerationWorkflowToken(body?.workflowToken, names, `lab-v3:${entitlement.userId}`, Date.now(), ADVANCED_SCORING_TOKEN_TTL_MS, { binding: "ordered" })) return NextResponse.json({ error: "This generation batch has expired. Generate a new batch before scoring." }, { status: 403 })
  return NextResponse.json({ tld, scored: candidates.map((candidate, index) => ({ id: candidate.id, score: scoreName({ name: names[index], tld, vibe: tone as never }) })) })
}
