import { timingSafeEqual } from "node:crypto"

export const PREVIEW_CURATOR_COOKIE = "namolux_curator_preview"

export function isValidPreviewCuratorToken(
  candidate: string | null | undefined,
  expected = process.env.NAMOLUX_PREVIEW_CURATOR_TOKEN,
): boolean {
  if (!candidate || !expected || expected.length < 24) return false
  const left = Buffer.from(candidate)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}
