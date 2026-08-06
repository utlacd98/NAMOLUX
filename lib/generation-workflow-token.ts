import { createHmac, timingSafeEqual } from "node:crypto"

const TOKEN_TTL_MS = 10 * 60 * 1_000
export const ADVANCED_SCORING_TOKEN_TTL_MS = 24 * 60 * 60 * 1_000

export type GenerationWorkflowTokenOptions = {
  /** Set binding is order-insensitive for availability checks. Ordered binding
   * cryptographically preserves the generated shortlist and candidate IDs. */
  binding?: "set" | "ordered"
}

function getSecret(): string | null {
  return (
    process.env.GENERATION_WORKFLOW_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    null
  )
}

function normaliseNames(names: readonly string[], binding: "set" | "ordered"): string[] {
  const uniqueNames = Array.from(
    new Set(names.map((name) => String(name || "").toLowerCase().replace(/[^a-z0-9-]/g, "")).filter(Boolean)),
  )
  return binding === "ordered" ? uniqueNames.slice(0, 50) : uniqueNames.sort().slice(0, 50)
}

function signature(
  expiresAt: number,
  names: readonly string[],
  subject: string,
  secret: string,
  options: GenerationWorkflowTokenOptions,
): string {
  const binding = options.binding || "set"
  // Preserve the legacy set-token payload so short-lived availability tokens
  // remain compatible. Ordered tokens use a distinct domain separator, which
  // prevents a legacy/order-insensitive token from authorising a scored batch.
  const bindingScope = binding === "ordered" ? "ordered:" : ""
  return createHmac("sha256", secret)
    .update(`${expiresAt}.${subject.slice(0, 256)}.${bindingScope}${normaliseNames(names, binding).join(",")}`)
    .digest("base64url")
}

export function issueGenerationWorkflowToken(
  names: readonly string[],
  subject: string,
  now = Date.now(),
  ttlMs = TOKEN_TTL_MS,
  options: GenerationWorkflowTokenOptions = {},
): string | null {
  const secret = getSecret()
  const binding = options.binding || "set"
  const cleanNames = normaliseNames(names, binding)
  if (!secret || !subject || cleanNames.length === 0) return null
  const safeTtlMs = Math.min(ADVANCED_SCORING_TOKEN_TTL_MS, Math.max(60_000, Math.floor(ttlMs)))
  const expiresAt = now + safeTtlMs
  return `${expiresAt}.${signature(expiresAt, cleanNames, subject, secret, { binding })}`
}

export function verifyGenerationWorkflowToken(
  token: unknown,
  names: readonly string[],
  subject: string,
  now = Date.now(),
  maxTtlMs = TOKEN_TTL_MS,
  options: GenerationWorkflowTokenOptions = {},
): boolean {
  const secret = getSecret()
  if (!secret || !subject || typeof token !== "string") return false
  const [expiresRaw, suppliedSignature, ...extra] = token.split(".")
  if (extra.length > 0 || !expiresRaw || !suppliedSignature) return false
  const expiresAt = Number(expiresRaw)
  const safeMaxTtlMs = Math.min(ADVANCED_SCORING_TOKEN_TTL_MS, Math.max(60_000, Math.floor(maxTtlMs)))
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now || expiresAt > now + safeMaxTtlMs) return false

  const expected = signature(expiresAt, names, subject, secret, options)
  const suppliedBuffer = Buffer.from(suppliedSignature)
  const expectedBuffer = Buffer.from(expected)
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer)
}
